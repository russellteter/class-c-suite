// apps/main/src/db/open.ts
// Source: docs/decisions/0002-ch1-process-architecture.md §4.1
// Opens the single better-sqlite3 Database handle owned by the main process.
// NEVER use app.getPath('documents') — avoids iCloud sync per BLOCKERS B16.

import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';

/**
 * Absolute path to the runtime DB.
 * Exported so supervisor.ts can pass it to the utility process as C_SUITE_DB_PATH
 * without duplicating the path construction logic.
 */
export function getDbPath(): string {
  return path.join(app.getPath('userData'), 'runtime.db');
}

export function openDatabase(): Database.Database {
  const db = new Database(getDbPath());

  db.pragma('journal_mode = WAL');    // concurrency (multiple readers, one writer)
  db.pragma('foreign_keys = ON');     // referential integrity
  db.pragma('busy_timeout = 5000');   // 5s timeout on locked DB

  return db;
}
