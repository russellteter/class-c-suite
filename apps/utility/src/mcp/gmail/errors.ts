// apps/utility/src/mcp/gmail/errors.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §3.4 + §7
// Typed error hierarchy for the Gmail MCP client.
// Errors propagate to playbooks via PrereqDecision (block/degrade/proceed).

export class GmailError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'GmailError';
  }
}

/** OAuth access token expired; refresh token still valid — triggers auto-refresh. */
export class GmailAuthExpiredError extends GmailError {
  constructor(message = 'Gmail access token expired') {
    super(message);
    this.name = 'GmailAuthExpiredError';
  }
}

/** Both access token AND refresh token invalid — user must re-authenticate via browser. */
export class GmailAuthRevokedError extends GmailError {
  constructor(message = 'Gmail refresh token revoked — re-authentication required') {
    super(message);
    this.name = 'GmailAuthRevokedError';
  }
}

/** A requested thread ID was not found (404). */
export class GmailThreadNotFoundError extends GmailError {
  constructor(public readonly threadId: string) {
    super(`Gmail thread '${threadId}' not found`);
    this.name = 'GmailThreadNotFoundError';
  }
}

/** Gmail API rate limit hit (429). */
export class GmailRateLimitedError extends GmailError {
  constructor(message = 'Gmail API rate limit exceeded') {
    super(message);
    this.name = 'GmailRateLimitedError';
  }
}

/** Network timeout reaching the Gmail API. */
export class GmailNetworkError extends GmailError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'GmailNetworkError';
  }
}

/** safeStorage vault unreachable during credential load. */
export class GmailVaultError extends GmailError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'GmailVaultError';
  }
}

/** OAuth App (client_id / client_secret) not yet configured — Russell action required. */
export class GmailOAuthAppMissingError extends GmailError {
  constructor() {
    super(
      'Gmail OAuth App client_id / client_secret not configured. ' +
      'Set GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET env vars. ' +
      'See docs/setup/gmail-oauth-app.md for setup steps.'
    );
    this.name = 'GmailOAuthAppMissingError';
  }
}
