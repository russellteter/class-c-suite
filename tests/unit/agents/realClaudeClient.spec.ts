// tests/unit/agents/realClaudeClient.spec.ts
// B47: unit tests for RealClaudeClient.
// Uses the injectable _queryFn constructor param — no SDK module mocking needed.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RealClaudeClient,
  ClaudeAuthMissingError,
  ClaudeOutputParseError,
  type QueryFn,
  type SDKMessage,
} from '../../../apps/utility/src/agents/realClaudeClient.js';

// Build a mock QueryFn from a static message list.
function mockQuery(messages: SDKMessage[]): QueryFn {
  return (_args) =>
    (async function* () {
      for (const m of messages) yield m;
    })();
}

const VALID_JSON = JSON.stringify({ recommendation: 'proceed', confidence: 0.9 });

const successMessages = (text: string, tokensIn = 10, tokensOut = 5): SDKMessage[] => [
  { type: 'assistant', message: { content: [{ text }] } },
  { type: 'result', subtype: 'success', usage: { input_tokens: tokensIn, output_tokens: tokensOut } },
];

describe('RealClaudeClient', () => {
  beforeEach(() => {
    vi.stubEnv('CLAUDE_CODE_OAUTH_TOKEN', 'tok_test_abc123');
    vi.stubEnv('ANTHROPIC_API_KEY', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ── Auth guard ─────────────────────────────────────────────────────────────

  it('throws ClaudeAuthMissingError when CLAUDE_CODE_OAUTH_TOKEN is unset', () => {
    vi.stubEnv('CLAUDE_CODE_OAUTH_TOKEN', '');
    expect(() => new RealClaudeClient()).toThrow(ClaudeAuthMissingError);
  });

  it('ClaudeAuthMissingError message mentions setup-token', () => {
    vi.stubEnv('CLAUDE_CODE_OAUTH_TOKEN', '');
    try {
      new RealClaudeClient();
      expect.fail('should have thrown');
    } catch (e) {
      expect((e as ClaudeAuthMissingError).message).toMatch('claude setup-token');
      expect((e as ClaudeAuthMissingError).code).toBe('CLAUDE_AUTH_MISSING');
    }
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('returns structuredOutput + token counts on success', async () => {
    const qfn = mockQuery(successMessages(VALID_JSON, 42, 17));
    const client = new RealClaudeClient(undefined, qfn);
    const result = await client.invoke(
      { role: 'CEO', systemPrompt: 'You are the CEO lens.' },
      { question: 'What should we prioritize?', runId: 'run-001' },
    );

    expect(result.structuredOutput).toEqual({ recommendation: 'proceed', confidence: 0.9 });
    expect(result.tokensIn).toBe(42);
    expect(result.tokensOut).toBe(17);
  });

  it('passes correct options to queryFn — systemPrompt, model, maxTurns, allowedTools', async () => {
    const spyFn = vi.fn().mockImplementation(mockQuery(successMessages(VALID_JSON)));
    const client = new RealClaudeClient(undefined, spyFn);
    await client.invoke(
      { role: 'CEO', systemPrompt: 'sys prompt here' },
      { question: 'test question', runId: 'run-002' },
    );

    expect(spyFn).toHaveBeenCalledOnce();
    const callArgs = spyFn.mock.calls[0][0];
    expect(callArgs.options?.systemPrompt).toBe('sys prompt here');
    expect(callArgs.options?.maxTurns).toBe(1);
    expect(callArgs.options?.allowedTools).toEqual([]);
    expect(callArgs.options?.permissionMode).toBe('dontAsk');
  });

  it('uses claude-sonnet-4-6 as default model', async () => {
    const spyFn = vi.fn().mockImplementation(mockQuery(successMessages(VALID_JSON)));
    const client = new RealClaudeClient(undefined, spyFn);
    await client.invoke({ role: 'CFO', systemPrompt: 'sys' }, { question: 'q', runId: 'r' });

    const callArgs = spyFn.mock.calls[0][0];
    expect(callArgs.options?.model).toBe('claude-sonnet-4-6');
  });

  it('uses claude-opus-4-7 for Verifier role', async () => {
    const spyFn = vi.fn().mockImplementation(mockQuery(successMessages(VALID_JSON)));
    const client = new RealClaudeClient(undefined, spyFn);
    await client.invoke({ role: 'Verifier', systemPrompt: 'sys' }, { question: 'q', runId: 'r' });

    const callArgs = spyFn.mock.calls[0][0];
    expect(callArgs.options?.model).toBe('claude-opus-4-7');
  });

  it('strips ANTHROPIC_API_KEY from env passed to queryFn', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-should-not-be-used');
    const spyFn = vi.fn().mockImplementation(mockQuery(successMessages(VALID_JSON)));
    const client = new RealClaudeClient(undefined, spyFn);
    await client.invoke({ role: 'CEO', systemPrompt: 'sys' }, { question: 'q', runId: 'r' });

    const callArgs = spyFn.mock.calls[0][0];
    const passedEnv = callArgs.options?.env as Record<string, unknown> | undefined;
    expect(passedEnv?.ANTHROPIC_API_KEY).toBeUndefined();
    expect(passedEnv?.CLAUDE_CODE_OAUTH_TOKEN).toBe('tok_test_abc123');
  });

  // ── JSON parse failure ────────────────────────────────────────────────────

  it('throws ClaudeOutputParseError when model returns non-JSON text', async () => {
    const qfn = mockQuery(successMessages('I cannot answer that.'));
    const client = new RealClaudeClient(undefined, qfn);
    await expect(
      client.invoke({ role: 'CEO', systemPrompt: 'sys' }, { question: 'q', runId: 'r' }),
    ).rejects.toThrow(ClaudeOutputParseError);
  });

  it('ClaudeOutputParseError exposes raw text and correct code', async () => {
    const bad = 'not json at all';
    const qfn = mockQuery(successMessages(bad));
    const client = new RealClaudeClient(undefined, qfn);
    try {
      await client.invoke({ role: 'CEO', systemPrompt: 'sys' }, { question: 'q', runId: 'r' });
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ClaudeOutputParseError);
      expect((e as ClaudeOutputParseError).raw).toBe(bad);
      expect((e as ClaudeOutputParseError).code).toBe('CLAUDE_OUTPUT_PARSE_ERROR');
    }
  });

  // ── Token accounting ──────────────────────────────────────────────────────

  it('returns zero tokens when result message has no usage', async () => {
    const qfn = mockQuery([
      { type: 'assistant', message: { content: [{ text: VALID_JSON }] } },
      { type: 'result', subtype: 'success' }, // no usage field
    ]);
    const client = new RealClaudeClient(undefined, qfn);
    const result = await client.invoke(
      { role: 'CEO', systemPrompt: 'sys' },
      { question: 'q', runId: 'r' },
    );
    expect(result.tokensIn).toBe(0);
    expect(result.tokensOut).toBe(0);
  });

  it('concatenates text blocks from multiple assistant message parts', async () => {
    const part1 = '{"foo":';
    const part2 = '"bar"}';
    const qfn = mockQuery([
      { type: 'assistant', message: { content: [{ text: part1 }, { text: part2 }] } },
      { type: 'result', subtype: 'success', usage: { input_tokens: 8, output_tokens: 4 } },
    ]);
    const client = new RealClaudeClient(undefined, qfn);
    const result = await client.invoke({ role: 'CEO', systemPrompt: 'sys' }, { question: 'q', runId: 'r' });
    expect(result.structuredOutput).toEqual({ foo: 'bar' });
  });
});
