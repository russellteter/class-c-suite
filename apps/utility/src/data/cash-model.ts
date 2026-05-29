// apps/utility/src/data/cash-model.ts
// Source: docs/decisions/0006-ch5-cash-lever-slice.md §1.3 (cash_model — lever rows) + §1.4 (degrade).
//
// Reads the cash-lever model xlsx (sheet `03_Cost_Levers`) and returns lever rows. Replaces the
// hardcoded stub that fabricated lever amounts (DOCTRINE #1: no fabricated data in a live run).
//
// COLUMN MAPPING (decided 2026-05-29 after inspecting the real file; ADR-0006 left the schema
// "TBD pending xlsx inspection at Ch.5 runtime"). The real sheet is an OVERRIDE model — you enter
// an "Annual Adjustment" and it computes an "Adjusted Total" + "Weekly Impact":
//   leverName    <- col B "Line Item"
//   currentValue <- col C "Finance Forecast (34 wks)"   (NEGATIVE = outflow/cost, POSITIVE = inflow)
//   adjustedValue<- col E "Annual Adjustment"            (modeled override; 0 = no scenario entered)
//   cashImpact   <- col G "Weekly Impact"                (computed; blank/0 when no adjustment)
//   notes        <- col H "Notes / Rationale"
// Columns are located by HEADER TEXT (not fixed index), so the reader survives column shifts.
// Merged cells appear only in the title/instruction banner rows (B1:H1, the "HOW THIS WORKS"
// block), never the data body — the reader skips non-data rows by anchoring on the "Line Item"
// header and stopping at the first TOTAL / instruction row.

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { WorkBook } from 'xlsx';

// SheetJS (`xlsx`) is CommonJS. Under Node/Electron ESM, `import * as XLSX from 'xlsx'` places the
// API on `.default`, so `XLSX.readFile` is undefined at RUNTIME (vitest's Vite interop masks this —
// which is exactly why the unit test passed while the live app silently read 0 rows). createRequire
// loads the real CJS exports (readFile/utils) consistently in both the app and vitest.
const require = createRequire(import.meta.url);
const XLSX = require('xlsx') as typeof import('xlsx');

export interface LeverRow {
  leverName: string;
  currentValue: number | null;
  adjustedValue: number | null;
  cashImpact: number | null;
  notes: string | null;
}

const LEVER_SHEET = '03_Cost_Levers';
// Dated filename pattern, e.g. Class_Cash_Lever_Model_v5_2026-05-18.xlsx. YYYY-MM-DD sorts
// lexically == chronologically, so the last match is the most recent model.
const MODEL_RE = /^Class_Cash_Lever_Model_v\d+_\d{4}-\d{2}-\d{2}\.xlsx$/i;

/** Vault directory default — mirrors getVaultPath() in safewrite/index.ts (kept in sync deliberately). */
export function defaultVaultPath(): string {
  return process.env.VAULT_PATH ?? path.join(os.homedir(), 'Documents', 'Claude', 'Projects', 'Business Planning');
}

/** Resolve the most recent cash-lever model xlsx in `vaultDir`. Returns null if none / dir unreadable. */
export function resolveCashModelPath(vaultDir: string = defaultVaultPath()): string | null {
  let entries: string[];
  try {
    entries = fs.readdirSync(vaultDir);
  } catch {
    return null;
  }
  const matches = entries.filter((f) => MODEL_RE.test(f)).sort();
  return matches.length > 0 ? path.join(vaultDir, matches[matches.length - 1]) : null;
}

function toNum(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const t = v.trim();
    if (t === '') return null;
    const n = Number(t.replace(/[$,\s]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toStr(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

/**
 * Read lever rows from the cash-lever model xlsx (sheet 03_Cost_Levers).
 * @param target Vault DIRECTORY (resolve latest model) OR a direct .xlsx PATH. Defaults to the vault.
 * @returns lever rows, or [] when the file/sheet is absent or has no data rows — the caller then
 *          degrades honestly per ADR-0006 §1.4 ("cash model unavailable — lever rows not quantified").
 */
export function readXlsxLeverRows(target: string = defaultVaultPath()): LeverRow[] {
  const file = /\.xlsx$/i.test(target)
    ? (fs.existsSync(target) ? target : null)
    : resolveCashModelPath(target);
  if (!file) return [];

  let wb: WorkBook;
  try {
    wb = XLSX.readFile(file);
  } catch {
    return [];
  }
  const ws = wb.Sheets[LEVER_SHEET];
  if (!ws) return [];

  // Array-of-arrays; blank cells -> null so column indices stay stable.
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, defval: null });

  const headerIdx = rows.findIndex(
    (r) => Array.isArray(r) && r.some((c) => toStr(c)?.toLowerCase() === 'line item'),
  );
  if (headerIdx === -1) return [];

  const header = (rows[headerIdx] as unknown[]).map((c) => (toStr(c) ?? '').toLowerCase());
  const find = (needle: string) => header.findIndex((h) => h.includes(needle));
  const idx = {
    name: find('line item'),
    current: find('finance forecast'),
    adjust: find('annual adjustment'),
    impact: find('weekly impact'),
    notes: find('notes'),
  };

  const out: LeverRow[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!Array.isArray(r)) continue;
    const name = idx.name >= 0 ? toStr(r[idx.name]) : null;
    if (!name) continue; // blank spacer row
    const low = name.toLowerCase();
    if (low.startsWith('total') || low.startsWith('how this works')) break; // end of lever table
    out.push({
      leverName: name,
      currentValue: idx.current >= 0 ? toNum(r[idx.current]) : null,
      adjustedValue: idx.adjust >= 0 ? toNum(r[idx.adjust]) : null,
      cashImpact: idx.impact >= 0 ? toNum(r[idx.impact]) : null,
      notes: idx.notes >= 0 ? toStr(r[idx.notes]) : null,
    });
  }
  return out;
}
