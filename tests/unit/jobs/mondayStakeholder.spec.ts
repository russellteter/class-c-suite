/**
 * tests/unit/jobs/mondayStakeholder.spec.ts
 * Source: docs/decisions/0012-ch10-scheduler-autonomy.md AC-6
 * Verifies: skip stakeholders updated <7 days ago; invoke playbook for others.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';

// Mock the stakeholder playbook.
const mockRunPlaybook = vi.fn().mockResolvedValue({
  memoMarkdown: '# Stakeholder Brief\nContent.',
  degradedSources: [],
});

vi.mock('../../../apps/utility/src/playbooks/stakeholder-1-1/index.js', () => ({
  runPlaybook: mockRunPlaybook,
}), { virtual: true });

import { runMondayStakeholder } from '../../../apps/utility/src/jobs/mondayStakeholder.js';

function makeDb(): unknown {
  return {
    prepare: vi.fn().mockReturnValue({
      get: vi.fn(),
      run: vi.fn(),
      all: vi.fn().mockReturnValue([]),
    }),
  };
}

describe('mondayStakeholder', () => {
  let emitIpc: ReturnType<typeof vi.fn>;
  let tmpDir: string;

  beforeEach(async () => {
    emitIpc = vi.fn();
    mockRunPlaybook.mockClear();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'stakeholder-'));
  });

  it('returns empty degradedSources when stakeholders dir does not exist', async () => {
    const ctx = { db: makeDb() as never, emitIpc, vaultRoot: tmpDir };
    const result = await runMondayStakeholder(ctx);
    expect(result.degradedSources).toBeDefined();
    expect(Array.isArray(result.degradedSources)).toBe(true);
    expect(mockRunPlaybook).not.toHaveBeenCalled();
  });

  it('invokes stakeholder_1_1 playbook for non-recent stakeholders', async () => {
    // Create stakeholders directory with one stale file.
    const stakeholdersDir = path.join(tmpDir, 'stakeholders');
    await fs.mkdir(stakeholdersDir, { recursive: true });

    const staleFile = path.join(stakeholdersDir, 'john-doe.md');
    await fs.writeFile(staleFile, '# John Doe\nStakeholder brief.', 'utf-8');

    // Set mtime to 8 days ago.
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    await fs.utimes(staleFile, eightDaysAgo, eightDaysAgo);

    const ctx = { db: makeDb() as never, emitIpc, vaultRoot: tmpDir };
    await runMondayStakeholder(ctx);

    expect(mockRunPlaybook).toHaveBeenCalledOnce();
    const callArgs = mockRunPlaybook.mock.calls[0]![0] as { context: { stakeholderSlug: string } };
    expect(callArgs.context.stakeholderSlug).toBe('john-doe');
  });

  it('skips stakeholders updated within 7 days', async () => {
    const stakeholdersDir = path.join(tmpDir, 'stakeholders');
    await fs.mkdir(stakeholdersDir, { recursive: true });

    const recentFile = path.join(stakeholdersDir, 'jane-smith.md');
    await fs.writeFile(recentFile, '# Jane Smith\nRecent brief.', 'utf-8');
    // mtime is "now" by default — within 7 days.

    const ctx = { db: makeDb() as never, emitIpc, vaultRoot: tmpDir };
    await runMondayStakeholder(ctx);

    expect(mockRunPlaybook).not.toHaveBeenCalled();
  });

  it('skips skeleton files (prefixed with _skeleton-)', async () => {
    const stakeholdersDir = path.join(tmpDir, 'stakeholders');
    await fs.mkdir(stakeholdersDir, { recursive: true });

    const skeletonFile = path.join(stakeholdersDir, '_skeleton-template.md');
    await fs.writeFile(skeletonFile, '# Template', 'utf-8');
    // Set mtime to 14 days ago.
    const oldDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    await fs.utimes(skeletonFile, oldDate, oldDate);

    const ctx = { db: makeDb() as never, emitIpc, vaultRoot: tmpDir };
    await runMondayStakeholder(ctx);

    expect(mockRunPlaybook).not.toHaveBeenCalled();
  });

  it('continues to next stakeholder when one fails', async () => {
    const stakeholdersDir = path.join(tmpDir, 'stakeholders');
    await fs.mkdir(stakeholdersDir, { recursive: true });

    // Two stale files.
    for (const name of ['alice.md', 'bob.md']) {
      const f = path.join(stakeholdersDir, name);
      await fs.writeFile(f, `# ${name}`, 'utf-8');
      const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      await fs.utimes(f, oldDate, oldDate);
    }

    // First call throws, second succeeds.
    mockRunPlaybook
      .mockRejectedValueOnce(new Error('playbook failed'))
      .mockResolvedValueOnce({ memoMarkdown: '# Bob', degradedSources: [] });

    const ctx = { db: makeDb() as never, emitIpc, vaultRoot: tmpDir };
    const result = await runMondayStakeholder(ctx);

    // Both were attempted; job itself did not throw.
    expect(mockRunPlaybook).toHaveBeenCalledTimes(2);
    expect(result).toBeDefined();
  });
});
