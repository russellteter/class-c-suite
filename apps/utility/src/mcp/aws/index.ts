// apps/utility/src/mcp/aws/index.ts
export { AWSClient } from './client.js';
export type { AWSProfile, DegradedSource, AWSCostResult, AWSOrganizationResult } from './client.js';
export {
  totalSpendQuery,
  monthlySpendQuery,
  combinedOrganizationAccounts,
  yearToDateSpendQuery,
} from './typed-queries.js';
export type { TotalSpendArgs } from './typed-queries.js';
export {
  AWSError,
  AWSProfileNotFoundError,
  AWSSSOExpiredError,
  AWSCostExplorerError,
} from './errors.js';
