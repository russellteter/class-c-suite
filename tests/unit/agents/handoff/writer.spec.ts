/**
 * Ch.9 — writeHandoffBrief + serializeHandoffFile specs.
 * Source: docs/decisions/0011-ch9-cowork-handoff.md §3 + AC-4
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import type { HandoffBrief, HandoffFrontmatter as HandoffFrontmatterType } from '../../../../packages/shared-types/src/handoff.js';

// --- Fixture ---

const VAULT = path.join(os.homedir(), 'Documents', 'Claude', 'Projects', 'Business Planning');

function makeBrief(overrides: Partial<HandoffBrief> = {}): HandoffBrief {
  const fm: HandoffFrontmatterType = {
    type: 'handoff',
    id: 'HANDOFF-2026-05-27-q3-plan',
    decision_id: 'DEC-007',
    origin_type: 'decision',
    origin_path: 'decisions/DEC-007.md',
    created: '2026-05-27',
    created_by_run_id: 'run-writer-test',
    status: 'drafted',
    cowork_brand_skills: ['class-brand-document'],
    executed_by: null,
  };
  return {
    frontmatter: fm,
    bodyMarkdown: '## Decision being executed\nInvest in enterprise.',
    filename: '2026-05-27-q3-plan.md',
    fullPath: path.join(VAULT, 'handoffs', '2026-05-27-q3-plan.md'),
    ...overrides,
  };
}

describe('serializeHandoffFile', () => {
  it('produces content starting with ---', async () => {
    const { serializeHandoffFile } = await import('../../../../apps/utility/src/agents/handoff/writer.js');
    const content = serializeHandoffFile(makeBrief());
    expect(content.startsWith('---\n')).toBe(true);
  });

  it('contains closing --- separator', async () => {
    const { serializeHandoffFile } = await import('../../../../apps/utility/src/agents/handoff/writer.js');
    const content = serializeHandoffFile(makeBrief());
    expect(content).toContain('\n---\n');
  });

  it('contains the body markdown after frontmatter', async () => {
    const { serializeHandoffFile } = await import('../../../../apps/utility/src/agents/handoff/writer.js');
    const content = serializeHandoffFile(makeBrief());
    expect(content).toContain('## Decision being executed');
  });

  it('frontmatter YAML includes id field', async () => {
    const { serializeHandoffFile } = await import('../../../../apps/utility/src/agents/handoff/writer.js');
    const content = serializeHandoffFile(makeBrief());
    expect(content).toContain('HANDOFF-2026-05-27-q3-plan');
  });

  it('frontmatter YAML includes status field', async () => {
    const { serializeHandoffFile } = await import('../../../../apps/utility/src/agents/handoff/writer.js');
    const content = serializeHandoffFile(makeBrief());
    expect(content).toContain('drafted');
  });
});

describe('writeHandoffBrief', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls safeWrite with the brief path', async () => {
    const safeWriteMod = await import('../../../../apps/utility/src/safewrite/index.js');
    const spy = vi.spyOn(safeWriteMod, 'safeWrite').mockResolvedValue({ ok: true, sha: 'abc123' });
    const { regenerateHandoffIndex } = await import('../../../../apps/utility/src/agents/handoff/indexRegen.js');
    vi.spyOn({ regenerateHandoffIndex }, 'regenerateHandoffIndex').mockResolvedValue();

    const { writeHandoffBrief } = await import('../../../../apps/utility/src/agents/handoff/writer.js');
    const brief = makeBrief();
    const db = {} as Parameters<typeof writeHandoffBrief>[1];

    const result = await writeHandoffBrief(brief, db);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      absPath: brief.fullPath,
      agent: 'handoff-agent',
    }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.sha).toBe('abc123');
  });

  it('returns ok:false on safeWrite conflict', async () => {
    const safeWriteMod = await import('../../../../apps/utility/src/safewrite/index.js');
    vi.spyOn(safeWriteMod, 'safeWrite').mockResolvedValue({
      ok: false,
      conflict: true,
      sidecarPath: '/tmp/test.proposed-123.md',
    });

    const { writeHandoffBrief } = await import('../../../../apps/utility/src/agents/handoff/writer.js');
    const result = await writeHandoffBrief(makeBrief(), {} as Parameters<typeof writeHandoffBrief>[1]);
    expect(result.ok).toBe(false);
  });

  it('returns ok:false for path outside handoffs dir', async () => {
    const { writeHandoffBrief } = await import('../../../../apps/utility/src/agents/handoff/writer.js');
    const bad = makeBrief({ fullPath: '/tmp/evil.md' });
    const result = await writeHandoffBrief(bad, {} as Parameters<typeof writeHandoffBrief>[1]);
    expect(result.ok).toBe(false);
  });

  it('commit message includes runId in safeWrite call', async () => {
    const safeWriteMod = await import('../../../../apps/utility/src/safewrite/index.js');
    const spy = vi.spyOn(safeWriteMod, 'safeWrite').mockResolvedValue({ ok: true, sha: 'def456' });

    const { writeHandoffBrief } = await import('../../../../apps/utility/src/agents/handoff/writer.js');
    await writeHandoffBrief(makeBrief(), {} as Parameters<typeof writeHandoffBrief>[1]);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      runId: 'run-writer-test',
    }));
  });
});
