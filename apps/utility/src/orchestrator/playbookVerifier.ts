// apps/utility/src/orchestrator/playbookVerifier.ts
// B47 Phase 2 (audit Finding 2): run the REAL Verifier on the Ch.7 early-return
// playbooks, replacing the hardcoded `rigorScore = NN` placeholders that used to
// live in each playbook body.
//
// Why this lives here and not in each playbook:
//   The generic Ch.5 path (run-loop.ts ~207-247) assembles a strict VerifierInput
//   from SQLite via buildVerifierInput() and runs runVerifier(). The 8 Ch.7
//   early-return playbooks never seed those DB rows (no 6-lens fan-out, no
//   Synthesizer/RedTeam/Steelman agent_invocations), so buildVerifierInput() would
//   fail closed. Instead we adapt the in-memory PlaybookResult into a VerifierInput
//   and run the SAME runVerifier(). One site, not eight.
//
// Live vs replay asymmetry (the whole point):
//   STUB_MODE=live   → real Verifier MUST produce a score. Any failure RETHROWS
//                      (fail loud — never silently fabricate in production).
//   STUB_MODE=replay → the StubClaudeClient has no fixture for these content-hashed
//                      calls and throws ENOENT. We fall back to a clearly-labelled
//                      REPLAY-ONLY constant so tests/dev keep moving. These constants
//                      are honest test artifacts (analogous to fixtures), NOT
//                      production scores.

import type Database from 'better-sqlite3';
import type { VerifierInput, ToolCallAuditEntry } from '@c-suite/shared-types/verifier-input';
import type { PlaybookResult, PlaybookId } from '@c-suite/shared-types/playbook';
import { runVerifier, StubVerifierInvoker } from '../agents/verifier-runner.js';
import { modelClientFromEnv } from '../agents/modelClient.js';
import { rigorScore, applyRigorCap, rigorThreshold, type PlaybookId as RigorPlaybookId } from '../scoring/rigorScore.js';

// rigorScore.ts uses a separate internal taxonomy (gtm_reallocation/stakeholder_prep)
// shared with classify-playbook.ts. The wire-level PlaybookId (gtm_realloc/
// stakeholder_1_1) differs only for playbooks that hit the default cap/threshold
// branch, so casting is safe: every name the cap/threshold functions special-case
// (strategic_option, restructure_decision, open_qa, quick_read, cash_lever) is
// spelled identically in both taxonomies.
const cap = (score: number, id: PlaybookId): number =>
  applyRigorCap(score, id as unknown as RigorPlaybookId);
const threshold = (id: PlaybookId): number =>
  rigorThreshold(id as unknown as RigorPlaybookId);

/**
 * Replay-only fallback rigor scores. Used ONLY when STUB_MODE!=live and the stub
 * client has no Verifier fixture. NEVER used in production (live mode rethrows).
 * Values match the pre-B47 placeholders so existing replay-mode expectations hold.
 */
export const REPLAY_FALLBACK_RIGOR: Record<PlaybookId, number> = {
  strategic_option: 82,
  restructure_decision: 83,
  board_narrative: 75,
  gtm_realloc: 74,
  stakeholder_1_1: 75,
  pre_mortem: 72,
  open_qa: 88, // pre-cap; applyRigorCap clamps to 85
  quick_read: 0, // Verifier bypassed — never scored
  cash_lever: 0, // generic-path playbook — not scored here
};

/**
 * Adapt an in-memory PlaybookResult into a VerifierInput.
 *
 * Typed as VerifierInput but NOT re-validated against VerifierInputSchema —
 * runVerifier() only reads and JSON-stringifies these fields; the strict schema
 * (6 lenses, non-empty positionMetadata) is enforced solely by buildVerifierInput()
 * on the generic path. Adversarial-only playbooks legitimately carry 0 lens outputs.
 */
export function buildPlaybookVerifierInput(
  result: PlaybookResult,
  runId: string,
  playbookId: PlaybookId,
  question: string,
  db: Database.Database,
): VerifierInput {
  const lensMap = (result.lensOutputs ?? {}) as Record<string, unknown>;
  const redTeamOutput = lensMap['RedTeam'];
  const steelmanOutput = lensMap['Steelman'];
  // Everything that is not RedTeam/Steelman is a lens output.
  const lensOutputs = Object.entries(lensMap)
    .filter(([role]) => role !== 'RedTeam' && role !== 'Steelman')
    .map(([, output]) => output);

  // Real recorded tool calls for this run (empty list is valid).
  let toolCallAuditTrail: ToolCallAuditEntry[] = [];
  try {
    const rows = db
      .prepare(
        `SELECT id as toolCallId, role, tool_name as toolName,
                input_json as inputJson, result_json as resultJson, ts
         FROM tool_calls WHERE run_id = ? ORDER BY ts ASC`,
      )
      .all(runId) as Array<{
      toolCallId: number;
      role: string;
      toolName: string;
      inputJson: string;
      resultJson: string;
      ts: number;
    }>;
    toolCallAuditTrail = rows.map((r) => ({
      toolCallId: r.toolCallId,
      role: r.role as ToolCallAuditEntry['role'],
      toolName: r.toolName,
      inputJson: safeParse(r.inputJson),
      resultJson: safeParse(r.resultJson),
      ts: r.ts,
    }));
  } catch {
    // tool_calls table absent or unreadable — empty trail is valid.
    toolCallAuditTrail = [];
  }

  return {
    runId,
    memoMarkdown: result.memoMarkdown || '(empty memo)',
    lensOutputs: lensOutputs as VerifierInput['lensOutputs'],
    toolCallAuditTrail,
    positionMetadata: [] as VerifierInput['positionMetadata'],
    redTeamOutput: redTeamOutput as VerifierInput['redTeamOutput'],
    steelmanOutput: steelmanOutput as VerifierInput['steelmanOutput'],
    runPlaybook: playbookId,
    runQuestion: question,
    assembledAt: Math.floor(Date.now() / 1000),
  };
}

export interface PlaybookRigor {
  /** Final, cap-applied rigor score. */
  rigorScore: number;
  /** Pre-cap raw score (matters only for open_qa, which caps at 85). */
  rigorRawScore: number;
  /** True when the score came from a fallback constant (replay only), not a real run. */
  fellBack: boolean;
}

/**
 * Run the real Verifier on a playbook result and return its rigor score.
 * Live mode: rethrows on any Verifier failure (fail loud).
 * Replay/record: falls back to REPLAY_FALLBACK_RIGOR[playbookId].
 */
export async function scorePlaybookRigor(
  result: PlaybookResult,
  runId: string,
  playbookId: PlaybookId,
  question: string,
  db: Database.Database,
  fixtureDir?: string,
): Promise<PlaybookRigor> {
  const isLive = (process.env.STUB_MODE ?? 'replay') === 'live';
  try {
    const input = buildPlaybookVerifierInput(result, runId, playbookId, question, db);
    const client = modelClientFromEnv(fixtureDir);
    const invoker = new StubVerifierInvoker(client, runId, playbookId, question);
    const output = await runVerifier(input, { invoker });
    const raw = rigorScore(output);
    return { rigorScore: cap(raw, playbookId), rigorRawScore: raw, fellBack: false };
  } catch (err) {
    if (isLive) throw err; // production: never fabricate — surface the failure
    const raw = REPLAY_FALLBACK_RIGOR[playbookId] ?? 0;
    return { rigorScore: cap(raw, playbookId), rigorRawScore: raw, fellBack: true };
  }
}

/**
 * Recompute the CLEAN/DRAFT ship stamp from the (now real) rigor score, preserving
 * every non-ship stamp the playbook emitted (DEGRADED, ADVERSARIAL_ONLY, type stamps).
 * Playbooks no longer emit CLEAN/DRAFT themselves; this is the single place that does.
 * Playbooks that carry no ship stamp by design (open_qa → DECOMPOSED_AD_HOC,
 * quick_read → QUICK_READ) are left untouched.
 */
export function applyShipStamp(
  stamps: string[],
  score: number,
  playbookId: PlaybookId,
): string[] {
  // open_qa / quick_read do not use CLEAN/DRAFT.
  if (playbookId === 'open_qa' || playbookId === 'quick_read') return stamps;
  const passed = cap(score, playbookId) >= threshold(playbookId);
  const preserved = stamps.filter((s) => s !== 'CLEAN' && s !== 'DRAFT');
  return [...preserved, passed ? 'CLEAN' : 'DRAFT'];
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
