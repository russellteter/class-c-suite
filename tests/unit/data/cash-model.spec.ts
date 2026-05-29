// tests/unit/data/cash-model.spec.ts
// Source: docs/decisions/0006-ch5-cash-lever-slice.md §1.3 + §1.4.
// Proves the cash-model xlsx reader: column-by-header mapping, skips title/TOTAL/instruction
// banner rows (merged cells), honest degrade ([]), and latest-dated-model resolution.

import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { readXlsxLeverRows, resolveCashModelPath } from '../../../apps/utility/src/data/cash-model.js';

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(here, '..', '..', 'fixtures', 'cash-model', '03-cost-levers-fixture.xlsx');

describe('readXlsxLeverRows', () => {
  it('reads lever rows from sheet 03_Cost_Levers with header-based column mapping', () => {
    const rows = readXlsxLeverRows(FIXTURE);
    // 3 data rows; the merged title banners, the blank spacer, the TOTAL row and the
    // "HOW THIS WORKS" instruction block must all be excluded.
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.leverName)).toEqual([
      'AWS Fees',
      'Class/Collaborate Collection',
      'Legal Fees & Settlements',
    ]);
  });

  it('maps the columns correctly (B/C/E/G/H) and preserves sign', () => {
    const rows = readXlsxLeverRows(FIXTURE);
    expect(rows[0]).toEqual({
      leverName: 'AWS Fees',
      currentValue: -2484728, // negative forecast = outflow, preserved
      adjustedValue: 0, // "Annual Adjustment" = 0 → no scenario entered
      cashImpact: null, // "Weekly Impact" blank → null, NOT fabricated
      notes: 'AWS note',
    });
    expect(rows[1].currentValue).toBe(8050000); // positive forecast = inflow
    expect(rows[2].leverName).toBe('Legal Fees & Settlements');
  });

  it('degrades to [] when the file does not exist (ADR-0006 §1.4)', () => {
    expect(readXlsxLeverRows('/no/such/cash-model.xlsx')).toEqual([]);
  });

  it('degrades to [] when given a directory with no matching model file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cm-empty-'));
    try {
      expect(readXlsxLeverRows(dir)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('resolveCashModelPath', () => {
  it('picks the most recent dated model and ignores non-matching files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cm-resolve-'));
    try {
      writeFileSync(join(dir, 'Class_Cash_Lever_Model_v3_2026-01-01.xlsx'), 'x');
      writeFileSync(join(dir, 'Class_Cash_Lever_Model_v5_2026-05-18.xlsx'), 'x');
      writeFileSync(join(dir, 'Class_Cash_Model_2026-05-24_Brian_v1.xlsx'), 'x'); // decoy: different model
      const resolved = resolveCashModelPath(dir);
      expect(resolved).not.toBeNull();
      expect(resolved!.endsWith('Class_Cash_Lever_Model_v5_2026-05-18.xlsx')).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('returns null for an empty / unreadable directory', () => {
    expect(resolveCashModelPath('/no/such/dir')).toBeNull();
  });
});
