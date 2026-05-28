// scripts/rebuild-electron-native.mjs
// Rebuilds native node modules (better-sqlite3) against the installed Electron's
// ABI. REQUIRED after `pnpm install` or an Electron version bump — otherwise the
// app crashes at boot with NODE_MODULE_VERSION mismatch (Electron's Node ABI differs
// from the system Node ABI the modules are compiled for on install).
//
// Tradeoff (documented in CLAUDE.md): after this runs, the better-sqlite3 copies
// under apps/main + apps/utility are built for Electron's ABI, so plain-node `vitest`
// specs that open a real DB fail to load the native module. That is the known,
// accepted state — the app runs under Electron, the DB-backed unit tests are red
// under plain Node.
//
// Usage: pnpm rebuild:electron
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function electronVersion() {
  const p = join(root, 'node_modules', 'electron', 'package.json');
  return JSON.parse(readFileSync(p, 'utf8')).version;
}

const version = electronVersion();
const arch = process.arch;
// Native modules that must match Electron's ABI. Each app workspace gets its own
// pnpm copy, so rebuild both.
const targets = [
  'apps/main/node_modules/better-sqlite3',
  'apps/utility/node_modules/better-sqlite3',
];

console.log(`[rebuild:electron] Electron ${version} (${arch})`);
let rebuilt = 0;
for (const rel of targets) {
  const dir = join(root, rel);
  if (!existsSync(dir)) {
    console.log(`[rebuild:electron] skip (absent): ${rel}`);
    continue;
  }
  console.log(`[rebuild:electron] rebuilding ${rel} ...`);
  execSync(
    `npx -y node-gyp rebuild --target=${version} --arch=${arch} --dist-url=https://electronjs.org/headers`,
    { cwd: dir, stdio: 'inherit' },
  );
  rebuilt++;
}
console.log(`[rebuild:electron] done — rebuilt ${rebuilt} module(s).`);
