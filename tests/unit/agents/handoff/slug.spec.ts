/**
 * Ch.9 — slugify specs (≥15 cases).
 * Source: docs/decisions/0011-ch9-cowork-handoff.md §4.1
 */
import { describe, it, expect } from 'vitest';
import { slugifyTitle, slugify } from '../../../../apps/utility/src/agents/handoff/slug.js';

describe('slugifyTitle', () => {
  it('converts spaces to hyphens', () => {
    expect(slugifyTitle('Q3 Turnaround Plan')).toBe('q3-turnaround-plan');
  });

  it('lowercases input', () => {
    expect(slugifyTitle('BOARD NARRATIVE')).toBe('board-narrative');
  });

  it('strips leading and trailing hyphens', () => {
    expect(slugifyTitle('---Hello World---')).toBe('hello-world');
  });

  it('collapses multiple non-alphanumeric chars to single hyphen', () => {
    expect(slugifyTitle('Q3: Revenue & Growth!')).toBe('q3-revenue-growth');
  });

  it('handles unicode by stripping diacritics', () => {
    const result = slugifyTitle('Résumé for Cowork');
    expect(result).toMatch(/^[a-z0-9-]+$/);
    expect(result.includes('r')).toBe(true);
  });

  it('truncates at 40 chars max', () => {
    const longTitle = 'This is a very long title that definitely exceeds forty characters';
    const result = slugifyTitle(longTitle);
    expect(result.length).toBeLessThanOrEqual(40);
  });

  it('truncates at last hyphen not mid-word', () => {
    // Exactly 43 chars before truncation: "this-is-a-very-long-title-that-definitely"
    const result = slugifyTitle('this is a very long title that definitely exceeds forty chars');
    expect(result.length).toBeLessThanOrEqual(40);
    // Must not end with a hyphen
    expect(result.endsWith('-')).toBe(false);
  });

  it('handles numbers in title', () => {
    expect(slugifyTitle('Q3 2026 Plan')).toBe('q3-2026-plan');
  });

  it('handles title with only special chars → fallback "handoff"', () => {
    expect(slugifyTitle('!!! @@@')).toBe('handoff');
  });

  it('handles already-kebab title', () => {
    expect(slugifyTitle('already-kebab')).toBe('already-kebab');
  });

  it('handles single word', () => {
    expect(slugifyTitle('Budget')).toBe('budget');
  });

  it('handles mixed case with numbers and symbols', () => {
    const result = slugifyTitle('FY2027 ARR $12M target');
    expect(result).toMatch(/^[a-z0-9-]+$/);
    expect(result.includes('fy2027')).toBe(true);
  });

  it('exactly 40-char base stays unchanged', () => {
    // 40 lowercase letters = no truncation
    const input = 'a'.repeat(40);
    expect(slugifyTitle(input)).toBe('a'.repeat(40));
  });

  it('strips apostrophes and quotes', () => {
    const result = slugifyTitle("Russell's Q3 Plan");
    expect(result).not.toContain("'");
    expect(result).toMatch(/^[a-z0-9-]+$/);
  });

  it('produces ASCII-only output', () => {
    const result = slugifyTitle('Über-plan für Q4');
    expect(result).toMatch(/^[a-z0-9-]+$/);
  });
});

describe('slugify — collision resistance', () => {
  it('returns base slug when no collision', () => {
    expect(slugify('Q3 Plan', new Set())).toBe('q3-plan');
  });

  it('appends -2 on first collision', () => {
    const existing = new Set(['q3-plan']);
    expect(slugify('Q3 Plan', existing)).toBe('q3-plan-2');
  });

  it('appends -3 when -2 is also taken', () => {
    const existing = new Set(['q3-plan', 'q3-plan-2']);
    expect(slugify('Q3 Plan', existing)).toBe('q3-plan-3');
  });

  it('continues incrementing through many collisions', () => {
    const existing = new Set(
      ['q3-plan', ...Array.from({ length: 10 }, (_, i) => `q3-plan-${i + 2}`)]
    );
    const result = slugify('Q3 Plan', existing);
    expect(result).toBe('q3-plan-12');
  });

  it('works with empty existing set', () => {
    expect(slugify('Board Deck', new Set())).toBe('board-deck');
  });

  it('works with no existingSlugs argument', () => {
    expect(slugify('Memo Review')).toBe('memo-review');
  });
});
