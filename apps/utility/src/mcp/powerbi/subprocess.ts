// apps/utility/src/mcp/powerbi/subprocess.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §9
//
// PowerBIClient — implements McpClient interface for the customer-dashboard
// Python subprocess. Spawns `python3 src/main.py -j /tmp/cdash-<runId>.json`
// from the customer-dashboard project directory, then reads and Zod-validates
// the JSON file.
//
// DECISION (ch.8 pbi): --validate flag in main.py short-circuits before
// run_pipeline() and never writes the JSON file. The subprocess command
// uses `-j <path>` only. Decision logged here per DOCTRINE law #9.
//
// DECISION (ch.8 pbi): getAccountUsage falls back to full-export + filter
// because customer-dashboard has no single-account CLI query interface.
// Documented here; Ch.10 can add a dedicated route if needed.
//
// Cache: in-memory, 1hr TTL, runId-scoped. Cross-process caching is Ch.10 scope.

import { spawn } from 'child_process';
import { readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

import {
  CustomerDashboardDataSchema,
  type CustomerDashboardData,
  type CustomerDashboardRecord,
} from './schema.js';
import {
  PowerBIPythonMissingError,
  PowerBIVenvMissingError,
  PowerBISubprocessError,
  PowerBIJsonInvalidError,
} from './errors.js';
import { preflightPowerBI, CUSTOMER_DASHBOARD_PATH } from './preflight.js';
import type { McpClient, McpHealth } from '@c-suite/shared-types/mcp';

// ── In-memory cache ───────────────────────────────────────────────────────────

interface CacheEntry {
  data: CustomerDashboardData;
  fetchedAt: Date;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const cache = new Map<string, CacheEntry>();

function getCached(runId: string): CustomerDashboardData | null {
  const entry = cache.get(runId);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt.getTime() > CACHE_TTL_MS) {
    cache.delete(runId);
    return null;
  }
  return entry.data;
}

function setCache(runId: string, data: CustomerDashboardData): void {
  cache.set(runId, { data, fetchedAt: new Date() });
}

// ── Timeout from env ──────────────────────────────────────────────────────────

function getTimeoutMs(): number {
  const raw = process.env.POWERBI_SUBPROCESS_TIMEOUT_MS;
  if (raw) {
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 120_000;
}

// ── PowerBIClient ─────────────────────────────────────────────────────────────

export class PowerBIClient implements McpClient {
  readonly serviceId = 'powerbi' as const;
  private readonly projectPath: string;
  private _lastSuccessAt?: Date;
  private _lastError?: string;

  constructor(projectPath = CUSTOMER_DASHBOARD_PATH) {
    this.projectPath = projectPath;
  }

  // ── McpClient: isAuthenticated ─────────────────────────────────────────────
  async isAuthenticated(): Promise<boolean> {
    const result = preflightPowerBI(this.projectPath);
    return result.python === 'ok' && result.venv === 'ok' && result.project === 'ok';
  }

  // ── McpClient: reconnect ───────────────────────────────────────────────────
  async reconnect(): Promise<void> {
    const result = preflightPowerBI(this.projectPath);
    if (result.remediation.length > 0) {
      throw new Error(
        `PowerBI preflight failed. Actions required:\n` +
        result.remediation.map((r) => `  - ${r}`).join('\n')
      );
    }
  }

  // ── McpClient: healthCheck ─────────────────────────────────────────────────
  async healthCheck(): Promise<McpHealth> {
    const authenticated = await this.isAuthenticated();
    if (!authenticated) {
      return {
        ok: false,
        lastSuccessAt: this._lastSuccessAt,
        lastError: this._lastError ?? 'preflight check failed (python/venv/project missing)',
        authMode: 'subprocess',
      };
    }
    return {
      ok: true,
      lastSuccessAt: this._lastSuccessAt,
      lastError: this._lastError,
      authMode: 'subprocess',
    };
  }

  // ── runFullExport ──────────────────────────────────────────────────────────
  /**
   * Spawns the customer-dashboard pipeline and returns validated JSON.
   * Caches the result for 1 hour keyed by runId.
   *
   * DECISION: --validate flag short-circuits before run_pipeline() in main.py,
   * so we omit it. Only `-j <path>` is used.
   */
  async runFullExport({ runId }: { runId: string }): Promise<CustomerDashboardData> {
    const cached = getCached(runId);
    if (cached) return cached;

    // Preflight
    const preflight = preflightPowerBI(this.projectPath);
    if (preflight.python === 'missing') {
      throw new PowerBIPythonMissingError();
    }
    if (preflight.project === 'missing') {
      throw new Error(
        `customer-dashboard project not found at ${this.projectPath}. ` +
        (preflight.remediation[0] ?? '')
      );
    }
    if (preflight.venv === 'missing') {
      throw new PowerBIVenvMissingError(this.projectPath);
    }

    const jsonPath = `/tmp/cdash-${runId}.json`;

    // Use venv python
    const pythonBin = join(this.projectPath, '.venv', 'bin', 'python3');

    const data = await this._spawnSubprocess({ pythonBin, jsonPath });
    setCache(runId, data);
    this._lastSuccessAt = new Date();
    this._lastError = undefined;
    return data;
  }

  // ── getAccountUsage ────────────────────────────────────────────────────────
  /**
   * Returns the single-account record for the given 18-char Salesforce ID.
   * Falls back to full-export + filter (no single-account CLI interface exists
   * in customer-dashboard). Ch.10 can add a dedicated route if needed.
   */
  async getAccountUsage({ accountId18, runId }: { accountId18: string; runId: string }): Promise<CustomerDashboardRecord | null> {
    const all = await this.runFullExport({ runId });
    return (
      all.find(
        (r) =>
          r.account_id === accountId18 ||
          (r as Record<string, unknown>)['Account ID 18 Digit'] === accountId18
      ) ?? null
    );
  }

  // ── Internal: _spawnSubprocess ─────────────────────────────────────────────

  private async _spawnSubprocess({
    pythonBin,
    jsonPath,
  }: {
    pythonBin: string;
    jsonPath: string;
  }): Promise<CustomerDashboardData> {
    const timeoutMs = getTimeoutMs();
    const stderrChunks: string[] = [];

    return new Promise<CustomerDashboardData>((resolve, reject) => {
      const proc = spawn(
        pythonBin,
        ['src/main.py', '-j', jsonPath, '--no-am-dashboards'],
        {
          cwd: this.projectPath,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env },
        }
      );

      // Stream stderr to debug log — not parsed
      proc.stderr.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        stderrChunks.push(text);
        // Emit to debug logger if available — non-critical
        if (process.env.DEBUG_POWERBI) {
          process.stderr.write('[powerbi:stderr] ' + text);
        }
      });

      // stdout is intentionally ignored — JSON lands in the -j file path
      proc.stdout.resume();

      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        proc.kill('SIGKILL');
        const stderrTail = stderrChunks.join('').slice(-500);
        this._lastError = `subprocess timed out after ${timeoutMs}ms`;
        reject(
          new PowerBISubprocessError({
            exitCode: null,
            stderrTail: `[TIMEOUT after ${timeoutMs}ms] ${stderrTail}`,
          })
        );
      }, timeoutMs);

      proc.on('close', async (code) => {
        clearTimeout(timer);
        if (timedOut) return;

        if (code !== 0) {
          const stderrTail = stderrChunks.join('').slice(-500);
          this._lastError = `exit code ${code}`;
          reject(new PowerBISubprocessError({ exitCode: code, stderrTail }));
          return;
        }

        // Read + parse the JSON file
        let raw: string;
        try {
          raw = await readFile(jsonPath, 'utf8');
        } catch (err) {
          const stderrTail = stderrChunks.join('').slice(-500);
          this._lastError = `JSON file not written: ${jsonPath}`;
          reject(
            new PowerBISubprocessError({
              exitCode: 0,
              stderrTail: `JSON file not found at ${jsonPath}. stderr: ${stderrTail}`,
            })
          );
          return;
        }

        // Cleanup temp file — best effort
        unlink(jsonPath).catch(() => {});

        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch (err) {
          this._lastError = 'JSON parse failed';
          reject(
            new PowerBIJsonInvalidError({
              zodError: { message: 'JSON.parse failed', cause: String(err) },
              jsonPath,
            })
          );
          return;
        }

        // Zod validation
        const result = CustomerDashboardDataSchema.safeParse(parsed);
        if (!result.success) {
          this._lastError = 'Zod validation failed';
          reject(
            new PowerBIJsonInvalidError({
              zodError: result.error.flatten(),
              jsonPath,
            })
          );
          return;
        }

        resolve(result.data);
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        if (timedOut) return;
        this._lastError = String(err);
        reject(
          new PowerBISubprocessError({
            exitCode: null,
            stderrTail: String(err),
          })
        );
      });
    });
  }
}
