// apps/utility/src/mcp/oauth/loopbackServer.ts
// Source: docs/decisions/0015-netsuite-oauth-migration.md §2
//
// Local-loopback redirect listener for OAuth 2.0 authorization-code grant.
// Provider-agnostic. Binds 127.0.0.1 on a FIXED port (default 8765) so the
// redirect URI registered in the provider's Integration Record matches exactly.
//
// REDIRECT-URI CONTRACT (the #1 OAuth failure mode is a mismatch):
//   http://localhost:8765/oauth/callback   ← must match the Integration Record byte-for-byte.
// Keep this constant fixed. If you change the port, change it in the provider config too.

import * as http from 'http';
import { URL } from 'url';

/** Fixed loopback port. Pinned per coordinator directive 2026-05-28. */
export const OAUTH_LOOPBACK_PORT = 8765;
/** Fixed callback path. */
export const OAUTH_LOOPBACK_PATH = '/oauth/callback';
/** The exact redirect URI to register in the provider Integration Record. */
export const OAUTH_REDIRECT_URI = `http://localhost:${OAUTH_LOOPBACK_PORT}${OAUTH_LOOPBACK_PATH}`;

export interface LoopbackResult {
  /** The authorization code from the provider redirect. */
  code: string;
}

export interface LoopbackOptions {
  /** Opaque state generated for this flow; the callback must echo it back exactly. */
  expectedState: string;
  /** Override the port (tests). Defaults to OAUTH_LOOPBACK_PORT. */
  port?: number;
  /** Override the path (tests). Defaults to OAUTH_LOOPBACK_PATH. */
  path?: string;
  /** Abort + reject after this many ms with no callback. Default 120s. */
  timeoutMs?: number;
  /** Service name shown on the success page (e.g. "NetSuite"). */
  serviceLabel?: string;
}

export class OAuthLoopbackError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'OAuthLoopbackError';
  }
}

/**
 * Start a one-shot loopback HTTP server, wait for the provider to redirect with
 * an authorization code, validate `state`, and resolve with the code.
 *
 * The server is closed before the promise settles (success or failure).
 * On state mismatch / provider error / timeout → rejects with OAuthLoopbackError.
 */
export function waitForOAuthRedirect(options: LoopbackOptions): Promise<LoopbackResult> {
  const port = options.port ?? OAUTH_LOOPBACK_PORT;
  const path = options.path ?? OAUTH_LOOPBACK_PATH;
  const timeoutMs = options.timeoutMs ?? 120_000;
  const label = options.serviceLabel ?? 'the service';

  return new Promise<LoopbackResult>((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new OAuthLoopbackError(`OAuth callback timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const finish = (fn: () => void) => {
      clearTimeout(timeout);
      server.close();
      fn();
    };

    const server = http.createServer((req, res) => {
      if (!req.url || !req.url.startsWith(path)) {
        res.writeHead(404);
        res.end();
        return;
      }

      const url = new URL(req.url, `http://localhost:${port}`);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      if (error) {
        const desc = url.searchParams.get('error_description') ?? '';
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body>Authentication failed. You may close this tab.</body></html>');
        finish(() => reject(new OAuthLoopbackError(`OAuth provider returned error: ${error} ${desc}`.trim())));
        return;
      }

      if (state !== options.expectedState) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<html><body>State mismatch. Possible CSRF. Close this tab.</body></html>');
        finish(() => reject(new OAuthLoopbackError('OAuth state mismatch — possible CSRF attack')));
        return;
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<html><body>No authorization code received. You may close this tab.</body></html>');
        finish(() => reject(new OAuthLoopbackError('No authorization code in callback')));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(
        `<html><body><h2>C-Suite connected to ${label}.</h2>` +
        '<p>You may close this tab.</p></body></html>'
      );
      finish(() => resolve({ code }));
    });

    server.on('error', (err) => {
      finish(() => reject(new OAuthLoopbackError(`OAuth loopback server error: ${err.message}`, err)));
    });

    server.listen(port, '127.0.0.1');
  });
}
