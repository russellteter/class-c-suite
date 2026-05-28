// tests/unit/mcp/netsuite/injection-fuzz.spec.ts
// SuiteQL injection fuzz — ≥15 cases covering string, LIMIT, and query vectors.
// Source: docs/decisions/0010-ch8-mcp-integration.md §3.5

import { describe, it, expect } from 'vitest';
import {
  escapeSuiteQLString,
  assertSafeSuiteQLInt,
  foreignTotalQuery,
  payrollByDeptQuery,
} from '../../../../apps/utility/src/mcp/netsuite/typed-queries.js';

// ── escapeSuiteQLString injection cases ───────────────────────────────────────

describe('escapeSuiteQLString — injection guard', () => {
  it('rejects single-quote injection', () => {
    expect(() => escapeSuiteQLString("acct'; DROP TABLE transaction --")).toThrow('disallowed characters');
  });

  it('rejects SOQL comment injection (--)', () => {
    expect(() => escapeSuiteQLString("acct -- comment")).toThrow('disallowed characters');
  });

  it('rejects semicolon injection', () => {
    expect(() => escapeSuiteQLString("acct; DELETE FROM account")).toThrow('disallowed characters');
  });

  it('rejects parenthesis injection', () => {
    expect(() => escapeSuiteQLString("acct) OR (1=1")).toThrow('disallowed characters');
  });

  it('rejects newline injection', () => {
    expect(() => escapeSuiteQLString("acct\nUNION SELECT")).toThrow('disallowed characters');
  });

  it('rejects tab injection', () => {
    expect(() => escapeSuiteQLString("acct\t UNION")).toThrow('disallowed characters');
  });

  it('rejects null byte injection', () => {
    expect(() => escapeSuiteQLString("acct\0")).toThrow('disallowed characters');
  });

  it('rejects percent encoding injection', () => {
    expect(() => escapeSuiteQLString("acct%27")).toThrow('disallowed characters');
  });

  it('rejects subquery injection via SELECT keyword', () => {
    expect(() => escapeSuiteQLString("acct' OR (SELECT 1)='1")).toThrow('disallowed characters');
  });

  it('rejects backtick injection', () => {
    expect(() => escapeSuiteQLString("acct`xss")).toThrow('disallowed characters');
  });

  it('rejects angle bracket injection', () => {
    expect(() => escapeSuiteQLString("acct<script>")).toThrow('disallowed characters');
  });

  it('passes safe alphanumeric account IDs', () => {
    expect(() => escapeSuiteQLString('acct123')).not.toThrow();
    expect(escapeSuiteQLString('acct123')).toBe('acct123');
  });

  it('passes safe account IDs with dashes', () => {
    expect(() => escapeSuiteQLString('acct-gl-1000')).not.toThrow();
  });

  it('passes safe currency codes', () => {
    expect(() => escapeSuiteQLString('USD')).not.toThrow();
    expect(() => escapeSuiteQLString('GBP')).not.toThrow();
  });

  it('passes safe account names with spaces and dots', () => {
    expect(() => escapeSuiteQLString('Main Checking 1000.1')).not.toThrow();
  });
});

// ── assertSafeSuiteQLInt injection cases ──────────────────────────────────────

describe('assertSafeSuiteQLInt — LIMIT/OFFSET injection guard', () => {
  it('rejects negative value', () => {
    expect(() => assertSafeSuiteQLInt(-1, 'limit')).toThrow('limit');
  });

  it('rejects float', () => {
    expect(() => assertSafeSuiteQLInt(1.5, 'limit')).toThrow('limit');
  });

  it('rejects NaN', () => {
    expect(() => assertSafeSuiteQLInt(NaN, 'limit')).toThrow('limit');
  });

  it('rejects Infinity', () => {
    expect(() => assertSafeSuiteQLInt(Infinity, 'limit')).toThrow('limit');
  });

  it('rejects value above max (> 1,000,000)', () => {
    expect(() => assertSafeSuiteQLInt(1_000_001, 'limit')).toThrow('limit');
  });

  it('passes boundary values', () => {
    expect(assertSafeSuiteQLInt(0, 'limit')).toBe(0);
    expect(assertSafeSuiteQLInt(500, 'limit')).toBe(500);
    expect(assertSafeSuiteQLInt(1_000_000, 'limit')).toBe(1_000_000);
  });
});

// ── foreignTotalQuery — injection in accountId and currency ──────────────────

describe('foreignTotalQuery — B20 + injection guard', () => {
  it('rejects injection in accountId', () => {
    expect(() => foreignTotalQuery({ accountId: "acct'; UNION SELECT 1 --", currency: 'USD' }))
      .toThrow('disallowed characters');
  });

  it('rejects injection in currency', () => {
    expect(() => foreignTotalQuery({ accountId: 'acct123', currency: "USD' OR '1'='1" }))
      .toThrow('disallowed characters');
  });

  it('passes with a safe account ID and currency', () => {
    expect(() => foreignTotalQuery({ accountId: 'acct-1000', currency: 'EUR' })).not.toThrow();
  });
});

// ── payrollByDeptQuery — 24-month skip enforcement ────────────────────────────

describe('payrollByDeptQuery — 24-month skip rule', () => {
  it('rejects a month older than 24 months ago', () => {
    const old = new Date();
    old.setMonth(old.getMonth() - 26);
    expect(() => payrollByDeptQuery({ month: old })).toThrow('24-month skip');
  });

  it('passes a recent month', () => {
    const recent = new Date();
    recent.setMonth(recent.getMonth() - 1);
    expect(() => payrollByDeptQuery({ month: recent })).not.toThrow();
  });
});
