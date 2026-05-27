// packages/writeback-engine/src/templates/prediction.ts
// Source: docs/decisions/0008-write-backs-and-iterative-feedback.md §2.4 + VAULT_GUIDE §3
// Renders markdown for a prediction artifact (snake_case frontmatter convention).

import * as yaml from 'js-yaml';

export interface PredictionFrontmatter {
  id: string;
  title: string;
  status: string;
  confidence: number;
  probability?: number;
  linked_workstreams?: string[];
  related_predictions?: string[];
  related?: string[];
  tags?: string[];
  [key: string]: unknown;
}

export function renderPrediction(fm: PredictionFrontmatter, body: string): string {
  let fmText: string;
  try {
    fmText = yaml.dump(fm, { lineWidth: 120, quotingType: '"', forceQuotes: false });
    yaml.load(fmText);
  } catch {
    fmText = yaml.dump(fm, { lineWidth: 120, quotingType: '"', forceQuotes: true });
  }
  return `---\n${fmText.trimEnd()}\n---\n\n${body.trimStart()}`;
}
