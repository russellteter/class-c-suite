// packages/writeback-engine/src/templates/workstreamAdvance.ts
// Source: docs/decisions/0008-write-backs-and-iterative-feedback.md §2.4 + VAULT_GUIDE §3
// Renders markdown for a workstream artifact (snake_case frontmatter convention).

import * as yaml from 'js-yaml';

export interface WorkstreamFrontmatter {
  id: string;
  title: string;
  status: string;                    // RED | YELLOW | GREEN
  phase: string;
  depends_on?: string[];
  linked_workstreams?: string[];
  related?: string[];
  tags?: string[];
  [key: string]: unknown;
}

export function renderWorkstreamAdvance(fm: WorkstreamFrontmatter, body: string): string {
  let fmText: string;
  try {
    fmText = yaml.dump(fm, { lineWidth: 120, quotingType: '"', forceQuotes: false });
    yaml.load(fmText);
  } catch {
    fmText = yaml.dump(fm, { lineWidth: 120, quotingType: '"', forceQuotes: true });
  }
  return `---\n${fmText.trimEnd()}\n---\n\n${body.trimStart()}`;
}
