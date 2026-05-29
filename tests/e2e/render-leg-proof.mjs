// End-to-end RENDER-LEG proof: drives the ASSEMBLED Electron app and proves the full chain
// the handoff's "rendering leg" asked for — a produced memo is VISIBLE in the app:
//   Cash Lever → Approve → run.start → memo SafeWritten + runs row persists memo_path
//   → Home Recent Runs lists the completed run → click it → memo:read loads the file
//   → MemoViewer renders the memo content.
//
// Unlike run-path-proof.mjs (which only checks a file lands then deletes its vault), this keeps
// the vault alive through the click so main's memo:read can resolve the file, and asserts the
// rendered memo content in the real window. STUB_MODE=replay → no live inference.
//
// Prereq: renderer vite dev server up on :5273 (tests/e2e/run.sh starts it).
// Run from repo root.  Self-cleaning: removes the temp vault AND the run row(s) it created.

import { _electron as electron } from 'playwright';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { mkdtempSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const appMain = join(root, 'apps', 'main');
const shots = join(here, 'screenshots');
mkdirSync(shots, { recursive: true });
const electronPath = require(require.resolve('electron', { paths: [appMain] }));

// 1) Persistent throwaway vault, git-initialized (initSafeWrite asserts an initialized vault).
//    NOT deleted until the very end — main's memo:read must resolve the file during the click.
const VAULT = mkdtempSync(join(tmpdir(), 'csuite-renderleg-'));
execSync('git init -q && git config user.email proof@local && git config user.name proof', { cwd: VAULT });
writeFileSync(join(VAULT, '.gitkeep'), '');
execSync('git add -A && git commit -q -m "init vault"', { cwd: VAULT });

// The shared userData runtime.db the app writes the run row into (no env override exists).
const DB_PATH = join(homedir(), 'Library', 'Application Support', '@c-suite', 'main', 'runtime.db');

let exitCode = 1;
const mainLog = [];
let app;
let myRunId = null;
const steps = [];
function step(ok, label) { steps.push(`  [${ok ? 'ok' : 'FAIL'}] ${label}`); }

try {
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
  const proc = app.process();
  proc.stdout?.on('data', (d) => mainLog.push(String(d)));
  proc.stderr?.on('data', (d) => mainLog.push(String(d)));

  const page = await app.firstWindow();
  page.on('console', (m) => { if (m.type() === 'error') mainLog.push('[renderer.console.error] ' + m.text()); });
  await page.waitForSelector('h1', { timeout: 20000 });
  step(true, 'app window up: ' + (await page.title()));

  // 2) Cash Lever → PlanApproval → Approve (emits run.start).
  const pb = page.getByRole('button', { name: /Cash Lever/i }).first();
  if (!(await pb.count())) throw new Error('Cash Lever playbook button not found');
  await pb.click({ timeout: 5000 });
  const approve = page.getByTestId('plan-approve-btn');
  await approve.waitFor({ timeout: 8000 });
  await approve.click({ timeout: 5000 });
  step(true, 'Cash Lever → Approve clicked');

  // 3) Poll the temp vault for the memo file (the run is async in the utility). The runs row's
  //    memo_path is UPDATEd before the file SafeWrite, so once the file exists the row is ready.
  const memosDir = join(VAULT, 'memos');
  let memoFile = null;
  for (let i = 0; i < 60; i++) {        // up to ~30s
    if (existsSync(memosDir)) {
      const md = readdirSync(memosDir).filter((f) => f.endsWith('.md'));
      if (md.length > 0) { memoFile = join(memosDir, md[0]); break; }
    }
    await page.waitForTimeout(500);
  }
  if (!memoFile) throw new Error('no memo file landed in temp vault within 30s — run did not complete');
  const memoRel = 'memos/' + basename(memoFile);
  const memoContent = readFileSync(memoFile, 'utf8');
  step(true, `memo landed: ${memoRel} (${memoContent.length} bytes)`);

  // 4) Resolve MY run via runs:list (match memo_path) — the 2 historical rows point at deleted
  //    vaults, so only my row's file exists. This is the row whose click must render.
  myRunId = await page.evaluate(async (rel) => {
    const rows = await window.ipc.invoke('runs:list');
    const mine = (Array.isArray(rows) ? rows : []).find((r) => r.memo_path === rel);
    return mine ? mine.run_id : null;
  }, memoRel);
  if (!myRunId) throw new Error(`runs:list has no row with memo_path=${memoRel} — runs:list not returning memo_path?`);
  step(true, 'runs:list returns my run with memo_path, runId=' + myRunId.slice(0, 8));

  // 5) Reload so Home re-mounts and useRuns re-fetches (authoritative read) → Recent Runs lists it.
  await page.reload();
  await page.waitForSelector('h1', { timeout: 20000 });
  const recentList = page.getByTestId('recent-runs');
  await recentList.waitFor({ timeout: 8000 });
  const myRow = page.getByTestId(`recent-run-${myRunId}`);
  const hasRow = await myRow.count();
  step(!!hasRow, 'Recent Runs list shows my completed run' + (hasRow ? '' : ' — ROW MISSING'));
  await page.screenshot({ path: join(shots, 'render-leg-home-recent-runs.png') });
  if (!hasRow) throw new Error('my run not present in Recent Runs after reload');

  // 6) Click the run → onViewMemo → memo:read → MemoViewer. Assert the memo content renders.
  await myRow.click({ timeout: 5000 });
  const viewer = page.getByTestId('memo-viewer');
  await viewer.waitFor({ timeout: 8000 });
  const rendered = await page.getByTestId('memo-content').innerText();
  await page.screenshot({ path: join(shots, 'render-leg-memo-viewer.png') });

  // The rendered memo must contain a distinctive chunk of the actual file (first heading/line).
  const firstLine = memoContent.split('\n').find((l) => l.trim().length > 0)?.replace(/^#+\s*/, '').trim() ?? '';
  const probe = firstLine.slice(0, 24);
  const contentVisible = rendered.length > 0 && probe.length > 0 && rendered.includes(probe);
  step(contentVisible, `MemoViewer renders memo content (probe="${probe}", renderedLen=${rendered.length})`);

  exitCode = contentVisible ? 0 : 1;
} catch (err) {
  step(false, 'THREW: ' + (err?.message || String(err)));
  mainLog.push('[proof] THREW: ' + (err?.stack || String(err)));
} finally {
  if (app) await app.close().catch(() => {});
  // Cleanup must never flip the exit code. Remove the run row(s) this proof created (FK-safe:
  // disable FK, delete from every run_id child then runs) + the temp vault.
  try {
    await new Promise((r) => setTimeout(r, 400));   // let the WAL lock release post-close
    if (myRunId && existsSync(DB_PATH)) {
      const children = ['agent_invocations', 'state_transitions', 'cost_ledger', 'tool_calls', 'conflicts', 'writebacks', 'vault_commit_failures'];
      const sql = [
        'PRAGMA foreign_keys=OFF;',
        ...children.map((t) => `DELETE FROM ${t} WHERE run_id='${myRunId}';`),
        `DELETE FROM runs WHERE run_id='${myRunId}';`,
      ].join(' ');
      execSync(`sqlite3 "${DB_PATH}" "${sql}"`, { stdio: 'ignore' });
    }
  } catch (e) {
    mainLog.push('[proof] cleanup (db row) failed (non-fatal): ' + String(e));
  }
  try { rmSync(VAULT, { recursive: true, force: true }); } catch {}
  writeFileSync('/tmp/render-leg-mainlog.txt', mainLog.join(''));
}

console.log('\n=== RENDER-LEG PROOF ===');
steps.forEach((s) => console.log(s));
console.log('screenshots: tests/e2e/screenshots/render-leg-home-recent-runs.png, render-leg-memo-viewer.png');
console.log('full log → /tmp/render-leg-mainlog.txt');
console.log(exitCode === 0 ? '\n=== RENDER LEG PROVEN: produced memo is VISIBLE in the app ===' : '\n=== RENDER LEG PROOF FAILED ===');
process.exit(exitCode);
