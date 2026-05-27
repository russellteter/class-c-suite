// apps/utility/src/mcp/gmail/oauth-flow.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §7
//
// Google OAuth 2.0 Authorization Code grant — read-only Gmail scope.
// Flow:
//   1. Open browser → accounts.google.com/o/oauth2/v2/auth
//   2. Listen on localhost:53683/callback  (different from Salesforce :53682)
//   3. Exchange auth code for refresh token
//   4. storeCredential('gmail', refreshToken, 'oauth_refresh_token', ...)
//
// Russell creates the OAuth client in Google Cloud Console; this file reads
// client_id + client_secret from env vars GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET.
// The refresh token is stored in safeStorage thereafter.
//
// See docs/setup/gmail-oauth-app.md for setup steps.
//
// Google-specific: refresh_token is only returned on first consent unless
// prompt=consent is set. access_type=offline is required for offline access.
// Google returns expires_in (seconds), not issued_at (ms).

import * as http from 'http';
import { URL } from 'url';
import type { SafeStorageVault } from '../../credentials/safeStorageVault.js';
import {
  GmailOAuthAppMissingError,
  GmailAuthRevokedError,
  GmailNetworkError,
} from './errors.js';

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const OAUTH_CALLBACK_PORT = 53683;
const OAUTH_CALLBACK_PATH = '/callback';
const OAUTH_CALLBACK_URI = `http://localhost:${OAUTH_CALLBACK_PORT}${OAUTH_CALLBACK_PATH}`;
const AUTHORIZE_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

export interface GmailTokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

/**
 * Read OAuth App credentials from env vars.
 * These are bootstrap values — Russell populates them once after creating
 * the OAuth App. The refresh token is subsequently stored in safeStorage.
 */
function getOAuthAppCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env['GMAIL_CLIENT_ID'];
  const clientSecret = process.env['GMAIL_CLIENT_SECRET'];
  if (!clientId || !clientSecret) {
    throw new GmailOAuthAppMissingError();
  }
  return { clientId, clientSecret };
}

/**
 * Run the full OAuth Authorization Code grant.
 * Opens the system browser, waits for the callback, exchanges the code for tokens.
 * Stores the refresh token via safeStorage.
 *
 * Returns the live token set for immediate use.
 */
export async function runOAuthFlow(vault: SafeStorageVault): Promise<GmailTokenSet> {
  const { clientId, clientSecret } = getOAuthAppCredentials();

  // Generate a random state parameter for CSRF protection.
  const state = Math.random().toString(36).slice(2);

  // access_type=offline: required for refresh token.
  // prompt=consent: forces Google to return a new refresh_token every flow.
  const authorizeUrl =
    `${AUTHORIZE_ENDPOINT}` +
    `?response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(OAUTH_CALLBACK_URI)}` +
    `&state=${state}` +
    `&scope=${encodeURIComponent(GMAIL_SCOPE)}` +
    `&access_type=offline` +
    `&prompt=consent`;

  // Open browser (Electron shell.openExternal in production; falls back to stdout).
  try {
    const { shell } = await import('electron');
    await shell.openExternal(authorizeUrl);
  } catch {
    // Non-Electron context (tests / CLI). Print URL for manual open.
    process.stdout.write(`Open this URL to authenticate:\n${authorizeUrl}\n`);
  }

  // Wait for the callback on localhost:53683/callback.
  const code = await waitForOAuthCallback(state);

  // Exchange the auth code for tokens.
  const tokenSet = await exchangeCodeForTokens(code, clientId, clientSecret);

  // Store refresh token via safeStorage. Access token is ephemeral — not stored.
  await vault.storeCredential(
    'gmail',
    tokenSet.refreshToken,
    'oauth_refresh_token',
    undefined, // refresh tokens don't expire on a fixed schedule
    { scope: GMAIL_SCOPE },
  );

  return tokenSet;
}

/**
 * Use a stored refresh token to obtain a new access token.
 * Called automatically by GmailClient on 401 responses.
 * Google returns expires_in (seconds) — convert to absolute Date.
 */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<Pick<GmailTokenSet, 'accessToken' | 'expiresAt'>> {
  const { clientId, clientSecret } = getOAuthAppCredentials();

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetchWithTimeout(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    if (text.includes('invalid_grant') || text.includes('token has been expired')) {
      throw new GmailAuthRevokedError(
        'Gmail refresh token rejected (invalid_grant). Re-authentication required.'
      );
    }
    throw new GmailNetworkError(`Token refresh failed: HTTP ${response.status} — ${text}`);
  }

  const data = await response.json() as {
    access_token: string;
    expires_in: number; // seconds from now
    token_type: string;
  };

  const expiresAt = new Date(Date.now() + data.expires_in * 1_000);

  return {
    accessToken: data.access_token,
    expiresAt,
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function waitForOAuthCallback(expectedState: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new GmailNetworkError('OAuth callback timed out after 120 seconds'));
    }, 120_000);

    const server = http.createServer((req, res) => {
      if (!req.url?.startsWith(OAUTH_CALLBACK_PATH)) {
        res.writeHead(404);
        res.end();
        return;
      }

      const url = new URL(req.url, `http://localhost:${OAUTH_CALLBACK_PORT}`);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body>Authentication failed. You may close this tab.</body></html>');
        clearTimeout(timeout);
        server.close();
        reject(new GmailAuthRevokedError(`OAuth error: ${error}`));
        return;
      }

      if (state !== expectedState) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<html><body>State mismatch. Possible CSRF. Close this tab.</body></html>');
        clearTimeout(timeout);
        server.close();
        reject(new Error('OAuth state mismatch — possible CSRF attack'));
        return;
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<html><body>No auth code received. You may close this tab.</body></html>');
        clearTimeout(timeout);
        server.close();
        reject(new GmailNetworkError('No authorization code in callback'));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(
        '<html><body>' +
        '<h2>C-Suite connected to Gmail.</h2>' +
        '<p>You may close this tab.</p>' +
        '</body></html>'
      );
      clearTimeout(timeout);
      server.close();
      resolve(code);
    });

    server.listen(OAUTH_CALLBACK_PORT, '127.0.0.1', () => {
      // Server is listening.
    });

    server.on('error', (err) => {
      clearTimeout(timeout);
      reject(new GmailNetworkError(`OAuth callback server error: ${err.message}`, err));
    });
  });
}

async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
): Promise<GmailTokenSet> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: OAUTH_CALLBACK_URI,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetchWithTimeout(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new GmailNetworkError(
      `Token exchange failed: HTTP ${response.status} — ${text}`
    );
  }

  const data = await response.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };

  const expiresAt = new Date(Date.now() + data.expires_in * 1_000);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
  };
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 30_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new GmailNetworkError(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw new GmailNetworkError(`Network error calling ${url}: ${String(err)}`, err);
  } finally {
    clearTimeout(timer);
  }
}
