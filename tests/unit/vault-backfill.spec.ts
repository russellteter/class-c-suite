/**
 * UNIT-8 — vault wikilink backfill helpers + sample integration check.
 * Source: docs/reviews/ultrareview-2026-05-27.md polish UNIT-8.
 *
 * Test owner: Test dispatch (writer ≠ grader, DOCTRINE law #7).
 *
 * Two layers:
 *   (a) unit-level — helpers (collectIds, setRelatedField, splitFrontmatter)
 *       exercised on synthetic fixtures.
 *   (b) sample-of-5 — for 5 real vault files, every ID in the file's
 *       pre-existing ID-array fields that resolves at all must appear in the
 *       `related:` field as a wikilink, OR be in the unresolved set (we test
 *       that the resolved IDs are correctly wikilinked).
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import * as yaml from 'js-yaml';
import {
  collectIds,
  setRelatedField,
  splitFrontmatter,
  resolveId,
  ID_REF_FIELDS,
  PREFIX_DIRS,
} from '../../scripts/vault-wikilink-backfill.js';

const VAULT =
  process.env.VAULT_PATH ??
  path.join(homedir(), 'Documents', 'Claude', 'Projects', 'Business Planning');

// ── (a) Helper unit tests ─────────────────────────────────────────────────────

describe('splitFrontmatter', () => {
  it('returns fm + body for a file with frontmatter', () => {
    const content = '---\nid: X-1\nstatus: active\n---\nBody here.\n';
    const r = splitFrontmatter(content);
    expect(r).not.toBeNull();
    expect(r!.fm).toContain('id: X-1');
    expect(r!.body).toBe('Body here.\n');
  });

  it('returns null when no frontmatter present', () => {
    expect(splitFrontmatter('No frontmatter at all.')).toBeNull();
  });
});

describe('collectIds — extracts IDs from known frontmatter fields', () => {
  it('extracts a single string under supersedes', () => {
    const fm = { supersedes: 'POS-001' };
    expect(collectIds(fm)).toEqual(['POS-001']);
  });

  it('extracts an array under predictions-spawned', () => {
    const fm = { 'predictions-spawned': ['PRED-001', 'PRED-002'] };
    expect(collectIds(fm)).toEqual(['PRED-001', 'PRED-002']);
  });

  it('deduplicates across multiple fields', () => {
    const fm = {
      supersedes: 'POS-003',
      'related-positions': ['POS-003', 'POS-004'],
    };
    expect(collectIds(fm).sort()).toEqual(['POS-003', 'POS-004']);
  });

  it('ignores null/~/empty values', () => {
    const fm = { supersedes: 'null', 'superseded-by': '~', blocks: '' };
    expect(collectIds(fm)).toEqual([]);
  });

  it('ignores values that are not ID-shaped', () => {
    const fm = { 'related-decisions': ['just-a-slug', 'no-id-prefix'] };
    expect(collectIds(fm)).toEqual([]);
  });

  it('only honours the registered ID_REF_FIELDS list', () => {
    // 'random-field' is not in ID_REF_FIELDS, so should be ignored.
    const fm = { 'random-field': 'POS-999' };
    expect(collectIds(fm)).toEqual([]);
  });

  it('accepts every prefix in PREFIX_DIRS', () => {
    for (const prefix of Object.keys(PREFIX_DIRS)) {
      const id = `${prefix}-001`;
      expect(collectIds({ supersedes: id })).toEqual([id]);
    }
  });
});

describe('setRelatedField — inserts or replaces the related: line', () => {
  it('appends related: when absent', () => {
    const fm = 'id: X-1\nstatus: active';
    const out = setRelatedField(fm, ['POS-003-w30']);
    expect(out).toContain('related: ["[[POS-003-w30]]"]');
  });

  it('replaces an existing single-line related:', () => {
    const fm = 'id: X-1\nrelated: ["[[OLD]]"]\nstatus: active';
    const out = setRelatedField(fm, ['POS-003-w30']);
    expect(out).toContain('related: ["[[POS-003-w30]]"]');
    expect(out).not.toContain('OLD');
  });

  it('strips block-style related: continuation lines', () => {
    const fm = 'id: X-1\nrelated:\n  - "[[OLD-A]]"\n  - "[[OLD-B]]"\nstatus: active';
    const out = setRelatedField(fm, ['NEW-A']);
    expect(out).toContain('related: ["[[NEW-A]]"]');
    expect(out).not.toContain('OLD-A');
    expect(out).not.toContain('OLD-B');
  });
});

// ── (b) Sample-of-5 integration check on the real vault ──────────────────────

const SAMPLE_PATHS = [
  'positions/active/POS-003-w30-resolves-with-ar-ap-baca.md',
  'positions/active/POS-009-roster-is-not-the-census.md',
  'positions/active/POS-021-number-two-right-hand-hire.md',
  'pre-mortems/PM-001-barclays-calls-loan.md',
  'calibration/predictions/PRED-001-russell-bandwidth-q3.md',
];

describe('UNIT-8 acceptance — sample-of-5 files have correct related: wikilinks', () => {
  for (const rel of SAMPLE_PATHS) {
    const abs = path.join(VAULT, rel);
    // Only run if the sample file exists on disk (skip gracefully on fresh clones).
    const exists = fs.existsSync(abs);
    const testFn = exists ? it : it.skip;

    testFn(`${rel}: every pre-existing resolvable ID is wikilinked in related:`, async () => {
      const content = fs.readFileSync(abs, 'utf8');
      const split = splitFrontmatter(content);
      expect(split, `no frontmatter in ${rel}`).not.toBeNull();

      const fmObj = (yaml.load(split!.fm) ?? {}) as Record<string, unknown>;
      const ids = collectIds(fmObj);

      const relatedRaw = fmObj['related'];
      // After backfill, related: MUST exist when there are any resolvable IDs.
      // Resolve each ID; only check resolvable ones (unresolved are flagged by the script).
      const resolved: string[] = [];
      for (const id of ids) {
        const r = await resolveId(id);
        if (r) resolved.push(r);
      }

      if (resolved.length === 0) {
        // File had only unresolvable IDs; backfill wouldn't add related:
        return;
      }

      expect(relatedRaw, `${rel} expected related: field after backfill`).toBeTruthy();
      const relatedList = (relatedRaw as string[]).map((s) =>
        s.replace(/^\[\[(.*)\]\]$/, '$1'),
      );
      for (const fname of resolved) {
        expect(relatedList).toContain(fname);
      }
    });
  }

  it('ID_REF_FIELDS list is non-empty (sanity)', () => {
    expect(ID_REF_FIELDS.length).toBeGreaterThan(5);
  });

  it('PREFIX_DIRS covers POS/DEC/WS/PM/PRED at minimum', () => {
    expect(PREFIX_DIRS.POS).toBeTruthy();
    expect(PREFIX_DIRS.DEC).toBeTruthy();
    expect(PREFIX_DIRS.WS).toBeTruthy();
    expect(PREFIX_DIRS.PM).toBeTruthy();
    expect(PREFIX_DIRS.PRED).toBeTruthy();
  });
});
