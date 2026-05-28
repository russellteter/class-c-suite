// tests/unit/mcp/salesforce/client.spec.ts
// Tests for SalesforceClient: isAuthenticated, healthCheck, query happy path,
// 401 auto-refresh, and reconnect delegation.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SalesforceClient } from '../../../../apps/utility/src/mcp/salesforce/client.js';
import {
  SalesforceAuthExpiredError,
  SalesforceAuthRevokedError,
  SalesforceNetworkError,
  SalesforceQueryError,
} from '../../../../apps/utility/src/mcp/salesforce/errors.js';
import type { SafeStorageVault } from '../../../../apps/utility/src/credentials/safeStorageVault.js';

// Mock SFDX fallback so vault-empty tests still exercise the no-auth-anywhere path
// (the live SFDX session would otherwise satisfy isAuthenticated() per Russell-decision
// 2026-05-28: SFDX is a valid fallback auth source).
vi.mock('../../../../apps/utility/src/mcp/salesforce/sfdx-auth.js', () => ({
  getSfdxAuth: vi.fn(async () => null),
  hasSfdxAuth: vi.fn(async () => false),
  // probeAuth() (TRACK 4) falls through to the SFDX probe when the vault is empty;
  // mock it to "no CLI" so the no-auth-anywhere path resolves to state 'neither'.
  probeSfdxAuth: vi.fn(async () => ({ state: 'no_cli', reason: 'sf binary not on PATH' })),
}));

// Set Connected App env vars so token-refresh path doesn't throw
// SalesforceConnectedAppMissingError during unit tests.
const ORIGINAL_ENV = { ...process.env };
beforeEach(() => {
  process.env['SALESFORCE_CLIENT_ID'] = 'test-client-id';
  process.env['SALESFORCE_CLIENT_SECRET'] = 'test-client-secret';
});
afterEach(() => {
  process.env['SALESFORCE_CLIENT_ID'] = ORIGINAL_ENV['SALESFORCE_CLIENT_ID'];
  process.env['SALESFORCE_CLIENT_SECRET'] = ORIGINAL_ENV['SALESFORCE_CLIENT_SECRET'];
  vi.unstubAllGlobals();
});

// ── Fake vault helper ────────────────────────────────────────────────────────

function makeVault(opts: {
  hasCredential?: boolean;
  plaintext?: string;
  metadata?: object;
} = {}): SafeStorageVault {
  return {
    hasValidCredential: vi.fn().mockResolvedValue(opts.hasCredential ?? true),
    loadCredential: vi.fn().mockResolvedValue(
      opts.hasCredential !== false
        ? {
            plaintext: opts.plaintext ?? 'fake-refresh-token',
            type: 'oauth_refresh_token' as const,
            metadata: opts.metadata ?? { instanceUrl: 'https://classedu.my.salesforce.com' },
          }
        : null
    ),
    storeCredential: vi.fn().mockResolvedValue(undefined),
    deleteCredential: vi.fn().mockResolvedValue(undefined),
  } as unknown as SafeStorageVault;
}

// ── Fake fetch factory ───────────────────────────────────────────────────────

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

const GOOD_QUERY_RESPONSE = {
  totalSize: 2,
  done: true,
  records: [
    { Id: '006A000001', Name: 'Deal A', StageName: 'Contracting', Amount: 100_000 },
    { Id: '006A000002', Name: 'Deal B', StageName: 'Negotiation', Amount: 200_000 },
  ],
};

const TOKEN_REFRESH_RESPONSE = {
  access_token: 'new-access-token',
  instance_url: 'https://classedu.my.salesforce.com',
  issued_at: '1716787200000',
};

describe('SalesforceClient — isAuthenticated', () => {
  it('returns true when vault has a valid credential', async () => {
    const client = new SalesforceClient(makeVault({ hasCredential: true }));
    await expect(client.isAuthenticated()).resolves.toBe(true);
  });

  it('returns false when vault has no credential', async () => {
    const client = new SalesforceClient(makeVault({ hasCredential: false }));
    await expect(client.isAuthenticated()).resolves.toBe(false);
  });
});

describe('SalesforceClient — healthCheck', () => {
  it('returns ok=true with oauth authMode when authenticated', async () => {
    const client = new SalesforceClient(makeVault({ hasCredential: true }));
    const health = await client.healthCheck();
    expect(health.ok).toBe(true);
    expect(health.authMode).toBe('oauth');
  });

  it('returns ok=false when not authenticated', async () => {
    const client = new SalesforceClient(makeVault({ hasCredential: false }));
    const health = await client.healthCheck();
    expect(health.ok).toBe(false);
  });
});

describe('SalesforceClient — query happy path', () => {
  it('returns query result from Salesforce API', async () => {
    const vault = makeVault();
    const client = new SalesforceClient(vault);

    // Stub global fetch: first call is token refresh, second is query.
    const stubFetch = makeFetch([
      { status: 200, body: TOKEN_REFRESH_RESPONSE },
      { status: 200, body: GOOD_QUERY_RESPONSE },
    ]);
    vi.stubGlobal('fetch', stubFetch);

    const result = await client.query(
      "SELECT Id FROM Opportunity WHERE StageName = 'Contracting'"
    );
    expect(result.totalSize).toBe(2);
    expect(result.records).toHaveLength(2);
    expect(result.records[0]?.Id).toBe('006A000001');

  });

  it('returns serviceId = salesforce', () => {
    const client = new SalesforceClient(makeVault());
    expect(client.serviceId).toBe('salesforce');
  });
});

describe('SalesforceClient — 401 auto-refresh', () => {
  it('retries the request after a successful token refresh on 401', async () => {
    const vault = makeVault();
    const client = new SalesforceClient(vault);

    // Sequence: token refresh, 401 on first query, token re-refresh, success.
    const stubFetch = makeFetch([
      { status: 200, body: TOKEN_REFRESH_RESPONSE }, // initial token fetch
      { status: 401, body: [{ errorCode: 'INVALID_SESSION_ID', message: 'Session expired' }] },
      { status: 200, body: TOKEN_REFRESH_RESPONSE }, // retry token refresh
      { status: 200, body: GOOD_QUERY_RESPONSE },    // retry query
    ]);
    vi.stubGlobal('fetch', stubFetch);

    const result = await client.query('SELECT Id FROM Opportunity LIMIT 1');
    expect(result.totalSize).toBe(2);

  });

  it('throws SalesforceAuthRevokedError on second 401 (token permanently invalid)', async () => {
    const vault = makeVault();
    const client = new SalesforceClient(vault);

    const stubFetch = makeFetch([
      { status: 200, body: TOKEN_REFRESH_RESPONSE },
      { status: 401, body: [] },
      { status: 200, body: TOKEN_REFRESH_RESPONSE },
      { status: 401, body: [] }, // second 401 — auth revoked
    ]);
    vi.stubGlobal('fetch', stubFetch);

    await expect(client.query('SELECT Id FROM Opportunity')).rejects.toThrow(
      SalesforceAuthRevokedError
    );

  });
});

describe('SalesforceClient — no credential throws', () => {
  it('throws SalesforceAuthExpiredError when vault has no credential', async () => {
    const vault = makeVault({ hasCredential: false });
    const client = new SalesforceClient(vault);

    const stubFetch = vi.fn();
    vi.stubGlobal('fetch', stubFetch);

    await expect(client.query('SELECT Id FROM Opportunity')).rejects.toThrow(
      SalesforceAuthExpiredError
    );

  });
});

describe('SalesforceClient — API error handling', () => {
  it('throws SalesforceQueryError on Salesforce API error response', async () => {
    const vault = makeVault();
    const client = new SalesforceClient(vault);

    const errorBody = [{ errorCode: 'INVALID_FIELD', message: "No such column 'Foo__c'" }];
    const stubFetch = makeFetch([
      { status: 200, body: TOKEN_REFRESH_RESPONSE },
      { status: 400, body: errorBody },
    ]);
    vi.stubGlobal('fetch', stubFetch);

    await expect(client.query("SELECT Foo__c FROM Opportunity")).rejects.toThrow(
      SalesforceQueryError
    );

  });

  it('throws SalesforceNetworkError on network timeout', async () => {
    const vault = makeVault();
    const client = new SalesforceClient(vault);

    const stubFetch = vi.fn().mockImplementation(() => {
      const err = new Error('The operation was aborted.');
      err.name = 'AbortError';
      return Promise.reject(err);
    });
    vi.stubGlobal('fetch', stubFetch);

    await expect(client.query('SELECT Id FROM Opportunity')).rejects.toThrow(
      SalesforceNetworkError
    );

  });
});
