// tests/unit/playbooks/decomposer.spec.ts
// Source: tasks/ch7-test-brief.md §1 + docs/decisions/0009-ch7-playbooks-home.md §12
// Tests the ad-hoc decomposer: deterministic regex pass + LLM stub pass.

import { describe, it, expect, vi } from 'vitest';
import { decompose } from '../../../apps/utility/src/playbooks/lib/decomposer.js';
import type { ClaudeClient } from '../../../apps/utility/src/playbooks/lib/decomposer.js';

// Minimal mock Claude client — no need for StubClaudeClient replay mode.
function makeMockClient(structuredOutput: string): ClaudeClient {
  return {
    invoke: vi.fn().mockResolvedValue({
      structuredOutput,
      tokensIn: 10,
      tokensOut: 20,
    }),
  };
}

describe('decomposer — deterministic regex pass (ADR §12.2)', () => {

  it('"what should I do about cash" routes to cash_lever', async () => {
    const client = makeMockClient('{}');
    const result = await decompose('what should I do about cash', client);
    expect(result.kind).toBe('route_to_playbook');
    if (result.kind === 'route_to_playbook') {
      expect(result.playbookId).toBe('cash_lever');
    }
  });

  it('"prep for 1:1 with Sarah" routes to stakeholder_1_1', async () => {
    const client = makeMockClient('{}');
    const result = await decompose('prep for 1:1 with Sarah', client);
    expect(result.kind).toBe('route_to_playbook');
    if (result.kind === 'route_to_playbook') {
      expect(result.playbookId).toBe('stakeholder_1_1');
    }
  });

  it('"prep for my 1:1" routes to stakeholder_1_1', async () => {
    const client = makeMockClient('{}');
    const result = await decompose('prep for my 1:1', client);
    expect(result.kind).toBe('route_to_playbook');
    if (result.kind === 'route_to_playbook') {
      expect(result.playbookId).toBe('stakeholder_1_1');
    }
  });

  it('"quick read on board prep" routes to quick_read', async () => {
    const client = makeMockClient('{}');
    const result = await decompose('quick read on board prep', client);
    expect(result.kind).toBe('route_to_playbook');
    if (result.kind === 'route_to_playbook') {
      expect(result.playbookId).toBe('quick_read');
    }
  });

  it('"pre-mortem on the new pricing launch" routes to pre_mortem', async () => {
    const client = makeMockClient('{}');
    const result = await decompose('pre-mortem on the new pricing launch', client);
    expect(result.kind).toBe('route_to_playbook');
    if (result.kind === 'route_to_playbook') {
      expect(result.playbookId).toBe('pre_mortem');
    }
  });

  it('"should I fire the VP of Product" routes to restructure_decision (decomposer.ts:line 100)', async () => {
    // Regex: /\bshould\s+i\s+(fire|let\s+go|terminate)\b/i — requires "should i", not "should we"
    const client = makeMockClient('{}');
    const result = await decompose('should I fire the VP of Product', client);
    expect(result.kind).toBe('route_to_playbook');
    if (result.kind === 'route_to_playbook') {
      expect(result.playbookId).toBe('restructure_decision');
    }
  });

  it('"gtm realloc plan" routes to gtm_realloc (decomposer.ts:line 73)', async () => {
    // "GTM spend reallocation" does NOT match — regex is /\bgtm\s+realloc/i
    const client = makeMockClient('{}');
    const result = await decompose('gtm realloc plan for Q3', client);
    expect(result.kind).toBe('route_to_playbook');
    if (result.kind === 'route_to_playbook') {
      expect(result.playbookId).toBe('gtm_realloc');
    }
  });

  it('"board narrative for Q3" routes to board_narrative', async () => {
    const client = makeMockClient('{}');
    const result = await decompose('board narrative for Q3', client);
    expect(result.kind).toBe('route_to_playbook');
    if (result.kind === 'route_to_playbook') {
      expect(result.playbookId).toBe('board_narrative');
    }
  });

  it('deterministic route returns { kind: "route_to_playbook", playbookId } without calling LLM', async () => {
    const client = makeMockClient('{}');
    await decompose('cash runway analysis', client);
    expect(client.invoke).not.toHaveBeenCalled();
  });

  it('match is case-insensitive', async () => {
    const client = makeMockClient('{}');
    const result = await decompose('QUICK READ on the situation', client);
    expect(result.kind).toBe('route_to_playbook');
    if (result.kind === 'route_to_playbook') {
      expect(result.playbookId).toBe('quick_read');
    }
  });

});

describe('decomposer — LLM decomposer pass (ADR §12.2)', () => {

  it('LLM pass: returns ad_hoc result with lenses from mock output #1', async () => {
    const client = makeMockClient('{"lenses":["CFO","CEO"],"mcps":["netsuite"],"outputShape":"memo"}');
    const result = await decompose('analyze our operational efficiency', client);
    expect(result.kind).toBe('ad_hoc');
    if (result.kind === 'ad_hoc') {
      expect(result.lenses).toContain('CFO');
      expect(result.outputShape).toBe('memo');
    }
  });

  it('LLM pass: returns ad_hoc result with mcps and outputShape from mock output #2', async () => {
    const client = makeMockClient('{"lenses":["CRO","CMO"],"mcps":["salesforce"],"outputShape":"list"}');
    const result = await decompose('what are our top pipeline opportunities', client);
    expect(result.kind).toBe('ad_hoc');
    if (result.kind === 'ad_hoc') {
      expect(result.mcps).toContain('salesforce');
      expect(result.outputShape).toBe('list');
    }
  });

});

describe('decomposer — edge cases', () => {

  it('empty prompt → deterministic regex does not match → LLM decomposer fires', async () => {
    const client = makeMockClient('{"lenses":["COS","CFO"],"mcps":[],"outputShape":"memo"}');
    const result = await decompose('', client);
    expect(result.kind).toBe('ad_hoc');
    expect(client.invoke).toHaveBeenCalled();
  });

  it('prompt with no keyword match → LLM fires (decomposer.ts:line 198-206)', async () => {
    const client = makeMockClient('{"lenses":["CEO"],"mcps":[],"outputShape":"memo"}');
    const result = await decompose('what is the meaning of life', client);
    expect(result.kind).toBe('ad_hoc');
    expect(client.invoke).toHaveBeenCalled();
  });

  it('LLM returns lenses array with length 0 → proceeds with empty lens fan-out', async () => {
    const client = makeMockClient('{"lenses":[],"mcps":[],"outputShape":"memo"}');
    const result = await decompose('something totally unclassifiable', client);
    expect(result.kind).toBe('ad_hoc');
    if (result.kind === 'ad_hoc') {
      expect(Array.isArray(result.lenses)).toBe(true);
    }
  });

});
