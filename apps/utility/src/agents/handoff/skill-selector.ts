// apps/utility/src/agents/handoff/skill-selector.ts
// Source: docs/decisions/0011-ch9-cowork-handoff.md §3.3 + §4.1
// Pure function: pick Cowork brand skill IDs from a list of deliverable descriptions.
// Heuristic match — no LLM required.
// Closed set of 5 skill IDs; no new IDs may be invented.

import type { CoworkBrandSkillId } from '@c-suite/shared-types/handoff';

/**
 * Heuristic rules (ADR §3.3):
 *  "deck" | "slides" | "presentation" | "board"   → class-brand-presentations
 *  "doc" | "memo" | "letter" | "report" | "word"  → class-brand-document
 *  "model" | "spreadsheet" | "xlsx" | "excel"     → class-brand-excel
 *  "external" | "customer-facing" | "customer facing" | "external-facing"
 *                                                  → +class-brand-voice (additive)
 *  No match                                        → []
 *
 * Rule evaluation is OR-within-group, additive across groups.
 * Deduplication: skills appear at most once even if multiple deliverables match the same rule.
 */
export function pickBrandSkills(deliverables: string[]): CoworkBrandSkillId[] {
  if (!deliverables.length) return [];

  const combined = deliverables.join(' ').toLowerCase();

  const selected = new Set<CoworkBrandSkillId>();

  // Presentation / deck
  if (/\b(deck|slides?|presentation|board)\b/.test(combined)) {
    selected.add('class-brand-presentations');
  }

  // Document
  if (/\b(doc|docs|document|memo|letter|report|word)\b/.test(combined)) {
    selected.add('class-brand-document');
  }

  // Excel / spreadsheet
  if (/\b(model|spreadsheet|xlsx|excel|workbook)\b/.test(combined)) {
    selected.add('class-brand-excel');
  }

  // Voice — additive; appended when external-facing copy is in scope
  if (/\b(external|customer[- ]facing|external[- ]facing|voice)\b/.test(combined)) {
    selected.add('class-brand-voice');
  }

  return Array.from(selected);
}

/**
 * Internal presentation-style variant match — adds class-ppt-cyan-light
 * when the deliverable explicitly calls out "internal" + ("deck"|"slides").
 * Distinct from class-brand-presentations (external polish level).
 * Exposed separately so callers can opt into it; not folded into pickBrandSkills
 * to keep the default selection minimal.
 */
export function includesCyanLightVariant(deliverables: string[]): boolean {
  const combined = deliverables.join(' ').toLowerCase();
  return /\binternal\b/.test(combined) && /\b(deck|slides?)\b/.test(combined);
}

/**
 * Full skill selection including the cyan-light variant.
 * Returns all skills relevant to the deliverables.
 */
export function pickAllBrandSkills(deliverables: string[]): CoworkBrandSkillId[] {
  const base = pickBrandSkills(deliverables);
  if (includesCyanLightVariant(deliverables) && !base.includes('class-ppt-cyan-light')) {
    return [...base, 'class-ppt-cyan-light'];
  }
  return base;
}
