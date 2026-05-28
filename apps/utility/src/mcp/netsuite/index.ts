// apps/utility/src/mcp/netsuite/index.ts
export { NetSuiteClient } from './client.js';
export {
  cashGLBalanceQuery,
  payrollByDeptQuery,
  foreignTotalQuery,
  payrollBlindSpotQuery,
  revenueWith24MonthSkip,
  escapeSuiteQLString,
  assertSafeSuiteQLInt,
} from './typed-queries.js';
export type {
  CashGLBalanceArgs,
  PayrollByDeptArgs,
  ForeignTotalArgs,
  RevenueWith24MonthSkipArgs,
} from './typed-queries.js';
export {
  NetSuiteError,
  NetSuiteAuthMissingError,
  NetSuiteOAuthAppMissingError,
  NetSuiteAuthExpiredError,
  NetSuiteTBAExpiredError, // deprecated alias of NetSuiteAuthExpiredError
  NetSuiteSavedSearchNotFoundError,
  NetSuiteSuiteQLError,
  NetSuiteNetworkError,
  NetSuiteVaultError,
} from './errors.js';
export {
  NETSUITE_SCOPE,
  readNetSuiteOAuthEnv,
  buildNetSuiteOAuthConfig,
  requireNetSuiteOAuthConfig,
  netsuiteAuthorizeEndpoint,
  netsuiteTokenEndpoint,
} from './oauth-config.js';
export type { NetSuiteOAuthEnv } from './oauth-config.js';
