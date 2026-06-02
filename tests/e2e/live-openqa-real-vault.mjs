// Phase 0(b) probe: confirm open_qa AD-HOC ships a real, Verifier-scored, non-empty memo LIVE.
// This is the de-risk the advisor flagged: open_qa takes the Ch.7 early-return path and is scored by
// scorePlaybookRigor WITHOUT RedTeam/Steelman rows (playbookVerifier injects N/A sentinels). cash_lever
// died at exactly that contract gap; this proves the non-adversarial scoring path works end-to-end.
//
// Benign, no-trigger-keyword question -> decomposer returns ad_hoc (no deterministic route, no redirect)
// -> dynamic lens fan-out -> real Synthesizer -> run-loop Verifier (capped 85). ZERO code changes; tests
// the CURRENT path. Does NOT clean up (memo + run row persist; reversible by hand).
import { _electron as electron } from 'playwright';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { existsSync, readdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { homedir } from 'node:os';

const QUESTION = 'How should we prioritize our product roadmap investments over the next two quarters to best support durable growth?';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const appMain = join(root, 'apps', 'main');
const electronPath = require(require.resolve('electron', { paths: [appMain] }));
const REAL_VAULT = join(homedir(), 'Documents', 'Claude', 'Projects', 'Business Planning');
const memosDir = join(REAL_VAULT, 'memos');
const LIVE_LOG = '/tmp/live-openqa-real-vault.log';

const before = new Set(existsSync(memosDir) ? readdirSync(memosDir).filter((f) => f.endsWith('.md')) : []);

let app;
const mainLog = [];
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
      VAULT_PATH: REAL_VAULT,
    },
  });
  writeFileSync(LIVE_LOG, '');
  const proc = app.process();
  proc.stdout?.on('data', (d) => { mainLog.push(String(d)); appendFileSync(LIVE_LOG, String(d)); });
  proc.stderr?.on('data', (d) => { mainLog.push(String(d)); appendFileSync(LIVE_LOG, String(d)); });
  const page = await app.firstWindow();
  await page.waitForSelector('h1', { timeout: 20000 });
  console.log('app up; typing into OpenQABar -> submit -> approve (LIVE ad-hoc, REAL vault)…');

  await page.getByPlaceholder('Ask anything — decomposes into a playbook…').fill(QUESTION);
  await page.getByRole('button', { name: /Submit question to C-Suite/i }).click({ timeout: 8000 });
  const approve = page.getByTestId('plan-approve-btn');
  await approve.waitFor({ timeout: 12000 });
  await approve.click({ timeout: 5000 });
  console.log('approved — live open_qa run dispatched; waiting for the memo (decompose + lens fan-out + synth + Verifier, up to ~45 min)…');

  let newMemo = null;
  for (let i = 0; i < 5400; i++) {  // 5400 * 500ms = 45 min hard ceiling
    if (existsSync(memosDir)) {
      const md = readdirSync(memosDir).filter((f) => f.endsWith('.md') && !before.has(f) && f.includes('open_qa'));
      if (md.length) { newMemo = join(memosDir, md[0]); break; }
    }
    await page.waitForTimeout(500);
  }
  if (!newMemo) {
    console.log('NO NEW open_qa MEMO within 45min — see ' + LIVE_LOG);
    const tail = mainLog.join('').slice(-2500);
    console.log('\n----- main log tail -----\n' + tail);
  } else {
    const c = readFileSync(newMemo, 'utf8');
    const all = mainLog.join('');
    const errMatch = all.match(/(VerifierInputContractViolation|OPEN_QA_OUTPUT_CONTRACT_VIOLATION|StubbedSourceLiveError|ClaudeOutputParseError)/i);
    console.log('\n=== PHASE 0(b): open_qa AD-HOC MEMO LANDED LIVE ===');
    console.log('file: memos/' + basename(newMemo) + '  (' + c.length + ' bytes)');
    console.log('verifier/contract error seen in log: ' + (errMatch ? errMatch[1] : 'NONE'));
    console.log('\n----- MEMO BODY (first 2500 chars) -----\n' + c.slice(0, 2500) + '\n----- END -----');
  }
} catch (e) {
  console.log('THREW: ' + (e?.stack || String(e)));
} finally {
  if (app) await app.close().catch(() => {});
  writeFileSync(LIVE_LOG, mainLog.join(''));
}
