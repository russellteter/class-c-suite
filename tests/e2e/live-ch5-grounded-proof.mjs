// GROUNDED LIVE Ch.5 proof: drives the assembled Electron app with STUB_MODE=live and proves the
// interactive cash_lever memo is now GROUNDED in REAL cash-model data (not a placeholder, not the
// honest-but-empty "no context documents" output the ungrounded path produced).
//
// What it proves, end to end:
//   1. The Ch.5 grounding builder fires: reads the real Class_Cash_Lever_Model_v5 xlsx (copied into
//      the temp vault) → 10 lever rows → contextDocuments. (Deterministic: asserted via the utility
//      log "cash_lever grounding: N lever rows".)
//   2. The 6 lenses run live and ground on it (memo does NOT say "no context documents available").
//   3. A real memo lands (NOT the replay placeholder), visible via runs:list + memo_path.
//
// Hermetic + reversible: temp VAULT_PATH (rm'd); the run row in the real runtime.db is FK-safe
// deleted at the end. Real Claude calls bill Russell's Max subscription (~8 calls, one run).
// Prereq: vite :5273 up. Run from repo root. pkill electron between runs.

import { _electron as electron } from 'playwright';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { mkdtempSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const appMain = join(root, 'apps', 'main');
const shots = join(here, 'screenshots');
mkdirSync(shots, { recursive: true });
const electronPath = require(require.resolve('electron', { paths: [appMain] }));

const REAL_VAULT = join(homedir(), 'Documents', 'Claude', 'Projects', 'Business Planning');
const MODEL = 'Class_Cash_Lever_Model_v5_2026-05-18.xlsx';
const realModel = join(REAL_VAULT, MODEL);

const VAULT = mkdtempSync(join(tmpdir(), 'csuite-grounded-'));
execSync('git init -q && git config user.email proof@local && git config user.name proof', { cwd: VAULT });
writeFileSync(join(VAULT, '.gitkeep'), '');
// Copy the REAL cash-lever model into the temp vault so the grounding builder resolves + reads it.
if (!existsSync(realModel)) { console.error('FATAL: real cash model not found at ' + realModel); process.exit(2); }
copyFileSync(realModel, join(VAULT, MODEL));
execSync('git add -A && git commit -q -m "init vault + cash model"', { cwd: VAULT });

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
      STUB_MODE: 'live',
      VAULT_PATH: VAULT,
    },
  });
  const proc = app.process();
  proc.stdout?.on('data', (d) => mainLog.push(String(d)));
  proc.stderr?.on('data', (d) => mainLog.push(String(d)));

  const page = await app.firstWindow();
  page.on('console', (m) => { if (m.type() === 'error') mainLog.push('[renderer.console.error] ' + m.text()); });
  await page.waitForSelector('h1', { timeout: 20000 });
  step(true, 'app window up (STUB_MODE=live, cash model in vault)');

  const pb = page.getByRole('button', { name: /Cash Lever/i }).first();
  if (!(await pb.count())) throw new Error('Cash Lever playbook button not found');
  await pb.click({ timeout: 5000 });
  const approve = page.getByTestId('plan-approve-btn');
  await approve.waitFor({ timeout: 8000 });
  await approve.click({ timeout: 5000 });
  step(true, 'Cash Lever → Approve clicked — grounded live run dispatched');

  const memosDir = join(VAULT, 'memos');
  let memoFile = null;
  for (let i = 0; i < 1800; i++) {       // up to ~900s (sequential live fan-out)
    if (existsSync(memosDir)) {
      const md = readdirSync(memosDir).filter((f) => f.endsWith('.md'));
      if (md.length > 0) { memoFile = join(memosDir, md[0]); break; }
    }
    await page.waitForTimeout(500);
  }
  if (!memoFile) throw new Error('no memo landed within 900s (see /tmp/live-ch5-grounded-mainlog.txt)');
  const memoRel = 'memos/' + basename(memoFile);
  const memoContent = readFileSync(memoFile, 'utf8');
  step(true, `memo landed: ${memoRel} (${memoContent.length} bytes)`);

  // (1) DETERMINISTIC: grounding builder fired + read the real xlsx.
  const logText = mainLog.join('');
  const gm = logText.match(/cash_lever grounding:\s*(\d+)\s*lever rows/i);
  const groundCount = gm ? parseInt(gm[1], 10) : 0;
  step(groundCount > 0, `grounding builder fired: ${groundCount} lever rows → contextDocuments (deterministic, from utility log)`);

  // (2) memo is REAL inference, not the replay placeholder.
  const lc = memoContent.toLowerCase();
  const isPlaceholder = lc.includes('seed memo placeholder') || lc.includes('placeholder for testing') || lc.includes('memo (stub)');
  step(!isPlaceholder && memoContent.length > 500, `memo is real live inference (placeholder=${isPlaceholder}, len=${memoContent.length})`);

  // (3) lenses SAW the grounding — memo does NOT carry the ungrounded "no context documents" tell.
  const ungroundedTell = lc.includes('no context documents') || lc.includes('contextdocuments is empty') || lc.includes('contextdocuments are empty');
  step(!ungroundedTell, `lenses grounded (ungrounded "no context documents" tell absent=${!ungroundedTell})`);

  myRunId = await page.evaluate(async (rel) => {
    const rows = await window.ipc.invoke('runs:list');
    const mine = (Array.isArray(rows) ? rows : []).find((r) => r.memo_path === rel);
    return mine ? mine.run_id : null;
  }, memoRel);
  step(!!myRunId, 'runs:list row persisted with memo_path' + (myRunId ? ' runId=' + myRunId.slice(0, 8) : ' — MISSING'));

  console.log('\n----- GROUNDED LIVE MEMO BODY (first 2400 chars) -----');
  console.log(memoContent.slice(0, 2400));
  console.log('----- END MEMO BODY -----');

  exitCode = (groundCount > 0 && !isPlaceholder && memoContent.length > 500 && !ungroundedTell) ? 0 : 1;
} catch (err) {
  step(false, 'THREW: ' + (err?.message || String(err)));
  mainLog.push('[proof] THREW: ' + (err?.stack || String(err)));
} finally {
  if (app) await app.close().catch(() => {});
  try {
    await new Promise((r) => setTimeout(r, 400));
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
  writeFileSync('/tmp/live-ch5-grounded-mainlog.txt', mainLog.join(''));
}

console.log('\n=== GROUNDED LIVE Ch.5 PROOF ===');
steps.forEach((s) => console.log(s));
console.log('full log → /tmp/live-ch5-grounded-mainlog.txt');
console.log(exitCode === 0 ? '\n=== GROUNDED: live cash_lever memo is grounded in real cash-model data ===' : '\n=== GROUNDED PROOF FAILED ===');
process.exit(exitCode);
