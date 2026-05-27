// tests/unit/playbooks/playbookRouter.spec.ts
// Source: tasks/ch7-test-brief.md §1 + docs/decisions/0009-ch7-playbooks-home.md §3.1 + §15 AC-1
//         tasks/ch7-phase-b-test-brief.md §5
// Tests routeToPlaybook(id) → module with runPlaybook function.
//
// Phase B extension: 4 Phase B playbooks (gtm_realloc, strategic_option, board_narrative,
// restructure_decision) previously threw "Phase B not implemented". Those active throw-assertions
// are replaced with it.todo — they would go red once Runtime ships the Phase B router update.
// Convert to real "returns module with runPlaybook" assertions when routeToPlaybook no longer
// throws for Phase B ids.
//
// vi.mock calls must come before imports — Vitest hoists them.
// The playbook modules import orchestrator/dispatch + db which pull better-sqlite3.
// We mock those transitive deps to avoid ERR_DLOPEN_FAILED in plain-Node env.

import { describe, it, expect, vi } from 'vitest';

// Mock transitive deps that pull better-sqlite3
vi.mock('../../../apps/utility/src/orchestrator/dispatch.js', () => ({
  dispatchLens: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../apps/utility/src/orchestrator/run-loop.js', () => ({
  buildLensBundle: vi.fn().mockReturnValue({ lensRole: 'CEO', runId: 'test', prompt: '', playbookId: 'open_qa' }),
}));
vi.mock('../../../apps/utility/src/db/tool-calls.js', () => ({
  insertToolCall: vi.fn(),
}));
vi.mock('../../../apps/utility/src/safewrite/index.js', () => ({
  safeWrite: vi.fn().mockResolvedValue({ ok: true }),
}));

import { routeToPlaybook } from '../../../apps/utility/src/playbooks/lib/playbookRouter.js';

describe('playbookRouter — routeToPlaybook returns module with runPlaybook (ADR §3.1, AC-1)', () => {

  it('routeToPlaybook("cash_lever") returns an object with runPlaybook function', () => {
    const mod = routeToPlaybook('cash_lever');
    expect(typeof mod.runPlaybook).toBe('function');
  });

  it('routeToPlaybook("gtm_realloc") returns an object with runPlaybook function', () => {
    const mod = routeToPlaybook('gtm_realloc');
    expect(typeof mod.runPlaybook).toBe('function');
  });

  it('routeToPlaybook("strategic_option") returns an object with runPlaybook function', () => {
    const mod = routeToPlaybook('strategic_option');
    expect(typeof mod.runPlaybook).toBe('function');
  });

  it('routeToPlaybook("stakeholder_1_1") returns an object with runPlaybook function', () => {
    const mod = routeToPlaybook('stakeholder_1_1');
    expect(typeof mod.runPlaybook).toBe('function');
  });

  it('routeToPlaybook("board_narrative") returns an object with runPlaybook function', () => {
    const mod = routeToPlaybook('board_narrative');
    expect(typeof mod.runPlaybook).toBe('function');
  });

  it('routeToPlaybook("restructure_decision") returns an object with runPlaybook function', () => {
    const mod = routeToPlaybook('restructure_decision');
    expect(typeof mod.runPlaybook).toBe('function');
  });

  it('routeToPlaybook("pre_mortem") returns an object with runPlaybook function', () => {
    const mod = routeToPlaybook('pre_mortem');
    expect(typeof mod.runPlaybook).toBe('function');
  });

  it('routeToPlaybook("quick_read") returns an object with runPlaybook function', () => {
    const mod = routeToPlaybook('quick_read');
    expect(typeof mod.runPlaybook).toBe('function');
  });

  it('routeToPlaybook("open_qa") returns an object with runPlaybook function', () => {
    const mod = routeToPlaybook('open_qa');
    expect(typeof mod.runPlaybook).toBe('function');
  });

});

describe('playbookRouter — cash_lever adapter (AC-1 explicit)', () => {

  it('cash_lever adapter exports runPlaybook (playbookRouter.ts:line 29-31)', () => {
    const mod = routeToPlaybook('cash_lever');
    // cash_lever index.ts exports runPlaybook directly (PlaybookModule shape)
    expect(mod).toHaveProperty('runPlaybook');
    expect(typeof mod.runPlaybook).toBe('function');
  });

});

describe('playbookRouter — Phase A ids all resolved (no throw)', () => {

  it('cash_lever does not throw', () => {
    expect(() => routeToPlaybook('cash_lever')).not.toThrow();
  });

  it('stakeholder_1_1 does not throw', () => {
    expect(() => routeToPlaybook('stakeholder_1_1')).not.toThrow();
  });

  it('pre_mortem does not throw', () => {
    expect(() => routeToPlaybook('pre_mortem')).not.toThrow();
  });

  it('quick_read does not throw', () => {
    expect(() => routeToPlaybook('quick_read')).not.toThrow();
  });

  it('open_qa does not throw', () => {
    expect(() => routeToPlaybook('open_qa')).not.toThrow();
  });

});
