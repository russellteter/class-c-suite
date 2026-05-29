// BARE LIVE Ch.5 proof: drives the assembled Electron app with STUB_MODE=live and proves the
// interactive cash_lever path (Ch.5 generic 6-lens fan-out → Synthesizer → Verifier) actually
// EXECUTES against real Claude (RealClaudeClient / CLAUDE_CODE_OAUTH_TOKEN) and is NOT refused.
//
// This is the empirical confirmation that the live synthesis path works at all — it had never
// run end-to-end (build-log: "real memo content (live+grounded run)" was STILL OPEN). It runs
// UNGROUNDED on purpose (contextDocuments is still []), so the produced memo is expected to be
// honest "low-confidence / UNKNOWN — needs data sources" CFO-style reasoning. The proof asserts:
//   (a) the run is NOT refused (a memo file lands), and
//   (b) the memo body is REAL inference, not the replay "seed memo placeholder" fixture.
//
// Hermetic + reversible: temp VAULT_PATH (rm'd at end); the run row in the real runtime.db is
// FK-safe deleted at the end (same as render-leg-proof.mjs). Real Claude calls bill Russell's
// Max subscription (~8 calls, one run).
//
// Prereq: renderer vite dev server up on :5273. Run from repo root. pkill electron between runs.

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

const VAULT = mkdtempSync(join(tmpdir(), 'csuite-live-ch5-'));
execSync('git init -q && git config user.email proof@local && git config user.name proof', { cwd: VAULT });
writeFileSync(join(VAULT, '.gitkeep'), '');
execSync('git add -A && git commit -q -m "init vault"', { cwd: VAULT });

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
      STUB_MODE: 'live',          // <-- the whole point: real inference
      VAULT_PATH: VAULT,
    },
  });
  const proc = app.process();
  proc.stdout?.on('data', (d) => mainLog.push(String(d)));
  proc.stderr?.on('data', (d) => mainLog.push(String(d)));

  const page = await app.firstWindow();
  page.on('console', (m) => { if (m.type() === 'error') mainLog.push('[renderer.console.error] ' + m.text()); });
  await page.waitForSelector('h1', { timeout: 20000 });
  step(true, 'app window up (STUB_MODE=live): ' + (await page.title()));

  const pb = page.getByRole('button', { name: /Cash Lever/i }).first();
  if (!(await pb.count())) throw new Error('Cash Lever playbook button not found');
  await pb.click({ timeout: 5000 });
  const approve = page.getByTestId('plan-approve-btn');
  await approve.waitFor({ timeout: 8000 });
  await approve.click({ timeout: 5000 });
  step(true, 'Cash Lever → Approve clicked — live run dispatched');

  // Poll for a memo (clean OR .draft.md). Live latency: 6 lenses + Synthesizer + Verifier(opus).
  const memosDir = join(VAULT, 'memos');
  let memoFile = null;
  for (let i = 0; i < 1800; i++) {       // up to ~900s (sequential live fan-out is slow)
    if (existsSync(memosDir)) {
      const md = readdirSync(memosDir).filter((f) => f.endsWith('.md'));
      if (md.length > 0) { memoFile = join(memosDir, md[0]); break; }
    }
    await page.waitForTimeout(500);
  }
  if (!memoFile) throw new Error('no memo landed within 300s — live run refused, errored, or timed out (see /tmp/live-ch5-mainlog.txt)');
  const memoRel = 'memos/' + basename(memoFile);
  const memoContent = readFileSync(memoFile, 'utf8');
  step(true, `memo landed (NOT refused): ${memoRel} (${memoContent.length} bytes)`);

  // Assert the body is REAL inference, not the replay placeholder fixture.
  const lc = memoContent.toLowerCase();
  const isPlaceholder = lc.includes('seed memo placeholder') || lc.includes('placeholder for testing') || lc.includes('memo (stub)');
  const looksReal = memoContent.length > 200 && !isPlaceholder;
  step(looksReal, `memo body is real live inference (placeholder=${isPlaceholder}, len=${memoContent.length})`);

  // Confirm the run row persisted with memo_path (proves the full persist leg under live too).
  myRunId = await page.evaluate(async (rel) => {
    const rows = await window.ipc.invoke('runs:list');
    const mine = (Array.isArray(rows) ? rows : []).find((r) => r.memo_path === rel);
    return mine ? mine.run_id : null;
  }, memoRel);
  step(!!myRunId, 'runs:list row persisted with memo_path' + (myRunId ? ' runId=' + myRunId.slice(0, 8) : ' — MISSING'));

  console.log('\n----- LIVE MEMO BODY (first 1600 chars) -----');
  console.log(memoContent.slice(0, 1600));
  console.log('----- END MEMO BODY -----');

  exitCode = looksReal ? 0 : 1;
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
  writeFileSync('/tmp/live-ch5-mainlog.txt', mainLog.join(''));
}

console.log('\n=== BARE LIVE Ch.5 PROOF ===');
steps.forEach((s) => console.log(s));
console.log('full log → /tmp/live-ch5-mainlog.txt');
console.log(exitCode === 0 ? '\n=== LIVE Ch.5 PATH PROVEN: real inference produced a memo, not refused ===' : '\n=== LIVE Ch.5 PROOF FAILED ===');
process.exit(exitCode);
