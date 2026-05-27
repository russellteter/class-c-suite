// tests/unit/playbooks/playbookRouter.spec.ts
// Source: tasks/ch7-test-brief.md §1 + docs/decisions/0009-ch7-playbooks-home.md §3.1 + §15 AC-1
// Tests routeToPlaybook(id) → module with runPlaybook function.
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

  it('routeToPlaybook("gtm_realloc") throws — Phase B not yet implemented', () => {
    expect(() => routeToPlaybook('gtm_realloc')).toThrow(/Phase B/);
  });

  it('routeToPlaybook("strategic_option") throws — Phase B not yet implemented', () => {
    expect(() => routeToPlaybook('strategic_option')).toThrow(/Phase B/);
  });

  it('routeToPlaybook("stakeholder_1_1") returns an object with runPlaybook function', () => {
    const mod = routeToPlaybook('stakeholder_1_1');
    expect(typeof mod.runPlaybook).toBe('function');
  });

  it('routeToPlaybook("board_narrative") throws — Phase B not yet implemented', () => {
    expect(() => routeToPlaybook('board_narrative')).toThrow(/Phase B/);
  });

  it('routeToPlaybook("restructure_decision") throws — Phase B not yet implemented', () => {
    expect(() => routeToPlaybook('restructure_decision')).toThrow(/Phase B/);
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

describe('playbookRouter — unknown id handling', () => {

  it('Phase B playbook ids throw with "Phase B" in the message (playbookRouter.ts:line 45-52)', () => {
    // gtm_realloc is Phase B — verify error message is informative
    let caught: Error | null = null;
    try {
      routeToPlaybook('gtm_realloc');
    } catch (e) {
      caught = e as Error;
    }
    expect(caught).not.toBeNull();
    expect(caught?.message).toMatch(/Phase B playbook/);
  });

});
