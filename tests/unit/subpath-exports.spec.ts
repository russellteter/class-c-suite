/**
 * ADR-0002 §9 row 7 — Subpath exports resolve via Node module resolution
 * Test owner: Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0002-ch1-process-architecture.md §2 + §9 row 7
 *
 * Spec ambiguities:
 *   1. Brief §9 row 7: "import via subpath syntax (require('@c-suite/shared-types/parseArtifact')
 *      in a child process to bypass vitest aliases)."
 *      vitest.config.ts aliases intercept `@c-suite/shared-types/*` → src/*.ts.
 *      A child_process.execSync test bypasses aliases and tests real Node resolution.
 *      However, this requires `pnpm build:packages` to have run AND the `exports`
 *      field to exist in packages/shared-types/package.json. Neither exists yet
 *      (Runtime ships them per ADR §2). The subpath-resolution test is SKIPPED
 *      under vitest (alias intercepts), documented here per brief line 65.
 *   2. The file-existence test (`dist/parseArtifact.js` etc.) is RED until Runtime
 *      runs `pnpm build:packages`.
 *   3. ADR §2.1 specifies 4 subpaths: ./parseArtifact, ./normalizeKeys,
 *      ./vault-schemas, ./ipc. All 4 are asserted.
 *
 * Tests will fail until Runtime ships:
 *   - packages/shared-types/package.json exports field (ADR §2.1)
 *   - packages/shared-types/tsconfig.build.json (ADR §2.3)
 *   - root package.json build:packages script (ADR §2.3)
 *   - packages/stub-harness analogues (ADR §2.2)
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

const REPO_ROOT = resolve(__dirname, '../..');
const SHARED_TYPES_DIST = resolve(REPO_ROOT, 'packages/shared-types/dist');

// ── §9 row 7 — Dist artifacts exist after pnpm build:packages ───────────────

describe('subpath exports — dist artifacts exist (§9 row 7)', () => {
  // These tests are RED until Runtime runs pnpm build:packages.
  // pnpm build:packages is NOT run in this test (avoids side effects + network).
  // Verify the dist artifacts that Runtime is contractually required to produce.

  const EXPECTED_DIST_FILES = [
    'parseArtifact.js',
    'normalizeKeys.js',
    'vault-schemas.js',
    'ipc.js',
  ];

  it.each(EXPECTED_DIST_FILES)(
    'dist/%s exists after pnpm build:packages',
    (filename) => {
      const distPath = resolve(SHARED_TYPES_DIST, filename);
      // RED until Runtime ships build:packages + exports map.
      expect(existsSync(distPath)).toBe(true);
    },
  );

  it('packages/shared-types/package.json has exports field with all 4 subpaths', () => {
    // RED until Runtime adds exports map (ADR §2.1).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require(resolve(REPO_ROOT, 'packages/shared-types/package.json'));
    expect(pkg.exports).toBeDefined();
    expect(pkg.exports['./parseArtifact']).toBeDefined();
    expect(pkg.exports['./normalizeKeys']).toBeDefined();
    expect(pkg.exports['./vault-schemas']).toBeDefined();
    expect(pkg.exports['./ipc']).toBeDefined();
  });

  it('packages/stub-harness/package.json has exports field', () => {
    // RED until Runtime adds exports map (ADR §2.2).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require(resolve(REPO_ROOT, 'packages/stub-harness/package.json'));
    expect(pkg.exports).toBeDefined();
    expect(pkg.exports['./stub']).toBeDefined();
  });
});

// ── §9 row 7 — Subpath import via child_process (bypasses vitest alias) ──────

describe('subpath exports — Node module resolution in child process (§9 row 7)', () => {
  /**
   * IMPORTANT: This test is intentionally SKIPPED under vitest.
   * Vitest aliases intercept @c-suite/shared-types/* → src/*.ts before Node's
   * module resolution runs. A child_process.execSync call spawns a plain Node
   * process without the vitest alias layer, testing actual exports-field resolution.
   *
   * The test is SKIPPED because:
   *   a) The dist/ directory doesn't exist until Runtime runs pnpm build:packages.
   *   b) Even after dist/ exists, the test should run in CI post-build, not in
   *      the vitest unit suite (which pre-dates the build step).
   *
   * Runtime: when enabling this test, remove `.skip` and ensure CI runs
   * `pnpm build:packages` before `pnpm test`.
   */
  it.skip('resolves @c-suite/shared-types/parseArtifact via Node module resolution', () => {
    // Bypasses vitest alias — tests real exports-field Node resolution.
    const output = execSync(
      `node --input-type=module -e "import('@c-suite/shared-types/parseArtifact').then(m => console.log(Object.keys(m).join(',')))"`,
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );
    // Should list exported names from parseArtifact.ts.
    expect(output.trim().length).toBeGreaterThan(0);
  });

  it.skip('resolves @c-suite/shared-types/ipc via Node module resolution', () => {
    const output = execSync(
      `node --input-type=module -e "import('@c-suite/shared-types/ipc').then(m => console.log(Object.keys(m).join(',')))"`,
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );
    expect(output).toContain('validateIpc');
  });
});
