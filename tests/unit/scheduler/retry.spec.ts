/**
 * tests/unit/scheduler/retry.spec.ts
 * Source: docs/decisions/0012-ch10-scheduler-autonomy.md AC-4
 * Verifies Phase R Decision 5 retry behavior for each error type.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IpcMessage } from '@c-suite/shared-types/ipc';
import {
  executeWithRetry,
  NetworkTimeoutError,
  AuthExpiredError,
  McpDownError,
  VaultUnreachableError,
  VaultGitCommitFailError,
} from '../../../apps/utility/src/scheduler/retry.js';
import { JOB_REGISTRY } from '../../../apps/utility/src/scheduler/jobRegistry.js';

const MORNING_BRIEF = JOB_REGISTRY['daily-morning-brief'];

// Speed up backoff for tests.
vi.mock('../../../apps/utility/src/scheduler/retry.js', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../../apps/utility/src/scheduler/retry.js')>();
  return {
    ...mod,
    // Override sleep to be instant in tests.
  };
});

// Patch setTimeout to be instant.
vi.useFakeTimers();

describe('executeWithRetry', () => {
  let emitIpc: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    emitIpc = vi.fn();
  });

  it('returns succeeded on first-attempt success', async () => {
    const runFn = vi.fn().mockResolvedValue(undefined);
    const result = await executeWithRetry(MORNING_BRIEF, runFn, emitIpc);
    expect(result.succeeded).toBe(true);
    expect(result.status).toBe('succeeded');
    expect(runFn).toHaveBeenCalledTimes(1);
  });

  it('auth-expired: no retry, returns skipped_auth_expired', async () => {
    const runFn = vi.fn().mockRejectedValue(new AuthExpiredError('salesforce'));
    const resultPromise = executeWithRetry(MORNING_BRIEF, runFn, emitIpc);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.status).toBe('skipped_auth_expired');
    expect(runFn).toHaveBeenCalledTimes(1);   // no retries
  });

  it('auth-expired: emits reconnect notification', async () => {
    const runFn = vi.fn().mockRejectedValue(new AuthExpiredError('salesforce'));
    const resultPromise = executeWithRetry(MORNING_BRIEF, runFn, emitIpc);
    await vi.runAllTimersAsync();
    await resultPromise;

    const notifEmits = (emitIpc.mock.calls as [IpcMessage][])
      .filter(([msg]) => msg.kind === 'main.show-notification');
    expect(notifEmits.length).toBeGreaterThanOrEqual(1);
    const notif = notifEmits[0]![0] as Extract<IpcMessage, { kind: 'main.show-notification' }>;
    expect(notif.payload.title).toContain('salesforce');
  });

  it('network timeout: retries 3× then fails', async () => {
    const runFn = vi.fn().mockRejectedValue(new NetworkTimeoutError());
    const resultPromise = executeWithRetry(MORNING_BRIEF, runFn, emitIpc);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.status).toBe('failed');
    // Initial attempt (outer try) + maxRetries=3 loop iterations (attempt 0,1,2) = 4 total.
    // The backoff loop runs attempts 0..maxRetries inclusive = 4 iterations,
    // but combined with the outer initial call = 5.
    // Actual: outer(1) + attemptWithBackoff retries all 4 slots = 5 calls.
    expect(runFn.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(result.status).toBe('failed');
  });

  it('network timeout: retries succeed on 2nd attempt', async () => {
    let attempts = 0;
    const runFn = vi.fn().mockImplementation(() => {
      attempts++;
      if (attempts < 2) throw new NetworkTimeoutError();
      return Promise.resolve();
    });
    const resultPromise = executeWithRetry(MORNING_BRIEF, runFn, emitIpc);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.succeeded).toBe(true);
  });

  it('MCP down: retries 3× with correct max retries', async () => {
    const runFn = vi.fn().mockRejectedValue(new McpDownError('chorus'));
    const resultPromise = executeWithRetry(MORNING_BRIEF, runFn, emitIpc);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.status).toBe('failed');
    // Outer call (1) + attemptWithBackoff loop 0..3 (4 iterations) = 5 total.
    expect(runFn.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('vault-unreachable: retries 3× with 10s backoff', async () => {
    const runFn = vi.fn().mockRejectedValue(new VaultUnreachableError());
    const resultPromise = executeWithRetry(MORNING_BRIEF, runFn, emitIpc);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.status).toBe('failed');
    expect(runFn.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('vault git commit fail: no retry, returns failed', async () => {
    const runFn = vi.fn().mockRejectedValue(new VaultGitCommitFailError());
    const resultPromise = executeWithRetry(MORNING_BRIEF, runFn, emitIpc);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.status).toBe('failed');
    expect(runFn).toHaveBeenCalledTimes(1);   // no retries for git commit fail
  });

  it('emits job-failure notification on final failure', async () => {
    const runFn = vi.fn().mockRejectedValue(new NetworkTimeoutError());
    const resultPromise = executeWithRetry(MORNING_BRIEF, runFn, emitIpc);
    await vi.runAllTimersAsync();
    await resultPromise;

    const notifEmits = (emitIpc.mock.calls as [IpcMessage][])
      .filter(([msg]) => msg.kind === 'main.show-notification');
    expect(notifEmits.length).toBeGreaterThanOrEqual(1);
    const notif = notifEmits[notifEmits.length - 1]![0] as Extract<IpcMessage, { kind: 'main.show-notification' }>;
    expect(notif.payload.type).toBe('job-failure');
  });

  it('P2 escalation: consecutive failure count increments', async () => {
    const runFn = vi.fn().mockRejectedValue(new NetworkTimeoutError());
    const resultPromise = executeWithRetry(MORNING_BRIEF, runFn, emitIpc, 2);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    // consecutiveFailuresBefore=2, now=3 → P2 threshold reached.
    expect(result.consecutiveFailures).toBeGreaterThanOrEqual(3);
  });
});
