// tests/unit/agents/modelClient.spec.ts
// B47: factory selection tests — asserts STUB_MODE env drives client type.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { modelClientFromEnv } from '../../../apps/utility/src/agents/modelClient.js';
import { StubClaudeClient } from '../../../packages/stub-harness/src/stub.js';

// For the live-mode test, we check that the returned object is NOT a StubClaudeClient
// and that RealClaudeClient was called. We need to mock it so the constructor
// doesn't throw ClaudeAuthMissingError (no real token in test env).
vi.mock('../../../apps/utility/src/agents/realClaudeClient.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../apps/utility/src/agents/realClaudeClient.js')>();
  return {
    ...original,
    RealClaudeClient: vi.fn().mockImplementation(() => ({
      invoke: vi.fn(),
      __isRealClaudeClient: true,
    })),
  };
});

import { RealClaudeClient } from '../../../apps/utility/src/agents/realClaudeClient.js';

describe('modelClientFromEnv()', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.mocked(RealClaudeClient).mockClear();
  });

  it('returns StubClaudeClient in replay mode when STUB_MODE=replay', () => {
    vi.stubEnv('STUB_MODE', 'replay');
    const client = modelClientFromEnv();
    expect(client).toBeInstanceOf(StubClaudeClient);
  });

  it('returns StubClaudeClient when STUB_MODE is unset (defaults to replay)', () => {
    delete process.env.STUB_MODE;
    const client = modelClientFromEnv();
    expect(client).toBeInstanceOf(StubClaudeClient);
  });

  it('returns StubClaudeClient in record mode when STUB_MODE=record', () => {
    vi.stubEnv('STUB_MODE', 'record');
    const client = modelClientFromEnv();
    expect(client).toBeInstanceOf(StubClaudeClient);
  });

  it('instantiates RealClaudeClient when STUB_MODE=live', () => {
    vi.stubEnv('STUB_MODE', 'live');
    modelClientFromEnv();
    expect(vi.mocked(RealClaudeClient)).toHaveBeenCalledOnce();
  });

  it('result is NOT a StubClaudeClient when STUB_MODE=live', () => {
    vi.stubEnv('STUB_MODE', 'live');
    const client = modelClientFromEnv();
    expect(client).not.toBeInstanceOf(StubClaudeClient);
  });

  it('uses provided fixtureDir for stub mode', () => {
    vi.stubEnv('STUB_MODE', 'replay');
    expect(() => modelClientFromEnv('/custom/fixtures')).not.toThrow();
  });

  beforeEach(() => {
    // Restore STUB_MODE after any delete
    vi.stubEnv('STUB_MODE', 'replay');
  });
});
