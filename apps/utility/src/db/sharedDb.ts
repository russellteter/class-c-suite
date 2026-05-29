// apps/utility/src/db/sharedDb.ts
// B47 keystone: shared runtime.db connection for the utility process.
//
// Main sets C_SUITE_DB_PATH in the fork env (supervisor.ts forkUtility).
// The utility opens ONE connection to that file, reuses it across all runs.
// Main already ran migrations before forking — do NOT re-run them here.
//
// WAL mode + busy_timeout let main and utility share the file without
// writer conflicts. Only one process writes at a time; main wins if both
// attempt a write simultaneously because of busy_timeout=5000.

import Database from 'better-sqlite3';

let sharedDb: Database.Database | null = null;

/**
 * Open the shared runtime.db connection from C_SUITE_DB_PATH env var.
 * Call once after __port_init; throws if the env var is absent.
 *
 * @param dbPath Optional override — used in unit tests to pass a tmp file path.
 */
export function initSharedDb(dbPath?: string): void {
  const resolvedPath = dbPath ?? process.env.C_SUITE_DB_PATH;
  if (!resolvedPath) {
    throw new Error(
      'initSharedDb: C_SUITE_DB_PATH is not set. ' +
        'Ensure supervisor.ts forkUtility() passes the env var.',
    );
  }

  const db = new Database(resolvedPath);
  db.pragma('journal_mode = WAL');   // matches main — WAL enables concurrent reads
  db.pragma('foreign_keys = ON');    // referential integrity
  db.pragma('busy_timeout = 5000'); // retry up to 5s if main holds the write lock

  sharedDb = db;
}

/**
 * Return the shared Database handle. Throws if initSharedDb has not been called.
 */
export function getSharedDb(): Database.Database {
  if (!sharedDb) {
    throw new Error(
      'getSharedDb: shared DB not initialized. Call initSharedDb() first.',
    );
  }
  return sharedDb;
}

/**
 * Close the shared DB handle. Called on graceful shutdown only — not after runs.
 * Closing after a run would kill every subsequent run in the same process.
 */
export function closeSharedDb(): void {
  sharedDb?.close();
  sharedDb = null;
}
