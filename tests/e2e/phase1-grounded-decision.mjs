// Phase 1 (C1+C2+C5): drive an ARBITRARY strategic decision through the in-app ask box LIVE and prove a
// grounded, 6-lens, Synthesizer-authored memo ships with a "Vault context used (with dates)" provenance
// block — then screenshot the rendered memo in the real app window (the artifact Russell can SEE).
//
//   OpenQABar(question) -> submit -> approve -> run.start -> open_qa live strategic path
//   -> buildVaultGrounding(top-8 notes) injected into all 6 lenses -> real Synthesizer -> Verifier (cap 85)
//   -> memo SafeWritten with provenance -> Home Recent Runs -> click -> MemoViewer renders it.
//
// Usage: node tests/e2e/phase1-grounded-decision.mjs "<question>" <tag>
// Does NOT clean up — the grounded memo + run row persist (they ARE the dogfood deliverable).
import { _electron as electron } from 'playwright';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { existsSync, readdirSync, readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';

const QUESTION = process.argv[2] || 'What should our go-forward whole-company org structure be?';
const TAG = process.argv[3] || 'decision';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const appMain = join(root, 'apps', 'main');
const electronPath = require(require.resolve('electron', { paths: [appMain] }));
const REAL_VAULT = join(homedir(), 'Documents', 'Claude', 'Projects', 'Business Planning');
const memosDir = join(REAL_VAULT, 'memos');
const shots = join(here, 'screenshots');
mkdirSync(shots, { recursive: true });
const LIVE_LOG = `/tmp/phase1-${TAG}.log`;
const shotPath = join(shots, `phase1-${TAG}.png`);

const before = new Set(existsSync(memosDir) ? readdirSync(memosDir).filter((f) => f.endsWith('.md')) : []);

let app;
const mainLog = [];
let exitCode = 1;
try {
  app = await electron.launch({
    executablePath: electronPath,
    args: [appMain],
    cwd: root,
    env: { ...process.env, VITE_DEV: '1', NODE_ENV: 'development', ELECTRON_ENABLE_LOGGING: '1', UTILITY_FORWARD_LOGS: '1', STUB_MODE: 'live', VAULT_PATH: REAL_VAULT },
  });
  writeFileSync(LIVE_LOG, '');
  const proc = app.process();
  proc.stdout?.on('data', (d) => { mainLog.push(String(d)); appendFileSync(LIVE_LOG, String(d)); });
  proc.stderr?.on('data', (d) => { mainLog.push(String(d)); appendFileSync(LIVE_LOG, String(d)); });
  const page = await app.firstWindow();
  await page.waitForSelector('h1', { timeout: 20000 });
  console.log(`[phase1:${TAG}] app up; asking: "${QUESTION}"`);

  await page.getByPlaceholder('Ask anything — decomposes into a playbook…').fill(QUESTION);
  await page.getByRole('button', { name: /Submit question to C-Suite/i }).click({ timeout: 8000 });
  const approve = page.getByTestId('plan-approve-btn');
  await approve.waitFor({ timeout: 12000 });
  await approve.click({ timeout: 5000 });
  console.log(`[phase1:${TAG}] approved — grounded 6-lens live run dispatched; waiting for memo (up to ~50 min)…`);

  let newMemo = null;
  for (let i = 0; i < 6000; i++) { // 6000 * 500ms = 50 min ceiling
    if (existsSync(memosDir)) {
      const md = readdirSync(memosDir).filter((f) => f.endsWith('.md') && !before.has(f) && f.includes('open_qa'));
      if (md.length) { newMemo = join(memosDir, md[0]); break; }
    }
    // Poll the filesystem with a page-INDEPENDENT timer: a transient renderer/Playwright blip during
    // the 9-17 min synth wait must NOT abort an otherwise-healthy run (observed 2026-06-02: a mojom
    // page-close at +4min threw page.waitForTimeout → finally→app.close() killed a live 6-lens run).
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!newMemo) {
    console.log(`[phase1:${TAG}] NO MEMO within 50min — see ${LIVE_LOG}`);
    console.log('\n--- main log tail ---\n' + mainLog.join('').slice(-2500));
  } else {
    const memoRel = 'memos/' + basename(newMemo);
    const c = readFileSync(newMemo, 'utf8');
    const all = mainLog.join('');
    const groundLine = (all.match(/open_qa strategic: 6-lens, grounded=\S+ \(\d+ vault notes\)/) || [])[0] || 'NOT FOUND in log';
    const hasProvenance = c.includes('## Vault context used');
    const errMatch = all.match(/(VerifierInputContractViolation|OPEN_QA_OUTPUT_CONTRACT_VIOLATION|StubbedSourceLiveError|ClaudeOutputParseError)/i);
    console.log(`\n=== PHASE 1 [${TAG}]: GROUNDED MEMO LANDED LIVE ===`);
    console.log('file:        ' + memoRel + '  (' + c.length + ' bytes)');
    console.log('grounding:   ' + groundLine);
    console.log('provenance:  ' + (hasProvenance ? 'PRESENT ("## Vault context used")' : 'MISSING'));
    console.log('verifier err:' + (errMatch ? errMatch[1] : ' NONE'));

    // Render proof: navigate to the memo in-app and screenshot it.
    try {
      const myRunId = await page.evaluate(async (rel) => {
        const rows = await window.ipc.invoke('runs:list');
        const mine = (Array.isArray(rows) ? rows : []).find((r) => r.memo_path === rel);
        return mine ? mine.run_id : null;
      }, memoRel);
      if (myRunId) {
        await page.reload();
        await page.waitForSelector('h1', { timeout: 20000 });
        const myRow = page.getByTestId(`recent-run-${myRunId}`);
        await myRow.waitFor({ timeout: 10000 });
        await myRow.click({ timeout: 5000 });
        await page.getByTestId('memo-viewer').waitFor({ timeout: 8000 });
        await page.waitForTimeout(800);
        await page.screenshot({ path: shotPath, fullPage: true });
        console.log('screenshot:  ' + shotPath);
      } else {
        console.log('screenshot:  SKIPPED (runs:list had no matching memo_path)');
      }
    } catch (e) {
      console.log('screenshot:  FAILED (' + String(e?.message || e) + ') — memo .md is the durable artifact');
    }

    // C4 render half — prove the moat feature: click a [^vault-N] provenance citation and confirm the
    // tool-call panel resolves it (run-scoped source_id → the note's excerpt). This exercises the full
    // a→b→c chain live (rows emitted → marker rendered clickable → handler resolves), not just the .md.
    let clickResolved = 'NOT TESTED';
    try {
      const badge = page.locator('[data-source-id="vault-1"]').first();
      await badge.waitFor({ timeout: 8000 });
      await badge.click({ timeout: 5000 });
      const panel = page.getByTestId('tool-call-panel');
      await panel.waitFor({ timeout: 8000 });
      await page.waitForTimeout(600);
      const panelText = (await panel.textContent()) || '';
      const resolved = panelText.includes('vault.retrieve') && !panelText.includes('(no tool call found)');
      clickResolved = resolved ? 'RESOLVED (vault.retrieve excerpt shown)' : `UNRESOLVED panel="${panelText.slice(0, 120)}"`;
      await page.screenshot({ path: join(shots, `phase1-${TAG}-citation.png`), fullPage: true });
    } catch (e) {
      clickResolved = 'CLICK FAILED (' + String(e?.message || e) + ')';
    }
    console.log('citation click:' + clickResolved);

    // Show the provenance block + the tail of the memo so the grounding is visible in this output.
    const provIdx = c.indexOf('## Vault context used');
    console.log('\n----- PROVENANCE BLOCK -----\n' + (provIdx >= 0 ? c.slice(provIdx, provIdx + 1400) : '(none)') + '\n----- END -----');
    exitCode = hasProvenance && !errMatch && clickResolved.startsWith('RESOLVED') ? 0 : 1;
  }
} catch (e) {
  console.log('THREW: ' + (e?.stack || String(e)));
} finally {
  if (app) await app.close().catch(() => {});
  writeFileSync(LIVE_LOG, mainLog.join(''));
}
process.exit(exitCode);
