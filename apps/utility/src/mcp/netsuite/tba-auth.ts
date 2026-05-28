// apps/utility/src/mcp/netsuite/tba-auth.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §5 + NetSuite TBA REST API docs.
//
// NetSuite Token-Based Authentication (TBA) — OAuth 1.0a with HMAC-SHA256.
// Generates the Authorization header for each REST request.
//
// Credentials arrive from Brian (BLOCKERS B1) and are stored via safeStorage.
// NEVER hard-code tokens here. NEVER log the generated signature.

import { createHmac, randomBytes } from 'crypto';

export interface TBACredentials {
  accountId: string;
  consumerKey: string;
  consumerSecret: string;
  tokenId: string;
  tokenSecret: string;
}

export interface TBAAuthHeader {
  Authorization: string;
}

/**
 * Generate a NetSuite TBA Authorization header for a given HTTP request.
 *
 * @param credentials  TBA credential set (from safeStorage vault).
 * @param method       HTTP method in UPPER_CASE (GET, POST, etc.).
 * @param url          Full request URL without query string.
 * @param queryParams  URL query parameters (used in signature base, not added to header).
 * @param nonce        16-byte hex nonce — injectable for deterministic tests.
 * @param timestamp    Unix epoch in seconds — injectable for deterministic tests.
 */
export function buildTBAAuthHeader(
  credentials: TBACredentials,
  method: string,
  url: string,
  queryParams: Record<string, string> = {},
  nonce?: string,
  timestamp?: number,
): TBAAuthHeader {
  const resolvedNonce = nonce ?? randomBytes(16).toString('hex');
  const resolvedTimestamp = timestamp ?? Math.floor(Date.now() / 1000);

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: credentials.consumerKey,
    oauth_nonce: resolvedNonce,
    oauth_signature_method: 'HMAC-SHA256',
    oauth_timestamp: String(resolvedTimestamp),
    oauth_token: credentials.tokenId,
    oauth_version: '1.0',
  };

  // Merge oauth params + query params for the signature base string.
  const allParams: Record<string, string> = { ...oauthParams, ...queryParams };

  // Percent-encode each key and value, sort lexicographically, join.
  const paramString = Object.keys(allParams)
    .sort()
    .map(k => `${percentEncode(k)}=${percentEncode(allParams[k] ?? '')}`)
    .join('&');

  const signatureBase = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramString),
  ].join('&');

  const signingKey = `${percentEncode(credentials.consumerSecret)}&${percentEncode(credentials.tokenSecret)}`;

  const signature = createHmac('sha256', signingKey)
    .update(signatureBase)
    .digest('base64');

  // Build OAuth Authorization header — only oauth_* params, not query params.
  const headerParams: Record<string, string> = {
    ...oauthParams,
    oauth_signature: signature,
    realm: credentials.accountId,
  };

  const headerStr =
    'OAuth ' +
    Object.keys(headerParams)
      .sort()
      .map(k => `${k}="${percentEncode(headerParams[k] ?? '')}"`)
      .join(', ');

  return { Authorization: headerStr };
}

/**
 * Parse a stored TBA credential JSON string into a TBACredentials object.
 * The stored value is a JSON blob containing the five token fields.
 * Throws if any required field is missing.
 */
export function parseTBACredentials(json: string): TBACredentials {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new Error(`Failed to parse TBA credentials JSON: ${String(err)}`);
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('TBA credentials must be a JSON object');
  }

  const obj = parsed as Record<string, unknown>;

  const required = ['accountId', 'consumerKey', 'consumerSecret', 'tokenId', 'tokenSecret'];
  for (const key of required) {
    if (typeof obj[key] !== 'string' || !(obj[key] as string).trim()) {
      throw new Error(`TBA credentials missing or empty field: '${key}'`);
    }
  }

  return {
    accountId: obj['accountId'] as string,
    consumerKey: obj['consumerKey'] as string,
    consumerSecret: obj['consumerSecret'] as string,
    tokenId: obj['tokenId'] as string,
    tokenSecret: obj['tokenSecret'] as string,
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * RFC 3986 percent-encoding — encodes all characters except unreserved:
 * A-Z a-z 0-9 - _ . ~
 */
function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, c => {
    return '%' + c.charCodeAt(0).toString(16).toUpperCase();
  });
}
