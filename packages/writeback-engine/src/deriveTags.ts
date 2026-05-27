// packages/writeback-engine/src/deriveTags.ts
// Pure function extracted from scripts/vault-tag-backfill.ts.
// Source: docs/decisions/0008-write-backs-and-iterative-feedback.md §2.4
// Derives structural tags for a vault artifact based on zone + frontmatter values.
// The output stays in sync with what vault-tag-backfill.ts would produce — both
// call the same logic so tags never drift from the backfill script's definition.

import type { ArtifactZone } from '@c-suite/shared-types/vault-schemas';

/**
 * Returns the sorted set of structural tags for an artifact.
 *
 * @param zone    - Vault zone (e.g. 'position', 'decision', 'workstream', …)
 * @param baseTag - The primary type tag, e.g. 'type/position'.
 * @param fm      - Parsed frontmatter object.
 */
export function deriveTags(
  zone: ArtifactZone,
  baseTag: string,
  fm: Record<string, unknown>,
): string[] {
  const tags = new Set<string>([baseTag]);

  switch (zone) {
    case 'position': {
      const status = String(fm.status ?? '').toLowerCase();
      if (status) tags.add(`status/${status}`);
      const conf = Number(fm.confidence);
      if (Number.isFinite(conf)) {
        if (conf >= 80) tags.add('confidence/high');
        else if (conf >= 60) tags.add('confidence/mid');
        else tags.add('confidence/low');
      }
      break;
    }
    case 'decision': {
      const state = String(fm.state ?? '');
      if (/RATIFIED/i.test(state)) tags.add('state/ratified');
      else if (/DECIDED/i.test(state)) tags.add('state/decided');
      else if (/IN-DELIBERATION/i.test(state)) tags.add('state/in-deliberation');
      else if (/DRAFT/i.test(state)) tags.add('state/draft');
      const rev = String(fm.reversibility ?? '');
      if (/one-way/i.test(rev)) tags.add('reversibility/one-way');
      else if (/two-way/i.test(rev)) tags.add('reversibility/two-way');
      break;
    }
    case 'workstream': {
      const status = String(fm.status ?? '').toUpperCase();
      if (['RED', 'YELLOW', 'GREEN'].includes(status)) {
        tags.add(`health/${status.toLowerCase()}`);
      }
      const phase = String(fm.phase ?? '').toLowerCase();
      if (phase) tags.add(`phase/${phase.replace(/[\s_]+/g, '-')}`);
      break;
    }
    case 'pre-mortem': {
      const impact = String(fm.impact ?? '').toLowerCase();
      if (impact) tags.add(`impact/${impact}`);
      const prob = Number(fm.probability);
      if (Number.isFinite(prob)) {
        if (prob >= 50) tags.add('probability/high');
        else if (prob >= 25) tags.add('probability/mid');
        else tags.add('probability/low');
      }
      break;
    }
    case 'prediction': {
      const status = String(fm.status ?? '').toLowerCase();
      if (status) tags.add(`status/${status}`);
      const conf = Number(fm.confidence);
      if (Number.isFinite(conf)) {
        if (conf >= 80) tags.add('confidence/high');
        else if (conf >= 60) tags.add('confidence/mid');
        else tags.add('confidence/low');
      }
      break;
    }
    case 'tripwire': {
      const category = String(fm.category ?? '').toLowerCase();
      if (category) tags.add(`category/${category}`);
      break;
    }
    default:
      break;
  }

  return Array.from(tags).sort();
}
