/**
 * ADR-0001 §2.9 + §9 row 6 (B23) — normalizeKeys() middleware
 * Test owner: Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0001-ch0-foundations.md §2.9
 *
 * Tests describe intended behavior. Implementations live in
 * packages/shared-types/src/normalizeKeys.ts (Runtime dispatch territory).
 * These tests will fail until Runtime lands. That is expected per brief line 124.
 */

import { describe, it, expect } from 'vitest';
import { normalizeKeys } from '@c-suite/shared-types/normalizeKeys';

describe('normalizeKeys — B23 kebab→snake middleware', () => {
  describe('top-level key conversion', () => {
    it('converts a single hyphenated key to underscore', () => {
      const result = normalizeKeys({ 'last-updated': '2026-05-26' });
      expect(result).toEqual({ last_updated: '2026-05-26' });
    });

    it('leaves snake_case keys unchanged', () => {
      const result = normalizeKeys({ last_updated: '2026-05-26' });
      expect(result).toEqual({ last_updated: '2026-05-26' });
    });

    it('leaves plain keys without hyphens unchanged', () => {
      const result = normalizeKeys({ id: 'POS-001', title: 'AWS cost ceiling' });
      expect(result).toEqual({ id: 'POS-001', title: 'AWS cost ceiling' });
    });

    it('converts multiple hyphens in a single key', () => {
      // e.g. "decision-this-supports" → "decision_this_supports"
      const result = normalizeKeys({ 'decision-this-supports': 'DEC-004' });
      expect(result).toEqual({ decision_this_supports: 'DEC-004' });
    });

    it('converts authored-by to authored_by', () => {
      const result = normalizeKeys({ 'authored-by': 'claude-pass2-cfo-lens' });
      expect(result).toEqual({ authored_by: 'claude-pass2-cfo-lens' });
    });
  });

  describe('recursive conversion on nested objects', () => {
    it('converts nested object keys (B23 — ADR §2.9)', () => {
      const result = normalizeKeys({ a: { 'b-c': 1 } });
      expect(result).toEqual({ a: { b_c: 1 } });
    });

    it('converts deeply nested keys', () => {
      const result = normalizeKeys({ level1: { 'level-2': { 'level-3': 'val' } } });
      expect(result).toEqual({ level1: { level_2: { level_3: 'val' } } });
    });
  });

  describe('recursive conversion on arrays of objects', () => {
    it('converts keys inside array elements', () => {
      const result = normalizeKeys({ arr: [{ 'k-v': 1 }] });
      expect(result).toEqual({ arr: [{ k_v: 1 }] });
    });

    it('converts keys in multiple array elements', () => {
      const result = normalizeKeys({ arr: [{ 'a-b': 1 }, { 'c-d': 2 }] });
      expect(result).toEqual({ arr: [{ a_b: 1 }, { c_d: 2 }] });
    });

    it('handles mixed arrays (objects and primitives) without error', () => {
      const result = normalizeKeys({ tags: ['string-value', 'another'] });
      expect(result).toEqual({ tags: ['string-value', 'another'] });
    });
  });

  describe('idempotency', () => {
    it('is idempotent: applying twice gives same result as once', () => {
      const input = { 'last-reviewed': '2026-05-21', nested: { 'some-key': 42 } };
      const once = normalizeKeys(input);
      const twice = normalizeKeys(once as typeof input);
      expect(twice).toEqual(once);
    });
  });

  describe('edge cases', () => {
    it('returns null unchanged', () => {
      expect(normalizeKeys(null)).toBeNull();
    });

    it('returns undefined unchanged', () => {
      expect(normalizeKeys(undefined)).toBeUndefined();
    });

    it('returns a primitive string unchanged', () => {
      expect(normalizeKeys('some-string')).toBe('some-string');
    });

    it('returns a number unchanged', () => {
      expect(normalizeKeys(42)).toBe(42);
    });

    it('handles empty object', () => {
      expect(normalizeKeys({})).toEqual({});
    });

    it('handles empty array', () => {
      expect(normalizeKeys([])).toEqual([]);
    });
  });

  describe('PM-001 fixture — mixed kebab+snake (B23 real-world)', () => {
    // PM-001 uses kebab keys: id, slug, probability (bare int), impact,
    // last-reviewed, related-positions, related-workstreams, depends-on
    // After normalizeKeys(), all should be snake.
    it('converts all PM-001 kebab frontmatter keys to snake', () => {
      const pm001Raw = {
        id: 'PM-001',
        slug: 'barclays-calls-loan',
        probability: 15,
        impact: 'existential',
        'last-reviewed': '2026-05-21',
        'related-positions': ['POS-003', 'POS-006'],
        'related-workstreams': ['WS-06', 'WS-01', 'WS-12'],
        'depends-on': ['PM-006'],
      };
      const result = normalizeKeys(pm001Raw);
      expect(result).toEqual({
        id: 'PM-001',
        slug: 'barclays-calls-loan',
        probability: 15,
        impact: 'existential',
        last_reviewed: '2026-05-21',
        related_positions: ['POS-003', 'POS-006'],
        related_workstreams: ['WS-06', 'WS-01', 'WS-12'],
        depends_on: ['PM-006'],
      });
    });
  });
});
