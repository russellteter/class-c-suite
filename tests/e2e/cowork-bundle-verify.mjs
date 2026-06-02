// Phase 1 (C4 handback half): prove the Claude Desktop CoWork hand-back writes a REAL folder bundle to
// the vault — memo.md + brief.md (RealClaudeClient-authored, not stub) + continue-prompt.md — driven the
// way Russell would: open a grounded memo -> "Draw up for Cowork" CTA -> preview -> Send -> bundle on disk.
// Usage: node tests/e2e/cowork-bundle-verify.mjs <memo-shortId>   (default: decision-1 org memo)
import { _electron as electron } from 'playwright';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';

const SHORT = process.argv[2] || 'c902b7c6';
const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const appMain = join(root, 'apps', 'main');
const electronPath = require(require.resolve('electron', { paths: [appMain] }));
const REAL_VAULT = join(homedir(), 'Documents', 'Claude', 'Projects', 'Business Planning');
const memoRel = `memos/2026-06-01-open_qa-${SHORT}.md`;
const handoffsDir = join(REAL_VAULT, 'handoffs');
const shots = join(here, 'screenshots');
const isDir = (p) => { try { return statSync(p).isDirectory(); } catch { return false; } };
const beforeFolders = new Set(existsSync(handoffsDir) ? readdirSync(handoffsDir).filter((f) => isDir(join(handoffsDir, f))) : []);

let app;
const mainLog = [];
let exitCode = 1;
try {
  app = await electron.launch({
    executablePath: electronPath, args: [appMain], cwd: root,
    env: { ...process.env, VITE_DEV: '1', NODE_ENV: 'development', ELECTRON_ENABLE_LOGGING: '1', UTILITY_FORWARD_LOGS: '1', STUB_MODE: 'live', VAULT_PATH: REAL_VAULT },
  });
  const proc = app.process();
  proc.stdout?.on('data', (d) => mainLog.push(String(d)));
  proc.stderr?.on('data', (d) => mainLog.push(String(d)));
  const page = await app.firstWindow();
  await page.waitForSelector('h1', { timeout: 20000 });

  const runId = await page.evaluate(async (rel) => {
    const rows = await window.ipc.invoke('runs:list');
    const mine = (Array.isArray(rows) ? rows : []).find((r) => r.memo_path === rel);
    return mine ? mine.run_id : null;
  }, memoRel);
  if (!runId) throw new Error('no run row for ' + memoRel);
  console.log('[cowork] memo runId=' + runId.slice(0, 8));
  await page.reload();
  await page.waitForSelector('h1', { timeout: 20000 });
  const row = page.getByTestId(`recent-run-${runId}`);
  await row.waitFor({ timeout: 10000 });
  await row.click();
  await page.getByTestId('memo-viewer').waitFor({ timeout: 8000 });

  const cta = page.getByTestId('draw-up-cta');
  await cta.waitFor({ timeout: 8000 });
  console.log('[cowork] "Draw up for Cowork" CTA visible — clicking (brief via RealClaudeClient, ~1-3 min)…');
  await cta.click();
  await page.getByTestId('handoff-preview').waitFor({ timeout: 360000 });
  await page.waitForTimeout(1000);
  const previewShot = join(shots, `cowork-preview-${SHORT}.png`);
  await page.screenshot({ path: previewShot, fullPage: true });
  console.log('[cowork] preview ready — clicking Send to Cowork…');
  await page.getByTestId('send-to-cowork-btn').click();

  // Wait for the COMPLETE bundle — not just the folder. safeWrite mkdir's the dir before the files land
  // and writes each atomically (.tmp → rename); polling on folder-existence alone races the writes, and
  // closing the app mid-write truncates memo.md/continue-prompt.md. Require all 3 files present, no
  // leftover .tmp, and brief.md non-empty before we report + screenshot + close.
  const REQUIRED = ['brief.md', 'memo.md', 'continue-prompt.md'];
  let folder = null;
  for (let i = 0; i < 360; i++) { // 3 min
    if (existsSync(handoffsDir)) {
      const cand = readdirSync(handoffsDir).filter((x) => isDir(join(handoffsDir, x)) && !beforeFolders.has(x));
      if (cand.length) {
        const f = join(handoffsDir, cand[0]);
        const have = readdirSync(f);
        const complete = REQUIRED.every((n) => have.includes(n))
          && !have.some((n) => n.includes('.tmp'))
          && existsSync(join(f, 'brief.md')) && statSync(join(f, 'brief.md')).size > 0;
        if (complete) { folder = f; break; }
      }
    }
    await page.waitForTimeout(500);
  }

  if (!folder) {
    console.log('[cowork] NO new bundle folder within 2min — see log tail');
    console.log('\n--- log tail ---\n' + mainLog.join('').slice(-2000));
  } else {
    const files = readdirSync(folder).sort();
    const briefP = join(folder, 'brief.md');
    const briefMd = existsSync(briefP) ? readFileSync(briefP, 'utf8') : '';
    const stubFp = /Stub citation|STUB output|see Ch\.4|tests\/fixtures\/stubs|replay fixture/i.test(briefMd);
    const has = (n) => files.includes(n);
    console.log('\n=== COWORK BUNDLE WRITTEN TO VAULT ===');
    console.log('folder:             handoffs/' + basename(folder));
    console.log('files:              ' + files.join(', '));
    console.log('brief.md:           ' + briefMd.length + ' bytes — stub fingerprint: ' + (stubFp ? 'PRESENT (suspicious)' : 'NONE (RealClaudeClient)'));
    console.log('memo.md present:    ' + has('memo.md'));
    console.log('continue-prompt.md: ' + has('continue-prompt.md'));
    console.log('preview screenshot: ' + previewShot);
    console.log('\n----- brief.md (first 1400 chars) -----\n' + briefMd.slice(0, 1400) + '\n----- END -----');
    exitCode = has('brief.md') && has('memo.md') && has('continue-prompt.md') && !stubFp ? 0 : 1;
  }
} catch (e) {
  console.log('THREW: ' + (e?.stack || String(e)));
  console.log('\n--- log tail ---\n' + mainLog.join('').slice(-2000));
} finally {
  if (app) await app.close().catch(() => {});
}
console.log(exitCode === 0 ? '\n=== COWORK BUNDLE PROVEN ===' : '\n=== COWORK BUNDLE NOT PROVEN ===');
process.exit(exitCode);
