/**
 * ADR-0006 §8 AC-3 — buildRunPlan() returns correct RunPlan per PRD §6 lens roster.
 * B36/B37 fix (2026-05-27): asserts lens roster for every playbook.
 * Source: docs/reviews/ultrareview-2026-05-27.md "Critical Fix 3" + PRD §6.
 */

import { describe, it, expect } from 'vitest';
import {
  buildRunPlan,
} from '../../apps/utility/src/orchestrator/run-plan-builder.js';

const SCHEDULER_WINDOW_CAP = 180_000;

const CASH_LEVER_QUESTION =
  'Should we shift our W30 trough mitigation from line-of-credit draw to deferred AWS spend?';

const OPEN_QA_QUESTION =
  'What are the top three things I should know about running a board meeting?';

describe('AC-3 — buildRunPlan cash_lever', () => {
  it('cash_lever returns CFO + COS at minimum', () => {
    const plan = buildRunPlan('cash_lever', CASH_LEVER_QUESTION);
    expect(plan.lenses).toContain('CFO');
    expect(plan.lenses).toContain('COS');
  });

  it('cash_lever returns all 4 MCPs', () => {
    const plan = buildRunPlan('cash_lever', CASH_LEVER_QUESTION);
    for (const mcp of ['salesforce', 'aws', 'netsuite', 'cash_model_xlsx']) {
      expect(plan.mcps).toContain(mcp);
    }
  });

  it('token estimate is finite and ≤ windowCap', () => {
    const plan = buildRunPlan('cash_lever', CASH_LEVER_QUESTION);
    expect(typeof plan.tokenEstimate).toBe('number');
    expect(Number.isFinite(plan.tokenEstimate)).toBe(true);
    expect(plan.tokenEstimate).toBeGreaterThan(0);
    expect(plan.tokenEstimate).toBeLessThanOrEqual(SCHEDULER_WINDOW_CAP);
  });

  it('memoPath matches cash-lever pattern', () => {
    const plan = buildRunPlan('cash_lever', CASH_LEVER_QUESTION);
    expect(plan.memoPath).toMatch(/memos\/\d{4}-\d{2}-\d{2}-cash-lever-[\w-]+\.md$/);
  });

  it('no AD-HOC stamp on cash_lever', () => {
    const plan = buildRunPlan('cash_lever', CASH_LEVER_QUESTION);
    expect(plan.stamp).toBeUndefined();
  });
});

describe('B37 — stakeholder_1on1_prep wires COS only (single-agent fast lane)', () => {
  it('stakeholder_1on1_prep returns exactly ["COS"]', () => {
    const plan = buildRunPlan(
      'stakeholder_1on1_prep',
      "Help me prep my 1:1 with Sarah."
    );
    expect(plan.lenses).toEqual(['COS']);
  });

  it('stakeholder_1on1_prep does NOT include CEO lens', () => {
    const plan = buildRunPlan('stakeholder_1on1_prep', 'Prep my 1:1.');
    expect(plan.lenses).not.toContain('CEO');
  });

  it('stakeholder_1on1_prep stays at one lens regardless of question wording', () => {
    const plan = buildRunPlan(
      'stakeholder_1on1_prep',
      'I need to prep for a strategic check-in with the head of revenue.'
    );
    expect(plan.lenses).toHaveLength(1);
    expect(plan.lenses[0]).toBe('COS');
  });
});

describe('B36 — buildRunPlan wires PRD §6 lens roster for every playbook', () => {
  it('gtm_reallocation: CRO + CFO + CMO + CPO + COS', () => {
    const plan = buildRunPlan('gtm_reallocation', 'Reallocate GTM headcount.');
    expect(plan.lenses).toEqual(
      expect.arrayContaining(['CRO', 'CFO', 'CMO', 'CPO', 'COS'])
    );
    expect(plan.lenses).toHaveLength(5);
  });

  it('strategic_option: CEO + CFO + CPO + COS', () => {
    const plan = buildRunPlan('strategic_option', 'Recap vs sale vs turnaround.');
    expect(plan.lenses).toEqual(
      expect.arrayContaining(['CEO', 'CFO', 'CPO', 'COS'])
    );
    expect(plan.lenses).toHaveLength(4);
  });

  it('board_narrative: all 6 lenses', () => {
    const plan = buildRunPlan('board_narrative', 'Draft the board narrative.');
    expect(plan.lenses).toEqual(
      expect.arrayContaining(['CEO', 'CFO', 'CRO', 'CMO', 'CPO', 'COS'])
    );
    expect(plan.lenses).toHaveLength(6);
  });

  it('restructure_decision: COS + CFO (no CPO when non-product role)', () => {
    const plan = buildRunPlan(
      'restructure_decision',
      'Should we fire the VP of Sales?'
    );
    expect(plan.lenses).toEqual(expect.arrayContaining(['COS', 'CFO']));
    expect(plan.lenses).not.toContain('CPO');
  });

  it('restructure_decision: adds CPO when question signals product/eng role', () => {
    const plan = buildRunPlan(
      'restructure_decision',
      'Should we fire the VP of Engineering?'
    );
    expect(plan.lenses).toEqual(
      expect.arrayContaining(['COS', 'CFO', 'CPO'])
    );
  });

  it('pre_mortem: lenses skipped (adversarial-first)', () => {
    const plan = buildRunPlan('pre_mortem', 'Pre-mortem on the partnership.');
    expect(plan.lenses).toEqual([]);
  });

  it('quick_multi_lens: all 6 lenses (no red-team handled in state-machine)', () => {
    const plan = buildRunPlan('quick_multi_lens', 'Quick read on the LOI.');
    expect(plan.lenses).toEqual(
      expect.arrayContaining(['CEO', 'CFO', 'CRO', 'CMO', 'CPO', 'COS'])
    );
    expect(plan.lenses).toHaveLength(6);
  });
});

describe('AC-3 — buildRunPlan open_qa ad-hoc decomposition', () => {
  it('returns at least one lens', () => {
    const plan = buildRunPlan('open_qa', OPEN_QA_QUESTION);
    expect(plan.lenses.length).toBeGreaterThanOrEqual(1);
  });

  it('stamps AD-HOC', () => {
    const plan = buildRunPlan('open_qa', OPEN_QA_QUESTION);
    expect(plan.stamp).toBe('AD-HOC');
  });

  it('token estimate still ≤ windowCap', () => {
    const plan = buildRunPlan('open_qa', OPEN_QA_QUESTION);
    expect(plan.tokenEstimate).toBeLessThanOrEqual(SCHEDULER_WINDOW_CAP);
  });
});
