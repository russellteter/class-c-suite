// scripts/rebuild-electron-native.mjs
// Rebuilds the native better-sqlite3 module for either ABI. The C-Suite has a TWO-MODE
// ABI dance (docs/PRODUCTION_PLAN.md Phase 0 + WORKFLOW_PROGRAM.md):
//   - electron (default): app / e2e / live proofs run under Electron 33 → NODE_MODULE_VERSION 130
//   - node:               the Phase-0 enforcing unit suite runs under the system Node ABI
//
// Usage:
//   pnpm rebuild:electron   (or: node scripts/rebuild-electron-native.mjs electron)
//   pnpm rebuild:node       (or: node scripts/rebuild-electron-native.mjs node)
//
// Why the old version was broken (handoff 2026-05-28):
//   - It read node_modules/electron at the REPO ROOT — electron is a dep of apps/main, so the
//     root copy is absent/hoisted and electronVersion() threw before rebuilding anything.
//   - It ran node-gyp in apps/{main,utility}/node_modules/better-sqlite3 — both are pnpm
//     symlinks to the SAME physical .pnpm copy, so it rebuilt the same binary twice (or missed it).
// Fix: resolve electron from apps/main, and rebuild the ONE canonical .pnpm copy (realpath).
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appMain = join(root, 'apps', 'main');
const require = createRequire(join(appMain, 'noop.cjs')); // resolve deps from apps/main

const mode = (process.argv[2] || 'electron').replace(/^--mode=/, '');
if (mode !== 'electron' && mode !== 'node') {
  console.error('usage: node scripts/rebuild-electron-native.mjs [electron|node]');
  process.exit(1);
}
const arch = process.arch;

// The single canonical better-sqlite3 build dir. Both apps/main and apps/utility symlink here,
// so we rebuild it exactly once. realpathSync resolves the pnpm symlink to the .pnpm location.
const bsqDir = realpathSync(dirname(require.resolve('better-sqlite3/package.json')));

if (mode === 'electron') {
  const version = JSON.parse(readFileSync(require.resolve('electron/package.json'), 'utf8')).version;
  console.log(`[rebuild:electron] Electron ${version} (${arch})\n  target: ${bsqDir}`);
  execSync(
    `npx -y node-gyp rebuild --target=${version} --arch=${arch} --dist-url=https://electronjs.org/headers`,
    { cwd: bsqDir, stdio: 'inherit' },
  );
} else {
  console.log(`[rebuild:node] Node ${process.version} ABI ${process.versions.modules} (${arch})\n  target: ${bsqDir}`);
  execSync(`npx -y node-gyp rebuild --arch=${arch}`, { cwd: bsqDir, stdio: 'inherit' });
}

// Verify the resulting ABI by attempting to load under THIS node (ABI = process.versions.modules).
// electron-built (130) → must NOT load under node (mismatch = success).
// node-built          → must load under node (success = success).
const binary = join(bsqDir, 'build', 'Release', 'better_sqlite3.node');
if (!existsSync(binary)) {
  console.error(`[verify] FAILED — ${binary} was not produced`);
  process.exit(1);
}
let loadsUnderNode = false;
let loadErr = '';
try {
  require(binary);
  loadsUnderNode = true;
} catch (e) {
  loadErr = String(e.message).split('\n').filter((l) => /NODE_MODULE_VERSION/.test(l)).join(' ') || String(e.message).split('\n')[0];
}

if (mode === 'electron') {
  if (loadsUnderNode) {
    console.error(`[verify] FAILED — binary loads under plain Node (ABI ${process.versions.modules}); expected Electron ABI 130 (should NOT load under node).`);
    process.exit(1);
  }
  console.log(`[verify] OK — built for Electron ABI; does not load under plain Node (${loadErr}). App/e2e/live proofs ready.`);
} else {
  if (!loadsUnderNode) {
    console.error(`[verify] FAILED — node-mode binary does not load under this Node (${loadErr}).`);
    process.exit(1);
  }
  console.log(`[verify] OK — built for Node ABI ${process.versions.modules}. Phase-0 enforcing unit suite ready.`);
}
