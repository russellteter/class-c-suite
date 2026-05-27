// tests/unit/orchestrator/run-loop-dispatch.spec.ts
// Source: docs/reviews/ch7-final-audit-qa-report.md (AC-2 REOPEN regression guard)
// Verifies every PlaybookId except 'cash_lever' (the inherited Ch.5 template) is in the
// KNOWN_CH7_PLAYBOOK_IDS dispatch set. Prevents the bug class where new playbooks ship
// without being wired into the run-loop's early-return.

import { describe, it, expect } from 'vitest';
import { KNOWN_CH7_PLAYBOOK_IDS } from '../../../apps/utility/src/orchestrator/run-loop.js';
import { PlaybookIdSchema } from '@c-suite/shared-types/playbook';

describe('run-loop dispatch set (AC-2 regression guard, ADR-0009 §5)', () => {
  const allIds = PlaybookIdSchema.options;
  const expectedCh7 = allIds.filter((id) => id !== 'cash_lever');

  it('contains every Phase A + B playbook id', () => {
    for (const id of expectedCh7) {
      expect(KNOWN_CH7_PLAYBOOK_IDS.has(id)).toBe(true);
    }
  });

  it('does NOT contain cash_lever (it inherits the Ch.5 state-machine path)', () => {
    expect(KNOWN_CH7_PLAYBOOK_IDS.has('cash_lever')).toBe(false);
  });

  it('size matches PlaybookIdSchema.options - 1', () => {
    expect(KNOWN_CH7_PLAYBOOK_IDS.size).toBe(allIds.length - 1);
  });

  for (const id of allIds.filter((x) => x !== 'cash_lever')) {
    it(`Phase A/B playbook "${id}" is reachable via the early-return dispatch`, () => {
      expect(KNOWN_CH7_PLAYBOOK_IDS.has(id)).toBe(true);
    });
  }
});
