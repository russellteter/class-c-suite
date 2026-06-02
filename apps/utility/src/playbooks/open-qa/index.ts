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
import { buildVaultGrounding, buildVaultRetrievalRows, renderVaultProvenance } from '../../orchestrator/vaultRetriever.js';
import { insertToolCall } from '../../db/tool-calls.js';
import type { ContextDoc } from '../../orchestrator/groundingContext.js';
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

  // V1 (tasks/V1_TARGET.md C1+C2): under STUB_MODE=live, open_qa IS the grounded strategic-decision
  // path. It bypasses the decomposer entirely — no deterministic hijack (the cash_lever / restructure_
  // decision keyword routes), no strategic_option redirect crash (StubbedSourceLiveError) — forces the
  // full 6-lens set, and grounds every lens on the most relevant + current vault notes (the C2 edge).
  // replay/record keep the original two-pass decompose path below so fixtures stay byte-identical. The
  // only live dispatcher of open_qa is the in-app "ask anything" box (verified 2026-06-01); cash_lever
  // keeps its own Home tile, so this does not regress the proven cash path.
  const isLive = (process.env.STUB_MODE ?? 'replay') === 'live';
  if (isLive && !skipDecompose) {
    return runStrategicGrounded(input, ctx);
  }

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

// ── Strategic grounded path (V1 live default) ──────────────────────────────────

/**
 * The V1 strategic-decision path (live only). Bypasses the decomposer, forces the full 6-lens set,
 * grounds every lens on the live vault's most relevant + current notes, runs the real Synthesizer, and
 * appends a "Vault context used (with dates)" provenance block built from the SAME notes the lenses saw
 * (no re-query — C5's judge requires provenance == what grounded the memo). Grounding NEVER blocks the
 * run: an empty/zero-hit vault degrades to [] and the lenses honestly report UNKNOWN (the ungrounded
 * baseline). Source: tasks/V1_TARGET.md C1+C2; advisor review 2026-06-01.
 */
async function runStrategicGrounded(input: PlaybookInput, ctx: PlaybookContext): Promise<PlaybookResult> {
  const { runId, db, emit, vaultPath } = ctx;
  const allLenses: LensRole[] = ['CEO', 'CFO', 'CRO', 'CMO', 'CPO', 'COS'];

  let grounding: ReturnType<typeof buildVaultGrounding> = { contextDocuments: [], notes: [] };
  try {
    grounding = buildVaultGrounding(input.prompt, vaultPath);
  } catch (err) {
    log.warn({ runId, message: `open_qa strategic: vault grounding failed — running ungrounded: ${String(err)}` });
  }
  const grounded = grounding.contextDocuments.length > 0;
  log.info({ runId, message: `open_qa strategic: 6-lens, grounded=${grounded} (${grounding.notes.length} vault notes)` });

  // Evidence chain (C4 render / PRD "click any source → see the result"): record each injected note as
  // a `vault.retrieve` tool_calls row. The live path wrote ZERO tool_calls before this — fixing the
  // click handler alone returned empty. These rows light up BOTH the MemoViewer click panel and the
  // Verifier audit trail (playbookVerifier reads tool_calls WHERE run_id=?). source_id matches the
  // [^vault-N] marker renderVaultProvenance appends below. Never blocks the run — a write failure
  // degrades to "no evidence chain", not a failed decision.
  if (grounded) {
    try {
      const rows = buildVaultRetrievalRows(runId, input.prompt, grounding.notes);
      for (const row of rows) insertToolCall(db, row);
      log.info({ runId, message: `open_qa strategic: recorded ${rows.length} vault.retrieve tool_calls (evidence chain lit)` });
    } catch (err) {
      log.warn({ runId, message: `open_qa strategic: failed to record vault.retrieve tool_calls — memo ships, citations dark: ${String(err)}` });
    }
  }

  const lensOutputs: Record<string, unknown> = {};
  await Promise.all(
    allLenses.map(async (role) => {
      const bundle = buildLensBundle(role, runId, input.prompt, 'open_qa');
      if (grounded) {
        (bundle as { contextDocuments: ContextDoc[] }).contextDocuments = grounding.contextDocuments;
      }
      lensOutputs[role] = await dispatchLens(role, bundle, db, emit);
    }),
  );

  // Real Synthesizer authors the memo from the (grounded) lens outputs. Fail loud on an empty memo —
  // never fall back to a template under the DECOMPOSED_AD_HOC → CLEAN stamp (DOCTRINE #1).
  const synth = await dispatchSynthesizer(runId, input.prompt, 'open_qa', lensOutputs, db, emit);
  const parsed = SynthesizerMemoSchema.safeParse(synth);
  if (!parsed.success) throw new OpenQaOutputContractViolation(parsed.error.message);
  let memoMarkdown = parsed.data.memoMarkdown;

  if (grounded) {
    // Provenance block + honest data-scope note (advisor: vault .md only; live financials are Phase 4).
    memoMarkdown =
      `${memoMarkdown}\n\n${renderVaultProvenance(grounding.notes)}\n\n` +
      'Scope: grounded on Business Planning vault notes (.md) only; live NetSuite / Salesforce / cash-model data was not pulled this run.';
  }

  return {
    memoMarkdown,
    degradedSources: grounded ? [] : ['vault-grounding-empty'],
    lensOutputs,
    stamps: ['DECOMPOSED_AD_HOC'],
    rigorScore: null,
    rigorRawScore: null,
    rigorThreshold: RIGOR_THRESHOLD,
    proposedWritebacks: [],
  };
}

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
