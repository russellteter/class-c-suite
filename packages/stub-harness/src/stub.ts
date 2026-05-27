// packages/stub-harness/src/stub.ts
// Source: docs/architecture/delivery.md §Stub-model harness (lines 152-176).
// CI default: STUB_MODE=replay. Developer runs `live` and can `record` new
// fixtures. Fixtures persist under tests/fixtures/.

import { createHash } from 'crypto';
import * as path from 'path';
import * as fs from 'fs/promises';

export type StubMode = 'live' | 'record' | 'replay';

// AgentDefinition + ContextBundle + AgentOutput types imported from
// packages/shared-types when Ch.3 lands. For Ch.0, declare structural-only:
export interface AgentDefinitionLike { role: string; systemPrompt: string; }
export interface ContextBundleLike { question: string; [k: string]: unknown; }
export interface AgentOutputLike { structuredOutput: unknown; tokensIn: number; tokensOut: number; }

export class StubClaudeClient {
  constructor(
    private readonly mode: StubMode,
    private readonly fixtureDir: string,
  ) {}

  async invoke(definition: AgentDefinitionLike, context: ContextBundleLike): Promise<AgentOutputLike> {
    const key = this.stableHash(definition.role, context);

    if (this.mode === 'live') {
      // Ch.3 wires the real SDK; until then, throw to make accidental live
      // calls in tests obvious.
      throw new Error('StubMode=live not wired in Ch.0; Runtime dispatch implements at Ch.3');
    }

    if (this.mode === 'record') {
      throw new Error('StubMode=record not wired in Ch.0; Runtime dispatch implements at Ch.3');
    }

    // replay (CI default)
    return this.loadFixture(key);
  }

  private stableHash(role: string, context: ContextBundleLike): string {
    const h = createHash('sha256');
    h.update(role);
    h.update(JSON.stringify(context, Object.keys(context).sort()));
    return h.digest('hex').slice(0, 16);
  }

  private async loadFixture(key: string): Promise<AgentOutputLike> {
    const p = path.join(this.fixtureDir, `${key}.json`);
    const raw = await fs.readFile(p, 'utf8');
    return JSON.parse(raw) as AgentOutputLike;
  }
}

/** Env-driven factory used by Ch.3+ wiring. */
export function stubFromEnv(fixtureDir = 'tests/fixtures/stubs'): StubClaudeClient {
  const m = (process.env.STUB_MODE ?? 'replay') as StubMode;
  if (m !== 'live' && m !== 'record' && m !== 'replay') {
    throw new Error(`Invalid STUB_MODE: ${m}`);
  }
  return new StubClaudeClient(m, fixtureDir);
}
