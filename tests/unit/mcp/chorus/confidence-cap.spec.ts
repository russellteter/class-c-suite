// tests/unit/mcp/chorus/confidence-cap.spec.ts
// Assert every result carries sourceConfidenceCap: 69 (B11).
import { describe, it, expect } from 'vitest';
import {
  CHORUS_CONFIDENCE_CAP,
  withConfidenceCap,
} from '../../../../apps/utility/src/mcp/chorus/confidence-cap.js';

describe('CHORUS_CONFIDENCE_CAP', () => {
  it('is exactly 69', () => {
    expect(CHORUS_CONFIDENCE_CAP).toBe(69);
  });

  it('is less than 70 (B11 constraint)', () => {
    expect(CHORUS_CONFIDENCE_CAP).toBeLessThan(70);
  });
});

describe('withConfidenceCap', () => {
  it('stamps source_type: chorus on a plain object', () => {
    const result = withConfidenceCap({ id: '1', title: 'Test' });
    expect(result.source_type).toBe('chorus');
  });

  it('stamps sourceConfidenceCap: 69 on every object', () => {
    const result = withConfidenceCap({ id: '2' });
    expect(result.sourceConfidenceCap).toBe(69);
  });

  it('preserves all original fields', () => {
    const original = { id: 'abc', date: '2026-01-01', participants: ['Alice', 'Bob'] };
    const result = withConfidenceCap(original);
    expect(result.id).toBe('abc');
    expect(result.date).toBe('2026-01-01');
    expect(result.participants).toEqual(['Alice', 'Bob']);
  });

  it('does not mutate the original object', () => {
    const original = { id: 'x' };
    withConfidenceCap(original);
    expect((original as { sourceConfidenceCap?: number }).sourceConfidenceCap).toBeUndefined();
  });

  it('sourceConfidenceCap equals CHORUS_CONFIDENCE_CAP constant', () => {
    const result = withConfidenceCap({ id: 'y' });
    expect(result.sourceConfidenceCap).toBe(CHORUS_CONFIDENCE_CAP);
  });
});
