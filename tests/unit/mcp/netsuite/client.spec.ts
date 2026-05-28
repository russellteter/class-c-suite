// tests/unit/mcp/netsuite/client.spec.ts
// Tests for NetSuiteClient under OAuth 2.0 + hosted MCP server (NetSuite AI Connector).
// credential-present (mocked vault token + injected MCP tool invoker) +
// credential-absent (degraded). Critical: credential-absent mode returns null +
// degraded=true on every query method and never throws.
//
// Auth model: the client reads a JSON OAuth blob from the vault
// ({ refreshToken, accessToken, accessTokenExpiresAt }) via OAuthTokenStore.
// Data path: MCP Standard Tools (ns_runCustomSuiteQL / ns_runSavedSearch) invoked
// through an injectable NetSuiteToolInvoker — tests inject a fake.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  NetSuiteClient,
  TOOL_SUITEQL,
  TOOL_SAVED_SEARCH,
  type NetSuiteToolInvoker,
} from '../../../../apps/utility/src/mcp/netsuite/client.js';
import {
  NetSuiteAuthExpiredError,
  NetSuiteOAuthAppMissingError,
  NetSuiteNetworkError,
  NetSuiteSuiteQLError,
  NetSuiteSavedSearchNotFoundError,
} from '../../../../apps/utility/src/mcp/netsuite/errors.js';
import type { McpToolResult } from '../../../../apps/utility/src/mcp/netsuite/mcp-transport.js';
import type { SafeStorageVault } from '../../../../apps/utility/src/credentials/safeStorageVault.js';

const NETSUITE_ENV_KEYS = [
  'NETSUITE_ACCOUNT_ID',
  'NETSUITE_OAUTH_CLIENT_ID',
  'NETSUITE_OAUTH_REDIRECT_URI',
  'NETSUITE_MCP_SERVER_URL',
];

beforeEach(() => {
  for (const k of NETSUITE_ENV_KEYS) delete process.env[k];
  process.env['NETSUITE_ACCOUNT_ID'] = '603734';
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const k of NETSUITE_ENV_KEYS) delete process.env[k];
});

// ── Fakes ──────────────────────────────────────────────────────────────────────

const FUTURE = Date.now() + 60 * 60 * 1000;
const FRESH_OAUTH_BLOB = JSON.stringify({
  refreshToken: 'fake-refresh-token',
  accessToken: 'fake-access-token',
  accessTokenExpiresAt: FUTURE,
  scope: 'mcp',
});

function makeVault(opts: { hasCredential?: boolean } = {}): SafeStorageVault {
  const has = opts.hasCredential !== false;
  return {
    hasValidCredential: vi.fn().mockResolvedValue(has),
    loadCredential: vi.fn().mockResolvedValue(
      has ? { plaintext: FRESH_OAUTH_BLOB, type: 'oauth_refresh_token' as const } : null,
    ),
    storeCredential: vi.fn().mockResolvedValue(undefined),
    deleteCredential: vi.fn().mockResolvedValue(undefined),
  } as unknown as SafeStorageVault;
}

const GOOD_QUERY_RESULT = { items: [{ id: 1 }, { id: 2 }], count: 2, hasMore: false };

/** A tool invoker that returns the given JSON payload as a text content block. */
function jsonInvoker(payload: unknown): NetSuiteToolInvoker {
  return vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify(payload) }],
  } satisfies McpToolResult);
}

function errorInvoker(message: string): NetSuiteToolInvoker {
  return vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: message }],
    isError: true,
  } satisfies McpToolResult);
}

// ── credential-absent mode (degraded) ─────────────────────────────────────────

describe('NetSuiteClient — credential-absent mode', () => {
  it('runSuiteQL returns null when no credential present', async () => {
    const client = new NetSuiteClient(makeVault({ hasCredential: false }), jsonInvoker(GOOD_QUERY_RESULT));
    expect(await client.runSuiteQL('SELECT 1 FROM transaction')).toBeNull();
  });

  it('sets degraded=true when no credential present (runSuiteQL)', async () => {
    const client = new NetSuiteClient(makeVault({ hasCredential: false }), jsonInvoker(GOOD_QUERY_RESULT));
    await client.runSuiteQL('SELECT 1 FROM transaction');
    expect(client.degraded).toBe(true);
  });

  it('runSavedSearch returns null when no credential present', async () => {
    const client = new NetSuiteClient(makeVault({ hasCredential: false }), jsonInvoker(GOOD_QUERY_RESULT));
    expect(await client.runSavedSearch('customsearch123')).toBeNull();
  });

  it('sets degraded=true when no credential present (runSavedSearch)', async () => {
    const client = new NetSuiteClient(makeVault({ hasCredential: false }), jsonInvoker(GOOD_QUERY_RESULT));
    await client.runSavedSearch('customsearch123');
    expect(client.degraded).toBe(true);
  });

  it('does NOT invoke the MCP tool in credential-absent mode', async () => {
    const invoker = jsonInvoker(GOOD_QUERY_RESULT);
    const client = new NetSuiteClient(makeVault({ hasCredential: false }), invoker);
    await client.runSuiteQL('SELECT 1 FROM transaction');
    expect(invoker).not.toHaveBeenCalled();
  });

  it('isAuthenticated returns false when no credential', async () => {
    const client = new NetSuiteClient(makeVault({ hasCredential: false }), jsonInvoker(GOOD_QUERY_RESULT));
    await expect(client.isAuthenticated()).resolves.toBe(false);
  });

  it('healthCheck returns ok=false + authMode=oauth in credential-absent mode', async () => {
    const client = new NetSuiteClient(makeVault({ hasCredential: false }), jsonInvoker(GOOD_QUERY_RESULT));
    await client.runSuiteQL('SELECT 1 FROM transaction');
    const health = await client.healthCheck();
    expect(health.ok).toBe(false);
    expect(health.authMode).toBe('oauth');
  });

  it('degraded starts false and becomes true only after a null-result query', async () => {
    const client = new NetSuiteClient(makeVault({ hasCredential: false }), jsonInvoker(GOOD_QUERY_RESULT));
    expect(client.degraded).toBe(false);
    await client.runSuiteQL('SELECT 1 FROM transaction');
    expect(client.degraded).toBe(true);
  });

  it('reconnect throws NetSuiteOAuthAppMissingError when client id absent', async () => {
    const client = new NetSuiteClient(makeVault({ hasCredential: false }), jsonInvoker(GOOD_QUERY_RESULT));
    await expect(client.reconnect()).rejects.toThrow(NetSuiteOAuthAppMissingError);
  });
});

// ── credential-present mode (happy path via MCP tools) ─────────────────────────

describe('NetSuiteClient — credential-present mode', () => {
  it('returns serviceId = netsuite', () => {
    const client = new NetSuiteClient(makeVault(), jsonInvoker(GOOD_QUERY_RESULT));
    expect(client.serviceId).toBe('netsuite');
  });

  it('isAuthenticated returns true when credential present', async () => {
    const client = new NetSuiteClient(makeVault({ hasCredential: true }), jsonInvoker(GOOD_QUERY_RESULT));
    await expect(client.isAuthenticated()).resolves.toBe(true);
  });

  it('healthCheck returns ok=true + authMode=oauth when authenticated', async () => {
    const client = new NetSuiteClient(makeVault({ hasCredential: true }), jsonInvoker(GOOD_QUERY_RESULT));
    const health = await client.healthCheck();
    expect(health.ok).toBe(true);
    expect(health.authMode).toBe('oauth');
  });

  it('runSuiteQL invokes ns_runCustomSuiteQL and returns the parsed result', async () => {
    const invoker = jsonInvoker(GOOD_QUERY_RESULT);
    const client = new NetSuiteClient(makeVault(), invoker);
    const result = await client.runSuiteQL('SELECT id FROM transaction FETCH NEXT 10 ROWS ONLY');
    expect(result).not.toBeNull();
    expect(result!.count).toBe(2);
    expect(result!.items).toHaveLength(2);
    expect(invoker).toHaveBeenCalledWith(TOOL_SUITEQL, { query: 'SELECT id FROM transaction FETCH NEXT 10 ROWS ONLY' });
  });

  it('runSuiteQL normalizes a bare-items tool payload (no count/hasMore)', async () => {
    const client = new NetSuiteClient(makeVault(), jsonInvoker({ items: [{ id: 7 }] }));
    const result = await client.runSuiteQL('SELECT id FROM account');
    expect(result!.count).toBe(1);
    expect(result!.hasMore).toBe(false);
  });

  it('runSuiteQL clears degraded flag on success', async () => {
    const client = new NetSuiteClient(makeVault(), jsonInvoker(GOOD_QUERY_RESULT));
    (client as unknown as { degraded: boolean }).degraded = true;
    await client.runSuiteQL('SELECT 1 FROM account');
    expect(client.degraded).toBe(false);
  });

  it('runSavedSearch invokes ns_runSavedSearch and returns the parsed result', async () => {
    const invoker = jsonInvoker(GOOD_QUERY_RESULT);
    const client = new NetSuiteClient(makeVault(), invoker);
    const result = await client.runSavedSearch('customsearch_cash_balance');
    expect(result!.count).toBe(2);
    expect(invoker).toHaveBeenCalledWith(TOOL_SAVED_SEARCH, { savedSearchId: 'customsearch_cash_balance' });
  });

  it('runSavedSearch throws NetSuiteSavedSearchNotFoundError on a tool error', async () => {
    const client = new NetSuiteClient(makeVault(), errorInvoker("Saved search 'missing' not found"));
    await expect(client.runSavedSearch('missing')).rejects.toThrow(NetSuiteSavedSearchNotFoundError);
  });
});

// ── isNetSuiteTableReadable ───────────────────────────────────────────────────

describe('NetSuiteClient — isNetSuiteTableReadable', () => {
  it('has NO cold-start deny-list under OAuth — previously-blocked tables probe live and PASS', async () => {
    const client = new NetSuiteClient(makeVault({ hasCredential: true }), jsonInvoker(GOOD_QUERY_RESULT));
    const formerlyBlocked = ['account', 'department', 'classification', 'employee', 'accountingperiod'];
    for (const table of formerlyBlocked) {
      expect(await client.isNetSuiteTableReadable(table), `${table} readable under OAuth`).toBe(true);
    }
  });

  it('returns true for accessible tables (tool returns data)', async () => {
    const client = new NetSuiteClient(makeVault({ hasCredential: true }), jsonInvoker(GOOD_QUERY_RESULT));
    expect(await client.isNetSuiteTableReadable('transaction')).toBe(true);
  });

  it('caches the probe result — second call does not invoke the tool again', async () => {
    const invoker = jsonInvoker(GOOD_QUERY_RESULT);
    const client = new NetSuiteClient(makeVault({ hasCredential: true }), invoker);
    await client.isNetSuiteTableReadable('vendor');
    await client.isNetSuiteTableReadable('vendor');
    expect(invoker).toHaveBeenCalledTimes(1);
  });

  it('returns false for a table whose probe tool errors (permission denied)', async () => {
    const client = new NetSuiteClient(makeVault({ hasCredential: true }), errorInvoker("Record 'x' not found"));
    expect(await client.isNetSuiteTableReadable('customtable_x')).toBe(false);
  });

  it('returns false in credential-absent mode without invoking the tool', async () => {
    const invoker = jsonInvoker(GOOD_QUERY_RESULT);
    const client = new NetSuiteClient(makeVault({ hasCredential: false }), invoker);
    expect(await client.isNetSuiteTableReadable('transaction')).toBe(false);
    expect(invoker).not.toHaveBeenCalled();
  });
});

// ── buildDegradationWarning ───────────────────────────────────────────────────

describe('NetSuiteClient — buildDegradationWarning', () => {
  it('returns a structured warning with table name and remediation', () => {
    const client = new NetSuiteClient(makeVault(), jsonInvoker(GOOD_QUERY_RESULT));
    const warning = client.buildDegradationWarning('account');
    expect(warning.table).toBe('account');
    expect(warning.reason).toContain('account');
    expect(warning.remediation).toContain('Setup → Users/Roles → Manage Roles');
    expect(warning.attemptedQuery).toBeUndefined();
  });

  it('includes attemptedQuery when provided', () => {
    const client = new NetSuiteClient(makeVault(), jsonInvoker(GOOD_QUERY_RESULT));
    const query = 'SELECT id FROM account FETCH NEXT 10 ROWS ONLY';
    expect(client.buildDegradationWarning('account', query).attemptedQuery).toBe(query);
  });
});

// ── error handling ────────────────────────────────────────────────────────────

describe('NetSuiteClient — error handling', () => {
  it('throws NetSuiteAuthExpiredError when the tool invoker reports a 401/token error', async () => {
    const invoker = vi.fn().mockRejectedValue(new Error('HTTP 401 Unauthorized'));
    const client = new NetSuiteClient(makeVault(), invoker as NetSuiteToolInvoker);
    await expect(client.runSuiteQL('SELECT 1 FROM account')).rejects.toThrow(NetSuiteAuthExpiredError);
  });

  it('throws NetSuiteSuiteQLError when the SuiteQL tool returns isError', async () => {
    const client = new NetSuiteClient(makeVault(), errorInvoker('Invalid SuiteQL syntax'));
    await expect(client.runSuiteQL('SELECT * FROM invalid_table')).rejects.toThrow(NetSuiteSuiteQLError);
  });

  it('throws NetSuiteNetworkError on a generic tool/transport failure', async () => {
    const invoker = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const client = new NetSuiteClient(makeVault(), invoker as NetSuiteToolInvoker);
    await expect(client.runSuiteQL('SELECT 1 FROM account')).rejects.toThrow(NetSuiteNetworkError);
  });

  it('throws NetSuiteSuiteQLError when the tool content is not valid JSON', async () => {
    const invoker = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'not json' }] });
    const client = new NetSuiteClient(makeVault(), invoker as NetSuiteToolInvoker);
    await expect(client.runSuiteQL('SELECT 1 FROM account')).rejects.toThrow(NetSuiteSuiteQLError);
  });

  it('throws NetSuiteSuiteQLError when the result shape is invalid', async () => {
    const client = new NetSuiteClient(makeVault(), jsonInvoker({ foo: 'bar' }));
    await expect(client.runSuiteQL('SELECT 1 FROM account')).rejects.toThrow(NetSuiteSuiteQLError);
  });
});
