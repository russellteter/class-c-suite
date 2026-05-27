// packages/writeback-engine/src/drafters/preMortemUpdate.ts
// Source: docs/decisions/0008-write-backs-and-iterative-feedback.md §3.5
// Drafter for 'pre-mortem-update' artifact type. kebab-case frontmatter convention.

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { deriveTags } from '../deriveTags.js';
import { resolveWikilinks } from '../resolveWikilinks.js';
import { aliasInBodyIds } from '../aliasInBodyIds.js';
import { renderPreMortemUpdate } from '../templates/preMortemUpdate.js';
import { nextAvailableId } from './_idAlloc.js';
import type { SynthesizerProposedWriteback, DraftContext, DraftResult } from './types.js';

const ACTIVE_DIR = 'pre-mortems';

export async function draft(
  proposal: SynthesizerProposedWriteback,
  ctx: DraftContext,
): Promise<DraftResult> {
  const { vaultRoot, runId } = ctx;
  const activeDir = path.join(vaultRoot, ACTIVE_DIR);

  let isNew = false;
  let artifactId: string;
  let existingFm: Record<string, unknown> = {};
  let existingBody = '';

  if (!proposal.targetArtifactId) {
    isNew = true;
    artifactId = await nextAvailableId('pre-mortem-update', vaultRoot);
  } else {
    artifactId = proposal.targetArtifactId;
    let entries: string[] = [];
    try { entries = await fs.readdir(activeDir); } catch { /* new dir */ }
    const existing = entries.find(
      (f) => (f.startsWith(`${artifactId}-`) || f === `${artifactId}.md`) && f.endsWith('.md'),
    );
    if (existing) {
      const raw = await fs.readFile(path.join(activeDir, existing), 'utf8');
      const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
      if (m) {
        existingFm = (yaml.load(m[1]) as Record<string, unknown>) ?? {};
        existingBody = raw.slice(m[0].length);
      }
    } else {
      isNew = true;
    }
  }

  const merged: Record<string, unknown> = {
    ...existingFm,
    ...proposal.proposedFrontmatterPatch,
    id: artifactId,
    impact: (proposal.proposedFrontmatterPatch['impact'] ?? existingFm['impact'] ?? 'medium') as string,
    'proposed_by': { run_id: runId, agent: 'Synthesizer' },
  };

  const tags = deriveTags('pre-mortem', 'type/pre-mortem', merged);
  merged['tags'] = tags;

  const relIds = collectIds(merged);
  const wikilinks = await resolveWikilinks(relIds, vaultRoot);
  if (wikilinks.length > 0) merged['related'] = wikilinks;

  const rawBody = proposal.proposedBodyPatch || existingBody || `## Summary\n\n${proposal.oneSentenceDescription}\n`;
  const aliasedBody = await aliasInBodyIds(rawBody, vaultRoot);
  const proposedBody = renderPreMortemUpdate(merged as Parameters<typeof renderPreMortemUpdate>[0], aliasedBody);

  const slug = artifactId.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const filename = `${artifactId}-${slug}.md`;
  const ap = path.join(activeDir, filename);

  return { proposedBody, proposedFrontmatter: merged, activePath: ap, artifactId, isNew };
}

function collectIds(fm: Record<string, unknown>): string[] {
  const idFields = ['related-positions', 'related-workstreams', 'related-pre-mortems'];
  const ids: string[] = [];
  for (const f of idFields) {
    const v = fm[f];
    if (typeof v === 'string') ids.push(v);
    else if (Array.isArray(v)) ids.push(...v.filter((x): x is string => typeof x === 'string'));
  }
  return ids;
}
