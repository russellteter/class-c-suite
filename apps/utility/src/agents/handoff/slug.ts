// apps/utility/src/agents/handoff/slug.ts
// Source: docs/decisions/0011-ch9-cowork-handoff.md §4.1
// Pure function: slugify a handoff title to a kebab-case ASCII slug ≤40 chars.
// Collision-resistant: caller passes existingSlugs; appends -2, -3, ... as needed.

import * as fs from 'fs';
import * as path from 'path';

/**
 * Convert a title to kebab-case ASCII slug, max 40 chars.
 * Steps:
 *  1. Normalize unicode to ASCII approximation (simple transliteration).
 *  2. Lowercase.
 *  3. Replace non-alphanumeric runs with a single hyphen.
 *  4. Strip leading/trailing hyphens.
 *  5. Truncate at 40 chars (never mid-word split — truncate at last hyphen ≤40).
 */
export function slugifyTitle(title: string): string {
  let s = title
    // Basic unicode → ASCII approximation: strip diacritics
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    // Lowercase
    .toLowerCase()
    // Replace non-alphanumeric (keeps hyphens momentarily)
    .replace(/[^a-z0-9]+/g, '-')
    // Strip leading/trailing hyphens
    .replace(/^-+|-+$/g, '');

  if (s.length > 40) {
    // Truncate at last hyphen ≤40 to avoid mid-word cut
    const sub = s.slice(0, 40);
    const lastHyphen = sub.lastIndexOf('-');
    s = lastHyphen > 0 ? sub.slice(0, lastHyphen) : sub;
  }

  return s || 'handoff';
}

/**
 * Slug generator that checks for collisions against a set of existing slugs.
 * Appends -2, -3, ... until unique.
 *
 * @param title       Origin artifact title.
 * @param existingSlugs Set of already-used slug tokens (without date prefix).
 */
export function slugify(title: string, existingSlugs: ReadonlySet<string> = new Set()): string {
  const base = slugifyTitle(title);
  if (!existingSlugs.has(base)) return base;

  for (let n = 2; n <= 999; n++) {
    // The collision suffix is appended AFTER the base, so total length may exceed 40.
    // That is acceptable — the 40-char limit applies to the base segment only.
    const candidate = `${base}-${n}`;
    if (!existingSlugs.has(candidate)) return candidate;
  }

  // Extremely unlikely: fall back to timestamp segment
  return `${base}-${Date.now()}`;
}

/**
 * Derive existing slug tokens from a handoffs directory.
 * Parses filenames matching <YYYY-MM-DD>-<slug>.md and extracts the slug portion.
 */
export function existingSlugsFromDir(handoffsDir: string): Set<string> {
  const slugs = new Set<string>();
  try {
    const files = fs.readdirSync(handoffsDir);
    for (const file of files) {
      // Match: YYYY-MM-DD-<slug>.md
      const m = file.match(/^\d{4}-\d{2}-\d{2}-(.+)\.md$/);
      if (m) slugs.add(m[1]);
    }
  } catch {
    // Directory doesn't exist yet — no existing slugs
  }
  return slugs;
}
