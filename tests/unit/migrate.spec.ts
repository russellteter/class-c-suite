/**
 * ADR-0002 §9 row 4 — Migration idempotency
 * Test owner: Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0002-ch1-process-architecture.md §4 + §9 row 4
 *
 * Spec ambiguities:
 *   1. ADR §4.3 names the function `runMigrations(db)`. The brief §"migrate.spec.ts"
 *      calls it `migrate()`. ADR is authoritative per brief line 13 — using `runMigrations`.
 *   2. db/migrations/001_initial.sql is the Ch.0 placeholder (only schema_version +
 *      one INSERT). It does NOT yet contain the Ch.1 tables (runs, agent_invocations,
 *      tool_calls, process_events, cost_ledger) defined in ADR §4.2. Tests asserting
 *      those tables exist are RED until Runtime ships the full 001_initial.sql.
 *   3. ADR §4.3 shows `MIGRATIONS_DIR` relative to `__dirname` of the compiled output.
 *      In tests we import the TS source directly; Runtime must export `runMigrations`
 *      from `apps/main/src/db/migrate.ts`.
 *   4. The `log` reference in ADR §4.3 is an implicit module-level logger.
 *      Runtime must wire it; tests mock it if needed. For now, tests don't inspect logs.
 *
 * Tests fail until Runtime ships apps/main/src/db/migrate.ts with the Ch.1 schema.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import Database from 'better-sqlite3';

import { runMigrations } from '../../apps/main/src/db/migrate.js';

// ── §9 row 4 — Migration idempotency ────────────────────────────────────────

describe('runMigrations — idempotency + schema correctness (§9 row 4)', () => {
  let tmpDir: string;
  let db: Database.Database;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'c-suite-migrate-'));
    db = new Database(join(tmpDir, 'runtime.db'));
  });

  afterEach(() => {
    db.close();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates schema_version row on first run', () => {
    runMigrations(db);
    const row = db.prepare('SELECT COUNT(*) AS n FROM schema_version').get() as { n: number };
    // 001_initial + 002_conflicts + 003_state_transitions + 004_vault_commit_failures
    // + 005_writebacks + 006_credentials + 007_scheduled_jobs = 7 migrations.
    expect(row.n).toBe(7);
  });

  it('is idempotent — second run produces no duplicate schema_version rows', () => {
    runMigrations(db);
    runMigrations(db);
    const row = db.prepare('SELECT COUNT(*) AS n FROM schema_version').get() as { n: number };
    // 001_initial + 002_conflicts + 003_state_transitions + 004_vault_commit_failures
    // + 005_writebacks + 006_credentials + 007_scheduled_jobs = 7 migrations.
    expect(row.n).toBe(7);
  });

  it('second run produces no SQL errors', () => {
    runMigrations(db);
    expect(() => runMigrations(db)).not.toThrow();
  });

  // Ch.1 full schema tables + Ch.2 conflicts + Ch.3 state_transitions.
  const EXPECTED_TABLES = [
    'runs',
    'agent_invocations',
    'tool_calls',
    'process_events',
    'cost_ledger',
    'schema_version',
    'conflicts',          // Ch.2 G-2
    'state_transitions',  // Ch.3 ADR-0004 §1.5
    'vault_commit_failures', // B39 polish — migration 004
  ];

  it.each(EXPECTED_TABLES)('table %s exists after migration', (tableName) => {
    runMigrations(db);
    const row = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
    ).get(tableName) as { name: string } | undefined;
    expect(row?.name).toBe(tableName);
  });

  it('schema_version.version = 1 after initial migration', () => {
    runMigrations(db);
    const row = db.prepare('SELECT version FROM schema_version').get() as { version: number } | undefined;
    expect(row?.version).toBe(1);
  });

  it('PRAGMA journal_mode returns WAL (set before runMigrations in openDatabase)', () => {
    // Tests must set WAL explicitly here since openDatabase() is not called.
    // Runtime's openDatabase() sets this before running migrations.
    db.pragma('journal_mode = WAL');
    runMigrations(db);
    const result = db.pragma('journal_mode', { simple: true }) as string;
    expect(result).toBe('wal');
  });
});
