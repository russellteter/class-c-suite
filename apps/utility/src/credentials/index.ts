// apps/utility/src/credentials/index.ts
// Re-exports for the credentials module.
// Supported serviceIds: 'salesforce' | 'netsuite' | 'aws' | 'gmail' | 'chorus' | 'powerbi'
// (see McpServiceId in @c-suite/shared-types/mcp)
export {
  SafeStorageVault,
  getVault,
  storeCredential,
  loadCredential,
  deleteCredential,
} from './safeStorageVault.js';
export type { SafeStorageAdapter, LoadedCredential } from './safeStorageVault.js';
