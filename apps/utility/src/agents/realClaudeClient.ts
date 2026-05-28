// apps/utility/src/agents/realClaudeClient.ts
// B47 keystone: real model client via @anthropic-ai/claude-agent-sdk query() API.
// Auth: Claude Max subscription ONLY (CLAUDE_CODE_OAUTH_TOKEN). NEVER uses ANTHROPIC_API_KEY.
// ADR-0017.

import type { AgentDefinitionLike, ContextBundleLike, AgentOutputLike } from '@c-suite/stub-harness/stub';

// ── SDK type (narrow — only what we need) ─────────────────────────────────────

export interface SDKAssistantMessage {
  type: 'assistant';
  message?: { content?: Array<{ text?: string } | Record<string, unknown>> };
}

export interface SDKResultMessage {
  type: 'result';
  subtype?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
}

export type SDKMessage = SDKAssistantMessage | SDKResultMessage | { type: string };

export type QueryFn = (args: {
  prompt: string;
  options?: {
    systemPrompt?: string;
    model?: string;
    allowedTools?: string[];
    permissionMode?: string;
    maxTurns?: number;
    env?: Record<string, string | undefined>;
  };
}) => AsyncIterable<SDKMessage>;

// ── Typed errors ──────────────────────────────────────────────────────────────

/** Thrown when neither CLAUDE_CODE_OAUTH_TOKEN nor a logged-in session is present. */
export class ClaudeAuthMissingError extends Error {
  readonly code = 'CLAUDE_AUTH_MISSING' as const;
  constructor() {
    super(
      'No Claude authentication found. Run `claude setup-token` and set CLAUDE_CODE_OAUTH_TOKEN in your environment (or in apps/main/.env.local). Do NOT set ANTHROPIC_API_KEY — this app runs on your Claude Max subscription, not pay-per-token billing.',
    );
    this.name = 'ClaudeAuthMissingError';
  }
}

/** Thrown when the model's text output cannot be parsed as JSON. */
export class ClaudeOutputParseError extends Error {
  readonly code = 'CLAUDE_OUTPUT_PARSE_ERROR' as const;
  constructor(
    public readonly raw: string,
    cause: unknown,
  ) {
    super(
      `Model output was not valid JSON. Raw (first 500 chars): ${raw.slice(0, 500)}`,
      { cause },
    );
    this.name = 'ClaudeOutputParseError';
  }
}

// ── Model policy (cost-aware) ─────────────────────────────────────────────────
// DEFAULT: claude-sonnet-4-6. Reserve claude-opus-4-7 for Verifier-class roles.

const ROLE_MODEL_MAP: Record<string, string> = {
  Verifier: 'claude-opus-4-7',
};

function modelForRole(role: string, hint?: string): string {
  return ROLE_MODEL_MAP[role] ?? hint ?? 'claude-sonnet-4-6';
}

// ── Real SDK query loader (lazy, so tests can avoid importing the real SDK) ───

let _sdkQuery: QueryFn | undefined;

async function loadSdkQuery(): Promise<QueryFn> {
  if (!_sdkQuery) {
    const sdk = await import('@anthropic-ai/claude-agent-sdk');
    _sdkQuery = sdk.query as QueryFn;
  }
  return _sdkQuery;
}

// ── RealClaudeClient ──────────────────────────────────────────────────────────

/**
 * Real model client. Uses the Claude Agent SDK query() API against the caller's
 * Claude Max subscription. Auth comes from CLAUDE_CODE_OAUTH_TOKEN.
 * ANTHROPIC_API_KEY is stripped from the env passed to the SDK to prevent
 * accidental pay-per-token billing.
 *
 * Accepts an optional queryFn for testing — pass a mock generator here instead
 * of mocking the entire SDK module.
 *
 * Matches the StubClaudeClient.invoke() interface exactly.
 */
export class RealClaudeClient {
  constructor(
    private readonly modelOverride?: string,
    /** Injectable for tests — defaults to the real SDK query() at call time. */
    private readonly _queryFn?: QueryFn,
  ) {
    this.assertAuth();
  }

  async invoke(
    definition: AgentDefinitionLike,
    context: ContextBundleLike,
  ): Promise<AgentOutputLike> {
    const model = this.modelOverride ?? modelForRole(definition.role);
    const queryFn = this._queryFn ?? await loadSdkQuery();

    // Strip ANTHROPIC_API_KEY to prevent pay-per-token billing.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { ANTHROPIC_API_KEY: _stripped, ...safeEnv } = process.env as Record<string, string | undefined>;

    let text = '';
    let usage: { input_tokens?: number; output_tokens?: number } | undefined;

    for await (const m of queryFn({
      prompt: JSON.stringify(context),
      options: {
        systemPrompt: definition.systemPrompt,
        model,
        allowedTools: [],
        permissionMode: 'dontAsk',
        maxTurns: 1,
        env: safeEnv,
      },
    })) {
      if (m.type === 'assistant') {
        const am = m as SDKAssistantMessage;
        if (am.message?.content) {
          for (const b of am.message.content) {
            if (b && 'text' in b && typeof (b as { text?: string }).text === 'string') {
              text += (b as { text: string }).text;
            }
          }
        }
      }
      if (m.type === 'result') {
        const rm = m as SDKResultMessage;
        if (rm.usage) usage = rm.usage;
      }
    }

    let structuredOutput: unknown;
    try {
      structuredOutput = JSON.parse(text);
    } catch (err) {
      throw new ClaudeOutputParseError(text, err);
    }

    return {
      structuredOutput,
      tokensIn: usage?.input_tokens ?? 0,
      tokensOut: usage?.output_tokens ?? 0,
    };
  }

  private assertAuth(): void {
    const hasOAuth = Boolean(process.env.CLAUDE_CODE_OAUTH_TOKEN);
    if (!hasOAuth) {
      throw new ClaudeAuthMissingError();
    }
  }
}
