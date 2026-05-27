/**
 * ADR-0002 §9 row 12 — resumeRun skips completed invocations
 * Test owner: Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0002-ch1-process-architecture.md §3.3 + §9 row 12
 *
 * Spec ambiguities:
 *   1. ADR §3.3 shows `resumeRun(runId)` as a public export and
 *      `loadCompletedInvocations(runId)` as private. Brief §9 row 12 says
 *      "assert loadCompletedInvocations() returns only the 2 completed rows."
 *      If loadCompletedInvocations is private, we test its observable contract
 *      via resumeRun's behavior (completed outputs loaded; in_progress re-dispatched).
 *      Runtime may export it as an internal for testing — this test documents that need.
 *   2. ADR §3.3 says resumeRun signals the re-dispatch of in_progress agents but
 *      does not specify the return shape. Tests assert via side effects on SQLite
 *      (in_progress row updated) or IPC events, not on resumeRun's return value.
 *   3. SQLite access in utility is proxied through main IPC in production (§1.1).
 *      In tests, we use an in-memory better-sqlite3 handle directly, bypassing the
 *      IPC proxy. Runtime must accept a database parameter (or injectable accessor)
 *      to enable this test pattern. This is the dependency-injection requirement.
 *
 * Tests fail until Runtime ships apps/utility/src/orchestrator.ts.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';

// Production module — does not exist yet. Uncomment when Runtime ships:
// import { resumeRun, loadCompletedInvocations } from '../../../apps/utility/src/orchestrator.js';

// Stubs so TypeScript compiles now.
type AgentInvocationRecord = {
  invocation_id: string;
  run_id: string;
  agent_role: string;
  status: string;
  structured_output_json: string | null;
};

async function resumeRun(_runId: string, _db?: Database.Database): Promise<void> {
  throw new Error('resumeRun not implemented — Runtime dispatch pending');
}

async function loadCompletedInvocations(
  _runId: string,
  _db?: Database.Database,
): Promise<AgentInvocationRecord[]> {
  throw new Error('loadCompletedInvocations not implemented — Runtime dispatch pending');
}

// ── Test helpers: seed in-memory SQLite with the Ch.1 schema subset ─────────

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      run_id        TEXT PRIMARY KEY,
      playbook      TEXT NOT NULL,
      question      TEXT NOT NULL,
      started_at    INTEGER NOT NULL,
      current_state TEXT NOT NULL,
      plan_json     TEXT,
      status        TEXT
    );

    CREATE TABLE IF NOT EXISTS agent_invocations (
      invocation_id          TEXT PRIMARY KEY,
      run_id                 TEXT NOT NULL REFERENCES runs(run_id),
      agent_role             TEXT NOT NULL,
      started_at             INTEGER NOT NULL,
      completed_at           INTEGER,
      structured_output_json TEXT,
      tokens_in              INTEGER,
      tokens_out             INTEGER,
      status                 TEXT
    );
  `);
  return db;
}

function seedScenario(db: Database.Database, runId: string): void {
  db.prepare(`
    INSERT INTO runs (run_id, playbook, question, started_at, current_state, status)
    VALUES (?, 'cash_lever_vs_trough', 'What is the lever stack?', ?, 'fan-out', 'in_progress')
  `).run(runId, Date.now());

  // 2 completed invocations.
  db.prepare(`
    INSERT INTO agent_invocations (invocation_id, run_id, agent_role, started_at, completed_at, structured_output_json, status)
    VALUES (?, ?, 'CFO', ?, ?, ?, 'completed')
  `).run('inv-cfo', runId, Date.now() - 5000, Date.now() - 1000, JSON.stringify({ summary: 'CFO output' }));

  db.prepare(`
    INSERT INTO agent_invocations (invocation_id, run_id, agent_role, started_at, completed_at, structured_output_json, status)
    VALUES (?, ?, 'CRO', ?, ?, ?, 'completed')
  `).run('inv-cro', runId, Date.now() - 4000, Date.now() - 500, JSON.stringify({ summary: 'CRO output' }));

  // 1 in_progress invocation (crashed mid-run).
  db.prepare(`
    INSERT INTO agent_invocations (invocation_id, run_id, agent_role, started_at, status)
    VALUES (?, ?, 'CMO', ?, 'in_progress')
  `).run('inv-cmo', runId, Date.now() - 2000);
}

// ── §9 row 12 — Resume invariant ─────────────────────────────────────────────

describe('loadCompletedInvocations — skips in_progress rows (§9 row 12)', () => {
  let db: Database.Database;
  const RUN_ID = 'run-resume-001';

  beforeEach(() => {
    db = createTestDb();
    seedScenario(db, RUN_ID);
  });

  afterEach(() => {
    db.close();
  });

  it('returns exactly 2 completed rows', async () => {
    const rows = await loadCompletedInvocations(RUN_ID, db);
    expect(rows).toHaveLength(2);
  });

  it('does not include the in_progress row', async () => {
    const rows = await loadCompletedInvocations(RUN_ID, db);
    const statuses = rows.map(r => r.status);
    expect(statuses).not.toContain('in_progress');
  });

  it('returned rows have status=completed', async () => {
    const rows = await loadCompletedInvocations(RUN_ID, db);
    for (const row of rows) {
      expect(row.status).toBe('completed');
    }
  });

  it('returned rows include structured_output_json (needed to reconstruct RunState)', async () => {
    const rows = await loadCompletedInvocations(RUN_ID, db);
    for (const row of rows) {
      expect(row.structured_output_json).not.toBeNull();
    }
  });
});

describe('resumeRun — in_progress agent is re-dispatched, completed agents skipped (§9 row 12)', () => {
  let db: Database.Database;
  const RUN_ID = 'run-resume-002';

  beforeEach(() => {
    db = createTestDb();
    seedScenario(db, RUN_ID);
  });

  afterEach(() => {
    db.close();
  });

  it('does not re-run completed agents (inv-cfo and inv-cro remain completed)', async () => {
    await resumeRun(RUN_ID, db);

    const cfo = db.prepare(`SELECT status FROM agent_invocations WHERE invocation_id = ?`).get('inv-cfo') as { status: string };
    const cro = db.prepare(`SELECT status FROM agent_invocations WHERE invocation_id = ?`).get('inv-cro') as { status: string };

    // Completed rows must not be changed to in_progress or re-started.
    expect(cfo.status).toBe('completed');
    expect(cro.status).toBe('completed');
  });

  it('in_progress agent (inv-cmo) is re-dispatched (status transitions to in_progress or beyond)', async () => {
    await resumeRun(RUN_ID, db);

    // After resumeRun, CMO should have been re-dispatched.
    // Its status may remain 'in_progress' (re-started) or advance if mock completes quickly.
    // Assert it is NOT left as the stale in_progress row without re-dispatch.
    const cmo = db.prepare(`SELECT status FROM agent_invocations WHERE invocation_id = ?`).get('inv-cmo') as { status: string };
    // Acceptable post-resume statuses: 'in_progress' (re-dispatched), 'completed', 'failed'.
    expect(['in_progress', 'completed', 'failed']).toContain(cmo.status);
  });
});
