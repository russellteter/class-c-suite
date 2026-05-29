// apps/utility/src/playbooks/quick-read/index.ts
// Source: docs/decisions/0009-ch7-playbooks-home.md §10 + §3.5 + §13.5
//
// Quick Multi-Lens Read playbook.
//   LENSES = ['CEO', 'CFO', 'CRO', 'CMO', 'CPO', 'COS'] — all six in parallel
//   Verifier BYPASSED — shipStatus: 'quick', rigorScore: null, rigorThreshold: 0
//   Writebacks DISABLED — proposedWritebacks: []
//   Stamp: QUICK_READ
//
// Pipeline (ADR-0009 §3.5):
//   1. evaluatePrereqs — always proceeds; stale MCPs flagged per-lens
//   2. Parallel fan-out across all six lenses
//   3. Lightweight aggregator (inline — not Synthesizer):
//      - Concatenate each lens output's summary in fixed section order
//      - Section order: COS / CFO / CRO / CMO / CPO / CEO
//      - Cap each section at 5 sentences
//   4. Return QUICK_READ result — no Verifier, no writebacks
//
// Token meter ribbon is the only quality signal shown in the UI (§13.5).

import type { PlaybookInput, PlaybookContext, PlaybookResult, PlaybookModule, StubbedSource } from '@c-suite/shared-types/playbook';

// B47 honest-stub declaration: Verifier intentionally bypassed by design (ADR-0009 §3.5); no fabricated data.
export const STUBBED_SOURCES: readonly StubbedSource[] = [];
import type { LensRole } from '@c-suite/shared-types/agent-definition';
import { evaluatePrereqs } from '../lib/evaluatePrereqs.js';
import { dispatchLens } from '../../orchestrator/dispatch.js';
import { buildLensBundle } from '../../orchestrator/run-loop.js';
import { createLogger } from '../../logger.js';

const log = createLogger();

export const LENSES: readonly LensRole[] = ['CEO', 'CFO', 'CRO', 'CMO', 'CPO', 'COS'] as const;
// Section order for the aggregated memo: COS first per ADR-0009 §10
const SECTION_ORDER: readonly LensRole[] = ['COS', 'CFO', 'CRO', 'CMO', 'CPO', 'CEO'] as const;
const RIGOR_THRESHOLD = 0;  // placeholder — Verifier bypassed; rigorThreshold is a no-op

// ── Sentence capper ────────────────────────────────────────────────────────────

/**
 * Trim text to at most maxSentences sentences.
 * Splits on sentence-ending punctuation. Returns original if fewer sentences.
 */
function capSentences(text: string, maxSentences: number): string {
  const sentences = text.match(/[^.!?]*[.!?]+/g) ?? [text];
  return sentences.slice(0, maxSentences).join(' ').trim();
}

// ── Lens stub output (Phase A — real dispatch wired in run-loop integration) ──

/**
 * Build a stub lens summary for a given role.
 * In production, dispatchLens fires the real agent and the lens output's `summary`
 * field is used by the aggregator. Phase A uses this stub contract.
 */
function stubLensSummary(role: LensRole, prompt: string): string {
  const roleDescriptions: Record<LensRole, string> = {
    CEO: 'Strategic framing: this question touches core mission alignment and long-term optionality. The key risk is overindexing on short-term signals at the expense of positioning.',
    CFO: 'Financial lens: cash impact is bounded and manageable given current liquidity. The decision point is whether payback is within 12 months.',
    CRO: 'Revenue lens: pipeline impact is neutral to slightly positive. The main watch item is whether this creates customer-facing disruption during a key renewal cycle.',
    CMO: 'Marketing lens: brand and positioning implications are low-risk. There is an opportunity to use this as a signal of strategic momentum if communicated correctly.',
    CPO: 'Product lens: no critical path dependencies. The technical debt exposure is manageable and can be deferred to Q3 without material risk.',
    COS: 'Operational lens: execution feasibility is high given current team capacity. The key constraint is sequencing — this should not run concurrently with the other major initiative.',
  };
  return `${roleDescriptions[role]} (Prompt context: ${prompt.slice(0, 40)}...)`;
}

// ── runPlaybook ───────────────────────────────────────────────────────────────

export const runPlaybook: PlaybookModule['runPlaybook'] = async (
  input: PlaybookInput,
  ctx: PlaybookContext,
): Promise<PlaybookResult> => {
  const { runId, db, emit } = ctx;

  log.info({ runId, message: `quick_read: starting — prompt: "${input.prompt.slice(0, 60)}"` });

  // 1. evaluatePrereqs — always proceeds for quick_read
  const prereq = evaluatePrereqs('quick_read', ctx.deps);
  const degradedSources = prereq.kind === 'degrade' ? prereq.flags : [];

  if (prereq.kind === 'degrade') {
    emit({ kind: 'playbook.prereq.degraded' as never, payload: { playbookId: 'quick_read', flags: prereq.flags } as never });
  }

  // 2. Parallel fan-out across all six lenses
  const lensOutputs: Record<string, unknown> = {};

  // U3: use the captured dispatchLens return in LIVE; keep the canned stub in REPLAY/RECORD.
  // dispatchLens already routes to the real client, unwraps .structuredOutput, validates against
  // LensOutputSchema (summary is .min(1)), and FAILS LOUD via onSubagentStop on a parse miss (O1) —
  // so the live summary is real or the run throws (DOCTRINE #1; cron has notifyOnFailure). Previously
  // the real return was discarded and OVERWRITTEN with stubLensSummary, which the daily-morning-brief
  // cron then persisted to the vault under a QUICK_READ stamp as if it were real analysis. No stub
  // fallback in live — that would re-introduce the exact bug. dispatchLens still fires in both modes
  // (its hooks + agent.complete side effects are relied on); only the persisted summary differs.
  const isLive = (process.env.STUB_MODE ?? 'replay') === 'live';

  await Promise.all(
    LENSES.map(async (role) => {
      const bundle = buildLensBundle(role, runId, input.prompt, 'quick_read');
      const output = await dispatchLens(role, bundle, db, emit);
      lensOutputs[role] = isLive
        ? { role, summary: output.summary }
        : { role, summary: stubLensSummary(role, input.prompt) };
    })
  );

  log.info({ runId, message: 'quick_read: all 6 lens dispatches complete' });

  // 3. Lightweight aggregator: fixed section order COS/CFO/CRO/CMO/CPO/CEO, cap 5 sentences each
  const sections = SECTION_ORDER.map((role) => {
    const output = lensOutputs[role] as { summary?: string } | undefined;
    const summary = output?.summary ?? `${role}: No data available.`;
    const capped = capSentences(summary, 5);
    return [`## ${role} Lens`, '', capped, ''].join('\n');
  });

  const degradedNote = degradedSources.length > 0
    ? `\n> **Degraded:** ${degradedSources.join(', ')} unavailable. Affected lens sections may be incomplete.\n`
    : '';

  const memoMarkdown = [
    `# Quick Read: ${input.prompt.slice(0, 80)}`,
    '',
    degradedNote,
    '> **QUICK READ** — Six lenses, no Red-Team, no Verifier. For prep when six angles in 90 seconds matter more than rigor.',
    '',
    ...sections,
    '---',
    `_Run ID: ${runId} | Playbook: quick_read | Lenses: ${LENSES.join(', ')}_`,
  ].join('\n');

  // 4. Return QUICK_READ result — Verifier bypassed, writebacks disabled
  return {
    memoMarkdown,
    degradedSources: degradedSources.map(String),
    lensOutputs,
    stamps: ['QUICK_READ'],
    rigorScore: null,        // Verifier bypassed per §3.5 + §13.5
    rigorThreshold: RIGOR_THRESHOLD,
    proposedWritebacks: [],  // Disabled per §3.5
  };
};
