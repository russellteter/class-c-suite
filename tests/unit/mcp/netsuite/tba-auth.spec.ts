// tests/unit/mcp/netsuite/tba-auth.spec.ts
// Tests for NetSuite TBA HMAC-SHA256 auth signature.
// The deterministic fixture pins a known signature for regression detection.

import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';
import {
  buildTBAAuthHeader,
  parseTBACredentials,
} from '../../../../apps/utility/src/mcp/netsuite/tba-auth.js';
import type { TBACredentials } from '../../../../apps/utility/src/mcp/netsuite/tba-auth.js';

// ── Deterministic fixture ─────────────────────────────────────────────────────
// All values are fake test constants — never real credentials.

const FIXTURE_CREDS: TBACredentials = {
  accountId: '1234567',
  consumerKey: 'test-consumer-key-abc123',
  consumerSecret: 'test-consumer-secret-xyz789',
  tokenId: 'test-token-id-def456',
  tokenSecret: 'test-token-secret-ghi012',
};

const FIXTURE_URL = 'https://1234567.suitetalk.api.netsuite.com/services/rest/query/v1/suiteql';
const FIXTURE_NONCE = 'deadbeefcafe00112233445566778899';
const FIXTURE_TIMESTAMP = 1716787200; // 2024-05-27T08:00:00Z — fixed

// Compute the expected signature using the same algorithm independently.
function computeExpectedSignature(): string {
  function pct(s: string) {
    return encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  }

  const params: Record<string, string> = {
    oauth_consumer_key: FIXTURE_CREDS.consumerKey,
    oauth_nonce: FIXTURE_NONCE,
    oauth_signature_method: 'HMAC-SHA256',
    oauth_timestamp: String(FIXTURE_TIMESTAMP),
    oauth_token: FIXTURE_CREDS.tokenId,
    oauth_version: '1.0',
  };

  const paramString = Object.keys(params)
    .sort()
    .map(k => `${pct(k)}=${pct(params[k] ?? '')}`)
    .join('&');

  const base = ['POST', pct(FIXTURE_URL), pct(paramString)].join('&');
  const key = `${pct(FIXTURE_CREDS.consumerSecret)}&${pct(FIXTURE_CREDS.tokenSecret)}`;
  return createHmac('sha256', key).update(base).digest('base64');
}

const EXPECTED_SIGNATURE = computeExpectedSignature();

// ── buildTBAAuthHeader — signature correctness ────────────────────────────────

describe('buildTBAAuthHeader — HMAC-SHA256 signature', () => {
  it('generates a deterministic signature matching the known fixture', () => {
    const header = buildTBAAuthHeader(
      FIXTURE_CREDS,
      'POST',
      FIXTURE_URL,
      {},
      FIXTURE_NONCE,
      FIXTURE_TIMESTAMP,
    );

    // Extract the oauth_signature from the header.
    const sigMatch = header.Authorization.match(/oauth_signature="([^"]+)"/);
    expect(sigMatch).not.toBeNull();

    // Decode percent-encoding in the header value.
    const sigFromHeader = decodeURIComponent(sigMatch![1]!);
    expect(sigFromHeader).toBe(EXPECTED_SIGNATURE);
  });

  it('Authorization header starts with "OAuth "', () => {
    const header = buildTBAAuthHeader(FIXTURE_CREDS, 'POST', FIXTURE_URL, {}, FIXTURE_NONCE, FIXTURE_TIMESTAMP);
    expect(header.Authorization).toMatch(/^OAuth /);
  });

  it('header contains oauth_consumer_key', () => {
    const header = buildTBAAuthHeader(FIXTURE_CREDS, 'POST', FIXTURE_URL, {}, FIXTURE_NONCE, FIXTURE_TIMESTAMP);
    expect(header.Authorization).toContain('oauth_consumer_key');
  });

  it('header contains oauth_token', () => {
    const header = buildTBAAuthHeader(FIXTURE_CREDS, 'POST', FIXTURE_URL, {}, FIXTURE_NONCE, FIXTURE_TIMESTAMP);
    expect(header.Authorization).toContain('oauth_token');
  });

  it('header contains oauth_signature_method=HMAC-SHA256', () => {
    const header = buildTBAAuthHeader(FIXTURE_CREDS, 'POST', FIXTURE_URL, {}, FIXTURE_NONCE, FIXTURE_TIMESTAMP);
    expect(header.Authorization).toContain('HMAC-SHA256');
  });

  it('header contains oauth_version=1.0', () => {
    const header = buildTBAAuthHeader(FIXTURE_CREDS, 'POST', FIXTURE_URL, {}, FIXTURE_NONCE, FIXTURE_TIMESTAMP);
    expect(header.Authorization).toContain('1.0');
  });

  it('header contains realm set to accountId', () => {
    const header = buildTBAAuthHeader(FIXTURE_CREDS, 'POST', FIXTURE_URL, {}, FIXTURE_NONCE, FIXTURE_TIMESTAMP);
    expect(header.Authorization).toContain(`realm="${FIXTURE_CREDS.accountId}"`);
  });

  it('produces different signatures for different nonces', () => {
    const h1 = buildTBAAuthHeader(FIXTURE_CREDS, 'POST', FIXTURE_URL, {}, 'nonce-aaa', FIXTURE_TIMESTAMP);
    const h2 = buildTBAAuthHeader(FIXTURE_CREDS, 'POST', FIXTURE_URL, {}, 'nonce-bbb', FIXTURE_TIMESTAMP);
    expect(h1.Authorization).not.toBe(h2.Authorization);
  });

  it('produces different signatures for different timestamps', () => {
    const h1 = buildTBAAuthHeader(FIXTURE_CREDS, 'POST', FIXTURE_URL, {}, FIXTURE_NONCE, 1716787200);
    const h2 = buildTBAAuthHeader(FIXTURE_CREDS, 'POST', FIXTURE_URL, {}, FIXTURE_NONCE, 1716787201);
    expect(h1.Authorization).not.toBe(h2.Authorization);
  });

  it('includes query params in signature base when provided', () => {
    // Adding query params changes the signature base — should produce a different sig.
    const h1 = buildTBAAuthHeader(FIXTURE_CREDS, 'POST', FIXTURE_URL, {}, FIXTURE_NONCE, FIXTURE_TIMESTAMP);
    const h2 = buildTBAAuthHeader(FIXTURE_CREDS, 'POST', FIXTURE_URL, { q: 'SELECT 1' }, FIXTURE_NONCE, FIXTURE_TIMESTAMP);
    expect(h1.Authorization).not.toBe(h2.Authorization);
  });

  it('does not include credentials plaintext in Authorization header', () => {
    const header = buildTBAAuthHeader(FIXTURE_CREDS, 'POST', FIXTURE_URL, {}, FIXTURE_NONCE, FIXTURE_TIMESTAMP);
    expect(header.Authorization).not.toContain(FIXTURE_CREDS.consumerSecret);
    expect(header.Authorization).not.toContain(FIXTURE_CREDS.tokenSecret);
  });
});

// ── parseTBACredentials ───────────────────────────────────────────────────────

describe('parseTBACredentials', () => {
  it('parses a valid JSON credential blob', () => {
    const json = JSON.stringify({
      accountId: '1234567',
      consumerKey: 'ck',
      consumerSecret: 'cs',
      tokenId: 'ti',
      tokenSecret: 'ts',
    });
    const creds = parseTBACredentials(json);
    expect(creds.accountId).toBe('1234567');
    expect(creds.consumerKey).toBe('ck');
    expect(creds.tokenSecret).toBe('ts');
  });

  it('throws on invalid JSON', () => {
    expect(() => parseTBACredentials('not json')).toThrow('Failed to parse');
  });

  it('throws when accountId is missing', () => {
    const json = JSON.stringify({ consumerKey: 'ck', consumerSecret: 'cs', tokenId: 'ti', tokenSecret: 'ts' });
    expect(() => parseTBACredentials(json)).toThrow("'accountId'");
  });

  it('throws when tokenSecret is missing', () => {
    const json = JSON.stringify({ accountId: '1234567', consumerKey: 'ck', consumerSecret: 'cs', tokenId: 'ti' });
    expect(() => parseTBACredentials(json)).toThrow("'tokenSecret'");
  });

  it('throws when any field is empty string', () => {
    const json = JSON.stringify({ accountId: '', consumerKey: 'ck', consumerSecret: 'cs', tokenId: 'ti', tokenSecret: 'ts' });
    expect(() => parseTBACredentials(json)).toThrow("'accountId'");
  });

  it('throws when value is a non-string type', () => {
    const json = JSON.stringify({ accountId: 1234567, consumerKey: 'ck', consumerSecret: 'cs', tokenId: 'ti', tokenSecret: 'ts' });
    expect(() => parseTBACredentials(json)).toThrow("'accountId'");
  });
});
