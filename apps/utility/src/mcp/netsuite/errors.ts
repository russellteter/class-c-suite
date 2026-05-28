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

/** TBA credentials not present in vault — client runs degraded (returns null). */
export class NetSuiteAuthMissingError extends NetSuiteError {
  constructor(
    message = 'NetSuite TBA credentials not in vault — awaiting Brian (BLOCKERS B1). Run reconnect() after tokens are provisioned.'
  ) {
    super(message);
    this.name = 'NetSuiteAuthMissingError';
  }
}

/** TBA token expired (401 from REST) — Russell must re-paste tokens from Brian. */
export class NetSuiteTBAExpiredError extends NetSuiteError {
  constructor(message = 'NetSuite TBA token expired — re-paste credentials from Brian into Settings') {
    super(message);
    this.name = 'NetSuiteTBAExpiredError';
  }
}

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
