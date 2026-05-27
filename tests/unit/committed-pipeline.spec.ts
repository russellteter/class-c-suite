/**
 * UNIT-7 / B6 — committed-pipeline definition lock
 * Source: docs/decisions/0007-committed-pipeline-definition.md
 *         docs/reviews/ultrareview-2026-05-27.md polish UNIT-7
 *
 * Test owner: Test dispatch (writer ≠ grader, DOCTRINE law #7)
 */

import { describe, it, expect } from 'vitest';
import {
  isCommittedOpp,
  NEW_BIZ_COMMITTED_STAGES,
  RENEWAL_COMMITTED_STAGES,
} from '../../apps/utility/src/playbooks/lib/committed-pipeline.js';

describe('committed-pipeline stage sets are locked (live SOQL 2026-05-27)', () => {
  it('NEW_BIZ_COMMITTED_STAGES contains the 7 discovered stage values', () => {
    expect(NEW_BIZ_COMMITTED_STAGES).toEqual(
      expect.arrayContaining([
        'Discovery',
        'Evaluation',
        'Quote in Review',
        'Qualified Opportunity',
        'Negotiation',
        'Closed Won',
        'Closed Lost',
      ]),
    );
    expect(NEW_BIZ_COMMITTED_STAGES).toHaveLength(7);
  });

  it('RENEWAL_COMMITTED_STAGES contains the 6 renewal-specific values (overlap removed)', () => {
    expect(RENEWAL_COMMITTED_STAGES).toEqual(
      expect.arrayContaining([
        'Renewal Quote Sent',
        'Outreach',
        'Qualified Renewal',
        'Verbal Approval',
        'Contracting',
        'Engagement',
      ]),
    );
    expect(RENEWAL_COMMITTED_STAGES).toHaveLength(6);
  });

  it('RENEWAL_COMMITTED_STAGES has no overlap with NEW_BIZ_COMMITTED_STAGES', () => {
    const overlap = RENEWAL_COMMITTED_STAGES.filter((s) =>
      NEW_BIZ_COMMITTED_STAGES.includes(s),
    );
    expect(overlap).toEqual([]);
  });

  it('the two arrays are frozen (locked)', () => {
    expect(Object.isFrozen(NEW_BIZ_COMMITTED_STAGES)).toBe(true);
    expect(Object.isFrozen(RENEWAL_COMMITTED_STAGES)).toBe(true);
  });
});

describe('isCommittedOpp() — branches on Type', () => {
  // New Business — every stage in the locked set classifies committed.
  for (const stage of [
    'Discovery',
    'Evaluation',
    'Quote in Review',
    'Qualified Opportunity',
    'Negotiation',
    'Closed Won',
    'Closed Lost',
  ]) {
    it(`New Business + StageName="${stage}" → committed`, () => {
      expect(isCommittedOpp({ Type: 'New Business', StageName: stage })).toBe(true);
    });
  }

  // Renewal — every stage in the locked set classifies committed.
  for (const stage of [
    'Renewal Quote Sent',
    'Outreach',
    'Qualified Renewal',
    'Verbal Approval',
    'Contracting',
    'Engagement',
  ]) {
    it(`Renewal + StageName="${stage}" → committed`, () => {
      expect(isCommittedOpp({ Type: 'Renewal', StageName: stage })).toBe(true);
    });
  }

  // Renewal opp at a New-Biz-only stage returns false.
  it('Renewal + StageName="Quote in Review" (new-biz-only) → not committed', () => {
    expect(isCommittedOpp({ Type: 'Renewal', StageName: 'Quote in Review' })).toBe(false);
  });

  // New Business at a Renewal-only stage returns false.
  it('New Business + StageName="Renewal Quote Sent" → not committed', () => {
    expect(isCommittedOpp({ Type: 'New Business', StageName: 'Renewal Quote Sent' })).toBe(false);
  });

  // Renewal terminal stages — these are overlap stages, excluded by spec.
  it('Renewal + StageName="Closed Won" (terminal overlap) → not committed in renewal set', () => {
    expect(isCommittedOpp({ Type: 'Renewal', StageName: 'Closed Won' })).toBe(false);
  });

  // Unknown Type → false.
  it('Unknown Type → not committed', () => {
    expect(isCommittedOpp({ Type: 'Upgrade', StageName: 'Discovery' })).toBe(false);
  });

  // Null/undefined defenses.
  it('null StageName → not committed', () => {
    expect(isCommittedOpp({ Type: 'New Business', StageName: null })).toBe(false);
    expect(isCommittedOpp({ Type: 'New Business', StageName: undefined })).toBe(false);
  });

  it('null Type → not committed', () => {
    expect(isCommittedOpp({ Type: null, StageName: 'Discovery' })).toBe(false);
  });
});
