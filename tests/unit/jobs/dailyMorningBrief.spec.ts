/**
 * tests/unit/jobs/dailyMorningBrief.spec.ts
 * Source: docs/decisions/0012-ch10-scheduler-autonomy.md AC-9
 * Verifies: quick_read invoked; QUICK_READ stamp in memo; memo at correct path.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';

// Mock the quick-read playbook.
const mockRunPlaybook = vi.fn().mockResolvedValue({
  memoMarkdown: '# Morning Brief\n\n## COS\nOne thing.\n\n## CFO\nAnother thing.',
  degradedSources: [],
  stamps: ['QUICK_READ'],
});

vi.mock('../../../apps/utility/src/playbooks/quick-read/index.js', () => ({
  runPlaybook: mockRunPlaybook,
}), { virtual: true });

import { runDailyMorningBrief } from '../../../apps/utility/src/jobs/dailyMorningBrief.js';

function makeDb(): unknown {
  return {
    prepare: vi.fn().mockReturnValue({
      get: vi.fn(),
      run: vi.fn(),
      all: vi.fn().mockReturnValue([]),
    }),
  };
}

describe('dailyMorningBrief', () => {
  let emitIpc: ReturnType<typeof vi.fn>;
  let tmpDir: string;

  beforeEach(async () => {
    emitIpc = vi.fn();
    mockRunPlaybook.mockClear();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'brief-'));
  });

  it('invokes quick_read playbook', async () => {
    const ctx = { db: makeDb() as never, emitIpc, vaultRoot: tmpDir };
    await runDailyMorningBrief(ctx);

    expect(mockRunPlaybook).toHaveBeenCalledOnce();
  });

  it('passes quick_read as playbookId', async () => {
    const ctx = { db: makeDb() as never, emitIpc, vaultRoot: tmpDir };
    await runDailyMorningBrief(ctx);

    const callArgs = mockRunPlaybook.mock.calls[0]![0] as { playbookId: string };
    expect(callArgs.playbookId).toBe('quick_read');
  });

  it('passes six-lens compact read prompt', async () => {
    const ctx = { db: makeDb() as never, emitIpc, vaultRoot: tmpDir };
    await runDailyMorningBrief(ctx);

    const callArgs = mockRunPlaybook.mock.calls[0]![0] as { prompt: string };
    expect(callArgs.prompt.toLowerCase()).toContain('six-lens');
  });

  it('produces a morning-brief memo file in scheduled-reports/', async () => {
    const ctx = { db: makeDb() as never, emitIpc, vaultRoot: tmpDir };
    const result = await runDailyMorningBrief(ctx);

    expect(result.outputMemoPath).toBeDefined();
    expect(result.outputMemoPath!).toContain('morning-brief');

    const fileExists = await fs.stat(result.outputMemoPath!).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);
  });

  it('memo file contains QUICK_READ stamp', async () => {
    const ctx = { db: makeDb() as never, emitIpc, vaultRoot: tmpDir };
    const result = await runDailyMorningBrief(ctx);

    const content = await fs.readFile(result.outputMemoPath!, 'utf-8');
    expect(content).toContain('QUICK_READ');
  });

  it('memo file contains the playbook output', async () => {
    const ctx = { db: makeDb() as never, emitIpc, vaultRoot: tmpDir };
    const result = await runDailyMorningBrief(ctx);

    const content = await fs.readFile(result.outputMemoPath!, 'utf-8');
    expect(content).toContain('Morning Brief');
  });

  it('returns degradedSources from playbook', async () => {
    mockRunPlaybook.mockResolvedValueOnce({
      memoMarkdown: '# Brief',
      degradedSources: ['chorus'],
      stamps: ['QUICK_READ'],
    });

    const ctx = { db: makeDb() as never, emitIpc, vaultRoot: tmpDir };
    const result = await runDailyMorningBrief(ctx);

    expect(result.degradedSources).toContain('chorus');
  });

  it('memo path is in scheduled-reports subdirectory', async () => {
    const ctx = { db: makeDb() as never, emitIpc, vaultRoot: tmpDir };
    const result = await runDailyMorningBrief(ctx);

    expect(result.outputMemoPath!).toContain('scheduled-reports');
  });
});
