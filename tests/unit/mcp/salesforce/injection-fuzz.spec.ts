// tests/unit/mcp/salesforce/injection-fuzz.spec.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §3.5
// SOQL injection fuzz — ≥20 cases covering stage name, ORDER BY,
// LIMIT/OFFSET, and subquery injection vectors.

import { describe, it, expect } from 'vitest';
import {
  escapeSoqlString,
  assertSafeInt,
  committedPipelineQuery,
  accountAMHealthQuery,
  renewalForecastQuery,
  topAccountsByAMQuery,
  openOpportunityByAccountQuery,
} from '../../../../apps/utility/src/mcp/salesforce/typed-queries.js';

// ── escapeSoqlString injection cases ─────────────────────────────────────────

describe('escapeSoqlString — injection guard', () => {
  it('rejects SOQL comment injection (--)', () => {
    expect(() => escapeSoqlString("'); DROP TABLE Opportunity --"))
      .toThrow('disallowed characters');
  });

  it('rejects semicolon injection', () => {
    expect(() => escapeSoqlString("Stage; DELETE FROM Opportunity")).toThrow();
  });

  it('rejects single-quote injection', () => {
    expect(() => escapeSoqlString("Verbal Agreement' OR '1'='1")).toThrow();
  });

  it('rejects subquery injection', () => {
    expect(() => escapeSoqlString("SELECT Id FROM User WHERE IsActive=true")).toThrow();
  });

  it('rejects parenthesis injection', () => {
    expect(() => escapeSoqlString("Contracting) OR (1=1")).toThrow();
  });

  it('rejects backtick injection', () => {
    expect(() => escapeSoqlString("Contracting`")).toThrow();
  });

  it('rejects newline injection', () => {
    expect(() => escapeSoqlString("Contracting\nUNION SELECT")).toThrow();
  });

  it('rejects tab injection', () => {
    expect(() => escapeSoqlString("Contracting\t UNION")).toThrow();
  });

  it('rejects null byte injection', () => {
    expect(() => escapeSoqlString("Contracting\0")).toThrow();
  });

  it('rejects percent injection', () => {
    expect(() => escapeSoqlString("Contracting%")).toThrow();
  });

  it('passes safe stage names', () => {
    expect(escapeSoqlString('Verbal Agreement')).toBe('Verbal Agreement');
    expect(escapeSoqlString('Qualified Renewal')).toBe('Qualified Renewal');
    expect(escapeSoqlString('Contracting')).toBe('Contracting');
    expect(escapeSoqlString('Quote in Review')).toBe('Quote in Review');
    expect(escapeSoqlString('Negotiation')).toBe('Negotiation');
  });

  it('passes safe alphanumeric IDs', () => {
    expect(() => escapeSoqlString('0012300000AbCdEfA1')).not.toThrow();
  });
});

// ── assertSafeInt injection cases ─────────────────────────────────────────────

describe('assertSafeInt — LIMIT/OFFSET injection guard', () => {
  it('rejects negative LIMIT', () => {
    expect(() => assertSafeInt(-1, 'limit')).toThrow('limit');
  });

  it('rejects float LIMIT', () => {
    expect(() => assertSafeInt(3.14, 'limit')).toThrow('limit');
  });

  it('rejects NaN', () => {
    expect(() => assertSafeInt(NaN, 'limit')).toThrow('limit');
  });

  it('rejects Infinity', () => {
    expect(() => assertSafeInt(Infinity, 'limit')).toThrow('limit');
  });

  it('rejects value above max (> 1,000,000)', () => {
    expect(() => assertSafeInt(1_000_001, 'limit')).toThrow('limit');
  });

  it('passes boundary values', () => {
    expect(assertSafeInt(0, 'limit')).toBe(0);
    expect(assertSafeInt(500, 'limit')).toBe(500);
    expect(assertSafeInt(1_000_000, 'limit')).toBe(1_000_000);
  });
});

// ── committedPipelineQuery — forbidden literal guard ──────────────────────────

describe('committedPipelineQuery — B19 stage label guard', () => {
  it('NEVER contains S4 stage label', () => {
    const q = committedPipelineQuery({ pipelineType: 'new_business' });
    expect(q).not.toContain("'S4'");
    expect(q).not.toContain('"S4"');
  });

  it('NEVER contains S5 stage label', () => {
    const q = committedPipelineQuery({ pipelineType: 'renewal' });
    expect(q).not.toContain("'S5'");
  });

  it('NEVER contains BestCase', () => {
    const q = committedPipelineQuery({ pipelineType: 'new_business' });
    expect(q).not.toContain('BestCase');
  });

  it('NEVER contains Commit (forecast category)', () => {
    const q = committedPipelineQuery({ pipelineType: 'renewal' });
    // Avoid matching the substring in legitimate words like 'Committed'
    expect(q).not.toMatch(/'Commit'/);
  });

  it('new_business query contains R1-verified new-biz stages', () => {
    const q = committedPipelineQuery({ pipelineType: 'new_business' });
    expect(q).toContain("'Negotiation'");
    expect(q).toContain("'Quote in Review'");
    expect(q).toContain("'Discovery'");
  });

  it('renewal query contains R1-verified renewal stages', () => {
    const q = committedPipelineQuery({ pipelineType: 'renewal' });
    expect(q).toContain("'Renewal Quote Sent'");
    expect(q).toContain("'Qualified Renewal'");
  });

  it('new_business query contains Stage_2_Bump_Date__c discriminator', () => {
    const q = committedPipelineQuery({ pipelineType: 'new_business' });
    expect(q).toContain('Stage_2_Bump_Date__c');
  });
});

// ── accountAMHealthQuery — B7 guard ──────────────────────────────────────────

describe('accountAMHealthQuery — B7 guard', () => {
  it('NEVER references Owner.Name', () => {
    const q = accountAMHealthQuery({ accountId: '0012300000AbCdEfA1' });
    expect(q).not.toContain('Owner.Name');
    expect(q).not.toContain('OwnerId');
  });

  it('uses Account_Manager__r', () => {
    const q = accountAMHealthQuery({ accountId: '0012300000AbCdEfA1' });
    expect(q).toContain('Account_Manager__r');
  });

  it('includes IsActive filter', () => {
    const q = accountAMHealthQuery({ accountId: '0012300000AbCdEfA1' });
    expect(q).toContain('IsActive = TRUE');
  });

  it('rejects injection in accountId', () => {
    expect(() => accountAMHealthQuery({ accountId: "'; DROP TABLE Account --" })).toThrow();
  });
});

// ── renewalForecastQuery — B20 guard ─────────────────────────────────────────

describe('renewalForecastQuery — B20 guard', () => {
  it('NEVER references Renewal_Date__c', () => {
    const q = renewalForecastQuery({ months: 3 });
    expect(q).not.toContain('Renewal_Date__c');
  });

  it('uses Renewal_Anniversary_Date__c', () => {
    const q = renewalForecastQuery({ months: 3 });
    expect(q).toContain('Renewal_Anniversary_Date__c');
  });

  it('rejects injection via months (float)', () => {
    expect(() => renewalForecastQuery({ months: 1.5 })).toThrow();
  });

  it('rejects injection via months (negative)', () => {
    expect(() => renewalForecastQuery({ months: -1 })).toThrow();
  });
});

// ── topAccountsByAMQuery injection ────────────────────────────────────────────

describe('topAccountsByAMQuery — B7 guard', () => {
  it('NEVER references Owner.Name', () => {
    const q = topAccountsByAMQuery();
    expect(q).not.toContain('Owner.Name');
  });

  it('rejects injection in amId', () => {
    expect(() => topAccountsByAMQuery({ amId: "' OR '1'='1" })).toThrow();
  });

  it('rejects oversized limit', () => {
    expect(() => topAccountsByAMQuery({ limit: 2_000_000 })).toThrow();
  });
});

// ── openOpportunityByAccountQuery injection ───────────────────────────────────

describe('openOpportunityByAccountQuery — injection guard', () => {
  it('rejects semicolon injection in accountId', () => {
    expect(() => openOpportunityByAccountQuery({ accountId: 'abc; UNION SELECT' })).toThrow();
  });

  it('rejects comment injection in accountId', () => {
    expect(() => openOpportunityByAccountQuery({ accountId: "abc' -- " })).toThrow();
  });

  it('passes safe Salesforce ID format', () => {
    expect(() => openOpportunityByAccountQuery({ accountId: '0012300000AbCdEfA1' })).not.toThrow();
  });
});
