// apps/utility/src/agents/verifier-runner.ts
// ADR-0005 §4 + §6 — Verifier runner: invokes SDK via stub-harness, parses output via Zod.
// B35 fix: replaces hardcoded rigorScore:85 path in run-loop.ts.
import { z } from 'zod';
import {
  VerifierOutputSchema,
  VerifierContractViolationSchema,
  type VerifierOutput,
} from '@c-suite/shared-types/verifier-output';
import type { VerifierInput } from '@c-suite/shared-types/verifier-input';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../logger.js';

const vlog = createLogger();

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

/**
 * Thrown when the Verifier DELIBERATELY refused to grade — its designed {error,missing} response
 * (prompt lines 18-19/115-116) emitted when it judges a required input missing. Distinct from
 * VerifierOutputContractViolation (genuinely malformed/unparseable output): a refusal is
 * fail-closed-BY-DESIGN, carries the specific missing inputs, and must NOT be retried (a re-invoke
 * sees the same input). Surfacing it as a clear named error replaces the prior confusing
 * "malformed output" zod dump that ignored the existing VerifierResponseSchema union.
 */
export class VerifierRefusedError extends Error {
  constructor(public readonly missing: string[]) {
    super(`Verifier refused to grade — declared missing required input(s): ${missing.join(', ')}`);
    this.name = 'VerifierRefusedError';
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

  // Validate against the FULL response contract (ADR-0005): either a graded VERDICT or the
  // Verifier's DESIGNED input-contract refusal {error,missing} (prompt lines 18-19/115-116).
  // runVerifier previously checked ONLY the verdict schema, so a designed refusal crashed the run
  // with a confusing "malformed output" zod dump — ignoring the VerifierResponseSchema union that
  // exists for exactly this (live-verify finding, build-log 2026-05-29).
  const verdict = VerifierOutputSchema.safeParse(rawResponse);
  if (verdict.success) return verdict.data;

  const refusal = VerifierContractViolationSchema.safeParse(rawResponse);
  if (refusal.success) {
    // Fail closed, clearly. The Verifier refused because it judged a required input missing; a
    // re-invoke would see the same input, so this is NOT retried.
    vlog.error({
      message: 'Verifier refused to grade (designed contract-violation response)',
      missing: refusal.data.missing,
    });
    throw new VerifierRefusedError(refusal.data.missing);
  }

  // Neither a verdict nor a designed refusal → genuinely malformed/truncated output. Fail loud (no
  // fabricated fallback). The RAW model-text sample is logged by RealClaudeClient's recovery warn
  // (commit 9516ede); the extracted object's keys are logged here so the failure is classifiable
  // WITHOUT re-running (truncation vs full-verdict-the-parser-missed vs leak-path refusal).
  vlog.error({
    message: 'Verifier output matched neither the verdict nor the contract-violation shape — failing the run',
    extractedKeys: rawResponse && typeof rawResponse === 'object' ? Object.keys(rawResponse) : [],
    extracted: JSON.stringify(rawResponse).slice(0, 1500),
  });
  throw new VerifierOutputContractViolation(verdict.error);
}
