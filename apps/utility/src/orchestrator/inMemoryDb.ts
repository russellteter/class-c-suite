// apps/utility/src/orchestrator/inMemoryDb.ts
// Staged run-path slice (2026-05-28): the orchestrator (startRun) needs a SYNCHRONOUS
// better-sqlite3 handle, but the utility only has the async SQL proxy to main's single
// handle. Rather than refactor the whole state machine to the async proxy (deferred —
// see build-log 2026-05-28), each run opens its own in-memory DB seeded from the same
// migrations main applies. Run state lives only for the run's duration.
//
// DEFERRED by this approach (logged, not silent): crash-resume across restarts and the
// run appearing in main's persistent runs-list. Both require the shared DB (a later
// async-proxy or second-connection decision).

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Resolve the migrations dir. Mirrors dispatch.ts's cwd-relative fixture resolution
 * (utility runs with cwd = repo root in dev/headless). Falls back to the packaged
 * resources path when running inside a packaged app.
 */
function migrationsDir(): string {
  const cwdDir = path.join(process.cwd(), 'db', 'migrations');
  if (fs.existsSync(cwdDir)) return cwdDir;
  // Packaged app: db/migrations ships under resourcesPath (see electron-builder config).
  const resBase = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;
  if (resBase) {
    const packaged = path.join(resBase, 'db', 'migrations');
    if (fs.existsSync(packaged)) return packaged;
  }
  return cwdDir; // surface the dev path in the error if it doesn't exist
}

/**
 * Open a fresh in-memory SQLite DB and apply every NNN_*.sql migration in order.
 * Returns a sync handle the orchestrator can drive. Caller must close() it.
 */
export function openRunScopedDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const dir = migrationsDir();
  const files = fs
    .readdirSync(dir)
    .filter((f) => /^\d{3}_.*\.sql$/.test(f))
    .sort();

  if (files.length === 0) {
    throw new Error(`openRunScopedDb: no migrations found in ${dir}`);
  }

  for (const file of files) {
    db.exec(fs.readFileSync(path.join(dir, file), 'utf8'));
  }

  return db;
}
