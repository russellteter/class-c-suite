// packages/writeback-engine/src/templates/decision.ts
// Source: docs/decisions/0008-write-backs-and-iterative-feedback.md §2.4 + VAULT_GUIDE §3
// Renders markdown for a decision artifact (kebab-case frontmatter convention).

import * as yaml from 'js-yaml';

export interface DecisionFrontmatter {
  id: string;
  title: string;
  state: string;                     // DRAFT | IN-DELIBERATION | DECIDED | RATIFIED
  reversibility?: string;            // one-way | two-way
  'linked-positions'?: string[];
  related?: string[];
  tags?: string[];
  [key: string]: unknown;
}

export function renderDecision(fm: DecisionFrontmatter, body: string): string {
  let fmText: string;
  try {
    fmText = yaml.dump(fm, { lineWidth: 120, quotingType: '"', forceQuotes: false });
    yaml.load(fmText);
  } catch {
    fmText = yaml.dump(fm, { lineWidth: 120, quotingType: '"', forceQuotes: true });
  }
  return `---\n${fmText.trimEnd()}\n---\n\n${body.trimStart()}`;
}
