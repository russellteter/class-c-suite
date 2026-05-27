// packages/shared-types/src/lens-output.ts
// Source: docs/decisions/0004-ch3-runtime-spine.md §2.1–§2.6
// Shared output schema for the 6 strategic-lens agents (CEO/CFO/CRO/CMO/CPO/COS).
import { z } from 'zod';

export const AgentRoleSchema = z.enum([
  'CEO', 'CFO', 'CRO', 'CMO', 'CPO', 'COS',
  'RedTeam', 'Steelman', 'Synthesizer', 'Verifier',
  'Handoff', 'RunCritic',
]);

export const CitationSchema = z.object({
  id: z.string(),
  text: z.string(),
  source: z.string(),
  page: z.number().int().optional(),
});

export const PositionSchema = z.object({
  positionId: z.string(),
  claim: z.string(),
  isQuantitative: z.boolean().optional(),
  citations: z.array(CitationSchema),
  sourceText: z.string(),
});

export const QuantitativeAssertionSchema = z.object({
  claim: z.string(),
  value: z.union([z.number(), z.string()]),
  unit: z.string().optional(),
  sourceText: z.string().optional(),
});

export const ContextDocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  source: z.string().optional(),
});

// Base lens output shared by CEO/CRO/CMO/CPO/COS
export const BaseLensOutputSchema = z.object({
  role: AgentRoleSchema,
  runId: z.string(),
  summary: z.string().min(1),
  positions: z.array(PositionSchema),
  citations: z.array(CitationSchema),
  confidence: z.number().min(0).max(1),
});

// CFO extends with quantitative assertions
export const CFOOutputSchema = BaseLensOutputSchema.extend({
  role: z.literal('CFO'),
  quantitativeAssertions: z.array(QuantitativeAssertionSchema),
});

// Generic lens output (union covers all 6 lenses for arrays)
export const LensOutputSchema = BaseLensOutputSchema;

export type Citation = z.infer<typeof CitationSchema>;
export type Position = z.infer<typeof PositionSchema>;
export type ContextDocument = z.infer<typeof ContextDocumentSchema>;
export type LensOutput = z.infer<typeof LensOutputSchema>;
