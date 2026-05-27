// apps/utility/src/agents/verifier-runner.ts
// ADR-0005 §4 + §6 — Verifier runner: invokes SDK via stub-harness, parses output via Zod.
// B35 fix: replaces hardcoded rigorScore:85 path in run-loop.ts.
import { z } from 'zod';
import {
  VerifierOutputSchema,
  type VerifierOutput,
} from '@c-suite/shared-types/verifier-output';
import type { VerifierInput } from '@c-suite/shared-types/verifier-input';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname in ESM context
const _dirname =
  typeof __dirname !== 'undefined'
    ? __dirname
    : dirname(fileURLToPath(import.meta.url));

const VERIFIER_PROMPT_PATH = join(_dirname, '../prompts/Verifier.prompt.md');

// ── Invoker interface (dependency-injected for testability) ──────────────────

export interface VerifierInvoker {
  /**
   * Invoke the Verifier role with the given messages.
   * Returns the raw parsed JSON from the model (envelope.structuredOutput or raw).
   */
  invoke(opts: {
    role: string;
    systemPrompt: string;
    userMessage: string;
    modelHint?: string;
  }): Promise<unknown>;
}

// ── StubClaudeClient adapter ─────────────────────────────────────────────────

/**
 * Thin adapter that wraps StubClaudeClient as a VerifierInvoker.
 * Extracts `.structuredOutput` from the AgentOutputLike envelope.
 */
export class StubVerifierInvoker implements VerifierInvoker {
  constructor(
    private readonly client: {
      invoke(
        definition: { role: string; systemPrompt: string },
        context: { question: string; [k: string]: unknown },
      ): Promise<{ structuredOutput: unknown; tokensIn: number; tokensOut: number }>;
    },
    private readonly runId: string,
    private readonly runPlaybook: string,
    private readonly runQuestion: string,
  ) {}

  async invoke(opts: {
    role: string;
    systemPrompt: string;
    userMessage: string;
    modelHint?: string;
  }): Promise<unknown> {
    const definition = { role: opts.role, systemPrompt: opts.systemPrompt };
    const context = {
      question: this.runQuestion,
      playbook: this.runPlaybook,
      runId: this.runId,
      userMessage: opts.userMessage,
    };
    const envelope = await this.client.invoke(definition, context);
    // VerifierOutput lives in structuredOutput — not the envelope itself
    return envelope.structuredOutput;
  }
}

// ── Contract violation error ─────────────────────────────────────────────────

export class VerifierOutputContractViolation extends Error {
  constructor(public readonly zodError: z.ZodError) {
    super(`Verifier returned malformed output: ${zodError.message}`);
    this.name = 'VerifierOutputContractViolation';
  }
}

// ── runVerifier ───────────────────────────────────────────────────────────────

export type RunVerifierOpts = {
  invoker: VerifierInvoker;
  modelHint?: 'opus-4-7' | 'sonnet-4-6';
  /** Override prompt path for testing */
  promptPath?: string;
};

/**
 * Invokes the Verifier role against the given VerifierInput.
 * Parses and validates the output via VerifierOutputSchema (ADR-0005 §4.3).
 * Throws VerifierOutputContractViolation on schema mismatch.
 */
export async function runVerifier(
  input: VerifierInput,
  opts: RunVerifierOpts,
): Promise<VerifierOutput> {
  const promptPath = opts.promptPath ?? VERIFIER_PROMPT_PATH;
  const systemPrompt = readFileSync(promptPath, 'utf8');

  const userMessage = JSON.stringify({
    memo_markdown: input.memoMarkdown,
    lens_outputs: input.lensOutputs,
    tool_call_audit_trail: input.toolCallAuditTrail,
    position_metadata: input.positionMetadata,
    red_team_output: input.redTeamOutput,
    steelman_output: input.steelmanOutput,
    run_playbook: input.runPlaybook,
    run_question: input.runQuestion,
  });

  const rawResponse = await opts.invoker.invoke({
    role: 'Verifier',
    systemPrompt,
    userMessage,
    modelHint: opts.modelHint ?? 'opus-4-7',
  });

  const parsed = VerifierOutputSchema.safeParse(rawResponse);
  if (!parsed.success) {
    throw new VerifierOutputContractViolation(parsed.error);
  }
  return parsed.data;
}
