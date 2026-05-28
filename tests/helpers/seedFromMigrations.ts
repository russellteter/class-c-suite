// tests/helpers/seedFromMigrations.ts
//
// Single source of truth for test schema. Opens an in-memory SQLite database,
// sets the same pragmas openDatabase() uses, and applies EVERY db/migrations/NNN_*.sql
// in lexicographic order by delegating to the production migration runner.
//
// Why delegate to runMigrations instead of re-implementing file iteration:
//   - runMigrations() already applies each migration via db.exec(sql) (apps/main/src/db/migrate.ts:92),
//     so the brief's "apply via db.exec()" mechanism is honored.
//   - It is the REAL production schema path. A second hand-rolled applier in the test
//     harness could drift from production — the exact anti-pattern this helper exists to kill.
//   - It correctly handles 007_scheduled_jobs.sql's `UPDATE schema_version SET version = 7
//     WHERE version = 6`, because the runner inserts the version markers the UPDATE targets.
//   - migrate.spec.ts already imports runMigrations from this path and runs it under vitest,
//     so MIGRATIONS_DIR resolution + the electron try/catch fallback are verified in tests.
//     MIGRATIONS_DIR resolves relative to migrate.ts's own __dirname, not the caller's, so
//     calling from tests/helpers/ resolves to db/migrations identically.
//
// No test should hand-roll CREATE TABLE for app tables again. Use this helper.

import Database from 'better-sqlite3';
import { runMigrations } from '../../apps/main/src/db/migrate.js';

/**
 * Open an in-memory database (or reuse an existing one), set pragmas, and apply
 * all migrations via the production runner.
 *
 * @param db Optional existing Database handle. When omitted, a fresh
 *           `:memory:` database is created. Pass an existing handle to seed a
 *           file-backed or already-open database (e.g. a tmpdir runtime.db).
 * @returns The seeded Database handle (the same instance passed in, if any).
 */
export function seedFromMigrations(
  db: Database.Database = new Database(':memory:'),
): Database.Database {
  db.pragma('journal_mode = WAL'); // matches openDatabase(); no-op on :memory: but harmless
  db.pragma('foreign_keys = ON'); // referential integrity, as production
  runMigrations(db);
  return db;
}
