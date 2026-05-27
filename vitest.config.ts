import { defineConfig } from 'vitest/config';
import { resolve, extname } from 'path';
import { existsSync } from 'fs';
import type { Plugin } from 'vite';

/**
 * Vite plugin: remap relative .js imports to .ts in test context.
 * Required for Node16 ESM (.js extension required in source) when
 * tests import apps/* workspace modules that haven't been compiled.
 */
function remapJsToTs(): Plugin {
  return {
    name: 'remap-js-to-ts',
    enforce: 'pre',
    async resolveId(id, importer, options) {
      if (!importer) return null;
      if (extname(id) !== '.js') return null;

      // Try replacing .js with .ts
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
    include: ['tests/unit/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    reporters: ['verbose'],
    env: {
      STUB_MODE: 'replay',
    },
    deps: {
      // Inline safeWrite/vaultWatcher packages so Vite processes them and
      // vi.spyOn(fs, ...) can intercept calls inside these modules.
      // Required by safewrite.spec.ts AC-3/AC-4 (vi.spyOn on fs/promises).
      inline: [/@c-suite\/vault-writer/, /@c-suite\/vault-watcher/],
    },
  },
  resolve: {
    alias: {
      '@c-suite/shared-types/normalizeKeys': resolve(__dirname, 'packages/shared-types/src/normalizeKeys.ts'),
      '@c-suite/shared-types/parseArtifact': resolve(__dirname, 'packages/shared-types/src/parseArtifact.ts'),
      '@c-suite/shared-types/vault-schemas': resolve(__dirname, 'packages/shared-types/src/vault-schemas.ts'),
      '@c-suite/shared-types/ipc': resolve(__dirname, 'packages/shared-types/src/ipc.ts'),
      // Ch.3 subpath aliases
      '@c-suite/shared-types/run-state': resolve(__dirname, 'packages/shared-types/src/run-state.ts'),
      '@c-suite/shared-types/run-state-schema': resolve(__dirname, 'packages/shared-types/src/run-state-schema.ts'),
      '@c-suite/shared-types/agent-definition': resolve(__dirname, 'packages/shared-types/src/agent-definition.ts'),
      '@c-suite/shared-types/lens-output': resolve(__dirname, 'packages/shared-types/src/lens-output.ts'),
      '@c-suite/shared-types/lens-context-bundle': resolve(__dirname, 'packages/shared-types/src/lens-context-bundle.ts'),
      '@c-suite/shared-types/verifier-input': resolve(__dirname, 'packages/shared-types/src/verifier-input.ts'),
      '@c-suite/shared-types/verifier-output': resolve(__dirname, 'packages/shared-types/src/verifier-output.ts'),
      '@c-suite/shared-types/run-plan': resolve(__dirname, 'packages/shared-types/src/run-plan.ts'),
      '@c-suite/shared-types/memo': resolve(__dirname, 'packages/shared-types/src/memo.ts'),
      '@c-suite/shared-types/red-team': resolve(__dirname, 'packages/shared-types/src/red-team.ts'),
      '@c-suite/shared-types/steelman': resolve(__dirname, 'packages/shared-types/src/steelman.ts'),
      '@c-suite/shared-types/writeback': resolve(__dirname, 'packages/shared-types/src/writeback.ts'),
      '@c-suite/shared-types/run-critique': resolve(__dirname, 'packages/shared-types/src/run-critique.ts'),
      '@c-suite/shared-types': resolve(__dirname, 'packages/shared-types/src'),
      '@c-suite/stub-harness/stub': resolve(__dirname, 'packages/stub-harness/src/stub.ts'),
      '@c-suite/stub-harness': resolve(__dirname, 'packages/stub-harness/src'),
      // Ch.2 packages (vault-writer, vault-watcher) — source-direct for tests.
      '@c-suite/vault-writer': resolve(__dirname, 'packages/vault-writer/src'),
      '@c-suite/vault-watcher': resolve(__dirname, 'packages/vault-watcher/src'),
      // Normalize electron resolution so vi.mock('electron') intercepts all importers.
      'electron': resolve(__dirname, 'apps/main/node_modules/electron/index.js'),
    },
  },
});
