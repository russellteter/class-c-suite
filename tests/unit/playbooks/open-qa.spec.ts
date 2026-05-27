// tests/unit/playbooks/open-qa.spec.ts
// Source: tasks/ch7-test-brief.md §2d + docs/decisions/0009-ch7-playbooks-home.md §12 + §13.6
// Tests the open_qa playbook: deterministic route + ad-hoc decomposer path.
// Stamp: DECOMPOSED_AD_HOC. Rigor capped at 85.

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
    playbookId: 'open_qa',
  }),
}));

// Mock the decomposer module to control routing vs. ad-hoc behavior
vi.mock('../../../apps/utility/src/playbooks/lib/decomposer.js', () => ({
  decompose: vi.fn(),
}));

import { runPlaybook } from '../../../apps/utility/src/playbooks/open-qa/index.js';
import { decompose } from '../../../apps/utility/src/playbooks/lib/decomposer.js';
import { dispatchLens } from '../../../apps/utility/src/orchestrator/dispatch.js';
import type { PlaybookInput, PlaybookContext, DecompositionResult } from '@c-suite/shared-types/playbook';

const mockDecompose = decompose as ReturnType<typeof vi.fn>;

const ALL_DEPS = {
  salesforce: true, netsuite: true, powerbi: true,
  aws: true, calibration: true, chorus: true, gmail: true,
};

function makeCtx(overrides?: Partial<PlaybookContext>): PlaybookContext {
  return {
    runId: 'test-run-qa-001',
    db: {} as never,
    vaultPath: '/tmp/vault',
    emit: vi.fn(),
    deps: ALL_DEPS,
    ...overrides,
  };
}

function makeInput(prompt: string, ctx?: Record<string, unknown>): PlaybookInput {
  return { prompt, context: ctx };
}

const AD_HOC_DECOMPOSITION: DecompositionResult = {
  kind: 'ad_hoc',
  lenses: ['CFO', 'COS'],
  mcps: [],
  outputShape: 'memo',
};

describe('open_qa — deterministic route (ADR §12.2)', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    mockDecompose.mockResolvedValue({ kind: 'route_to_playbook', playbookId: 'cash_lever' });
  });

  it('prompt matching regex → returns _redirect: true sentinel (open-qa/index.ts:line 83-93)', async () => {
    const result = await runPlaybook(makeInput('what should I do about cash'), makeCtx()) as Record<string, unknown>;
    expect(result._redirect).toBe(true);
  });

  it('"cash_lever" route → redirect result has playbookId = "cash_lever"', async () => {
    const result = await runPlaybook(makeInput('cash runway question'), makeCtx()) as Record<string, unknown>;
    expect(result.playbookId).toBe('cash_lever');
  });

  it('redirect result does NOT include DECOMPOSED_AD_HOC stamp', async () => {
    const result = await runPlaybook(makeInput('cash runway question'), makeCtx());
    expect(result.stamps).not.toContain('DECOMPOSED_AD_HOC');
  });

  it('redirect result does NOT trigger lens fan-out (dispatchLens not called)', async () => {
    await runPlaybook(makeInput('cash runway question'), makeCtx());
    expect(dispatchLens).not.toHaveBeenCalled();
  });

});

describe('open_qa — ad-hoc decomposer path (ADR §12.2, §12.3)', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    mockDecompose.mockResolvedValue(AD_HOC_DECOMPOSITION);
  });

  it('unmatched prompt → decomposer fires (decompose called once)', async () => {
    await runPlaybook(makeInput('what is the meaning of this market signal'), makeCtx());
    expect(mockDecompose).toHaveBeenCalledTimes(1);
  });

  it('decomposer result lens set used for fan-out (dispatchLens called per lens)', async () => {
    await runPlaybook(makeInput('analyze our competitive landscape'), makeCtx());
    // AD_HOC_DECOMPOSITION has 2 lenses: CFO, COS
    expect(dispatchLens).toHaveBeenCalledTimes(2);
  });

  it('result.stamps contains DECOMPOSED_AD_HOC', async () => {
    const result = await runPlaybook(makeInput('analyze our competitive landscape'), makeCtx());
    expect(result.stamps).toContain('DECOMPOSED_AD_HOC');
  });

  it('rigorScore is present (non-null) on ad-hoc path', async () => {
    const result = await runPlaybook(makeInput('analyze our competitive landscape'), makeCtx());
    expect(result.rigorScore).not.toBeNull();
  });

});

describe('open_qa — rigor capping (ADR §13.6)', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    mockDecompose.mockResolvedValue(AD_HOC_DECOMPOSITION);
  });

  it('when raw Verifier score is 88, result.rigorScore is 85 (capped at 85)', async () => {
    // open-qa/index.ts:line 121-122: rawScore=88, displayedScore=min(88,85)=85
    const result = await runPlaybook(makeInput('any ad-hoc question'), makeCtx());
    expect(result.rigorScore).toBe(85);
  });

  it('when raw Verifier score is 88, result has rigorRawScore = 88 (uncapped)', async () => {
    const result = await runPlaybook(makeInput('any ad-hoc question'), makeCtx()) as Record<string, unknown>;
    expect(result.rigorRawScore).toBe(88);
  });

  it('rigorThreshold is 85 for open_qa (open-qa/index.ts:line 33)', async () => {
    const result = await runPlaybook(makeInput('any ad-hoc question'), makeCtx());
    expect(result.rigorThreshold).toBe(85);
  });

  it('both rigorScore and rigorRawScore are present in result', async () => {
    const result = await runPlaybook(makeInput('any ad-hoc question'), makeCtx()) as Record<string, unknown>;
    expect('rigorScore' in result).toBe(true);
    expect('rigorRawScore' in result).toBe(true);
  });

});
