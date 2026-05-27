// apps/utility/src/scoring/isQuantOrNamed.ts
// ADR-0005 §7 — Deterministic claim classifier (B10).
// Source: docs/decisions/0005-ch4-prompts-rigor.md §7
// Deterministic classifier — no LLM call. Two runs of the same text return identical results.
// Load-bearing for rigor scoring: 35% of total weight (claim_source dimension).

import { NAMED_ENTITY_REGISTRY } from '../registry/namedEntities.js';

/**
 * Returns true if the claim text contains a quantitative value or named entity
 * that requires a source_id citation.
 *
 * TRUE cases (require citation):
 *   - Dollar amounts with digits: "$43M", "$1.4M", "$111,766"
 *   - Percentages with digits: "47.9%", "15%"
 *   - Large numbers: "42 opportunities", "41 employees"
 *   - Named entities in NAMED_ENTITY_REGISTRY (companies, people, products, competitors)
 *   - Quantitative change verbs with numbers: "grew 23%", "declined by $2M"
 *
 * FALSE cases (do NOT require citation):
 *   - Dates in opinion claims: "by next quarter" → false (no numeric value)
 *   - Numbers in metaphors: "a thousand cuts" → false (idiomatic)
 *   - Currency abbreviation without digits: "$M range" → false (no specific digit)
 *   - Named entity in hypothetical: "if Barclays were to call" → TRUE
 *     (named entity detection fires regardless of hypothetical framing)
 *   - Percentage in projection with hedge: "ARR might grow 15% if renewals hold" → TRUE
 *     (15% is a specific quantitative value)
 */
export function isQuantOrNamed(claimText: string): boolean {
  // 1. Numeric literals with dollar sign + digits
  if (/\$\s*\d/.test(claimText)) return true;

  // 2. Percentages with digits (explicit numeric value)
  if (/\d+(\.\d+)?\s*%/.test(claimText)) return true;

  // 3. Large number literals (4+ digit sequences or comma-separated)
  if (/\b\d{1,3}(,\d{3})+\b/.test(claimText)) return true;

  // 4. Small explicit counts (context-dependent; matches N + unit pattern)
  //    e.g., "42 opportunities", "41 employees", "16 months"
  if (/\b\d+\s+(opportunities|employees|accounts|months|weeks|days|customers|reps|seats|positions)\b/i.test(claimText)) return true;

  // 5. Named entity lookup in NAMED_ENTITY_REGISTRY
  //    Fires for hypotheticals too (edge case 2): "if Barclays were to call" → true
  for (const entity of NAMED_ENTITY_REGISTRY) {
    if (claimText.includes(entity)) return true;
  }

  // 6. Quantitative change verbs with numeric values
  if (/\b(grew|declined|increased|fell|dropped|spiked|rose|cut|reduced)\s+(by\s+)?\$?\d/.test(claimText)) return true;

  // Edge case guards:
  // "a thousand cuts" → no digit-preceded pattern; falls through to false
  // "$M range" → \$\s*\d requires a digit after $; "$M" has no digit after $ → false
  // "by next quarter" → no numeric value; no named entity → false

  return false;
}
