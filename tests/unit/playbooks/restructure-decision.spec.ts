// tests/unit/playbooks/restructure-decision.spec.ts
// Source: tasks/ch7-phase-b-test-brief.md §4 + docs/decisions/0009-ch7-playbooks-home.md §8
// Tests the restructure_decision playbook module.
// Baseline LENSES = [COS, CFO]; CPO added when subject.role contains product keyword
// (case-insensitive); threshold=80; heavy Red-Team section in memo.
// Block if Salesforce + NetSuite + cash-model unavailable.
// Writebacks: decision proposal + workstream-update + position-update.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock transitive deps that pull better-sqlite3
vi.mock('../../../apps/utility/src/orchestrator/dispatch.js', () => ({
  dispatchLens: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../apps/utility/src/orchestrator/run-loop.js', () => ({
  buildLensBundle: vi.fn().mockReturnValue({ lensRole: 'COS', runId: 'test', prompt: '', playbookId: 'restructure_decision' }),
}));
vi.mock('../../../apps/utility/src/db/tool-calls.js', () => ({
  insertToolCall: vi.fn(),
}));
vi.mock('../../../apps/utility/src/safewrite/index.js', () => ({
  safeWrite: vi.fn().mockResolvedValue({ ok: true }),
}));

import { LENSES, PRODUCT_ROLE_KEYWORDS, runPlaybook } from '../../../apps/utility/src/playbooks/restructure-decision/index.js';
import type { PlaybookInput, PlaybookContext } from '@c-suite/shared-types/playbook';

const ALL_DEPS = {
  salesforce: true, netsuite: true, powerbi: true,
  aws: true, calibration: true, chorus: true, gmail: true,
};

function makeCtx(overrides?: Partial<PlaybookContext>): PlaybookContext {
  return {
    runId: 'test-run-rd-001',
    db: {} as never,
    vaultPath: '/tmp/vault',
    emit: vi.fn(),
    deps: ALL_DEPS,
    ...overrides,
  };
}

function makeInput(subjectRole?: string, overrides?: Partial<PlaybookInput>): PlaybookInput {
  return {
    prompt: 'Should we restructure this role?',
    context: subjectRole
      ? { subject: { name: 'Alex Smith', role: subjectRole } }
      : { subject: { name: 'Alex Smith', role: 'SVP Sales' } },
    ...overrides,
  };
}

describe('restructure_decision — baseline LENSES constant (ADR §3.2)', () => {

  it('baseline LENSES equals [\'COS\', \'CFO\']', () => {
    expect(LENSES).toEqual(['COS', 'CFO']);
  });

  it('baseline LENSES length is 2', () => {
    expect(LENSES.length).toBe(2);
  });

  it('baseline LENSES contains COS', () => {
    expect(LENSES).toContain('COS');
  });

  it('baseline LENSES contains CFO', () => {
    expect(LENSES).toContain('CFO');
  });

  it('baseline LENSES does NOT contain CPO', () => {
    expect(LENSES).not.toContain('CPO');
  });

});

describe('restructure_decision — PRODUCT_ROLE_KEYWORDS exported (ADR §8)', () => {

  it('PRODUCT_ROLE_KEYWORDS is defined and non-empty', () => {
    expect(PRODUCT_ROLE_KEYWORDS).toBeDefined();
    expect(PRODUCT_ROLE_KEYWORDS.length).toBeGreaterThan(0);
  });

  it('PRODUCT_ROLE_KEYWORDS contains "product"', () => {
    expect(PRODUCT_ROLE_KEYWORDS).toContain('product');
  });

});

describe('restructure_decision — rigor threshold (ADR §8)', () => {

  it('rigorThreshold on result equals 80', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.rigorThreshold).toBe(80);
  });

});

describe('restructure_decision — CPO dynamic addition by subject.role (ADR §8)', () => {

  beforeEach(() => vi.clearAllMocks());

  it('CPO IS added when subject.role is "CTO" (3 lenses total)', async () => {
    const result = await runPlaybook(makeInput('CTO'), makeCtx());
    expect(result.lensOutputs).toHaveProperty('CPO');
  });

  it('CPO IS added when subject.role is "VP Eng"', async () => {
    const result = await runPlaybook(makeInput('VP Eng'), makeCtx());
    expect(result.lensOutputs).toHaveProperty('CPO');
  });

  it('CPO IS added when subject.role is "VP Product"', async () => {
    const result = await runPlaybook(makeInput('VP Product'), makeCtx());
    expect(result.lensOutputs).toHaveProperty('CPO');
  });

  it('CPO IS added when subject.role is "product manager" (case-insensitive)', async () => {
    const result = await runPlaybook(makeInput('product manager'), makeCtx());
    expect(result.lensOutputs).toHaveProperty('CPO');
  });

  it('CPO is NOT added when subject.role is "CFO"', async () => {
    const result = await runPlaybook(makeInput('CFO'), makeCtx());
    expect(result.lensOutputs).not.toHaveProperty('CPO');
  });

  it('CPO is NOT added when subject.role is "SVP Sales"', async () => {
    const result = await runPlaybook(makeInput('SVP Sales'), makeCtx());
    expect(result.lensOutputs).not.toHaveProperty('CPO');
  });

  it('3 emit calls (COS + CFO + CPO) when product role present', async () => {
    const emit = vi.fn();
    await runPlaybook(makeInput('VP Product'), makeCtx({ emit }));
    const lensCalls = emit.mock.calls.filter((c) =>
      c[0]?.kind === 'agent.complete' && ['COS', 'CFO', 'CPO'].includes(c[0]?.payload?.role),
    );
    expect(lensCalls.length).toBe(3);
  });

  it('2 emit calls (COS + CFO only) when non-product role present', async () => {
    const emit = vi.fn();
    await runPlaybook(makeInput('SVP Sales'), makeCtx({ emit }));
    const lensCalls = emit.mock.calls.filter((c) =>
      c[0]?.kind === 'agent.complete' && ['COS', 'CFO', 'CPO'].includes(c[0]?.payload?.role),
    );
    // RedTeam is also emitted; filter to only COS + CFO + CPO
    const cpoCalls = lensCalls.filter((c) => c[0]?.payload?.role === 'CPO');
    expect(cpoCalls.length).toBe(0);
    const cosCfoCalls = lensCalls.filter((c) =>
      c[0]?.payload?.role === 'COS' || c[0]?.payload?.role === 'CFO',
    );
    expect(cosCfoCalls.length).toBe(2);
  });

  it('case-insensitive: "PRODUCT DIRECTOR" triggers CPO addition', async () => {
    const result = await runPlaybook(makeInput('PRODUCT DIRECTOR'), makeCtx());
    expect(result.lensOutputs).toHaveProperty('CPO');
  });

});

describe('restructure_decision — prereq decision integration (ADR §3.6, Decision 4)', () => {

  it('block when salesforce unavailable — returns blocked memo', async () => {
    const result = await runPlaybook(makeInput(), makeCtx({ deps: { ...ALL_DEPS, salesforce: false } }));
    expect(result.memoMarkdown).toMatch(/Blocked/);
  });

  it('block when netsuite unavailable — returns blocked memo', async () => {
    const result = await runPlaybook(makeInput(), makeCtx({ deps: { ...ALL_DEPS, netsuite: false } }));
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

  it('degrade when gmail unavailable — degradedSources includes gmail', async () => {
    const result = await runPlaybook(makeInput(), makeCtx({ deps: { ...ALL_DEPS, gmail: false } }));
    expect(result.degradedSources).toContain('gmail');
  });

  it('degrade when chorus unavailable — degradedSources includes chorus', async () => {
    const result = await runPlaybook(makeInput(), makeCtx({ deps: { ...ALL_DEPS, chorus: false } }));
    expect(result.degradedSources).toContain('chorus');
  });

  it('proceed when salesforce + netsuite + calibration all available', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.memoMarkdown).not.toMatch(/Blocked/);
  });

  it('proceed — degradedSources empty when all deps available', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.degradedSources).toHaveLength(0);
  });

});

describe('restructure_decision — heavy Red-Team section in memo (ADR §8)', () => {

  it('memoMarkdown contains "Red-Team" section heading', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.memoMarkdown).toMatch(/red.team/i);
  });

  it('memoMarkdown Red-Team section has Lawsuit Risk sub-heading', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.memoMarkdown).toMatch(/lawsuit risk/i);
  });

  it('memoMarkdown Red-Team section has Team-Morale Risk sub-heading', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.memoMarkdown).toMatch(/team.morale risk/i);
  });

  it('memoMarkdown Red-Team section has Customer-Disruption Risk sub-heading', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.memoMarkdown).toMatch(/customer.disruption risk/i);
  });

  it('result.lensOutputs has RedTeam key (heavy Red-Team fired)', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.lensOutputs).toHaveProperty('RedTeam');
  });

  it('RedTeam structured output does NOT have lens transcript keys — B3 invariant', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    const rt = result.lensOutputs['RedTeam'] as Record<string, unknown>;
    expect(rt).not.toHaveProperty('COS');
    expect(rt).not.toHaveProperty('CFO');
    expect(rt).not.toHaveProperty('CPO');
    expect(rt).not.toHaveProperty('lensOutputs');
  });

  it('memoMarkdown is a non-empty string', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(typeof result.memoMarkdown).toBe('string');
    expect(result.memoMarkdown.length).toBeGreaterThan(0);
  });

});

describe('restructure_decision — writebacks (ADR §8)', () => {

  it('proposedWritebacks contains at least one decision entry', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    const decisionEntries = result.proposedWritebacks.filter(
      (w) => (w as { artifactType: string }).artifactType === 'decision',
    );
    expect(decisionEntries.length).toBeGreaterThan(0);
  });

  it('proposedWritebacks contains at least one workstream-update entry', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    const wsEntries = result.proposedWritebacks.filter(
      (w) => (w as { artifactType: string }).artifactType === 'workstream_update',
    );
    expect(wsEntries.length).toBeGreaterThan(0);
  });

  it('proposedWritebacks contains at least one position-update entry', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    const posEntries = result.proposedWritebacks.filter(
      (w) => (w as { artifactType: string }).artifactType === 'position_update',
    );
    expect(posEntries.length).toBeGreaterThan(0);
  });

  it('proposedWritebacks contains all three required types', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    const types = result.proposedWritebacks.map((w) => (w as { artifactType: string }).artifactType);
    expect(types).toContain('decision');
    expect(types).toContain('workstream_update');
    expect(types).toContain('position_update');
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

describe('restructure_decision — PlaybookModule contract (ADR §3.1)', () => {

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

  it('playbook defers scoring to run-loop: rigorScore null, no CLEAN/DRAFT emitted (B47 Phase 2)', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.rigorScore).toBeNull();
    expect(result.stamps).not.toContain('CLEAN');
    expect(result.stamps).not.toContain('DRAFT');
  });

  it('result.lensOutputs has COS key', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.lensOutputs).toHaveProperty('COS');
  });

  it('result.lensOutputs has CFO key', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.lensOutputs).toHaveProperty('CFO');
  });

});
