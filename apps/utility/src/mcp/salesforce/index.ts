// apps/utility/src/mcp/salesforce/index.ts
export { SalesforceClient } from './client.js';
export {
  committedPipelineQuery,
  accountAMHealthQuery,
  renewalForecastQuery,
  topAccountsByAMQuery,
  openOpportunityByAccountQuery,
  recentlyClosedWonQuery,
  escapeSoqlString,
  assertSafeInt,
} from './typed-queries.js';
export type {
  CommittedPipelineArgs,
  AccountAMHealthArgs,
  RenewalForecastArgs,
  TopAccountsByAMArgs,
  OpenOpportunityByAccountArgs,
  RecentlyClosedWonArgs,
} from './typed-queries.js';
export {
  SalesforceError,
  SalesforceAuthExpiredError,
  SalesforceAuthRevokedError,
  SalesforceFieldNotFoundError,
  SalesforceNetworkError,
  SalesforceQueryError,
  SalesforceVaultError,
  SalesforceConnectedAppMissingError,
} from './errors.js';
export { runOAuthFlow, refreshAccessToken } from './oauth-flow.js';
export type { SalesforceTokenSet } from './oauth-flow.js';
