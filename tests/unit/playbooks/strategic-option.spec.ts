// tests/unit/playbooks/strategic-option.spec.ts
// Source: tasks/ch7-phase-b-test-brief.md §2 + docs/decisions/0009-ch7-playbooks-home.md §5
// Tests the strategic_option playbook module.
// Pipeline: 4 lenses (CEO, CFO, CPO, COS); threshold=80; heavy Red-Team pass;
// block when Salesforce + AWS + cash-data not all available.
// B3 invariant: RedTeam receives synthesizedMemo + originalPrompt only (no lens transcripts).

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock transitive deps that pull better-sqlite3
vi.mock('../../../apps/utility/src/orchestrator/dispatch.js', () => ({
  dispatchLens: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../apps/utility/src/orchestrator/run-loop.js', () => ({
  buildLensBundle: vi.fn().mockReturnValue({ lensRole: 'CEO', runId: 'test', prompt: '', playbookId: 'strategic_option' }),
}));
vi.mock('../../../apps/utility/src/db/tool-calls.js', () => ({
  insertToolCall: vi.fn(),
}));
vi.mock('../../../apps/utility/src/safewrite/index.js', () => ({
  safeWrite: vi.fn().mockResolvedValue({ ok: true }),
}));

import { LENSES, runPlaybook } from '../../../apps/utility/src/playbooks/strategic-option/index.js';
import type { PlaybookInput, PlaybookContext } from '@c-suite/shared-types/playbook';

const ALL_DEPS = {
  salesforce: true, netsuite: true, powerbi: true,
  aws: true, calibration: true, chorus: true, gmail: true,
};

function makeCtx(overrides?: Partial<PlaybookContext>): PlaybookContext {
  return {
    runId: 'test-run-sopt-001',
    db: {} as never,
    vaultPath: '/tmp/vault',
    emit: vi.fn(),
    deps: ALL_DEPS,
    ...overrides,
  };
}

function makeInput(overrides?: Partial<PlaybookInput>): PlaybookInput {
  return {
    prompt: 'Analyze our strategic options given current financial position',
    ...overrides,
  };
}

describe('strategic_option — LENSES constant (ADR §3.2)', () => {

  it('LENSES equals [\'CEO\', \'CFO\', \'CPO\', \'COS\'] (4 lenses)', () => {
    expect(LENSES).toEqual(['CEO', 'CFO', 'CPO', 'COS']);
  });

  it('LENSES length is 4', () => {
    expect(LENSES.length).toBe(4);
  });

  it('LENSES contains CEO', () => {
    expect(LENSES).toContain('CEO');
  });

  it('LENSES contains CFO', () => {
    expect(LENSES).toContain('CFO');
  });

  it('LENSES contains CPO', () => {
    expect(LENSES).toContain('CPO');
  });

  it('LENSES contains COS', () => {
    expect(LENSES).toContain('COS');
  });

  it('LENSES does NOT contain CRO', () => {
    expect(LENSES).not.toContain('CRO');
  });

  it('LENSES does NOT contain CMO', () => {
    expect(LENSES).not.toContain('CMO');
  });

});

describe('strategic_option — rigor threshold (ADR §5)', () => {

  it('rigorThreshold on result equals 80', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.rigorThreshold).toBe(80);
  });

});

describe('strategic_option — parallel lens fan-out (ADR §5)', () => {

  beforeEach(() => vi.clearAllMocks());

  it('result.lensOutputs has CEO key', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.lensOutputs).toHaveProperty('CEO');
  });

  it('result.lensOutputs has CFO key', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.lensOutputs).toHaveProperty('CFO');
  });

  it('result.lensOutputs has CPO key', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.lensOutputs).toHaveProperty('CPO');
  });

  it('result.lensOutputs has COS key', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.lensOutputs).toHaveProperty('COS');
  });

  it('emit called for CEO, CFO, CPO, COS lens roles (agent.complete)', async () => {
    const emit = vi.fn();
    await runPlaybook(makeInput(), makeCtx({ emit }));
    const roles = emit.mock.calls.map((c) => c[0]?.payload?.role);
    expect(roles).toContain('CEO');
    expect(roles).toContain('CFO');
    expect(roles).toContain('CPO');
    expect(roles).toContain('COS');
  });

});

describe('strategic_option — prereq decision integration (ADR §3.6, Decision 4)', () => {

  it('block when salesforce unavailable — returns blocked memo', async () => {
    const result = await runPlaybook(makeInput(), makeCtx({ deps: { ...ALL_DEPS, salesforce: false } }));
    expect(result.memoMarkdown).toMatch(/Blocked/);
  });

  it('block when aws unavailable — returns blocked memo', async () => {
    const result = await runPlaybook(makeInput(), makeCtx({ deps: { ...ALL_DEPS, aws: false } }));
    expect(result.memoMarkdown).toMatch(/Blocked/);
  });

  it('block when calibration unavailable — returns blocked memo', async () => {
    const result = await runPlaybook(makeInput(), makeCtx({ deps: { ...ALL_DEPS, calibration: false } }));
    expect(result.memoMarkdown).toMatch(/Blocked/);
  });

  it('block result has empty lensOutputs', async () => {
    const result = await runPlaybook(makeInput(), makeCtx({ deps: { ...ALL_DEPS, salesforce: false } }));
    expect(Object.keys(result.lensOutputs).length).toBe(0);
  });

  it('degrade when netsuite unavailable — degradedSources includes netsuite', async () => {
    const result = await runPlaybook(makeInput(), makeCtx({ deps: { ...ALL_DEPS, netsuite: false } }));
    expect(result.degradedSources).toContain('netsuite');
  });

  it('proceed when salesforce + aws + calibration all available — no block', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.memoMarkdown).not.toMatch(/Blocked/);
  });

  it('proceed — degradedSources is empty when all deps available', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.degradedSources).toHaveLength(0);
  });

});

describe('strategic_option — heavy Red-Team pass (ADR §5, B3 invariant)', () => {

  it('result.lensOutputs has RedTeam key (fired after Synthesizer)', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.lensOutputs).toHaveProperty('RedTeam');
  });

  it('RedTeam role in emit calls appears after CEO, CFO, CPO, COS roles', async () => {
    const emit = vi.fn();
    await runPlaybook(makeInput(), makeCtx({ emit }));
    const calls = emit.mock.calls;
    const rtIdx = calls.findIndex((c) => c[0]?.payload?.role === 'RedTeam');
    const ceoIdx = calls.findIndex((c) => c[0]?.payload?.role === 'CEO');
    expect(rtIdx).toBeGreaterThan(ceoIdx);
  });

  it('RedTeam structured output has role = "RedTeam"', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    const rt = result.lensOutputs['RedTeam'] as { role: string };
    expect(rt.role).toBe('RedTeam');
  });

  it('RedTeam structured output does NOT have lensOutputs field — B3 invariant (no lens transcripts)', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    const rt = result.lensOutputs['RedTeam'] as Record<string, unknown>;
    expect(rt).not.toHaveProperty('lensOutputs');
    expect(rt).not.toHaveProperty('ceo');
    expect(rt).not.toHaveProperty('cfo');
  });

  it('RedTeam input captures synthesizedMemoLength (not raw lenses) — B3 invariant spot-check', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    const rt = result.lensOutputs['RedTeam'] as { input: { synthesizedMemoLength: number; originalPrompt: string } };
    expect(typeof rt.input.synthesizedMemoLength).toBe('number');
    expect(typeof rt.input.originalPrompt).toBe('string');
  });

  it('RedTeam input does NOT have direct lensOutput keys at top level', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    const rt = result.lensOutputs['RedTeam'] as Record<string, unknown>;
    // B3: RedTeam must not see individual lens transcripts
    expect(rt).not.toHaveProperty('CEO');
    expect(rt).not.toHaveProperty('CFO');
    expect(rt).not.toHaveProperty('CPO');
    expect(rt).not.toHaveProperty('COS');
  });

});

describe('strategic_option — memo output (ADR §5)', () => {

  it('memoMarkdown is a non-empty string', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(typeof result.memoMarkdown).toBe('string');
    expect(result.memoMarkdown.length).toBeGreaterThan(0);
  });

  it('memoMarkdown contains at least one strategic option section', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.memoMarkdown).toMatch(/option/i);
  });

  it('memoMarkdown contains recap option', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.memoMarkdown).toMatch(/recap/i);
  });

  it('memoMarkdown contains Red-Team section', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.memoMarkdown).toMatch(/red.team/i);
  });

});

describe('strategic_option — writebacks (ADR §5)', () => {

  it('proposedWritebacks contains at least one prediction entry', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    const preds = result.proposedWritebacks.filter(
      (w) => (w as { artifactType: string }).artifactType === 'prediction',
    );
    expect(preds.length).toBeGreaterThan(0);
  });

  it('proposedWritebacks contains workstream-update entry', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    const wsEntries = result.proposedWritebacks.filter(
      (w) => (w as { artifactType: string }).artifactType === 'workstream_update',
    );
    expect(wsEntries.length).toBeGreaterThan(0);
  });

  it('proposedWriteback entries have required draftPath field', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    for (const wb of result.proposedWritebacks) {
      expect((wb as { draftPath: string }).draftPath).toBeTruthy();
    }
  });

  it('proposedWriteback entries have required topic field', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    for (const wb of result.proposedWritebacks) {
      expect((wb as { topic: string }).topic).toBeTruthy();
    }
  });

});

describe('strategic_option — PlaybookModule contract (ADR §3.1)', () => {

  it('module exports runPlaybook as a function', () => {
    expect(typeof runPlaybook).toBe('function');
  });

  it('runPlaybook returns PlaybookResult with memoMarkdown field', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result).toHaveProperty('memoMarkdown');
  });

  it('runPlaybook returns PlaybookResult with stamps array', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(Array.isArray(result.stamps)).toBe(true);
  });

  it('result.rigorThreshold is 80', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.rigorThreshold).toBe(80);
  });

  it('result.stamps contains CLEAN when rigorScore >= 80', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.stamps).toContain('CLEAN');
  });

});
