#!/usr/bin/env node
// scripts/vault-wikilink-backfill.ts
// UNIT-8 / B25-adjacent polish 2026-05-27.
//
// Walks every artifact directory in the vault and adds a `related:` frontmatter
// field whose values are Obsidian-style wikilinks to the files that the artifact
// already references by ID in pre-existing arrays (related-positions,
// decision-this-supports, supersedes, etc.). The field is ADDITIVE — existing
// ID arrays are preserved.
//
// All modifications go through SafeWrite so each backfill produces an atomic
// write + git commit in the vault.
//
// Usage:
//   pnpm tsx scripts/vault-wikilink-backfill.ts [--dry-run] [--vault <path>]
//
// Default vault path: $VAULT_PATH or ~/Documents/Claude/Projects/Business Planning.

import * as fs from 'fs/promises';
import * as path from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml';
import { safeWrite } from '../packages/vault-writer/src/safeWrite.js';
import type { ArtifactZone } from '../packages/shared-types/src/vault-schemas.js';

const VAULT =
  process.env.VAULT_PATH ??
  path.join(homedir(), 'Documents', 'Claude', 'Projects', 'Business Planning');

const DRY_RUN = process.argv.includes('--dry-run');

// Target directories — every file inside these is processed if it has YAML frontmatter.
const TARGET_DIRS: Array<{ rel: string; zone: ArtifactZone }> = [
  { rel: 'positions/active', zone: 'position' },
  { rel: 'positions/superseded', zone: 'position' },
  { rel: 'decisions', zone: 'decision' },
  { rel: 'workstreams', zone: 'workstream' },
  { rel: 'pre-mortems', zone: 'pre-mortem' },
  { rel: 'stakeholders/people', zone: 'stakeholder_person' },
  { rel: 'stakeholders/persons', zone: 'stakeholder_person' },
  { rel: 'stakeholders/accounts', zone: 'stakeholder_account' },
  { rel: 'stakeholders/orgs', zone: 'stakeholder_account' },
  { rel: 'stakeholders', zone: 'stakeholder_person' },
  { rel: 'calibration/predictions', zone: 'prediction' },
  { rel: 'adversarial/competitor-watch', zone: 'competitor' },
  { rel: 'adversarial/financial-tripwires', zone: 'tripwire' },
];

// Frontmatter keys whose values may be ID strings or arrays of IDs.
const ID_REF_FIELDS = [
  'related-positions',
  'related-decisions',
  'related-workstreams',
  'related-stakeholders',
  'related-pre-mortems',
  'related_pre_mortems',
  'related_predictions',
  'depends-on',
  'depended-on-by',
  'supersedes',
  'superseded-by',
  'blocks',
  'blocked-by',
  'parent_position',
  'decision-this-supports',
  'decisions-this-supports',
  'predictions-spawned',
  'pre_mortems',
  'covered-by',
  'covers',
];

// Map ID prefix → directory glob to search.
const PREFIX_DIRS: Record<string, string[]> = {
  POS: ['positions/active', 'positions/superseded'],
  DEC: ['decisions'],
  WS:  ['workstreams'],
  PM:  ['pre-mortems'],
  PRED: ['calibration/predictions'],
  STK: ['stakeholders/people', 'stakeholders/persons', 'stakeholders/orgs', 'stakeholders/accounts', 'stakeholders'],
  PER: ['stakeholders/people', 'stakeholders/persons', 'stakeholders'],
  ACC: ['stakeholders/accounts', 'stakeholders/orgs'],
  ORG: ['stakeholders/orgs', 'stakeholders/accounts'],
  COMP: ['adversarial/competitor-watch'],
  TRIP: ['adversarial/financial-tripwires'],
  TW:   ['adversarial/financial-tripwires'],
};

interface Stats {
  scanned: number;
  modified: number;
  skipped_no_frontmatter: number;
  skipped_no_id_refs: number;
  skipped_already_related: number;
  unresolved_ids: Map<string, string[]>;
  errors: Array<{ path: string; err: string }>;
}

const stats: Stats = {
  scanned: 0,
  modified: 0,
  skipped_no_frontmatter: 0,
  skipped_no_id_refs: 0,
  skipped_already_related: 0,
  unresolved_ids: new Map(),
  errors: [],
};

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;

/** Returns the frontmatter block as a string + the body, or null if missing. */
function splitFrontmatter(content: string): { fm: string; body: string } | null {
  const m = content.match(FRONTMATTER_RE);
  if (!m) return null;
  return { fm: m[1], body: content.slice(m[0].length) };
}

/** Walk fmObj recursively, collecting any string that matches an ID pattern. */
function collectIds(fmObj: Record<string, unknown>): string[] {
  const ids = new Set<string>();
  for (const key of ID_REF_FIELDS) {
    const v = fmObj[key];
    if (typeof v === 'string') {
      pushIfId(v, ids);
    } else if (Array.isArray(v)) {
      for (const item of v) {
        if (typeof item === 'string') pushIfId(item, ids);
      }
    }
  }
  return Array.from(ids);
}

function pushIfId(s: string, ids: Set<string>): void {
  const trimmed = s.trim();
  if (!trimmed || trimmed === 'null' || trimmed === '~') return;
  // Match a known ID prefix at the start, e.g. POS-003 or PRED-001 (with optional suffix).
  if (/^(POS|DEC|WS|PM|PRED|STK|PER|ACC|ORG|COMP|TRIP|TW)-[A-Za-z0-9-]+/.test(trimmed)) {
    // Strip a trailing wikilink wrapper if user already partially wikilinked.
    const cleaned = trimmed.replace(/^\[\[(.*)\]\]$/, '$1');
    ids.add(cleaned);
  }
}

/** Resolve an ID to its on-disk filename (basename without .md), or null. */
async function resolveId(id: string): Promise<string | null> {
  const prefix = id.split('-')[0]!;
  const dirs = PREFIX_DIRS[prefix];
  if (!dirs) return null;

  for (const d of dirs) {
    const full = path.join(VAULT, d);
    let entries: string[];
    try {
      entries = await fs.readdir(full);
    } catch {
      continue;
    }
    // Match files starting with the ID followed by - or .md
    const match = entries.find(
      (f) => (f.startsWith(`${id}-`) || f === `${id}.md`) && f.endsWith('.md'),
    );
    if (match) return match.replace(/\.md$/, '');
  }
  return null;
}

/** Replace or insert the `related:` field in a frontmatter string. Preserves
 *  all other lines verbatim.
 */
function setRelatedField(fmText: string, wikilinks: string[]): string {
  const lines = fmText.split('\n');
  const relatedLine = `related: [${wikilinks.map((w) => `"[[${w}]]"`).join(', ')}]`;

  // If existing top-level `related:` exists, replace its line (and any block-style continuation).
  // Matches both inline (`related: [...]`) and block-style (`related:` followed by `- "..."` lines).
  const idx = lines.findIndex((l) => /^related:(\s|$)/.test(l));
  if (idx === -1) {
    // Append to end (preserving trailing blank or not).
    return lines.concat(relatedLine).join('\n');
  }

  // Single-line replacement: keep position, swap content.
  const out = [...lines];
  out[idx] = relatedLine;
  // If the existing related was a multi-line block (`related:\n  - "[[…]]"`),
  // strip continuation lines that begin with `  - `.
  let j = idx + 1;
  while (j < out.length && /^\s*-\s/.test(out[j]!)) {
    out.splice(j, 1);
  }
  return out.join('\n');
}

async function processFile(filePath: string, zone: ArtifactZone): Promise<void> {
  stats.scanned++;
  let content: string;
  try {
    content = await fs.readFile(filePath, 'utf8');
  } catch (err) {
    stats.errors.push({ path: filePath, err: `read failed: ${(err as Error).message}` });
    return;
  }

  const split = splitFrontmatter(content);
  if (!split) {
    stats.skipped_no_frontmatter++;
    return;
  }

  let fmObj: Record<string, unknown>;
  try {
    fmObj = (yaml.load(split.fm) ?? {}) as Record<string, unknown>;
  } catch (err) {
    stats.errors.push({ path: filePath, err: `yaml parse: ${(err as Error).message}` });
    return;
  }

  const ids = collectIds(fmObj);
  if (ids.length === 0) {
    stats.skipped_no_id_refs++;
    return;
  }

  const resolved: string[] = [];
  const unresolved: string[] = [];
  for (const id of ids) {
    const fname = await resolveId(id);
    if (fname) {
      if (!resolved.includes(fname)) resolved.push(fname);
    } else {
      unresolved.push(id);
    }
  }

  if (unresolved.length > 0) {
    stats.unresolved_ids.set(filePath, unresolved);
  }
  if (resolved.length === 0) {
    stats.skipped_no_id_refs++;
    return;
  }

  // If the file already has the exact same `related: [...]` list, skip.
  const existingRelated = fmObj['related'];
  if (Array.isArray(existingRelated)) {
    const existingStrs = existingRelated
      .filter((v): v is string => typeof v === 'string')
      .map((v) => v.replace(/^\[\[(.*)\]\]$/, '$1'));
    const same =
      existingStrs.length === resolved.length &&
      existingStrs.every((v, i) => v === resolved[i]);
    if (same) {
      stats.skipped_already_related++;
      return;
    }
  }

  const newFm = setRelatedField(split.fm, resolved);
  const newContent = `---\n${newFm}\n---\n${split.body}`;

  if (DRY_RUN) {
    stats.modified++;
    console.log(`[dry-run] ${path.relative(VAULT, filePath)} — ${resolved.length} wikilinks`);
    return;
  }

  try {
    const result = await safeWrite(filePath, newContent, {
      agent: 'VaultBackfill',
      runId: `wikilink-backfill-${new Date().toISOString().replace(/[:.]/g, '-')}`,
      playbook: 'vault_wikilink_backfill',
      commitVault: true,
      zone,
    });
    if (result.result !== 'ok') {
      stats.errors.push({ path: filePath, err: `safeWrite returned ${result.result}` });
      return;
    }
    stats.modified++;
  } catch (err) {
    stats.errors.push({ path: filePath, err: (err as Error).message });
  }
}

async function processDir(rel: string, zone: ArtifactZone): Promise<void> {
  const full = path.join(VAULT, rel);
  let entries: string[];
  try {
    entries = await fs.readdir(full);
  } catch {
    return; // dir may not exist in this vault (e.g. positions/superseded)
  }
  for (const entry of entries) {
    if (!entry.endsWith('.md')) continue;
    if (entry === 'INDEX.md' || entry === 'README.md' || entry.startsWith('DASHBOARD')) continue;
    const fp = path.join(full, entry);
    const st = await fs.stat(fp).catch(() => null);
    if (!st || !st.isFile()) continue;
    await processFile(fp, zone);
  }
}

async function main(): Promise<void> {
  console.log(`vault-wikilink-backfill starting (vault=${VAULT}, dry-run=${DRY_RUN})`);

  for (const d of TARGET_DIRS) {
    await processDir(d.rel, d.zone);
  }

  console.log('\n── Results ──');
  console.log(`scanned:                  ${stats.scanned}`);
  console.log(`modified:                 ${stats.modified}`);
  console.log(`skipped_no_frontmatter:   ${stats.skipped_no_frontmatter}`);
  console.log(`skipped_no_id_refs:       ${stats.skipped_no_id_refs}`);
  console.log(`skipped_already_related:  ${stats.skipped_already_related}`);
  console.log(`errors:                   ${stats.errors.length}`);

  if (stats.unresolved_ids.size > 0) {
    console.log(`\nunresolved ids in ${stats.unresolved_ids.size} files:`);
    for (const [p, ids] of stats.unresolved_ids) {
      console.log(`  ${path.relative(VAULT, p)}: ${ids.join(', ')}`);
    }
  }
  if (stats.errors.length > 0) {
    console.log('\nerrors:');
    for (const e of stats.errors) {
      console.log(`  ${path.relative(VAULT, e.path)}: ${e.err}`);
    }
    process.exit(1);
  }
}

// Run if invoked as a script.
const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] === thisFile) {
  main().catch((err) => {
    console.error('FATAL:', err);
    process.exit(1);
  });
}

// Exports for the test harness.
export {
  collectIds,
  resolveId,
  setRelatedField,
  splitFrontmatter,
  processFile,
  ID_REF_FIELDS,
  PREFIX_DIRS,
};
