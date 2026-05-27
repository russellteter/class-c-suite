// tests/unit/playbooks/pre-mortem.spec.ts
// Source: tasks/ch7-test-brief.md §2b + docs/decisions/0009-ch7-playbooks-home.md §9 + §3.4
// Tests the pre_mortem playbook module.
// Pipeline: adversarial-first; lenses skipped; Red-Team first, Steelman second; Verifier still runs.
// Stamp: ADVERSARIAL_ONLY.
//
// NOTE: apps/utility/src/playbooks/pre-mortem/index.ts does not exist yet
// (Runtime sub-agent scope). All cases are it.todo until that file ships.
// DO NOT import the missing module — vitest load-time error would break the suite.

import { describe, it } from 'vitest';

describe('pre_mortem — lens fan-out skipped (ADR §3.4)', () => {

  it.todo('dispatchLens is never called for any of the 6 strategic lenses');
  it.todo('COS lens output is absent from result.lensOutputs');
  it.todo('CFO lens output is absent from result.lensOutputs');
  it.todo('CEO lens output is absent from result.lensOutputs');

});

describe('pre_mortem — adversarial dispatch order (ADR §3.4)', () => {

  it.todo('Red-Team dispatched before Steelman');
  it.todo('Steelman dispatched after Red-Team (sequential, not parallel)');
  it.todo('dispatchRedTeam called exactly once');
  it.todo('dispatchSteelman called exactly once');

});

describe('pre_mortem — stamps (ADR §3.3)', () => {

  it.todo('result.stamps contains ADVERSARIAL_ONLY');
  it.todo('ADVERSARIAL_ONLY is the primary/leading stamp');

});

describe('pre_mortem — Verifier still runs (ADR §3.4)', () => {

  it.todo('result.rigorScore is non-null (Verifier ran)');
  it.todo('result.rigorScore is a number between 0 and 100');
  it.todo('rigorThreshold equals 70');

});

describe('pre_mortem — output shape (ADR §9)', () => {

  it.todo('result.memoMarkdown includes failure modes section');
  it.todo('result.memoMarkdown includes early-warning signals section');
  it.todo('result.memoMarkdown includes mitigation moves section');
  it.todo('result.memoMarkdown includes response playbook section');

});
