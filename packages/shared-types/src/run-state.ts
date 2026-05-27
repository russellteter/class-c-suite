// packages/shared-types/src/run-state.ts
// Source: docs/decisions/0004-ch3-runtime-spine.md §1.1
// 14 RunState discriminated union kinds.
import type { RunPlan } from './run-plan.js';
import type { LensOutput } from './lens-output.js';
import type { RedTeamOutput } from './red-team.js';
import type { SteelmanOutput } from './steelman.js';
import type { Memo } from './memo.js';
import type { VerifierInput } from './verifier-input.js';
import type { WritebackDraft } from './writeback.js';
import type { RunCritiqueOutput } from './run-critique.js';
import type { AgentRole } from './agent-definition.js';

export type RunFailedError = {
  code: string;
  message: string;
  recoverableAt?: RunState['kind'];
};

export type RunState =
  | { kind: 'bootstrap';           runId: string; playbook: string; question: string }
  | { kind: 'plan-approval';       runId: string; plan: RunPlan }
  | { kind: 'fan-out';             runId: string; lensesInFlight: AgentRole[]; lensesComplete: AgentRole[] }
  | { kind: 'red-team-steelman';   runId: string; lensOutputs: LensOutput[] }
  | { kind: 'synthesizer';         runId: string; redTeam: RedTeamOutput; steelman: SteelmanOutput; lensOutputs: LensOutput[] }
  | { kind: 'verifier';            runId: string; memo: Memo; verifierInput: VerifierInput }
  | { kind: 'shipped-clean';       runId: string; memoPath: string; rigorScore: number }
  | { kind: 'shipped-draft';       runId: string; memoPath: string; failureReasons: string[] }
  | { kind: 'write-back-proposed'; runId: string; drafts: WritebackDraft[] }
  | { kind: 'review';              runId: string; writebackId: string; iteration: number }
  | { kind: 'committed';           runId: string }
  | { kind: 'handoff';             runId: string; handoffPath: string }
  | { kind: 'run-critic';          runId: string; runCritique: RunCritiqueOutput }
  | { kind: 'failed';              runId: string; error: RunFailedError };

/** All 14 kind values — useful for tests and exhaustiveness checks. */
export const ALL_RUNSTATE_KINDS = [
  'bootstrap',
  'plan-approval',
  'fan-out',
  'red-team-steelman',
  'synthesizer',
  'verifier',
  'shipped-clean',
  'shipped-draft',
  'write-back-proposed',
  'review',
  'committed',
  'handoff',
  'run-critic',
  'failed',
] as const satisfies ReadonlyArray<RunState['kind']>;
