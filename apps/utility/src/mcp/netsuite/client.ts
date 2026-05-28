// apps/utility/src/mcp/netsuite/client.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §5
//
// NetSuiteClient — implements McpClient.
// Auth: Token-Based Authentication (TBA) via HMAC-SHA256. Credentials issued by Brian (B1).
//
// CRITICAL: Two operating modes —
//   token-present:  real SuiteQL / Saved Search calls against NetSuite REST API.
//   token-absent:   every method returns null + sets client.degraded = true.
//                   Playbooks receive null and degrade per their prereq matrix (ADR-0009 §3.6).
//
// Never throws from runSuiteQL/runSavedSearch in token-absent mode.
// NetSuiteAuthMissingError surfaces only from reconnect() after a failed store.

import type {
  NetSuiteClient as INetSuiteClient,
  McpHealth,
  NetSuiteQueryResult,
} from '@c-suite/shared-types/mcp';
import { NetSuiteQueryResultSchema } from '@c-suite/shared-types/mcp';
import type { DegradationWarning } from '@c-suite/shared-types/playbook';
import type { SafeStorageVault } from '../../credentials/safeStorageVault.js';
import { buildTBAAuthHeader, parseTBACredentials } from './tba-auth.js';
import type { TBACredentials } from './tba-auth.js';
import {
  NetSuiteAuthMissingError,
  NetSuiteTBAExpiredError,
  NetSuiteSavedSearchNotFoundError,
  NetSuiteSuiteQLError,
  NetSuiteNetworkError,
  NetSuiteVaultError,
} from './errors.js';

const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Tables that the standard integration role cannot read via SuiteQL REST API.
 * Seeded from live probe against account 603734 (2026-05-28).
 * Role returns HTTP 400 "Record X not found" — NetSuite's signal for insufficient permission.
 * These remain blocked until Brian grants View on each in Setup → Users/Roles → Manage Roles.
 * Source: docs/research/netsuite-current-state.md
 */
const KNOWN_BLOCKED_TABLES: ReadonlySet<string> = new Set([
  'account',
  'department',
  'classification',
  'employee',
  'accountingperiod',
]);

export class NetSuiteClient implements INetSuiteClient {
  readonly serviceId = 'netsuite' as const;

  /** True when no TBA credentials are present — every query returns null. */
  public degraded = false;

  private lastSuccessAt: Date | undefined;
  private lastError: string | undefined;

  /**
   * Per-table readability cache. Seeded with known-blocked tables as false.
   * Populated lazily on first probe of each table. Lives for client instance lifetime.
   * A false entry means "role lacks View permission for this table."
   */
  private readonly tableReadableCache = new Map<string, boolean>(
    [...KNOWN_BLOCKED_TABLES].map((t) => [t, false])
  );

  constructor(private readonly vault: SafeStorageVault) {}

  // ── McpClient contract ──────────────────────────────────────────────────────

  async isAuthenticated(): Promise<boolean> {
    return this.vault.hasValidCredential('netsuite');
  }

  async reconnect(): Promise<void> {
    // TBA credentials are issued out-of-band (NetSuite Setup → Access Tokens).
    // Seeding priority: env vars first (fresh tokens), then an existing vault entry.
    // Throws NetSuiteAuthMissingError only when neither source has all five fields.
    const envCred = readEnvTBACredentials();
    if (envCred) {
      await this.vault.storeCredential('netsuite', JSON.stringify(envCred), 'tba_token');
      this.degraded = false;
      this.lastError = undefined;
      return;
    }

    const hasCred = await this.vault.hasValidCredential('netsuite');
    if (!hasCred) {
      throw new NetSuiteAuthMissingError();
    }
    this.degraded = false;
    this.lastError = undefined;
  }

  async healthCheck(): Promise<McpHealth> {
    const ok = await this.isAuthenticated();
    return {
      ok: ok && !this.degraded,
      lastSuccessAt: this.lastSuccessAt,
      lastError: this.lastError,
      authMode: 'tba',
    };
  }

  // ── Per-table readability guard ─────────────────────────────────────────────

  /**
   * Returns true if the role can read the given SuiteQL table.
   *
   * Cold start: returns false immediately for the 5 known-blocked tables
   * (account/department/classification/employee/accountingperiod) without a
   * round-trip — these are blocked in the current integration role on account 603734.
   *
   * Unknown tables: probes once with a minimal FETCH NEXT 1 query and caches the result.
   * A 400 "Record not found" response → false (permission denied).
   * Any successful 2xx response → true.
   * Token-absent mode: always returns false.
   *
   * Playbooks must call this before any SuiteQL query that touches a gated table.
   * If false, emit a DegradationWarning (via buildDegradationWarning) into PlaybookResult
   * rather than crashing.
   */
  async isNetSuiteTableReadable(table: string): Promise<boolean> {
    const cached = this.tableReadableCache.get(table);
    if (cached !== undefined) return cached;

    // Token-absent: nothing is readable.
    const cred = await this.loadCredential();
    if (!cred) {
      this.tableReadableCache.set(table, false);
      return false;
    }

    const url = `https://${cred.accountId}.suitetalk.api.netsuite.com/services/rest/query/v1/suiteql`;
    const probe = `SELECT id FROM ${table} FETCH NEXT 1 ROWS ONLY`;
    const authHeader = buildTBAAuthHeader(cred, 'POST', url);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: authHeader.Authorization,
          'Content-Type': 'application/json',
          Prefer: 'transient',
        },
        body: JSON.stringify({ q: probe }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const readable = response.ok;
      this.tableReadableCache.set(table, readable);
      return readable;
    } catch {
      // Network error — don't cache; let the next call retry.
      return false;
    }
  }

  /**
   * Build a structured DegradationWarning for a blocked table.
   * Playbooks include this in PlaybookResult.degradationWarnings.
   */
  buildDegradationWarning(table: string, attemptedQuery?: string): DegradationWarning {
    return {
      table,
      reason: `NetSuite role lacks View permission on '${table}' — SuiteQL returns HTTP 400 "Record not found" (insufficient permission signal).`,
      remediation: `Ask your NetSuite admin to grant View on '${table}' in Setup → Users/Roles → Manage Roles → [role] → Permissions → Lists tab.`,
      ...(attemptedQuery !== undefined ? { attemptedQuery } : {}),
    };
  }

  // ── Query methods ───────────────────────────────────────────────────────────

  /**
   * Execute a SuiteQL query against the NetSuite REST API.
   * Token-absent mode: returns null and sets degraded = true.
   */
  async runSuiteQL(query: string): Promise<NetSuiteQueryResult | null> {
    const cred = await this.loadCredential();
    if (!cred) {
      this.degraded = true;
      this.lastError = 'No TBA credential — degraded mode (BLOCKERS B1)';
      return null;
    }

    const url = `https://${cred.accountId}.suitetalk.api.netsuite.com/services/rest/query/v1/suiteql`;
    const body = JSON.stringify({ q: query });

    const authHeader = buildTBAAuthHeader(cred, 'POST', url);

    const response = await this.apiFetch(url, authHeader.Authorization, {
      method: 'POST',
      body,
    });

    const raw = await response.json() as unknown;
    const parsed = NetSuiteQueryResultSchema.safeParse(raw);
    if (!parsed.success) {
      throw new NetSuiteSuiteQLError(
        'INVALID_RESPONSE',
        `SuiteQL response did not match expected shape: ${parsed.error.message}`
      );
    }

    this.lastSuccessAt = new Date();
    this.lastError = undefined;
    this.degraded = false;
    return parsed.data;
  }

  /**
   * Run a NetSuite Saved Search by ID.
   * Token-absent mode: returns null and sets degraded = true.
   */
  async runSavedSearch(id: string): Promise<NetSuiteQueryResult | null> {
    const cred = await this.loadCredential();
    if (!cred) {
      this.degraded = true;
      this.lastError = 'No TBA credential — degraded mode (BLOCKERS B1)';
      return null;
    }

    const url = `https://${cred.accountId}.suitetalk.api.netsuite.com/services/rest/record/v1/savedsearch/${encodeURIComponent(id)}/results`;
    const authHeader = buildTBAAuthHeader(cred, 'GET', url);

    const response = await this.apiFetch(url, authHeader.Authorization, {
      method: 'GET',
      allow404: true,
    });

    if (response.status === 404) {
      throw new NetSuiteSavedSearchNotFoundError(id);
    }

    const raw = await response.json() as unknown;
    const parsed = NetSuiteQueryResultSchema.safeParse(raw);
    if (!parsed.success) {
      throw new NetSuiteSuiteQLError(
        'INVALID_RESPONSE',
        `Saved Search response did not match expected shape: ${parsed.error.message}`
      );
    }

    this.lastSuccessAt = new Date();
    this.lastError = undefined;
    this.degraded = false;
    return parsed.data;
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  private async loadCredential() {
    let cred: { plaintext: string; metadata?: object } | null;
    try {
      cred = await this.vault.loadCredential('netsuite');
    } catch (err) {
      throw new NetSuiteVaultError('Failed to load NetSuite credential from vault', err);
    }

    if (!cred) return null;

    return parseTBACredentials(cred.plaintext);
  }

  private async apiFetch(
    url: string,
    authorization: string,
    options: { method: string; body?: string; allow404?: boolean },
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        method: options.method,
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json',
          Prefer: 'transient',
        },
        body: options.body,
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timer);
      if (err instanceof Error && err.name === 'AbortError') {
        this.lastError = 'Request timed out';
        throw new NetSuiteNetworkError(`NetSuite API request timed out: ${url}`);
      }
      this.lastError = String(err);
      throw new NetSuiteNetworkError(`Network error: ${String(err)}`, err);
    }
    clearTimeout(timer);

    if (response.status === 401) {
      this.lastError = 'TBA token expired (401)';
      // TBA tokens cannot be silently refreshed — Russell must re-paste from Brian.
      throw new NetSuiteTBAExpiredError();
    }

    // 404 returned as-is when allow404=true so the caller can throw the typed error.
    if (response.status === 404 && options.allow404) {
      return response;
    }

    if (!response.ok) {
      const text = await response.text();
      this.lastError = `HTTP ${response.status}`;

      // Attempt to parse NetSuite error body.
      try {
        const errObj = JSON.parse(text) as { title?: string; o_error?: { code: string; message: string } };
        const code = errObj?.o_error?.code ?? String(response.status);
        const msg = errObj?.o_error?.message ?? errObj?.title ?? text;
        throw new NetSuiteSuiteQLError(code, msg);
      } catch (parseErr) {
        if (parseErr instanceof NetSuiteSuiteQLError) throw parseErr;
      }

      throw new NetSuiteNetworkError(`HTTP ${response.status}: ${text}`);
    }

    return response;
  }
}

/**
 * Read the five TBA fields from the environment. Returns null unless all are present
 * and non-empty. The token-id/token-secret use the NETSUITE_TBA_ prefix to disambiguate
 * from the consumer key/secret (matches scripts/mcp-live-smoke.sh and .env.local).
 */
function readEnvTBACredentials(): TBACredentials | null {
  const accountId = process.env['NETSUITE_ACCOUNT_ID'];
  const consumerKey = process.env['NETSUITE_CONSUMER_KEY'];
  const consumerSecret = process.env['NETSUITE_CONSUMER_SECRET'];
  const tokenId = process.env['NETSUITE_TBA_TOKEN_ID'];
  const tokenSecret = process.env['NETSUITE_TBA_TOKEN_SECRET'];

  if (!accountId || !consumerKey || !consumerSecret || !tokenId || !tokenSecret) {
    return null;
  }

  return { accountId, consumerKey, consumerSecret, tokenId, tokenSecret };
}
