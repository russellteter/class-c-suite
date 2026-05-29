// apps/utility/src/orchestrator/inMemoryDb.ts
//
// @deprecated B47 keystone (2026-05-28): the run.start handler in index.ts now uses
// the shared runtime.db connection (apps/utility/src/db/sharedDb.ts) instead of a
// per-run in-memory DB. openRunScopedDb() is no longer called in production code.
//
// This file is retained (not deleted) because:
//   1. It may be imported by future tests that need an isolated in-memory schema.
//   2. It serves as the migration-aware DB factory for tests that predate sharedDb.ts.
//
// DO NOT call openRunScopedDb() from index.ts or run-loop.ts — use getSharedDb() instead.

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
