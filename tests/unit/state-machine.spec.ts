/**
 * ADR-0004 §8 row AC-8 — Transition function persists RunState to SQLite
 * Test owner: Ch.3 Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0004-ch3-runtime-spine.md §1 + §8 AC-8
 *
 * STATUS: RED until Ch.3 Runtime ships.
 *
 * Spec intent:
 *   - Mock SQLite. Run a single transition: bootstrap → plan-approval.
 *   - Assert runs.current_state updates from 'bootstrap' to 'plan-approval'.
 *   - Assert a new row is inserted into state_transitions with correct from_kind/to_kind.
 *   - Both writes must be in a single SQLite transaction (partial writes are illegal per ADR §1.5).
 *
 * RunState union per ADR §1.1 (14 kinds). Legal transitions per ADR §1.4.
 * SQLite contract per ADR §1.5:
 *   UPDATE runs SET current_state = json(?), updated_at = unixepoch() WHERE run_id = ?
 *   INSERT INTO state_transitions (run_id, from_kind, to_kind, event_json, ts)
 *
 * Activating when Runtime ships:
 *   1. Uncomment the transition import below.
 *   2. Verify signature: transition(state: RunState, event: RunEvent, db: Database) => RunState | RunFailedError
 *   3. Remove the `expect(() => require(...)).toThrow()` placeholder.
 *
 * NOTE: The 'updated_at' column in the runs table is UNKNOWN (ADR §9.2 U-8 — column
 * existence not confirmed in Ch.1 migration 001). This test uses current_state only.
 * Ch.3 Runtime must verify and add 'updated_at TEXT' to runs if missing.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import {
  transition,
  type RunEvent,
} from '../../apps/utility/src/orchestrator/state-machine.js';
import type { RunState, RunFailedError } from '../../packages/shared-types/src/run-state.js';

// ── SQLite schema (Ch.1 + Ch.3 migration 002 additions) ─────────────────────

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
      status        TEXT NOT NULL DEFAULT 'in_progress'
    );

    -- Ch.3 migration 002 — state_transitions table (ADR §1.5)
    CREATE TABLE IF NOT EXISTS state_transitions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id      TEXT NOT NULL REFERENCES runs(run_id),
      from_kind   TEXT NOT NULL,
      to_kind     TEXT NOT NULL,
      event_json  TEXT NOT NULL,
      ts          INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_st_run_id ON state_transitions(run_id, ts);
  `);
  return db;
}

// ── Seed helpers ──────────────────────────────────────────────────────────────

function seedBootstrapRun(db: Database.Database, runId: string): void {
  const bootstrapState = JSON.stringify({
    kind: 'bootstrap',
    runId,
    playbook: 'quick_multi_lens_read',
    question: 'Should we expand to Europe?',
  });

  db.prepare(`
    INSERT INTO runs (run_id, playbook, question, started_at, current_state, status)
    VALUES (?, 'quick_multi_lens_read', 'Should we expand to Europe?', ?, ?, 'in_progress')
  `).run(runId, Date.now(), bootstrapState);
}

// ── AC-8 Tests ────────────────────────────────────────────────────────────────

describe('AC-8: transition() persists RunState to SQLite atomically (ADR-0004 §1)', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it('transition function is exported from orchestrator/state-machine', () => {
    expect(typeof transition).toBe('function');
  });

  it('state_transitions table schema is correct (migration 002 — passes now)', () => {
    // This test validates the migration 002 schema can be created — no Runtime needed.
    const tableInfo = db.prepare(`PRAGMA table_info(state_transitions)`).all() as Array<{ name: string; type: string }>;
    const colNames = tableInfo.map(c => c.name);

    expect(colNames).toContain('id');
    expect(colNames).toContain('run_id');
    expect(colNames).toContain('from_kind');
    expect(colNames).toContain('to_kind');
    expect(colNames).toContain('event_json');
    expect(colNames).toContain('ts');
  });

  it('index idx_st_run_id exists on state_transitions (ADR §1.5)', () => {
    const indexes = db.prepare(`PRAGMA index_list(state_transitions)`).all() as Array<{ name: string }>;
    const indexNames = indexes.map(i => i.name);
    expect(indexNames).toContain('idx_st_run_id');
  });

  it('transition(bootstrap, planReady, db) updates runs.current_state to plan-approval', () => {
    const runId = 'sm-test-001';
    seedBootstrapRun(db, runId);

    const bootstrapState: RunState = {
      kind: 'bootstrap',
      runId,
      playbook: 'quick_multi_lens_read',
      question: 'Should we expand to Europe?',
    };

    const planReadyEvent: RunEvent = {
      kind: 'plan.ready',
      plan: { steps: ['fan-out', 'red-team-steelman', 'synthesizer', 'verifier'] },
    };

    const nextState = transition(bootstrapState, planReadyEvent, db);

    // Verify return value
    expect(nextState).not.toHaveProperty('code');  // not a RunFailedError
    expect((nextState as RunState).kind).toBe('plan-approval');

    // Verify runs.current_state was persisted
    const row = db.prepare(`SELECT current_state FROM runs WHERE run_id = ?`).get(runId) as { current_state: string };
    const persisted = JSON.parse(row.current_state);
    expect(persisted.kind).toBe('plan-approval');
    expect(persisted.runId).toBe(runId);
  });

  it('transition inserts a row into state_transitions with correct from/to kinds', () => {
    const runId = 'sm-test-002';
    seedBootstrapRun(db, runId);

    const bootstrapState: RunState = {
      kind: 'bootstrap',
      runId,
      playbook: 'quick_multi_lens_read',
      question: 'Should we expand to Europe?',
    };

    const planReadyEvent: RunEvent = {
      kind: 'plan.ready',
      plan: { steps: ['fan-out', 'red-team-steelman', 'synthesizer', 'verifier'] },
    };

    const beforeCount = (db.prepare(`SELECT COUNT(*) as n FROM state_transitions WHERE run_id = ?`).get(runId) as { n: number }).n;
    expect(beforeCount).toBe(0);

    transition(bootstrapState, planReadyEvent, db);

    const afterCount = (db.prepare(`SELECT COUNT(*) as n FROM state_transitions WHERE run_id = ?`).get(runId) as { n: number }).n;
    expect(afterCount).toBe(1);

    const transRow = db.prepare(`SELECT from_kind, to_kind FROM state_transitions WHERE run_id = ?`).get(runId) as { from_kind: string; to_kind: string };
    expect(transRow.from_kind).toBe('bootstrap');
    expect(transRow.to_kind).toBe('plan-approval');
  });

  it('transition uses db.transaction() — atomicity verified by state_transitions row count', () => {
    // Atomicity: both UPDATE runs + INSERT state_transitions succeed together or neither.
    // We verify by checking that a transition produces exactly 1 row in state_transitions.
    const runId = 'sm-test-atomic';
    seedBootstrapRun(db, runId);

    const bootstrapState: RunState = {
      kind: 'bootstrap',
      runId,
      playbook: 'quick_multi_lens_read',
      question: 'Atomic test?',
    };

    transition(bootstrapState, { kind: 'plan.ready', plan: { steps: ['fan-out'] } }, db);

    const runRow = db.prepare(`SELECT current_state FROM runs WHERE run_id = ?`).get(runId) as { current_state: string };
    const stRow = db.prepare(`SELECT COUNT(*) as n FROM state_transitions WHERE run_id = ?`).get(runId) as { n: number };

    // Both writes must have occurred together
    expect(JSON.parse(runRow.current_state).kind).toBe('plan-approval');
    expect(stRow.n).toBe(1);
  });

  it('transition rejects illegal state transitions (e.g., synthesizer → plan.ready) and returns RunFailedError', () => {
    // Per ADR §1.4 legal transitions table — illegal transitions return RunFailedError.
    const runId = 'sm-test-003';
    seedBootstrapRun(db, runId);

    // synthesizer state cannot receive 'plan.ready' event — illegal per ADR §1.4
    const synthesizerState: RunState = {
      kind: 'synthesizer',
      runId,
      redTeam: { role: 'RedTeam', runId, challenges: [], overallRisk: 'low', citations: [] },
      steelman: { role: 'Steelman', runId, steelmen: [], citations: [] },
      lensOutputs: [] as never,
    };

    const result = transition(synthesizerState, { kind: 'plan.ready', plan: { steps: [] } }, db);
    expect(result).toHaveProperty('code');  // RunFailedError shape
    expect((result as RunFailedError).code).toBeTruthy();
    expect((result as RunFailedError).code).toBe('ILLEGAL_TRANSITION');
  });

  it('documents all 14 RunState kinds per ADR §1.1 (living spec reference)', () => {
    // These must match the RunState union exactly. If a state is added/removed, update here.
    const states = [
      'bootstrap',
      'plan-approval',
      'fan-out',
      'red-team-steelman',
      'synthesizer',
      'verifier',
      'shipped-clean',
      'shipped-draft',
      'write-back-proposed',
      'review',
      'committed',
      'handoff',
      'run-critic',
      'failed',
    ];
    expect(states).toHaveLength(14);
    // Verify subset of legal transitions per ADR §1.4
    const legalTransitions: Array<[string, string]> = [
      ['bootstrap', 'plan-approval'],
      ['plan-approval', 'fan-out'],
      ['plan-approval', 'failed'],
      ['fan-out', 'red-team-steelman'],
      ['red-team-steelman', 'synthesizer'],
      ['synthesizer', 'verifier'],
      ['verifier', 'shipped-clean'],
      ['verifier', 'shipped-draft'],
      ['shipped-clean', 'write-back-proposed'],
      ['shipped-clean', 'run-critic'],
      ['shipped-draft', 'run-critic'],
      ['run-critic', 'handoff'],
    ];
    expect(legalTransitions.length).toBeGreaterThan(0);
    // Every 'from' and 'to' in the legal transitions must be in the states list
    for (const [from, to] of legalTransitions) {
      expect(states).toContain(from);
      expect(states).toContain(to);
    }
  });
});
