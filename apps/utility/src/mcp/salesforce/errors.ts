// apps/utility/src/mcp/salesforce/errors.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §3.4 + §4
// Typed error hierarchy for the Salesforce MCP client.
// Errors propagate to playbooks via PrereqDecision (block/degrade/proceed).

export class SalesforceError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'SalesforceError';
  }
}

/** OAuth access token expired; refresh token still valid — triggers auto-refresh. */
export class SalesforceAuthExpiredError extends SalesforceError {
  constructor(message = 'Salesforce access token expired') {
    super(message);
    this.name = 'SalesforceAuthExpiredError';
  }
}

/** Both access token AND refresh token invalid — user must re-authenticate via browser. */
export class SalesforceAuthRevokedError extends SalesforceError {
  constructor(message = 'Salesforce refresh token revoked — re-authentication required') {
    super(message);
    this.name = 'SalesforceAuthRevokedError';
  }
}

/** A field referenced in a SOQL query does not exist on the object. */
export class SalesforceFieldNotFoundError extends SalesforceError {
  constructor(public readonly fieldName: string, public readonly objectName: string) {
    super(`Field '${fieldName}' not found on object '${objectName}'`);
    this.name = 'SalesforceFieldNotFoundError';
  }
}

/** Network timeout reaching the Salesforce API. */
export class SalesforceNetworkError extends SalesforceError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'SalesforceNetworkError';
  }
}

/** SOQL query returned an API-level error. */
export class SalesforceQueryError extends SalesforceError {
  constructor(
    public readonly errorCode: string,
    message: string,
  ) {
    super(`[${errorCode}] ${message}`);
    this.name = 'SalesforceQueryError';
  }
}

/** safeStorage vault unreachable during credential load. */
export class SalesforceVaultError extends SalesforceError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'SalesforceVaultError';
  }
}

/** Connected App not yet configured — Russell action required. */
export class SalesforceConnectedAppMissingError extends SalesforceError {
  constructor() {
    super(
      'Salesforce Connected App client_id / client_secret not configured. ' +
      'See docs/setup/salesforce-connected-app.md for setup steps.'
    );
    this.name = 'SalesforceConnectedAppMissingError';
  }
}
