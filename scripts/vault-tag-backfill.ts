#!/usr/bin/env node
// scripts/vault-tag-backfill.ts
// Side-project VAULT-4 polish 2026-05-27.
//
// Adds structural tags to artifact frontmatter so Obsidian's graph view colour-
// groups by artifact type + status, and Bases can filter on tags. Tags are
// ADDITIVE — any pre-existing tags are preserved and deduplicated.
//
// Tagging rules per artifact zone:
//   position:        [type/position, status/<status>, confidence/<bucket>]
//   decision:        [type/decision, state/<DRAFT|IN-DELIBERATION|DECIDED|RATIFIED>]
//   workstream:      [type/workstream, health/<RED|YELLOW|GREEN>, phase/<phase>]
//   pre-mortem:      [type/pre-mortem, impact/<level>, probability/<bucket>]
//   prediction:      [type/prediction, status/<status>]
//   tripwire:        [type/tripwire, category/<category>]
//   competitor:      [type/competitor]
//   stakeholder:     [type/stakeholder]

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

interface DirSpec {
  rel: string;
  zone: ArtifactZone;
  baseTag: string;
}

const TARGET_DIRS: DirSpec[] = [
  { rel: 'positions/active', zone: 'position', baseTag: 'type/position' },
  { rel: 'positions/superseded', zone: 'position', baseTag: 'type/position' },
  { rel: 'decisions', zone: 'decision', baseTag: 'type/decision' },
  { rel: 'workstreams', zone: 'workstream', baseTag: 'type/workstream' },
  { rel: 'pre-mortems', zone: 'pre-mortem', baseTag: 'type/pre-mortem' },
  { rel: 'stakeholders/customers-top-arr', zone: 'stakeholder_account', baseTag: 'type/stakeholder' },
  { rel: 'stakeholders/internal-dependencies', zone: 'stakeholder_person', baseTag: 'type/stakeholder' },
  { rel: 'stakeholders/internal-exec-board', zone: 'stakeholder_person', baseTag: 'type/stakeholder' },
  { rel: 'calibration/predictions', zone: 'prediction', baseTag: 'type/prediction' },
  { rel: 'calibration/resolved', zone: 'prediction', baseTag: 'type/prediction' },
  { rel: 'adversarial/competitor-watch', zone: 'competitor', baseTag: 'type/competitor' },
  { rel: 'adversarial/financial-tripwires', zone: 'tripwire', baseTag: 'type/tripwire' },
];

interface Stats {
  scanned: number;
  modified: number;
  skipped_no_frontmatter: number;
  skipped_no_change: number;
  errors: Array<{ path: string; err: string }>;
}
const stats: Stats = {
  scanned: 0, modified: 0, skipped_no_frontmatter: 0, skipped_no_change: 0, errors: [],
};

const FM_RE = /^---\n([\s\S]*?)\n---\n?/;

function deriveTags(zone: ArtifactZone, baseTag: string, fm: Record<string, unknown>): string[] {
  const tags = new Set<string>([baseTag]);
  switch (zone) {
    case 'position': {
      const status = String(fm.status ?? '').toLowerCase();
      if (status) tags.add(`status/${status}`);
      const conf = Number(fm.confidence);
      if (Number.isFinite(conf)) {
        if (conf >= 80) tags.add('confidence/high');
        else if (conf >= 60) tags.add('confidence/mid');
        else tags.add('confidence/low');
      }
      break;
    }
    case 'decision': {
      const state = String(fm.state ?? '');
      if (/RATIFIED/i.test(state)) tags.add('state/ratified');
      else if (/DECIDED/i.test(state)) tags.add('state/decided');
      else if (/IN-DELIBERATION/i.test(state)) tags.add('state/in-deliberation');
      else if (/DRAFT/i.test(state)) tags.add('state/draft');
      const rev = String(fm.reversibility ?? '');
      if (/one-way/i.test(rev)) tags.add('reversibility/one-way');
      else if (/two-way/i.test(rev)) tags.add('reversibility/two-way');
      break;
    }
    case 'workstream': {
      const status = String(fm.status ?? '').toUpperCase();
      if (['RED', 'YELLOW', 'GREEN'].includes(status)) {
        tags.add(`health/${status.toLowerCase()}`);
      }
      const phase = String(fm.phase ?? '').toLowerCase();
      if (phase) tags.add(`phase/${phase.replace(/[\s_]+/g, '-')}`);
      break;
    }
    case 'pre-mortem': {
      const impact = String(fm.impact ?? '').toLowerCase();
      if (impact) tags.add(`impact/${impact}`);
      const prob = Number(fm.probability);
      if (Number.isFinite(prob)) {
        if (prob >= 50) tags.add('probability/high');
        else if (prob >= 25) tags.add('probability/mid');
        else tags.add('probability/low');
      }
      break;
    }
    case 'prediction': {
      const status = String(fm.status ?? '').toLowerCase();
      if (status) tags.add(`status/${status}`);
      const conf = Number(fm.confidence);
      if (Number.isFinite(conf)) {
        if (conf >= 80) tags.add('confidence/high');
        else if (conf >= 60) tags.add('confidence/mid');
        else tags.add('confidence/low');
      }
      break;
    }
    case 'tripwire': {
      const category = String(fm.category ?? '').toLowerCase();
      if (category) tags.add(`category/${category}`);
      break;
    }
    default:
      break;
  }
  return Array.from(tags).sort();
}

/** Replace or insert tags: in frontmatter, preserving existing entries
 *  (merge + dedupe). Returns new frontmatter text. */
function applyTags(fmText: string, structuralTags: string[]): string | null {
  const lines = fmText.split('\n');

  // Extract existing tags into a Set.
  const existing = new Set<string>();
  let tagsIdx = lines.findIndex((l) => /^tags:(\s|$)/.test(l));
  if (tagsIdx !== -1) {
    const inlineMatch = lines[tagsIdx]!.match(/^tags:\s*\[(.*)\]/);
    if (inlineMatch) {
      inlineMatch[1].split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).forEach((t) => {
        if (t) existing.add(t.replace(/^#/, ''));
      });
    } else {
      // block-style: gather following `  - ...` lines
      let j = tagsIdx + 1;
      while (j < lines.length && /^\s*-\s/.test(lines[j]!)) {
        const v = lines[j]!.replace(/^\s*-\s*/, '').trim().replace(/^["']|["']$/g, '');
        if (v) existing.add(v.replace(/^#/, ''));
        j++;
      }
    }
  }

  // Merge.
  const merged = new Set<string>([...existing, ...structuralTags]);
  // If all structural tags were already present, no-op.
  const allPresent = structuralTags.every((t) => existing.has(t));
  if (allPresent && existing.size === merged.size) {
    return null; // no change needed
  }

  const sorted = Array.from(merged).sort();
  const newTagsLine = `tags: [${sorted.map((t) => `"${t}"`).join(', ')}]`;

  if (tagsIdx === -1) {
    return [...lines, newTagsLine].join('\n');
  }

  // Replace line + strip block-style continuation lines.
  const out = [...lines];
  out[tagsIdx] = newTagsLine;
  let j = tagsIdx + 1;
  while (j < out.length && /^\s*-\s/.test(out[j]!)) {
    out.splice(j, 1);
  }
  return out.join('\n');
}

async function processFile(filePath: string, zone: ArtifactZone, baseTag: string): Promise<void> {
  stats.scanned++;
  let content: string;
  try { content = await fs.readFile(filePath, 'utf8'); }
  catch (err) { stats.errors.push({ path: filePath, err: (err as Error).message }); return; }

  const fmMatch = content.match(FM_RE);
  if (!fmMatch) { stats.skipped_no_frontmatter++; return; }
  const fmText = fmMatch[1];
  const body = content.slice(fmMatch[0].length);

  let fmObj: Record<string, unknown>;
  try { fmObj = (yaml.load(fmText) ?? {}) as Record<string, unknown>; }
  catch (err) { stats.errors.push({ path: filePath, err: `yaml parse: ${(err as Error).message}` }); return; }

  const tags = deriveTags(zone, baseTag, fmObj);
  const newFm = applyTags(fmText, tags);
  if (newFm === null) { stats.skipped_no_change++; return; }

  const newContent = `---\n${newFm}\n---\n${body}`;

  if (DRY_RUN) {
    stats.modified++;
    console.log(`[dry-run] ${path.relative(VAULT, filePath)} → tags: [${tags.join(', ')}]`);
    return;
  }

  try {
    const result = await safeWrite(filePath, newContent, {
      agent: 'VaultTagBackfill',
      runId: `tag-backfill-${new Date().toISOString().replace(/[:.]/g, '-')}`,
      playbook: 'vault_tag_backfill',
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

async function main(): Promise<void> {
  console.log(`vault-tag-backfill starting (vault=${VAULT}, dry-run=${DRY_RUN})`);
  for (const d of TARGET_DIRS) {
    let entries: string[];
    try { entries = await fs.readdir(path.join(VAULT, d.rel)); }
    catch { continue; }
    for (const e of entries) {
      if (!e.endsWith('.md')) continue;
      if (e === 'INDEX.md' || e.startsWith('DASHBOARD')) continue;
      await processFile(path.join(VAULT, d.rel, e), d.zone, d.baseTag);
    }
  }

  console.log('\n── Results ──');
  console.log(`scanned:                 ${stats.scanned}`);
  console.log(`modified:                ${stats.modified}`);
  console.log(`skipped_no_frontmatter:  ${stats.skipped_no_frontmatter}`);
  console.log(`skipped_no_change:       ${stats.skipped_no_change}`);
  console.log(`errors:                  ${stats.errors.length}`);
  for (const e of stats.errors) {
    console.log(`  ${path.relative(VAULT, e.path)}: ${e.err}`);
  }
  if (stats.errors.length > 0) process.exit(1);
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] === thisFile) {
  main().catch((err) => { console.error('FATAL:', err); process.exit(1); });
}

export { deriveTags, applyTags };
