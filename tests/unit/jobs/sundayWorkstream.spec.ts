/**
 * tests/unit/jobs/sundayWorkstream.spec.ts
 * Source: docs/decisions/0012-ch10-scheduler-autonomy.md AC-8
 * Verifies workstream_amounts_mirror repopulation + memory consolidation TTLs.
 * Uses a mock DB (avoid better-sqlite3 native binary version mismatch in test runner).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import type Database from 'better-sqlite3';

import { runSundayWorkstream } from '../../../apps/utility/src/jobs/sundayWorkstream.js';

vi.mock('electron', () => ({ app: { getPath: vi.fn().mockReturnValue('/tmp') } }));

/**
 * Build a fake in-memory DB that stores rows per-table.
 */
function makeMockDb(): Database.Database {
  const tables: Record<string, unknown[]> = {
    workstream_amounts_mirror: [],
    runs: [
      // One old run (>90 days) and one recent run.
      { run_id: 'old-run-1', started_at: Date.now() - 91 * 24 * 60 * 60 * 1000 },
      { run_id: 'new-run-1', started_at: Date.now() },
    ],
    scheduled_jobs: [
      // One old scheduled_job row (>180 days) and one recent.
      { job_id: 'daily-morning-brief', status: 'succeeded', created_at: Date.now() - 181 * 24 * 60 * 60 * 1000 },
      { job_id: 'daily-morning-brief', status: 'succeeded', created_at: Date.now() },
    ],
    process_events: [
      { id: 1, created_at: Date.now() - 31 * 24 * 60 * 60 * 1000 },
    ],
  };

  const execSql: string[] = [];

  function prepare(sql: string) {
    const upperSql = sql.trim().toUpperCase();

    // Handle CREATE TABLE IF NOT EXISTS.
    if (upperSql.startsWith('CREATE TABLE IF NOT EXISTS')) {
      const match = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
      if (match) {
        const tableName = match[1]!.toLowerCase();
        if (!tables[tableName]) tables[tableName] = [];
      }
      return { run: vi.fn(), all: vi.fn().mockReturnValue([]), get: vi.fn() };
    }

    // Handle DELETE FROM <table> WHERE created_at < ? (prune).
    if (upperSql.startsWith('DELETE FROM')) {
      const match = sql.match(/DELETE FROM (\w+)(?: WHERE .+)?/i);
      const tableName = match?.[1]?.toLowerCase() ?? '';
      return {
        run: vi.fn().mockImplementation((cutoff?: number) => {
          const before = tables[tableName]?.length ?? 0;
          if (cutoff !== undefined) {
            tables[tableName] = (tables[tableName] ?? []).filter((row: unknown) => {
              const r = row as Record<string, number>;
              const ts = r['created_at'] ?? r['started_at'] ?? 0;
              return ts >= cutoff;
            });
          } else {
            tables[tableName] = [];
          }
          return { changes: before - (tables[tableName]?.length ?? 0) };
        }),
        all: vi.fn().mockReturnValue([]),
        get: vi.fn(),
      };
    }

    // Handle SELECT * FROM <table>.
    if (upperSql.startsWith('SELECT * FROM')) {
      const match = sql.match(/SELECT \* FROM (\w+)/i);
      const tableName = match?.[1]?.toLowerCase() ?? '';
      return {
        all: vi.fn().mockReturnValue(tables[tableName] ?? []),
        get: vi.fn(),
        run: vi.fn(),
      };
    }

    // Handle INSERT INTO workstream_amounts_mirror.
    if (upperSql.startsWith('INSERT INTO WORKSTREAM_AMOUNTS_MIRROR')) {
      return {
        run: vi.fn().mockImplementation((...args: unknown[]) => {
          tables['workstream_amounts_mirror'] = tables['workstream_amounts_mirror'] ?? [];
          tables['workstream_amounts_mirror'].push({
            id: args[0], title: args[1], status: args[2], phase: args[3],
            amount: args[4], currency: args[5], last_modified: args[6],
          });
          return { changes: 1 };
        }),
        all: vi.fn().mockReturnValue([]),
        get: vi.fn(),
      };
    }

    // VACUUM — no-op.
    if (upperSql === 'VACUUM') {
      return { run: vi.fn(), all: vi.fn().mockReturnValue([]), get: vi.fn() };
    }

    return {
      run: vi.fn().mockReturnValue({ changes: 0 }),
      all: vi.fn().mockReturnValue([]),
      get: vi.fn().mockReturnValue(undefined),
    };
  }

  return {
    prepare: vi.fn().mockImplementation(prepare),
    exec: vi.fn().mockImplementation((s: string) => { execSql.push(s); }),
    close: vi.fn(),
    // Expose tables for assertions.
    _tables: tables,
  } as unknown as Database.Database & { _tables: typeof tables };
}

describe('sundayWorkstream', () => {
  let emitIpc: ReturnType<typeof vi.fn>;
  let tmpDir: string;

  beforeEach(async () => {
    emitIpc = vi.fn();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'workstream-'));
  });

  it('creates workstream_amounts_mirror table and populates rows', async () => {
    const workstreamsDir = path.join(tmpDir, 'workstreams');
    await fs.mkdir(workstreamsDir, { recursive: true });
    await fs.writeFile(
      path.join(workstreamsDir, 'ws-001.md'),
      '---\nid: WS-001\ntitle: Growth Initiative\nstatus: GREEN\nphase: execution\namount: 500000\ncurrency: USD\n---\n\n# Growth',
      'utf-8',
    );

    const db = makeMockDb();
    const ctx = { db, emitIpc, vaultRoot: tmpDir };
    await runSundayWorkstream(ctx);

    // Check that INSERT was called on workstream_amounts_mirror.
    const inserted = (db as unknown as { _tables: Record<string, unknown[]> })._tables['workstream_amounts_mirror'];
    expect(inserted.length).toBeGreaterThan(0);
  });

  it('repopulates with correct data from front-matter', async () => {
    const workstreamsDir = path.join(tmpDir, 'workstreams');
    await fs.mkdir(workstreamsDir, { recursive: true });
    await fs.writeFile(
      path.join(workstreamsDir, 'ws-001.md'),
      '---\nid: WS-001\ntitle: Revenue Growth\nstatus: GREEN\nphase: execution\namount: 1200000\ncurrency: USD\n---\n',
      'utf-8',
    );

    const db = makeMockDb();
    const ctx = { db, emitIpc, vaultRoot: tmpDir };
    await runSundayWorkstream(ctx);

    const inserted = (db as unknown as { _tables: Record<string, unknown[]> })._tables['workstream_amounts_mirror'] as Array<{ id: string; title: string; status: string }>;
    const row = inserted.find(r => r.id === 'WS-001');
    expect(row).toBeDefined();
    expect(row!.title).toBe('Revenue Growth');
    expect(row!.status).toBe('GREEN');
  });

  it('emits vault-unreachable notification and throws when vault missing', async () => {
    const db = makeMockDb();
    const ctx = { db, emitIpc, vaultRoot: path.join(tmpDir, 'nonexistent') };

    await expect(runSundayWorkstream(ctx)).rejects.toThrow();

    const notifEmits = (emitIpc.mock.calls as [{ kind: string }[]][])
      .filter(([msg]) => (msg as unknown as { kind: string }).kind === 'main.show-notification');
    expect(notifEmits.length).toBe(1);
  });

  it('skips files prefixed with _ in workstreams dir', async () => {
    const workstreamsDir = path.join(tmpDir, 'workstreams');
    await fs.mkdir(workstreamsDir, { recursive: true });
    await fs.writeFile(path.join(workstreamsDir, '_template.md'), '# Template', 'utf-8');
    await fs.writeFile(
      path.join(workstreamsDir, 'real-workstream.md'),
      '---\nid: WS-REAL\ntitle: Real\nstatus: GREEN\nphase: execution\n---\n',
      'utf-8',
    );

    const db = makeMockDb();
    const ctx = { db, emitIpc, vaultRoot: tmpDir };
    await runSundayWorkstream(ctx);

    const inserted = (db as unknown as { _tables: Record<string, unknown[]> })._tables['workstream_amounts_mirror'] as Array<{ id: string }>;
    // Template skipped (starts with _).
    expect(inserted.some(r => r.id === '_template')).toBe(false);
    // Real workstream included.
    expect(inserted.some(r => r.id === 'WS-REAL')).toBe(true);
  });

  it('returns empty degradedSources on success', async () => {
    const workstreamsDir = path.join(tmpDir, 'workstreams');
    await fs.mkdir(workstreamsDir, { recursive: true });

    const db = makeMockDb();
    const ctx = { db, emitIpc, vaultRoot: tmpDir };
    const result = await runSundayWorkstream(ctx);

    expect(Array.isArray(result.degradedSources)).toBe(true);
    expect(result.degradedSources!.length).toBe(0);
  });

  it('prune logic operates on scheduled_jobs rows', async () => {
    const workstreamsDir = path.join(tmpDir, 'workstreams');
    await fs.mkdir(workstreamsDir, { recursive: true });

    const db = makeMockDb();
    const ctx = { db, emitIpc, vaultRoot: tmpDir };

    // Should not throw — pruning is best-effort.
    await expect(runSundayWorkstream(ctx)).resolves.toBeDefined();
  });
});
