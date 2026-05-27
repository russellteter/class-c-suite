// apps/utility/src/mcp/powerbi/index.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §9
export { PowerBIClient } from './subprocess.js';
export { preflightPowerBI, CUSTOMER_DASHBOARD_PATH } from './preflight.js';
export type { PowerBIPreflightResult } from './preflight.js';
export {
  CustomerDashboardRecordSchema,
  CustomerDashboardDataSchema,
} from './schema.js';
export type { CustomerDashboardRecord, CustomerDashboardData } from './schema.js';
export {
  PowerBIPythonMissingError,
  PowerBIVenvMissingError,
  PowerBISubprocessError,
  PowerBIJsonInvalidError,
} from './errors.js';
