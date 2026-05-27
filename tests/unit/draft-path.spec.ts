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

// ── Runtime imports — Ch.5 Runtime shipped ──────────────────────────────────
import { postVerifierTransition } from '../../apps/utility/src/orchestrator/transitions.js';
import type { RunState }          from '../../packages/shared-types/src/run-state.js';

// ── UI imports (Ch.5 UI RED — uncomment when MemoViewer component ships) ────
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

  describe('Post-Verifier transition → SafeWrite path (Ch.5 Runtime)', () => {
    // Minimal verifier RunState for testing the transition
    const verifierRunState: Extract<RunState, { kind: 'verifier' }> = {
      kind: 'verifier',
      runId: 'run-test-ch5',
      memo: {
        runId: 'run-test-ch5',
        memoMarkdown: '',
        executiveSummary: '',
        keyDecisions: [],
        citations: [],
        positionMetadata: [],
      },
      verifierInput: {
        runId: 'run-test-ch5',
        memoMarkdown: '',
        lensOutputs: [] as never,
        toolCallAuditTrail: [],
        positionMetadata: [] as never,
        redTeamOutput: {
          role: 'RedTeam', runId: 'run-test-ch5', challenges: [], overallRisk: 'low', citations: [],
        },
        steelmanOutput: {
          role: 'Steelman', runId: 'run-test-ch5', steelmen: [], citations: [],
        },
        runPlaybook: 'cash_lever',
        runQuestion: 'Test question',
        assembledAt: 1748304000,
      },
    };

    const BASE_MEMO_PATH = '/vault/memos/2026-05-27-cash-lever-loc-vs-aws.md';

    it('rigor_score < 70 → memo written as .draft.md (not .md)', () => {
      const transition = postVerifierTransition(DRAFT_VERIFIER_OUTPUT, verifierRunState, BASE_MEMO_PATH);
      expect(transition.kind).toBe('shipped-draft');
      expect(transition.memoPath).toMatch(/\.draft\.md$/);
      // Must not have bare .md without .draft prefix
      expect(transition.memoPath.endsWith('.draft.md')).toBe(true);
    });

    it('rigor_score >= 70 → memo written as .md (clean, no draft suffix)', () => {
      const transition = postVerifierTransition(CLEAN_VERIFIER_OUTPUT, verifierRunState, BASE_MEMO_PATH);
      expect(transition.kind).toBe('shipped-clean');
      expect(transition.memoPath).toMatch(/\.md$/);
      expect(transition.memoPath).not.toMatch(/\.draft\.md$/);
    });

    it('shipped-draft RunState contains failure_reasons from Verifier', () => {
      const transition = postVerifierTransition(DRAFT_VERIFIER_OUTPUT, verifierRunState, BASE_MEMO_PATH);
      expect(transition.failureReasons).toEqual(DRAFT_VERIFIER_OUTPUT.failure_reasons);
    });
  });

  describe('UI memo viewer DRAFT rendering (Ch.5 UI RED)', () => {
    it.skip('RED: DRAFT banner renders when memo.status is draft — RTL integration (Ch.5 Audit/QA scope)', () => {
      // MemoViewer.tsx ships at apps/renderer/src/screens/MemoViewer.tsx.
      // Renders <div class="draft-banner" role="banner" aria-label="DRAFT"> when status === 'draft'.
      // Activate once jsdom + @testing-library/react added to vitest.config.ts.
    });

    it.skip('RED: failure reasons render in expandable panel under DRAFT banner — RTL integration (Ch.5 Audit/QA scope)', () => {
      // "Why draft?" button expands failure_reasons[] list.
      // Activate once jsdom + @testing-library/react added to vitest.config.ts.
    });

    it.skip('RED: DRAFT memo citations are still clickable (DRAFT is signal, not gate) — RTL integration (Ch.5 Audit/QA scope)', () => {
      // [^source-id] citations render as glass-badge--purple buttons even in DRAFT mode.
      // Activate once jsdom + @testing-library/react added to vitest.config.ts.
    });
  });
});
