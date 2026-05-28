// tests/unit/mcp/oauth/oauth-primitives.spec.ts
// Tests for the reusable OAuth 2.0 authorization-code-with-PKCE primitives.
// These primitives are provider-agnostic — NetSuite consumes them now; Gmail later.

import { describe, it, expect, vi, afterEach } from 'vitest';
import crypto from 'crypto';
import { generatePkcePair, generateState } from '../../../../apps/utility/src/mcp/oauth/pkce.js';
import {
  buildAuthorizeUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  type OAuthProviderConfig,
} from '../../../../apps/utility/src/mcp/oauth/authCodeFlow.js';
import {
  OAUTH_REDIRECT_URI,
  OAUTH_LOOPBACK_PORT,
} from '../../../../apps/utility/src/mcp/oauth/loopbackServer.js';
import { OAuthTokenStore, REFRESH_SKEW_MS } from '../../../../apps/utility/src/mcp/oauth/tokenStore.js';
import type { SafeStorageVault } from '../../../../apps/utility/src/credentials/safeStorageVault.js';

afterEach(() => vi.unstubAllGlobals());

// Public client (no clientSecret) — NetSuite AI Connector Service, scope `mcp`.
const CONFIG: OAuthProviderConfig = {
  serviceLabel: 'NetSuite',
  authorizeEndpoint: 'https://603734.app.netsuite.com/app/login/oauth2/authorize.nl',
  tokenEndpoint: 'https://603734.suitetalk.api.netsuite.com/services/rest/auth/oauth2/v1/token',
  clientId: 'test-client-id',
  scope: 'mcp',
};

describe('pkce', () => {
  it('generates a verifier and a valid S256 challenge', () => {
    const { verifier, challenge, method } = generatePkcePair();
    expect(method).toBe('S256');
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    // challenge must equal base64url(sha256(verifier))
    const expected = crypto.createHash('sha256').update(verifier).digest('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(challenge).toBe(expected);
  });

  it('verifier and challenge are URL-safe (no +, /, =)', () => {
    const { verifier, challenge } = generatePkcePair();
    expect(verifier).not.toMatch(/[+/=]/);
    expect(challenge).not.toMatch(/[+/=]/);
  });

  it('generateState returns distinct values', () => {
    expect(generateState()).not.toBe(generateState());
  });
});

describe('loopback redirect constants', () => {
  it('pins the fixed redirect URI to localhost:8765/oauth/callback', () => {
    expect(OAUTH_LOOPBACK_PORT).toBe(8765);
    expect(OAUTH_REDIRECT_URI).toBe('http://localhost:8765/oauth/callback');
  });
});

describe('buildAuthorizeUrl', () => {
  it('includes PKCE challenge, S256 method, state, scope, and the fixed redirect URI', () => {
    const url = new URL(buildAuthorizeUrl(CONFIG, 'CHALLENGE', 'STATE'));
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('test-client-id');
    expect(url.searchParams.get('code_challenge')).toBe('CHALLENGE');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toBe('STATE');
    expect(url.searchParams.get('scope')).toBe('mcp');
    expect(url.searchParams.get('redirect_uri')).toBe(OAUTH_REDIRECT_URI);
  });
});

describe('exchangeCodeForTokens', () => {
  it('POSTs code + verifier to the token endpoint and returns a token set', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ access_token: 'A', refresh_token: 'R', expires_in: 3600, scope: 'rest_webservices' }),
      text: () => Promise.resolve('{}'),
    });
    vi.stubGlobal('fetch', mockFetch);

    const tokens = await exchangeCodeForTokens(CONFIG, 'auth-code', 'verifier-123');
    expect(tokens.accessToken).toBe('A');
    expect(tokens.refreshToken).toBe('R');
    expect(tokens.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const [, init] = mockFetch.mock.calls[0]!;
    const body = (init as RequestInit).body as string;
    expect(body).toContain('grant_type=authorization_code');
    expect(body).toContain('code=auth-code');
    expect(body).toContain('code_verifier=verifier-123');
    // Public client: NO client_secret on the token request.
    expect(body).not.toContain('client_secret');
  });

  it('throws on a non-200 token response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 400, text: () => Promise.resolve('invalid_grant'), json: () => Promise.resolve({}),
    }));
    await expect(exchangeCodeForTokens(CONFIG, 'bad', 'v')).rejects.toThrow(/Token exchange failed/);
  });
});

describe('refreshAccessToken', () => {
  it('returns a fresh access token from a refresh token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ access_token: 'A2', expires_in: 3600 }),
      text: () => Promise.resolve('{}'),
    }));
    const r = await refreshAccessToken(CONFIG, 'refresh-1');
    expect(r.accessToken).toBe('A2');
    expect(r.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

// ── OAuthTokenStore ────────────────────────────────────────────────────────────

function makeVaultWithBlob(blob: string | null): SafeStorageVault {
  return {
    hasValidCredential: vi.fn().mockResolvedValue(blob !== null),
    loadCredential: vi.fn().mockResolvedValue(blob ? { plaintext: blob, type: 'oauth_refresh_token' } : null),
    storeCredential: vi.fn().mockResolvedValue(undefined),
    deleteCredential: vi.fn().mockResolvedValue(undefined),
  } as unknown as SafeStorageVault;
}

describe('OAuthTokenStore', () => {
  it('returns a still-fresh access token without refreshing', async () => {
    const future = Date.now() + 60 * 60 * 1000;
    const vault = makeVaultWithBlob(JSON.stringify({ refreshToken: 'R', accessToken: 'A', accessTokenExpiresAt: future }));
    const store = new OAuthTokenStore(vault, 'netsuite', CONFIG);
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    expect(await store.getAccessToken()).toBe('A');
    expect(mockFetch).not.toHaveBeenCalled(); // no refresh round-trip
  });

  it('refreshes when the access token is inside the 5-min skew window', async () => {
    const soon = Date.now() + (REFRESH_SKEW_MS - 60_000); // inside skew
    const vault = makeVaultWithBlob(JSON.stringify({ refreshToken: 'R', accessToken: 'stale', accessTokenExpiresAt: soon }));
    const store = new OAuthTokenStore(vault, 'netsuite', CONFIG);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200, json: () => Promise.resolve({ access_token: 'fresh', expires_in: 3600 }), text: () => Promise.resolve('{}'),
    }));

    expect(await store.getAccessToken()).toBe('fresh');
    expect(vault.storeCredential).toHaveBeenCalled();
  });

  it('hasRefreshToken is false when vault is empty', async () => {
    const store = new OAuthTokenStore(makeVaultWithBlob(null), 'netsuite', CONFIG);
    expect(await store.hasRefreshToken()).toBe(false);
  });

  it('getAccessToken throws when no refresh token is stored', async () => {
    const store = new OAuthTokenStore(makeVaultWithBlob(null), 'netsuite', CONFIG);
    await expect(store.getAccessToken()).rejects.toThrow(/run the Connect flow/i);
  });

  it('persistTokenSet stores a JSON blob with refresh + access + expiry', async () => {
    const vault = makeVaultWithBlob(null);
    const store = new OAuthTokenStore(vault, 'netsuite', CONFIG);
    await store.persistTokenSet({ accessToken: 'A', refreshToken: 'R', expiresAt: new Date(Date.now() + 3600_000), scope: 'rest_webservices' });
    const [serviceId, plaintext, type] = (vault.storeCredential as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(serviceId).toBe('netsuite');
    expect(type).toBe('oauth_refresh_token');
    const parsed = JSON.parse(plaintext as string);
    expect(parsed.refreshToken).toBe('R');
    expect(parsed.accessToken).toBe('A');
    expect(parsed.accessTokenExpiresAt).toBeGreaterThan(Date.now());
  });
});
