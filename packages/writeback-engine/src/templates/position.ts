// packages/writeback-engine/src/templates/position.ts
// Source: docs/decisions/0008-write-backs-and-iterative-feedback.md §2.4 + VAULT_GUIDE §3
// Renders markdown for a position artifact (kebab-case frontmatter convention).

import * as yaml from 'js-yaml';

export interface PositionFrontmatter {
  id: string;
  title: string;
  status: string;                    // e.g. "active"
  confidence: number;
  'decision-this-supports'?: string[];
  'predictions-spawned'?: string[];
  'related-positions'?: string[];
  related?: string[];
  tags?: string[];
  [key: string]: unknown;
}

/**
 * Renders the full markdown for a position artifact (frontmatter + body).
 * All values come from the caller — the drafter is responsible for merging
 * Synthesizer patches with existing values before calling this template.
 */
export function renderPosition(fm: PositionFrontmatter, body: string): string {
  // YAML quoting rule per §2.4: dump then re-parse; if it round-trips, it's safe.
  let fmText: string;
  try {
    fmText = yaml.dump(fm, { lineWidth: 120, quotingType: '"', forceQuotes: false });
    // Verify round-trip.
    yaml.load(fmText);
  } catch {
    // Force-quote all string values.
    fmText = yaml.dump(fm, { lineWidth: 120, quotingType: '"', forceQuotes: true });
  }

  return `---\n${fmText.trimEnd()}\n---\n\n${body.trimStart()}`;
}
