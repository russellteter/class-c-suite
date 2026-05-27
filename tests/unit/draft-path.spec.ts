/**
 * ADR-0006 §8 AC-8 — DRAFT path: rigor < 70 → .draft.md suffix + UI DRAFT banner
 * Test owner: Ch.5 Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0006-ch5-cash-lever-slice.md §5.3 + §8 AC-8
 *         docs/architecture/data.md §SafeWrite DRAFT path (BLOCKERS B8 mitigation)
 *
 * STATUS: RED until Ch.5 Runtime ships.
 *
 * Spec intent (AC-8):
 *   - Build a Verifier output with rigor_score: 65, ship_status: 'draft', failure_reasons: [...].
 *   - Run through post-Verifier transition (verifier → shipped-draft RunState).
 *   - Assert memo file written with .draft.md suffix (not .md).
 *   - Assert UI memo viewer renders DRAFT banner (amber, full-width, dismissable).
 *   - Assert failure_reasons render in expandable panel.
 *
 * Verifier output shape (ADR-0006 §5.3 + rigor-cases.json):
 *   - rigor_score: number (0–100)
 *   - ship_status: 'clean' | 'draft'
 *   - failure_reasons: string[]
 *
 * SafeWrite DRAFT path: writes {vault}/memos/{date}-cash-lever-{slug}.draft.md
 * Clean path: writes {vault}/memos/{date}-cash-lever-{slug}.md
 *
 * Memo viewer DRAFT banner contract (ADR-0006 §5.3):
 *   - Amber banner at top, full-width, dismissable only after explicit acknowledgment.
 *   - "Why draft?" expandable panel with failure_reasons[] in plain language.
 *   - All citations still functional — DRAFT is a signal, not a gate.
 *
 * Activating when Ch.5 Runtime ships:
 *   1. Uncomment the SafeWrite + postVerifierTransition imports.
 *   2. Uncomment the React Testing Library imports for UI assertions.
 *   3. Remove `expect(true).toBe(false)` placeholders.
 */

import { describe, it, expect } from 'vitest';

// ── Runtime imports (uncomment when Ch.5 Runtime ships) ─────────────────────
// import { SafeWrite }            from '../../packages/vault-writer/src/index.js';
// import { postVerifierTransition } from '../../apps/utility/src/orchestrator/transitions.js';
// import type { VerifierOutput }  from '../../packages/shared-types/src/verifier-output.js';
// import type { RunState }        from '../../packages/shared-types/src/run-state.js';

// ── UI imports (uncomment when Ch.5 UI ships) ────────────────────────────────
// import { render, screen }       from '@testing-library/react';
// import { MemoViewer }           from '../../apps/renderer/src/components/MemoViewer.js';

// ── Test fixtures ─────────────────────────────────────────────────────────────

const DRAFT_VERIFIER_OUTPUT = {
  rigor_score: 65,
  ship_status: 'draft' as const,
  claim_source_score: 20,
  coverage_score: 15,
  red_team_score: 15,
  calibration_score: 10,
  falsifier_score:    5,
  claims_verified: [
    { claim: '$14.2M current cash',       source_id: 'ns-cash-2026-05-27',    verdict: 'PASS' },
    { claim: '$4.2M committed pipeline',  source_id: 'sf-pipeline-2026-05-27', verdict: 'PASS' },
  ],
  claims_unverified: [
    { claim: 'AWS spend is growing 30% YoY', reason: 'No tool call returned this figure' },
  ],
  failure_reasons: [
    '[UNSOURCED CLAIM] "AWS spend is growing 30% YoY" — no tool call returned this figure.',
    '[COVERAGE GAP] CFO lens only cited 2 of 4 required sources.',
  ],
  coverage_gap: 'AWS spend data not sourced from tool call',
};

const CLEAN_VERIFIER_OUTPUT = {
  rigor_score: 83,
  ship_status: 'clean' as const,
  failure_reasons: [],
  claims_unverified: [],
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AC-8 — DRAFT path (Ch.5 Runtime RED)', () => {
  describe('Verifier output shape (pure data — no Runtime needed)', () => {
    it('draft fixture has rigor_score < 70', () => {
      expect(DRAFT_VERIFIER_OUTPUT.rigor_score).toBeLessThan(70);
      expect(DRAFT_VERIFIER_OUTPUT.ship_status).toBe('draft');
    });

    it('draft fixture has non-empty failure_reasons array', () => {
      expect(DRAFT_VERIFIER_OUTPUT.failure_reasons.length).toBeGreaterThanOrEqual(1);
    });

    it('clean fixture has rigor_score ≥ 70', () => {
      expect(CLEAN_VERIFIER_OUTPUT.rigor_score).toBeGreaterThanOrEqual(70);
      expect(CLEAN_VERIFIER_OUTPUT.ship_status).toBe('clean');
    });

    it('failure reasons contain UNSOURCED CLAIM and COVERAGE GAP markers', () => {
      const reasons = DRAFT_VERIFIER_OUTPUT.failure_reasons;
      expect(reasons.some(r => r.includes('[UNSOURCED CLAIM]'))).toBe(true);
      expect(reasons.some(r => r.includes('[COVERAGE GAP]'))).toBe(true);
    });
  });

  describe('Post-Verifier transition → SafeWrite path (Ch.5 Runtime RED)', () => {
    it('RED: rigor_score < 70 → memo written as .draft.md (not .md)', () => {
      // const transition = postVerifierTransition(DRAFT_VERIFIER_OUTPUT, runState);
      // expect(transition.kind).toBe('shipped-draft');
      // expect(transition.memoPath).toMatch(/\.draft\.md$/);
      // expect(transition.memoPath).not.toMatch(/(?<!\.draft)\.md$/);
      expect(true).toBe(false); // intentional RED
    });

    it('RED: rigor_score ≥ 70 → memo written as .md (clean, no draft suffix)', () => {
      // const transition = postVerifierTransition(CLEAN_VERIFIER_OUTPUT, runState);
      // expect(transition.kind).toBe('shipped-clean');
      // expect(transition.memoPath).toMatch(/\.md$/);
      // expect(transition.memoPath).not.toMatch(/\.draft\.md$/);
      expect(true).toBe(false); // intentional RED
    });

    it('RED: shipped-draft RunState contains failure_reasons from Verifier', () => {
      // const transition = postVerifierTransition(DRAFT_VERIFIER_OUTPUT, runState);
      // expect(transition.failureReasons).toEqual(DRAFT_VERIFIER_OUTPUT.failure_reasons);
      expect(true).toBe(false); // intentional RED
    });
  });

  describe('UI memo viewer DRAFT rendering (Ch.5 UI RED)', () => {
    it('RED: DRAFT banner renders when memo.status is draft', () => {
      // const { getByRole } = render(
      //   <MemoViewer memo={{ ...baseMemo, status: 'draft', failureReasons: DRAFT_VERIFIER_OUTPUT.failure_reasons }} />
      // );
      // expect(getByRole('banner', { name: /DRAFT/i })).toBeInTheDocument();
      expect(true).toBe(false); // intentional RED
    });

    it('RED: failure reasons render in expandable panel under DRAFT banner', () => {
      // const { getByRole, getByText } = render(...);
      // const expandBtn = getByRole('button', { name: /Why draft\?/i });
      // await userEvent.click(expandBtn);
      // expect(getByText(/UNSOURCED CLAIM/)).toBeInTheDocument();
      // expect(getByText(/COVERAGE GAP/)).toBeInTheDocument();
      expect(true).toBe(false); // intentional RED
    });

    it('RED: DRAFT memo citations are still clickable (DRAFT is signal, not gate)', () => {
      // Even in DRAFT mode, [^source-id] badges must render and be clickable.
      // const { getAllByRole } = render(<MemoViewer memo={{ ...draftMemo }} />);
      // const citations = getAllByRole('button', { name: /\[\^/ });
      // expect(citations.length).toBeGreaterThanOrEqual(1);
      expect(true).toBe(false); // intentional RED
    });
  });
});
