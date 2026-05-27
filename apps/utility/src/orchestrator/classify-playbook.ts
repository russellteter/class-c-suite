// apps/utility/src/orchestrator/classify-playbook.ts
// Source: docs/decisions/0006-ch5-cash-lever-slice.md §1.1 + §6.2
// B36 fix (2026-05-27): per-playbook keyword classification for all 8 PRD §6 playbooks.
// Falls through to open_qa ONLY when no playbook matches.

export type PlaybookId =
  | 'cash_lever'
  | 'stakeholder_1_1'
  | 'quick_multi_lens'
  | 'pre_mortem'
  | 'gtm_reallocation'
  | 'strategic_option'
  | 'board_narrative'
  | 'restructure_decision'
  | 'open_qa';

export interface PlaybookClassification {
  playbook: PlaybookId;
  /** Present only when playbook === 'open_qa' — AD-HOC stamp per ADR-0006 §6.2 */
  stamp?: 'AD-HOC';
}

// Per-playbook keyword maps. Priority is the order of the entries below.
// First playbook with any keyword match wins. open_qa is the fallback.
// Sources:
//   - PRD §6 (eight V1 playbooks)
//   - ADR-0006 §1.1 (cash_lever keyword seed)
//   - B36 ultrareview finding (docs/reviews/ultrareview-2026-05-27.md)
type PlaybookKeywordMap = {
  playbook: Exclude<PlaybookId, 'open_qa'>;
  keywords: string[];
};

const PLAYBOOK_KEYWORDS: PlaybookKeywordMap[] = [
  // 1. cash_lever — W30 trough / runway / covenant
  {
    playbook: 'cash_lever',
    keywords: [
      'cash lever', 'cash position', 'cash trough', 'w30', 'trough',
      'line-of-credit', 'line of credit', 'loc draw', 'aws spend', 'deferred aws',
      'runway', 'covenant', 'barclays', 'cash forecast', 'weekly cash',
    ],
  },
  // 6. restructure_decision — fire/restructure a person (check before stakeholder so "fire X" wins)
  {
    playbook: 'restructure_decision',
    keywords: [
      'fire ', 'restructure ', 'should we fire', 'should we restructure',
      'terminate', 'let go', 'replace ', 'severance', 'org change',
      'reorg ', 'reorg the', 'demote',
    ],
  },
  // 4. stakeholder_1_1 — single-agent COS fast lane
  {
    playbook: 'stakeholder_1_1',
    keywords: [
      '1:1', '1-on-1', 'one-on-one', 'one on one',
      'prep my', 'prep for my', 'prep with', 'prep meeting',
      'stakeholder prep', 'disengaged', 'check-in with',
    ],
  },
  // 5. board_narrative — board meeting / deck prep / investor narrative
  {
    playbook: 'board_narrative',
    keywords: [
      'board narrative', 'board deck', 'board prep', 'board meeting',
      'investor narrative', 'investor update', 'holdco update',
      'narrative spine', 'slide skeleton', 'deck prep',
    ],
  },
  // 7. pre_mortem — adversarial-first failure-mode analysis
  {
    playbook: 'pre_mortem',
    keywords: [
      'pre-mortem', 'pre mortem', 'premortem',
      'failure modes', 'what could go wrong', 'how will this fail',
      'kill this', 'tripwire',
    ],
  },
  // 2. gtm_reallocation — pipeline + headcount + comp
  {
    playbook: 'gtm_reallocation',
    keywords: [
      'gtm reallocation', 'gtm shift', 'reallocate gtm', 'sales headcount',
      'comp plan', 'compensation plan', 'territory', 'quota',
      'sales reallocation', 'pipeline reallocation', 'go-to-market',
    ],
  },
  // 3. strategic_option — recap / sale / wind-down / turnaround
  {
    playbook: 'strategic_option',
    keywords: [
      'strategic option', 'strategic options', 'recap', 'recapitalization',
      'wind-down', 'wind down', 'sell the company', 'sale of the company',
      'turnaround vs', 'sale vs', 'exit option', 'strategic alternatives',
    ],
  },
  // 8. quick_multi_lens — fast six-lens read for call prep
  {
    playbook: 'quick_multi_lens',
    keywords: [
      'quick read', 'quick multi-lens', 'six angles', '90 seconds',
      'quick lens', 'fast read', 'call prep ', 'before a call',
    ],
  },
];

/**
 * Classify a user question into a playbook ID.
 *
 * Behavior:
 *   - Case-insensitive substring match on the full question.
 *   - PLAYBOOK_KEYWORDS is checked in order; first match wins.
 *   - No match → open_qa with AD-HOC stamp.
 *
 * The priority order resolves overlaps (e.g., "fire X over comp issues"
 * should resolve to restructure_decision, not gtm_reallocation).
 *
 * Source: PRD §6 (eight playbooks) + ADR-0006 §1.1 + B36 fix.
 */
export function classifyPlaybook(question: string): PlaybookClassification {
  const lower = question.toLowerCase();

  for (const { playbook, keywords } of PLAYBOOK_KEYWORDS) {
    if (keywords.some(kw => lower.includes(kw))) {
      return { playbook };
    }
  }

  return { playbook: 'open_qa', stamp: 'AD-HOC' };
}
