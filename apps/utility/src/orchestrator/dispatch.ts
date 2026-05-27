// apps/utility/src/orchestrator/dispatch.ts
// Source: docs/decisions/0004-ch3-runtime-spine.md §4 + §6
// Lens isolation enforcement + stub harness wiring.
import type Database from 'better-sqlite3';
import type { LensRole } from '@c-suite/shared-types/agent-definition';
import type { LensContextBundle } from '@c-suite/shared-types/lens-context-bundle';
import type { LensOutput } from '@c-suite/shared-types/lens-output';
import { buildLensContextBundleSchema } from '@c-suite/shared-types/lens-context-bundle';
import { AGENT_REGISTRY } from '../agents/registry.js';
import { createHooks, type IpcEmit } from './hooks.js';

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

  // For 'record' and 'live': use the real stub harness client
  const def = AGENT_REGISTRY[role];
  // Dynamic import to avoid bundling issues in non-test environments
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stubModule = await import('@c-suite/stub-harness/stub' as any);
  const client = (stubModule as { stubFromEnv: () => { invoke: (opts: unknown) => Promise<unknown> } }).stubFromEnv();

  await onSubagentStart(
    { hook_event_name: 'SubagentStart', agent_id: `${role}-live`, agent_type: 'lens' },
    'live',
    {},
  );

  const rawOutput = await client.invoke({
    systemPrompt: def.systemPrompt,
    input: bundle,
    model: def.modelHint,
    toolAllowlist: def.toolAllowlist,
  });

  const output = await onSubagentStop(rawOutput);
  return output as LensOutput;
}
