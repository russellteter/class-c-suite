// tests/unit/mcp/salesforce/schema-drift-advisory.spec.ts
// Unit tests for Salesforce schema-drift advisory.
//
// Contract:
//   query({ expectRows: true }) + 0 records → schemaDriftAdvisory present
//   query({ expectRows: true }) + >0 records → schemaDriftAdvisory absent
//   query() (no expectRows) + 0 records → schemaDriftAdvisory absent (no false-fire on legit-empty)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SalesforceClient } from '../../../../apps/utility/src/mcp/salesforce/client.js';
import { SCHEMA_DRIFT_ADVISORY_SF } from '@c-suite/shared-types/mcp';
import type { SafeStorageVault } from '../../../../apps/utility/src/credentials/safeStorageVault.js';

// Mock SFDX fallback — same pattern as client.spec.ts
vi.mock('../../../../apps/utility/src/mcp/salesforce/sfdx-auth.js', () => ({
  getSfdxAuth: vi.fn(async () => null),
  hasSfdxAuth: vi.fn(async () => false),
  probeSfdxAuth: vi.fn(async () => ({ state: 'no_cli', reason: 'sf binary not on PATH' })),
}));

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

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeVault(): SafeStorageVault {
  return {
    hasValidCredential: vi.fn().mockResolvedValue(true),
    loadCredential: vi.fn().mockResolvedValue({
      plaintext: 'fake-refresh-token',
      type: 'oauth_refresh_token' as const,
      metadata: { instanceUrl: 'https://classedu.my.salesforce.com' },
    }),
    storeCredential: vi.fn().mockResolvedValue(undefined),
    deleteCredential: vi.fn().mockResolvedValue(undefined),
  } as unknown as SafeStorageVault;
}

const TOKEN_REFRESH_RESPONSE = {
  access_token: 'new-access-token',
  instance_url: 'https://classedu.my.salesforce.com',
  issued_at: '1716787200000',
};

function makeFetch(queryBody: unknown): ReturnType<typeof vi.fn> {
  let callIndex = 0;
  const responses = [
    { status: 200, body: TOKEN_REFRESH_RESPONSE },
    { status: 200, body: queryBody },
  ];
  return vi.fn().mockImplementation(() => {
    const resp = responses[callIndex] ?? responses[responses.length - 1];
    callIndex++;
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(resp.body),
      text: () => Promise.resolve(JSON.stringify(resp.body)),
    });
  });
}

const ZERO_ROWS_RESPONSE = { totalSize: 0, done: true, records: [] };
const TWO_ROWS_RESPONSE = {
  totalSize: 2,
  done: true,
  records: [
    { Id: '006A1', StageName: 'Contracting', Amount: 100_000 },
    { Id: '006A2', StageName: 'Negotiation', Amount: 200_000 },
  ],
};

// ── Tests: query() ────────────────────────────────────────────────────────────

describe('SalesforceClient — schema-drift advisory on query()', () => {
  it('attaches schemaDriftAdvisory when expectRows=true and 0 records returned', async () => {
    vi.stubGlobal('fetch', makeFetch(ZERO_ROWS_RESPONSE));
    const client = new SalesforceClient(makeVault());
    const result = await client.query("SELECT Id FROM Opportunity WHERE StageName = 'Verbal'", { expectRows: true });
    expect(result.records).toHaveLength(0);
    expect(result.schemaDriftAdvisory).toBe(SCHEMA_DRIFT_ADVISORY_SF);
  });

  it('does NOT attach schemaDriftAdvisory when expectRows=true but rows are returned', async () => {
    vi.stubGlobal('fetch', makeFetch(TWO_ROWS_RESPONSE));
    const client = new SalesforceClient(makeVault());
    const result = await client.query("SELECT Id FROM Opportunity WHERE StageName IN (...)", { expectRows: true });
    expect(result.records).toHaveLength(2);
    expect(result.schemaDriftAdvisory).toBeUndefined();
  });

  it('does NOT attach schemaDriftAdvisory when expectRows is not set (legit-empty queries must not false-fire)', async () => {
    vi.stubGlobal('fetch', makeFetch(ZERO_ROWS_RESPONSE));
    const client = new SalesforceClient(makeVault());
    const result = await client.query("SELECT Id FROM Opportunity WHERE AccountId = 'no-opps-account'");
    expect(result.records).toHaveLength(0);
    expect(result.schemaDriftAdvisory).toBeUndefined();
  });

  it('advisory string contains the canonical fragment from SCHEMA_DRIFT_ADVISORY_SF', async () => {
    vi.stubGlobal('fetch', makeFetch(ZERO_ROWS_RESPONSE));
    const client = new SalesforceClient(makeVault());
    const result = await client.query('SELECT Id FROM Opportunity', { expectRows: true });
    // Confirm the stable substring tests can anchor on
    expect(result.schemaDriftAdvisory).toContain('0 rows');
    expect(result.schemaDriftAdvisory).toContain('schema drift');
    expect(result.schemaDriftAdvisory).toContain('Salesforce');
  });
});
