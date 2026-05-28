// apps/utility/src/mcp/oauth/tokenStore.ts
// Source: docs/decisions/0015-netsuite-oauth-migration.md §2
//
// Provider-agnostic OAuth token persistence + auto-refresh, layered over SafeStorageVault.
// Stores the refresh token (long-lived) plus the last access token + its expiry as a
// JSON blob under the service's vault entry (credential_type 'oauth_refresh_token').
//
// getAccessToken() returns a valid access token, refreshing automatically when within
// REFRESH_SKEW_MS of expiry. The refresh token is rotated in-place if the provider
// returns a new one (NetSuite does on refresh; we persist whatever comes back).

import type { SafeStorageVault } from '../../credentials/safeStorageVault.js';
import type { McpServiceId } from '@c-suite/shared-types/mcp';
import {
  refreshAccessToken,
  type OAuthProviderConfig,
  type OAuthTokenSet,
} from './authCodeFlow.js';

/** Refresh the access token this many ms before it actually expires. */
export const REFRESH_SKEW_MS = 5 * 60 * 1000; // 5 minutes

/** Shape persisted in the vault (JSON-encoded plaintext). */
interface StoredOAuthBlob {
  refreshToken: string;
  accessToken?: string;
  accessTokenExpiresAt?: number; // epoch ms
  scope?: string;
}

export class OAuthTokenStoreError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'OAuthTokenStoreError';
  }
}

export class OAuthTokenStore {
  constructor(
    private readonly vault: SafeStorageVault,
    private readonly serviceId: McpServiceId,
    private readonly config: OAuthProviderConfig,
  ) {}

  /** Persist a freshly-issued token set (called after the authorize flow completes). */
  async persistTokenSet(tokenSet: OAuthTokenSet): Promise<void> {
    const blob: StoredOAuthBlob = {
      refreshToken: tokenSet.refreshToken,
      accessToken: tokenSet.accessToken,
      accessTokenExpiresAt: tokenSet.expiresAt.getTime(),
      ...(tokenSet.scope !== undefined ? { scope: tokenSet.scope } : {}),
    };
    // expiresAt on the vault row tracks the REFRESH token's validity; OAuth refresh
    // tokens are long-lived and effectively non-expiring for our purposes, so we
    // store undefined (non-expiring) and gate access-token freshness inside the blob.
    await this.vault.storeCredential(
      this.serviceId,
      JSON.stringify(blob),
      'oauth_refresh_token',
      undefined,
      { scope: this.config.scope },
    );
  }

  /** True when a refresh token is present in the vault. */
  async hasRefreshToken(): Promise<boolean> {
    const blob = await this.loadBlob();
    return blob !== null && blob.refreshToken.length > 0;
  }

  /**
   * Return a valid access token, refreshing if absent or within REFRESH_SKEW_MS of expiry.
   * Throws OAuthTokenStoreError when no refresh token is stored (caller must run the flow).
   */
  async getAccessToken(): Promise<string> {
    const blob = await this.loadBlob();
    if (!blob || !blob.refreshToken) {
      throw new OAuthTokenStoreError(
        `No ${this.serviceId} OAuth credential in vault — run the Connect flow first.`,
      );
    }

    const fresh =
      blob.accessToken &&
      blob.accessTokenExpiresAt &&
      Date.now() < blob.accessTokenExpiresAt - REFRESH_SKEW_MS;

    if (fresh && blob.accessToken) {
      return blob.accessToken;
    }

    // Refresh.
    const refreshed = await refreshAccessToken(this.config, blob.refreshToken);
    const next: StoredOAuthBlob = {
      refreshToken: refreshed.refreshToken ?? blob.refreshToken,
      accessToken: refreshed.accessToken,
      accessTokenExpiresAt: refreshed.expiresAt.getTime(),
      ...(blob.scope !== undefined ? { scope: blob.scope } : {}),
    };
    await this.vault.storeCredential(
      this.serviceId,
      JSON.stringify(next),
      'oauth_refresh_token',
      undefined,
      { scope: this.config.scope },
    );
    return refreshed.accessToken;
  }

  /** Forget the stored tokens (used on Disconnect / revoked-grant). */
  async clear(): Promise<void> {
    await this.vault.deleteCredential(this.serviceId);
  }

  private async loadBlob(): Promise<StoredOAuthBlob | null> {
    let cred: { plaintext: string } | null;
    try {
      cred = await this.vault.loadCredential(this.serviceId);
    } catch (err) {
      throw new OAuthTokenStoreError(`Failed to load ${this.serviceId} credential from vault`, err);
    }
    if (!cred) return null;
    try {
      return JSON.parse(cred.plaintext) as StoredOAuthBlob;
    } catch (err) {
      throw new OAuthTokenStoreError(`Corrupt ${this.serviceId} OAuth blob in vault`, err);
    }
  }
}
