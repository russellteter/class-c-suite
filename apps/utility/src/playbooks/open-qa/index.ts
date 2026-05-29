// apps/utility/src/playbooks/open-qa/index.ts
// Source: docs/decisions/0009-ch7-playbooks-home.md §12 + §13.6
//
// Open Q&A — ad-hoc decomposition playbook.
//
// Pipeline (ADR-0009 §12.3):
//   1. decompose(prompt, opusClient) — deterministic first, then LLM
//      If route_to_playbook → return { kind: 'redirect', playbookId }
//      If ad_hoc → proceed with dynamic lens set
//   2. Standard pipeline: lens fan-out (dynamic set) → Synthesizer → Verifier
//   3. Rigor capping per §13.6:
//      displayedScore = min(verifierScore, 85)
//      Surface both rigorScore: displayedScore AND rigorRawScore: verifierScore
//   4. Stamp: DECOMPOSED_AD_HOC
//   5. Writebacks: enabled
//
// Redirect contract: returns PlaybookResult with a special `_redirect` field.
// run-loop.ts detects this and re-dispatches to the target playbook WITHOUT
// re-decomposing (skipDecompose: true per ADR-0009 §5 run-loop integration).

import type { PlaybookInput, PlaybookContext, PlaybookResult, PlaybookModule, PlaybookId, StubbedSource } from '@c-suite/shared-types/playbook';

// B47 honest-stub declaration (audit Finding 2): rigorScore is hardcoded, not from a real Verifier run.
// B47 Phase 2: rigorScore now comes from the real Verifier (run-loop / playbookVerifier).
export const STUBBED_SOURCES: readonly StubbedSource[] = [];
import type { LensRole } from '@c-suite/shared-types/agent-definition';
import { decompose } from '../lib/decomposer.js';
import { evaluatePrereqs } from '../lib/evaluatePrereqs.js';
import { dispatchLens, dispatchSynthesizer } from '../../orchestrator/dispatch.js';
import { buildLensBundle } from '../../orchestrator/run-loop.js';
import { modelClientFromEnv } from '../../agents/modelClient.js';
import { createLogger } from '../../logger.js';
import { z } from 'zod';

const log = createLogger();

const RIGOR_CAP = 85;       // §13.6 hard cap for DECOMPOSED_AD_HOC memos
const RIGOR_THRESHOLD = 85; // threshold == cap (§13.6: rigor is capped, not a different threshold)

// ── Redirect sentinel ─────────────────────────────────────────────────────────
// open_qa returns this shape when the decomposer routes to a known playbook.
// run-loop.ts checks _redirect before treating this as a complete PlaybookResult.

export interface OpenQaRedirect {
  _redirect: true;
  playbookId: PlaybookId;
}

// ── Decomposer model client (O2 fix) ────────────────────────────────────────────
// modelClientFromEnv() is the single factory every live path uses (ADR-0017): it returns
// RealClaudeClient under STUB_MODE=live and StubClaudeClient (replay/record) otherwise. The
// prior makeOpusClient() hard-returned StubClaudeClient for ALL modes including live, so under
// live the decomposer silently fell back to fixture lenses with no degraded signal. Both clients
// satisfy decompose()'s ClaudeClient duck-type (Pick<…,'invoke'>). Tests mock decompose() entirely,
// so the returned client is never exercised in replay — existing behavior preserved.

function makeOpusClient(): ReturnType<typeof modelClientFromEnv> {
  const fixtureDir =
    process.env.DECOMPOSER_FIXTURE_DIR ??
    `${process.cwd()}/tests/fixtures/decomposer`;
  return modelClientFromEnv(fixtureDir);
}

// ── U4: live output-contract violation ───────────────────────────────────────────
// Thrown when STUB_MODE=live and the real Synthesizer returns an empty/missing memo. NEVER caught
// into a placeholder fallback — shipping template strings under the DECOMPOSED_AD_HOC → CLEAN stamp
// the run-loop Verifier applies would be fabricated content presented as real (DOCTRINE #1).
class OpenQaOutputContractViolation extends Error {
  readonly code = 'OPEN_QA_OUTPUT_CONTRACT_VIOLATION' as const;
  constructor(detail: string) {
    super(`open_qa Synthesizer returned malformed output: ${detail}`);
    this.name = 'OpenQaOutputContractViolation';
  }
}

const SynthesizerMemoSchema = z.object({
  memoMarkdown: z.string().min(1, 'memoMarkdown must be non-empty'),
});

// ── runPlaybook ───────────────────────────────────────────────────────────────

export const runPlaybook: PlaybookModule['runPlaybook'] = async (
  input: PlaybookInput,
  ctx: PlaybookContext,
): Promise<PlaybookResult> => {
  const { runId, db, emit, deps } = ctx;

  // Guard: if this is a redirected call (skipDecompose flag), skip decomposition.
  const skipDecompose = (input.context?.['skipDecompose'] as boolean | undefined) === true;

  log.info({ runId, message: `open_qa: starting — skipDecompose:${skipDecompose} prompt: "${input.prompt.slice(0, 60)}"` });

  if (!skipDecompose) {
    // 1. Decompose the prompt
    const opusClient = makeOpusClient();
    const decomposition = await decompose(input.prompt, opusClient);

    if (decomposition.kind === 'route_to_playbook') {
      // Emit routing event per ADR-0009 §6 IPC additions
      emit({
        kind: 'playbook.routed' as never,
        payload: { from: 'open_qa', to: decomposition.playbookId, runId } as never,
      });
      log.info({ runId, message: `open_qa: routing to ${decomposition.playbookId}` });

      // Return a sentinel result that run-loop recognizes as a redirect.
      // Typed as PlaybookResult with an extra _redirect discriminator.
      return {
        _redirect: true,
        playbookId: decomposition.playbookId,
        memoMarkdown: '',
        degradedSources: [],
        lensOutputs: {},
        stamps: [],
        rigorScore: null,
        rigorThreshold: RIGOR_THRESHOLD,
        proposedWritebacks: [],
      } as unknown as PlaybookResult;
    }

    // Ad-hoc path: use decomposer's lens set
    const { lenses, mcps: _mcps, outputShape } = decomposition;

    // evaluatePrereqs for open_qa — always proceed
    const prereq = evaluatePrereqs('open_qa', deps);
    const degradedSources = prereq.kind === 'degrade' ? prereq.flags : [];

    // U4: under STUB_MODE=live the real dispatchLens LensOutputs feed the real Synthesizer, which
    // authors the memo — the prior code DISCARDED dispatchLens output and shipped template
    // ("${role} analysis complete") sections under DECOMPOSED_AD_HOC (→ CLEAN after the run-loop
    // Verifier). REPLAY/RECORD keep the original literal fan-out + buildMemo so existing tests
    // (which mock dispatchLens → undefined and do NOT export dispatchSynthesizer) stay green and
    // dispatchSynthesizer is never referenced at runtime.
    const isLive = (process.env.STUB_MODE ?? 'replay') === 'live';

    // Fan-out across decomposed lens set
    const lensOutputs: Record<string, unknown> = {};
    await Promise.all(
      lenses.map(async (role) => {
        const bundle = buildLensBundle(role as LensRole, runId, input.prompt, 'open_qa');
        const lensOutput = await dispatchLens(role as LensRole, bundle, db, emit);
        lensOutputs[role] = isLive
          ? lensOutput
          : { role, summary: `${role} lens analysis of: ${input.prompt.slice(0, 60)}` };
      })
    );

    let memoMarkdown: string;
    if (isLive) {
      // Real Synthesizer integrates the real lens outputs into the memo. Fail loud on an empty
      // memo — never fall back to fabricated template sections under a clean stamp (DOCTRINE #1).
      const synth = await dispatchSynthesizer(runId, input.prompt, 'open_qa', lensOutputs, db, emit);
      const parsed = SynthesizerMemoSchema.safeParse(synth);
      if (!parsed.success) throw new OpenQaOutputContractViolation(parsed.error.message);
      memoMarkdown = parsed.data.memoMarkdown;
    } else {
      // Stub synthesizer output (replay/record — byte-identical to pre-U4 behavior).
      const sections = lenses.map((role) =>
        [`## ${role} Lens`, '', `${role} analysis complete. (Production: Synthesizer integrates lens outputs here.)`, ''].join('\n')
      );
      memoMarkdown = buildMemo(input.prompt, sections, outputShape, runId, lenses);
    }

    // B47 Phase 2: rigorScore + rigorRawScore assigned by the real Verifier in
    // run-loop (orchestrator/playbookVerifier.ts), which applies the open_qa cap of
    // 85 (§13.6). The playbook no longer fabricates a score.
    return {
      memoMarkdown,
      degradedSources: degradedSources.map(String),
      lensOutputs,
      stamps: ['DECOMPOSED_AD_HOC'],
      rigorScore: null,
      rigorRawScore: null,
      rigorThreshold: RIGOR_THRESHOLD,
      proposedWritebacks: [],  // Synthesizer authors these in production
    };
  }

  // skipDecompose=true path: run as standard pipeline with all lenses
  // (This is the redirected call path — pre_mortem / stakeholder_1_1 / etc. handle themselves)
  const allLenses: LensRole[] = ['CEO', 'CFO', 'CRO', 'CMO', 'CPO', 'COS'];
  const skipIsLive = (process.env.STUB_MODE ?? 'replay') === 'live';
  const lensOutputs: Record<string, unknown> = {};

  await Promise.all(
    allLenses.map(async (role) => {
      const bundle = buildLensBundle(role, runId, input.prompt, 'open_qa');
      const lensOutput = await dispatchLens(role, bundle, db, emit);
      lensOutputs[role] = skipIsLive
        ? lensOutput
        : { role, summary: `${role}: ${input.prompt.slice(0, 60)}` };
    })
  );

  // U4: live → real Synthesizer over real lens outputs (fail loud on empty memo). The prior code
  // shipped buildMemo(…, [], …) — an empty-section memo with NO lens content — under DECOMPOSED_AD_HOC.
  // replay/record keep that placeholder memo so existing tests stay byte-identical.
  // B47 Phase 2: rigorScore + rigorRawScore assigned by the real Verifier in run-loop.
  let memoMarkdown: string;
  if (skipIsLive) {
    const synth = await dispatchSynthesizer(runId, input.prompt, 'open_qa', lensOutputs, db, emit);
    const parsed = SynthesizerMemoSchema.safeParse(synth);
    if (!parsed.success) throw new OpenQaOutputContractViolation(parsed.error.message);
    memoMarkdown = parsed.data.memoMarkdown;
  } else {
    memoMarkdown = buildMemo(input.prompt, [], 'memo', runId, allLenses);
  }

  return {
    memoMarkdown,
    degradedSources: [],
    lensOutputs,
    stamps: ['DECOMPOSED_AD_HOC'],
    rigorScore: null,
    rigorRawScore: null,
    rigorThreshold: RIGOR_THRESHOLD,
    proposedWritebacks: [],
  };
};

// ── Memo builder helper ───────────────────────────────────────────────────────

function buildMemo(
  prompt: string,
  sections: string[],
  outputShape: 'memo' | 'list' | 'table',
  runId: string,
  lenses: string[],
): string {
  const shapeNote = outputShape !== 'memo'
    ? `\n> Output shape: **${outputShape.toUpperCase()}**\n`
    : '';

  return [
    `# Open Q&A: ${prompt.slice(0, 80)}`,
    shapeNote,
    '> **DECOMPOSED AD-HOC** — Lenses selected by decomposer. Rigor capped at 85.',
    '',
    ...sections,
    '---',
    `_Run ID: ${runId} | Playbook: open_qa | Lenses: ${lenses.join(', ')}_`,
    `_Rigor cap: ${RIGOR_CAP}. Raw score and capped score shown in memo header._`,
  ].join('\n');
}
