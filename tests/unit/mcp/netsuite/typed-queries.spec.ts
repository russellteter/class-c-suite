// tests/unit/mcp/netsuite/typed-queries.spec.ts
// Tests for NetSuite typed SuiteQL builders.
// B20 specific: Renewal_Anniversary_Date__c (not the legacy renewal-date field).

import { describe, it, expect } from 'vitest';
import {
  cashGLBalanceQuery,
  payrollByDeptQuery,
  foreignTotalQuery,
  payrollBlindSpotQuery,
  revenueWith24MonthSkip,
  escapeSuiteQLString,
  assertSafeSuiteQLInt,
} from '../../../../apps/utility/src/mcp/netsuite/typed-queries.js';

// ── B20 defensive guard (applies to all 5 queries) ───────────────────────────

describe('typed-queries — B20 forbidden literal guard', () => {
  it('cashGLBalanceQuery NEVER contains the legacy renewal-date field', () => {
    const q = cashGLBalanceQuery({});
    expect(q).not.toContain('Renewal_Date__c');
  });

  it('payrollByDeptQuery NEVER contains the legacy renewal-date field', () => {
    const q = payrollByDeptQuery({ month: new Date(2026, 3, 1) });
    expect(q).not.toContain('Renewal_Date__c');
  });

  it('foreignTotalQuery NEVER contains the legacy renewal-date field', () => {
    const q = foreignTotalQuery({ accountId: 'acct123', currency: 'USD' });
    expect(q).not.toContain('Renewal_Date__c');
  });

  it('payrollBlindSpotQuery NEVER contains the legacy renewal-date field', () => {
    const q = payrollBlindSpotQuery();
    expect(q).not.toContain('Renewal_Date__c');
  });

  it('revenueWith24MonthSkip NEVER contains the legacy renewal-date field', () => {
    const q = revenueWith24MonthSkip();
    expect(q).not.toContain('Renewal_Date__c');
  });
});

// ── cashGLBalanceQuery ────────────────────────────────────────────────────────

describe('cashGLBalanceQuery', () => {
  it('uses foreigntotal (FX-correct cash rule)', () => {
    const q = cashGLBalanceQuery({});
    expect(q).toContain('foreigntotal');
  });

  it('filters to Bank account type', () => {
    const q = cashGLBalanceQuery({});
    expect(q).toContain("'Bank'");
  });

  it('includes 24-month date fence', () => {
    const q = cashGLBalanceQuery({});
    // Must contain a TO_DATE comparison with a date >= 2 years ago.
    expect(q).toContain("TO_DATE('");
  });

  it('excludes voided transactions', () => {
    const q = cashGLBalanceQuery({});
    expect(q).toContain('voided = FALSE');
  });

  it('accepts an optional asOfDate and includes it in the query', () => {
    const q = cashGLBalanceQuery({ asOfDate: new Date(2026, 3, 30) });
    expect(q).toContain('2026-04-30');
  });

  it('returns a non-empty string', () => {
    expect(cashGLBalanceQuery({}).length).toBeGreaterThan(50);
  });
});

// ── payrollByDeptQuery ────────────────────────────────────────────────────────

describe('payrollByDeptQuery', () => {
  it('groups by department', () => {
    const q = payrollByDeptQuery({ month: new Date(2026, 3, 1) });
    expect(q).toContain('department');
  });

  it('uses foreigntotal (FX-correct payroll rule)', () => {
    const q = payrollByDeptQuery({ month: new Date(2026, 3, 1) });
    expect(q).toContain('foreigntotal');
  });

  it('restricts to payroll account types', () => {
    const q = payrollByDeptQuery({ month: new Date(2026, 3, 1) });
    expect(q).toContain('Salary');
    expect(q).toContain('Wages');
    expect(q).toContain('Payroll Expenses');
  });

  it('encodes month start and end dates', () => {
    const q = payrollByDeptQuery({ month: new Date(2026, 3, 1) });
    expect(q).toContain('2026-04-01');
    expect(q).toContain('2026-04-30');
  });

  it('rejects months older than 24 months (24-month skip rule)', () => {
    const oldDate = new Date();
    oldDate.setMonth(oldDate.getMonth() - 25);
    expect(() => payrollByDeptQuery({ month: oldDate })).toThrow('24-month skip');
  });

  it('excludes voided transactions', () => {
    const q = payrollByDeptQuery({ month: new Date(2026, 3, 1) });
    expect(q).toContain('voided = FALSE');
  });
});

// ── foreignTotalQuery ─────────────────────────────────────────────────────────

describe('foreignTotalQuery', () => {
  it('uses SUM(t.foreigntotal) — foreigntotal rule', () => {
    const q = foreignTotalQuery({ accountId: 'acct123', currency: 'USD' });
    expect(q).toContain('foreigntotal');
  });

  it('filters by provided accountId', () => {
    const q = foreignTotalQuery({ accountId: 'acct123', currency: 'USD' });
    expect(q).toContain("'acct123'");
  });

  it('filters by provided currency', () => {
    const q = foreignTotalQuery({ accountId: 'acct123', currency: 'GBP' });
    expect(q).toContain("'GBP'");
  });

  it('includes 24-month fence', () => {
    const q = foreignTotalQuery({ accountId: 'acct123', currency: 'USD' });
    expect(q).toContain("TO_DATE('");
  });

  it('excludes voided transactions', () => {
    const q = foreignTotalQuery({ accountId: 'acct123', currency: 'USD' });
    expect(q).toContain('voided = FALSE');
  });

  it('rejects injection in accountId', () => {
    expect(() => foreignTotalQuery({ accountId: "acct'; DROP TABLE transaction --", currency: 'USD' }))
      .toThrow('disallowed characters');
  });

  it('rejects injection in currency', () => {
    expect(() => foreignTotalQuery({ accountId: 'acct123', currency: "USD' UNION SELECT" }))
      .toThrow('disallowed characters');
  });
});

// ── payrollBlindSpotQuery ─────────────────────────────────────────────────────

describe('payrollBlindSpotQuery', () => {
  it('looks for compensation-adjacent accounts', () => {
    const q = payrollBlindSpotQuery();
    expect(q.toUpperCase()).toContain('COMP');
  });

  it('excludes known payroll account types to surface the blind spot', () => {
    const q = payrollBlindSpotQuery();
    // Should filter for Other Expense / COGS (not Salary/Wages) — the blind spot.
    expect(q).toContain('Other Expense');
  });

  it('includes 24-month fence', () => {
    const q = payrollBlindSpotQuery();
    expect(q).toContain("TO_DATE('");
  });

  it('excludes voided transactions', () => {
    const q = payrollBlindSpotQuery();
    expect(q).toContain('voided = FALSE');
  });

  it('returns a non-empty query string', () => {
    expect(payrollBlindSpotQuery().length).toBeGreaterThan(50);
  });
});

// ── revenueWith24MonthSkip ────────────────────────────────────────────────────

describe('revenueWith24MonthSkip', () => {
  it('uses foreigntotal for FX-correct revenue', () => {
    const q = revenueWith24MonthSkip();
    expect(q).toContain('foreigntotal');
  });

  it('filters to Income account type', () => {
    const q = revenueWith24MonthSkip();
    expect(q).toContain("'Income'");
  });

  it('includes 24-month date fence (hard-coded skip rule)', () => {
    const q = revenueWith24MonthSkip();
    expect(q).toContain("TO_DATE('");
  });

  it('uses FETCH NEXT for LIMIT (SuiteQL syntax)', () => {
    const q = revenueWith24MonthSkip();
    expect(q).toContain('FETCH NEXT');
  });

  it('default limit of 500 rows', () => {
    const q = revenueWith24MonthSkip();
    expect(q).toContain('500');
  });

  it('respects a custom limit', () => {
    const q = revenueWith24MonthSkip({ limit: 100 });
    expect(q).toContain('100');
  });

  it('rejects oversized limit', () => {
    expect(() => revenueWith24MonthSkip({ limit: 2_000_000 })).toThrow('limit');
  });

  it('excludes voided transactions', () => {
    const q = revenueWith24MonthSkip();
    expect(q).toContain('voided = FALSE');
  });
});
