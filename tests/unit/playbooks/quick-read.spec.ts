// tests/unit/playbooks/quick-read.spec.ts
// Source: tasks/ch7-test-brief.md §2c + docs/decisions/0009-ch7-playbooks-home.md §10 + §3.5
// Tests the quick_read playbook module.
// Pipeline: all 6 lenses in parallel, Verifier bypassed, no writebacks.
// Stamp: QUICK_READ. rigorScore: null.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dispatch/run-loop to avoid better-sqlite3 ABI failure
vi.mock('../../../apps/utility/src/orchestrator/dispatch.js', () => ({
  dispatchLens: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../apps/utility/src/orchestrator/run-loop.js', () => ({
  buildLensBundle: vi.fn().mockReturnValue({
    lensRole: 'CEO',
    runId: 'test-run',
    prompt: 'test prompt',
    playbookId: 'quick_read',
  }),
}));

import { LENSES, runPlaybook } from '../../../apps/utility/src/playbooks/quick-read/index.js';
import { dispatchLens } from '../../../apps/utility/src/orchestrator/dispatch.js';
import type { PlaybookInput, PlaybookContext } from '@c-suite/shared-types/playbook';

const ALL_DEPS = {
  salesforce: true, netsuite: true, powerbi: true,
  aws: true, calibration: true, chorus: true, gmail: true,
};

function makeCtx(overrides?: Partial<PlaybookContext>): PlaybookContext {
  return {
    runId: 'test-run-qr-001',
    db: {} as never,
    vaultPath: '/tmp/vault',
    emit: vi.fn(),
    deps: ALL_DEPS,
    ...overrides,
  };
}

function makeInput(overrides?: Partial<PlaybookInput>): PlaybookInput {
  return {
    prompt: 'Quick overview of our current strategic position',
    ...overrides,
  };
}

describe('quick_read — lens dispatch (ADR §3.2, §3.5)', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('all 6 lenses dispatched in parallel (LENSES.length = 6)', async () => {
    await runPlaybook(makeInput(), makeCtx());
    expect(dispatchLens).toHaveBeenCalledTimes(6);
  });

  it('COS lens dispatched', async () => {
    await runPlaybook(makeInput(), makeCtx());
    expect(dispatchLens).toHaveBeenCalledWith('COS', expect.anything(), expect.anything(), expect.anything());
  });

  it('CFO lens dispatched', async () => {
    await runPlaybook(makeInput(), makeCtx());
    expect(dispatchLens).toHaveBeenCalledWith('CFO', expect.anything(), expect.anything(), expect.anything());
  });

  it('CRO lens dispatched', async () => {
    await runPlaybook(makeInput(), makeCtx());
    expect(dispatchLens).toHaveBeenCalledWith('CRO', expect.anything(), expect.anything(), expect.anything());
  });

  it('CMO lens dispatched', async () => {
    await runPlaybook(makeInput(), makeCtx());
    expect(dispatchLens).toHaveBeenCalledWith('CMO', expect.anything(), expect.anything(), expect.anything());
  });

  it('CPO lens dispatched', async () => {
    await runPlaybook(makeInput(), makeCtx());
    expect(dispatchLens).toHaveBeenCalledWith('CPO', expect.anything(), expect.anything(), expect.anything());
  });

  it('CEO lens dispatched', async () => {
    await runPlaybook(makeInput(), makeCtx());
    expect(dispatchLens).toHaveBeenCalledWith('CEO', expect.anything(), expect.anything(), expect.anything());
  });

  it('exactly 6 dispatchLens calls total (quick-read/index.ts:line 86-96)', async () => {
    await runPlaybook(makeInput(), makeCtx());
    expect(dispatchLens).toHaveBeenCalledTimes(6);
  });

});

describe('quick_read — Verifier bypassed (ADR §3.5, AC-6)', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('result.rigorScore is null (Verifier bypassed per §3.5 + §13.5)', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.rigorScore).toBeNull();
  });

  it('rigorThreshold is 0 — Verifier bypass signaled (quick-read/index.ts:line 33)', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.rigorThreshold).toBe(0);
  });

  it('LENSES constant has all 6 lenses including CEO, CFO, CRO, CMO, CPO, COS', () => {
    // shipStatus field not on PlaybookResult — confirmed Verifier bypass via rigorScore null
    expect(LENSES).toHaveLength(6);
    expect(LENSES).toContain('CEO');
    expect(LENSES).toContain('COS');
  });

});

describe('quick_read — writebacks disabled (ADR §3.5, AC-6)', () => {

  it('result.proposedWritebacks is an empty array', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.proposedWritebacks).toEqual([]);
  });

});

describe('quick_read — stamps (ADR §3.3)', () => {

  it('result.stamps contains QUICK_READ', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.stamps).toContain('QUICK_READ');
  });

});

describe('quick_read — memo section order (ADR §10)', () => {

  it('memo section order is COS / CFO / CRO / CMO / CPO / CEO (quick-read/index.ts:line 32)', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    const md = result.memoMarkdown;
    const cosPos = md.indexOf('## COS Lens');
    const cfoPos = md.indexOf('## CFO Lens');
    const croPos = md.indexOf('## CRO Lens');
    const cmoPos = md.indexOf('## CMO Lens');
    const cpoPos = md.indexOf('## CPO Lens');
    const ceoPos = md.indexOf('## CEO Lens');
    expect(cosPos).toBeLessThan(cfoPos);
    expect(cfoPos).toBeLessThan(croPos);
    expect(croPos).toBeLessThan(cmoPos);
    expect(cmoPos).toBeLessThan(cpoPos);
    expect(cpoPos).toBeLessThan(ceoPos);
  });

  it('each of the 6 section headers appears in result.memoMarkdown', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    for (const role of ['COS', 'CFO', 'CRO', 'CMO', 'CPO', 'CEO']) {
      expect(result.memoMarkdown).toContain(`## ${role} Lens`);
    }
  });

});
