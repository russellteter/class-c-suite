// apps/utility/src/mcp/oauth/authCodeFlow.ts
// Source: docs/decisions/0015-netsuite-oauth-migration.md §2
//
// Provider-agnostic OAuth 2.0 authorization-code-with-PKCE flow.
// Injecting the provider config (endpoints + scope + client) is the whole point:
// NetSuite uses it now; Gmail can adopt it later by passing its own OAuthProviderConfig.
//
// Flow:
//   1. generate PKCE verifier/challenge + state
//   2. open the system browser at the authorize endpoint
//   3. wait for the loopback redirect (fixed port 8765) → auth code
//   4. POST code + verifier to the token endpoint → { access, refresh, expiresAt }

import { generatePkcePair, generateState } from './pkce.js';
import {
  waitForOAuthRedirect,
  OAUTH_REDIRECT_URI,
  OAuthLoopbackError,
} from './loopbackServer.js';

export interface OAuthProviderConfig {
  /** Human label for browser/success page (e.g. "NetSuite"). */
  serviceLabel: string;
  /** Full authorize endpoint URL (no query string). */
  authorizeEndpoint: string;
  /** Full token endpoint URL. */
  tokenEndpoint: string;
  /** OAuth client_id from the provider Integration Record. */
  clientId: string;
  /**
   * OAuth client_secret. OPTIONAL — present only for confidential clients.
   * NetSuite's AI Connector Service uses a PUBLIC client + PKCE with NO secret;
   * leave this undefined for that path. When set it is sent on the token request.
   */
  clientSecret?: string;
  /** Space-delimited scope string (e.g. "mcp" for the NetSuite AI Connector Service). */
  scope: string;
  /** Redirect URI registered in the Integration Record. Defaults to the fixed loopback URI. */
  redirectUri?: string;
  /** Extra query params appended to the authorize URL (e.g. prompt, access_type). */
  extraAuthorizeParams?: Record<string, string>;
}

export interface OAuthTokenSet {
  accessToken: string;
  refreshToken: string;
  /** Absolute expiry computed from the token response's expires_in. */
  expiresAt: Date;
  /** The scope the provider actually granted, if echoed back. */
  scope?: string;
}

export class OAuthFlowError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'OAuthFlowError';
  }
}

const TOKEN_TIMEOUT_MS = 30_000;

/** Build the authorize URL for the GET redirect to the browser. */
export function buildAuthorizeUrl(
  config: OAuthProviderConfig,
  challenge: string,
  state: string,
): string {
  const redirectUri = config.redirectUri ?? OAUTH_REDIRECT_URI;
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: redirectUri,
    scope: config.scope,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    ...(config.extraAuthorizeParams ?? {}),
  });
  return `${config.authorizeEndpoint}?${params.toString()}`;
}

/**
 * Run the full authorization-code-with-PKCE flow.
 * Opens the browser, waits for the loopback redirect, exchanges code for tokens.
 *
 * `openBrowser` is injected so tests / CLI can stub it (production passes the
 * Electron shell.openExternal wrapper). Defaults to stdout in non-Electron contexts.
 */
export async function runAuthorizationCodeFlow(
  config: OAuthProviderConfig,
  openBrowser?: (url: string) => Promise<void>,
): Promise<OAuthTokenSet> {
  const { verifier, challenge } = generatePkcePair();
  const state = generateState();
  const authorizeUrl = buildAuthorizeUrl(config, challenge, state);

  const open = openBrowser ?? defaultOpenBrowser;
  await open(authorizeUrl);

  let code: string;
  try {
    const result = await waitForOAuthRedirect({
      expectedState: state,
      serviceLabel: config.serviceLabel,
    });
    code = result.code;
  } catch (err) {
    if (err instanceof OAuthLoopbackError) {
      throw new OAuthFlowError(`OAuth callback failed: ${err.message}`, err);
    }
    throw err;
  }

  return exchangeCodeForTokens(config, code, verifier);
}

/**
 * POST the authorization code + PKCE verifier to the token endpoint.
 * NetSuite + Google both accept application/x-www-form-urlencoded here.
 */
export async function exchangeCodeForTokens(
  config: OAuthProviderConfig,
  code: string,
  codeVerifier: string,
): Promise<OAuthTokenSet> {
  const redirectUri = config.redirectUri ?? OAUTH_REDIRECT_URI;
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: config.clientId,
    code_verifier: codeVerifier,
  });
  if (config.clientSecret) body.set('client_secret', config.clientSecret);

  const response = await postForm(config.tokenEndpoint, body);
  if (!response.ok) {
    const text = await response.text();
    throw new OAuthFlowError(`Token exchange failed: HTTP ${response.status} — ${text}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope?: string;
    token_type?: string;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1_000),
    ...(data.scope !== undefined ? { scope: data.scope } : {}),
  };
}

/**
 * Use a stored refresh token to obtain a fresh access token.
 * Providers may rotate the refresh token (NetSuite does NOT by default;
 * Google does not on refresh) — when one is returned, the caller should persist it.
 */
export async function refreshAccessToken(
  config: OAuthProviderConfig,
  refreshToken: string,
): Promise<Pick<OAuthTokenSet, 'accessToken' | 'expiresAt'> & { refreshToken?: string }> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config.clientId,
  });
  if (config.clientSecret) body.set('client_secret', config.clientSecret);

  const response = await postForm(config.tokenEndpoint, body);
  if (!response.ok) {
    const text = await response.text();
    throw new OAuthFlowError(`Token refresh failed: HTTP ${response.status} — ${text}`, text);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1_000),
    ...(data.refresh_token !== undefined ? { refreshToken: data.refresh_token } : {}),
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function defaultOpenBrowser(url: string): Promise<void> {
  try {
    const { shell } = await import('electron');
    await shell.openExternal(url);
  } catch {
    process.stdout.write(`Open this URL to authenticate:\n${url}\n`);
  }
}

async function postForm(url: string, body: URLSearchParams): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TOKEN_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new OAuthFlowError(`Request to ${url} timed out after ${TOKEN_TIMEOUT_MS}ms`);
    }
    throw new OAuthFlowError(`Network error calling ${url}: ${String(err)}`, err);
  } finally {
    clearTimeout(timer);
  }
}
