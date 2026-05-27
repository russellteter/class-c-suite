// apps/utility/src/orchestrator/transitions.ts
// Source: docs/decisions/0006-ch5-cash-lever-slice.md §5.3 + §8 AC-8
// Post-Verifier state transition: routes to shipped-clean or shipped-draft
// based on rigor score threshold (70 for cash_lever playbook).
//
// This is a pure function — no DB writes, no side effects.
// SafeWrite (Ch.2) handles the actual file write after this transition.

import type { RunState } from '@c-suite/shared-types/run-state';
import { shipStatus } from '../scoring/rigorScore.js';
import type { PlaybookId } from './classify-playbook.js';

export interface VerifierOutputLite {
  rigor_score: number;
  ship_status: 'clean' | 'draft';
  failure_reasons: string[];
}

export interface PostVerifierTransitionResult {
  kind: 'shipped-clean' | 'shipped-draft';
  runId: string;
  memoPath: string;
  rigorScore?: number;
  failureReasons?: string[];
}

/**
 * Compute the post-Verifier RunState transition.
 *
 * rigor_score >= 70 (cash_lever threshold, ADR-0006 §5.3):
 *   → shipped-clean; memoPath has .md suffix
 *
 * rigor_score < 70:
 *   → shipped-draft; memoPath has .draft.md suffix; failureReasons from Verifier
 *
 * Source: ADR-0006 §5.3 + ADR-0005 §rigorThreshold (70 for cash_lever)
 *
 * @param verifierOutput  Verifier dimension scores + failure reasons
 * @param currentState    Current RunState (must be 'verifier' kind)
 * @param baseMemoPath    The planned .md path (without .draft suffix) from RunPlan
 */
export function postVerifierTransition(
  verifierOutput: VerifierOutputLite,
  currentState: Extract<RunState, { kind: 'verifier' }>,
  baseMemoPath?: string,
): PostVerifierTransitionResult {
  const runId = currentState.runId;

  // Resolve the memo path from RunState or use a default
  const resolvedBase = baseMemoPath ?? `memos/${runId}-memo.md`;

  // Ensure the base path ends in .md (not .draft.md) before we decide suffix
  const cleanPath = resolvedBase.endsWith('.draft.md')
    ? resolvedBase.replace(/\.draft\.md$/, '.md')
    : resolvedBase;

  const { rigor_score, failure_reasons } = verifierOutput;

  // cash_lever threshold: 70 (ADR-0006 §5.3 + rigorThreshold('cash_lever'))
  const threshold = 70;

  if (rigor_score >= threshold) {
    return {
      kind: 'shipped-clean',
      runId,
      memoPath: cleanPath,
      rigorScore: rigor_score,
    };
  }

  // DRAFT path: append .draft.md suffix
  const draftPath = cleanPath.endsWith('.md')
    ? cleanPath.replace(/\.md$/, '.draft.md')
    : `${cleanPath}.draft.md`;

  return {
    kind: 'shipped-draft',
    runId,
    memoPath: draftPath,
    failureReasons: failure_reasons,
  };
}
