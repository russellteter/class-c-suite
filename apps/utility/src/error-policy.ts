// apps/utility/src/error-policy.ts
// Source: docs/decisions/0002-ch1-process-architecture.md §6
// Error handling policies per Decision 5 table (phase-r-decisions.md §Decision 5).
// Implements retry logic + IPC events per failure category.

import type { IpcMessage } from '@c-suite/shared-types/ipc';
import { createLogger } from './logger.js';

const log = createLogger();

export interface PolicyOptions {
  emitIpc: (msg: IpcMessage) => void;
  runId: string;
}

// ── Backoff helpers ─────────────────────────────────────────────────────────

function jitter(ms: number): number {
  // ±20% jitter per ADR §5.5.
  const range = ms * 0.2;
  return ms + (Math.random() * 2 - 1) * range;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Network timeout: exponential backoff 30s / 2m / 10m, max 3 retries ─────

const NETWORK_BACKOFFS_MS = [30_000, 120_000, 600_000];

/**
 * Retry fn on network failure (5xx, connection error) with exponential backoff.
 * Backoff intervals: 30s → 2m → 10m. Max 3 retries. Emits scheduler.throttle
 * on each backoff. After all retries: emits run.failed and throws.
 */
export async function withNetworkRetry<T>(
  fn: () => Promise<T>,
  opts: PolicyOptions,
): Promise<T> {
  let lastErr: unknown;

  for (let attempt = 0; attempt <= NETWORK_BACKOFFS_MS.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;

      if (attempt >= NETWORK_BACKOFFS_MS.length) break;

      const delayMs = jitter(NETWORK_BACKOFFS_MS[attempt]);
      const retryAt = Date.now() + delayMs;

      log.warn({ runId: opts.runId, message: `network retry ${attempt + 1}`, delayMs });
      opts.emitIpc({
        kind: 'scheduler.throttle',
        payload: { reason: 'network-timeout-retry', retryAt },
      });

      await sleep(delayMs);
    }
  }

  // All retries exhausted.
  log.error({ runId: opts.runId, message: 'network retries exhausted', err: String(lastErr) });
  opts.emitIpc({
    kind: 'run.failed',
    payload: {
      runId: opts.runId,
      reason: `Network timeout: all 3 retries failed. ${String(lastErr)}`,
      stage: 'network-retry-exhausted',
    },
  });

  throw lastErr;
}

// ── Auth expired: NO retry — emit mcp.auth.expired immediately ──────────────

type McpServiceId = 'salesforce' | 'netsuite' | 'aws' | 'gmail' | 'chorus' | 'powerbi';

/**
 * Handle auth-expired failure per Decision 5.
 * NO automatic retry — auth requires browser interaction.
 * Emits mcp.auth.expired immediately. Caller surfaces re-login prompt.
 */
export function handleAuthExpired(service: McpServiceId, opts: PolicyOptions): void {
  log.warn({ runId: opts.runId, service, message: 'auth expired — no retry, emitting mcp.auth.expired' });
  opts.emitIpc({
    kind: 'mcp.auth.expired',
    payload: { service },
  });
  // No retry timer. No throw. Caller continues with degraded sources.
}

// ── MCP down: exponential backoff 1m / 5m / 30m, max 3 retries ─────────────

const MCP_BACKOFFS_MS = [60_000, 300_000, 1_800_000];

/**
 * Retry fn on MCP-down failure (Anthropic service unreachable, MCP server crashed).
 * Backoff intervals: 1m → 5m → 30m. Max 3 retries.
 * After all retries: degraded mode (caller handles).
 */
export async function withMcpRetry<T>(
  fn: () => Promise<T>,
  opts: PolicyOptions,
): Promise<T> {
  let lastErr: unknown;

  for (let attempt = 0; attempt <= MCP_BACKOFFS_MS.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;

      if (attempt >= MCP_BACKOFFS_MS.length) break;

      const delayMs = jitter(MCP_BACKOFFS_MS[attempt]);
      const retryAt = Date.now() + delayMs;

      log.warn({ runId: opts.runId, message: `MCP retry ${attempt + 1}`, delayMs });
      opts.emitIpc({
        kind: 'scheduler.throttle',
        payload: { reason: 'mcp-down-retry', retryAt },
      });

      await sleep(delayMs);
    }
  }

  log.error({ runId: opts.runId, message: 'MCP retries exhausted — degraded mode', err: String(lastErr) });
  // Degraded mode: caller skips MCP-dependent lens. Do NOT emit run.failed — runs continue.
  throw lastErr;
}

// ── Vault unreachable: retry 3× at 10s, then HALT ───────────────────────────

const VAULT_RETRY_MS = 10_000;
const VAULT_MAX_RETRIES = 3;

/**
 * Retry fn on vault-filesystem error (file not found, disk full, permissions).
 * Retry 3× with 10s spacing. If still failing: HALT (do NOT partial-write).
 * Emits run.failed after all retries exhausted.
 */
export async function withVaultRetry<T>(
  fn: () => Promise<T>,
  opts: PolicyOptions,
): Promise<T> {
  let lastErr: unknown;

  for (let attempt = 0; attempt <= VAULT_MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;

      if (attempt >= VAULT_MAX_RETRIES) break;

      log.warn({ runId: opts.runId, message: `vault retry ${attempt + 1}`, delayMs: VAULT_RETRY_MS });
      await sleep(VAULT_RETRY_MS);
    }
  }

  log.error({ runId: opts.runId, message: 'vault retries exhausted — HALT', err: String(lastErr) });
  opts.emitIpc({
    kind: 'run.failed',
    payload: {
      runId: opts.runId,
      reason: `Vault unreachable after ${VAULT_MAX_RETRIES} retries: ${String(lastErr)}`,
      stage: 'vault-retry-exhausted',
    },
  });

  throw lastErr;
}

// ── Vault git commit fail: no retry, queue 5-min retry ──────────────────────

const GIT_RETRY_INTERVAL_MS = 5 * 60_000;
let _gitRetryTimer: ReturnType<typeof setTimeout> | null = null;
let _gitRetryCount = 0;
const MAX_GIT_RETRY_SILENT = 6;  // notify after 6 consecutive failures

/**
 * Handle vault git commit failure per Decision 5.
 * No immediate retry. Queues git-commit-retry every 5 minutes.
 * Notifies only after 6 consecutive failures.
 * The file write has already succeeded; only the git commit failed.
 */
export async function withVaultGitRetry(
  commitFn: () => Promise<void>,
  opts: PolicyOptions,
): Promise<void> {
  try {
    await commitFn();
    // Success — reset counter.
    _gitRetryCount = 0;
    if (_gitRetryTimer) {
      clearTimeout(_gitRetryTimer);
      _gitRetryTimer = null;
    }
  } catch (err) {
    _gitRetryCount++;
    log.warn({
      runId: opts.runId,
      message: 'vault git commit failed — queuing 5m retry',
      attempt: _gitRetryCount,
      err: String(err),
    });

    // Queue retry in 5 minutes.
    _gitRetryTimer = setTimeout(async () => {
      _gitRetryTimer = null;
      await withVaultGitRetry(commitFn, opts);
    }, GIT_RETRY_INTERVAL_MS);

    // Notify only after 6 consecutive failures (ADR §6).
    if (_gitRetryCount >= MAX_GIT_RETRY_SILENT) {
      log.error({ runId: opts.runId, message: '6 consecutive git commit failures — surface to diagnostics' });
      // Ch.10 surfaces this in Settings → Diagnostics.
      // For now, log is sufficient; native notification added in Ch.10.
    }

    // File write succeeded — do NOT throw. Continue without blocking the run.
  }
}
