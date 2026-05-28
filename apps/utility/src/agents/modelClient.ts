// apps/utility/src/agents/modelClient.ts
// B47 keystone: factory that selects the model client based on STUB_MODE.
// ADR-0017.
//
// Selection rule:
//   STUB_MODE=replay  (CI default) → StubClaudeClient in replay mode (reads fixtures)
//   STUB_MODE=record               → StubClaudeClient in record mode
//   STUB_MODE=live  (production)   → RealClaudeClient (Max subscription auth)
//   STUB_MODE unset                → same as replay
//
// DO NOT set ANTHROPIC_API_KEY. Production auth = CLAUDE_CODE_OAUTH_TOKEN.

import { StubClaudeClient, type StubMode } from '@c-suite/stub-harness/stub';
import { RealClaudeClient } from './realClaudeClient.js';

export type { StubMode };

export type ModelClient =
  | StubClaudeClient
  | RealClaudeClient;

/**
 * Env-driven factory. Call once at process start (or once per run in tests).
 *
 * @param fixtureDir - Fixture directory for stub modes (default: tests/fixtures/stubs)
 */
export function modelClientFromEnv(
  fixtureDir = 'tests/fixtures/stubs',
): ModelClient {
  const raw = process.env.STUB_MODE ?? 'replay';

  if (raw === 'live') {
    return new RealClaudeClient();
  }

  const mode = (raw === 'record' ? 'record' : 'replay') as StubMode;
  return new StubClaudeClient(mode, fixtureDir);
}
