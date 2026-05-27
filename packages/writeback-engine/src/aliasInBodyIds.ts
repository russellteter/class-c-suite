// packages/writeback-engine/src/aliasInBodyIds.ts
// Pure function extracted from scripts/vault-inbody-link-fixup.ts.
// Source: docs/decisions/0008-write-backs-and-iterative-feedback.md §2.4
// Converts bare artifact ID references in body prose to aliased wikilinks:
//   POS-003  →  [[POS-003-full-title-here|POS-003]]
// Skips: YAML frontmatter blocks, fenced code blocks, existing wikilinks.

import * as fs from 'fs/promises';
import * as path from 'path';

// ID token: POS-NNN, DEC-NNN, WS-NN, PM-NNN, PRED-NNN, TW-FIN-NNN, etc.
// Must NOT be preceded by [[ (already linked) or word chars (inside a longer token).
const ID_TOKEN = /\b(POS|DEC|WS|PM|PRED|TW(?:-[A-Z]+)?)-(\d{2,3}[A-Za-z0-9-]*)\b/g;

const PREFIX_DIRS: Record<string, string[]> = {
  POS:    ['positions/active', 'positions/superseded'],
  DEC:    ['decisions'],
  WS:     ['workstreams'],
  PM:     ['pre-mortems'],
  PRED:   ['calibration/predictions', 'calibration/resolved'],
  TW:     ['adversarial/financial-tripwires'],
  'TW-FIN': ['adversarial/financial-tripwires'],
};

const idCache = new Map<string, string | null>();

async function resolveId(id: string, vaultRoot: string): Promise<string | null> {
  const cacheKey = `${vaultRoot}:${id}`;
  if (idCache.has(cacheKey)) return idCache.get(cacheKey)!;

  const prefixMatch = id.match(/^(TW-FIN|POS|DEC|WS|PM|PRED|TW)/);
  if (!prefixMatch) {
    idCache.set(cacheKey, null);
    return null;
  }
  const dirs = PREFIX_DIRS[prefixMatch[1] ?? ''];
  if (!dirs) {
    idCache.set(cacheKey, null);
    return null;
  }

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
    if (match) {
      const base = match.replace(/\.md$/, '');
      idCache.set(cacheKey, base);
      return base;
    }
  }
  idCache.set(cacheKey, null);
  return null;
}

/**
 * Rewrites bare artifact ID references in body prose to aliased wikilinks.
 * Skips frontmatter, fenced code blocks, and text already inside [[ ]].
 *
 * @param bodyText  - Full file content (frontmatter + body)
 * @param vaultRoot - Absolute path to vault root
 * @returns Rewritten content with aliased wikilinks; unchanged if nothing resolved
 */
export async function aliasInBodyIds(
  bodyText: string,
  vaultRoot: string,
): Promise<string> {
  // Split off YAML frontmatter — leave it untouched.
  const fmMatch = bodyText.match(/^---\n([\s\S]*?)\n---\n?/);
  const frontmatter = fmMatch ? fmMatch[0] : '';
  const body = bodyText.slice(frontmatter.length);

  let inFence = false;
  const lines = body.split('\n');
  const outputLines: string[] = [];

  for (const line of lines) {
    if (/^(\s*)```/.test(line)) {
      inFence = !inFence;
      outputLines.push(line);
      continue;
    }
    if (inFence || /^#{1,6}\s/.test(line)) {
      outputLines.push(line);
      continue;
    }

    // Replace bare IDs in this prose line, skipping already-wikilinked spans.
    const segments: string[] = [];
    let cursor = 0;
    const wikilinkRe = /\[\[.*?\]\]/g;
    let wm: RegExpExecArray | null;
    const protected_spans: Array<[number, number]> = [];
    while ((wm = wikilinkRe.exec(line)) !== null) {
      protected_spans.push([wm.index, wm.index + wm[0].length]);
    }

    ID_TOKEN.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = ID_TOKEN.exec(line)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      // Skip if inside a wikilink span.
      const inside = protected_spans.some(([s, e]) => start >= s && end <= e);
      if (inside) continue;

      // We'll resolve later; collect positions.
      // For async, collect all IDs first then replace.
    }

    // Async ID resolution + line rewrite.
    ID_TOKEN.lastIndex = 0;
    let result = '';
    let lastIndex = 0;
    const matches: Array<{ start: number; end: number; id: string }> = [];
    while ((m = ID_TOKEN.exec(line)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      const inside = protected_spans.some(([s, e]) => start >= s && end <= e);
      if (!inside) {
        matches.push({ start, end, id: m[0] });
      }
    }

    // Resolve all IDs in this line.
    const resolved = await Promise.all(
      matches.map(async ({ id }) => ({
        id,
        filename: await resolveId(id, vaultRoot),
      })),
    );

    lastIndex = 0;
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i]!;
      const { filename } = resolved[i]!;
      result += line.slice(lastIndex, match.start);
      if (filename) {
        result += `[[${filename}|${match.id}]]`;
      } else {
        result += match.id;
      }
      lastIndex = match.end;
    }
    result += line.slice(lastIndex);
    outputLines.push(result);
    void segments; // suppress unused variable
  }

  return frontmatter + outputLines.join('\n');
}
