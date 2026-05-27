// tests/unit/mcp/gmail/typed-queries.spec.ts
// Tests for Gmail typed query builders.
// Verifies: correct Gmail search query syntax, injection guards, date formatting.

import { describe, it, expect } from 'vitest';
import {
  recentThreadsByStakeholderQuery,
  recentExecCorrespondenceQuery,
  assertSafeEmail,
  assertSafeKeyword,
  toGmailDate,
} from '../../../../apps/utility/src/mcp/gmail/typed-queries.js';

// ── toGmailDate ──────────────────────────────────────────────────────────────

describe('toGmailDate', () => {
  it('formats a Date as YYYY/MM/DD (slash-separated)', () => {
    // Use local-time constructor to avoid timezone shift on the test runner.
    const d = new Date(2026, 4, 27); // months are 0-indexed
    expect(toGmailDate(d)).toBe('2026/05/27');
  });

  it('pads month and day with leading zeros', () => {
    const d = new Date('2026-01-03T00:00:00Z');
    expect(toGmailDate(d)).toMatch(/^\d{4}\/0[0-9]\/0[0-9]$/);
  });
});

// ── recentThreadsByStakeholderQuery ──────────────────────────────────────────

describe('recentThreadsByStakeholderQuery', () => {
  const since = new Date(2026, 4, 1); // local-time May 1 — avoids UTC→local shift

  it('includes from: and to: operators for the stakeholder email', () => {
    const q = recentThreadsByStakeholderQuery({ stakeholderEmail: 'ceo@class.com', since });
    expect(q).toContain('from:ceo@class.com');
    expect(q).toContain('to:ceo@class.com');
  });

  it('includes an after: operator with slash-date', () => {
    const q = recentThreadsByStakeholderQuery({ stakeholderEmail: 'ceo@class.com', since });
    expect(q).toContain('after:2026/05/01');
  });

  it('joins from/to with OR', () => {
    const q = recentThreadsByStakeholderQuery({ stakeholderEmail: 'ceo@class.com', since });
    expect(q).toMatch(/from:.+ OR to:.+/);
  });

  it('throws on email with injection characters', () => {
    expect(() =>
      recentThreadsByStakeholderQuery({
        stakeholderEmail: 'evil" OR label:inbox',
        since,
      })
    ).toThrow('Gmail query guard');
  });
});

// ── recentExecCorrespondenceQuery ─────────────────────────────────────────────

describe('recentExecCorrespondenceQuery', () => {
  const since = new Date(2026, 4, 1); // local-time May 1 — avoids UTC→local shift

  it('wraps each keyword in quotes', () => {
    const q = recentExecCorrespondenceQuery({ keywords: ['board update', 'Q3'], since });
    expect(q).toContain('"board update"');
    expect(q).toContain('"Q3"');
  });

  it('joins keywords with OR', () => {
    const q = recentExecCorrespondenceQuery({ keywords: ['restructure', 'layoff'], since });
    expect(q).toContain('"restructure" OR "layoff"');
  });

  it('includes after: operator with slash-date', () => {
    const q = recentExecCorrespondenceQuery({ keywords: ['budget'], since });
    expect(q).toContain('after:2026/05/01');
  });

  it('throws on empty keywords array', () => {
    expect(() =>
      recentExecCorrespondenceQuery({ keywords: [], since })
    ).toThrow('keywords array must not be empty');
  });

  it('throws on keyword with injection characters', () => {
    expect(() =>
      recentExecCorrespondenceQuery({
        keywords: ['ok', 'bad" OR label:all'],
        since,
      })
    ).toThrow('Gmail query guard');
  });
});

// ── assertSafeEmail ──────────────────────────────────────────────────────────

describe('assertSafeEmail', () => {
  it('accepts a normal email address', () => {
    expect(() => assertSafeEmail('user+tag@example.com')).not.toThrow();
  });

  it('rejects an email with a double-quote', () => {
    expect(() => assertSafeEmail('bad"@class.com')).toThrow('Gmail query guard');
  });

  it('rejects an email with a space', () => {
    expect(() => assertSafeEmail('bad email@class.com')).toThrow('Gmail query guard');
  });
});

// ── assertSafeKeyword ────────────────────────────────────────────────────────

describe('assertSafeKeyword', () => {
  it('accepts alphanumeric keywords with spaces and hyphens', () => {
    expect(() => assertSafeKeyword('board update Q3')).not.toThrow();
    expect(() => assertSafeKeyword('re-structure')).not.toThrow();
  });

  it('rejects a keyword with double-quote', () => {
    expect(() => assertSafeKeyword('evil"')).toThrow('Gmail query guard');
  });

  it('rejects a keyword with parenthesis', () => {
    expect(() => assertSafeKeyword('bad(keyword)')).toThrow('Gmail query guard');
  });
});
