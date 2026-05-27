// tests/unit/playbooks/open-qa.spec.ts
// Source: tasks/ch7-test-brief.md §2d + docs/decisions/0009-ch7-playbooks-home.md §12 + §13.6
// Tests the open_qa playbook: deterministic route + ad-hoc decomposer path.
// Stamp: DECOMPOSED_AD_HOC. Rigor capped at 85.
//
// NOTE: apps/utility/src/playbooks/open-qa/index.ts does not exist yet
// (Runtime sub-agent scope). All cases are it.todo until that file ships.
// DO NOT import the missing module — vitest load-time error would break the suite.

import { describe, it } from 'vitest';

describe('open_qa — deterministic route (ADR §12.2)', () => {

  it.todo('prompt matching regex → returns { kind: "redirect", playbookId } without dispatching lenses');
  it.todo('"what should I do about cash" → redirects to cash_lever');
  it.todo('redirect result does NOT include DECOMPOSED_AD_HOC stamp');
  it.todo('redirect result does NOT trigger lens fan-out');

});

describe('open_qa — ad-hoc decomposer path (ADR §12.2, §12.3)', () => {

  it.todo('unmatched prompt → decomposer fires');
  it.todo('decomposer result lens set used for fan-out');
  it.todo('Verifier runs after fan-out and synthesis');
  it.todo('result.stamps contains DECOMPOSED_AD_HOC');

});

describe('open_qa — rigor capping (ADR §13.6)', () => {

  it.todo('when raw Verifier score is 91, result.rigorScore is 85 (clamped)');
  it.todo('when raw Verifier score is 91, result.rigorRawScore is 91 (uncapped)');
  it.todo('when raw Verifier score is 80 (below cap), result.rigorScore is 80 (not modified)');
  it.todo('both rigorScore and rigorRawScore are present in result when raw > 85');

});
