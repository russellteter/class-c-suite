// apps/utility/src/orchestrator/classify-playbook.ts
// Source: docs/decisions/0006-ch5-cash-lever-slice.md §1.1 + §6.2
// Heuristic keyword classifier. Maps question text → PlaybookId.
// AC-2: classifyPlaybook() returns correct playbook key for known patterns.

export type PlaybookId =
  | 'cash_lever'
  | 'stakeholder_1on1_prep'
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

// ADR-0006 §1.1: keywords that match the cash_lever playbook
const CASH_LEVER_KEYWORDS = [
  'cash',
  'trough',
  'w30',
  'line-of-credit',
  'line of credit',
  'loc',
  'aws spend',
  'deferred',
  'leverage',
  'cash lever',
  'cash position',
  'runway',
  'covenant',
  'barclays',
];

// Stakeholder 1:1 prep keywords (stub for Ch.7)
const STAKEHOLDER_KEYWORDS = [
  '1:1',
  '1-on-1',
  'one-on-one',
  'prep my',
  'prep for my',
  'prep with',
  'prep meeting',
  'stakeholder',
  'disengaged',
  'reorg',
];

/**
 * Classify a user question into a playbook ID.
 * Uses case-insensitive keyword matching on the full question text.
 *
 * Priority order (first match wins):
 *   1. cash_lever — highest-confidence operational playbook for Ch.5
 *   2. stakeholder_1on1_prep — stub for Ch.7
 *   3. open_qa + AD-HOC stamp — default for everything else
 *
 * Source: ADR-0006 §1.1 classifier keywords
 */
export function classifyPlaybook(question: string): PlaybookClassification {
  const lower = question.toLowerCase();

  // Cash lever — check all keywords
  const isCashLever = CASH_LEVER_KEYWORDS.some(kw => lower.includes(kw));
  if (isCashLever) {
    return { playbook: 'cash_lever' };
  }

  // Stakeholder 1:1 prep — Ch.7 stub
  const isStakeholder = STAKEHOLDER_KEYWORDS.some(kw => lower.includes(kw));
  if (isStakeholder) {
    return { playbook: 'stakeholder_1on1_prep' };
  }

  // Default: open_qa with AD-HOC stamp
  return { playbook: 'open_qa', stamp: 'AD-HOC' };
}
