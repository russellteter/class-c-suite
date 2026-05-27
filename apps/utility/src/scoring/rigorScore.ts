// apps/utility/src/scoring/rigorScore.ts
// ADR-0005 §6 — Pure rigor scoring functions.
// Source: docs/decisions/0005-ch4-prompts-rigor.md §6
// Pure function. No side effects. Same input → same output, run after run.
// Implements the 5-dimension weighted formula from PRD §5 locked.

import type { VerifierOutput } from '../../../packages/shared-types/src/verifier-output.js';

export type PlaybookId =
  | 'strategic_option'
  | 'restructure_decision'
  | 'board_narrative'
  | 'cash_lever'
  | 'gtm_reallocation'
  | 'stakeholder_prep'
  | 'pre_mortem'
  | 'quick_read'
  | 'open_qa';

/**
 * Computes rigor score from Verifier dimension scores.
 * Formula: 35 claim_source + 20 coverage + 15 red_team + 15 calibration + 15 falsifier
 * Maximum: 100. Minimum: 0.
 * open_qa is capped at 85 post-computation (caller must apply applyRigorCap).
 */
export function rigorScore(input: VerifierOutput): number {
  const { claim_source, coverage, red_team, calibration, falsifier } = input.dimensions;
  return claim_source.score + coverage.score + red_team.score
       + calibration.score + falsifier.score;
}

/**
 * Returns the minimum score required for 'clean' ship_status on this playbook.
 * strategic_option + restructure_decision: 80.
 * open_qa: 85 (cap, not threshold — applyRigorCap first).
 * All others: 70.
 */
export function rigorThreshold(playbook: PlaybookId): number {
  if (playbook === 'strategic_option' || playbook === 'restructure_decision') return 80;
  if (playbook === 'open_qa') return 85;
  return 70;
}

/**
 * Clamps open_qa scores to 85 maximum. Other playbooks: no cap.
 * Call BEFORE comparing to threshold.
 */
export function applyRigorCap(score: number, playbook: PlaybookId): number {
  if (playbook === 'open_qa') return Math.min(score, 85);
  return score;
}

/**
 * Determines ship_status.
 * quick_read bypasses Verifier entirely — returns 'quick_read'.
 * open_qa 'clean' result carries 'ad_hoc' stamp (separate from ship_status; surfaced in memo header).
 */
export function shipStatus(
  score: number,
  playbook: PlaybookId,
): 'clean' | 'draft' | 'quick_read' {
  if (playbook === 'quick_read') return 'quick_read';  // bypass path; Verifier never called
  const capped = applyRigorCap(score, playbook);
  const threshold = rigorThreshold(playbook);
  return capped >= threshold ? 'clean' : 'draft';
}
