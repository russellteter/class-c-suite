// apps/utility/src/mcp/google-workspace/auth.ts
// Source: docs/decisions/0016-google-workspace-output-surfaces.md §Decision
//
// Shared OAuth2 client factory for the Google Workspace wrappers.
// Reuses the 'gmail' vault entry — one Google OAuth app, one refresh token,
// five scopes (gmail.readonly + drive.file + docs + sheets + slides).
//
// Callers: createDoc, createSheet, createSlides, uploadFileToDrive.

import { google } from 'googleapis';
import type { SafeStorageVault } from '../../credentials/safeStorageVault.js';

export class GoogleWorkspaceAuthError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'GoogleWorkspaceAuthError';
  }
}

/**
 * Return an OAuth2Client pre-loaded with the refresh token from the 'gmail' vault entry.
 * The googleapis library refreshes the access token automatically on first API call.
 *
 * Throws GoogleWorkspaceAuthError when credentials are absent or env vars are missing.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getOAuth2Client(vault: SafeStorageVault): Promise<any> {
  const clientId = process.env['GMAIL_CLIENT_ID'];
  const clientSecret = process.env['GMAIL_CLIENT_SECRET'];
  if (!clientId || !clientSecret) {
    throw new GoogleWorkspaceAuthError(
      'GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET env vars not set — run the Connect flow first.',
    );
  }

  const cred = await vault.loadCredential('gmail');
  if (!cred) {
    throw new GoogleWorkspaceAuthError(
      'No Gmail/Workspace OAuth credential in vault — complete the Google Connect flow first.',
    );
  }

  // The vault stores either a raw refresh token string (legacy Gmail flow) or a JSON
  // blob ({ refreshToken, accessToken, ... }) written by OAuthTokenStore.
  let refreshToken: string;
  try {
    const parsed = JSON.parse(cred.plaintext) as { refreshToken?: string };
    refreshToken = parsed.refreshToken ?? cred.plaintext;
  } catch {
    // Not JSON — it's the raw refresh token from the legacy Gmail flow.
    refreshToken = cred.plaintext;
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });
  return auth;
}
