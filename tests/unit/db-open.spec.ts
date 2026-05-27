/**
 * ADR-0002 §9 row 8 — SQLite path isolation
 * Test owner: Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0002-ch1-process-architecture.md §4.1 + §9 row 8
 *
 * Spec ambiguities:
 *   1. `app.getPath('userData')` is an Electron API unavailable in Node/vitest.
 *      ADR §4.1 + brief instruct us to mock it. We mock the Electron `app` module
 *      via vi.mock before importing `openDatabase`. Runtime must import `app` from
 *      `electron` as a named import so the mock intercepts it.
 *   2. The production module path is `apps/main/src/db/open.ts` (ADR §4.1 module path).
 *      Import is commented out until Runtime ships.
 *
 * Tests fail until Runtime ships apps/main/src/db/open.ts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import Database from 'better-sqlite3';

// Mock Electron's app module before any production import.
// When Runtime ships, uncomment the production import below.
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(),
  },
}));

import { openDatabase } from '../../apps/main/src/db/open.js';

// ── §9 row 8 — SQLite path + WAL ────────────────────────────────────────────

describe('openDatabase — userData path + WAL mode (§9 row 8)', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'c-suite-db-open-'));
    // Configure mock to return our temp dir as userData path.
    const { app } = await import('electron');
    (app.getPath as ReturnType<typeof vi.fn>).mockReturnValue(tmpDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it('opens runtime.db at app.getPath("userData")/runtime.db', () => {
    const db = openDatabase();
    const expectedPath = join(tmpDir, 'runtime.db');
    expect(existsSync(expectedPath)).toBe(true);
    db.close();
  });

  it('path does NOT include /Documents/ (iCloud-safe per BLOCKERS B16)', () => {
    const db = openDatabase();
    // Verify the database file is NOT in a Documents or iCloud path.
    const dbPath = join(tmpDir, 'runtime.db');
    expect(dbPath).not.toContain('/Documents/');
    expect(dbPath).not.toContain('iCloud');
    db.close();
  });

  it('PRAGMA journal_mode returns WAL', () => {
    const db = openDatabase();
    const mode = db.pragma('journal_mode', { simple: true }) as string;
    expect(mode).toBe('wal');
    db.close();
  });

  it('PRAGMA foreign_keys is ON', () => {
    const db = openDatabase();
    const fk = db.pragma('foreign_keys', { simple: true }) as number;
    expect(fk).toBe(1);
    db.close();
  });

  it('PRAGMA busy_timeout is 5000ms', () => {
    const db = openDatabase();
    const timeout = db.pragma('busy_timeout', { simple: true }) as number;
    expect(timeout).toBe(5000);
    db.close();
  });
});
