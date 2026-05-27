/**
 * ADR-0006 §8 AC-2 — playbook classifier
 * B36 fix (2026-05-27): per-playbook keyword classification for all 8 PRD §6 playbooks.
 * Source: docs/reviews/ultrareview-2026-05-27.md "Critical Fix 2"
 *
 * Two representative inputs per playbook + ad-hoc fall-through.
 */

import { describe, it, expect } from 'vitest';
import {
  classifyPlaybook,
  type PlaybookId,
} from '../../apps/utility/src/orchestrator/classify-playbook.js';

interface Case {
  question: string;
  expected: PlaybookId;
}

// Two inputs per playbook (B36 spec).
const CASES: Case[] = [
  // 1. cash_lever
  { question: 'Should we shift our W30 trough mitigation from line-of-credit draw to deferred AWS spend?', expected: 'cash_lever' },
  { question: 'How tight is our covenant headroom this quarter under the Barclays facility?', expected: 'cash_lever' },

  // 2. gtm_reallocation
  { question: 'Should we reallocate GTM headcount from mid-market to enterprise?', expected: 'gtm_reallocation' },
  { question: 'Time to redo the comp plan and shift territory coverage.', expected: 'gtm_reallocation' },

  // 3. strategic_option
  { question: 'Walk through our strategic options — recap vs sale vs turnaround.', expected: 'strategic_option' },
  { question: 'Should we pursue a recapitalization or wind down the company?', expected: 'strategic_option' },

  // 4. stakeholder_1on1_prep
  { question: "Help me prep my 1:1 with Sarah — she's been disengaged since the reorg", expected: 'stakeholder_1on1_prep' },
  { question: 'I need a quick prep for my one-on-one with the new VP Eng tomorrow.', expected: 'stakeholder_1on1_prep' },

  // 5. board_narrative
  { question: 'Draft the board narrative for next month — the story we tell the board.', expected: 'board_narrative' },
  { question: 'Board deck prep: what slides do we need for the Q3 board meeting?', expected: 'board_narrative' },

  // 6. restructure_decision
  { question: 'Should we fire the VP of Sales?', expected: 'restructure_decision' },
  { question: 'Time to restructure the marketing org — replace the CMO.', expected: 'restructure_decision' },

  // 7. pre_mortem
  { question: 'Run a pre-mortem on the partnership we are about to announce.', expected: 'pre_mortem' },
  { question: 'What are the failure modes if we launch the new pricing next month?', expected: 'pre_mortem' },

  // 8. quick_multi_lens
  { question: 'Quick read on the board ask before my call in 30 minutes.', expected: 'quick_multi_lens' },
  { question: 'Six angles in 90 seconds: should we accept the LOI?', expected: 'quick_multi_lens' },
];

describe('B36 — classifyPlaybook routes all 8 playbooks correctly (PRD §6)', () => {
  for (const { question, expected } of CASES) {
    it(`"${question.slice(0, 60)}…" → ${expected}`, () => {
      const result = classifyPlaybook(question);
      expect(result.playbook).toBe(expected);
      // Known playbook never carries AD-HOC stamp
      expect(result.stamp).toBeUndefined();
    });
  }

  it('unrecognized generic question → open_qa + AD-HOC stamp', () => {
    const result = classifyPlaybook(
      'What are the top three things I should know about hiring a senior accountant?'
    );
    expect(result.playbook).toBe('open_qa');
    expect(result.stamp).toBe('AD-HOC');
  });

  it('empty string → open_qa + AD-HOC stamp', () => {
    const result = classifyPlaybook('');
    expect(result.playbook).toBe('open_qa');
    expect(result.stamp).toBe('AD-HOC');
  });
});

describe('AC-10 prep — MCP calls blocked before run.plan.approved (Ch.5 Runtime RED)', () => {
  it.skip('RED: no MCP calls fire when plan-approval is pending — needs orchestrator integration (Ch.5 Audit/QA scope)', () => {
    // Deferred: Ch.5 Audit/QA scope.
  });

  it.skip('RED: plan-approval cancel → RunState transitions to idle; no MCP calls made — needs orchestrator integration', () => {
    // Deferred: Ch.5 Audit/QA scope.
  });
});
