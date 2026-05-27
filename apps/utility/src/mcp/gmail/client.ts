// apps/utility/src/mcp/gmail/client.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §7
//
// GmailClient — implements McpClient + typed query methods.
// Auto-refreshes access token on 401 using the stored refresh token.
// Never stores the access token on disk — only the refresh token via safeStorage.
// Read-only scope only: https://www.googleapis.com/auth/gmail.readonly

import type {
  GmailClient as IGmailClient,
  McpHealth,
  GmailThreadList,
  GmailThread,
  GmailMessage,
} from '@c-suite/shared-types/mcp';
import type { SafeStorageVault } from '../../credentials/safeStorageVault.js';
import { refreshAccessToken } from './oauth-flow.js';
import {
  GmailAuthExpiredError,
  GmailAuthRevokedError,
  GmailNetworkError,
  GmailThreadNotFoundError,
  GmailRateLimitedError,
  GmailVaultError,
} from './errors.js';

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
const REQUEST_TIMEOUT_MS = 30_000;

export class GmailClient implements IGmailClient {
  readonly serviceId = 'gmail' as const;

  private accessToken: string | null = null;
  private lastSuccessAt: Date | undefined;
  private lastError: string | undefined;

  constructor(private readonly vault: SafeStorageVault) {}

  // ── McpClient contract ──────────────────────────────────────────────────────

  async isAuthenticated(): Promise<boolean> {
    return this.vault.hasValidCredential('gmail');
  }

  async reconnect(): Promise<void> {
    // Triggers OAuth re-authentication via the oauth-flow module.
    // Import lazily to avoid circular dep; oauth-flow imports vault types only.
    const { runOAuthFlow } = await import('./oauth-flow.js');
    const tokenSet = await runOAuthFlow(this.vault);
    this.accessToken = tokenSet.accessToken;
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

  // ── GmailClient contract ────────────────────────────────────────────────────

  async searchThreads(
    query: string,
    options: { maxResults?: number } = {},
  ): Promise<GmailThreadList> {
    const accessToken = await this.ensureAccessToken();
    const params = new URLSearchParams({ q: query });
    if (options.maxResults != null) {
      params.set('maxResults', String(options.maxResults));
    }
    const url = `${GMAIL_API_BASE}/threads?${params.toString()}`;
    const response = await this.apiFetch(url, accessToken);
    const data = await response.json() as {
      threads?: Array<{ id: string; snippet: string }>;
      resultSizeEstimate?: number;
    };
    this.lastSuccessAt = new Date();
    this.lastError = undefined;
    return {
      threads: data.threads ?? [],
      resultSizeEstimate: data.resultSizeEstimate ?? 0,
    };
  }

  async getThread(id: string): Promise<GmailThread> {
    const accessToken = await this.ensureAccessToken();
    const url = `${GMAIL_API_BASE}/threads/${encodeURIComponent(id)}`;
    const response = await this.apiFetch(url, accessToken);
    const data = await response.json() as {
      id: string;
      messages?: Array<{
        id: string;
        threadId: string;
        payload?: {
          headers?: Array<{ name: string; value: string }>;
          body?: { data?: string };
          parts?: Array<{ mimeType: string; body?: { data?: string } }>;
        };
        snippet?: string;
      }>;
    };
    this.lastSuccessAt = new Date();
    this.lastError = undefined;
    return {
      id: data.id,
      messages: (data.messages ?? []).map(m => this.parseMessage(m)),
    };
  }

  async getMessage(id: string): Promise<GmailMessage> {
    const accessToken = await this.ensureAccessToken();
    const url = `${GMAIL_API_BASE}/messages/${encodeURIComponent(id)}`;
    const response = await this.apiFetch(url, accessToken);
    const data = await response.json() as {
      id: string;
      threadId: string;
      payload?: {
        headers?: Array<{ name: string; value: string }>;
        body?: { data?: string };
        parts?: Array<{ mimeType: string; body?: { data?: string } }>;
      };
      snippet?: string;
    };
    this.lastSuccessAt = new Date();
    this.lastError = undefined;
    return this.parseMessage(data);
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  /**
   * Parse a raw Gmail message payload into GmailMessage.
   * snippet is used for body — never log full body contents in production.
   */
  private parseMessage(raw: {
    id: string;
    threadId: string;
    payload?: {
      headers?: Array<{ name: string; value: string }>;
      body?: { data?: string };
    };
    snippet?: string;
  }): GmailMessage {
    const headers = raw.payload?.headers ?? [];
    const header = (name: string): string | undefined =>
      headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value;

    return {
      id: raw.id,
      threadId: raw.threadId,
      subject: header('Subject'),
      from: header('From'),
      to: header('To'),
      date: header('Date'),
      snippet: raw.snippet,
      // body not populated — read-only scope + no sensitive data in logs
    };
  }

  /**
   * Execute a fetch with timeout + 401 auto-refresh.
   * On 401: attempts one token refresh, then retries.
   * On second 401: throws GmailAuthRevokedError.
   * On 404: throws GmailThreadNotFoundError.
   * On 429: throws GmailRateLimitedError.
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
        throw new GmailNetworkError(`Gmail API request timed out: ${url}`);
      }
      this.lastError = String(err);
      throw new GmailNetworkError(`Network error: ${String(err)}`, err);
    }
    clearTimeout(timer);

    if (response.status === 401) {
      if (retry) {
        this.lastError = 'Auth revoked after refresh attempt';
        throw new GmailAuthRevokedError();
      }
      // Attempt token refresh.
      const newToken = await this.refreshToken();
      return this.apiFetch(url, newToken, true);
    }

    if (response.status === 404) {
      // Extract thread/message ID from URL for error message.
      const segments = url.split('/');
      const resourceId = segments[segments.length - 1] ?? 'unknown';
      throw new GmailThreadNotFoundError(resourceId);
    }

    if (response.status === 429) {
      this.lastError = 'Rate limited';
      throw new GmailRateLimitedError();
    }

    if (!response.ok) {
      const text = await response.text();
      this.lastError = `HTTP ${response.status}`;
      throw new GmailNetworkError(`HTTP ${response.status}: ${text}`);
    }

    return response;
  }

  private async ensureAccessToken(): Promise<string> {
    if (this.accessToken) {
      return this.accessToken;
    }
    return this.refreshToken();
  }

  private async refreshToken(): Promise<string> {
    let cred: { plaintext: string; metadata?: object } | null;
    try {
      cred = await this.vault.loadCredential('gmail');
    } catch (err) {
      throw new GmailVaultError('Failed to load Gmail credential from vault', err);
    }

    if (!cred) {
      throw new GmailAuthExpiredError(
        'No Gmail credential in vault — run reconnect() to authenticate'
      );
    }

    const tokens = await refreshAccessToken(cred.plaintext);
    this.accessToken = tokens.accessToken;
    return this.accessToken;
  }
}
