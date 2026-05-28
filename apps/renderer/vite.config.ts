// apps/renderer/vite.config.ts
// Source: docs/decisions/0013-ch7-vite-assembly.md
// Vite config for the Electron renderer bundle.
// DO NOT add @vitejs/plugin-react — incompatible with vite 7 (imports removed vite/internal).
// JSX is handled by esbuild via tsconfig jsx:react-jsx.

import { defineConfig } from 'vite';
import { resolve, extname } from 'path';
import type { Plugin } from 'vite';

// Node16 ESM source uses .js extensions; on-disk files are .ts/.tsx.
// Scoped to relative source imports only — never rewrites vite's own .vite/deps chunks.
function remapJsToTs(): Plugin {
  return {
    name: 'remap-js-to-ts',
    enforce: 'pre',
    async resolveId(id, importer, options) {
      if (!importer || extname(id) !== '.js') return null;
      if (!id.startsWith('.')) return null;
      if (importer.includes('node_modules')) return null;
      for (const ext of ['.ts', '.tsx']) {
        const candidate = id.replace(/\.js$/, ext);
        const result = await this.resolve(candidate, importer, { ...options, skipSelf: true });
        if (result) return result;
      }
      return null;
    },
  };
}

const root = resolve(__dirname);
const repoRoot = resolve(__dirname, '../..');

export default defineConfig({
  root,
  plugins: [remapJsToTs()],
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  build: {
    outDir: resolve(root, 'dist'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
  resolve: {
    alias: {
      '@c-suite/shared-types/normalizeKeys': resolve(repoRoot, 'packages/shared-types/src/normalizeKeys.ts'),
      '@c-suite/shared-types/parseArtifact': resolve(repoRoot, 'packages/shared-types/src/parseArtifact.ts'),
      '@c-suite/shared-types/vault-schemas': resolve(repoRoot, 'packages/shared-types/src/vault-schemas.ts'),
      '@c-suite/shared-types/ipc': resolve(repoRoot, 'packages/shared-types/src/ipc.ts'),
      '@c-suite/shared-types/run-state': resolve(repoRoot, 'packages/shared-types/src/run-state.ts'),
      '@c-suite/shared-types/run-state-schema': resolve(repoRoot, 'packages/shared-types/src/run-state-schema.ts'),
      '@c-suite/shared-types/agent-definition': resolve(repoRoot, 'packages/shared-types/src/agent-definition.ts'),
      '@c-suite/shared-types/lens-output': resolve(repoRoot, 'packages/shared-types/src/lens-output.ts'),
      '@c-suite/shared-types/lens-context-bundle': resolve(repoRoot, 'packages/shared-types/src/lens-context-bundle.ts'),
      '@c-suite/shared-types/verifier-input': resolve(repoRoot, 'packages/shared-types/src/verifier-input.ts'),
      '@c-suite/shared-types/verifier-output': resolve(repoRoot, 'packages/shared-types/src/verifier-output.ts'),
      '@c-suite/shared-types/run-plan': resolve(repoRoot, 'packages/shared-types/src/run-plan.ts'),
      '@c-suite/shared-types/memo': resolve(repoRoot, 'packages/shared-types/src/memo.ts'),
      '@c-suite/shared-types/red-team': resolve(repoRoot, 'packages/shared-types/src/red-team.ts'),
      '@c-suite/shared-types/steelman': resolve(repoRoot, 'packages/shared-types/src/steelman.ts'),
      '@c-suite/shared-types/writeback': resolve(repoRoot, 'packages/shared-types/src/writeback.ts'),
      '@c-suite/shared-types/run-critique': resolve(repoRoot, 'packages/shared-types/src/run-critique.ts'),
      '@c-suite/shared-types/handoff': resolve(repoRoot, 'packages/shared-types/src/handoff.ts'),
      '@c-suite/shared-types/mcp': resolve(repoRoot, 'packages/shared-types/src/mcp.ts'),
      '@c-suite/shared-types/scheduled-job': resolve(repoRoot, 'packages/shared-types/src/scheduled-job.ts'),
      '@c-suite/shared-types/playbook': resolve(repoRoot, 'packages/shared-types/src/playbook.ts'),
      '@c-suite/shared-types': resolve(repoRoot, 'packages/shared-types/src'),
      '@c-suite/stub-harness/stub': resolve(repoRoot, 'packages/stub-harness/src/stub.ts'),
      '@c-suite/stub-harness': resolve(repoRoot, 'packages/stub-harness/src'),
      '@c-suite/vault-writer': resolve(repoRoot, 'packages/vault-writer/src/safeWrite.ts'),
      '@c-suite/vault-watcher': resolve(repoRoot, 'packages/vault-watcher/src'),
      '@c-suite/writeback-engine': resolve(repoRoot, 'packages/writeback-engine/src/index.ts'),
    },
  },
});
