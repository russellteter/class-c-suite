// apps/utility/src/mcp/salesforce/oauth-flow.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §4
//
// Connected App OAuth 2.0 Authorization Code grant for Salesforce.
// Flow:
//   1. Open browser → classedu.my.salesforce.com/services/oauth2/authorize
//   2. Listen on localhost:53682/callback
//   3. Exchange auth code for refresh token
//   4. storeCredential('salesforce', refreshToken, 'oauth_refresh_token', ...)
//
// Russell creates the Connected App in the Class org; this file reads
// client_id + client_secret from env vars as bootstrap (safeStorage stores
// the refresh token thereafter — credentials rotate without user action).
//
// See docs/setup/salesforce-connected-app.md for Connected App setup steps.

import * as http from 'http';
import { URL } from 'url';
import type { SafeStorageVault } from '../../credentials/safeStorageVault.js';
import {
  SalesforceConnectedAppMissingError,
  SalesforceAuthRevokedError,
  SalesforceNetworkError,
} from './errors.js';

const SALESFORCE_INSTANCE = 'https://classedu.my.salesforce.com';
const OAUTH_CALLBACK_PORT = 53682;
const OAUTH_CALLBACK_PATH = '/callback';
const OAUTH_CALLBACK_URI = `http://localhost:${OAUTH_CALLBACK_PORT}${OAUTH_CALLBACK_PATH}`;
const TOKEN_ENDPOINT = `${SALESFORCE_INSTANCE}/services/oauth2/token`;
const AUTHORIZE_ENDPOINT = `${SALESFORCE_INSTANCE}/services/oauth2/authorize`;

export interface SalesforceTokenSet {
  accessToken: string;
  refreshToken: string;
  instanceUrl: string;
  issuedAt: number;
}

/**
 * Read Connected App credentials from env vars.
 * These are bootstrap values — Russell populates them once after creating
 * the Connected App. The refresh token is subsequently stored in safeStorage.
 */
function getConnectedAppCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env['SALESFORCE_CLIENT_ID'];
  const clientSecret = process.env['SALESFORCE_CLIENT_SECRET'];
  if (!clientId || !clientSecret) {
    throw new SalesforceConnectedAppMissingError();
  }
  return { clientId, clientSecret };
}

/**
 * Run the full OAuth Authorization Code grant.
 * Opens the system browser, waits for the callback, exchanges the code for tokens.
 * Stores the refresh token via safeStorage.
 *
 * Returns the live access token for immediate use.
 */
export async function runOAuthFlow(vault: SafeStorageVault): Promise<SalesforceTokenSet> {
  const { clientId, clientSecret } = getConnectedAppCredentials();

  // Generate a random state parameter for CSRF protection.
  const state = Math.random().toString(36).slice(2);

  const authorizeUrl =
    `${AUTHORIZE_ENDPOINT}` +
    `?response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(OAUTH_CALLBACK_URI)}` +
    `&state=${state}` +
    `&scope=api refresh_token`;

  // Open browser (Electron shell.openExternal in production; falls back to process.env trick).
  try {
    const { shell } = await import('electron');
    await shell.openExternal(authorizeUrl);
  } catch {
    // Non-Electron context (tests / CLI). Print URL for manual open.
    process.stdout.write(`Open this URL to authenticate:\n${authorizeUrl}\n`);
  }

  // Wait for the callback on localhost:53682/callback.
  const code = await waitForOAuthCallback(state);

  // Exchange the auth code for tokens.
  const tokenSet = await exchangeCodeForTokens(code, clientId, clientSecret);

  // Store refresh token via safeStorage. Access token is ephemeral — not stored.
  await vault.storeCredential(
    'salesforce',
    tokenSet.refreshToken,
    'oauth_refresh_token',
    undefined, // refresh tokens don't expire on a fixed schedule
    { instanceUrl: tokenSet.instanceUrl, issuedAt: tokenSet.issuedAt },
  );

  return tokenSet;
}

/**
 * Use a stored refresh token to obtain a new access token.
 * Called automatically by SalesforceClient on 401 responses.
 */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<Pick<SalesforceTokenSet, 'accessToken' | 'instanceUrl' | 'issuedAt'>> {
  const { clientId, clientSecret } = getConnectedAppCredentials();

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
    if (text.includes('invalid_grant')) {
      throw new SalesforceAuthRevokedError(
        'Salesforce refresh token rejected (invalid_grant). Re-authentication required.'
      );
    }
    throw new SalesforceNetworkError(`Token refresh failed: HTTP ${response.status} — ${text}`);
  }

  const data = await response.json() as {
    access_token: string;
    instance_url: string;
    issued_at: string;
  };

  return {
    accessToken: data.access_token,
    instanceUrl: data.instance_url,
    issuedAt: parseInt(data.issued_at, 10),
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function waitForOAuthCallback(expectedState: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new SalesforceNetworkError('OAuth callback timed out after 120 seconds'));
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
        reject(new SalesforceAuthRevokedError(`OAuth error: ${error}`));
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
        reject(new SalesforceNetworkError('No authorization code in callback'));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(
        '<html><body>' +
        '<h2>C-Suite connected to Salesforce.</h2>' +
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
      reject(new SalesforceNetworkError(`OAuth callback server error: ${err.message}`, err));
    });
  });
}

async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
): Promise<SalesforceTokenSet> {
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
    throw new SalesforceNetworkError(
      `Token exchange failed: HTTP ${response.status} — ${text}`
    );
  }

  const data = await response.json() as {
    access_token: string;
    refresh_token: string;
    instance_url: string;
    issued_at: string;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    instanceUrl: data.instance_url,
    issuedAt: parseInt(data.issued_at, 10),
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
      throw new SalesforceNetworkError(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw new SalesforceNetworkError(`Network error calling ${url}: ${String(err)}`, err);
  } finally {
    clearTimeout(timer);
  }
}
