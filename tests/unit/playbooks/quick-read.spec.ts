// tests/unit/playbooks/quick-read.spec.ts
// Source: tasks/ch7-test-brief.md §2c + docs/decisions/0009-ch7-playbooks-home.md §10 + §3.5
// Tests the quick_read playbook module.
// Pipeline: all 6 lenses in parallel, Verifier bypassed, no writebacks.
// Stamp: QUICK_READ. rigorScore: null.
//
// NOTE: apps/utility/src/playbooks/quick-read/index.ts does not exist yet
// (Runtime sub-agent scope). All cases are it.todo until that file ships.
// DO NOT import the missing module — vitest load-time error would break the suite.

import { describe, it } from 'vitest';

describe('quick_read — lens dispatch (ADR §3.2, §3.5)', () => {

  it.todo('all 6 lenses dispatched in parallel (Promise.all or equivalent)');
  it.todo('COS lens dispatched');
  it.todo('CFO lens dispatched');
  it.todo('CRO lens dispatched');
  it.todo('CMO lens dispatched');
  it.todo('CPO lens dispatched');
  it.todo('CEO lens dispatched');
  it.todo('exactly 6 dispatchLens calls total');

});

describe('quick_read — Verifier bypassed (ADR §3.5, AC-6)', () => {

  it.todo('Verifier is NOT called (dispatchVerifier call count is 0)');
  it.todo('result.rigorScore is null');
  it.todo('shipStatus value is "quick"');

});

describe('quick_read — writebacks disabled (ADR §3.5, AC-6)', () => {

  it.todo('result.proposedWritebacks is an empty array');

});

describe('quick_read — stamps (ADR §3.3)', () => {

  it.todo('result.stamps contains QUICK_READ');

});

describe('quick_read — memo section order (ADR §10)', () => {

  it.todo('memo section order is COS / CFO / CRO / CMO / CPO / CEO');
  it.todo('each section appears in result.memoMarkdown in the correct sequence');

});
