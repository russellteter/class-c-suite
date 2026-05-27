/**
 * Vitest config for fuzz tests (tests/fuzz/**).
 * Run via: pnpm test:fuzz
 * NOT included in pnpm test:unit (tests/unit/**).
 *
 * Source: docs/decisions/0003-ch2-safewrite.md §6.1
 * "runs as part of `pnpm test:fuzz` (CI conditional step: only if tests/fuzz/ exists)"
 */

import { defineConfig } from 'vitest/config';
import { resolve, extname } from 'path';
import type { Plugin } from 'vite';

function remapJsToTs(): Plugin {
  return {
    name: 'remap-js-to-ts',
    enforce: 'pre',
    async resolveId(id, importer, options) {
      if (!importer) return null;
      if (extname(id) !== '.js') return null;
      const tsId = id.replace(/\.js$/, '.ts');
      const result = await this.resolve(tsId, importer, { ...options, skipSelf: true });
      if (result) return result;
      return null;
    },
  };
}

export default defineConfig({
  plugins: [remapJsToTs()],
  test: {
    include: ['tests/fuzz/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    reporters: ['verbose'],
    // Fuzz tests are resource-intensive; pool=forks + single thread prevents interference.
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    testTimeout: 30_000,
    hookTimeout: 15_000,
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
      'electron': resolve(__dirname, 'apps/main/node_modules/electron/index.js'),
    },
  },
});
