// tests/unit/playbooks/decomposer.spec.ts
// Source: tasks/ch7-test-brief.md §1 + docs/decisions/0009-ch7-playbooks-home.md §12
// Tests the ad-hoc decomposer: deterministic regex pass + LLM stub pass.
//
// NOTE: apps/utility/src/playbooks/lib/decomposer.ts does not exist yet
// (Runtime sub-agent scope). The brief instructs: read regex set from source,
// do not invent patterns. All cases are it.todo until that file ships.
// DO NOT import the missing module — vitest load-time error would break the suite.

import { describe, it } from 'vitest';

describe('decomposer — deterministic regex pass (ADR §12.2)', () => {

  it.todo('"what should I do about cash" routes to cash_lever');
  it.todo('"prep for 1:1 with Sarah" routes to stakeholder_1_1');
  it.todo('"prep for my 1:1" routes to stakeholder_1_1');
  it.todo('"quick read on board prep" routes to quick_read');
  it.todo('"pre-mortem on the new pricing launch" routes to pre_mortem');
  it.todo('"should we fire the VP of Product" routes to restructure_decision');
  it.todo('"GTM spend reallocation" routes to gtm_realloc');
  it.todo('"board narrative for Q3" routes to board_narrative');

  it.todo('deterministic route returns { kind: "redirect", playbookId } without dispatching lenses');
  it.todo('match is case-insensitive');

});

describe('decomposer — LLM decomposer pass (ADR §12.2, StubClaudeClient)', () => {

  it.todo('LLM pass: returns { lenses, mcps, outputShape } from seeded StubClaudeClient mock output #1');
  it.todo('LLM pass: returns { lenses, mcps, outputShape } from seeded StubClaudeClient mock output #2');

});

describe('decomposer — edge cases', () => {

  it.todo('empty prompt → deterministic regex does not match → LLM decomposer fires');
  it.todo('prompt with no keyword match → deterministic regex returns null → LLM fires');
  it.todo('LLM returns lenses array with length 0 → proceeds with empty lens fan-out');

});
