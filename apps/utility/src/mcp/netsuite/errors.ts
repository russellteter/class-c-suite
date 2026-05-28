// apps/utility/src/mcp/netsuite/errors.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §3.4 + §5
// Typed error hierarchy for the NetSuite MCP client.
// Errors propagate to playbooks via PrereqDecision (block/degrade/proceed).

export class NetSuiteError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'NetSuiteError';
  }
}

/** OAuth credentials not present in vault — client runs degraded (returns null). */
export class NetSuiteAuthMissingError extends NetSuiteError {
  constructor(
    message = 'NetSuite OAuth credential not in vault — run the Connect flow in Settings → Connectors → NetSuite.'
  ) {
    super(message);
    this.name = 'NetSuiteAuthMissingError';
  }
}

/** OAuth bootstrap values missing from env — Russell must register the Integration Record. */
export class NetSuiteOAuthAppMissingError extends NetSuiteError {
  constructor(
    message = 'NETSUITE_OAUTH_CLIENT_ID missing — register a NetSuite OAuth 2.0 Integration Record (public client, scope=mcp) and set NETSUITE_OAUTH_CLIENT_ID in apps/main/.env.local.'
  ) {
    super(message);
    this.name = 'NetSuiteOAuthAppMissingError';
  }
}

/**
 * OAuth access/refresh token rejected (401, or refresh returns invalid_grant) —
 * the grant was revoked or expired; Russell must re-run the Connect flow.
 */
export class NetSuiteAuthExpiredError extends NetSuiteError {
  constructor(message = 'NetSuite OAuth token rejected — re-authenticate in Settings → Connectors → NetSuite.') {
    super(message);
    this.name = 'NetSuiteAuthExpiredError';
  }
}

/**
 * Back-compat alias for the pre-OAuth name. External importers (index.ts, tests)
 * referenced NetSuiteTBAExpiredError; keep the symbol so nothing breaks while the
 * meaning moves to OAuth. Prefer NetSuiteAuthExpiredError in new code.
 * @deprecated use NetSuiteAuthExpiredError
 */
export const NetSuiteTBAExpiredError = NetSuiteAuthExpiredError;

/** A referenced Saved Search ID was not found or not accessible. */
export class NetSuiteSavedSearchNotFoundError extends NetSuiteError {
  constructor(public readonly searchId: string) {
    super(`NetSuite Saved Search '${searchId}' not found or inaccessible`);
    this.name = 'NetSuiteSavedSearchNotFoundError';
  }
}

/** A SuiteQL query returned an API-level error. */
export class NetSuiteSuiteQLError extends NetSuiteError {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(`[${code}] ${message}`);
    this.name = 'NetSuiteSuiteQLError';
  }
}

/** safeStorage vault unreachable during credential load. */
export class NetSuiteVaultError extends NetSuiteError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'NetSuiteVaultError';
  }
}

/** Network timeout or connectivity failure reaching the NetSuite REST API. */
export class NetSuiteNetworkError extends NetSuiteError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'NetSuiteNetworkError';
  }
}
