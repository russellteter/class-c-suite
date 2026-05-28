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
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Resolve the migrations dir robustly (do NOT rely on process.cwd() — the utility
 * inherits main's cwd, which is apps/main in the dev app, not the repo root).
 * Mirrors apps/main/src/db/migrate.ts: module-relative in dev, resourcesPath when packaged.
 */
function migrationsDir(): string {
  // Module-relative: dist/orchestrator/inMemoryDb.js → ../../../../db/migrations = repo/db/migrations.
  const moduleDir = path.join(__dirname, '..', '..', '..', '..', 'db', 'migrations');
  if (fs.existsSync(moduleDir)) return moduleDir;
  // Packaged app: db/migrations ships under resourcesPath (electron-builder extraResources).
  const resBase = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;
  if (resBase) {
    const packaged = path.join(resBase, 'db', 'migrations');
    if (fs.existsSync(packaged)) return packaged;
  }
  // Last resort: cwd-relative (covers the headless spine-proof run from repo root).
  const cwdDir = path.join(process.cwd(), 'db', 'migrations');
  if (fs.existsSync(cwdDir)) return cwdDir;
  return moduleDir; // surface the module path in the error if nothing resolved
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
