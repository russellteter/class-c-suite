// apps/utility/src/orchestrator/index.ts
// Source: docs/decisions/0002-ch1-process-architecture.md §3.3
// RunState machine skeleton — full state machine lands Ch.3.
// Ch.1 exposes resumeRun() API contract and checkpoint-resume query.

import { query } from '../sql/proxy.js';
import { createLogger } from '../logger.js';
import type Database from 'better-sqlite3';

const log = createLogger();

export interface AgentInvocationRecord {
  invocation_id: string;
  run_id: string;
  agent_role: string;
  started_at: number;
  completed_at: number | null;
  structured_output_json: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  reasoning_tokens: number | null;
  model: string | null;
  status: string;
}

/**
 * Resume an in-flight run from the last successful checkpoint.
 * Called by the utility process immediately after startup, before accepting new work.
 *
 * Algorithm:
 *   1. Query SQLite (via IPC to main) for any run with status = 'in_progress'.
 *   2. If none: ready for new work.
 *   3. If found: read the run's current_state, plan_json, and completed agent_invocations.
 *   4. Reconstruct in-memory RunState from the completed invocations (skip re-running them).
 *   5. Resume from the next incomplete lens.
 *   6. Emit run.start IPC event with the resumed runId.
 *
 * Full Ch.3 implementation replaces the skeleton body below.
 *
 * @param db Optional in-process Database handle for testing (bypasses IPC proxy).
 */
export async function resumeRun(runId: string, db?: Database.Database): Promise<void> {
  log.info({ runId, message: 'resumeRun called — skeleton in Ch.1; full impl Ch.3' });
  const completed = await loadCompletedInvocations(runId, db);
  log.info({ runId, message: `loaded ${completed.length} completed invocations for resume` });
  // Ch.3 reconstructs RunState and calls the orchestration loop here.
}

/**
 * Internal: read completed agent_invocations for a run from SQLite.
 * Returns only rows with status = 'completed'; skips 'in_progress' rows
 * (the in-progress invocation at crash time re-runs from scratch).
 *
 * Resume invariant: a lens that crashed mid-output (status 'in_progress'
 * in agent_invocations) is treated as not completed — it re-runs from scratch.
 *
 * @param db Optional in-process Database handle for testing (bypasses IPC proxy).
 */
export async function loadCompletedInvocations(
  runId: string,
  db?: Database.Database,
): Promise<AgentInvocationRecord[]> {
  if (db) {
    // Test injection path: query the in-process SQLite handle directly.
    const rows = db.prepare(
      `SELECT * FROM agent_invocations WHERE run_id = ? AND status = 'completed' ORDER BY started_at ASC`
    ).all(runId) as AgentInvocationRecord[];
    return rows;
  }
  const rows = await query(
    `SELECT * FROM agent_invocations WHERE run_id = ? AND status = 'completed' ORDER BY started_at ASC`,
    [runId]
  ) as unknown as AgentInvocationRecord[];
  return rows;
}

/**
 * Check for any in-progress run at startup and resume if found.
 * Called once at utility startup before accepting new work.
 */
export async function checkAndResumeInProgressRun(): Promise<void> {
  const rows = await query(
    `SELECT run_id FROM runs WHERE status = 'in_progress' LIMIT 1`,
    []
  ) as unknown as Array<{ run_id: string }>;

  if (rows.length === 0) {
    log.info({ message: 'no in-progress run found — ready for new work' });
    return;
  }

  const runId = rows[0].run_id;
  log.info({ runId, message: 'found in-progress run — resuming' });
  await resumeRun(runId);
}
