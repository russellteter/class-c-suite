// packages/shared-types/src/index.ts
// Barrel export — re-exports all public surfaces from this package.
// Subpath imports (./ipc, ./parseArtifact, etc.) are preferred at
// Electron runtime. This barrel is for convenience and the . export.
export * from './ipc.js';
export * from './vault-schemas.js';
export * from './parseArtifact.js';
export * from './normalizeKeys.js';
export * from './verifier-output.js';
