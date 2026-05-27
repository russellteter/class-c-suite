// packages/shared-types/src/run-state-schema.ts
// Source: docs/decisions/0004-ch3-runtime-spine.md §1.2
// Zod runtime schema mirrors the RunState union for SQLite serialisation/deserialisation.
import { z } from 'zod';
import { RunPlanSchema } from './run-plan.js';
import { AgentRoleSchema, LensOutputSchema } from './lens-output.js';
import { RedTeamOutputSchema } from './red-team.js';
import { SteelmanOutputSchema } from './steelman.js';
import { MemoSchema } from './memo.js';
import { VerifierInputSchema } from './verifier-input.js';
import { WritebackDraftSchema } from './writeback.js';
import { RunCritiqueOutputSchema } from './run-critique.js';

export const RunFailedErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  recoverableAt: z.string().optional(),
});

export const RunStateSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('bootstrap'),           runId: z.string(), playbook: z.string(), question: z.string() }),
  z.object({ kind: z.literal('plan-approval'),       runId: z.string(), plan: RunPlanSchema }),
  z.object({ kind: z.literal('fan-out'),             runId: z.string(), lensesInFlight: z.array(AgentRoleSchema), lensesComplete: z.array(AgentRoleSchema) }),
  z.object({ kind: z.literal('red-team-steelman'),   runId: z.string(), lensOutputs: z.array(LensOutputSchema) }),
  z.object({ kind: z.literal('synthesizer'),         runId: z.string(), redTeam: RedTeamOutputSchema, steelman: SteelmanOutputSchema, lensOutputs: z.array(LensOutputSchema) }),
  z.object({ kind: z.literal('verifier'),            runId: z.string(), memo: MemoSchema, verifierInput: VerifierInputSchema }),
  z.object({ kind: z.literal('shipped-clean'),       runId: z.string(), memoPath: z.string(), rigorScore: z.number() }),
  z.object({ kind: z.literal('shipped-draft'),       runId: z.string(), memoPath: z.string(), failureReasons: z.array(z.string()) }),
  z.object({ kind: z.literal('write-back-proposed'), runId: z.string(), drafts: z.array(WritebackDraftSchema), iteration: z.number().int().min(0) }),
  z.object({ kind: z.literal('review'),              runId: z.string(), writebackId: z.string(), iteration: z.number().int().min(0) }),
  z.object({ kind: z.literal('committed'),           runId: z.string() }),
  z.object({ kind: z.literal('handoff'),             runId: z.string(), handoffPath: z.string() }),
  z.object({ kind: z.literal('run-critic'),          runId: z.string(), runCritique: RunCritiqueOutputSchema }),
  z.object({ kind: z.literal('failed'),              runId: z.string(), error: RunFailedErrorSchema }),
]);
