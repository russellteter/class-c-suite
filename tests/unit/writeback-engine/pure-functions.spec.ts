/**
 * Ch.6 Unit tests — Pure helper functions in packages/writeback-engine/src/
 * Test owner: Test sub-agent (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0008-write-backs-and-iterative-feedback.md §2.4, §10.1
 *
 * Covers: deriveTags, computeDiff, deriveTopic, resolveWikilinks, aliasInBodyIds
 * No DB, no safeWrite — pure FS (tmpdir) or fully in-memory.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { deriveTags } from '../../../packages/writeback-engine/src/deriveTags.js';
import { computeDiff } from '../../../packages/writeback-engine/src/diff.js';
import { deriveTopic } from '../../../packages/writeback-engine/src/deriveTopic.js';
import { resolveWikilinks } from '../../../packages/writeback-engine/src/resolveWikilinks.js';
import { aliasInBodyIds } from '../../../packages/writeback-engine/src/aliasInBodyIds.js';

// ── deriveTags ────────────────────────────────────────────────────────────────

describe('deriveTags — ADR §2.4', () => {
  it('position: includes type/position base tag', () => {
    const tags = deriveTags('position', 'type/position', { status: 'active', confidence: 85 });
    expect(tags).toContain('type/position');
  });

  it('position: adds status/active for status=active', () => {
    const tags = deriveTags('position', 'type/position', { status: 'active', confidence: 85 });
    expect(tags).toContain('status/active');
  });

  it('position: adds confidence/high for confidence >= 80', () => {
    const tags = deriveTags('position', 'type/position', { status: 'active', confidence: 80 });
    expect(tags).toContain('confidence/high');
  });

  it('position: adds confidence/mid for confidence 60-79', () => {
    const tags = deriveTags('position', 'type/position', { status: 'active', confidence: 65 });
    expect(tags).toContain('confidence/mid');
  });

  it('position: adds confidence/low for confidence < 60', () => {
    const tags = deriveTags('position', 'type/position', { status: 'active', confidence: 40 });
    expect(tags).toContain('confidence/low');
  });

  it('decision: adds state/ratified for RATIFIED state', () => {
    const tags = deriveTags('decision', 'type/decision', { state: 'RATIFIED', reversibility: 'one-way' });
    expect(tags).toContain('state/ratified');
    expect(tags).toContain('reversibility/one-way');
  });

  it('decision: adds state/draft for DRAFT state', () => {
    const tags = deriveTags('decision', 'type/decision', { state: 'DRAFT' });
    expect(tags).toContain('state/draft');
  });

  it('workstream: adds health/red for status=RED', () => {
    const tags = deriveTags('workstream', 'type/workstream', { status: 'RED', phase: 'execution' });
    expect(tags).toContain('health/red');
    expect(tags).toContain('phase/execution');
  });

  it('workstream: normalises phase spaces to dashes', () => {
    const tags = deriveTags('workstream', 'type/workstream', { status: 'GREEN', phase: 'build out' });
    expect(tags).toContain('phase/build-out');
  });

  it('pre-mortem: adds impact and probability tags', () => {
    const tags = deriveTags('pre-mortem', 'type/pre-mortem', { impact: 'high', probability: 55 });
    expect(tags).toContain('impact/high');
    expect(tags).toContain('probability/high');
  });

  it('prediction: adds status and confidence tags', () => {
    const tags = deriveTags('prediction', 'type/prediction', { status: 'open', confidence: 70 });
    expect(tags).toContain('status/open');
    expect(tags).toContain('confidence/mid');
  });

  it('returns sorted array', () => {
    const tags = deriveTags('position', 'type/position', { status: 'active', confidence: 85 });
    expect(tags).toEqual([...tags].sort());
  });

  it('tripwire: adds category tag', () => {
    const tags = deriveTags('tripwire', 'type/tripwire', { category: 'liquidity' });
    expect(tags).toContain('category/liquidity');
  });
});

// ── computeDiff ──────────────────────────────────────────────────────────────

describe('computeDiff — ADR §3.4 diff helper', () => {
  it('returns null when activeContent is null (isNew)', () => {
    expect(computeDiff(null, 'some content')).toBeNull();
  });

  it('returns null when content is identical', () => {
    const content = 'line one\nline two\nline three\n';
    expect(computeDiff(content, content)).toBeNull();
  });

  it('returns a non-null diff string when lines differ', () => {
    const a = 'line one\nline two\nline three\n';
    const b = 'line one\nline TWO CHANGED\nline three\n';
    const diff = computeDiff(a, b);
    expect(diff).not.toBeNull();
    expect(diff).toContain('-line two');
    expect(diff).toContain('+line TWO CHANGED');
  });

  it('diff output contains @@ hunk header', () => {
    const a = 'a\nb\nc\nd\ne\n';
    const b = 'a\nb\nX\nd\ne\n';
    const diff = computeDiff(a, b);
    expect(diff).toMatch(/@@.*@@/);
  });

  it('detects added line', () => {
    const a = 'first\nlast\n';
    const b = 'first\nmiddle\nlast\n';
    const diff = computeDiff(a, b);
    expect(diff).toContain('+middle');
  });

  it('detects removed line', () => {
    const a = 'first\nmiddle\nlast\n';
    const b = 'first\nlast\n';
    const diff = computeDiff(a, b);
    expect(diff).toContain('-middle');
  });

  it('idempotency: two identical calls return equal result', () => {
    const a = 'alpha\nbeta\ngamma\n';
    const b = 'alpha\nbeta CHANGED\ngamma\n';
    expect(computeDiff(a, b)).toEqual(computeDiff(a, b));
  });
});

// ── deriveTopic ───────────────────────────────────────────────────────────────

describe('deriveTopic — ADR §10.1', () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'c-suite-topic-'));
    // Seed a workstream file.
    await fs.mkdir(path.join(tmpDir, 'workstreams'), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, 'workstreams', 'WS-03-arr-growth.md'),
      '---\nid: WS-03\ntitle: ARR Growth Track\n---\n\nBody.',
    );
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('Priority 1: resolves workstream title from linked-workstreams (kebab)', async () => {
    const topic = await deriveTopic(
      { 'linked-workstreams': ['WS-03'] },
      'cash_lever',
      tmpDir,
    );
    expect(topic).toBe('ARR Growth Track');
  });

  it('Priority 1: resolves workstream title from linked_workstreams (snake)', async () => {
    const topic = await deriveTopic(
      { linked_workstreams: ['WS-03'] },
      'cash_lever',
      tmpDir,
    );
    expect(topic).toBe('ARR Growth Track');
  });

  it('Priority 2: cash_lever → Cash when no linked-workstreams', async () => {
    const topic = await deriveTopic({}, 'cash_lever', tmpDir);
    expect(topic).toBe('Cash');
  });

  it('Priority 2: gtm_reallocation → GTM', async () => {
    const topic = await deriveTopic({}, 'gtm_reallocation', tmpDir);
    expect(topic).toBe('GTM');
  });

  it('Priority 2: strategic_option → Strategy', async () => {
    const topic = await deriveTopic({}, 'strategic_option', tmpDir);
    expect(topic).toBe('Strategy');
  });

  it('Priority 2: board_narrative → Board', async () => {
    const topic = await deriveTopic({}, 'board_narrative', tmpDir);
    expect(topic).toBe('Board');
  });

  it('Priority 2: pre_mortem → Adversarial', async () => {
    const topic = await deriveTopic({}, 'pre_mortem', tmpDir);
    expect(topic).toBe('Adversarial');
  });

  it('Priority 2: open_qa → Ad-hoc', async () => {
    const topic = await deriveTopic({}, 'open_qa', tmpDir);
    expect(topic).toBe('Ad-hoc');
  });

  it('Priority 3: unknown playbook → General', async () => {
    const topic = await deriveTopic({}, 'unknown_playbook_xyz', tmpDir);
    expect(topic).toBe('General');
  });

  it('Priority 2: hyphenated playbook variant normalised (cash-lever → Cash)', async () => {
    const topic = await deriveTopic({}, 'cash-lever', tmpDir);
    expect(topic).toBe('Cash');
  });

  it('linked-workstreams array: uses first entry', async () => {
    const topic = await deriveTopic(
      { 'linked-workstreams': ['WS-03', 'WS-04'] },
      'cash_lever',
      tmpDir,
    );
    expect(topic).toBe('ARR Growth Track');
  });

  it('falls back to playbook if workstream ID not found in vault', async () => {
    const topic = await deriveTopic(
      { 'linked-workstreams': ['WS-99'] },
      'gtm_reallocation',
      tmpDir,
    );
    expect(topic).toBe('GTM');
  });
});

// ── resolveWikilinks ──────────────────────────────────────────────────────────

describe('resolveWikilinks — ADR §2.4', () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'c-suite-wl-'));
    await fs.mkdir(path.join(tmpDir, 'positions/active'), { recursive: true });
    await fs.mkdir(path.join(tmpDir, 'decisions'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, 'positions/active', 'POS-001-full-title.md'), '');
    await fs.writeFile(path.join(tmpDir, 'decisions', 'DEC-005-some-decision.md'), '');
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('resolves POS-NNN to [[full-filename]] wikilink', async () => {
    const links = await resolveWikilinks(['POS-001'], tmpDir);
    expect(links).toEqual(['[[POS-001-full-title]]']);
  });

  it('resolves DEC-NNN to [[full-filename]] wikilink', async () => {
    const links = await resolveWikilinks(['DEC-005'], tmpDir);
    expect(links).toEqual(['[[DEC-005-some-decision]]']);
  });

  it('silently skips unresolvable IDs', async () => {
    const links = await resolveWikilinks(['POS-999', 'POS-001'], tmpDir);
    expect(links).toEqual(['[[POS-001-full-title]]']);
  });

  it('returns empty array for empty input', async () => {
    const links = await resolveWikilinks([], tmpDir);
    expect(links).toEqual([]);
  });

  it('resolves mixed array correctly', async () => {
    const links = await resolveWikilinks(['POS-001', 'DEC-005'], tmpDir);
    expect(links).toHaveLength(2);
    expect(links[0]).toMatch(/^\[\[POS-001/);
    expect(links[1]).toMatch(/^\[\[DEC-005/);
  });

  it('unknown prefix returns empty result', async () => {
    const links = await resolveWikilinks(['XYZ-999'], tmpDir);
    expect(links).toEqual([]);
  });
});

// ── aliasInBodyIds ────────────────────────────────────────────────────────────

describe('aliasInBodyIds — ADR §2.4', () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'c-suite-alias-'));
    await fs.mkdir(path.join(tmpDir, 'positions/active'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, 'positions/active', 'POS-003-cash-position.md'), '');
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('converts bare POS-NNN in body to aliased wikilink', async () => {
    const body = 'This supports POS-003 which was defined earlier.';
    const result = await aliasInBodyIds(body, tmpDir);
    expect(result).toContain('[[POS-003-cash-position|POS-003]]');
  });

  it('leaves existing [[wikilinks]] untouched', async () => {
    const body = 'See [[POS-003-cash-position]] for details.';
    const result = await aliasInBodyIds(body, tmpDir);
    // Should not double-wrap.
    expect(result).not.toContain('[[[[');
    expect(result).toContain('[[POS-003-cash-position]]');
  });

  it('skips IDs inside fenced code blocks', async () => {
    const body = '```\nPOS-003 is a reference\n```\n';
    const result = await aliasInBodyIds(body, tmpDir);
    // Content inside code fence should not be linked.
    expect(result).not.toContain('[[POS-003-cash-position|POS-003]]');
  });

  it('leaves YAML frontmatter untouched', async () => {
    const content = '---\nrelated: [POS-003]\n---\n\nBody mentioning POS-003.';
    const result = await aliasInBodyIds(content, tmpDir);
    // Frontmatter block must be preserved verbatim.
    expect(result).toContain('related: [POS-003]\n');
    // Body part should be aliased.
    expect(result).toContain('[[POS-003-cash-position|POS-003]]');
  });

  it('unresolvable ID in body is left as-is', async () => {
    const body = 'References POS-999 which does not exist.';
    const result = await aliasInBodyIds(body, tmpDir);
    expect(result).toContain('POS-999');
    expect(result).not.toContain('[[POS-999');
  });
});
