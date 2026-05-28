// tests/unit/mcp/netsuite/client.spec.ts
// Tests for NetSuiteClient: both modes (token-present mock + token-absent degraded).
// Critical: token-absent mode returns null + degraded=true on every query method.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NetSuiteClient } from '../../../../apps/utility/src/mcp/netsuite/client.js';
import {
  NetSuiteAuthMissingError,
  NetSuiteTBAExpiredError,
  NetSuiteNetworkError,
  NetSuiteSuiteQLError,
  NetSuiteSavedSearchNotFoundError,
} from '../../../../apps/utility/src/mcp/netsuite/errors.js';
import type { SafeStorageVault } from '../../../../apps/utility/src/credentials/safeStorageVault.js';

// Keep reconnect() tests deterministic regardless of the caller's shell: a dev who
// runs `source apps/main/.env.local && pnpm test` would otherwise leak NETSUITE_*
// into process.env and flip the "throws when no credential" case.
const NETSUITE_ENV_KEYS = [
  'NETSUITE_ACCOUNT_ID',
  'NETSUITE_CONSUMER_KEY',
  'NETSUITE_CONSUMER_SECRET',
  'NETSUITE_TBA_TOKEN_ID',
  'NETSUITE_TBA_TOKEN_SECRET',
];

beforeEach(() => {
  for (const k of NETSUITE_ENV_KEYS) delete process.env[k];
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── Fake vault helper ─────────────────────────────────────────────────────────

const FAKE_TBA_JSON = JSON.stringify({
  accountId: '1234567',
  consumerKey: 'test-consumer-key',
  consumerSecret: 'test-consumer-secret',
  tokenId: 'test-token-id',
  tokenSecret: 'test-token-secret',
});

function makeVault(opts: { hasCredential?: boolean } = {}): SafeStorageVault {
  const has = opts.hasCredential !== false;
  return {
    hasValidCredential: vi.fn().mockResolvedValue(has),
    loadCredential: vi.fn().mockResolvedValue(
      has ? { plaintext: FAKE_TBA_JSON, type: 'tba_token' as const } : null
    ),
    storeCredential: vi.fn().mockResolvedValue(undefined),
    deleteCredential: vi.fn().mockResolvedValue(undefined),
  } as unknown as SafeStorageVault;
}

// ── Fake fetch factory ────────────────────────────────────────────────────────

const GOOD_SUITEQL_RESPONSE = {
  items: [
    { account_number: '1000', account_name: 'Main Checking', net_amount: 1_500_000 },
    { account_number: '1001', account_name: 'Operating', net_amount: 750_000 },
  ],
  count: 2,
  hasMore: false,
};

function makeFetch(
  responses: Array<{ status: number; body: unknown }>
): ReturnType<typeof vi.fn> {
  let callIndex = 0;
  return vi.fn().mockImplementation(() => {
    const resp = responses[callIndex] ?? responses[responses.length - 1];
    callIndex++;
    return Promise.resolve({
      ok: resp.status >= 200 && resp.status < 300,
      status: resp.status,
      json: () => Promise.resolve(resp.body),
      text: () => Promise.resolve(JSON.stringify(resp.body)),
    });
  });
}

// ── token-absent mode (degraded) ──────────────────────────────────────────────

describe('NetSuiteClient — token-absent mode', () => {
  it('runSuiteQL returns null when no credential present', async () => {
    const client = new NetSuiteClient(makeVault({ hasCredential: false }));
    const result = await client.runSuiteQL('SELECT * FROM transaction FETCH NEXT 1 ROWS ONLY');
    expect(result).toBeNull();
  });

  it('sets degraded=true when no credential present (runSuiteQL)', async () => {
    const client = new NetSuiteClient(makeVault({ hasCredential: false }));
    await client.runSuiteQL('SELECT 1 FROM transaction');
    expect(client.degraded).toBe(true);
  });

  it('runSavedSearch returns null when no credential present', async () => {
    const client = new NetSuiteClient(makeVault({ hasCredential: false }));
    const result = await client.runSavedSearch('customsearch123');
    expect(result).toBeNull();
  });

  it('sets degraded=true when no credential present (runSavedSearch)', async () => {
    const client = new NetSuiteClient(makeVault({ hasCredential: false }));
    await client.runSavedSearch('customsearch123');
    expect(client.degraded).toBe(true);
  });

  it('isAuthenticated returns false when no credential', async () => {
    const client = new NetSuiteClient(makeVault({ hasCredential: false }));
    await expect(client.isAuthenticated()).resolves.toBe(false);
  });

  it('healthCheck returns ok=false in token-absent mode', async () => {
    const client = new NetSuiteClient(makeVault({ hasCredential: false }));
    await client.runSuiteQL('SELECT 1 FROM transaction');
    const health = await client.healthCheck();
    expect(health.ok).toBe(false);
    expect(health.authMode).toBe('tba');
  });

  it('reconnect throws NetSuiteAuthMissingError when no credential', async () => {
    const client = new NetSuiteClient(makeVault({ hasCredential: false }));
    await expect(client.reconnect()).rejects.toThrow(NetSuiteAuthMissingError);
  });

  it('degraded starts false and becomes true only after a null-result query', async () => {
    const client = new NetSuiteClient(makeVault({ hasCredential: false }));
    expect(client.degraded).toBe(false);
    await client.runSuiteQL('SELECT 1 FROM transaction');
    expect(client.degraded).toBe(true);
  });
});

// ── token-present mode (happy path) ──────────────────────────────────────────

describe('NetSuiteClient — token-present mode', () => {
  it('returns serviceId = netsuite', () => {
    const client = new NetSuiteClient(makeVault());
    expect(client.serviceId).toBe('netsuite');
  });

  it('isAuthenticated returns true when credential present', async () => {
    const client = new NetSuiteClient(makeVault({ hasCredential: true }));
    await expect(client.isAuthenticated()).resolves.toBe(true);
  });

  it('healthCheck returns ok=true + authMode=tba when authenticated', async () => {
    const client = new NetSuiteClient(makeVault({ hasCredential: true }));
    const health = await client.healthCheck();
    expect(health.ok).toBe(true);
    expect(health.authMode).toBe('tba');
  });

  it('runSuiteQL returns parsed result on success', async () => {
    const client = new NetSuiteClient(makeVault());
    vi.stubGlobal('fetch', makeFetch([{ status: 200, body: GOOD_SUITEQL_RESPONSE }]));

    const result = await client.runSuiteQL('SELECT account_number FROM transaction FETCH NEXT 10 ROWS ONLY');
    expect(result).not.toBeNull();
    expect(result!.count).toBe(2);
    expect(result!.items).toHaveLength(2);
    expect(result!.items[0]?.account_number).toBe('1000');
  });

  it('runSuiteQL clears degraded flag on success', async () => {
    const client = new NetSuiteClient(makeVault());
    // Manually set degraded to simulate a prior failed state.
    (client as unknown as { degraded: boolean }).degraded = true;
    vi.stubGlobal('fetch', makeFetch([{ status: 200, body: GOOD_SUITEQL_RESPONSE }]));
    await client.runSuiteQL('SELECT 1 FROM account');
    expect(client.degraded).toBe(false);
  });

  it('reconnect clears degraded and resolves when credential exists', async () => {
    const client = new NetSuiteClient(makeVault({ hasCredential: true }));
    (client as unknown as { degraded: boolean }).degraded = true;
    await client.reconnect();
    expect(client.degraded).toBe(false);
  });

  it('reconnect seeds the vault from NETSUITE_* env vars when present', async () => {
    const ENV_KEYS = [
      'NETSUITE_ACCOUNT_ID',
      'NETSUITE_CONSUMER_KEY',
      'NETSUITE_CONSUMER_SECRET',
      'NETSUITE_TBA_TOKEN_ID',
      'NETSUITE_TBA_TOKEN_SECRET',
    ];
    const saved = Object.fromEntries(ENV_KEYS.map(k => [k, process.env[k]]));
    process.env['NETSUITE_ACCOUNT_ID'] = '603734';
    process.env['NETSUITE_CONSUMER_KEY'] = 'env-consumer-key';
    process.env['NETSUITE_CONSUMER_SECRET'] = 'env-consumer-secret';
    process.env['NETSUITE_TBA_TOKEN_ID'] = 'env-token-id';
    process.env['NETSUITE_TBA_TOKEN_SECRET'] = 'env-token-secret';

    try {
      // Vault has no credential yet — env is the only source.
      const vault = makeVault({ hasCredential: false });
      const client = new NetSuiteClient(vault);
      (client as unknown as { degraded: boolean }).degraded = true;

      await client.reconnect();

      expect(vault.storeCredential).toHaveBeenCalledWith(
        'netsuite',
        JSON.stringify({
          accountId: '603734',
          consumerKey: 'env-consumer-key',
          consumerSecret: 'env-consumer-secret',
          tokenId: 'env-token-id',
          tokenSecret: 'env-token-secret',
        }),
        'tba_token',
      );
      expect(client.degraded).toBe(false);
    } finally {
      for (const k of ENV_KEYS) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
      }
    }
  });

  it('runSavedSearch returns parsed result on success', async () => {
    const client = new NetSuiteClient(makeVault());
    vi.stubGlobal('fetch', makeFetch([{ status: 200, body: GOOD_SUITEQL_RESPONSE }]));

    const result = await client.runSavedSearch('customsearch_cash_balance');
    expect(result).not.toBeNull();
    expect(result!.count).toBe(2);
  });

  it('runSavedSearch throws NetSuiteSavedSearchNotFoundError on 404', async () => {
    const client = new NetSuiteClient(makeVault());
    vi.stubGlobal('fetch', makeFetch([{ status: 404, body: { title: 'Not Found' } }]));

    await expect(client.runSavedSearch('missing_search')).rejects.toThrow(
      NetSuiteSavedSearchNotFoundError
    );
  });
});

// ── isNetSuiteTableReadable ───────────────────────────────────────────────────

describe('NetSuiteClient — isNetSuiteTableReadable', () => {
  it('returns false for known-blocked tables without a network call', async () => {
    const client = new NetSuiteClient(makeVault({ hasCredential: true }));
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const knownBlocked = ['account', 'department', 'classification', 'employee', 'accountingperiod'];
    for (const table of knownBlocked) {
      const result = await client.isNetSuiteTableReadable(table);
      expect(result, `${table} should be false`).toBe(false);
    }
    // No network call should have been made — seeded from cold-start deny-list.
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns false for known-blocked tables in token-absent mode', async () => {
    const client = new NetSuiteClient(makeVault({ hasCredential: false }));
    const result = await client.isNetSuiteTableReadable('account');
    expect(result).toBe(false);
  });

  it('returns true for accessible tables (probe returns 200)', async () => {
    const client = new NetSuiteClient(makeVault({ hasCredential: true }));
    vi.stubGlobal('fetch', makeFetch([{ status: 200, body: GOOD_SUITEQL_RESPONSE }]));

    const result = await client.isNetSuiteTableReadable('transaction');
    expect(result).toBe(true);
  });

  it('caches the probe result — second call does not issue another fetch', async () => {
    const client = new NetSuiteClient(makeVault({ hasCredential: true }));
    const mockFetch = makeFetch([{ status: 200, body: GOOD_SUITEQL_RESPONSE }]);
    vi.stubGlobal('fetch', mockFetch);

    await client.isNetSuiteTableReadable('vendor');
    await client.isNetSuiteTableReadable('vendor');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('returns false for a table that returns 400 permission-denied', async () => {
    const client = new NetSuiteClient(makeVault({ hasCredential: true }));
    vi.stubGlobal('fetch', makeFetch([{ status: 400, body: { title: "Record 'customtable_x' not found" } }]));

    const result = await client.isNetSuiteTableReadable('customtable_x');
    expect(result).toBe(false);
  });

  it('returns false in token-absent mode for any table', async () => {
    const client = new NetSuiteClient(makeVault({ hasCredential: false }));
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const result = await client.isNetSuiteTableReadable('transaction');
    expect(result).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ── buildDegradationWarning ───────────────────────────────────────────────────

describe('NetSuiteClient — buildDegradationWarning', () => {
  it('returns a structured warning with table name and remediation', () => {
    const client = new NetSuiteClient(makeVault());
    const warning = client.buildDegradationWarning('account');

    expect(warning.table).toBe('account');
    expect(warning.reason).toContain('account');
    expect(warning.remediation).toContain('Setup → Users/Roles → Manage Roles');
    expect(warning.attemptedQuery).toBeUndefined();
  });

  it('includes attemptedQuery when provided', () => {
    const client = new NetSuiteClient(makeVault());
    const query = 'SELECT id FROM account FETCH NEXT 10 ROWS ONLY';
    const warning = client.buildDegradationWarning('account', query);

    expect(warning.attemptedQuery).toBe(query);
  });

  it('returns warnings for all 5 known-blocked tables', () => {
    const client = new NetSuiteClient(makeVault());
    const blocked = ['account', 'department', 'classification', 'employee', 'accountingperiod'];
    for (const table of blocked) {
      const w = client.buildDegradationWarning(table);
      expect(w.table).toBe(table);
      expect(w.reason.length).toBeGreaterThan(0);
      expect(w.remediation.length).toBeGreaterThan(0);
    }
  });
});

// ── error handling ────────────────────────────────────────────────────────────

describe('NetSuiteClient — error handling', () => {
  it('throws NetSuiteTBAExpiredError on 401', async () => {
    const client = new NetSuiteClient(makeVault());
    vi.stubGlobal('fetch', makeFetch([{ status: 401, body: {} }]));

    await expect(client.runSuiteQL('SELECT 1 FROM account')).rejects.toThrow(
      NetSuiteTBAExpiredError
    );
  });

  it('throws NetSuiteSuiteQLError on non-200/404 error with parseable body', async () => {
    const client = new NetSuiteClient(makeVault());
    const errorBody = { o_error: { code: 'USER_ERROR', message: 'Invalid SuiteQL syntax' } };
    vi.stubGlobal('fetch', makeFetch([{ status: 400, body: errorBody }]));

    await expect(client.runSuiteQL('SELECT * FROM invalid_table')).rejects.toThrow(
      NetSuiteSuiteQLError
    );
  });

  it('throws NetSuiteNetworkError on network timeout (AbortError)', async () => {
    const client = new NetSuiteClient(makeVault());
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
      const err = new Error('The operation was aborted.');
      err.name = 'AbortError';
      return Promise.reject(err);
    }));

    await expect(client.runSuiteQL('SELECT 1 FROM account')).rejects.toThrow(
      NetSuiteNetworkError
    );
  });

  it('throws NetSuiteNetworkError on generic network failure', async () => {
    const client = new NetSuiteClient(makeVault());
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    await expect(client.runSuiteQL('SELECT 1 FROM account')).rejects.toThrow(
      NetSuiteNetworkError
    );
  });

  it('throws NetSuiteSuiteQLError when response shape is invalid', async () => {
    const client = new NetSuiteClient(makeVault());
    // Response missing required fields (items, count, hasMore).
    vi.stubGlobal('fetch', makeFetch([{ status: 200, body: { foo: 'bar' } }]));

    await expect(client.runSuiteQL('SELECT 1 FROM account')).rejects.toThrow(
      NetSuiteSuiteQLError
    );
  });
});
