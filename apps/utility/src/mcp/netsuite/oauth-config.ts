// apps/utility/src/mcp/netsuite/oauth-config.ts
// Source: docs/decisions/0015-netsuite-oauth-migration.md §1
//
// NetSuite AI Connector Service (hosted remote MCP server) OAuth 2.0 config.
// Confirmed against Oracle NetSuite Help Center + Dust NetSuite connector guide, 2026-05-28:
//   - Transport:  remote MCP, streamable HTTP, protocol 2025-06-18
//   - MCP URL:    https://<acct>.suitetalk.api.netsuite.com/services/mcp/v1/all  (env-overridable)
//   - Authorize:  https://<acct>.app.netsuite.com/app/login/oauth2/authorize.nl
//   - Token:      https://<acct>.suitetalk.api.netsuite.com/services/rest/auth/oauth2/v1/token
//   - Scope:      mcp   (the "NetSuite AI Connector Service" scope — NOT rest_webservices)
//   - Grant:      Authorization Code + PKCE (S256), PUBLIC CLIENT, NO client secret
//   - Role perms: MCP Server Connection + "Log in using OAuth 2.0 Access Tokens" (+ REST Web
//                 Services so the SuiteQL tool is visible). Admin role is blocked by design.
//
// Sources:
//   https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_4160616848.html (AI Connector FAQ — Auth Code + PKCE)
//   https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_0902023508.html (Available Tools — SuiteQL/Saved Search tools)
//   https://docs.dust.tt/docs/netsuite (config table: Scope = `mcp`, authorize + token URLs)

import type { OAuthProviderConfig } from '../oauth/authCodeFlow.js';
import { OAUTH_REDIRECT_URI } from '../oauth/loopbackServer.js';
import { NetSuiteOAuthAppMissingError } from './errors.js';

/** The NetSuite AI Connector Service OAuth scope. */
export const NETSUITE_SCOPE = 'mcp';

export function netsuiteAuthorizeEndpoint(accountId: string): string {
  return `https://${accountId}.app.netsuite.com/app/login/oauth2/authorize.nl`;
}

export function netsuiteTokenEndpoint(accountId: string): string {
  return `https://${accountId}.suitetalk.api.netsuite.com/services/rest/auth/oauth2/v1/token`;
}

/** Default hosted MCP server URL (overridable via NETSUITE_MCP_SERVER_URL). */
export function defaultNetsuiteMcpServerUrl(accountId: string): string {
  return `https://${accountId}.suitetalk.api.netsuite.com/services/mcp/v1/all`;
}

export interface NetSuiteOAuthEnv {
  accountId: string;
  clientId: string;
  /**
   * OAuth client secret. Present for a CONFIDENTIAL AI-Connector integration record
   * (Russell's record carries a Consumer Secret); sent on the token exchange
   * alongside PKCE. Absent for a strict public client. NEVER logged.
   */
  clientSecret?: string;
  /** Redirect URI registered in the Integration Record. Must match byte-for-byte. */
  redirectUri: string;
  /** Hosted remote MCP server URL. */
  mcpServerUrl: string;
}

/**
 * Read NetSuite OAuth bootstrap values from env (apps/main/.env.local).
 * Returns null unless account ID + client ID are present.
 * PUBLIC CLIENT — there is intentionally NO client secret. NEVER logged.
 *
 * Env contract (exactly three NetSuite OAuth vars):
 *   NETSUITE_ACCOUNT_ID
 *   NETSUITE_OAUTH_CLIENT_ID
 *   NETSUITE_OAUTH_REDIRECT_URI   (default http://localhost:8765/oauth/callback)
 *   NETSUITE_MCP_SERVER_URL       (default the suitetalk /services/mcp/v1/all URL)
 */
export function readNetSuiteOAuthEnv(): NetSuiteOAuthEnv | null {
  const accountId = process.env['NETSUITE_ACCOUNT_ID'];
  const clientId = process.env['NETSUITE_OAUTH_CLIENT_ID'];
  if (!accountId || !clientId) return null;
  const clientSecret = process.env['NETSUITE_OAUTH_CLIENT_SECRET'];
  return {
    accountId,
    clientId,
    ...(clientSecret ? { clientSecret } : {}),
    redirectUri: process.env['NETSUITE_OAUTH_REDIRECT_URI'] || OAUTH_REDIRECT_URI,
    mcpServerUrl: process.env['NETSUITE_MCP_SERVER_URL'] || defaultNetsuiteMcpServerUrl(accountId),
  };
}

/** Build the provider config consumed by the shared OAuth primitives (public client, no secret). */
export function buildNetSuiteOAuthConfig(env: NetSuiteOAuthEnv): OAuthProviderConfig {
  return {
    serviceLabel: 'NetSuite',
    authorizeEndpoint: netsuiteAuthorizeEndpoint(env.accountId),
    tokenEndpoint: netsuiteTokenEndpoint(env.accountId),
    clientId: env.clientId,
    // Confidential AI-Connector client: secret sent on token exchange alongside PKCE.
    // Omitted (public client) when NETSUITE_OAUTH_CLIENT_SECRET is unset.
    ...(env.clientSecret ? { clientSecret: env.clientSecret } : {}),
    scope: NETSUITE_SCOPE,
    redirectUri: env.redirectUri,
  };
}

/** Read env + build config, or throw if the bootstrap values are absent. */
export function requireNetSuiteOAuthConfig(): OAuthProviderConfig {
  const env = readNetSuiteOAuthEnv();
  if (!env) throw new NetSuiteOAuthAppMissingError();
  return buildNetSuiteOAuthConfig(env);
}
