// tests/unit/orchestrator/cash-lever-grounding-degrade.spec.ts
// Source: tasks/followup-specs.md Thread 3(d) — the degrade-on-empty-grounding honesty stamp.
//
// Gap being closed: the interactive cash_lever run takes the Ch.5 generic path (run-loop.ts), where
// buildCashLeverGrounding() returns [] when the vault has no cash-model xlsx (absent/renamed/0 rows).
// Before this fix the run shipped CLEAN at rigor 90+ with an UNGROUNDED memo that looked grounded —
// a DOCTRINE #1 (truth over appearance) violation. The fix STAMPS the run degraded and prepends a
// DEGRADED banner to the memo; it must NEVER throw (DOCTRINE: grounding never blocks).
//
// Altitude: drives the real startRun() (Ch.5 cash_lever path) under STUB_MODE=replay — the same
// composition spine-proof.mjs proves. The ONLY variable is VAULT_PATH (empty vs has-a-model-xlsx),
// so this proves the run-loop WIRING (grounding -> degradedSources -> banner), not an isolated helper.
// dispatchLens/dispatchSynthesizer replay always resolve the committed seed-run-001 fixtures first,
// so any runId completes to a terminal state.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { startRun, prependDegradedBanner } from '../../../apps/utility/src/orchestrator/run-loop.js';
import { seedFromMigrations } from '../../helpers/seedFromMigrations.js';

// xlsx is CommonJS; load via createRequire so writeFile/utils resolve consistently (mirrors
// apps/utility/src/data/cash-model.ts, which documents why `import * as XLSX` puts the API on .default).
const require = createRequire(import.meta.url);
const XLSX = require('xlsx') as typeof import('xlsx');

const QUESTION = 'Should we shift our W30 trough mitigation from a line-of-credit draw to deferred AWS spend?';
const noopEmit = () => void 0;

/**
 * Write a minimal but real cash-lever model into `dir`. Filename matches MODEL_RE
 * (Class_Cash_Lever_Model_v\d+_YYYY-MM-DD.xlsx); sheet "03_Cost_Levers" carries a "Line Item"
 * header row + one lever row so readXlsxLeverRows() returns a non-empty result.
 */
function writeModelXlsx(dir: string): void {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Line Item', 'Finance Forecast (34 wks)', 'Annual Adjustment', 'Weekly Impact', 'Notes / Rationale'],
    ['Payroll', -1_000_000, 0, 0, 'test lever'],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '03_Cost_Levers');
  XLSX.writeFile(wb, path.join(dir, 'Class_Cash_Lever_Model_v1_2026-01-01.xlsx'));
}

describe('Thread 3(d): cash_lever degrade-on-empty-grounding stamp (run-loop wiring)', () => {
  let db: Database.Database;
  let tmpDir: string;
  const savedVault = process.env.VAULT_PATH;

  beforeEach(() => {
    db = seedFromMigrations();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csuite-grounding-'));
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    if (savedVault === undefined) delete process.env.VAULT_PATH;
    else process.env.VAULT_PATH = savedVault;
  });

  it('runs under STUB_MODE=replay (env guard — no live inference)', () => {
    expect(process.env.STUB_MODE).toBe('replay');
  });

  it('stamps cash_model_ungrounded + prepends the DEGRADED banner when the vault has no cash model', async () => {
    process.env.VAULT_PATH = tmpDir; // empty dir → buildCashLeverGrounding() returns [] for real
    const result = await startRun('degrade-no-grounding', 'cash_lever', QUESTION, db, noopEmit);

    // Did NOT throw — the run completed to a terminal state (grounding never blocks).
    expect(['shipped-clean', 'shipped-draft', 'committed', 'handoff']).toContain(result.finalState.kind);
    // Honest degraded record on the return.
    expect(result.degradedSources).toContain('cash_model_ungrounded');
    // The memo the operator reads carries the banner so it cannot appear grounded.
    expect(result.memoMarkdown).toBeTruthy();
    expect(result.memoMarkdown).toContain('DEGRADED: not grounded on the cash model');
    // Rigor still computed normally — the banner is prepended post-verifier and never touches scoring.
    expect(typeof result.rigorScore).toBe('number');
  });

  it('does NOT stamp degraded (no banner) when a real cash model is present', async () => {
    writeModelXlsx(tmpDir);
    process.env.VAULT_PATH = tmpDir; // dir WITH a valid model → grounding is non-empty
    const result = await startRun('grounded-positive', 'cash_lever', QUESTION, db, noopEmit);

    expect(['shipped-clean', 'shipped-draft', 'committed', 'handoff']).toContain(result.finalState.kind);
    expect(result.degradedSources ?? []).not.toContain('cash_model_ungrounded');
    expect(result.degradedSources ?? []).toHaveLength(0);
    expect(result.memoMarkdown ?? '').not.toContain('DEGRADED: not grounded on the cash model');
  });

  it('prependDegradedBanner is a no-op for an empty degradedSources list', () => {
    const memo = '# Cash memo\n\nbody';
    expect(prependDegradedBanner(memo, [])).toBe(memo);
  });

  it('prependDegradedBanner prepends the cash banner and preserves the original memo body', () => {
    const out = prependDegradedBanner('# Cash memo\n\nbody', ['cash_model_ungrounded']);
    expect(out.startsWith('> **DEGRADED: not grounded on the cash model.**')).toBe(true);
    expect(out).toContain('# Cash memo'); // original body retained below the banner
  });
});
