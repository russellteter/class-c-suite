// apps/utility/src/mcp/oauth/pkce.ts
// Source: docs/decisions/0015-netsuite-oauth-migration.md §2
//
// PKCE (RFC 7636) primitives — provider-agnostic. Reused by any OAuth 2.0
// authorization-code client (NetSuite first; Gmail to adopt — see report note).
//
// S256 method only (NetSuite requires it for public clients; Google supports it).
// No secrets persisted here; the verifier lives only for the duration of one
// authorize→token round-trip.

import crypto from 'crypto';

export interface PkcePair {
  /** High-entropy random string (43-128 chars per RFC 7636 §4.1). Sent on the token request. */
  verifier: string;
  /** BASE64URL(SHA256(verifier)). Sent on the authorize request. */
  challenge: string;
  /** Always 'S256' — the only method we use. */
  method: 'S256';
}

/** base64url with no padding (RFC 7636 Appendix A). */
function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Generate a fresh PKCE verifier/challenge pair.
 * The verifier is 32 random bytes → 43-char base64url string (well within RFC bounds).
 */
export function generatePkcePair(): PkcePair {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge, method: 'S256' };
}

/**
 * Generate a random opaque `state` value for CSRF protection on the authorize request.
 * Returned to the loopback callback and compared for exact equality.
 */
export function generateState(): string {
  return base64url(crypto.randomBytes(16));
}
