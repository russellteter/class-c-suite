#!/usr/bin/env node
// scripts/vault-inbody-link-fixup.ts
// Side-project VAULT-1 polish 2026-05-27.
//
// Scans the BODY of every vault file (skipping YAML frontmatter + fenced code
// blocks + existing wikilinks) for bare ID references like POS-003, DEC-008,
// PM-001, WS-12, PRED-005, TW-FIN-001 and converts them to aliased Obsidian
// wikilinks of the form [[POS-003-w30-resolves-with-ar-ap-baca|POS-003]].
//
// Why aliased: preserves the human-readable short ID in prose while wiring
// Obsidian's backlink + graph engine to the canonical file. This is the
// single biggest improvement to the vault's graph view.
//
// Modifications use SafeWrite so each file lands as one atomic vault git commit.

import * as fs from 'fs/promises';
import * as path from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import { safeWrite } from '../packages/vault-writer/src/safeWrite.js';
import type { ArtifactZone } from '../packages/shared-types/src/vault-schemas.js';

const VAULT =
  process.env.VAULT_PATH ??
  path.join(homedir(), 'Documents', 'Claude', 'Projects', 'Business Planning');

const DRY_RUN = process.argv.includes('--dry-run');

// ── ID schema ────────────────────────────────────────────────────────────────
// Matches POS-003, DEC-008, PM-001, WS-12, PRED-005, TW-FIN-001 etc.
// Excludes IDs immediately preceded by `[[` (already linked) or `|` (alias
// segment of an existing wikilink) or word chars (so DEC-031-holly-… inside
// other patterns doesn't double-count).
const ID_TOKEN = /\b(POS|DEC|WS|PM|PRED|TW(?:-[A-Z]+)?)-(\d{2,3}[A-Za-z0-9-]*)\b/g;

// Map ID prefix → directories to glob for filename resolution.
const PREFIX_DIRS: Record<string, string[]> = {
  POS:    ['positions/active', 'positions/superseded'],
  DEC:    ['decisions'],
  WS:     ['workstreams'],
  PM:     ['pre-mortems'],
  PRED:   ['calibration/predictions', 'calibration/resolved'],
  TW:     ['adversarial/financial-tripwires'],
  'TW-FIN': ['adversarial/financial-tripwires'],
};

// Directories to scan for fixing in-body links (file paths inside these are eligible writes).
const TARGET_DIRS: Array<{ rel: string; zone: ArtifactZone }> = [
  { rel: 'positions/active', zone: 'position' },
  { rel: 'positions/superseded', zone: 'position' },
  { rel: 'decisions', zone: 'decision' },
  { rel: 'workstreams', zone: 'workstream' },
  { rel: 'pre-mortems', zone: 'pre-mortem' },
  { rel: 'stakeholders/customers-top-arr', zone: 'stakeholder_account' },
  { rel: 'stakeholders/internal-dependencies', zone: 'stakeholder_person' },
  { rel: 'stakeholders/internal-exec-board', zone: 'stakeholder_person' },
  { rel: 'calibration/predictions', zone: 'prediction' },
  { rel: 'calibration/resolved', zone: 'prediction' },
  { rel: 'adversarial/competitor-watch', zone: 'competitor' },
  { rel: 'adversarial/financial-tripwires', zone: 'tripwire' },
  { rel: 'investigations', zone: 'investigation' as ArtifactZone },
  { rel: 'deliverables', zone: 'memo' },
];

interface Stats {
  scanned: number;
  modified: number;
  links_inserted: number;
  files_with_changes: string[];
  unresolved: Map<string, string[]>;
  errors: Array<{ path: string; err: string }>;
}
const stats: Stats = {
  scanned: 0,
  modified: 0,
  links_inserted: 0,
  files_with_changes: [],
  unresolved: new Map(),
  errors: [],
};

// ── ID resolution cache ──────────────────────────────────────────────────────
const idCache = new Map<string, string | null>();

async function resolveId(id: string): Promise<string | null> {
  if (idCache.has(id)) return idCache.get(id)!;
  // Decide prefix dirs from the leading prefix segment.
  const prefixMatch = id.match(/^(TW-FIN|POS|DEC|WS|PM|PRED|TW)/);
  if (!prefixMatch) {
    idCache.set(id, null);
    return null;
  }
  const dirs = PREFIX_DIRS[prefixMatch[1]];
  if (!dirs) {
    idCache.set(id, null);
    return null;
  }
  for (const d of dirs) {
    const full = path.join(VAULT, d);
    let entries: string[];
    try {
      entries = await fs.readdir(full);
    } catch {
      continue;
    }
    const match = entries.find(
      (f) => (f.startsWith(`${id}-`) || f === `${id}.md`) && f.endsWith('.md'),
    );
    if (match) {
      const base = match.replace(/\.md$/, '');
      idCache.set(id, base);
      return base;
    }
  }
  idCache.set(id, null);
  return null;
}

// ── Body-text rewriting ─────────────────────────────────────────────────────

interface BodyRegion {
  text: string;
  isCode: boolean;       // fenced code or indented code block
  isYaml: boolean;       // frontmatter block
  isHeading: boolean;    // markdown heading line (don't touch — IDs often appear in titles)
}

function partitionFile(content: string): BodyRegion[] {
  const out: BodyRegion[] = [];
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n?/);
  let cursor = 0;
  if (fmMatch) {
    out.push({ text: fmMatch[0], isCode: false, isYaml: true, isHeading: false });
    cursor = fmMatch[0].length;
  }
  // Walk by line; toggle inCode on fences.
  let inFence = false;
  let buffer = '';
  let bufferIsCode = false;
  let bufferIsHeading = false;
  const lines = content.slice(cursor).split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const isFence = /^(\s*)```/.test(line);
    const isHeading = /^#{1,6}\s/.test(line);
    if (isFence) {
      // flush current buffer
      if (buffer.length > 0 || i > 0) {
        out.push({ text: buffer, isCode: bufferIsCode, isYaml: false, isHeading: bufferIsHeading });
        buffer = '';
        bufferIsHeading = false;
      }
      // include the fence line in a code region (so we leave it untouched)
      out.push({ text: line + (i === lines.length - 1 ? '' : '\n'), isCode: true, isYaml: false, isHeading: false });
      inFence = !inFence;
      bufferIsCode = inFence;
      continue;
    }
    // Heading lines flushed as separate non-touch regions.
    if (isHeading && !inFence) {
      if (buffer.length > 0) {
        out.push({ text: buffer, isCode: bufferIsCode, isYaml: false, isHeading: bufferIsHeading });
        buffer = '';
      }
      out.push({ text: line + (i === lines.length - 1 ? '' : '\n'), isCode: false, isYaml: false, isHeading: true });
      continue;
    }
    buffer += line + (i === lines.length - 1 ? '' : '\n');
    bufferIsCode = inFence;
  }
  if (buffer.length > 0) {
    out.push({ text: buffer, isCode: bufferIsCode, isYaml: false, isHeading: false });
  }
  return out;
}

/** Replace bare IDs in text with [[full-name|ID]] aliased wikilinks.
 *  Skip IDs already inside [[ ... ]].
 *  Returns the new text + how many replacements were made.
 */
async function rewriteRegion(text: string): Promise<{ text: string; replacements: number; unresolved: string[] }> {
  let replacements = 0;
  const unresolved: string[] = [];

  // Precompute matches first so we can skip those inside existing wikilinks.
  const wikilinkRanges: Array<[number, number]> = [];
  const linkRe = /\[\[[^\]]+\]\]/g;
  let lm: RegExpExecArray | null;
  while ((lm = linkRe.exec(text)) !== null) {
    wikilinkRanges.push([lm.index, lm.index + lm[0].length]);
  }
  function inWikilink(idx: number): boolean {
    return wikilinkRanges.some(([a, b]) => idx >= a && idx < b);
  }

  // Collect candidate matches.
  const matches: Array<{ start: number; end: number; id: string }> = [];
  let m: RegExpExecArray | null;
  ID_TOKEN.lastIndex = 0;
  while ((m = ID_TOKEN.exec(text)) !== null) {
    if (inWikilink(m.index)) continue;
    matches.push({ start: m.index, end: m.index + m[0].length, id: m[0] });
  }

  // Apply replacements in reverse order to preserve indices.
  for (let i = matches.length - 1; i >= 0; i--) {
    const { start, end, id } = matches[i]!;
    const target = await resolveId(id);
    if (!target) {
      unresolved.push(id);
      continue;
    }
    const replacement = `[[${target}|${id}]]`;
    text = text.slice(0, start) + replacement + text.slice(end);
    replacements++;
  }

  return { text, replacements, unresolved };
}

async function processFile(filePath: string, zone: ArtifactZone): Promise<void> {
  stats.scanned++;
  let content: string;
  try {
    content = await fs.readFile(filePath, 'utf8');
  } catch (err) {
    stats.errors.push({ path: filePath, err: (err as Error).message });
    return;
  }

  const regions = partitionFile(content);
  let totalReplacements = 0;
  const fileUnresolved = new Set<string>();
  const newParts: string[] = [];

  for (const r of regions) {
    if (r.isCode || r.isYaml || r.isHeading) {
      newParts.push(r.text);
      continue;
    }
    const { text, replacements, unresolved } = await rewriteRegion(r.text);
    newParts.push(text);
    totalReplacements += replacements;
    for (const u of unresolved) fileUnresolved.add(u);
  }

  if (totalReplacements === 0) {
    if (fileUnresolved.size > 0) {
      stats.unresolved.set(filePath, Array.from(fileUnresolved));
    }
    return;
  }

  const newContent = newParts.join('');

  if (DRY_RUN) {
    stats.modified++;
    stats.links_inserted += totalReplacements;
    stats.files_with_changes.push(`${path.relative(VAULT, filePath)} (+${totalReplacements})`);
    if (fileUnresolved.size > 0) {
      stats.unresolved.set(filePath, Array.from(fileUnresolved));
    }
    return;
  }

  try {
    const result = await safeWrite(filePath, newContent, {
      agent: 'VaultInBodyLinkFix',
      runId: `inbody-fix-${new Date().toISOString().replace(/[:.]/g, '-')}`,
      playbook: 'vault_inbody_link_fixup',
      commitVault: true,
      zone,
    });
    if (result.result !== 'ok') {
      stats.errors.push({ path: filePath, err: `safeWrite returned ${result.result}` });
      return;
    }
    stats.modified++;
    stats.links_inserted += totalReplacements;
    stats.files_with_changes.push(`${path.relative(VAULT, filePath)} (+${totalReplacements})`);
    if (fileUnresolved.size > 0) {
      stats.unresolved.set(filePath, Array.from(fileUnresolved));
    }
  } catch (err) {
    stats.errors.push({ path: filePath, err: (err as Error).message });
  }
}

async function processDir(rel: string, zone: ArtifactZone): Promise<void> {
  const full = path.join(VAULT, rel);
  let entries: string[];
  try {
    entries = await fs.readdir(full, { withFileTypes: true } as never) as unknown as Array<{ name: string; isDirectory: () => boolean; isFile: () => boolean }>;
  } catch {
    return;
  }
  for (const entry of entries as unknown as Array<{ name: string; isDirectory: () => boolean; isFile: () => boolean }>) {
    const e = entry as unknown as { name: string; isDirectory: () => boolean; isFile: () => boolean };
    if (e.isDirectory()) {
      // Don't recurse — caller spec'd specific directories.
      continue;
    }
    if (!e.name.endsWith('.md')) continue;
    if (e.name === 'INDEX.md' || e.name === 'DASHBOARD.md' || e.name.startsWith('DASHBOARD')) continue;
    await processFile(path.join(full, e.name), zone);
  }
}

async function main(): Promise<void> {
  console.log(`vault-inbody-link-fixup starting (vault=${VAULT}, dry-run=${DRY_RUN})`);
  for (const d of TARGET_DIRS) {
    await processDir(d.rel, d.zone);
  }

  console.log('\n── Results ──');
  console.log(`scanned:           ${stats.scanned}`);
  console.log(`modified:          ${stats.modified}`);
  console.log(`links_inserted:    ${stats.links_inserted}`);
  console.log(`errors:            ${stats.errors.length}`);

  if (stats.files_with_changes.length > 0) {
    console.log('\nfiles with changes (top 30):');
    for (const f of stats.files_with_changes.slice(0, 30)) {
      console.log(`  ${f}`);
    }
    if (stats.files_with_changes.length > 30) {
      console.log(`  ... and ${stats.files_with_changes.length - 30} more`);
    }
  }
  if (stats.unresolved.size > 0) {
    const allUnresolved = new Set<string>();
    for (const arr of stats.unresolved.values()) {
      for (const id of arr) allUnresolved.add(id);
    }
    console.log(`\nunique unresolved IDs (${allUnresolved.size}):`);
    console.log(`  ${Array.from(allUnresolved).sort().join(', ')}`);
  }
  if (stats.errors.length > 0) {
    console.log('\nerrors:');
    for (const e of stats.errors) {
      console.log(`  ${path.relative(VAULT, e.path)}: ${e.err}`);
    }
    process.exit(1);
  }
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] === thisFile) {
  main().catch((err) => {
    console.error('FATAL:', err);
    process.exit(1);
  });
}

export { resolveId, rewriteRegion, partitionFile, ID_TOKEN, PREFIX_DIRS };
