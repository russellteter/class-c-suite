// apps/utility/src/verifier-assembler.ts
// Source: docs/decisions/0004-ch3-runtime-spine.md §5.3
// B3 load-bearing: assembles VerifierInput from SQLite. FAILS CLOSED.
import type Database from 'better-sqlite3';
import type { RunState } from '@c-suite/shared-types/run-state';
import {
  VerifierInputSchema,
  PositionMetadataSchema,
  type VerifierInput,
  type ToolCallAuditEntry,
} from '@c-suite/shared-types/verifier-input';
import { LensOutputSchema } from '@c-suite/shared-types/lens-output';
import { RedTeamOutputSchema } from '@c-suite/shared-types/red-team';
import { SteelmanOutputSchema } from '@c-suite/shared-types/steelman';

// ── Contract violation error ──────────────────────────────────────────────────

export class VerifierInputContractViolation extends Error {
  constructor(public readonly missing: string[]) {
    super(`VerifierInputContractViolation: missing required fields: ${missing.join(', ')}`);
    this.name = 'VerifierInputContractViolation';
  }
}

// ── Internal row shapes ───────────────────────────────────────────────────────

interface OutputRow {
  output_json: string;
}

interface SynthesizerOutputData {
  memoMarkdown: string;
  positionMetadata?: unknown[];
  [key: string]: unknown;
}

// ── buildVerifierInput ────────────────────────────────────────────────────────

/**
 * Assembles VerifierInput from SQLite + in-memory run state.
 *
 * FAILS CLOSED: throws VerifierInputContractViolation if any required field is missing.
 * Run does NOT proceed to Verifier on violation.
 *
 * Reads ONLY output_json fields — never reasoning traces, partial messages, or raw streams.
 * This is the structural guarantee of B3 (no reasoning traces in VerifierInput).
 */
export function buildVerifierInput(
  runId: string,
  state: RunState & { kind: 'synthesizer' },
  db: Database.Database,
): VerifierInput | never {
  const missing: string[] = [];

  // 1. Synthesizer draft memo
  const synthRow = db.prepare(
    `SELECT output_json FROM agent_invocations
     WHERE run_id = ? AND role = 'Synthesizer' AND status = 'completed'`
  ).get(runId) as OutputRow | undefined;

  if (!synthRow) missing.push('synthesizer.output');

  const synthData: SynthesizerOutputData | null = synthRow
    ? (JSON.parse(synthRow.output_json) as SynthesizerOutputData)
    : null;

  // 2. Lens structured outputs (all 6)
  const lensRows = db.prepare(
    `SELECT role, output_json FROM agent_invocations
     WHERE run_id = ? AND role IN ('CEO','CFO','CRO','CMO','CPO','COS') AND status = 'completed'`
  ).all(runId) as Array<{ role: string; output_json: string }>;

  if (lensRows.length < 6) {
    const completedRoles = lensRows.map(r => r.role);
    const missing6 = (['CEO', 'CFO', 'CRO', 'CMO', 'CPO', 'COS'] as const)
      .filter(r => !completedRoles.includes(r));
    missing.push(...missing6.map(r => `lens.${r}`));
  }

  // 3. Tool-call audit trail (empty list is valid)
  const toolCallRows = db.prepare(
    `SELECT id as toolCallId, role, tool_name as toolName,
            input_json as inputJson, result_json as resultJson, ts
     FROM tool_calls WHERE run_id = ? ORDER BY ts ASC`
  ).all(runId) as Array<{
    toolCallId: number;
    role: string;
    toolName: string;
    inputJson: string;
    resultJson: string;
    ts: number;
  }>;

  // 4. Position metadata — required from Synthesizer output
  if (!synthData?.positionMetadata || (synthData.positionMetadata as unknown[]).length === 0) {
    if (synthData) {
      missing.push('synthesizer.positionMetadata');
    }
  }

  // 5. RedTeam + Steelman
  const redTeamRow = db.prepare(
    `SELECT output_json FROM agent_invocations
     WHERE run_id = ? AND role = 'RedTeam' AND status = 'completed'`
  ).get(runId) as OutputRow | undefined;

  const steelmanRow = db.prepare(
    `SELECT output_json FROM agent_invocations
     WHERE run_id = ? AND role = 'Steelman' AND status = 'completed'`
  ).get(runId) as OutputRow | undefined;

  if (!redTeamRow) missing.push('redTeam.output');
  if (!steelmanRow) missing.push('steelman.output');

  // Load run metadata
  const runRow = db.prepare(
    `SELECT playbook, question FROM runs WHERE run_id = ?`
  ).get(runId) as { playbook: string; question: string } | undefined;

  // FAIL CLOSED — throw on any missing required input
  if (missing.length > 0) {
    throw new VerifierInputContractViolation(missing);
  }

  // Parse all structured outputs through their schemas
  const lensOutputs = lensRows.map(r => LensOutputSchema.parse(JSON.parse(r.output_json)));
  const redTeamOutput = RedTeamOutputSchema.parse(JSON.parse(redTeamRow!.output_json));
  const steelmanOutput = SteelmanOutputSchema.parse(JSON.parse(steelmanRow!.output_json));

  const positionMetadata = Array.isArray(synthData!.positionMetadata)
    ? (synthData!.positionMetadata as unknown[]).map(pm => PositionMetadataSchema.parse(pm))
    : [];

  const toolCallAuditTrail: ToolCallAuditEntry[] = toolCallRows.map(r => ({
    toolCallId: r.toolCallId,
    role: r.role as ToolCallAuditEntry['role'],
    toolName: r.toolName,
    inputJson: JSON.parse(r.inputJson),
    resultJson: JSON.parse(r.resultJson),
    ts: r.ts,
  }));

  const rawInput: VerifierInput = {
    runId,
    memoMarkdown: synthData!.memoMarkdown,
    lensOutputs: lensOutputs as VerifierInput['lensOutputs'],
    toolCallAuditTrail,
    positionMetadata: positionMetadata as VerifierInput['positionMetadata'],
    redTeamOutput,
    steelmanOutput,
    runPlaybook: runRow?.playbook ?? '',
    runQuestion: runRow?.question ?? '',
    assembledAt: Math.floor(Date.now() / 1000),
  };

  // Final schema validation — catches any field shape drift
  return VerifierInputSchema.parse(rawInput);
}
