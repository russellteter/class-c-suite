// tests/unit/playbooks/pre-mortem.spec.ts
// Source: tasks/ch7-test-brief.md §2b + docs/decisions/0009-ch7-playbooks-home.md §9 + §3.4
// Tests the pre_mortem playbook module.
// Pipeline: adversarial-first; LENSES=[]; RedTeam + Steelman inline; Verifier stub.
// Stamp: ADVERSARIAL_ONLY.

import { describe, it, expect, vi } from 'vitest';
import { LENSES, runPlaybook } from '../../../apps/utility/src/playbooks/pre-mortem/index.js';
import type { PlaybookInput, PlaybookContext } from '@c-suite/shared-types/playbook';

// pre-mortem does NOT import dispatch/run-loop (no sqlite3 risk)
// — confirmed: pre-mortem/index.ts imports only evaluatePrereqs and logger

const ALL_DEPS = {
  salesforce: true, netsuite: true, powerbi: true,
  aws: true, calibration: true, chorus: true, gmail: true,
};

function makeCtx(overrides?: Partial<PlaybookContext>): PlaybookContext {
  return {
    runId: 'test-run-pm-001',
    db: {} as never,
    vaultPath: '/tmp/vault',
    emit: vi.fn(),
    deps: ALL_DEPS,
    ...overrides,
  };
}

function makeInput(overrides?: Partial<PlaybookInput>): PlaybookInput {
  return {
    prompt: 'Pre-mortem: launching the new pricing model next quarter',
    context: { proposedAction: 'Launching new pricing model next quarter' },
    ...overrides,
  };
}

describe('pre_mortem — lens fan-out skipped (ADR §3.4)', () => {

  it('LENSES is an empty array — no strategic lens fan-out (pre-mortem/index.ts:line 30)', () => {
    expect(LENSES).toEqual([]);
    expect(LENSES.length).toBe(0);
  });

  it('COS lens output is absent from result.lensOutputs', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.lensOutputs).not.toHaveProperty('COS');
  });

  it('CFO lens output is absent from result.lensOutputs', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.lensOutputs).not.toHaveProperty('CFO');
  });

  it('CEO lens output is absent from result.lensOutputs', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.lensOutputs).not.toHaveProperty('CEO');
  });

});

describe('pre_mortem — adversarial dispatch order (ADR §3.4)', () => {

  it('emit called with RedTeam agent.complete before Steelman (pre-mortem/index.ts:line 108-109)', async () => {
    const emit = vi.fn();
    await runPlaybook(makeInput(), makeCtx({ emit }));
    const calls = emit.mock.calls;
    const rtIdx = calls.findIndex((c) => c[0]?.payload?.role === 'RedTeam');
    const smIdx = calls.findIndex((c) => c[0]?.payload?.role === 'Steelman');
    expect(rtIdx).toBeGreaterThanOrEqual(0);
    expect(smIdx).toBeGreaterThan(rtIdx);
  });

  it('emit called with Steelman agent.complete (sequential, after Red-Team)', async () => {
    const emit = vi.fn();
    await runPlaybook(makeInput(), makeCtx({ emit }));
    const steelmanCall = emit.mock.calls.find((c) => c[0]?.payload?.role === 'Steelman');
    expect(steelmanCall).toBeDefined();
  });

  it('emit called for RedTeam exactly once', async () => {
    const emit = vi.fn();
    await runPlaybook(makeInput(), makeCtx({ emit }));
    const rtCalls = emit.mock.calls.filter((c) => c[0]?.payload?.role === 'RedTeam');
    expect(rtCalls.length).toBe(1);
  });

  it('emit called for Steelman exactly once', async () => {
    const emit = vi.fn();
    await runPlaybook(makeInput(), makeCtx({ emit }));
    const smCalls = emit.mock.calls.filter((c) => c[0]?.payload?.role === 'Steelman');
    expect(smCalls.length).toBe(1);
  });

});

describe('pre_mortem — stamps (ADR §3.3)', () => {

  it('result.stamps contains ADVERSARIAL_ONLY', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.stamps).toContain('ADVERSARIAL_ONLY');
  });

  it('ADVERSARIAL_ONLY is the first stamp (pre-mortem/index.ts:line 169)', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.stamps[0]).toBe('ADVERSARIAL_ONLY');
  });

});

describe('pre_mortem — Verifier deferred to run-loop (B47 Phase 2)', () => {

  it('result.rigorScore is null at the playbook layer (run-loop runs the real Verifier)', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.rigorScore).toBeNull();
  });

  it('playbook does not emit a CLEAN/DRAFT ship stamp (run-loop recomputes from the real score)', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.stamps).not.toContain('CLEAN');
    expect(result.stamps).not.toContain('DRAFT');
  });

  it('rigorThreshold equals 70 (pre-mortem/index.ts:line 31)', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.rigorThreshold).toBe(70);
  });

});

describe('pre_mortem — output shape (ADR §9)', () => {

  it('result.memoMarkdown includes "Failure Modes" section', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.memoMarkdown).toContain('## Failure Modes');
  });

  it('result.memoMarkdown includes "Steelman Defense" section (early-warning signals within failure modes)', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.memoMarkdown).toContain('## Steelman Defense');
  });

  it('result.memoMarkdown includes "Mitigation Moves" section', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.memoMarkdown).toContain('## Mitigation Moves');
  });

  it('result.memoMarkdown includes "Response Playbook" section', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.memoMarkdown).toContain('## Response Playbook');
  });

  it('result.memoMarkdown contains early-warning signal text within failure modes section', async () => {
    const result = await runPlaybook(makeInput(), makeCtx());
    expect(result.memoMarkdown).toContain('Early-warning signal');
  });

});
