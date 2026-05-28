/**
 * ADR-0004 §8 rows AC-4 + AC-9 — Node-granular checkpoint resume + idempotency guard
 * Test owner: Ch.3 Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0004-ch3-runtime-spine.md §7 + §8 AC-4 + AC-9
 *
 * Extends: tests/unit/orchestrator-resume.spec.ts (Ch.1 baseline — skips completed invocations).
 * Ch.3 adds: mid-fan-out resume, fully-complete fan-out skip, lens isolation during resume.
 *
 * STATUS: RED until Ch.3 Runtime ships.
 *
 * AC-4 Spec intent:
 *   - Mid-fan-out resume: 3 of 6 lenses completed; resumeRun() re-dispatches exactly 3 remaining.
 *   - Fully-complete fan-out: all 6 lenses done; resume skips fan-out entirely.
 *   - Lens isolation holds during resume (re-dispatched lenses see isolated bundles, not peer outputs).
 *
 * AC-9 Spec intent:
 *   - Idempotency guard: calling resumeRun() on a fully-complete run produces zero new invocations.
 *   - SQLite unique constraint on (run_id, role) WHERE status='completed' prevents duplicate rows.
 *
 * Activating when Runtime ships:
 *   1. Uncomment the resumeRun import (replaces Ch.1 skeleton import path if needed).
 *   2. Uncomment the buildLensContextBundleSchema import for isolation check.
 *   3. Remove placeholder `expect(true).toBe(true)` from each RED test body.
 *   4. Verify resumeRun dispatches via dispatchLens() (which enforces isolation per ADR §4.3).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { resumeRun, loadCompletedInvocations } from '../../apps/utility/src/orchestrator/index.js';
import { buildLensContextBundleSchema } from '../../packages/shared-types/src/lens-context-bundle.js';
import { seedFromMigrations } from '../helpers/seedFromMigrations.js';

// ── Test DB: seeded from the REAL production migrations (db/migrations/001..007) ──
// Replaces the former hand-rolled CREATE TABLE block, which had drifted from prod:
//   - agent_invocations used `id INTEGER AUTOINCREMENT` + `role` + `output_json`,
//     but migration 001 uses `invocation_id TEXT PRIMARY KEY` + `agent_role` +
//     `structured_output_json` (db/migrations/001_initial.sql:31-43).
//   - the idempotency unique index was on (run_id, role); prod (migration 003) is
//     on (run_id, agent_role) (db/migrations/003_state_transitions.sql:21-23).
// seedFromMigrations() applies the production migration runner, so the schema this
// test exercises is exactly what ships.

function createTestDb(): Database.Database {
  return seedFromMigrations();
}

// ── Seed helpers ──────────────────────────────────────────────────────────────

const ALL_6_LENSES = ['CEO', 'CFO', 'CRO', 'CMO', 'CPO', 'COS'] as const;

function seedRunInFanOut(db: Database.Database, runId: string, completedLenses: readonly string[]): void {
  const fanOutState = JSON.stringify({
    kind: 'fan-out',
    runId,
    lensesInFlight: ALL_6_LENSES.filter(r => !completedLenses.includes(r)),
    lensesComplete: completedLenses,
  });

  db.prepare(`
    INSERT INTO runs (run_id, playbook, question, started_at, current_state, status)
    VALUES (?, 'quick_read', 'Q3 expansion decision', ?, ?, 'in_progress')
  `).run(runId, Date.now(), fanOutState);

  for (const role of completedLenses) {
    db.prepare(`
      INSERT INTO agent_invocations (invocation_id, run_id, agent_role, started_at, completed_at, structured_output_json, status)
      VALUES (?, ?, ?, ?, ?, ?, 'completed')
    `).run(
      `${runId}-${role}`, runId, role, Date.now() - 5000, Date.now() - 1000,
      JSON.stringify({ role, runId, summary: `${role} analysis`, positions: [], citations: [], confidence: 0.8 }),
    );
  }
}

// ── AC-4 Tests: mid-fan-out resume ────────────────────────────────────────────

describe('AC-4: resumeRun re-dispatches only incomplete lenses (ADR-0004 §7)', () => {
  const COMPLETED_3 = ['CEO', 'CFO', 'CRO'] as const;
  const INCOMPLETE_3 = ['CMO', 'CPO', 'COS'] as const;

  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it('resumeRun and loadCompletedInvocations are exported from orchestrator/index', () => {
    expect(typeof resumeRun).toBe('function');
    expect(typeof loadCompletedInvocations).toBe('function');
    // Also confirm buildLensContextBundleSchema is importable (used during resume isolation check)
    expect(typeof buildLensContextBundleSchema).toBe('function');
  });

  it.todo('re-dispatches exactly the 3 incomplete lenses after mid-run crash — blocked: resumeRun dispatch not yet implemented (Ch.3 Runtime)');

  it.todo('completed lens output_json is preserved unchanged after resume — blocked: resumeRun dispatch not yet implemented (Ch.3 Runtime)');

  it.todo('re-dispatched lenses receive isolated context bundles (no peer outputs) — blocked: resumeRun + dispatchLens spy wiring not yet implemented (Ch.3 Runtime)');

  it.todo('fully-complete fan-out: resume skips fan-out and transitions to red-team-steelman — blocked: resumeRun state-machine advance not yet implemented (Ch.3 Runtime)');
});

// ── AC-9 Tests: idempotency guard ─────────────────────────────────────────────

describe('AC-9: Idempotency guard — completed lens never re-dispatched (ADR-0004 §7.4)', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it.todo('calling resumeRun on a fully-complete run creates zero new agent_invocations — blocked: resumeRun dispatch not yet implemented (Ch.3 Runtime)');

  it('SQLite unique index on (run_id, agent_role) WHERE completed rejects duplicate completed rows', () => {
    // This test exercises the idempotency constraint at the DB level — no Runtime needed.
    // Real schema (migration 003): unique index is on (run_id, agent_role) WHERE status='completed'.
    // Distinct invocation_id values on both rows ensure the rejection comes from the unique
    // index (not the invocation_id primary key).
    const runId = 'cr-test-unique-idx';
    db.prepare(`INSERT INTO runs (run_id, playbook, question, started_at, current_state) VALUES (?, 'quick_read', 'Q', ?, 'fan-out')`).run(runId, Date.now());

    db.prepare(`
      INSERT INTO agent_invocations (invocation_id, run_id, agent_role, started_at, completed_at, structured_output_json, status)
      VALUES (?, ?, 'CEO', ?, ?, ?, 'completed')
    `).run(`${runId}-CEO-1`, runId, Date.now() - 3000, Date.now() - 1000, JSON.stringify({ role: 'CEO' }));

    // Second insert with same (run_id, agent_role, status='completed') must fail.
    expect(() => {
      db.prepare(`
        INSERT INTO agent_invocations (invocation_id, run_id, agent_role, started_at, completed_at, structured_output_json, status)
        VALUES (?, ?, 'CEO', ?, ?, ?, 'completed')
      `).run(`${runId}-CEO-2`, runId, Date.now() - 2000, Date.now() - 500, JSON.stringify({ role: 'CEO', duplicate: true }));
    }).toThrow();
  });

  it.todo('calling resumeRun twice on same run is safe — second call is a no-op — blocked: resumeRun dispatch not yet implemented (Ch.3 Runtime)');
});
