import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    reporters: ['verbose'],
    env: {
      STUB_MODE: 'replay',
    },
  },
  resolve: {
    alias: {
      '@c-suite/shared-types/normalizeKeys': resolve(__dirname, 'packages/shared-types/src/normalizeKeys.ts'),
      '@c-suite/shared-types/parseArtifact': resolve(__dirname, 'packages/shared-types/src/parseArtifact.ts'),
      '@c-suite/shared-types/vault-schemas': resolve(__dirname, 'packages/shared-types/src/vault-schemas.ts'),
      '@c-suite/shared-types/ipc': resolve(__dirname, 'packages/shared-types/src/ipc.ts'),
      '@c-suite/shared-types': resolve(__dirname, 'packages/shared-types/src'),
      '@c-suite/stub-harness/stub': resolve(__dirname, 'packages/stub-harness/src/stub.ts'),
      '@c-suite/stub-harness': resolve(__dirname, 'packages/stub-harness/src'),
    },
  },
});
