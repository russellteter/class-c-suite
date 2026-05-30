// Runs cash_lever LIVE against the REAL vault so a real, grounded memo appears in Russell's
// Recent Runs (Home screen) where he can open + read it. Does NOT clean up — the memo + run row
// persist on purpose. Reversible by hand (rm the file + delete the row) if unwanted.
import { _electron as electron } from 'playwright';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const appMain = join(root, 'apps', 'main');
const electronPath = require(require.resolve('electron', { paths: [appMain] }));
const REAL_VAULT = join(homedir(), 'Documents', 'Claude', 'Projects', 'Business Planning');
const memosDir = join(REAL_VAULT, 'memos');

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
  const proc = app.process();
  proc.stdout?.on('data', (d) => mainLog.push(String(d)));
  proc.stderr?.on('data', (d) => mainLog.push(String(d)));
  const page = await app.firstWindow();
  await page.waitForSelector('h1', { timeout: 20000 });
  console.log('app up; clicking Cash Lever → Approve (LIVE, REAL vault)…');
  await page.getByRole('button', { name: /Cash Lever/i }).first().click({ timeout: 5000 });
  const approve = page.getByTestId('plan-approve-btn');
  await approve.waitFor({ timeout: 8000 });
  await approve.click({ timeout: 5000 });
  console.log('approved — live run dispatched; waiting for the memo (6-lens fan-out + synth + verifier, up to ~60 min)…');

  let newMemo = null;
  for (let i = 0; i < 7200; i++) {
    if (existsSync(memosDir)) {
      // Wait for the CASH_LEVER memo specifically — boot-resume + morning-brief dispatch other
      // (faster, no-Verifier) playbooks like quick_read whose memo would otherwise win the race
      // and make us exit before the grounded cash_lever run finishes (~40 min with the Opus Verifier).
      const md = readdirSync(memosDir).filter((f) => f.endsWith('.md') && !before.has(f) && f.includes('cash_lever'));
      if (md.length) { newMemo = join(memosDir, md[0]); break; }
    }
    await page.waitForTimeout(500);
  }
  if (!newMemo) {
    console.log('NO NEW MEMO within 3600s — see /tmp/live-cash-real-vault.log');
  } else {
    const c = readFileSync(newMemo, 'utf8');
    const gm = mainLog.join('').match(/cash_lever grounding:\s*(\d+)\s*lever rows/i);
    console.log('\n=== NEW MEMO LANDED IN YOUR VAULT ===');
    console.log('file: memos/' + basename(newMemo) + '  (' + c.length + ' bytes)');
    console.log('grounding: ' + (gm ? gm[1] + ' real lever rows fed to the lenses' : 'NONE (ungrounded)'));
    console.log('\n----- MEMO BODY (first 3000 chars) -----\n' + c.slice(0, 3000) + '\n----- END -----');
  }
} catch (e) {
  console.log('THREW: ' + (e?.stack || String(e)));
} finally {
  if (app) await app.close().catch(() => {});
  writeFileSync('/tmp/live-cash-real-vault.log', mainLog.join(''));
}
