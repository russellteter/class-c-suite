// Electron renderer E2E smoke — drives the REAL Electron window (preload IPC bridge
// intact), unlike loading the dev-server URL in a plain browser (no window.ipc there).
//
// Prereq: the renderer vite dev server must be up on :5273 (VITE_DEV mode). Use
// tests/e2e/run.sh which guarantees that and kills any stale single-instance holder.
//
// Output: per-screen screenshots in tests/e2e/screenshots/ + a JSON report at
// tests/e2e/report.json + a human summary on stdout. Read-only against the app
// except for the interactions it drives (navigation clicks, optional cancel probe).
import { _electron as electron } from 'playwright';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const appMain = join(root, 'apps', 'main');
const shots = join(here, 'screenshots');
mkdirSync(shots, { recursive: true });

// Resolve the Electron binary from apps/main (electron is a dep there).
const electronPath = require(require.resolve('electron', { paths: [appMain] }));

const consoleMsgs = [];
const pageErrors = [];
const report = { startedAt: new Date().toISOString(), screens: [], consoleErrors: [], pageErrors: [], summary: {} };

function snapshotConsoleErrorsSince(idx) {
  return consoleMsgs.slice(idx).filter((m) => m.type === 'error').map((m) => m.text);
}

const app = await electron.launch({
  executablePath: electronPath,
  args: ['.'],
  cwd: appMain,
  env: { ...process.env, VITE_DEV: '1', NODE_ENV: 'development', ELECTRON_ENABLE_LOGGING: '1' },
});

const page = await app.firstWindow();
page.on('console', (msg) => consoleMsgs.push({ type: msg.type(), text: msg.text() }));
page.on('pageerror', (err) => pageErrors.push(String(err)));

async function probe(label, fn) {
  const before = consoleMsgs.length;
  const entry = { label, ok: true, notes: [], consoleErrors: [] };
  try {
    await fn(entry);
  } catch (e) {
    entry.ok = false;
    entry.notes.push('EXCEPTION: ' + String(e).split('\n')[0]);
  }
  entry.consoleErrors = snapshotConsoleErrorsSince(before);
  const safe = label.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  try { await page.screenshot({ path: join(shots, `${safe}.png`) }); entry.screenshot = `${safe}.png`; } catch {}
  report.screens.push(entry);
  console.log(`  [${entry.ok ? 'ok' : 'FAIL'}] ${label}${entry.consoleErrors.length ? ` — ${entry.consoleErrors.length} console error(s)` : ''}`);
}

// 1) Mount
await probe('home-initial', async (e) => {
  await page.waitForSelector('h1', { timeout: 20000 });
  e.notes.push('title=' + (await page.title()));
  e.notes.push('h1=' + (await page.locator('h1').first().innerText().catch(() => '?')));
});

// 1b) IPC bridge round-trip — proves preload exposed window.ipc AND a real handler answers
await probe('ipc-bridge-roundtrip', async (e) => {
  const bridge = await page.evaluate(() => ({
    hasIpc: typeof window.ipc,
    hasInvoke: typeof window.ipc?.invoke,
    hasSend: typeof window.ipc?.send,
  }));
  e.notes.push('window.ipc=' + bridge.hasIpc + ' invoke=' + bridge.hasInvoke + ' send=' + bridge.hasSend);
  // round-trip a known-registered handler (runs:list)
  const rt = await page.evaluate(async () => {
    try { const r = await window.ipc.invoke('runs:list'); return { ok: true, type: Array.isArray(r) ? `array(${r.length})` : typeof r }; }
    catch (err) { return { ok: false, err: String(err).slice(0, 160) }; }
  });
  e.notes.push('runs:list → ' + JSON.stringify(rt));
  if (!rt.ok) e.notes.push('BRIDGE ROUND-TRIP FAILED');
  // probe a known-MISSING handler to confirm B-category failure mode
  const miss = await page.evaluate(async () => {
    try { await window.ipc.invoke('scheduler.settings.get'); return { ok: true }; }
    catch (err) { return { ok: false, err: String(err).slice(0, 160) }; }
  });
  e.notes.push('scheduler.settings.get → ' + JSON.stringify(miss));
});

async function goHome() {
  const home = page.getByRole('button', { name: /^(C-Suite home|Go to Home|Home)$/i }).first();
  if (await home.count()) { await home.click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(400); }
}

// 2) Token usage — should NOT stay "USAGE LOADING…" if cost.usage IPC works
await probe('token-usage', async (e) => {
  const txt = await page.locator('body').innerText();
  const stuckLoading = /USAGE LOADING/i.test(txt);
  e.notes.push('usageStuckLoading=' + stuckLoading);
  if (stuckLoading) e.notes.push('WARN: token usage never resolved');
});

// 3) Context rail data — workstreams / decisions / writebacks
await probe('context-rail', async (e) => {
  const txt = await page.locator('body').innerText();
  e.notes.push('noActiveWorkstreams=' + /No active workstreams/i.test(txt));
  e.notes.push('noOpenDecisions=' + /No open decisions/i.test(txt));
  e.notes.push('writebacksText=' + (txt.match(/(\d+) pending/i)?.[0] ?? '?'));
});

// 4) Enumerate all buttons (nav + playbooks + settings) for the report
await probe('enumerate-controls', async (e) => {
  const names = await page.getByRole('button').evaluateAll((els) =>
    els.map((b) => (b.getAttribute('aria-label') || b.textContent || '').trim()).filter(Boolean),
  );
  e.notes.push('buttonCount=' + names.length);
  report.summary.buttons = names;
});

// 5) Navigate each top-level screen we can find by accessible name
const navTargets = [
  'Connectors', 'Round Table', 'RoundTable', 'Conversation', 'Memo', 'Handoff',
  'Accepted', 'History', 'Writebacks', 'Scheduler', 'Notifications', 'Decisions', 'Workstreams',
];
for (const name of navTargets) {
  await probe(`nav-${name}`, async (e) => {
    await goHome();
    const btn = page.getByRole('button', { name: new RegExp(name, 'i') }).first();
    const count = await btn.count();
    if (!count) { e.notes.push('no nav control found — skipped'); e.skipped = true; return; }
    await btn.click({ timeout: 4000 });
    await page.waitForTimeout(700);
    e.notes.push('clicked; bodyLen=' + (await page.locator('body').innerText()).length);
  });
}

// 6) Open first playbook → PlanApproval → reproduce run.cancelled (the known bug)
await probe('playbook-open-and-cancel', async (e) => {
  const pb = page.getByRole('button', { name: /Cash Lever/i }).first();
  if (!(await pb.count())) { e.notes.push('Cash Lever playbook button not found'); e.skipped = true; return; }
  const before = consoleMsgs.length;
  await pb.click({ timeout: 4000 });
  await page.waitForTimeout(1200);
  e.notes.push('afterPlaybookClick bodyLen=' + (await page.locator('body').innerText()).length);
  // try to find a Cancel control (PlanApproval emits run.cancelled)
  const cancel = page.getByRole('button', { name: /cancel/i }).first();
  if (await cancel.count()) {
    await cancel.click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(800);
    const errs = snapshotConsoleErrorsSince(before);
    const zerr = errs.find((t) => /run\.cancelled|ZodError|No matching discriminator/i.test(t));
    e.notes.push('cancelClicked=true');
    if (zerr) e.notes.push('REPRODUCED run.cancelled ZodError: ' + zerr.slice(0, 160));
  } else {
    e.notes.push('no Cancel control reached (plan may not have rendered)');
  }
});

report.consoleErrors = consoleMsgs.filter((m) => m.type === 'error').map((m) => m.text);
report.pageErrors = pageErrors;
report.summary.totalConsoleErrors = report.consoleErrors.length;
report.summary.totalPageErrors = pageErrors.length;
report.summary.screensProbed = report.screens.length;
report.finishedAt = new Date().toISOString();
writeFileSync(join(here, 'report.json'), JSON.stringify(report, null, 2));

console.log('\n=== SUMMARY ===');
console.log('screens probed:', report.summary.screensProbed);
console.log('total console errors:', report.summary.totalConsoleErrors);
console.log('total pageerrors:', report.summary.totalPageErrors);
if (report.consoleErrors.length) {
  console.log('--- unique console error heads ---');
  [...new Set(report.consoleErrors.map((t) => t.split('\n')[0]))].slice(0, 20).forEach((t) => console.log('  •', t.slice(0, 180)));
}

await app.close();
console.log('\nreport: tests/e2e/report.json  | screenshots: tests/e2e/screenshots/');
