// apps/utility/src/mcp/netsuite/client.ts
// Source: docs/decisions/0015-netsuite-oauth-migration.md §2
//
// NetSuiteClient — implements McpClient.
// Auth: OAuth 2.0 authorization-code grant with PKCE, PUBLIC CLIENT (no secret).
//   The access token is a Bearer token on the MCP session. Tokens are issued via
//   the shared OAuth primitives (apps/utility/src/mcp/oauth/) and persisted in
//   Electron safeStorage via OAuthTokenStore. Access tokens auto-refresh ~5 min
//   before expiry; the refresh token is long-lived.
//
// Data path: the hosted NetSuite AI Connector Service (remote MCP server, streamable
//   HTTP) — NOT the REST SuiteQL endpoint. SuiteQL runs through the MCP Standard Tools
//   `ns_runCustomSuiteQL` tool; saved searches through `ns_runSavedSearch`. Scope `mcp`
//   does NOT grant REST SuiteQL, so all data access goes through MCP tool calls.
//   OAuth runs under Russell's user role (MCP Server Connection + "Log in using OAuth
//   2.0 Access Tokens"), so the five tables the TBA integration role could not read
//   should now read clean.
//
// CRITICAL: degraded-mode safety net is RETAINED as a runtime fallback —
//   credential-absent: every query returns null + sets degraded = true (never throws).

import type {
  NetSuiteClient as INetSuiteClient,
  McpHealth,
  NetSuiteQueryResult,
} from '@c-suite/shared-types/mcp';
import { NetSuiteQueryResultSchema } from '@c-suite/shared-types/mcp';
import type { DegradationWarning } from '@c-suite/shared-types/playbook';
import type { SafeStorageVault } from '../../credentials/safeStorageVault.js';
import { OAuthTokenStore } from '../oauth/tokenStore.js';
import { runAuthorizationCodeFlow } from '../oauth/authCodeFlow.js';
import {
  readNetSuiteOAuthEnv,
  buildNetSuiteOAuthConfig,
  requireNetSuiteOAuthConfig,
  defaultNetsuiteMcpServerUrl,
} from './oauth-config.js';
import { callNetSuiteTool, TOOL_SUITEQL, TOOL_SAVED_SEARCH, type McpToolResult } from './mcp-transport.js';
import {
  NetSuiteAuthMissingError,
  NetSuiteAuthExpiredError,
  NetSuiteSavedSearchNotFoundError,
  NetSuiteSuiteQLError,
  NetSuiteNetworkError,
  NetSuiteVaultError,
} from './errors.js';

// Re-export tool names from mcp-transport for callers that import them from the client.
export { TOOL_SUITEQL, TOOL_SAVED_SEARCH };

/**
 * Injectable tool invoker — production calls the hosted MCP server; tests inject a fake.
 * Returns the raw MCP tool result (content blocks).
 */
export type NetSuiteToolInvoker = (
  toolName: string,
  args: Record<string, unknown>,
) => Promise<McpToolResult>;

export class NetSuiteClient implements INetSuiteClient {
  readonly serviceId = 'netsuite' as const;

  /** True when no OAuth credential is present — every query returns null. */
  public degraded = false;

  private lastSuccessAt: Date | undefined;
  private lastError: string | undefined;

  private readonly tokenStore: OAuthTokenStore;
  private readonly accountId: string | undefined;
  private readonly mcpServerUrl: string | undefined;
  private readonly invokeTool: NetSuiteToolInvoker;

  /**
   * Per-table readability cache, populated lazily. Empty at cold start: under OAuth
   * (Russell's user role) all tables are expected readable, so nothing is pre-poisoned.
   */
  private readonly tableReadableCache = new Map<string, boolean>();

  /**
   * @param vault credential store
   * @param toolInvoker optional injected MCP tool invoker (tests). Defaults to the
   *   hosted-server invoker which opens a session with the current Bearer token.
   */
  constructor(
    private readonly vault: SafeStorageVault,
    toolInvoker?: NetSuiteToolInvoker,
  ) {
    const env = readNetSuiteOAuthEnv();
    this.accountId = env?.accountId ?? process.env['NETSUITE_ACCOUNT_ID'];
    this.mcpServerUrl =
      env?.mcpServerUrl ??
      (this.accountId ? defaultNetsuiteMcpServerUrl(this.accountId) : undefined);

    const config = env
      ? buildNetSuiteOAuthConfig(env)
      : { serviceLabel: 'NetSuite', authorizeEndpoint: '', tokenEndpoint: '', clientId: '', scope: 'mcp' };
    this.tokenStore = new OAuthTokenStore(vault, 'netsuite', config);

    this.invokeTool =
      toolInvoker ??
      (async (toolName, args) => {
        const accessToken = await this.tokenStore.getAccessToken();
        if (!this.mcpServerUrl) throw new NetSuiteNetworkError('NETSUITE_MCP_SERVER_URL not configured');
        return callNetSuiteTool(this.mcpServerUrl, accessToken, toolName, args);
      });
  }

  // ── McpClient contract ──────────────────────────────────────────────────────

  async isAuthenticated(): Promise<boolean> {
    return this.vault.hasValidCredential('netsuite');
  }

  /**
   * Run the OAuth 2.0 authorization-code-with-PKCE flow (public client): open the
   * browser to the NetSuite authorize URL, capture the loopback redirect (fixed port
   * 8765), exchange the code for tokens, and persist them.
   * Throws NetSuiteOAuthAppMissingError when NETSUITE_OAUTH_CLIENT_ID is absent.
   */
  async reconnect(): Promise<void> {
    const config = requireNetSuiteOAuthConfig();
    const tokenSet = await runAuthorizationCodeFlow(config);
    await this.tokenStore.persistTokenSet(tokenSet);
    this.degraded = false;
    this.lastError = undefined;
  }

  async healthCheck(): Promise<McpHealth> {
    const ok = await this.isAuthenticated();
    return {
      ok: ok && !this.degraded,
      lastSuccessAt: this.lastSuccessAt,
      lastError: this.lastError,
      authMode: 'oauth',
    };
  }

  // ── Per-table readability guard ─────────────────────────────────────────────

  /**
   * Returns true if the role can read the given SuiteQL table.
   * Under OAuth (Russell's user role) all tables are expected readable — NO cold-start
   * deny-list. Each unknown table is probed once via ns_runCustomSuiteQL and cached.
   * A tool error / permission-denied → false. Credential-absent mode → false.
   */
  async isNetSuiteTableReadable(table: string): Promise<boolean> {
    const cached = this.tableReadableCache.get(table);
    if (cached !== undefined) return cached;

    if (!(await this.hasCredential())) {
      this.tableReadableCache.set(table, false);
      return false;
    }

    const probe = `SELECT id FROM ${table} FETCH NEXT 1 ROWS ONLY`;
    try {
      const result = await this.invokeTool(TOOL_SUITEQL, { query: probe });
      const readable = result.isError !== true;
      this.tableReadableCache.set(table, readable);
      return readable;
    } catch {
      // Tool/network error — don't cache; let the next call retry.
      return false;
    }
  }

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
   * Execute a SuiteQL query via the ns_runCustomSuiteQL MCP tool.
   * Credential-absent mode: returns null and sets degraded = true (never throws).
   */
  async runSuiteQL(query: string): Promise<NetSuiteQueryResult | null> {
    if (!(await this.hasCredential())) {
      this.degraded = true;
      this.lastError = 'No NetSuite OAuth credential — degraded mode';
      return null;
    }

    let result: McpToolResult;
    try {
      result = await this.invokeTool(TOOL_SUITEQL, { query });
    } catch (err) {
      throw this.mapToolError(err);
    }

    const parsed = this.parseToolResult(result, 'SuiteQL');
    this.lastSuccessAt = new Date();
    this.lastError = undefined;
    this.degraded = false;
    return parsed;
  }

  /**
   * Run a NetSuite Saved Search via the ns_runSavedSearch MCP tool.
   * Credential-absent mode: returns null and sets degraded = true (never throws).
   */
  async runSavedSearch(id: string): Promise<NetSuiteQueryResult | null> {
    if (!(await this.hasCredential())) {
      this.degraded = true;
      this.lastError = 'No NetSuite OAuth credential — degraded mode';
      return null;
    }

    let result: McpToolResult;
    try {
      result = await this.invokeTool(TOOL_SAVED_SEARCH, { savedSearchId: id });
    } catch (err) {
      throw this.mapToolError(err);
    }

    if (result.isError) {
      // The standard tool reports a missing/inaccessible saved search as a tool error.
      throw new NetSuiteSavedSearchNotFoundError(id);
    }

    const parsed = this.parseToolResult(result, 'Saved Search');
    this.lastSuccessAt = new Date();
    this.lastError = undefined;
    this.degraded = false;
    return parsed;
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  /** True when a refresh token is stored. Vault failures surface as NetSuiteVaultError. */
  private async hasCredential(): Promise<boolean> {
    try {
      return await this.tokenStore.hasRefreshToken();
    } catch (err) {
      throw new NetSuiteVaultError('Failed to load NetSuite credential from vault', err);
    }
  }

  /**
   * Parse an MCP tool result into NetSuiteQueryResult.
   * The MCP Standard Tools SuiteQL tool returns its payload as a text content block
   * containing JSON. We accept either { items, count, hasMore } directly or an
   * { items: [...] } shape and normalize.
   */
  private parseToolResult(result: McpToolResult, label: string): NetSuiteQueryResult {
    if (result.isError) {
      const msg = result.content?.map((c) => c.text ?? '').join(' ').trim() || 'tool error';
      throw new NetSuiteSuiteQLError('TOOL_ERROR', `${label} tool error: ${msg}`);
    }

    const textBlock = result.content?.find((c) => c.type === 'text' && typeof c.text === 'string');
    if (!textBlock?.text) {
      throw new NetSuiteSuiteQLError('INVALID_RESPONSE', `${label} tool returned no text content`);
    }

    let raw: unknown;
    try {
      raw = JSON.parse(textBlock.text);
    } catch {
      throw new NetSuiteSuiteQLError('INVALID_RESPONSE', `${label} tool content was not valid JSON`);
    }

    // Normalize to the wire shape if the tool returns a bare items array or omits count/hasMore.
    const candidate =
      raw && typeof raw === 'object' && 'items' in (raw as object)
        ? {
            items: (raw as { items: unknown[] }).items ?? [],
            count: (raw as { count?: number }).count ?? (raw as { items: unknown[] }).items?.length ?? 0,
            hasMore: (raw as { hasMore?: boolean }).hasMore ?? false,
          }
        : raw;

    const parsed = NetSuiteQueryResultSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new NetSuiteSuiteQLError(
        'INVALID_RESPONSE',
        `${label} response did not match expected shape: ${parsed.error.message}`,
      );
    }
    return parsed.data;
  }

  /** Map transport/auth errors to typed NetSuite errors. */
  private mapToolError(err: unknown): Error {
    const msg = err instanceof Error ? err.message : String(err);
    if (/401|unauthor|invalid_grant|token/i.test(msg)) {
      this.lastError = 'OAuth token rejected';
      return new NetSuiteAuthExpiredError();
    }
    this.lastError = msg;
    return new NetSuiteNetworkError(`NetSuite MCP tool call failed: ${msg}`, err);
  }
}

// Re-export so callers that imported the missing-credential error keep working.
export { NetSuiteAuthMissingError };
