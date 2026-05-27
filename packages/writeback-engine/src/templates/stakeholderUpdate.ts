// packages/writeback-engine/src/templates/stakeholderUpdate.ts
// Source: docs/decisions/0008-write-backs-and-iterative-feedback.md §2.4 + VAULT_GUIDE §3
// Renders markdown for a stakeholder artifact (kebab-case frontmatter convention).

import * as yaml from 'js-yaml';

export interface StakeholderFrontmatter {
  id: string;
  name: string;
  role?: string;
  relationship?: string;
  related?: string[];
  tags?: string[];
  [key: string]: unknown;
}

export function renderStakeholderUpdate(fm: StakeholderFrontmatter, body: string): string {
  let fmText: string;
  try {
    fmText = yaml.dump(fm, { lineWidth: 120, quotingType: '"', forceQuotes: false });
    yaml.load(fmText);
  } catch {
    fmText = yaml.dump(fm, { lineWidth: 120, quotingType: '"', forceQuotes: true });
  }
  return `---\n${fmText.trimEnd()}\n---\n\n${body.trimStart()}`;
}
