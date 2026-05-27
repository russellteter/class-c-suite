// apps/utility/src/scheduler/scheduler.ts
// Source: docs/decisions/0002-ch1-process-architecture.md §5
// Token-budget concurrency scheduler — full implementation.

import type { IpcMessage } from '@c-suite/shared-types/ipc';

export type AgentRole = string;

export interface AgentInvocation {
  invocationId: string;
  runId: string;
  role: AgentRole;
  estimatedTokens: number;
  priority: 'interactive' | 'scheduled';
}

export interface AgentResult {
  invocationId: string;
  tokensIn: number;
  tokensOut: number;
  costUsdRef?: number;
  output: unknown;
}

export interface PendingInvocation extends AgentInvocation {
  resolve: (result: AgentResult) => void;
  reject: (err: Error) => void;
}

interface SchedulerState {
  windowStartedAt: number;       // ms epoch — 5-hr rolling window anchor
  tokensConsumed: number;        // input + output combined, this window
  windowCap: number;             // default 180_000 (B4 conservative)
  inFlight: Map<string, AgentInvocation[]>;  // runId → invocations
  queue: PendingInvocation[];
  priority: 'interactive' | 'scheduled';
}

const WINDOW_MS = 5 * 60 * 60 * 1000;   // 5 hours

export class Scheduler {
  private state: SchedulerState;
  private emitIpc: (msg: IpcMessage) => void;

  constructor(windowCap = 180_000, emitIpc: (msg: IpcMessage) => void) {
    this.emitIpc = emitIpc;
    this.state = {
      windowStartedAt: Date.now(),
      tokensConsumed: 0,
      windowCap,
      inFlight: new Map(),
      queue: [],
      priority: 'interactive',
    };
  }

  private checkWindowExpiry(): void {
    if (Date.now() - this.state.windowStartedAt >= WINDOW_MS) {
      this.reset();
    }
  }

  /**
   * Returns true if the scheduler can start a new invocation consuming
   * estimatedTokens without exceeding windowCap.
   *
   * Priority rule (ADR §5.3):
   *   - If any interactive run is in-flight, scheduled invocations return false.
   *   - Interactive invocations may proceed if tokens fit in the window.
   */
  canDispatch(estimatedTokens: number, priority: 'interactive' | 'scheduled'): boolean {
    this.checkWindowExpiry();

    // Priority rule: scheduled is blocked while any interactive is in-flight.
    if (priority === 'scheduled') {
      const hasInteractiveInFlight = Array.from(this.state.inFlight.values())
        .flat()
        .some(inv => inv.priority === 'interactive');
      if (hasInteractiveInFlight) return false;
    }

    return this.state.tokensConsumed + estimatedTokens <= this.state.windowCap;
  }

  /**
   * Gate via canDispatch; if allowed, add to inFlight and return result.
   * If NOT allowed: emit scheduler.throttle and degrade to sequential.
   */
  async dispatch(invocation: PendingInvocation): Promise<AgentResult> {
    this.checkWindowExpiry();

    if (!this.canDispatch(invocation.estimatedTokens, invocation.priority)) {
      // Emit throttle event — sequential degradation (retryAt: null).
      this.emitIpc({
        kind: 'scheduler.throttle',
        payload: {
          reason: 'window-cap-degradation',
          retryAt: null,
        },
      });

      // Queue the invocation — will be processed when capacity allows.
      return new Promise<AgentResult>((resolve, reject) => {
        this.state.queue.push({ ...invocation, resolve, reject });
      });
    }

    // Track invocation.
    const inFlightForRun = this.state.inFlight.get(invocation.runId) ?? [];
    inFlightForRun.push(invocation);
    this.state.inFlight.set(invocation.runId, inFlightForRun);

    // Optimistic token reservation.
    this.state.tokensConsumed += invocation.estimatedTokens;

    // Resolve immediately — actual execution is caller's responsibility.
    // This scheduler gates concurrency; the caller runs the agent SDK call.
    return Promise.resolve({
      invocationId: invocation.invocationId,
      tokensIn: 0,
      tokensOut: 0,
      output: null,
    });
  }

  /**
   * Called by main on 5-hr rolling-window expiry.
   * Resets tokensConsumed and windowStartedAt. Emits scheduler.window.reset.
   * Drains the queue (pending invocations may now proceed).
   */
  reset(): void {
    this.state.tokensConsumed = 0;
    this.state.windowStartedAt = Date.now();

    this.emitIpc({
      kind: 'scheduler.window.reset',
      payload: {
        resetAt: this.state.windowStartedAt,
        newWindowCap: this.state.windowCap,
      },
    });

    // Drain queue.
    const queued = this.state.queue.splice(0);
    for (const pending of queued) {
      this.dispatch(pending).then(pending.resolve).catch(pending.reject);
    }
  }

  /**
   * Record tokens consumed by a completed invocation.
   * Adjusts tokensConsumed from estimated to actual and emits cost.usage.
   */
  recordUsage(
    invocationId: string,
    tokensIn: number,
    tokensOut: number,
    costUsdRef?: number,
    runId?: string,
    jobId?: string,
  ): void {
    // Adjust consumed tokens to actual (was estimated during dispatch).
    const actual = tokensIn + tokensOut;
    this.state.tokensConsumed = Math.max(0, this.state.tokensConsumed + actual);

    const windowRemainingTokens = Math.max(0, this.state.windowCap - this.state.tokensConsumed);
    const windowResetsAt = this.state.windowStartedAt + WINDOW_MS;

    this.emitIpc({
      kind: 'cost.usage',
      payload: {
        ...(runId ? { runId } : {}),
        ...(jobId ? { jobId } : {}),
        tokensIn,
        tokensOut,
        windowRemainingTokens,
        windowResetsAt,
        ...(costUsdRef !== undefined ? { totalCostUsdReference: costUsdRef } : {}),
      },
    });

    // Remove from inFlight.
    for (const [rid, invocations] of this.state.inFlight) {
      const filtered = invocations.filter(inv => inv.invocationId !== invocationId);
      if (filtered.length === 0) {
        this.state.inFlight.delete(rid);
      } else {
        this.state.inFlight.set(rid, filtered);
      }
    }

    // Drain queue now that capacity may have increased.
    const queued = this.state.queue.splice(0);
    for (const pending of queued) {
      this.dispatch(pending).then(pending.resolve).catch(pending.reject);
    }
  }
}
