// packages/writeback-engine/src/resolveWikilinks.ts
// Pure function extracted from scripts/vault-wikilink-backfill.ts.
// Source: docs/decisions/0008-write-backs-and-iterative-feedback.md §2.4
// Resolves an array of artifact IDs (POS-NNN, DEC-NNN, etc.) to canonical
// full-filename wikilinks for the `related:` frontmatter array.

import * as fs from 'fs/promises';
import * as path from 'path';

// Map ID prefix → directories to search (relative to vaultRoot).
const PREFIX_DIRS: Record<string, string[]> = {
  POS:  ['positions/active', 'positions/superseded'],
  DEC:  ['decisions'],
  WS:   ['workstreams'],
  PM:   ['pre-mortems'],
  PRED: ['calibration/predictions', 'calibration/resolved'],
  STK:  ['stakeholders/people', 'stakeholders/persons', 'stakeholders/orgs', 'stakeholders/accounts', 'stakeholders'],
  PER:  ['stakeholders/people', 'stakeholders/persons', 'stakeholders'],
  ACC:  ['stakeholders/accounts', 'stakeholders/orgs'],
  ORG:  ['stakeholders/orgs', 'stakeholders/accounts'],
  COMP: ['adversarial/competitor-watch'],
  TRIP: ['adversarial/financial-tripwires'],
  TW:   ['adversarial/financial-tripwires'],
};

/**
 * Resolve one ID to its on-disk filename (without .md), or null if not found.
 */
async function resolveId(id: string, vaultRoot: string): Promise<string | null> {
  const prefix = id.split('-')[0] ?? '';
  const dirs = PREFIX_DIRS[prefix];
  if (!dirs) return null;

  for (const d of dirs) {
    const full = path.join(vaultRoot, d);
    let entries: string[];
    try {
      entries = await fs.readdir(full);
    } catch {
      continue;
    }
    const match = entries.find(
      (f) => (f.startsWith(`${id}-`) || f === `${id}.md`) && f.endsWith('.md'),
    );
    if (match) return match.replace(/\.md$/, '');
  }
  return null;
}

/**
 * Takes an array of artifact IDs and returns the canonical full-filename
 * wikilink strings for use in the `related:` frontmatter field.
 * Unresolvable IDs are silently skipped.
 *
 * @param idArray   - Array of IDs like ['POS-003', 'DEC-008']
 * @param vaultRoot - Absolute path to the vault root directory
 * @returns Array of wikilink strings like ['[[POS-003-full-title]]']
 */
export async function resolveWikilinks(
  idArray: string[],
  vaultRoot: string,
): Promise<string[]> {
  const resolved: string[] = [];
  for (const id of idArray) {
    const filename = await resolveId(id.trim(), vaultRoot);
    if (filename) {
      resolved.push(`[[${filename}]]`);
    }
  }
  return resolved;
}
