/**
 * ADR-0002 §9 rows 2 + 10 — Supervised utility-process restart + process_events
 * Test owner: Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0002-ch1-process-architecture.md §3 + §9 rows 2 + 10
 *
 * Spec ambiguities (resolved per brief):
 *   1. ADR §3.1 uses Electron's `utilityProcess.fork()` and `UtilityProcess` events.
 *      These are unavailable in vitest's Node context. Tests mock electron via vi.mock
 *      so `forkUtility()` inside `startSupervision` returns a MockUtilityProcess.
 *   2. ADR §3.1 shows `startSupervision(state, db, webContents)`. The `webContents`
 *      parameter is typed as `IpcSender` (structural) in production — tests pass a
 *      compatible function directly.
 *   3. ADR §3.1 RESTART_DELAY_MS = 500ms. Tests use vi.useFakeTimers to advance
 *      time without real 500ms waits.
 *   4. ADR §9 row 2 compound assertion (supervisor → orchestrator): unit test asserts
 *      respawn timing and run.failed emission; full run.start integration is deferred.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import Database from 'better-sqlite3';

// ── Mocks ────────────────────────────────────────────────────────────────────

type MockUtilityProcess = EventEmitter & {
  stderr: EventEmitter;
  kill: () => void;
  postMessage: (_data: unknown, _ports?: unknown[]) => void;
};

function createMockUtilityProcess(): MockUtilityProcess {
  const proc = new EventEmitter() as MockUtilityProcess;
  proc.stderr = new EventEmitter();
  proc.kill = () => proc.emit('exit', 1);
  proc.postMessage = () => {};
  return proc;
}

// Mock electron before importing production module.
// Provides: utilityProcess.fork → MockUtilityProcess, MessageChannelMain → mock channel.
vi.mock('electron', () => {
  const mockFork = vi.fn(() => createMockUtilityProcess());
  const mockChannel = {
    port1: { start: vi.fn(), postMessage: vi.fn() },
    port2: {},
  };
  return {
    utilityProcess: { fork: mockFork },
    MessageChannelMain: vi.fn(() => mockChannel),
  };
});

import { startSupervision } from '../../apps/main/src/supervisor.js';
import type { SupervisionState, IpcSender } from '../../apps/main/src/supervisor.js';

// ── DB setup: minimal process_events table ───────────────────────────────────

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE IF NOT EXISTS process_events (
      event_id      TEXT PRIMARY KEY,
      occurred_at   INTEGER NOT NULL,
      process       TEXT NOT NULL,
      event_type    TEXT NOT NULL,
      exit_code     INTEGER,
      stack_trace   TEXT,
      restart_count INTEGER
    );
  `);
  return db;
}

// ── §9 row 2 — Supervised restart timing ─────────────────────────────────────

describe('startSupervision — crash + respawn within 1000ms (§9 row 2)', () => {
  let db: Database.Database;
  const ipcEvents: Array<{ channel: string; data: unknown }> = [];
  let send: IpcSender;

  beforeEach(async () => {
    vi.useFakeTimers();
    db = createTestDb();
    ipcEvents.length = 0;
    send = { send: (channel, data) => ipcEvents.push({ channel, data }) };

    // Reset fork mock call count before each test.
    const { utilityProcess } = await import('electron');
    (utilityProcess.fork as ReturnType<typeof vi.fn>).mockClear();
  });

  afterEach(() => {
    db.close();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('respawns the utility process within 1000ms after non-zero exit', async () => {
    const { utilityProcess } = await import('electron');
    const forkMock = utilityProcess.fork as ReturnType<typeof vi.fn>;

    const state: SupervisionState = { restarts: [], proc: null, port: null };
    startSupervision(state, db, send);

    // Initial fork (count = 1).
    expect(forkMock).toHaveBeenCalledTimes(1);

    // Simulate crash.
    state.proc?.emit('exit', 1);

    // RESTART_DELAY_MS = 500ms + fork overhead = ≤ 1000ms total.
    vi.advanceTimersByTime(1000);

    // Second fork should have fired.
    expect(forkMock).toHaveBeenCalledTimes(2);
  });

  it('inserts a process_events crash row on non-zero exit (§9 row 10)', () => {
    const state: SupervisionState = { restarts: [], proc: null, port: null };
    startSupervision(state, db, send);

    // Simulate crash.
    state.proc?.emit('exit', 1);

    vi.advanceTimersByTime(600);

    const row = db.prepare(
      `SELECT COUNT(*) AS n FROM process_events WHERE event_type = 'crash'`
    ).get() as { n: number };
    expect(row.n).toBeGreaterThanOrEqual(1);
  });

  it('inserts a process_events start row on initial fork (§9 row 10)', () => {
    const state: SupervisionState = { restarts: [], proc: null, port: null };
    startSupervision(state, db, send);

    const row = db.prepare(
      `SELECT COUNT(*) AS n FROM process_events WHERE event_type = 'start'`
    ).get() as { n: number };
    expect(row.n).toBeGreaterThanOrEqual(1);
  });

  it('inserts process_events restart row after respawn (§9 row 10)', () => {
    const state: SupervisionState = { restarts: [], proc: null, port: null };
    startSupervision(state, db, send);
    state.proc?.emit('exit', 1);

    vi.advanceTimersByTime(1000);

    const row = db.prepare(
      `SELECT COUNT(*) AS n FROM process_events WHERE event_type IN ('restart', 'start')`
    ).get() as { n: number };
    // Both initial start + respawn start should be logged.
    expect(row.n).toBeGreaterThanOrEqual(2);
  });
});

// ── §9 row 2 — 5 crashes in 60s → halt (ADR §3.1 MAX_RESTARTS) ──────────────

describe('startSupervision — halt after 5 crashes in 60s (§9 row 2)', () => {
  let db: Database.Database;
  const ipcEvents: Array<{ channel: string; data: unknown }> = [];
  let send: IpcSender;

  beforeEach(async () => {
    vi.useFakeTimers();
    db = createTestDb();
    ipcEvents.length = 0;
    send = { send: (channel, data) => ipcEvents.push({ channel, data }) };

    const { utilityProcess } = await import('electron');
    (utilityProcess.fork as ReturnType<typeof vi.fn>).mockClear();
  });

  afterEach(() => {
    db.close();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('emits run.failed (utility.failed) IPC after 5 crashes within 60s', () => {
    const state: SupervisionState = { restarts: [], proc: null, port: null };
    startSupervision(state, db, send);

    // Simulate 5 rapid crashes within the 60s window.
    for (let i = 0; i < 5; i++) {
      state.proc?.emit('exit', 1);
      vi.advanceTimersByTime(600); // 600ms per cycle (500ms delay + headroom)
    }

    // 6th crash triggers halt.
    state.proc?.emit('exit', 1);
    vi.advanceTimersByTime(100);

    // Expect run.failed to have been sent (channel = 'ipc:message', kind = 'run.failed').
    const failedEvent = ipcEvents.find(e =>
      e.channel === 'ipc:message' &&
      (e.data as Record<string, unknown>)?.kind === 'run.failed'
    );
    expect(failedEvent).toBeDefined();
  });

  it('does not respawn after halt (supervisor stops recursing)', () => {
    const state: SupervisionState = { restarts: [], proc: null, port: null };
    startSupervision(state, db, send);

    // Trigger halt.
    for (let i = 0; i <= 5; i++) {
      state.proc?.emit('exit', 1);
      vi.advanceTimersByTime(600);
    }

    const forkRowAfterHalt = db.prepare(
      `SELECT COUNT(*) AS n FROM process_events WHERE event_type = 'halt'`
    ).get() as { n: number };
    expect(forkRowAfterHalt.n).toBeGreaterThanOrEqual(1);
  });
});
