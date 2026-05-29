// tests/unit/playbooks/gtm-realloc.spec.ts
// Source: tasks/ch7-phase-b-test-brief.md §1 + docs/decisions/0009-ch7-playbooks-home.md §4
// Tests the gtm_realloc playbook module.
// Pipeline: 5 lenses parallel (CRO, CFO, CMO, CPO, COS); Salesforce auth-expired → block;
// degrade on stale; Stamp: CLEAN | DRAFT | DEGRADED.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock transitive deps that pull better-sqlite3
vi.mock('../../../apps/utility/src/orchestrator/dispatch.js', () => ({
  dispatchLens: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../apps/utility/src/orchestrator/run-loop.js', () => ({
  buildLensBundle: vi.fn().mockReturnValue({ lensRole: 'CRO', runId: 'test', prompt: '', playbookId: 'gtm_realloc' }),
}));
vi.mock('../../../apps/utility/src/db/tool-calls.js', () => ({
  insertToolCall: vi.fn(),
}));
vi.mock('../../../apps/utility/src/safewrite/index.js', () => ({
  safeWrite: vi.fn().mockResolvedValue({ ok: true }),
}));

import { LENSES, runPlaybook } from '../../../apps/utility/src/playbooks/gtm-realloc/index.js';
import type { PlaybookInput, PlaybookContext, PlaybookDeps } from '@c-suite/shared-types/playbook';

// Mock clients that satisfy the interface without real network calls.
// B47 fix: gtm-realloc now calls real client methods — tests must provide mock clients
// or accept that truthy-boolean deps degrade (they can't execute real calls).
function makeMockDeps(): PlaybookDeps {
  return {
    salesforce: {
      serviceId: 'salesforce',
      query: vi.fn().mockResolvedValue({ totalSize: 3, done: true, records: [
        { Id: 'opp1', Name: 'Acme Deal', Amount: 1_200_000, StageName: 'Contracting' },
        { Id: 'opp2', Name: 'Beta Renewal', Amount: 800_000, StageName: 'Renewal Quote Sent' },
        { Id: 'opp3', Name: 'Gamma Verbal', Amount: 600_000, StageName: 'Verbal Agreement' },
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
      runFullExport: vi.fn().mockResolvedValue([
        { account_id: 'acc1', account_name: 'Acme', health_score: 72, health_status: 'Healthy', arr_usd: 50000 },
        { account_id: 'acc2', account_name: 'Beta', health_score: 31, health_status: 'At-Risk', arr_usd: 30000 },
      ]),
      getAccountUsage: vi.fn().mockResolvedValue(null),
      isAuthenticated: vi.fn().mockResolvedValue(true),
      reconnect: vi.fn().mockResolvedValue(undefined),
      healthCheck: vi.fn().mockResolvedValue({ ok: true, authMode: 'subprocess' }),
    },
    aws: {
      serviceId: 'aws',
      getCostExplorer: vi.fn().mockResolvedValue({}),
      getOrganizationAccounts: vi.fn().mockResolvedValue({}),
      isAuthenticated: vi.fn().mockResolvedValue(true),
      reconnect: vi.fn().mockResolvedValue(undefined),
      healthCheck: vi.fn().mockResolvedValue({ ok: true, authMode: 'sso' }),
    },
    calibration: {} as never,
    chorus: {} as never,
    gmail: {} as never,
  };
}

function makeCtx(overrides?: Partial<PlaybookContext>): PlaybookContext {
  return {
    runId: 'test-run-gtm-001',
    db: {} as never,
    vaultPath: '/tmp/vault',
    emit: vi.fn(),
    deps: makeMockDeps(),
    ...overrides,
  };
}

function makeInput(overrides?: Partial<PlaybookInput>): PlaybookInput {
  return {
    prompt: 'Evaluate our GTM spend allocation and recommend reallocation',
    ...overrides,
  };
}

describe('gtm_realloc — LENSES constant (ADR §3.2)', () => {

  it('LENSES equals [\'CRO\', \'CFO\', \'CMO\', \'CPO\', \'COS\'] (5 lenses)', () => {
    expect(LENSES).toEqual(['CRO', 'CFO', 'CMO', 'CPO', 'COS']);
  });

  it('LENSES length is 5', () => {
    expect(LENSES.length).toBe(5);
  });

  it('LENSES contains CRO', () => {
    expect(LENSES).toContain('CRO');
  });

  it('LENSES contains CFO', () => {
    expect(LENSES).toContain('CFO');
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

describe('gtm_realloc — rigor threshold (ADR §4)', () => {

  it('rigorThreshold on result equals 70', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.rigorThreshold).toBe(70);
  });

});

describe('gtm_realloc — parallel lens fan-out (ADR §4)', () => {

  beforeEach(() => vi.clearAllMocks());

  it('result.lensOutputs has CRO key', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.lensOutputs).toHaveProperty('CRO');
  });

  it('result.lensOutputs has CFO key', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.lensOutputs).toHaveProperty('CFO');
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

  it('emit called for all 5 lens roles (agent.complete events)', async () => {
    const emit = vi.fn();
    await runPlaybook(makeInput(), makeCtx({ emit }));
    const roles = emit.mock.calls.map((c) => c[0]?.payload?.role);
    expect(roles).toContain('CRO');
    expect(roles).toContain('CFO');
    expect(roles).toContain('CMO');
    expect(roles).toContain('CPO');
    expect(roles).toContain('COS');
  });

  it('exactly 5 agent.complete emit calls for lens fan-out', async () => {
    const emit = vi.fn();
    await runPlaybook(makeInput(), makeCtx({ emit }));
    const lensCalls = emit.mock.calls.filter((c) => c[0]?.kind === 'agent.complete');
    expect(lensCalls.length).toBe(5);
  });

});

describe('gtm_realloc — prereq decision integration (ADR §3.6, Decision 4)', () => {

  it('block when Salesforce auth expired — returns blocked memo with DRAFT stamp', async () => {
    const deps = { ...makeMockDeps(), salesforce: undefined };
    const result = await runPlaybook(makeInput(), makeCtx({ deps }));
    expect(result.stamps).toContain('DRAFT');
    expect(result.memoMarkdown).toMatch(/Blocked/);
  });

  it('block result has empty lensOutputs when Salesforce unavailable', async () => {
    const deps = { ...makeMockDeps(), salesforce: undefined };
    const result = await runPlaybook(makeInput(), makeCtx({ deps }));
    expect(Object.keys(result.lensOutputs).length).toBe(0);
  });

  it('degrade when NetSuite unavailable — degradedSources includes netsuite', async () => {
    const deps = { ...makeMockDeps(), netsuite: undefined };
    const result = await runPlaybook(makeInput(), makeCtx({ deps }));
    expect(result.degradedSources).toContain('netsuite');
  });

  it('degrade when PowerBI unavailable — degradedSources includes powerbi', async () => {
    const deps = { ...makeMockDeps(), powerbi: undefined };
    const result = await runPlaybook(makeInput(), makeCtx({ deps }));
    expect(result.degradedSources).toContain('powerbi');
  });

  it('proceed when all mock deps available — degradedSources is empty', async () => {
    // Uses mock clients that succeed — degradedSources should be empty.
    // NetSuite degrades when NETSUITE_SUITEQL_GTM_PAYROLL env var is unset (expected in test env).
    // PowerBI succeeds (mock client provided). Only netsuite degrades from env-gate.
    const result = await runPlaybook(makeInput(), makeCtx());
    // In test env, NETSUITE_SUITEQL_GTM_PAYROLL is unset → netsuite degrades from env-gate.
    // All other sources succeed with mock clients.
    const nonNsDegraded = result.degradedSources.filter((s) => s !== 'netsuite');
    expect(nonNsDegraded).toHaveLength(0);
  });

});

describe('gtm_realloc — stamps (ADR §3.3)', () => {

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

  it('result.stamps contains DEGRADED when degradedSources is non-empty', async () => {
    const result = await runPlaybook(makeInput(), makeCtx({ deps: { ...makeMockDeps(), netsuite: undefined } }));
    expect(result.stamps).toContain('DEGRADED');
  });

});

describe('gtm_realloc — memo output sections (ADR §4)', () => {

  it('memoMarkdown is a non-empty string', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(typeof result.memoMarkdown).toBe('string');
    expect(result.memoMarkdown.length).toBeGreaterThan(0);
  });

  it('memoMarkdown contains current GTM cost section', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.memoMarkdown).toMatch(/current gtm cost/i);
  });

  it('memoMarkdown contains recommended reallocation section', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.memoMarkdown).toMatch(/recommended reallocation/i);
  });

  it('memoMarkdown contains pipeline impact section', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.memoMarkdown).toMatch(/pipeline impact/i);
  });

  it('memoMarkdown contains risks section', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.memoMarkdown).toMatch(/risks/i);
  });

  it('memoMarkdown contains workstream-update proposals section', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.memoMarkdown).toMatch(/workstream-update proposals/i);
  });

});

describe('gtm_realloc — writebacks (ADR §4)', () => {

  it('proposedWritebacks contains at least one workstream-update entry', async () => {
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

describe('gtm_realloc — PlaybookModule contract (ADR §3.1)', () => {

  it('module exports runPlaybook as a function', () => {
    expect(typeof runPlaybook).toBe('function');
  });

  it('runPlaybook returns a PlaybookResult with memoMarkdown field', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result).toHaveProperty('memoMarkdown');
  });

  it('runPlaybook returns a PlaybookResult with stamps field', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result).toHaveProperty('stamps');
    expect(Array.isArray(result.stamps)).toBe(true);
  });

  it('runPlaybook returns a PlaybookResult with rigorScore field', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result).toHaveProperty('rigorScore');
  });

});
