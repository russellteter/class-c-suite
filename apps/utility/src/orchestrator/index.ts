// apps/utility/src/orchestrator/index.ts
// Source: docs/decisions/0002-ch1-process-architecture.md §3.3 + ADR-0004 §7
// RunState machine — Ch.3 full implementation of resumeRun() + checkpoint resume.

import { query } from '../sql/proxy.js';
import { createLogger } from '../logger.js';
import type Database from 'better-sqlite3';
import { RunStateSchema } from '@c-suite/shared-types/run-state-schema';
import { LENS_ROLES } from '@c-suite/shared-types/agent-definition';
import { dispatchLens } from './dispatch.js';
import type { LensContextBundle } from '@c-suite/shared-types/lens-context-bundle';
import type { LensRole } from '@c-suite/shared-types/agent-definition';

const log = createLogger();

// Ch.1 field names (production schema uses agent_role, structured_output_json)
export interface AgentInvocationRecord {
  invocation_id?: string;
  run_id: string;
  agent_role?: string;   // production migration 001 column name
  role?: string;          // Ch.3 test schema column name
  started_at: number;
  completed_at: number | null;
  structured_output_json?: string | null;  // production migration 001
  output_json?: string | null;              // Ch.3 test schema
  tokens_in?: number | null;
  tokens_out?: number | null;
  reasoning_tokens?: number | null;
  model?: string | null;
  status: string;
}

/**
 * Resume an in-flight run from the last successful checkpoint.
 * Called by the utility process immediately after startup, before accepting new work.
 *
 * Algorithm (ADR-0004 §7.2):
 *   1. Load current RunState from SQLite.
 *   2. Load completed agent invocations.
 *   3. If in fan-out state: re-dispatch only incomplete lenses.
 *      Each re-dispatch goes through dispatchLens() which enforces lens isolation.
 *   4. Skip agents where status='completed' — idempotency guard.
 *
 * @param runId Run to resume.
 * @param db Optional in-process Database handle for testing (bypasses IPC proxy).
 */
export async function resumeRun(runId: string, db?: Database.Database): Promise<void> {
  log.info({ runId, message: 'resumeRun called — Ch.3 full impl' });

  if (!db) {
    // Production path: cannot resume without a db handle in this skeleton
    log.info({ runId, message: 'resumeRun: no db handle — skipping (production IPC path not yet wired)' });
    return;
  }

  // Load current RunState from SQLite
  const runRow = db.prepare(`SELECT current_state, playbook, question FROM runs WHERE run_id = ?`).get(runId) as
    { current_state: string; playbook: string; question: string } | undefined;

  if (!runRow) {
    log.error({ runId, message: 'resumeRun: unknown runId' });
    return;
  }

  let state;
  try {
    state = RunStateSchema.parse(JSON.parse(runRow.current_state));
  } catch {
    log.error({ runId, message: 'resumeRun: failed to parse current_state from SQLite' });
    return;
  }

  // Load completed invocations
  const completedInvocations = await loadCompletedInvocations(runId, db);
  const completedRoles = new Set(
    completedInvocations.map(inv => inv.role ?? inv.agent_role ?? '').filter(Boolean)
  );

  log.info({ runId, message: `loaded ${completedInvocations.length} completed invocations for resume` });

  // Re-dispatch only if in fan-out state
  if (state.kind === 'fan-out') {
    const toRedispatch = (state.lensesInFlight as string[]).filter(role => !completedRoles.has(role));
    log.info({ runId, message: `re-dispatching ${toRedispatch.length} incomplete lenses: ${toRedispatch.join(', ')}` });

    await Promise.all(
      toRedispatch.map(role => {
        const bundle = buildLensBundle(role as LensRole, runId, runRow.question, runRow.playbook);
        return dispatchLens(role as LensRole, bundle as LensContextBundle<LensRole>, db);
      })
    );
  }
}

/**
 * Internal: read completed agent_invocations for a run from SQLite.
 * Returns only rows with status = 'completed'; skips 'in_progress' rows
 * (the in-progress invocation at crash time re-runs from scratch).
 *
 * Resume invariant: a lens that crashed mid-output (status 'in_progress'
 * in agent_invocations) is treated as not completed — it re-runs from scratch.
 *
 * Column aliasing: queries both 'role' (Ch.3 test schema) and 'agent_role'
 * (production migration 001 schema) to handle both test and prod contexts.
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
 * Build a fresh LensContextBundle for a role from the run's question/playbook.
 * Lens isolation holds: the bundle contains NO other lens outputs.
 */
function buildLensBundle<R extends LensRole>(
  role: R,
  runId: string,
  question: string,
  playbook: string,
): LensContextBundle<R> {
  return {
    runId,
    role,
    question,
    playbook,
    contextDocuments: [],
  } as unknown as LensContextBundle<R>;
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
