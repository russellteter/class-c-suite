/**
 * ADR-0006 §8 AC-2 + AC-10 (prep) — playbook classifier + pre-approval MCP guard
 * Test owner: Ch.5 Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0006-ch5-cash-lever-slice.md §1.1 + §8 AC-2, AC-10
 *         docs/decisions/0006-ch5-cash-lever-slice.md §6.2 (Open Q&A → classifyPlaybook)
 *
 * STATUS: RED until Ch.5 Runtime ships.
 *
 * Spec intent (AC-2):
 *   - classifyPlaybook(question) returns the correct playbook key for cash-lever input.
 *   - classifyPlaybook() returns 'stakeholder_1on1_prep' for 1:1 prep questions.
 *   - classifyPlaybook() returns 'open_qa' + AD-HOC stamp for unrecognized questions.
 *
 * Spec intent (AC-10 prep):
 *   - No MCP calls fire before 'run.plan.approved' IPC is received.
 *   - Cancelling on plan-approval screen aborts cleanly (no MCP calls, RunState → idle).
 *
 * classifyPlaybook() location: apps/utility/src/orchestrator/classify-playbook.ts
 * MCP call guard location: apps/utility/src/orchestrator/index.ts (fan-out gated on approved IPC)
 *
 * Activating when Ch.5 Runtime ships:
 *   1. Uncomment the classifyPlaybook import.
 *   2. Uncomment the MCP spy test block.
 *   3. Remove `expect(true).toBe(false)` placeholders.
 *
 * ADR-0006 §1.1 classifier keywords: {cash, trough, W30, line-of-credit, AWS spend, deferred, leverage}
 */

import { describe, it, expect, vi } from 'vitest';

// ── Runtime import — Ch.5 Runtime shipped ───────────────────────────────────
import {
  classifyPlaybook,
  type PlaybookClassification,
} from '../../apps/utility/src/orchestrator/classify-playbook.js';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const CASH_LEVER_QUESTION =
  'Should we shift our W30 trough mitigation from line-of-credit draw to deferred AWS spend?';

const STAKEHOLDER_QUESTION =
  "Help me prep my 1:1 with Sarah — she's been disengaged since the reorg";

const OPEN_QA_QUESTION =
  'What are the top three things I should know about running a board meeting?';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AC-2 — classifyPlaybook (Ch.5 Runtime RED)', () => {
  it('cash lever question → playbook key "cash_lever"', () => {
    const result = classifyPlaybook(CASH_LEVER_QUESTION);
    expect(result.playbook).toBe('cash_lever');
    expect(result.stamp).toBeUndefined(); // no AD-HOC stamp on known playbook
  });

  it('1:1 prep question → playbook key "stakeholder_1on1_prep"', () => {
    const result = classifyPlaybook(STAKEHOLDER_QUESTION);
    expect(result.playbook).toBe('stakeholder_1on1_prep');
  });

  it('unrecognized question → "open_qa" + AD-HOC stamp', () => {
    const result = classifyPlaybook(OPEN_QA_QUESTION);
    expect(result.playbook).toBe('open_qa');
    expect(result.stamp).toBe('AD-HOC');
  });

  it('cash lever classification matches on W30 keyword alone', () => {
    const result = classifyPlaybook('What should we do about the W30 trough?');
    expect(result.playbook).toBe('cash_lever');
  });

  it('cash lever classification matches on "line-of-credit" keyword alone', () => {
    const result = classifyPlaybook('Should we draw on our line-of-credit this quarter?');
    expect(result.playbook).toBe('cash_lever');
  });

  it('empty string → open_qa with AD-HOC stamp', () => {
    const result = classifyPlaybook('');
    expect(result.playbook).toBe('open_qa');
    expect(result.stamp).toBe('AD-HOC');
  });
});

describe('AC-10 prep — MCP calls blocked before run.plan.approved (Ch.5 Runtime RED)', () => {
  it('RED: no MCP calls fire when plan-approval is pending', () => {
    // Verify orchestrator holds all MCP calls until run.plan.approved IPC fires.
    // Implementation approach: spy on MCP call entry-points; start a run without
    // emitting run.plan.approved; assert spies were never called.
    //
    // const sfSpy  = vi.spyOn(sfMcp,  'query');
    // const awsSpy = vi.spyOn(awsMcp, 'query');
    // const nsSpy  = vi.spyOn(nsMcp,  'query');
    //
    // const orchestrator = startOrchestrator({ question: CASH_LEVER_QUESTION, testMode: true });
    // await orchestrator.waitForState('plan-approval');
    //
    // expect(sfSpy).not.toHaveBeenCalled();
    // expect(awsSpy).not.toHaveBeenCalled();
    // expect(nsSpy).not.toHaveBeenCalled();
    //
    // ipcMainEmit('run.plan.cancelled', { runId: orchestrator.runId });
    // const finalState = await orchestrator.waitForComplete();
    // expect(finalState.kind).toBe('idle');
    expect(true).toBe(false); // intentional RED
  });

  it('RED: plan-approval cancel → RunState transitions to idle; no MCP calls made', () => {
    // As above — cancel path specifically.
    expect(true).toBe(false); // intentional RED
  });
});
