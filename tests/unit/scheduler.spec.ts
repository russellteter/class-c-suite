/**
 * ADR-0002 §9 rows 3 + 11 — Token-budget concurrency scheduler
 * Test owner: Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0002-ch1-process-architecture.md §5 + §9 rows 3 + 11
 *
 * Spec ambiguities (logged per brief):
 *   1. ADR §5.2: `dispatch()` accepts `PendingInvocation` (includes resolve/reject).
 *      The test calls dispatch() and checks emitted events; we pass minimal objects
 *      and mock the resolve/reject as no-ops. Runtime must accept this shape.
 *   2. ADR §5.6: `scheduler.window.reset` is explicitly marked UNKNOWN in the IPC union
 *      (not in ipc.ts at the time tests are written). Row 11 tests that the variant
 *      type-checks after Runtime adds it. Test currently asserts validateIpc throws
 *      for the new kind (expected red). Runtime adds the variant; test flips green.
 *   3. The `emitIpc` callback in the Scheduler constructor is used in-process for
 *      event capture in tests — no real MessagePort required.
 *   4. ADR §5.7: Window reset fires inside `canDispatch()` lazily. Tests advance
 *      Date.now() via vi.setSystemTime; Scheduler must call checkWindowExpiry()
 *      at the top of canDispatch/dispatch.
 *
 * Tests fail until Runtime ships apps/utility/src/scheduler.ts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { IpcMessage } from '@c-suite/shared-types/ipc';
import { validateIpc } from '@c-suite/shared-types/ipc';

// Production module — does not exist yet; import will fail until Runtime ships.
// import { Scheduler } from '../../../apps/utility/src/scheduler.js';

// Minimal stub so TypeScript compiles the test file now.
// Runtime replaces this with the real module; delete the stub at that point.
class Scheduler {
  constructor(_windowCap: number, _emitIpc: (msg: IpcMessage) => void) {
    throw new Error('Scheduler not implemented — Runtime dispatch pending');
  }
  canDispatch(_estimatedTokens: number, _priority: 'interactive' | 'scheduled'): boolean {
    throw new Error('not implemented');
  }
  dispatch(_invocation: unknown): Promise<unknown> {
    throw new Error('not implemented');
  }
  reset(): void {
    throw new Error('not implemented');
  }
  recordUsage(_invocationId: string, _tokensIn: number, _tokensOut: number, _costUsdRef?: number): void {
    throw new Error('not implemented');
  }
}

// ── §9 row 3 — Scheduler cap + degradation ──────────────────────────────────

describe('Scheduler — token-budget cap + sequential degradation (§9 row 3)', () => {
  const WINDOW_CAP = 180_000;
  const emitted: IpcMessage[] = [];
  let scheduler: Scheduler;

  beforeEach(() => {
    emitted.length = 0;
    scheduler = new Scheduler(WINDOW_CAP, (msg) => emitted.push(msg));
  });

  it('allows first 9 dispatches of 20K tokens each (180K total fits cap)', () => {
    for (let i = 0; i < 9; i++) {
      expect(scheduler.canDispatch(20_000, 'interactive')).toBe(true);
    }
  });

  it('returns false on 10th dispatch when total would exceed windowCap', () => {
    // Consume 9 × 20K = 180K tokens (at cap).
    for (let i = 0; i < 9; i++) {
      scheduler.dispatch({
        invocationId: `inv-${i}`,
        runId: 'run-001',
        role: 'CFO',
        estimatedTokens: 20_000,
        priority: 'interactive',
        resolve: () => {},
        reject: () => {},
      });
    }
    expect(scheduler.canDispatch(20_000, 'interactive')).toBe(false);
  });

  it('emits scheduler.throttle with retryAt:null on degradation to sequential', async () => {
    // Saturate the window.
    for (let i = 0; i < 9; i++) {
      scheduler.dispatch({
        invocationId: `inv-${i}`,
        runId: 'run-001',
        role: 'CFO',
        estimatedTokens: 20_000,
        priority: 'interactive',
        resolve: () => {},
        reject: () => {},
      });
    }
    // 10th dispatch exceeds cap → throttle emitted.
    scheduler.dispatch({
      invocationId: 'inv-9',
      runId: 'run-001',
      role: 'CFO',
      estimatedTokens: 20_000,
      priority: 'interactive',
      resolve: () => {},
      reject: () => {},
    });

    const throttle = emitted.find(m => m.kind === 'scheduler.throttle');
    expect(throttle).toBeDefined();
    expect(throttle?.kind).toBe('scheduler.throttle');
    // retryAt: null signals sequential-degradation mode, not a timed retry.
    if (throttle?.kind === 'scheduler.throttle') {
      expect(throttle.payload.retryAt).toBeNull();
    }
  });

  it('scheduled invocations always return false when interactive is in-flight (§5.3 priority rule)', () => {
    // One interactive in-flight.
    scheduler.dispatch({
      invocationId: 'inv-interactive',
      runId: 'run-001',
      role: 'CFO',
      estimatedTokens: 5_000,
      priority: 'interactive',
      resolve: () => {},
      reject: () => {},
    });
    // Scheduled must be blocked even though tokens remain.
    expect(scheduler.canDispatch(5_000, 'scheduled')).toBe(false);
  });
});

// ── §9 row 11 — scheduler.window.reset after 5-hr advance ───────────────────

describe('Scheduler — window reset after 5-hour expiry (§9 row 11 + §5.7)', () => {
  const WINDOW_CAP = 180_000;
  const emitted: IpcMessage[] = [];
  let scheduler: Scheduler;

  beforeEach(() => {
    vi.useFakeTimers();
    emitted.length = 0;
    scheduler = new Scheduler(WINDOW_CAP, (msg) => emitted.push(msg));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits scheduler.window.reset after 5-hour window advance', () => {
    // Consume some tokens so the window is non-empty.
    scheduler.dispatch({
      invocationId: 'inv-0',
      runId: 'run-001',
      role: 'CFO',
      estimatedTokens: 50_000,
      priority: 'interactive',
      resolve: () => {},
      reject: () => {},
    });

    // Advance clock past the 5-hour window.
    vi.advanceTimersByTime(5 * 60 * 60 * 1000 + 1);

    // Next canDispatch check triggers lazy window expiry → reset fires.
    scheduler.canDispatch(1_000, 'interactive');

    const reset = emitted.find(m => m.kind === 'scheduler.window.reset');
    expect(reset).toBeDefined();
    expect(reset?.kind).toBe('scheduler.window.reset');
  });

  it('resets tokensConsumed to 0 after window expiry', () => {
    // Fill near cap.
    scheduler.dispatch({
      invocationId: 'inv-fill',
      runId: 'run-001',
      role: 'CFO',
      estimatedTokens: 179_000,
      priority: 'interactive',
      resolve: () => {},
      reject: () => {},
    });

    // Advance 5 hours.
    vi.advanceTimersByTime(5 * 60 * 60 * 1000 + 1);

    // After reset, full cap is available again.
    expect(scheduler.canDispatch(180_000, 'interactive')).toBe(true);
  });
});

// ── §9 row 11 — scheduler.window.reset IpcMessage variant ───────────────────

describe('IpcMessage — scheduler.window.reset variant (ADR §5.6 + §9 row 11)', () => {
  it('validates scheduler.window.reset after Runtime adds the variant to ipc.ts', () => {
    // This test is RED until Runtime adds the variant to packages/shared-types/src/ipc.ts.
    // Spec: { kind: 'scheduler.window.reset', payload: { resetAt: number; newWindowCap: number } }
    // validateIpc will currently throw because the kind is not in the discriminated union.
    // Once Runtime adds the variant, this test flips green.
    const msg = validateIpc({
      kind: 'scheduler.window.reset',
      payload: { resetAt: Date.now(), newWindowCap: 180_000 },
    });
    expect(msg.kind).toBe('scheduler.window.reset');
  });
});
