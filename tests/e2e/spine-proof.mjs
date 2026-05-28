// Headless proof of the run-path spine (staged in-memory slice).
// Runs the EXACT composition the utility run.start handler performs:
//   openRunScopedDb() -> startRun('cash_lever') -> memo SafeWrite
// Must run under Electron's ABI (better-sqlite3 is built for Electron 33):
//   ELECTRON_RUN_AS_NODE=1 ./node_modules/.bin/electron tests/e2e/spine-proof.mjs
//
// Self-cleaning: writes the memo into a throwaway temp vault, asserts it landed,
// then removes it. Exit 0 = spine proven.

import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const VAULT = mkdtempSync(join(tmpdir(), 'csuite-spine-'));
process.env.STUB_MODE = 'replay';
process.env.VAULT_PATH = VAULT;

const REPO = process.cwd();
const QUESTION =
  'Should we shift our W30 trough mitigation from line-of-credit draw to deferred AWS spend?';
const RUN_ID = 'seed-run-001'; // resolves the committed seed fixtures for all roles

let exitCode = 0;
const ipc = [];
try {
  const { openRunScopedDb } = await import(`${REPO}/apps/utility/dist/orchestrator/inMemoryDb.js`);
  const { startRun } = await import(`${REPO}/apps/utility/dist/orchestrator/run-loop.js`);
  const { safeWrite, getVaultPath } = await import(`${REPO}/apps/utility/dist/safewrite/index.js`);

  const db = openRunScopedDb();
  const result = await startRun(RUN_ID, 'cash_lever', QUESTION, db, (m) => ipc.push(m?.kind));

  console.log('final state:      ', result.finalState?.kind);
  console.log('agents invoked:   ', result.agentRolesInvoked?.join(', '));
  console.log('memoPath:         ', result.memoPath);
  console.log('memoMarkdown len: ', result.memoMarkdown?.length ?? 0);
  console.log('memo head:        ', JSON.stringify((result.memoMarkdown ?? '').slice(0, 80)));
  console.log('ipc kinds emitted:', [...new Set(ipc)].join(', ') || '(none)');

  function check(name, cond) {
    console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
    if (!cond) exitCode = 1;
  }

  check('reaches a terminal shipped/committed/handoff state',
    ['shipped-clean', 'shipped-draft', 'committed', 'handoff'].includes(result.finalState?.kind));
  check('Synthesizer was invoked', result.agentRolesInvoked?.includes('Synthesizer'));
  check('memoMarkdown is non-empty', (result.memoMarkdown?.length ?? 0) > 0);
  check('memoPath is vault-relative under memos/', /^memos\/.*\.md$/.test(result.memoPath ?? ''));

  // Memo surface: SafeWrite to the temp vault, assert the file lands with the content.
  const absPath = join(getVaultPath(), result.memoPath);
  const writeResult = await safeWrite({
    absPath,
    content: result.memoMarkdown,
    agent: 'Synthesizer',
    playbook: 'cash_lever',
    runId: RUN_ID,
  });
  check('safeWrite returned ok', writeResult?.ok === true);
  check('memo file exists in vault', existsSync(absPath));
  check('memo file content matches', existsSync(absPath) && readFileSync(absPath, 'utf8') === result.memoMarkdown);

  db.close();
} catch (err) {
  console.error('SPINE PROOF THREW:', err?.stack || String(err));
  exitCode = 1;
} finally {
  rmSync(VAULT, { recursive: true, force: true });
}

console.log(exitCode === 0 ? '\n=== SPINE PROVEN ===' : '\n=== SPINE FAILED ===');
process.exit(exitCode);
