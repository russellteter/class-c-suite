// Copies non-TypeScript runtime assets from apps/utility/src into apps/utility/dist,
// preserving directory structure. `tsc` only emits .js for .ts/.tsx and silently drops
// sibling assets (the .prompt.md files the agents read at runtime). Without this step,
// the compiled utility throws ENOENT on dist/prompts/*.prompt.md the first time a live
// run reaches the Verifier (verifier-runner.ts loads join(_dirname,'../prompts/...')).
// Replay-mode CI never caught it because cash_lever's legacy path skips the real Verifier.
//
// Runs as the second half of `apps/utility` build: `tsc && node ../../scripts/copy-utility-assets.mjs`.
import { cpSync, statSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'apps', 'utility', 'src');
const DIST = join(root, 'apps', 'utility', 'dist');

if (!existsSync(DIST)) {
  console.error('[copy-utility-assets] dist/ missing — run tsc first');
  process.exit(1);
}

const SKIP_EXT = new Set(['.ts', '.tsx', '.map']);
let copied = 0;
const copiedFiles = [];

// Mirror every non-source asset (preserves nested dirs like agents/handoff/).
cpSync(SRC, DIST, {
  recursive: true,
  filter: (srcPath) => {
    if (statSync(srcPath).isDirectory()) return true;          // recurse into dirs
    if (SKIP_EXT.has(extname(srcPath))) return false;          // drop compiled-from sources
    copied++;
    copiedFiles.push(srcPath.replace(SRC + '/', ''));
    return true;
  },
});

// Verify the asset the live Verifier needs actually landed.
const verifierPrompt = join(DIST, 'prompts', 'Verifier.prompt.md');
if (!existsSync(verifierPrompt)) {
  console.error('[copy-utility-assets] FAILED — dist/prompts/Verifier.prompt.md still missing');
  process.exit(1);
}
const promptCount = existsSync(join(DIST, 'prompts'))
  ? readdirSync(join(DIST, 'prompts')).filter((f) => f.endsWith('.prompt.md')).length
  : 0;
console.log(`[copy-utility-assets] copied ${copied} asset(s) → dist/ (${promptCount} prompts). Verifier.prompt.md present.`);
