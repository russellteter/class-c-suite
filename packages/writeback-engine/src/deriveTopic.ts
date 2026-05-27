// packages/writeback-engine/src/deriveTopic.ts
// Source: docs/decisions/0008-write-backs-and-iterative-feedback.md §10.1
// Priority:
//   1. linked-workstreams[0] or linked_workstreams[0] frontmatter title from vault
//   2. Playbook-derived label
//   3. "General"

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';

const PLAYBOOK_TOPIC_MAP: Record<string, string> = {
  cash_lever: 'Cash',
  weekly_cash_forecast: 'Cash',
  gtm_realloc: 'GTM',
  gtm_reallocation: 'GTM',
  strategic_option: 'Strategy',
  board_narrative: 'Board',
  quick_read: 'Quick',
  pre_mortem: 'Adversarial',
  stakeholder_1_1: 'Stakeholder',
  restructure_decision: 'Strategy',
  open_qa: 'Ad-hoc',
};

/**
 * Derives the topic pill label for a writeback proposal.
 *
 * @param frontmatter - The proposed artifact's frontmatter object
 * @param playbook    - The originating playbook ID
 * @param vaultRoot   - Vault root path for workstream title lookup
 */
export async function deriveTopic(
  frontmatter: Record<string, unknown>,
  playbook: string,
  vaultRoot: string,
): Promise<string> {
  // Priority 1: linked-workstreams or linked_workstreams frontmatter field.
  const linkedWs = (
    (frontmatter['linked-workstreams'] ?? frontmatter['linked_workstreams']) as
      string | string[] | undefined
  );
  const firstWsId = Array.isArray(linkedWs)
    ? linkedWs[0]
    : typeof linkedWs === 'string' ? linkedWs : undefined;

  if (firstWsId && typeof firstWsId === 'string') {
    const title = await resolveWorkstreamTitle(firstWsId.trim(), vaultRoot);
    if (title) return title;
  }

  // Priority 2: playbook map.
  const normalizedPlaybook = playbook.replace(/-/g, '_').toLowerCase();
  const mapped = PLAYBOOK_TOPIC_MAP[normalizedPlaybook];
  if (mapped) return mapped;

  // Priority 3: fallback.
  return 'General';
}

async function resolveWorkstreamTitle(wsId: string, vaultRoot: string): Promise<string | null> {
  const wsDir = path.join(vaultRoot, 'workstreams');
  let entries: string[];
  try {
    entries = await fs.readdir(wsDir);
  } catch {
    return null;
  }

  const match = entries.find(
    (f) => (f.startsWith(`${wsId}-`) || f === `${wsId}.md`) && f.endsWith('.md'),
  );
  if (!match) return null;

  try {
    const content = await fs.readFile(path.join(wsDir, match), 'utf8');
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return null;
    const fm = yaml.load(fmMatch[1]) as Record<string, unknown>;
    const title = fm['title'] ?? fm['name'];
    if (typeof title === 'string' && title.trim()) return title.trim();
  } catch {
    // ignore
  }
  return null;
}
