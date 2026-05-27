// packages/shared-types/src/verifier-input.ts
// Source: docs/decisions/0004-ch3-runtime-spine.md §5.2
// B3 load-bearing: the Verifier receives ONLY structured outputs — never reasoning traces.
import { z } from 'zod';
import { AgentRoleSchema, CitationSchema, LensOutputSchema } from './lens-output.js';
import { RedTeamOutputSchema } from './red-team.js';
import { SteelmanOutputSchema } from './steelman.js';

export const PositionMetadataSchema = z.object({
  positionId: z.string(),
  role: AgentRoleSchema,
  claim: z.string(),
  isQuantitative: z.boolean(),
  namedEntity: z.string().optional(),
  citations: z.array(CitationSchema),
  sourceText: z.string(),
});

export const ToolCallAuditEntrySchema = z.object({
  toolCallId: z.number().int(),
  role: AgentRoleSchema,
  toolName: z.string(),
  inputJson: z.unknown(),
  resultJson: z.unknown(),
  ts: z.number().int(),
});

export const VerifierInputSchema = z.object({
  runId: z.string(),

  // 1. Synthesizer draft memo (structured output only — not reasoning)
  memoMarkdown: z.string().min(1),

  // 2. Structured lens outputs (all 6)
  lensOutputs: z.array(LensOutputSchema).min(6).max(6),

  // 3. Tool-call audit trail (from tool_calls table)
  toolCallAuditTrail: z.array(ToolCallAuditEntrySchema),

  // 4. Position metadata (from Synthesizer positionMetadata)
  positionMetadata: z.array(PositionMetadataSchema).min(1),

  // 5. RedTeam + Steelman structured outputs
  redTeamOutput: RedTeamOutputSchema,
  steelmanOutput: SteelmanOutputSchema,

  // Run metadata
  runPlaybook: z.string(),
  runQuestion: z.string(),
  assembledAt: z.number().int(),
});

export type VerifierInput = z.infer<typeof VerifierInputSchema>;
export type PositionMetadata = z.infer<typeof PositionMetadataSchema>;
export type ToolCallAuditEntry = z.infer<typeof ToolCallAuditEntrySchema>;
