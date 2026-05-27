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
} from '@c-suite/shared-types/mcp';
import { SalesforceQueryResultSchema } from '@c-suite/shared-types/mcp';
import type { SafeStorageVault } from '../../credentials/safeStorageVault.js';
import { refreshAccessToken } from './oauth-flow.js';
import {
  SalesforceAuthExpiredError,
  SalesforceAuthRevokedError,
  SalesforceNetworkError,
  SalesforceQueryError,
  SalesforceVaultError,
} from './errors.js';

const SALESFORCE_API_VERSION = 'v59.0';
const REQUEST_TIMEOUT_MS = 30_000;

export class SalesforceClient implements ISalesforceClient {
  readonly serviceId = 'salesforce' as const;

  private accessToken: string | null = null;
  private instanceUrl: string | null = null;
  private lastSuccessAt: Date | undefined;
  private lastError: string | undefined;

  constructor(private readonly vault: SafeStorageVault) {}

  // ── McpClient contract ──────────────────────────────────────────────────────

  async isAuthenticated(): Promise<boolean> {
    return this.vault.hasValidCredential('salesforce');
  }

  async reconnect(): Promise<void> {
    // Triggers OAuth re-authentication via the oauth-flow module.
    // Import lazily to avoid circular dep; oauth-flow imports vault types only.
    const { runOAuthFlow } = await import('./oauth-flow.js');
    const tokenSet = await runOAuthFlow(this.vault);
    this.accessToken = tokenSet.accessToken;
    this.instanceUrl = tokenSet.instanceUrl;
  }

  async healthCheck(): Promise<McpHealth> {
    const ok = await this.isAuthenticated();
    return {
      ok,
      lastSuccessAt: this.lastSuccessAt,
      lastError: this.lastError,
      authMode: 'oauth',
    };
  }

  // ── Query methods ───────────────────────────────────────────────────────────

  async query(soql: string): Promise<SalesforceQueryResult> {
    return this.executeQuery(soql);
  }

  async queryAll(soql: string): Promise<SalesforceQueryResult> {
    // queryAll follows pagination until done = true.
    const first = await this.executeQuery(soql);
    const allRecords = [...first.records];

    let current = first;
    while (!current.done && current.nextRecordsUrl) {
      const next = await this.fetchNextPage(current.nextRecordsUrl);
      allRecords.push(...next.records);
      current = next;
    }

    return { ...first, records: allRecords, done: true };
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
    let cred: { plaintext: string; metadata?: object } | null;
    try {
      cred = await this.vault.loadCredential('salesforce');
    } catch (err) {
      throw new SalesforceVaultError('Failed to load Salesforce credential from vault', err);
    }

    if (!cred) {
      throw new SalesforceAuthExpiredError(
        'No Salesforce credential in vault — run reconnect() to authenticate'
      );
    }

    const tokens = await refreshAccessToken(cred.plaintext);
    this.accessToken = tokens.accessToken;
    this.instanceUrl =
      (cred.metadata as { instanceUrl?: string } | undefined)?.instanceUrl ??
      tokens.instanceUrl;
    return { accessToken: this.accessToken, instanceUrl: this.instanceUrl };
  }
}
