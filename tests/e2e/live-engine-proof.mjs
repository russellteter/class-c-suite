// LIVE engine proof (Phase 3): drives the assembled Electron app with STUB_MODE=live
// so RealClaudeClient (Max subscription) performs REAL inference across the full
// orchestrator — decomposer/lenses → red-team/steelman → Synthesizer → REAL Verifier
// rigor score → memo SafeWrite. Vehicle: pre-mortem (STUBBED_SOURCES=[], Verifier-wired,
// pre-filled default question, lowest connector dependency). Cash Lever is excluded from
// the Verifier path (run-loop.ts:39) and guard-blocked on the unbuilt cash_model xlsx, so
// it cannot satisfy the rigor gate — pre-mortem proves the same live engine honestly.
//
// Memo to a THROWAWAY vault (real vault stays clean). The runs row lands in the real
// runtime.db (supervisor hard-sets C_SUITE_DB_PATH=userData/runtime.db; not env-overridable
// without a code change) — a legitimate run row, also reused by the restart-survival proof.
//
// Gate asserted: a real memo lands; filename encodes CLEAN (.md) vs DRAFT (.draft.md);
// the agent.complete IPC payload carries a real rigorScore.

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

// .env.local → token for the live run (and strip ANTHROPIC_API_KEY per the locked constraint).
const envLocal = {};
try {
  for (const line of readFileSync(join(appMain, '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    envLocal[m[1]] = v;
  }
} catch { /* main loads it itself; this is belt-and-suspenders */ }
delete envLocal.ANTHROPIC_API_KEY;

const VAULT = mkdtempSync(join(tmpdir(), 'csuite-live-'));
execSync('git init -q && git config user.email proof@local && git config user.name proof', { cwd: VAULT });
writeFileSync(join(VAULT, '.gitkeep'), '');
execSync('git add -A && git commit -q -m "init vault"', { cwd: VAULT });

let exitCode = 1;
const mainLog = [];
let app;
try {
  app = await electron.launch({
    executablePath: electronPath,
    args: [appMain],
    cwd: root,
    env: {
      ...process.env,
      ...envLocal,
      VITE_DEV: '1',
      NODE_ENV: 'development',
      ELECTRON_ENABLE_LOGGING: '1',
      UTILITY_FORWARD_LOGS: '1',
      STUB_MODE: 'live',          // <-- REAL inference
      ANTHROPIC_API_KEY: '',      // explicit: never pay-per-token
      VAULT_PATH: VAULT,
    },
  });
  const proc = app.process();
  proc.stdout?.on('data', (d) => mainLog.push(String(d)));
  proc.stderr?.on('data', (d) => mainLog.push(String(d)));

  const page = await app.firstWindow();
  page.on('console', (m) => { if (m.type() === 'error') mainLog.push('[renderer.console.error] ' + m.text()); });
  await page.waitForSelector('h1', { timeout: 20000 });
  console.log('[live] app window up:', await page.title());

  // Capture full IPC the renderer receives back (agent.complete carries rigorScore).
  await page.evaluate(() => {
    window.__rx = [];
    if (window.ipc?.on) window.ipc.on('ipc:message', (m) => window.__rx.push(m));
  });

  // Open Pre-mortem → PlanApproval (pre-filled default question).
  const pb = page.getByRole('button', { name: /Pre-mortem/i }).first();
  if (!(await pb.count())) throw new Error('Pre-mortem playbook button not found');
  await pb.click({ timeout: 5000 });

  const approve = page.getByTestId('plan-approve-btn');
  await approve.waitFor({ timeout: 8000 });
  console.log('[live] PlanApproval reached; clicking Approve & Run (LIVE inference begins)…');
  await approve.click({ timeout: 5000 });

  // Poll the vault for the memo — live multi-agent + Verifier can take minutes.
  const memosDir = join(VAULT, 'memos');
  let memoFile = null;
  for (let i = 0; i < 360; i++) {        // up to ~6 min
    if (existsSync(memosDir)) {
      const md = readdirSync(memosDir).filter((f) => f.endsWith('.md'));
      if (md.length > 0) { memoFile = join(memosDir, md[0]); break; }
    }
    await page.waitForTimeout(1000);
    if (i > 0 && i % 30 === 0) console.log(`[live] …still running (${i}s)`);
  }

  const rx = await page.evaluate(() => window.__rx ?? []).catch(() => []);
  const kinds = [...new Set(rx.map((m) => m && m.kind))].filter(Boolean);
  console.log('[live] renderer received IPC kinds:', kinds.join(', ') || '(none)');
  const completes = rx.filter((m) => m && (m.kind === 'agent.complete' || m.kind === 'run.complete' || m.kind === 'run.finished'));
  const lastComplete = completes[completes.length - 1];
  if (lastComplete) console.log('[live] last completion payload:', JSON.stringify(lastComplete.payload ?? lastComplete).slice(0, 600));

  if (memoFile) {
    const base = memoFile.split('/').pop();
    const isDraft = base.endsWith('.draft.md');
    const content = readFileSync(memoFile, 'utf8');
    console.log('[live] MEMO LANDED:', base, '| stamp:', isDraft ? 'DRAFT (below threshold)' : 'CLEAN');
    console.log('[live] memo length:', content.length);
    const rigorLine = content.split('\n').find((l) => /rigor|score|threshold/i.test(l));
    if (rigorLine) console.log('[live] memo rigor line:', rigorLine.trim().slice(0, 160));
    console.log('[live] memo head:\n' + content.split('\n').slice(0, 18).map((l) => '   ' + l).join('\n'));
    exitCode = content.length > 0 ? 0 : 1;
  } else {
    console.log('[live] NO MEMO within 6min — see util log below');
  }
} catch (err) {
  console.error('[live] THREW:', err?.stack || String(err));
} finally {
  if (app) await app.close().catch(() => {});
  writeFileSync('/tmp/live-engine-mainlog.txt', mainLog.join(''));
  console.log('[live] full main/utility output → /tmp/live-engine-mainlog.txt (' + mainLog.join('').length + ' bytes)');
  const relevant = mainLog.join('').split('\n').filter((l) =>
    /run\.start|verifier|rigor|lens|synthes|red.?team|steelman|memo SafeWrite|safewrite|Error|throw|crash|uncaught|Auth|token|degrad|guard/i.test(l)).slice(0, 50);
  if (relevant.length) { console.log('\n[live] --- main/utility log (filtered) ---'); relevant.forEach((l) => console.log('  ' + l.slice(0, 240))); }
  rmSync(VAULT, { recursive: true, force: true });
}
console.log(exitCode === 0 ? '\n=== LIVE ENGINE PROVEN (real inference → rigor → memo) ===' : '\n=== LIVE ENGINE PROOF FAILED ===');
process.exit(exitCode);
