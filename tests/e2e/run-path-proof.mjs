// End-to-end run-path integration proof: drives the ASSEMBLED Electron app and proves
// clicking Cash Lever → Approve produces a real memo in the vault. Exercises the full
// chain the spine-proof could not: renderer run.start emit → main relay → utility
// run.start handler → startRun → Synthesizer → memo SafeWrite.
//
// Prereq: renderer vite dev server up on :5273 (tests/e2e/run.sh starts it).
// Run from repo root (cwd matters: the utility inherits it for replay-fixture resolution).
//
// Ground-truth assertion: a memo .md file lands in a throwaway temp vault.

import { _electron as electron } from 'playwright';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const appMain = join(root, 'apps', 'main');
const electronPath = require(require.resolve('electron', { paths: [appMain] }));

// 1) Throwaway vault, git-initialized (initSafeWrite asserts an initialized vault).
const VAULT = mkdtempSync(join(tmpdir(), 'csuite-runpath-'));
execSync('git init -q && git config user.email proof@local && git config user.name proof', { cwd: VAULT });
writeFileSync(join(VAULT, '.gitkeep'), '');
execSync('git add -A && git commit -q -m "init vault"', { cwd: VAULT });

let exitCode = 1;
const mainLog = [];
let app;
try {
  // 2) Launch the assembled app. cwd=root so the utility (which inherits cwd) resolves
  //    replay fixtures at tests/fixtures/lens-outputs/. STUB_MODE=replay → no live inference.
  app = await electron.launch({
    executablePath: electronPath,
    args: [appMain],
    cwd: root,
    env: {
      ...process.env,
      VITE_DEV: '1',
      NODE_ENV: 'development',
      ELECTRON_ENABLE_LOGGING: '1',
      UTILITY_FORWARD_LOGS: '1',
      STUB_MODE: 'replay',
      VAULT_PATH: VAULT,
    },
  });

  // Capture main+utility piped output for diagnostics.
  const proc = app.process();
  proc.stdout?.on('data', (d) => mainLog.push(String(d)));
  proc.stderr?.on('data', (d) => mainLog.push(String(d)));

  const page = await app.firstWindow();
  page.on('console', (m) => { if (m.type() === 'error') mainLog.push('[renderer.console.error] ' + m.text()); });

  await page.waitForSelector('h1', { timeout: 20000 });
  console.log('[proof] app window up:', await page.title());

  // Capture IPC the renderer RECEIVES back from the utility (forwarded by main):
  // agent.start/agent.complete prove the orchestrator actually ran.
  await page.evaluate(() => {
    window.__rx = [];
    if (window.ipc?.on) window.ipc.on('ipc:message', (m) => window.__rx.push(m && m.kind));
  });

  // 3) Open Cash Lever → PlanApproval.
  const pb = page.getByRole('button', { name: /Cash Lever/i }).first();
  if (!(await pb.count())) throw new Error('Cash Lever playbook button not found');
  await pb.click({ timeout: 5000 });

  // 4) Approve (data-testid=plan-approve-btn) → emits run.start.
  const approve = page.getByTestId('plan-approve-btn');
  await approve.waitFor({ timeout: 8000 });
  console.log('[proof] PlanApproval reached; clicking Approve & Run');
  await approve.click({ timeout: 5000 });

  // 5) Poll the vault for the memo (the run is async in the utility).
  const memosDir = join(VAULT, 'memos');
  let memoFile = null;
  for (let i = 0; i < 60; i++) {        // up to ~30s
    if (existsSync(memosDir)) {
      const md = readdirSync(memosDir).filter((f) => f.endsWith('.md'));
      if (md.length > 0) { memoFile = join(memosDir, md[0]); break; }
    }
    await page.waitForTimeout(500);
  }

  const rx = await page.evaluate(() => window.__rx ?? []).catch(() => []);
  console.log('[proof] renderer received IPC kinds:', [...new Set(rx)].join(', ') || '(none)');

  if (memoFile) {
    const content = readFileSync(memoFile, 'utf8');
    console.log('[proof] PASS — memo landed:', memoFile.replace(VAULT, '<vault>'));
    console.log('[proof] memo length:', content.length, '| head:', JSON.stringify(content.slice(0, 80)));
    exitCode = content.length > 0 ? 0 : 1;
  } else {
    console.log('[proof] FAIL — no memo appeared in', memosDir.replace(VAULT, '<vault>'), 'within 30s');
  }
} catch (err) {
  console.error('[proof] THREW:', err?.stack || String(err));
} finally {
  if (app) await app.close().catch(() => {});
  // Dump full main+utility output for inspection, plus a filtered view.
  writeFileSync('/tmp/runpath-mainlog.txt', mainLog.join(''));
  console.log('[proof] full main/utility output → /tmp/runpath-mainlog.txt (' + mainLog.join('').length + ' bytes)');
  const relevant = mainLog.join('').split('\n').filter((l) =>
    /run\.start|memo SafeWrite|run-loop|startRun|safewrite|Error|crash|uncaught|utility|port not ready|migration|column/i.test(l)).slice(0, 30);
  if (relevant.length) { console.log('\n[proof] --- main/utility log (filtered) ---'); relevant.forEach((l) => console.log('  ' + l.slice(0, 220))); }
  rmSync(VAULT, { recursive: true, force: true });
}

console.log(exitCode === 0 ? '\n=== RUN PATH PROVEN END-TO-END ===' : '\n=== RUN PATH PROOF FAILED ===');
process.exit(exitCode);
