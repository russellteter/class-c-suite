// apps/utility/src/agents/realClaudeClient.ts
// B47 keystone: real model client via @anthropic-ai/claude-agent-sdk query() API.
// Auth: Claude Max subscription ONLY (CLAUDE_CODE_OAUTH_TOKEN). NEVER uses ANTHROPIC_API_KEY.
// ADR-0017.

import type { AgentDefinitionLike, ContextBundleLike, AgentOutputLike } from '@c-suite/stub-harness/stub';
import { createLogger } from '../logger.js';

const log = createLogger();

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

/**
 * Extract a JSON object from model output that wraps it in reasoning preamble or markdown
 * fences. Real models — especially Opus (the Verifier role) — reason in prose and emit the
 * JSON answer LAST. The strict JSON.parse fast path in invoke() stays primary; this is the
 * fallback. Returns undefined if no balanced top-level object parses, so the caller fails
 * loud (ClaudeOutputParseError) rather than coercing prose into a fake structured output.
 * Brace scan is string/escape aware so braces inside string literals don't break balancing.
 */
export function extractJsonObject(text: string): unknown {
  const candidates: string[] = [];
  // Prefer an explicit fenced ```json block when present.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1]) candidates.push(fence[1].trim());
  // Collect every balanced top-level {...} object.
  let depth = 0;
  let start = -1;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (c === '}') {
      if (depth > 0 && --depth === 0 && start >= 0) {
        candidates.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }
  // The model emits its answer last → try candidates from the end.
  for (let i = candidates.length - 1; i >= 0; i--) {
    try {
      return JSON.parse(candidates[i]);
    } catch {
      /* try an earlier candidate */
    }
  }
  return undefined;
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
/**
 * Classify an error as a transient API/network failure worth retrying. Known-fatal error TYPES
 * (auth missing, output parse) never retry regardless of message. We hit "API Error: The socket
 * connection was closed unexpectedly" mid-Synthesizer, which aborted a fully-grounded 10-min run.
 */
function isTransientApiError(err: unknown): boolean {
  if (err instanceof ClaudeOutputParseError || err instanceof ClaudeAuthMissingError) return false;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('socket connection was closed') ||
    msg.includes('socket hang up') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('econnrefused') ||
    msg.includes('fetch failed') ||
    msg.includes('network error') ||
    msg.includes('overloaded') ||
    msg.includes('rate limit') ||
    msg.includes('429') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('504') ||
    msg.includes('timed out') ||
    msg.includes('timeout') ||
    msg.includes('api error') // the SDK surfaces transient upstream failures as "API Error: ..."
  );
}

export class RealClaudeClient {
  constructor(
    private readonly modelOverride?: string,
    /** Injectable for tests — defaults to the real SDK query() at call time. */
    private readonly _queryFn?: QueryFn,
  ) {
    this.assertAuth();
  }

  /**
   * Resilient invoke: retry transient API/network errors with exponential backoff. A single blip
   * on one of a run's ~8 live calls must NOT abort the whole run (the failure that lost a fully
   * grounded run mid-Synthesizer). Non-transient errors (auth, parse) fail loud immediately.
   */
  async invoke(
    definition: AgentDefinitionLike,
    context: ContextBundleLike,
  ): Promise<AgentOutputLike> {
    const MAX_ATTEMPTS = 4;
    let lastErr: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await this._invokeOnce(definition, context);
      } catch (err) {
        lastErr = err;
        if (attempt === MAX_ATTEMPTS || !isTransientApiError(err)) throw err;
        const backoffMs = Math.min(1000 * 2 ** (attempt - 1), 8000); // 1s, 2s, 4s, 8s
        log.warn({
          message: `transient API error — retrying (attempt ${attempt}/${MAX_ATTEMPTS} in ${backoffMs}ms)`,
          role: definition.role,
          err: String(err),
        });
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
    throw lastErr;
  }

  private async _invokeOnce(
    definition: AgentDefinitionLike,
    context: ContextBundleLike,
  ): Promise<AgentOutputLike> {
    const model = this.modelOverride ?? modelForRole(definition.role);
    const queryFn = this._queryFn ?? await loadSdkQuery();

    // Strip ANTHROPIC_API_KEY to prevent pay-per-token billing.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { ANTHROPIC_API_KEY: _stripped, ...safeEnv } = process.env as Record<string, string | undefined>;

    // Bound each attempt so a genuinely STALLED stream (no message, no error) can't hang forever;
    // on timeout we throw "timed out" → isTransientApiError() → invoke() retries (the prior attempt's
    // stream is abandoned). The ceiling MUST exceed legit per-role generation time or it false-aborts
    // healthy calls: the Synthesizer emits a 30-38KB memo and measured 9-17 min end-to-end
    // (run 3ff94c74 = 546s, 00259e19 = 1027s), so a flat 5 min aborted every healthy synth into
    // retry-failure. Role-aware: generous for the big generators, tighter for the fast lens/adversarial
    // calls (which finish in 2-6 min). [follow-up: the 38KB synth is itself too large — trim for UX.]
    const INVOKE_TIMEOUT_MS =
      definition.role === 'Synthesizer' ? 25 * 60 * 1000 :
      definition.role === 'Verifier' ? 20 * 60 * 1000 :
      8 * 60 * 1000;

    // maxTurns is a CEILING, not a target: a role that finalizes in one turn is unaffected by a higher
    // cap. The lens + Synthesizer roles finalize in turn 1 (proven live: org memo c902b7c6 ships a 38KB
    // memo at maxTurns:1). The Handoff "Chief of Staff" brief ends turn 1 non-final and needs a second
    // turn to emit its answer — at maxTurns:1 the SDK throws "Reached maximum number of turns (1)" in
    // ~16s (isolated via tests/e2e/standalone-brief-gen.mjs). allowedTools:[] blocks any tool loop, so a
    // higher Handoff cap cannot trigger tool execution; it only grants the extra generative turn.
    const MAX_TURNS = definition.role === 'Handoff' ? 6 : 1;

    const consume = async (): Promise<{ text: string; usage?: { input_tokens?: number; output_tokens?: number } }> => {
      let text = '';
      let usage: { input_tokens?: number; output_tokens?: number } | undefined;
      for await (const m of queryFn({
        prompt: JSON.stringify(context),
        options: {
          systemPrompt: definition.systemPrompt,
          model,
          allowedTools: [],
          permissionMode: 'dontAsk',
          maxTurns: MAX_TURNS,
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
      return { text, usage };
    };

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`model invocation timed out after ${INVOKE_TIMEOUT_MS}ms (role ${definition.role}) — stalled SDK stream`)),
        INVOKE_TIMEOUT_MS,
      );
    });

    let text: string;
    let usage: { input_tokens?: number; output_tokens?: number } | undefined;
    try {
      const result = await Promise.race([consume(), timeout]);
      text = result.text;
      usage = result.usage;
    } finally {
      if (timer) clearTimeout(timer);
    }

    let structuredOutput: unknown;
    try {
      structuredOutput = JSON.parse(text);
    } catch (err) {
      // Real models (esp. the Opus Verifier) wrap their JSON answer in reasoning preamble
      // or fences. Extract the trailing JSON object before failing; fail loud if none parses.
      const extracted = extractJsonObject(text);
      if (extracted === undefined) throw new ClaudeOutputParseError(text, err);
      log.warn({
        message: 'model output had non-JSON preamble — recovered trailing JSON object',
        role: definition.role,
        model,
        rawLength: text.length,
        // Diagnostic sample of the RAW model text (head+tail) — lets us classify a downstream
        // schema failure as "parser grabbed the wrong object" vs "model emitted the wrong shape".
        sample: text.length > 1400 ? `${text.slice(0, 700)}\n…[snip ${text.length - 1400} chars]…\n${text.slice(-700)}` : text,
      });
      structuredOutput = extracted;
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
