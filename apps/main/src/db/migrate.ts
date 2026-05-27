// apps/main/src/db/migrate.ts
// Source: docs/decisions/0002-ch1-process-architecture.md §4.3
// Migration runner: reads NNN_*.sql files lexicographically, applies in single
// transactions, tracks via schema_version table. Idempotent: safe to run twice.

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const _require = createRequire(import.meta.url);

// Resolve migrations dir for both dev (tsc output) and packaged (electron-builder).
// In dev: __dirname = apps/main/dist/db → ../../../../db/migrations = db/migrations
// In packaged app: resourcesPath/db/migrations
function getMigrationsDir(): string {
  // Avoid direct electron import at module level in tests (electron mock scope).
  let isPackaged = false;
  try {
    const { app } = _require('electron') as typeof import('electron');
    isPackaged = app.isPackaged;
  } catch {
    // Not in Electron context (unit tests) — use dev path.
  }

  if (isPackaged) {
    return path.join(process.resourcesPath, 'db', 'migrations');
  }
  // __dirname is apps/main/dist/db at runtime (compiled), or apps/main/src/db in ts-node.
  // Walk up 4 levels to reach repo root, then into db/migrations.
  return path.join(__dirname, '..', '..', '..', '..', 'db', 'migrations');
}

const MIGRATIONS_DIR = getMigrationsDir();

// Module-level logger — plain console in migration context to avoid circular deps.
const log = {
  info: (obj: Record<string, unknown>) =>
    process.stdout.write(JSON.stringify({ ...obj, level: 'info', ts: new Date().toISOString() }) + '\n'),
  error: (obj: Record<string, unknown>) =>
    process.stderr.write(JSON.stringify({ ...obj, level: 'error', ts: new Date().toISOString() }) + '\n'),
};

/**
 * Apply all pending migrations in lexicographic order (NNN_<name>.sql).
 * Each migration is applied in a single transaction; the schema_version row
 * is inserted as the LAST statement of the transaction to serve as a
 * commit marker.
 *
 * Idempotency: every migration uses CREATE TABLE IF NOT EXISTS,
 * CREATE INDEX IF NOT EXISTS, INSERT OR IGNORE — safe to run twice.
 * The runner skips migration N if schema_version already contains version N.
 */
export function runMigrations(db: Database.Database): void {
  // Ensure schema_version table exists before querying it.
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version     INTEGER NOT NULL,
      applied_at  INTEGER NOT NULL
    )
  `);

  // Read current applied version (0 if schema_version is empty).
  const versionRow = db.prepare(
    'SELECT MAX(version) AS v FROM schema_version'
  ).get() as { v: number | null };
  const current = versionRow?.v ?? 0;

  // Collect + sort migration files.
  let files: string[] = [];
  try {
    files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(f => /^\d{3}_.*\.sql$/.test(f))
      .sort();
  } catch (err) {
    log.error({ process: 'main', message: 'failed to read migrations dir', dir: MIGRATIONS_DIR, err: String(err) });
    throw err;
  }

  for (const file of files) {
    const versionStr = file.split('_')[0];
    const version = parseInt(versionStr, 10);
    if (version <= current) continue;    // already applied

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

    db.transaction(() => {
      db.exec(sql);
      db.prepare(
        'INSERT OR IGNORE INTO schema_version (version, applied_at) VALUES (?, ?)'
      ).run(version, Date.now());
    })();

    log.info({ process: 'main', message: `migration ${version} applied`, file });
  }
}
