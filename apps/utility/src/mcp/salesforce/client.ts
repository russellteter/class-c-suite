// apps/utility/src/mcp/salesforce/client.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §4
//
// SalesforceClient — implements McpClient + typed query methods.
// Auto-refreshes access token on 401 using the stored refresh token.
// Never stores the access token on disk — only the refresh token via safeStorage.

import type {
  SalesforceClient as ISalesforceClient,
  McpHealth,
  SalesforceQueryResult,
  SalesforceDescribeResult,
  QueryExpectOptions,
} from '@c-suite/shared-types/mcp';
import { SalesforceQueryResultSchema, SCHEMA_DRIFT_ADVISORY_SF } from '@c-suite/shared-types/mcp';
import type { SafeStorageVault } from '../../credentials/safeStorageVault.js';
import { refreshAccessToken } from './oauth-flow.js';
import { getSfdxAuth, hasSfdxAuth, probeSfdxAuth } from './sfdx-auth.js';
import {
  SalesforceAuthExpiredError,
  SalesforceAuthRevokedError,
  SalesforceNetworkError,
  SalesforceQueryError,
  SalesforceVaultError,
} from './errors.js';

const SALESFORCE_API_VERSION = 'v59.0';
const REQUEST_TIMEOUT_MS = 30_000;

// ── Three-state auth probe ─────────────────────────────────────────────────────

/**
 * Three-state result for Salesforce auth health probes.
 *
 * connected_app_ok — vault has a valid OAuth refresh token (Connected App path).
 *   Runtime can call query() without any external dependency.
 *
 * sfdx_ok — no Connected App credential but SFDX CLI has a live session.
 *   Runtime works but depends on `sf` binary remaining on PATH + session not
 *   expiring. Renewal requires: sf org login web --instance-url https://classedu.my.salesforce.com
 *
 * neither — neither vault credential nor live SFDX session found.
 *   Authentication required before any query can run.
 */
export type SalesforceAuthProbe =
  | { state: 'connected_app_ok'; reason: string }
  | { state: 'sfdx_ok'; reason: string; sfdxUsername: string }
  | { state: 'neither'; reason: string; sfdxDetail: string };

export class SalesforceClient implements ISalesforceClient {
  readonly serviceId = 'salesforce' as const;

  private accessToken: string | null = null;
  private instanceUrl: string | null = null;
  private lastSuccessAt: Date | undefined;
  private lastError: string | undefined;
  private resolvedAuthMode: 'oauth' | 'sfdx' | null = null;

  constructor(private readonly vault: SafeStorageVault) {}

  // ── McpClient contract ──────────────────────────────────────────────────────

  /**
   * Authenticated if EITHER the vault has a Salesforce OAuth credential OR
   * the SFDX CLI has an authenticated session against any Salesforce org.
   * Vault path takes precedence (it's our own Connected App when configured);
   * SFDX is the fallback per Russell-decision 2026-05-28.
   */
  async isAuthenticated(): Promise<boolean> {
    if (await this.vault.hasValidCredential('salesforce')) return true;
    return hasSfdxAuth();
  }

  async reconnect(): Promise<void> {
    // If SFDX is the active auth mode, surface clear instructions instead of
    // running the C-Suite's own OAuth flow (we don't have the SFDX Connected
    // App's client_secret, so we can't refresh via the OAuth code path).
    if (this.resolvedAuthMode === 'sfdx') {
      throw new SalesforceAuthExpiredError(
        'SFDX session expired. Run: sf org login web --instance-url https://classedu.my.salesforce.com'
      );
    }
    // Vault/OAuth path: run the normal browser flow.
    const { runOAuthFlow } = await import('./oauth-flow.js');
    const tokenSet = await runOAuthFlow(this.vault);
    this.accessToken = tokenSet.accessToken;
    this.instanceUrl = tokenSet.instanceUrl;
    this.resolvedAuthMode = 'oauth';
  }

  async healthCheck(): Promise<McpHealth> {
    const probe = await this.probeAuth();
    const ok = probe.state === 'connected_app_ok' || probe.state === 'sfdx_ok';
    const authMode: 'oauth' | 'sfdx' = probe.state === 'connected_app_ok' ? 'oauth' : 'sfdx';
    return {
      ok,
      lastSuccessAt: this.lastSuccessAt,
      lastError: ok ? this.lastError : probe.reason,
      authMode,
    };
  }

  /**
   * Explicit three-state auth probe used by health-check tooling and smoke tests.
   * Does not modify client state. Safe to call from outside without side effects.
   *
   * Priority: Connected App vault credential > SFDX CLI session > neither.
   */
  async probeAuth(): Promise<SalesforceAuthProbe> {
    // 1. Connected App path (vault)
    const hasVaultCred = await this.vault.hasValidCredential('salesforce');
    if (hasVaultCred) {
      return {
        state: 'connected_app_ok',
        reason: 'Connected App refresh token present in safeStorage vault',
      };
    }

    // 2. SFDX CLI path
    const sfdxProbe = await probeSfdxAuth();
    if (sfdxProbe.state === 'ok') {
      return {
        state: 'sfdx_ok',
        reason: `SFDX session valid for ${sfdxProbe.session.username}`,
        sfdxUsername: sfdxProbe.session.username,
      };
    }

    // 3. Neither
    const sfdxDetail = sfdxProbe.state === 'no_cli'
      ? 'sf CLI not on PATH'
      : sfdxProbe.state === 'no_org'
        ? 'sf CLI installed but no default target-org'
        : sfdxProbe.state === 'session_expired'
          ? `SFDX session expired (${sfdxProbe.reason})`
          : `SFDX probe error: ${sfdxProbe.reason}`;

    return {
      state: 'neither',
      reason: 'No Connected App credential in vault and no valid SFDX session',
      sfdxDetail,
    };
  }

  // ── Query methods ───────────────────────────────────────────────────────────

  async query(soql: string, opts?: QueryExpectOptions): Promise<SalesforceQueryResult> {
    const result = await this.executeQuery(soql);
    if (opts?.expectRows && result.records.length === 0) {
      console.warn(
        '[SalesforceClient] schema-drift advisory: query returned 0 records with expectRows=true — ' +
        'possible renamed stage/field. SOQL:', soql
      );
      return { ...result, schemaDriftAdvisory: SCHEMA_DRIFT_ADVISORY_SF };
    }
    return result;
  }

  async queryAll(soql: string, opts?: QueryExpectOptions): Promise<SalesforceQueryResult> {
    // queryAll follows pagination until done = true.
    const first = await this.executeQuery(soql);
    const allRecords = [...first.records];

    let current = first;
    while (!current.done && current.nextRecordsUrl) {
      const next = await this.fetchNextPage(current.nextRecordsUrl);
      allRecords.push(...next.records);
      current = next;
    }

    const assembled: SalesforceQueryResult = { ...first, records: allRecords, done: true };
    if (opts?.expectRows && allRecords.length === 0) {
      console.warn(
        '[SalesforceClient] schema-drift advisory: queryAll returned 0 records with expectRows=true — ' +
        'possible renamed stage/field. SOQL:', soql
      );
      return { ...assembled, schemaDriftAdvisory: SCHEMA_DRIFT_ADVISORY_SF };
    }
    return assembled;
  }

  async describeObject(name: string): Promise<SalesforceDescribeResult> {
    const { accessToken, instanceUrl } = await this.ensureAccessToken();
    const url = `${instanceUrl}/services/data/${SALESFORCE_API_VERSION}/sobjects/${encodeURIComponent(name)}/describe`;
    const response = await this.apiFetch(url, accessToken);
    const data = await response.json() as {
      name: string;
      fields: Array<{ name: string; type: string; label: string; nillable: boolean }>;
    };
    return { name: data.name, fields: data.fields };
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  private async executeQuery(soql: string): Promise<SalesforceQueryResult> {
    const { accessToken, instanceUrl } = await this.ensureAccessToken();
    const encodedSoql = encodeURIComponent(soql);
    const url = `${instanceUrl}/services/data/${SALESFORCE_API_VERSION}/query?q=${encodedSoql}`;
    const response = await this.apiFetch(url, accessToken);
    const raw = await response.json() as unknown;

    const parsed = SalesforceQueryResultSchema.safeParse(raw);
    if (!parsed.success) {
      throw new SalesforceQueryError(
        'INVALID_RESPONSE',
        `Response from /query did not match expected shape: ${parsed.error.message}`
      );
    }

    this.lastSuccessAt = new Date();
    this.lastError = undefined;
    return parsed.data;
  }

  private async fetchNextPage(nextRecordsUrl: string): Promise<SalesforceQueryResult> {
    const { accessToken, instanceUrl } = await this.ensureAccessToken();
    const url = nextRecordsUrl.startsWith('http') ? nextRecordsUrl : `${instanceUrl}${nextRecordsUrl}`;
    const response = await this.apiFetch(url, accessToken);
    const raw = await response.json() as unknown;
    const parsed = SalesforceQueryResultSchema.safeParse(raw);
    if (!parsed.success) {
      throw new SalesforceQueryError('INVALID_RESPONSE', 'Paginated response shape invalid');
    }
    return parsed.data;
  }

  /**
   * Execute a fetch with timeout + 401 auto-refresh.
   * On 401: attempts one token refresh, then retries.
   * On second 401: throws SalesforceAuthRevokedError.
   */
  private async apiFetch(url: string, accessToken: string, retry = false): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timer);
      if (err instanceof Error && err.name === 'AbortError') {
        this.lastError = 'Request timed out';
        throw new SalesforceNetworkError(`Salesforce API request timed out: ${url}`);
      }
      this.lastError = String(err);
      throw new SalesforceNetworkError(`Network error: ${String(err)}`, err);
    }
    clearTimeout(timer);

    if (response.status === 401) {
      if (retry) {
        this.lastError = 'Auth revoked after refresh attempt';
        throw new SalesforceAuthRevokedError();
      }
      // Attempt token refresh.
      const { accessToken: newToken } = await this.refreshToken();
      return this.apiFetch(url, newToken, true);
    }

    if (!response.ok) {
      const text = await response.text();
      this.lastError = `HTTP ${response.status}`;

      // Parse Salesforce error body (array of { errorCode, message } objects).
      try {
        const errors = JSON.parse(text) as Array<{ errorCode: string; message: string }>;
        if (Array.isArray(errors) && errors[0]) {
          throw new SalesforceQueryError(errors[0].errorCode, errors[0].message);
        }
      } catch (parseErr) {
        if (parseErr instanceof SalesforceQueryError) throw parseErr;
      }

      throw new SalesforceNetworkError(`HTTP ${response.status}: ${text}`);
    }

    return response;
  }

  private async ensureAccessToken(): Promise<{ accessToken: string; instanceUrl: string }> {
    if (this.accessToken && this.instanceUrl) {
      return { accessToken: this.accessToken, instanceUrl: this.instanceUrl };
    }
    return this.refreshToken();
  }

  private async refreshToken(): Promise<{ accessToken: string; instanceUrl: string }> {
    // Try vault (own Connected App) first; fall back to SFDX CLI per Russell-decision 2026-05-28.
    let cred: { plaintext: string; metadata?: object } | null;
    try {
      cred = await this.vault.loadCredential('salesforce');
    } catch (err) {
      throw new SalesforceVaultError('Failed to load Salesforce credential from vault', err);
    }

    if (cred) {
      const tokens = await refreshAccessToken(cred.plaintext);
      this.accessToken = tokens.accessToken;
      this.instanceUrl =
        (cred.metadata as { instanceUrl?: string } | undefined)?.instanceUrl ??
        tokens.instanceUrl;
      this.resolvedAuthMode = 'oauth';
      return { accessToken: this.accessToken, instanceUrl: this.instanceUrl };
    }

    // SFDX fallback — read fresh access token from `sf org display`.
    const sfdx = await getSfdxAuth();
    if (sfdx) {
      this.accessToken = sfdx.accessToken;
      this.instanceUrl = sfdx.instanceUrl;
      this.resolvedAuthMode = 'sfdx';
      return { accessToken: this.accessToken, instanceUrl: this.instanceUrl };
    }

    throw new SalesforceAuthExpiredError(
      'No Salesforce credential: vault is empty AND no SFDX session found. ' +
        'Run: sf org login web --instance-url https://classedu.my.salesforce.com'
    );
  }
}
