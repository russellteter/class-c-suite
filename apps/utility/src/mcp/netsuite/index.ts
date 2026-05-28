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
  NetSuiteTBAExpiredError,
  NetSuiteSavedSearchNotFoundError,
  NetSuiteSuiteQLError,
  NetSuiteNetworkError,
  NetSuiteVaultError,
} from './errors.js';
export { buildTBAAuthHeader, parseTBACredentials } from './tba-auth.js';
export type { TBACredentials, TBAAuthHeader } from './tba-auth.js';
