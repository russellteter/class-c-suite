// tests/unit/playbooks/stakeholder-1-1.spec.ts
// Source: tasks/ch7-test-brief.md §2a + docs/decisions/0009-ch7-playbooks-home.md §6 + §3.7
// Tests the stakeholder_1_1 playbook module.
// Lens: COS only. Stamp: STAKEHOLDER_SKELETON when file missing; degrade flag when stale.
//
// NOTE: apps/utility/src/playbooks/stakeholder-1-1/index.ts does not exist yet
// (Runtime sub-agent scope). All cases are it.todo until that file ships.
// DO NOT import the missing module — vitest load-time error would break the suite.

import { describe, it } from 'vitest';

describe('stakeholder_1_1 — LENSES constant (ADR §3.2)', () => {

  it.todo('LENSES constant equals [\'COS\']');
  it.todo('LENSES has exactly 1 element');

});

describe('stakeholder_1_1 — file present path (ADR §6)', () => {

  it.todo('reads stakeholder data from vault when file exists');
  it.todo('dispatchLens fires exactly once (COS only)');
  it.todo('result.lensOutputs.COS is non-null');
  it.todo('STAKEHOLDER_SKELETON stamp is absent when file present and fresh');

});

describe('stakeholder_1_1 — file missing path (ADR §3.7, AC-5)', () => {

  it.todo('file missing → skeleton created (createStakeholderSkeleton called once)');
  it.todo('file missing → result.stamps contains STAKEHOLDER_SKELETON');
  it.todo('file missing → result.memoMarkdown includes the skeleton banner text');
  it.todo('file missing → proposed writebacks include a stakeholder-update proposal');
  it.todo('file missing → run continues (does not throw/block)');

});

describe('stakeholder_1_1 — file stale path (ADR §3.7)', () => {

  it.todo('stale >30d → degrade flag present in result (not skeleton)');
  it.todo('stale >30d → no new skeleton created');
  it.todo('stale >30d → result.memoMarkdown includes "last refreshed N days ago" text');

});
