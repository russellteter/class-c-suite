// apps/utility/src/orchestrator/dispatch.ts
// Source: docs/decisions/0004-ch3-runtime-spine.md §4 + §6
// B47: real model client wired via modelClientFromEnv() factory (ADR-0017).
// Lens isolation enforcement + factory-driven model client routing.
import type Database from 'better-sqlite3';
import type { LensRole } from '@c-suite/shared-types/agent-definition';
import type { LensContextBundle } from '@c-suite/shared-types/lens-context-bundle';
import type { LensOutput } from '@c-suite/shared-types/lens-output';
import { buildLensContextBundleSchema } from '@c-suite/shared-types/lens-context-bundle';
import { AGENT_REGISTRY } from '../agents/registry.js';
import { createHooks, type IpcEmit } from './hooks.js';
import { modelClientFromEnv } from '../agents/modelClient.js';
import { loadAgentPrompt } from '../agents/agentPrompts.js';

// ── Stub mode routing ─────────────────────────────────────────────────────────

export type StubMode = 'replay' | 'record' | 'live';

function getStubMode(): StubMode {
  const mode = process.env.STUB_MODE ?? 'replay';
  if (mode === 'replay' || mode === 'record' || mode === 'live') return mode;
  return 'replay';
}

// ── dispatchLens — B3 keystone ────────────────────────────────────────────────

/**
 * Dispatch a single lens agent with runtime lens isolation enforcement.
 *
 * Compile-time: TypeScript generic R prevents passing a wrong-typed bundle.
 * Runtime: buildLensContextBundleSchema(role).parse() throws ZodError (containing
 *   LensIsolationViolation detail) if the bundle contains any other lens's output.
 */
export async function dispatchLens<R extends LensRole>(
  role: R,
  bundle: LensContextBundle<R>,
  db: Database.Database,
  ipcEmit?: IpcEmit,
): Promise<LensOutput> {
  // 1. Runtime lens isolation validation (B3 keystone)
  const schema = buildLensContextBundleSchema(role);
  schema.parse(bundle);  // throws ZodError with LensIsolationViolation on cross-lens leak

  // 2. Create hooks for this invocation
  const emit: IpcEmit = ipcEmit ?? (() => void 0);
  const { onSubagentStart, onSubagentStop } = createHooks({
    runId: bundle.runId,
    role,
    db,
    ipcEmit: emit,
  });

  const mode = getStubMode();

  if (mode === 'replay') {
    // Load fixture from tests/fixtures/lens-outputs/seed-run-001/<role>.json
    const { join } = await import('path');
    const { existsSync, readFileSync } = await import('fs');

    const fixturePaths = [
      join(process.cwd(), 'tests', 'fixtures', 'lens-outputs', 'seed-run-001', `${role}.json`),
      join(process.cwd(), 'tests', 'fixtures', 'lens-outputs', bundle.runId, `${role}.json`),
    ];

    for (const fixturePath of fixturePaths) {
      if (existsSync(fixturePath)) {
        const raw = JSON.parse(readFileSync(fixturePath, 'utf8')) as { output: unknown };
        await onSubagentStart(
          { hook_event_name: 'SubagentStart', agent_id: `${role}-stub`, agent_type: 'lens' },
          'stub',
          {},
        );
        const output = await onSubagentStop(raw.output);
        return output as LensOutput;
      }
    }

    // No fixture found — return minimal stub output
    const stubOutput: LensOutput = {
      role,
      runId: bundle.runId,
      summary: `STUB output for ${role}`,
      positions: [],
      citations: [{ id: `stub-${role}`, text: 'Stub citation', source: 'stub' }],
      confidence: 0.5,
    };
    await onSubagentStart(
      { hook_event_name: 'SubagentStart', agent_id: `${role}-stub`, agent_type: 'lens' },
      'stub',
      {},
    );
    await onSubagentStop(stubOutput);
    return stubOutput;
  }

  // For 'record' and 'live': route through the factory.
  // STUB_MODE=live → RealClaudeClient (Max subscription, ADR-0017).
  // STUB_MODE=record → StubClaudeClient in record mode.
  const def = AGENT_REGISTRY[role];
  const client = modelClientFromEnv();

  await onSubagentStart(
    { hook_event_name: 'SubagentStart', agent_id: `${role}-live`, agent_type: 'lens' },
    'live',
    {},
  );

  // invoke(definition, context) — two-arg signature matching StubClaudeClient and RealClaudeClient.
  // invoke() returns the envelope {structuredOutput, tokensIn, tokensOut}. onSubagentStop
  // safeParses its argument against the lens output schema, so it must receive the UNWRAPPED
  // structuredOutput — passing the raw envelope fails the schema and throws on EVERY live/record
  // invocation (O1). Mirrors the correct unwrap in verifier-runner.ts:69-71.
  // O3: systemPrompt is the real lens prompt (loadAgentPrompt), not the 'STUB — see Ch.4' literal.
  const envelope = await client.invoke(
    { role: def.role, systemPrompt: loadAgentPrompt(role) },
    bundle,
  );

  // O3: inject the authoritative role + runId before validation. The lens prompts emit only the
  // content fields (summary/positions/citations/confidence); the runtime owns role + runId — same
  // trust-known-input idiom as pre-mortem/index.ts ({...parsed.data, proposedAction}). Validation
  // happens INSIDE onSubagentStop (hooks.ts:165), so the injection must precede it.
  const so = envelope.structuredOutput;
  const injected = so && typeof so === 'object' ? { ...(so as Record<string, unknown>), role, runId: bundle.runId } : so;
  const output = await onSubagentStop(injected);
  return output as LensOutput;
}

// ── dispatchSynthesizer — memo production ───────────────────────────────────────
//
// The Synthesizer is NOT a lens: it receives every lens output (no lens-isolation
// guard applies). It produces the memo markdown with [^source-id] citations
// (ADR-0006 §7 step 8). Mirrors dispatchLens's STUB_MODE branching:
//   replay → read the Synthesizer fixture's output.memoMarkdown
//   record/live → modelClientFromEnv().invoke(SynthesizerDefinition, context)

export interface SynthesizerOutput {
  role: 'Synthesizer';
  runId: string;
  memoMarkdown: string;
  executiveSummary?: string;
  keyDecisions?: unknown[];
  citations?: unknown[];
  positionMetadata?: unknown;
}

export async function dispatchSynthesizer(
  runId: string,
  question: string,
  playbookId: string,
  lensOutputs: Record<string, unknown>,
  db: Database.Database,
  ipcEmit?: IpcEmit,
): Promise<SynthesizerOutput> {
  const emit: IpcEmit = ipcEmit ?? (() => void 0);
  const { onSubagentStart, onSubagentStop } = createHooks({
    runId,
    role: 'Synthesizer',
    db,
    ipcEmit: emit,
  });

  const mode = getStubMode();

  if (mode === 'replay') {
    const { join } = await import('path');
    const { existsSync, readFileSync } = await import('fs');

    const fixturePaths = [
      join(process.cwd(), 'tests', 'fixtures', 'lens-outputs', 'seed-run-001', 'Synthesizer.json'),
      join(process.cwd(), 'tests', 'fixtures', 'lens-outputs', runId, 'Synthesizer.json'),
    ];

    for (const fixturePath of fixturePaths) {
      if (existsSync(fixturePath)) {
        const raw = JSON.parse(readFileSync(fixturePath, 'utf8')) as { output: SynthesizerOutput };
        await onSubagentStart(
          { hook_event_name: 'SubagentStart', agent_id: 'Synthesizer-stub', agent_type: 'synthesizer' },
          'stub',
          {},
        );
        const output = (await onSubagentStop(raw.output)) as SynthesizerOutput;
        return { ...output, role: 'Synthesizer', runId };
      }
    }

    // No fixture — minimal honest stub (no fabricated analysis).
    const stub: SynthesizerOutput = {
      role: 'Synthesizer',
      runId,
      memoMarkdown: `# ${playbookId} memo (stub)\n\nNo Synthesizer fixture found for run ${runId}.\n\nQuestion: ${question}`,
      citations: [],
    };
    await onSubagentStart(
      { hook_event_name: 'SubagentStart', agent_id: 'Synthesizer-stub', agent_type: 'synthesizer' },
      'stub',
      {},
    );
    await onSubagentStop(stub);
    return stub;
  }

  // record / live: route through the model-client factory with the assembled context.
  const def = AGENT_REGISTRY['Synthesizer'];
  const client = modelClientFromEnv();

  await onSubagentStart(
    { hook_event_name: 'SubagentStart', agent_id: 'Synthesizer-live', agent_type: 'synthesizer' },
    'live',
    {},
  );

  // O3: real Synthesizer prompt via loadAgentPrompt (not the 'STUB — see Ch.4' literal).
  const envelope = await client.invoke(
    { role: def.role, systemPrompt: loadAgentPrompt('Synthesizer') },
    { runId, question, playbook: playbookId, lensOutputs },
  );

  // Unwrap structuredOutput from the envelope before schema validation in onSubagentStop (O1).
  // O3: inject role + runId BEFORE onSubagentStop — the strict SynthesizerOutputSchema (role
  // literal + runId) validates inside the hook, so the post-spread below alone would be too late.
  const so = envelope.structuredOutput;
  const injected = so && typeof so === 'object' ? { ...(so as Record<string, unknown>), role: 'Synthesizer', runId } : so;
  const output = (await onSubagentStop(injected)) as SynthesizerOutput;
  return { ...output, role: 'Synthesizer', runId };
}
