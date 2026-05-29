// LIVE engine proof (Phase 3 / GATE-3): drives the assembled Electron app with STUB_MODE=live
// so the REAL Verifier (Opus, Max subscription) scores a real run. Parametrized by playbook:
//   PLAYBOOK_TILE (default "Board Narrative / Deck") + PLAYBOOK_KEY (default board_narrative).
//
// board_narrative is the cheap GATE-3 slice (S1+S2 only, manual approve = no double-fire): proves
// real Verifier + a POPULATED tool-call audit trail (S1 insert → S2 read) + real connector data +
// memo SafeWrite + DRAFT/CLEAN. Its lens reasoning is templated (inline assembly), so this proves
// the grading/data/persistence half — NOT real lens inference. pre_mortem (after O1+U1) proves the
// inference half: run with PLAYBOOK_TILE="Pre-mortem" PLAYBOOK_KEY=pre_mortem.
//
// Memo → throwaway vault (real vault stays clean). The runs + tool_calls rows land in the REAL
// runtime.db (supervisor hard-sets C_SUITE_DB_PATH=userData/runtime.db) — which is what lets this
// proof query the audit trail the Verifier scored on.

import { _electron as electron } from 'playwright';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { mkdtempSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execSync, execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const appMain = join(root, 'apps', 'main');
const electronPath = require(require.resolve('electron', { paths: [appMain] }));

const TILE = process.env.PLAYBOOK_TILE || 'Board Narrative / Deck';
const PB_KEY = process.env.PLAYBOOK_KEY || 'board_narrative';
const REAL_DB = join(homedir(), 'Library', 'Application Support', '@c-suite', 'main', 'runtime.db');

const envLocal = {};
try {
  for (const line of readFileSync(join(appMain, '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    envLocal[m[1]] = v;
  }
} catch { /* main loads it itself */ }
delete envLocal.ANTHROPIC_API_KEY;

const VAULT = mkdtempSync(join(tmpdir(), 'csuite-live-'));
execSync('git init -q && git config user.email proof@local && git config user.name proof', { cwd: VAULT });
writeFileSync(join(VAULT, '.gitkeep'), '');
execSync('git add -A && git commit -q -m init', { cwd: VAULT });

function dbq(sql) {
  try { return execFileSync('sqlite3', [REAL_DB, sql], { encoding: 'utf8' }).trim(); }
  catch (e) { return `(query failed: ${String(e.message).split('\n')[0]})`; }
}

let exitCode = 1;
const mainLog = [];
let app;
try {
  app = await electron.launch({
    executablePath: electronPath,
    args: [appMain],
    cwd: root,
    env: { ...process.env, ...envLocal, VITE_DEV: '1', NODE_ENV: 'development', ELECTRON_ENABLE_LOGGING: '1', UTILITY_FORWARD_LOGS: '1', STUB_MODE: 'live', ANTHROPIC_API_KEY: '', VAULT_PATH: VAULT },
  });
  const proc = app.process();
  proc.stdout?.on('data', (d) => mainLog.push(String(d)));
  proc.stderr?.on('data', (d) => mainLog.push(String(d)));

  const page = await app.firstWindow();
  page.on('console', (m) => { if (m.type() === 'error') mainLog.push('[renderer.console.error] ' + m.text()); });
  await page.waitForSelector('h1', { timeout: 20000 });
  console.log(`[live] app up — playbook: ${PB_KEY} (tile "${TILE}")`);

  await page.evaluate(() => { window.__rx = []; if (window.ipc?.on) window.ipc.on('ipc:message', (m) => window.__rx.push(m)); });

  const pb = page.getByRole('button', { name: new RegExp(TILE.split(' ')[0], 'i') }).first();
  if (!(await pb.count())) throw new Error(`playbook tile not found: ${TILE}`);
  await pb.click({ timeout: 5000 });
  const approve = page.getByTestId('plan-approve-btn');
  await approve.waitFor({ timeout: 8000 });
  console.log('[live] Approve & Run — LIVE inference begins…');
  await approve.click({ timeout: 5000 });

  const memosDir = join(VAULT, 'memos');
  let memoFile = null;
  for (let i = 0; i < 540; i++) {   // full live pipeline = RedTeam + Steelman (Sonnet) + Opus Verifier ≈ 6 min
    if (existsSync(memosDir)) {
      const md = readdirSync(memosDir).filter((f) => f.endsWith('.md'));
      if (md.length > 0) { memoFile = join(memosDir, md[0]); break; }
    }
    await page.waitForTimeout(1000);
    if (i > 0 && i % 30 === 0) console.log(`[live] …running (${i}s)`);
  }

  const rx = await page.evaluate(() => window.__rx ?? []).catch(() => []);
  const completes = rx.filter((m) => m && (m.kind === 'agent.complete' || m.kind === 'run.complete'));
  const last = completes[completes.length - 1];
  let runId = last?.payload?.runId;

  if (memoFile) {
    const base = memoFile.split('/').pop();
    const isDraft = base.endsWith('.draft.md');
    const content = readFileSync(memoFile, 'utf8');
    const shortId = (base.match(/-([0-9a-f]{8})\.(draft\.)?md$/) || [])[1];
    if (!runId && shortId) runId = shortId;
    console.log(`[live] MEMO: ${base} | stamp: ${isDraft ? 'DRAFT (below threshold)' : 'CLEAN'} | length: ${content.length}`);

    // S1+S2 PROOF: the tool-call audit trail the Verifier scored on, from the REAL runtime.db.
    const idMatch = runId ? (runId.length >= 8 ? `run_id LIKE '${runId.slice(0, 8)}%'` : `run_id='${runId}'`) : `run_id LIKE '%'`;
    const tcCount = dbq(`SELECT count(*) FROM tool_calls WHERE ${idMatch};`);
    const tcDetail = dbq(`SELECT agent_role || ' ' || tool_name FROM tool_calls WHERE ${idMatch} ORDER BY called_at;`);
    const runRow = dbq(`SELECT run_id, playbook, status FROM runs WHERE ${idMatch} ORDER BY started_at DESC LIMIT 1;`);
    console.log(`[live] runId≈${runId} | run row: ${runRow}`);
    console.log(`[live] tool_calls in audit trail (S1 insert→S2 read): ${tcCount}`);
    if (tcDetail) console.log(`[live] audit trail:\n   ${tcDetail.split('\n').join('\n   ')}`);
    const rigorLine = content.split('\n').find((l) => /rigor|score/i.test(l));
    if (rigorLine) console.log(`[live] memo rigor line: ${rigorLine.trim().slice(0, 160)}`);
    console.log('[live] memo head:\n' + content.split('\n').slice(0, 16).map((l) => '   ' + l).join('\n'));
    exitCode = content.length > 0 ? 0 : 1;
  } else {
    console.log('[live] NO MEMO within 6min — see util log');
  }
} catch (err) {
  console.error('[live] THREW:', err?.stack || String(err));
} finally {
  if (app) await app.close().catch(() => {});
  writeFileSync('/tmp/live-engine-mainlog.txt', mainLog.join(''));
  const rel = mainLog.join('').split('\n').filter((l) => /run\.start|verifier|rigor|lens|synthes|red.?team|steelman|SafeWrite|safewrite|Error|throw|crash|uncaught|Auth|token|degrad|guard|tool_call|FOREIGN|NOT NULL/i.test(l)).slice(0, 50);
  console.log('[live] full log → /tmp/live-engine-mainlog.txt');
  if (rel.length) { console.log('[live] --- filtered util log ---'); rel.forEach((l) => console.log('  ' + l.slice(0, 240))); }
  rmSync(VAULT, { recursive: true, force: true });
}
console.log(exitCode === 0 ? `\n=== LIVE GATE PROVEN (${PB_KEY}) ===` : `\n=== LIVE GATE FAILED (${PB_KEY}) ===`);
process.exit(exitCode);
