// tests/unit/playbooks/stakeholder-1-1.spec.ts
// Source: tasks/ch7-test-brief.md §2a + docs/decisions/0009-ch7-playbooks-home.md §6 + §3.7
// Tests the stakeholder_1_1 playbook module.
// Lens: COS only. Stamp: STAKEHOLDER_SKELETON when file missing; degrade flag when stale.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dispatch/run-loop to avoid better-sqlite3 ABI failure
vi.mock('../../../apps/utility/src/orchestrator/dispatch.js', () => ({
  dispatchLens: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../apps/utility/src/orchestrator/run-loop.js', () => ({
  buildLensBundle: vi.fn().mockReturnValue({
    lensRole: 'COS',
    runId: 'test-run',
    prompt: 'test prompt',
    playbookId: 'stakeholder_1_1',
  }),
}));
vi.mock('../../../apps/utility/src/safewrite/index.js', () => ({
  safeWrite: vi.fn().mockResolvedValue({ ok: true }),
}));

// Mock fs/promises to control file existence/content
let _mockReadFile: (path: string, enc: string) => Promise<string>;
vi.mock('fs/promises', () => ({
  readFile: (...args: Parameters<typeof _mockReadFile>) => _mockReadFile(...args),
}));

import { LENSES, runPlaybook } from '../../../apps/utility/src/playbooks/stakeholder-1-1/index.js';
import { dispatchLens } from '../../../apps/utility/src/orchestrator/dispatch.js';
import { safeWrite } from '../../../apps/utility/src/safewrite/index.js';
import type { PlaybookInput, PlaybookContext } from '@c-suite/shared-types/playbook';

const ALL_DEPS = {
  salesforce: true, netsuite: true, powerbi: true,
  aws: true, calibration: true, chorus: true, gmail: true,
};

function makeCtx(overrides?: Partial<PlaybookContext>): PlaybookContext {
  return {
    runId: 'test-run-001',
    db: {} as never,
    vaultPath: '/tmp/vault',
    emit: vi.fn(),
    deps: ALL_DEPS,
    ...overrides,
  };
}

function makeInput(overrides?: Partial<PlaybookInput>): PlaybookInput {
  return {
    prompt: 'Prep notes for my 1:1 with Alice',
    context: { targetName: 'Alice Chen', targetRole: 'COO' },
    ...overrides,
  };
}

// Fresh stakeholder file content (last-updated today)
function freshFileContent(name: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `---\nname: "${name}"\nlast-updated: "${today}"\n---\n## Background\nFresh content.`;
}

// Stale stakeholder file content (last-updated 60 days ago)
function staleFileContent(name: string): string {
  const staleDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return `---\nname: "${name}"\nlast-updated: "${staleDate}"\n---\n## Background\nStale content.`;
}

describe('stakeholder_1_1 — LENSES constant (ADR §3.2)', () => {

  it('LENSES constant equals [\'COS\']', () => {
    expect(LENSES).toEqual(['COS']);
  });

  it('LENSES has exactly 1 element', () => {
    expect(LENSES.length).toBe(1);
  });

});

describe('stakeholder_1_1 — file present path (ADR §6)', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    _mockReadFile = vi.fn().mockResolvedValue(freshFileContent('Alice Chen'));
  });

  it('reads stakeholder data from vault when file exists', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.lensOutputs).toBeDefined();
  });

  it('dispatchLens fires exactly once (COS only)', async () => {
    await runPlaybook(makeInput(), makeCtx());
    expect(dispatchLens).toHaveBeenCalledTimes(1);
    expect(dispatchLens).toHaveBeenCalledWith('COS', expect.anything(), expect.anything(), expect.anything());
  });

  it('result.lensOutputs.COS is non-null when file present', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.lensOutputs.COS).toBeDefined();
  });

  it('STAKEHOLDER_SKELETON stamp is absent when file present and fresh', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.stamps).not.toContain('STAKEHOLDER_SKELETON');
  });

});

describe('stakeholder_1_1 — file missing path (ADR §3.7, AC-5)', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    // First call (original path) rejects; second call (skeleton path) resolves
    let callCount = 0;
    _mockReadFile = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.reject(new Error('ENOENT: no such file or directory'));
      return Promise.resolve(freshFileContent('Alice Chen'));
    });
    (safeWrite as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
  });

  it('file missing → skeleton created (safeWrite invoked via createStakeholderSkeleton)', async () => {
    await runPlaybook(makeInput(), makeCtx());
    expect(safeWrite).toHaveBeenCalled();
  });

  it('file missing → result.stamps contains STAKEHOLDER_SKELETON', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.stamps).toContain('STAKEHOLDER_SKELETON');
  });

  it('file missing → result.memoMarkdown includes the skeleton banner text', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.memoMarkdown).toMatch(/auto-skeleton/i);
  });

  it('file missing → run continues (does not throw/block)', async () => {
    await expect(runPlaybook(makeInput(), makeCtx())).resolves.toBeDefined();
  });

  it('file missing → proposed writebacks is an array (stakeholder-1-1/index.ts:line 219)', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(Array.isArray(result.proposedWritebacks)).toBe(true);
  });

});

describe('stakeholder_1_1 — file stale path (ADR §3.7)', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    _mockReadFile = vi.fn().mockResolvedValue(staleFileContent('Alice Chen'));
  });

  it('stale >30d → no STAKEHOLDER_SKELETON stamp (file exists, only stale note)', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.stamps).not.toContain('STAKEHOLDER_SKELETON');
  });

  it('stale >30d → result.memoMarkdown includes "days ago" stale text', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.memoMarkdown).toMatch(/days ago/i);
  });

  it('stale >30d → dispatchLens still fires (run continues despite staleness)', async () => {
    await runPlaybook(makeInput(), makeCtx());
    expect(dispatchLens).toHaveBeenCalledTimes(1);
  });

});
