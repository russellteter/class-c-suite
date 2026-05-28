// apps/utility/src/agents/handoff/indexRegen.ts
// Source: docs/decisions/0011-ch9-cowork-handoff.md §3.4
// Reads all <vault>/handoffs/*.md, parses frontmatter, regenerates INDEX.md.
// Writes via SafeWrite. Idempotent.

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';
import type Database from 'better-sqlite3';
import { safeWrite } from '../../safewrite/index.js';
import { createLogger } from '../../logger.js';

const log = createLogger();

const VAULT_PATH =
  process.env.VAULT_PATH ??
  path.join(os.homedir(), 'Documents', 'Claude', 'Projects', 'Business Planning');

interface ParsedHandoffRow {
  id: string;
  originRef: string;     // DEC-N, MEM-<slug>, POS-N, or PM-N
  created: string;
  status: string;
  filename: string;      // bare filename without .md for wikilink
}

/**
 * Extract YAML frontmatter block from markdown.
 * Returns raw YAML string or null if no frontmatter found.
 */
function extractFrontmatter(content: string): string | null {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : null;
}

/**
 * Parse a single handoff .md file and extract display fields.
 */
function parseHandoffFile(filename: string, content: string): ParsedHandoffRow | null {
  const raw = extractFrontmatter(content);
  if (!raw) return null;

  let fm: Record<string, unknown>;
  try {
    fm = yaml.load(raw) as Record<string, unknown>;
  } catch {
    return null;
  }

  const id = typeof fm.id === 'string' ? fm.id : 'UNKNOWN';
  const created = typeof fm.created === 'string' ? fm.created : '';
  const status = typeof fm.status === 'string' ? fm.status : 'drafted';

  // Derive originRef from the first present origin field
  const originRef =
    (typeof fm.decision_id === 'string' ? fm.decision_id : null) ??
    (typeof fm.memo_id === 'string' ? fm.memo_id : null) ??
    (typeof fm.position_id === 'string' ? fm.position_id : null) ??
    (typeof fm.pre_mortem_id === 'string' ? fm.pre_mortem_id : null) ??
    'UNKNOWN';

  // Filename without .md for wikilink
  const base = filename.replace(/\.md$/, '');

  return { id, originRef, created, status, filename: base };
}

/**
 * Regenerate <vault>/handoffs/INDEX.md from all *.md files in the handoffs directory.
 * Idempotent: result is deterministic for a given set of handoff files.
 * Sorted by created date descending.
 */
export async function regenerateHandoffIndex(
  _db: Database.Database,
  vaultPath: string = VAULT_PATH,
): Promise<void> {
  const handoffsDir = path.join(vaultPath, 'handoffs');
  const indexPath = path.join(handoffsDir, 'INDEX.md');

  let files: string[];
  try {
    const all = await fs.readdir(handoffsDir);
    files = all.filter(f => f.endsWith('.md') && f !== 'INDEX.md');
  } catch {
    // Directory doesn't exist yet — write an empty index
    files = [];
  }

  const rows: ParsedHandoffRow[] = [];
  for (const filename of files) {
    try {
      const content = await fs.readFile(path.join(handoffsDir, filename), 'utf8');
      const row = parseHandoffFile(filename, content);
      if (row) rows.push(row);
    } catch {
      // Skip unreadable files
    }
  }

  // Sort by created date descending
  rows.sort((a, b) => b.created.localeCompare(a.created));

  // Generate the table
  const tableRows = rows.map(r =>
    `| ${r.id} | ${r.originRef} | ${r.created} | ${r.status} | [[${r.filename}]] |`
  );

  const indexContent = [
    '## Active handoffs',
    '',
    '| ID | Origin | Created | Status | Brief |',
    '|---|---|---|---|---|',
    ...tableRows,
    '',
  ].join('\n');

  const result = await safeWrite({
    absPath: indexPath,
    content: indexContent,
    agent: 'handoff-index-regen',
    playbook: 'handoff',
    runId: 'index-regen',
  });

  if (result.ok) {
    log.info({ message: 'handoff INDEX regenerated', rowCount: rows.length });
  } else {
    log.warn({ message: 'handoff INDEX write conflict', indexPath });
  }
}
