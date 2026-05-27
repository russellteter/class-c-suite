/**
 * ADR-0002 §9 row 5 — Cross-process log correlation via runId
 * Test owner: Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0002-ch1-process-architecture.md §8 + §9 row 5
 *
 * Spec ambiguities:
 *   1. ADR §8.1 defines a LogEntry interface. Runtime chooses pino or winston (§8.2).
 *      Tests don't care which library; they verify that log entries include runId.
 *   2. ADR §8.2: "Runtime dispatch chooses the logger library." Tests import a thin
 *      `createLogger(process)` wrapper from `apps/main/src/log.ts`. Runtime ships it.
 *   3. Brief says "Mock pino to capture log entries." We instead test the Logger
 *      facade directly — it returns captured entries via an injectable sink parameter.
 *      This avoids locking tests to pino specifically (Runtime may choose winston).
 *   4. ADR §8.4: "every log entry for a run-related event MUST include runId."
 *      Tests assert on the captured sink entries; they do NOT inspect the filesystem.
 *   5. Brief row 5 says "Invoke a run that crosses main → utility → main boundaries."
 *      In unit tests, we test the logger facade in isolation (no real process hop).
 *      The cross-process correlation is an integration concern (tests/integration/).
 *      Brief routes this spec to unit/; the unit test verifies Logger + correlation discipline.
 *
 * Tests fail until Runtime ships apps/main/src/log.ts.
 */

import { describe, it, expect, vi } from 'vitest';

import { createLogger } from '../../apps/main/src/log.js';
import type { LogEntry } from '../../apps/main/src/log.js';

// ── §9 row 5 — Log correlation: runId present in all run-related entries ──────

describe('createLogger — runId correlation discipline (§9 row 5 + ADR §8.4)', () => {
  it('every log entry for a run event includes runId', () => {
    const captured: LogEntry[] = [];
    const log = createLogger('main', (entry) => captured.push(entry));

    const RUN_ID = 'run-logging-001';

    log.info({ message: 'run starting', runId: RUN_ID });
    log.info({ message: 'dispatching CFO agent', runId: RUN_ID, agentId: 'agent-cfo' });
    log.info({ message: 'run complete', runId: RUN_ID });

    expect(captured).toHaveLength(3);
    for (const entry of captured) {
      expect(entry.runId).toBe(RUN_ID);
    }
  });

  it('log entry includes process tag matching constructor argument', () => {
    const captured: LogEntry[] = [];
    const mainLog = createLogger('main', (e) => captured.push(e));

    mainLog.info({ message: 'main process event', runId: 'run-001' });

    expect(captured[0].process).toBe('main');
  });

  it('utility-process logger tags entries with process=utility', () => {
    const captured: LogEntry[] = [];
    const utilLog = createLogger('utility', (e) => captured.push(e));

    utilLog.info({ message: 'utility event', runId: 'run-001' });

    expect(captured[0].process).toBe('utility');
  });

  it('agent events include both runId and agentId (§8.4 correlation)', () => {
    const captured: LogEntry[] = [];
    const log = createLogger('utility', (e) => captured.push(e));

    log.info({ message: 'agent tool call', runId: 'run-002', agentId: 'agent-001' });

    expect(captured[0].runId).toBe('run-002');
    expect(captured[0].agentId).toBe('agent-001');
  });

  it('ts field is ISO 8601 string', () => {
    const captured: LogEntry[] = [];
    const log = createLogger('main', (e) => captured.push(e));

    log.info({ message: 'timestamped entry', runId: 'run-003' });

    expect(typeof captured[0].ts).toBe('string');
    // ISO 8601 basic check: parseable by Date.
    expect(Number.isNaN(new Date(captured[0].ts).getTime())).toBe(false);
  });

  it('system events (app start, tray) omit runId (§8.4)', () => {
    const captured: LogEntry[] = [];
    const log = createLogger('main', (e) => captured.push(e));

    // System-level event: no runId or agentId.
    log.info({ message: 'app started' });

    expect(captured[0].runId).toBeUndefined();
    expect(captured[0].agentId).toBeUndefined();
  });

  it('error level is captured correctly', () => {
    const captured: LogEntry[] = [];
    const log = createLogger('main', (e) => captured.push(e));

    log.error({ message: 'crash detected', runId: 'run-004', stack: 'Error: ...' });

    expect(captured[0].level).toBe('error');
  });
});

// ── §9 row 5 — Cross-process correlation: same runId in main + utility ───────

describe('Log correlation — same runId spans main and utility processes (§9 row 5)', () => {
  it('log entries from main and utility share the same runId', () => {
    const capturedMain: LogEntry[] = [];
    const capturedUtility: LogEntry[] = [];

    const mainLog = createLogger('main', (e) => capturedMain.push(e));
    const utilLog = createLogger('utility', (e) => capturedUtility.push(e));

    const RUN_ID = 'run-cross-process-001';

    mainLog.info({ message: 'run initiated in main', runId: RUN_ID });
    utilLog.info({ message: 'orchestrator received run', runId: RUN_ID });
    mainLog.info({ message: 'run.start IPC forwarded to renderer', runId: RUN_ID });

    // Both processes log the same runId.
    expect(capturedMain.every(e => e.runId === RUN_ID)).toBe(true);
    expect(capturedUtility.every(e => e.runId === RUN_ID)).toBe(true);

    // Both process tags are present across the combined log stream.
    const allEntries = [...capturedMain, ...capturedUtility];
    const processes = new Set(allEntries.map(e => e.process));
    expect(processes.has('main')).toBe(true);
    expect(processes.has('utility')).toBe(true);
  });
});
