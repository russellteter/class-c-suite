// tests/unit/mcp/netsuite/schema-drift-advisory.spec.ts
// Unit tests for NetSuite schema-drift advisory.
//
// Contract:
//   runSuiteQL({ expectRows: true }) + 0 items → schemaDriftAdvisory present
//   runSuiteQL({ expectRows: true }) + >0 items → schemaDriftAdvisory absent
//   runSuiteQL() (no expectRows) + 0 items → schemaDriftAdvisory absent (legit-empty must not fire)
//   runSuiteQL() + credential absent (null result) → no advisory (null is the signal, not advisory)
//
// Same three-case matrix for runSavedSearch().

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  NetSuiteClient,
  TOOL_SUITEQL,
  TOOL_SAVED_SEARCH,
  type NetSuiteToolInvoker,
} from '../../../../apps/utility/src/mcp/netsuite/client.js';
import { SCHEMA_DRIFT_ADVISORY_NS } from '@c-suite/shared-types/mcp';
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

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function jsonInvoker(payload: unknown): NetSuiteToolInvoker {
  return vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify(payload) }],
  } satisfies McpToolResult);
}

const ZERO_ITEMS = { items: [], count: 0, hasMore: false };
const TWO_ITEMS = { items: [{ id: 1, net_amount: 50000 }, { id: 2, net_amount: 25000 }], count: 2, hasMore: false };

// ── runSuiteQL advisory tests ─────────────────────────────────────────────────

describe('NetSuiteClient — schema-drift advisory on runSuiteQL()', () => {
  it('attaches schemaDriftAdvisory when expectRows=true and 0 items returned', async () => {
    const client = new NetSuiteClient(makeVault(), jsonInvoker(ZERO_ITEMS));
    const result = await client.runSuiteQL(
      "SELECT a.acctnumber FROM transaction t INNER JOIN account a ON a.id = t.account WHERE a.accttype = 'Bank'",
      { expectRows: true },
    );
    expect(result).not.toBeNull();
    expect(result!.items).toHaveLength(0);
    expect(result!.schemaDriftAdvisory).toBe(SCHEMA_DRIFT_ADVISORY_NS);
  });

  it('does NOT attach schemaDriftAdvisory when expectRows=true but items are returned', async () => {
    const client = new NetSuiteClient(makeVault(), jsonInvoker(TWO_ITEMS));
    const result = await client.runSuiteQL(
      "SELECT a.acctnumber FROM transaction t INNER JOIN account a ON a.id = t.account WHERE a.accttype = 'Bank'",
      { expectRows: true },
    );
    expect(result!.items).toHaveLength(2);
    expect(result!.schemaDriftAdvisory).toBeUndefined();
  });

  it('does NOT attach schemaDriftAdvisory when expectRows is not set (legit-empty must not false-fire)', async () => {
    const client = new NetSuiteClient(makeVault(), jsonInvoker(ZERO_ITEMS));
    const result = await client.runSuiteQL(
      'SELECT id FROM transaction WHERE department = 99999',
    );
    expect(result!.items).toHaveLength(0);
    expect(result!.schemaDriftAdvisory).toBeUndefined();
  });

  it('returns null without advisory when credential is absent (advisory does not apply to degraded null)', async () => {
    const client = new NetSuiteClient(makeVault({ hasCredential: false }), jsonInvoker(ZERO_ITEMS));
    const result = await client.runSuiteQL(
      "SELECT a.acctnumber FROM transaction t",
      { expectRows: true },
    );
    expect(result).toBeNull();
  });

  it('advisory string contains the canonical fragment from SCHEMA_DRIFT_ADVISORY_NS', async () => {
    const client = new NetSuiteClient(makeVault(), jsonInvoker(ZERO_ITEMS));
    const result = await client.runSuiteQL('SELECT id FROM transaction', { expectRows: true });
    expect(result!.schemaDriftAdvisory).toContain('0 rows');
    expect(result!.schemaDriftAdvisory).toContain('schema drift');
    expect(result!.schemaDriftAdvisory).toContain('NetSuite');
  });
});

// ── runSavedSearch advisory tests ─────────────────────────────────────────────

describe('NetSuiteClient — schema-drift advisory on runSavedSearch()', () => {
  it('attaches schemaDriftAdvisory when expectRows=true and 0 items returned', async () => {
    const client = new NetSuiteClient(makeVault(), jsonInvoker(ZERO_ITEMS));
    const result = await client.runSavedSearch('customsearch_cash_balance', { expectRows: true });
    expect(result).not.toBeNull();
    expect(result!.items).toHaveLength(0);
    expect(result!.schemaDriftAdvisory).toBe(SCHEMA_DRIFT_ADVISORY_NS);
  });

  it('does NOT attach schemaDriftAdvisory when expectRows=true but items are returned', async () => {
    const client = new NetSuiteClient(makeVault(), jsonInvoker(TWO_ITEMS));
    const result = await client.runSavedSearch('customsearch_cash_balance', { expectRows: true });
    expect(result!.items).toHaveLength(2);
    expect(result!.schemaDriftAdvisory).toBeUndefined();
  });

  it('does NOT attach schemaDriftAdvisory when expectRows is not set', async () => {
    const client = new NetSuiteClient(makeVault(), jsonInvoker(ZERO_ITEMS));
    const result = await client.runSavedSearch('customsearch_empty');
    expect(result!.items).toHaveLength(0);
    expect(result!.schemaDriftAdvisory).toBeUndefined();
  });

  it('invokes ns_runSavedSearch tool (not suiteql) when calling runSavedSearch', async () => {
    const invoker = jsonInvoker(ZERO_ITEMS);
    const client = new NetSuiteClient(makeVault(), invoker);
    await client.runSavedSearch('customsearch_cash_balance', { expectRows: true });
    expect(invoker).toHaveBeenCalledWith(TOOL_SAVED_SEARCH, { savedSearchId: 'customsearch_cash_balance' });
    expect(invoker).not.toHaveBeenCalledWith(TOOL_SUITEQL, expect.anything());
  });
});
