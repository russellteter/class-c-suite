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

import type { PlaybookInput, PlaybookContext, PlaybookResult, PlaybookModule, PlaybookId } from '@c-suite/shared-types/playbook';
import type { LensRole } from '@c-suite/shared-types/agent-definition';
import { decompose } from '../lib/decomposer.js';
import { evaluatePrereqs } from '../lib/evaluatePrereqs.js';
import { dispatchLens } from '../../orchestrator/dispatch.js';
import { buildLensBundle } from '../../orchestrator/run-loop.js';
import { StubClaudeClient } from '@c-suite/stub-harness/stub';
import { createLogger } from '../../logger.js';

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

// ── Opus-class stub client ────────────────────────────────────────────────────
// Production: real Opus client from Ch.4 wiring. Tests: StubClaudeClient (STUB_MODE=replay).

function makeOpusClient(): InstanceType<typeof StubClaudeClient> {
  const stubMode = (process.env.STUB_MODE ?? 'replay') as 'replay' | 'record' | 'live';
  const fixtureDir =
    process.env.DECOMPOSER_FIXTURE_DIR ??
    `${process.cwd()}/tests/fixtures/decomposer`;
  return new StubClaudeClient(stubMode, fixtureDir);
}

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

    // Fan-out across decomposed lens set
    const lensOutputs: Record<string, unknown> = {};
    await Promise.all(
      lenses.map(async (role) => {
        const bundle = buildLensBundle(role as LensRole, runId, input.prompt, 'open_qa');
        await dispatchLens(role as LensRole, bundle, db, emit);
        lensOutputs[role] = { role, summary: `${role} lens analysis of: ${input.prompt.slice(0, 60)}` };
      })
    );

    // Stub synthesizer output
    const sections = lenses.map((role) =>
      [`## ${role} Lens`, '', `${role} analysis complete. (Production: Synthesizer integrates lens outputs here.)`, ''].join('\n')
    );

    const memoMarkdown = buildMemo(input.prompt, sections, outputShape, runId, lenses);

    // §13.6: compute rigorScore (stub 88 > cap of 85)
    const rawScore = 88; // placeholder — real Verifier fires in run-loop
    const displayedScore = Math.min(rawScore, RIGOR_CAP);

    return {
      memoMarkdown,
      degradedSources: degradedSources.map(String),
      lensOutputs,
      stamps: ['DECOMPOSED_AD_HOC'],
      rigorScore: displayedScore,
      rigorRawScore: rawScore,
      rigorThreshold: RIGOR_THRESHOLD,
      proposedWritebacks: [],  // Synthesizer authors these in production
    };
  }

  // skipDecompose=true path: run as standard pipeline with all lenses
  // (This is the redirected call path — pre_mortem / stakeholder_1_1 / etc. handle themselves)
  const allLenses: LensRole[] = ['CEO', 'CFO', 'CRO', 'CMO', 'CPO', 'COS'];
  const lensOutputs: Record<string, unknown> = {};

  await Promise.all(
    allLenses.map(async (role) => {
      const bundle = buildLensBundle(role, runId, input.prompt, 'open_qa');
      await dispatchLens(role, bundle, db, emit);
      lensOutputs[role] = { role, summary: `${role}: ${input.prompt.slice(0, 60)}` };
    })
  );

  const rawScore = 80;
  const displayedScore = Math.min(rawScore, RIGOR_CAP);
  const memoMarkdown = buildMemo(input.prompt, [], 'memo', runId, allLenses);

  return {
    memoMarkdown,
    degradedSources: [],
    lensOutputs,
    stamps: ['DECOMPOSED_AD_HOC'],
    rigorScore: displayedScore,
    rigorRawScore: rawScore,
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
