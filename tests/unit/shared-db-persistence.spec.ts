/**
 * B47 keystone — shared runtime.db persistence
 *
 * Validates the core property the keystone change delivers:
 *   runs + agent_invocations rows land in a FILE-BACKED DB and survive after
 *   the run completes (i.e., they are NOT discarded when the connection goes away).
 *
 * Proof technique (advisor-specified):
 *   1. Open a tmp-file DB, seed it with migrations (real schema).
 *   2. Drive startRun() against that handle (STUB_MODE=replay — no live Claude calls).
 *   3. CLOSE the handle.
 *   4. Open a FRESH connection to the same file.
 *   5. Assert the runs row + at least one agent_invocations row exist.
 *
 * Step 4 is what distinguishes a real fix from a no-op. A :memory: DB would
 * lose all rows on close; a file-backed DB retains them.
 *
 * A separate describe block tests initSharedDb / getSharedDb directly.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { startRun } from '../../apps/utility/src/orchestrator/run-loop.js';
import { seedFromMigrations } from '../helpers/seedFromMigrations.js';
import { initSharedDb, getSharedDb, closeSharedDb } from '../../apps/utility/src/db/sharedDb.js';

// ── helpers ──────────────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'c-suite-shared-db-'));
});

afterEach(() => {
  // Best-effort: close any lingering shared handle before cleaning the dir.
  try { closeSharedDb(); } catch { /* already closed or never opened */ }
  rmSync(tmpDir, { recursive: true, force: true });
});

// ── initSharedDb / getSharedDb contract ──────────────────────────────────────

describe('initSharedDb / getSharedDb', () => {
  it('opens a file-backed DB with WAL + foreign_keys + busy_timeout', () => {
    const dbPath = join(tmpDir, 'runtime.db');
    initSharedDb(dbPath);
    const db = getSharedDb();

    expect(db.pragma('journal_mode', { simple: true })).toBe('wal');
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
    expect(db.pragma('busy_timeout', { simple: true })).toBe(5000);
  });

  it('getSharedDb returns the same instance on repeated calls', () => {
    const dbPath = join(tmpDir, 'runtime.db');
    initSharedDb(dbPath);
    const a = getSharedDb();
    const b = getSharedDb();
    expect(a).toBe(b);
  });

  it('throws if getSharedDb called before initSharedDb', () => {
    // closeSharedDb() in afterEach guarantees no leftover handle.
    expect(() => getSharedDb()).toThrow(/not initialized/i);
  });

  it('throws if C_SUITE_DB_PATH is absent and no path arg supplied', () => {
    const saved = process.env.C_SUITE_DB_PATH;
    delete process.env.C_SUITE_DB_PATH;
    try {
      expect(() => initSharedDb()).toThrow(/C_SUITE_DB_PATH/);
    } finally {
      if (saved !== undefined) process.env.C_SUITE_DB_PATH = saved;
    }
  });

  it('uses C_SUITE_DB_PATH env var when no path arg supplied', () => {
    const dbPath = join(tmpDir, 'env-path.db');
    process.env.C_SUITE_DB_PATH = dbPath;
    try {
      initSharedDb();
      const db = getSharedDb();
      expect(db.pragma('journal_mode', { simple: true })).toBe('wal');
    } finally {
      delete process.env.C_SUITE_DB_PATH;
    }
  });
});

// ── persistence proof ─────────────────────────────────────────────────────────

describe('startRun rows persist to file-backed DB after close', () => {
  const RUN_ID = 'persist-test-001';
  const PLAYBOOK = 'quick_read';
  const QUESTION = 'Should we expand into Q3?';

  it('runs row survives handle close + reopen (not in-memory-discarded)', async () => {
    const dbPath = join(tmpDir, 'runtime.db');

    // Step 1 — seed migrations into the file DB.
    const handle = seedFromMigrations(new Database(dbPath));

    // Step 2 — drive startRun with STUB_MODE=replay (set in vitest.config.ts).
    // quick_read dispatches lenses through dispatchLens stub path — no live model calls.
    // No safeWrite: we call startRun directly, not the index.ts run.start handler.
    const noopEmit = () => void 0;
    await startRun(RUN_ID, PLAYBOOK, QUESTION, handle, noopEmit);

    // Step 3 — close the handle.
    handle.close();

    // Step 4 — open a FRESH connection to the same file.
    const fresh = new Database(dbPath);
    try {
      // Step 5a — assert runs row persists.
      const runsRow = fresh
        .prepare('SELECT run_id, playbook, question, status FROM runs WHERE run_id = ?')
        .get(RUN_ID) as { run_id: string; playbook: string; question: string; status: string } | undefined;

      expect(runsRow).toBeDefined();
      expect(runsRow!.run_id).toBe(RUN_ID);
      expect(runsRow!.playbook).toBe(PLAYBOOK);
      expect(runsRow!.question).toBe(QUESTION);
      // startRun seeds the row with status='in_progress' (run-loop.ts:94)
      expect(runsRow!.status).toBe('in_progress');
    } finally {
      fresh.close();
    }
  });

  it('agent_invocations rows survive handle close + reopen', async () => {
    const dbPath = join(tmpDir, 'runtime2.db');

    const handle = seedFromMigrations(new Database(dbPath));
    const noopEmit = () => void 0;
    await startRun(RUN_ID, PLAYBOOK, QUESTION, handle, noopEmit);
    handle.close();

    const fresh = new Database(dbPath);
    try {
      // quick_read dispatches 6 lenses; each dispatchLens stub path calls
      // onSubagentStart → INSERT agent_invocations row.
      const rows = fresh
        .prepare(
          'SELECT agent_role FROM agent_invocations WHERE run_id = ? ORDER BY started_at ASC',
        )
        .all(RUN_ID) as Array<{ agent_role: string }>;

      // At least one invocation row must be present (lens dispatch wired).
      expect(rows.length).toBeGreaterThan(0);

      // All six quick_read lenses should have been dispatched.
      const roles = rows.map((r) => r.agent_role);
      for (const role of ['CEO', 'CFO', 'CRO', 'CMO', 'CPO', 'COS']) {
        expect(roles).toContain(role);
      }
    } finally {
      fresh.close();
    }
  });
});
