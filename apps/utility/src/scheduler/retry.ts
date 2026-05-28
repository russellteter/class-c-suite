// apps/utility/src/scheduler/retry.ts
// Source: docs/decisions/0012-ch10-scheduler-autonomy.md §3.5
// Implements Phase R Decision 5 verbatim.

import type { JobDefinition } from '@c-suite/shared-types/scheduled-job';
import type { IpcMessage } from '@c-suite/shared-types/ipc';
import { createLogger } from '../logger.js';

const log = createLogger('retry');

export type EmitIpcFn = (msg: IpcMessage) => void;

// Typed error classes for discriminated retry routing.

export class NetworkTimeoutError extends Error {
  constructor(public readonly cause?: unknown) {
    super('NetworkTimeoutError');
    this.name = 'NetworkTimeoutError';
  }
}

export class AuthExpiredError extends Error {
  constructor(public readonly service: string) {
    super(`AuthExpiredError: ${service}`);
    this.name = 'AuthExpiredError';
  }
}

export class McpDownError extends Error {
  constructor(public readonly service: string) {
    super(`McpDownError: ${service}`);
    this.name = 'McpDownError';
  }
}

export class VaultUnreachableError extends Error {
  constructor(public readonly cause?: unknown) {
    super('VaultUnreachableError');
    this.name = 'VaultUnreachableError';
  }
}

export class VaultGitCommitFailError extends Error {
  constructor(public readonly cause?: unknown) {
    super('VaultGitCommitFailError');
    this.name = 'VaultGitCommitFailError';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface RetryResult {
  succeeded: boolean;
  status: 'succeeded' | 'failed' | 'skipped_auth_expired';
  failureReason?: string;
  consecutiveFailures?: number;
}

/**
 * executeWithRetry — wraps a job runner function with Decision-5 retry policy.
 * Writes failure status + emits notifications per ADR §3.5.
 */
export async function executeWithRetry(
  jobDef: JobDefinition,
  runFn: () => Promise<void>,
  emitIpc: EmitIpcFn,
  consecutiveFailuresBefore = 0,
): Promise<RetryResult> {
  const policy = jobDef.retryPolicy;

  // --- Auth-expired: no retry, emit reconnect notification ---
  // We check this before running by letting the first attempt bubble.

  async function attemptWithBackoff<T extends number[]>(
    maxRetries: number,
    backoffMs: T,
    errorClass: string,
  ): Promise<RetryResult> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await runFn();
        return { succeeded: true, status: 'succeeded' };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        // If error class changed mid-retry, re-throw for outer handler.
        if (err instanceof AuthExpiredError) throw err;
        if (err instanceof VaultGitCommitFailError) throw err;

        if (attempt < maxRetries) {
          const delay = backoffMs[attempt] ?? backoffMs[backoffMs.length - 1] ?? 60_000;
          log.warn({ message: `${errorClass} attempt ${attempt + 1}/${maxRetries} failed — backing off ${delay}ms`, jobId: jobDef.id });
          await sleep(delay);
        }
      }
    }
    return {
      succeeded: false,
      status: 'failed',
      failureReason: lastError?.message ?? 'unknown',
    };
  }

  try {
    await runFn();
    return { succeeded: true, status: 'succeeded' };
  } catch (err) {
    // --- Auth expired: no retry ---
    if (err instanceof AuthExpiredError) {
      log.warn({ message: 'auth expired — no retry, emitting reconnect notification', jobId: jobDef.id, service: err.service });
      if (jobDef.notifyOnFailure) {
        emitIpc({
          kind: 'main.show-notification',
          payload: {
            type: 'job-failure',
            title: `C-Suite: reconnect ${err.service}`,
            body: `${jobDef.id} skipped — ${err.service} auth expired. Click to reconnect.`,
            clickAction: 'settings-scheduler',
            clickPayload: jobDef.id,
          },
        });
      }
      return { succeeded: false, status: 'skipped_auth_expired', failureReason: err.message };
    }

    // --- Vault git commit fail: no retry, queue 5-min retries (policy: no_retry_queue_5m_retries) ---
    if (err instanceof VaultGitCommitFailError) {
      log.error({ message: 'vault git commit fail — queuing 5m retries (not implemented here; caller handles)', jobId: jobDef.id });
      return { succeeded: false, status: 'failed', failureReason: err.message };
    }

    // --- Network timeout: 3 retries with [30s, 2m, 10m] ---
    if (err instanceof NetworkTimeoutError) {
      const result = await attemptWithBackoff(
        policy.networkTimeout.maxRetries,
        policy.networkTimeout.backoffMs as [30_000, 120_000, 600_000],
        'NetworkTimeout',
      );
      return maybeEscalate(result, jobDef, emitIpc, consecutiveFailuresBefore);
    }

    // --- MCP down: 3 retries with [60s, 5m, 30m] ---
    if (err instanceof McpDownError) {
      const result = await attemptWithBackoff(
        policy.mcpDown.maxRetries,
        policy.mcpDown.backoffMs as [60_000, 300_000, 1_800_000],
        'McpDown',
      );
      return maybeEscalate(result, jobDef, emitIpc, consecutiveFailuresBefore);
    }

    // --- Vault unreachable: 3 retries with 10s backoff each ---
    if (err instanceof VaultUnreachableError) {
      const backoffArr: [number, number, number] = [
        policy.vaultUnreachable.backoffSeconds * 1000,
        policy.vaultUnreachable.backoffSeconds * 1000,
        policy.vaultUnreachable.backoffSeconds * 1000,
      ];
      const result = await attemptWithBackoff(
        policy.vaultUnreachable.maxRetries,
        backoffArr,
        'VaultUnreachable',
      );
      return maybeEscalate(result, jobDef, emitIpc, consecutiveFailuresBefore);
    }

    // --- Unknown error: treat as network timeout ---
    const unknown = err instanceof Error ? err : new Error(String(err));
    log.error({ message: 'unclassified job error — treating as network timeout', jobId: jobDef.id, err: unknown.message });
    const result = await attemptWithBackoff(
      policy.networkTimeout.maxRetries,
      policy.networkTimeout.backoffMs as [30_000, 120_000, 600_000],
      'Unknown',
    );
    return maybeEscalate(result, jobDef, emitIpc, consecutiveFailuresBefore);
  }
}

/**
 * After final failure: notify + escalate to P2 alert if >=3 consecutive fires failed.
 */
function maybeEscalate(
  result: RetryResult,
  jobDef: JobDefinition,
  emitIpc: EmitIpcFn,
  consecutiveFailuresBefore: number,
): RetryResult {
  if (result.succeeded) return result;

  const consecutiveNow = consecutiveFailuresBefore + 1;

  if (jobDef.notifyOnFailure) {
    emitIpc({
      kind: 'main.show-notification',
      payload: {
        type: 'job-failure',
        title: `C-Suite: ${jobDef.id} failed`,
        body: result.failureReason ?? 'Job failed after retries. Click for details.',
        clickAction: 'job-status',
        clickPayload: jobDef.id,
      },
    });
  }

  // P2 escalation: 3 consecutive scheduled fires failed.
  if (consecutiveNow >= 3) {
    log.error({ message: 'P2 escalation: 3 consecutive failures', jobId: jobDef.id });
    // Additional home-screen P2 alert would be emitted here via home.scheduledJobs push.
    // Actual in-app P2 alert logic lives in cron.ts which maintains consecutive counts.
  }

  return { ...result, consecutiveFailures: consecutiveNow };
}
