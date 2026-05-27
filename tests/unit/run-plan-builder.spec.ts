/**
 * ADR-0006 §8 AC-3 — buildRunPlan() returns correct RunPlan for cash_lever + open_qa
 * Test owner: Ch.5 Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0006-ch5-cash-lever-slice.md §3 (plan-approval screen contract)
 *         docs/decisions/0006-ch5-cash-lever-slice.md §7 Step 3
 *         docs/decisions/0004-ch3-runtime-spine.md §1 (RunState machine — RunPlan type)
 *
 * STATUS: RED until Ch.5 Runtime ships.
 *
 * Spec intent (AC-3):
 *   - buildRunPlan('cash_lever', question) returns:
 *       - lenses: ['CFO', 'COS'] (ADR-0006 §1.2 default for cash-lever question)
 *       - mcps: ['salesforce', 'aws', 'netsuite', 'cash_model_xlsx']
 *       - tokenEstimate: number ≤ 180_000 (scheduler windowCap)
 *       - memoPath: matches pattern {vault}/memos/{date}-cash-lever-{slug}.md
 *   - buildRunPlan('open_qa', question) ad-hoc decomposes:
 *       - lenses chosen based on question content (at least 1 lens)
 *       - stamp: 'AD-HOC'
 *   - tokenEstimate is strictly a number (not undefined, not NaN, not Infinity).
 *
 * Scheduler windowCap: 180_000 tokens (ADR-0006 §3.3 + ADR-0004 scheduler contract).
 * buildRunPlan location: apps/utility/src/orchestrator/run-plan-builder.ts
 *
 * Activating when Ch.5 Runtime ships:
 *   1. Uncomment the buildRunPlan import.
 *   2. Remove `expect(true).toBe(false)` placeholders.
 */

import { describe, it, expect } from 'vitest';

// ── Runtime import (uncomment when Ch.5 Runtime ships) ──────────────────────
// import {
//   buildRunPlan,
//   type RunPlan,
// } from '../../apps/utility/src/orchestrator/run-plan-builder.js';

// ── Stub (keeps TS happy until Runtime ships) ────────────────────────────────
function buildRunPlan(_playbook: string, _question: string): never {
  throw new Error('buildRunPlan not implemented — Ch.5 Runtime not yet dispatched');
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SCHEDULER_WINDOW_CAP = 180_000; // tokens — ADR-0006 §3.3

const CASH_LEVER_QUESTION =
  'Should we shift our W30 trough mitigation from line-of-credit draw to deferred AWS spend?';

const OPEN_QA_QUESTION =
  'What are the top three things I should know about running a board meeting?';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AC-3 — buildRunPlan (Ch.5 Runtime RED)', () => {
  describe('cash_lever playbook', () => {
    it('RED: returns lenses CFO and COS for default cash-lever question', () => {
      // const plan = buildRunPlan('cash_lever', CASH_LEVER_QUESTION);
      // expect(plan.lenses).toContain('CFO');
      // expect(plan.lenses).toContain('COS');
      expect(() => buildRunPlan('cash_lever', CASH_LEVER_QUESTION)).toThrow('not implemented');
    });

    it('RED: returns all 4 required MCPs for cash_lever', () => {
      // const plan = buildRunPlan('cash_lever', CASH_LEVER_QUESTION);
      // const expectedMcps = ['salesforce', 'aws', 'netsuite', 'cash_model_xlsx'];
      // for (const mcp of expectedMcps) {
      //   expect(plan.mcps, `Missing MCP: ${mcp}`).toContain(mcp);
      // }
      expect(() => buildRunPlan('cash_lever', CASH_LEVER_QUESTION)).toThrow('not implemented');
    });

    it('RED: token estimate is a finite number ≤ scheduler windowCap (180K)', () => {
      // const plan = buildRunPlan('cash_lever', CASH_LEVER_QUESTION);
      // expect(typeof plan.tokenEstimate).toBe('number');
      // expect(Number.isFinite(plan.tokenEstimate)).toBe(true);
      // expect(plan.tokenEstimate).toBeGreaterThan(0);
      // expect(plan.tokenEstimate).toBeLessThanOrEqual(SCHEDULER_WINDOW_CAP);
      expect(() => buildRunPlan('cash_lever', CASH_LEVER_QUESTION)).toThrow('not implemented');
    });

    it('RED: memoPath matches vault pattern {vault}/memos/{date}-cash-lever-{slug}.md', () => {
      // const plan = buildRunPlan('cash_lever', CASH_LEVER_QUESTION);
      // expect(plan.memoPath).toMatch(/memos\/\d{4}-\d{2}-\d{2}-cash-lever-[\w-]+\.md$/);
      expect(() => buildRunPlan('cash_lever', CASH_LEVER_QUESTION)).toThrow('not implemented');
    });

    it('RED: no stamp on known playbook (cash_lever is not AD-HOC)', () => {
      // const plan = buildRunPlan('cash_lever', CASH_LEVER_QUESTION);
      // expect(plan.stamp).toBeUndefined();
      expect(() => buildRunPlan('cash_lever', CASH_LEVER_QUESTION)).toThrow('not implemented');
    });
  });

  describe('open_qa playbook (ad-hoc decomposition)', () => {
    it('RED: returns at least one lens for open_qa question', () => {
      // const plan = buildRunPlan('open_qa', OPEN_QA_QUESTION);
      // expect(plan.lenses.length).toBeGreaterThanOrEqual(1);
      expect(() => buildRunPlan('open_qa', OPEN_QA_QUESTION)).toThrow('not implemented');
    });

    it('RED: stamps AD-HOC on open_qa plan', () => {
      // const plan = buildRunPlan('open_qa', OPEN_QA_QUESTION);
      // expect(plan.stamp).toBe('AD-HOC');
      expect(() => buildRunPlan('open_qa', OPEN_QA_QUESTION)).toThrow('not implemented');
    });

    it('RED: open_qa token estimate is still ≤ scheduler windowCap', () => {
      // const plan = buildRunPlan('open_qa', OPEN_QA_QUESTION);
      // expect(plan.tokenEstimate).toBeLessThanOrEqual(SCHEDULER_WINDOW_CAP);
      expect(() => buildRunPlan('open_qa', OPEN_QA_QUESTION)).toThrow('not implemented');
    });
  });
});
