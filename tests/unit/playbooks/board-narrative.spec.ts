// tests/unit/playbooks/board-narrative.spec.ts
// Source: tasks/ch7-phase-b-test-brief.md §3 + docs/decisions/0009-ch7-playbooks-home.md §7
// Tests the board_narrative playbook module.
// Pipeline: all 6 lenses; threshold=70;
// block if any of {Salesforce, NetSuite, PowerBI, calibration} unavailable.
// Memo footer contains "Draw up for Cowork" CTA with class-brand-presentations skill name.
// Writebacks: position-update + prediction proposals.
// Stamp: CLEAN | DRAFT | DEGRADED.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock transitive deps that pull better-sqlite3
vi.mock('../../../apps/utility/src/orchestrator/dispatch.js', () => ({
  dispatchLens: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../apps/utility/src/orchestrator/run-loop.js', () => ({
  buildLensBundle: vi.fn().mockReturnValue({ lensRole: 'CEO', runId: 'test', prompt: '', playbookId: 'board_narrative' }),
}));
vi.mock('../../../apps/utility/src/db/tool-calls.js', () => ({
  insertToolCall: vi.fn(),
}));
vi.mock('../../../apps/utility/src/safewrite/index.js', () => ({
  safeWrite: vi.fn().mockResolvedValue({ ok: true }),
}));

import { LENSES, runPlaybook } from '../../../apps/utility/src/playbooks/board-narrative/index.js';
import type { PlaybookInput, PlaybookContext, PlaybookDeps } from '@c-suite/shared-types/playbook';

// Mock clients that satisfy the interface without real network calls.
// B47 fix: board_narrative now calls real client methods — tests must provide mock clients.
function makeMockDeps(): PlaybookDeps {
  return {
    salesforce: {
      serviceId: 'salesforce',
      query: vi.fn().mockResolvedValue({ totalSize: 2, done: true, records: [
        { Id: 'opp1', Name: 'Acme Renewal', Amount: 1_500_000, StageName: 'Contracting' },
        { Id: 'opp2', Name: 'Beta Verbal', Amount: 900_000, StageName: 'Verbal Agreement' },
      ] }),
      queryAll: vi.fn().mockResolvedValue({ totalSize: 0, done: true, records: [] }),
      describeObject: vi.fn().mockResolvedValue({ name: 'Opportunity', fields: [] }),
      isAuthenticated: vi.fn().mockResolvedValue(true),
      reconnect: vi.fn().mockResolvedValue(undefined),
      healthCheck: vi.fn().mockResolvedValue({ ok: true, authMode: 'oauth' }),
    },
    netsuite: {
      serviceId: 'netsuite',
      degraded: false,
      runSuiteQL: vi.fn().mockResolvedValue({ items: [], count: 0, hasMore: false }),
      runSavedSearch: vi.fn().mockResolvedValue({ items: [], count: 0, hasMore: false }),
      isNetSuiteTableReadable: vi.fn().mockResolvedValue(true),
      isAuthenticated: vi.fn().mockResolvedValue(true),
      reconnect: vi.fn().mockResolvedValue(undefined),
      healthCheck: vi.fn().mockResolvedValue({ ok: true, authMode: 'tba' }),
    },
    powerbi: {
      serviceId: 'powerbi',
      // Raw usage fields per directive #1 (health_score/health_status deprecated).
      // acc2 has minutes_30d: 0 — dormant, counts as at-risk.
      runFullExport: vi.fn().mockResolvedValue([
        { account_id: 'acc1', account_name: 'Acme', minutes_30d: 95000, minutes_90d: 280000, arr_usd: 60000 },
        { account_id: 'acc2', account_name: 'Beta', minutes_30d: 0, minutes_90d: 8000, arr_usd: 25000 },
        { account_id: 'acc3', account_name: 'Gamma', minutes_30d: 42000, minutes_90d: 130000, arr_usd: 40000 },
      ]),
      getAccountUsage: vi.fn().mockResolvedValue(null),
      isAuthenticated: vi.fn().mockResolvedValue(true),
      reconnect: vi.fn().mockResolvedValue(undefined),
      healthCheck: vi.fn().mockResolvedValue({ ok: true, authMode: 'subprocess' }),
    },
    calibration: {} as never,
    aws: {
      serviceId: 'aws',
      getCostExplorer: vi.fn().mockResolvedValue({}),
      getOrganizationAccounts: vi.fn().mockResolvedValue({}),
      isAuthenticated: vi.fn().mockResolvedValue(true),
      reconnect: vi.fn().mockResolvedValue(undefined),
      healthCheck: vi.fn().mockResolvedValue({ ok: true, authMode: 'sso' }),
    },
    chorus: {} as never,
    gmail: {} as never,
  };
}

function makeCtx(overrides?: Partial<PlaybookContext>): PlaybookContext {
  return {
    runId: 'test-run-bn-001',
    db: {} as never,
    vaultPath: '/tmp/vault',
    emit: vi.fn(),
    deps: makeMockDeps(),
    ...overrides,
  };
}

function makeInput(overrides?: Partial<PlaybookInput>): PlaybookInput {
  return {
    prompt: 'Prepare board narrative for Q3 board meeting',
    ...overrides,
  };
}

describe('board_narrative — LENSES constant (ADR §3.2)', () => {

  it('LENSES contains all six lenses', () => {
    expect(LENSES).toEqual(['CEO', 'CFO', 'CRO', 'CMO', 'CPO', 'COS']);
  });

  it('LENSES length is 6', () => {
    expect(LENSES.length).toBe(6);
  });

  it('LENSES contains CEO', () => {
    expect(LENSES).toContain('CEO');
  });

  it('LENSES contains CFO', () => {
    expect(LENSES).toContain('CFO');
  });

  it('LENSES contains CRO', () => {
    expect(LENSES).toContain('CRO');
  });

  it('LENSES contains CMO', () => {
    expect(LENSES).toContain('CMO');
  });

  it('LENSES contains CPO', () => {
    expect(LENSES).toContain('CPO');
  });

  it('LENSES contains COS', () => {
    expect(LENSES).toContain('COS');
  });

});

describe('board_narrative — rigor threshold (ADR §7)', () => {

  it('rigorThreshold on result equals 70', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.rigorThreshold).toBe(70);
  });

});

describe('board_narrative — parallel lens fan-out (ADR §7)', () => {

  beforeEach(() => vi.clearAllMocks());

  it('all 6 lenses dispatched — result.lensOutputs has 6 keys', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(Object.keys(result.lensOutputs).length).toBe(6);
  });

  it('result.lensOutputs has CEO key', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.lensOutputs).toHaveProperty('CEO');
  });

  it('result.lensOutputs has CFO key', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.lensOutputs).toHaveProperty('CFO');
  });

  it('result.lensOutputs has CRO key', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.lensOutputs).toHaveProperty('CRO');
  });

  it('result.lensOutputs has CMO key', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.lensOutputs).toHaveProperty('CMO');
  });

  it('result.lensOutputs has CPO key', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.lensOutputs).toHaveProperty('CPO');
  });

  it('result.lensOutputs has COS key', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.lensOutputs).toHaveProperty('COS');
  });

  it('emit called for all 6 lens roles', async () => {
    const emit = vi.fn();
    await runPlaybook(makeInput(), makeCtx({ emit }));
    const roles = emit.mock.calls.map((c) => c[0]?.payload?.role);
    expect(roles).toContain('CEO');
    expect(roles).toContain('CFO');
    expect(roles).toContain('CRO');
    expect(roles).toContain('CMO');
    expect(roles).toContain('CPO');
    expect(roles).toContain('COS');
  });

  it('exactly 6 agent.complete emit calls', async () => {
    const emit = vi.fn();
    await runPlaybook(makeInput(), makeCtx({ emit }));
    const lensCalls = emit.mock.calls.filter((c) => c[0]?.kind === 'agent.complete');
    expect(lensCalls.length).toBe(6);
  });

});

describe('board_narrative — prereq decision integration (ADR §3.6, Decision 4)', () => {

  it('block when Salesforce unavailable', async () => {
    const deps = { ...makeMockDeps(), salesforce: undefined };
    const result = await runPlaybook(makeInput(), makeCtx({ deps }));
    expect(result.memoMarkdown).toMatch(/Blocked/);
  });

  it('block when NetSuite unavailable', async () => {
    const deps = { ...makeMockDeps(), netsuite: undefined };
    const result = await runPlaybook(makeInput(), makeCtx({ deps }));
    expect(result.memoMarkdown).toMatch(/Blocked/);
  });

  it('block when PowerBI unavailable', async () => {
    const deps = { ...makeMockDeps(), powerbi: undefined };
    const result = await runPlaybook(makeInput(), makeCtx({ deps }));
    expect(result.memoMarkdown).toMatch(/Blocked/);
  });

  it('block when calibration unavailable', async () => {
    const deps = { ...makeMockDeps(), calibration: undefined };
    const result = await runPlaybook(makeInput(), makeCtx({ deps }));
    expect(result.memoMarkdown).toMatch(/Blocked/);
  });

  it('block result has empty lensOutputs when any required source absent', async () => {
    const deps = { ...makeMockDeps(), netsuite: undefined };
    const result = await runPlaybook(makeInput(), makeCtx({ deps }));
    expect(Object.keys(result.lensOutputs).length).toBe(0);
  });

  it('degrade when aws unavailable — degradedSources includes aws', async () => {
    const deps = { ...makeMockDeps(), aws: undefined };
    const result = await runPlaybook(makeInput(), makeCtx({ deps }));
    expect(result.degradedSources).toContain('aws');
  });

  it('degrade when gmail unavailable — degradedSources includes gmail', async () => {
    const deps = { ...makeMockDeps(), gmail: undefined };
    const result = await runPlaybook(makeInput(), makeCtx({ deps }));
    expect(result.degradedSources).toContain('gmail');
  });

  it('degrade when chorus unavailable — degradedSources includes chorus', async () => {
    const deps = { ...makeMockDeps(), chorus: undefined };
    const result = await runPlaybook(makeInput(), makeCtx({ deps }));
    expect(result.degradedSources).toContain('chorus');
  });

  it('proceed when all required sources available — no block', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.memoMarkdown).not.toMatch(/Blocked/);
  });

  it('proceed — degradedSources empty when all mock deps available (netsuite env-gated)', async () => {
    // In test env, NETSUITE_SUITEQL_BOARD_FINANCIALS is unset → netsuite degrades from env-gate.
    // All other sources succeed with mock clients.
    const result = await runPlaybook(makeInput(), makeCtx());
    const nonNsDegraded = result.degradedSources.filter((s) => s !== 'netsuite');
    expect(nonNsDegraded).toHaveLength(0);
  });

});

describe('board_narrative — stamps (ADR §3.3)', () => {

  it('playbook defers scoring to run-loop: rigorScore null, no CLEAN/DRAFT emitted (B47 Phase 2)', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.rigorScore).toBeNull();
    expect(result.stamps).not.toContain('CLEAN');
    expect(result.stamps).not.toContain('DRAFT');
  });

  it('result.stamps does not contain ADVERSARIAL_ONLY', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.stamps).not.toContain('ADVERSARIAL_ONLY');
  });

  it('result.stamps does not contain STAKEHOLDER_SKELETON', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.stamps).not.toContain('STAKEHOLDER_SKELETON');
  });

  it('result.stamps contains DEGRADED when degradedSources is non-empty', async () => {
    const result = await runPlaybook(makeInput(), makeCtx({ deps: { ...makeMockDeps(), aws: undefined } }));
    expect(result.stamps).toContain('DEGRADED');
  });

});

describe('board_narrative — memo CTA footer (ADR §7, PRD §6)', () => {

  it('memoMarkdown is a non-empty string', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(typeof result.memoMarkdown).toBe('string');
    expect(result.memoMarkdown.length).toBeGreaterThan(0);
  });

  it('memoMarkdown contains "Draw up for Cowork" CTA text', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.memoMarkdown).toMatch(/Draw up for Cowork/i);
  });

  it('memoMarkdown references class-brand-presentations skill name', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.memoMarkdown).toMatch(/class-brand-presentations/);
  });

  it('memoMarkdown contains slide skeleton section', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.memoMarkdown).toMatch(/slide/i);
  });

  it('memoMarkdown contains narrative spine', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.memoMarkdown).toMatch(/narrative spine/i);
  });

});

describe('board_narrative — writebacks (ADR §7)', () => {

  it('proposedWritebacks contains at least one position-update entry', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    const posEntries = result.proposedWritebacks.filter(
      (w) => (w as { artifactType: string }).artifactType === 'position_update',
    );
    expect(posEntries.length).toBeGreaterThan(0);
  });

  it('proposedWritebacks contains at least one prediction entry', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    const predEntries = result.proposedWritebacks.filter(
      (w) => (w as { artifactType: string }).artifactType === 'prediction',
    );
    expect(predEntries.length).toBeGreaterThan(0);
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

describe('board_narrative — PlaybookModule contract (ADR §3.1)', () => {

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

  it('result.rigorThreshold is 70', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.rigorThreshold).toBe(70);
  });

});
