// packages/writeback-engine/src/templates/preMortemUpdate.ts
// Source: docs/decisions/0008-write-backs-and-iterative-feedback.md §2.4 + VAULT_GUIDE §3
// Renders markdown for a pre-mortem artifact (kebab-case frontmatter convention).

import * as yaml from 'js-yaml';

export interface PreMortemFrontmatter {
  id: string;
  title: string;
  impact: string;                    // e.g. "high"
  probability: number;               // 0-100
  'related-positions'?: string[];
  'related-workstreams'?: string[];
  related?: string[];
  tags?: string[];
  [key: string]: unknown;
}

export function renderPreMortemUpdate(fm: PreMortemFrontmatter, body: string): string {
  let fmText: string;
  try {
    fmText = yaml.dump(fm, { lineWidth: 120, quotingType: '"', forceQuotes: false });
    yaml.load(fmText);
  } catch {
    fmText = yaml.dump(fm, { lineWidth: 120, quotingType: '"', forceQuotes: true });
  }
  return `---\n${fmText.trimEnd()}\n---\n\n${body.trimStart()}`;
}
