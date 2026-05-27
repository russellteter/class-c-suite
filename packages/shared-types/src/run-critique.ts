// packages/shared-types/src/run-critique.ts
// Source: docs/decisions/0004-ch3-runtime-spine.md §2.12
import { z } from 'zod';
import { AgentRoleSchema } from './lens-output.js';

export const RunCritiqueOutputSchema = z.object({
  role: z.literal('RunCritic'),
  runId: z.string(),
  overallQuality: z.enum(['excellent', 'good', 'adequate', 'poor']),
  strengthsByRole: z.record(AgentRoleSchema, z.string()),
  weaknessesByRole: z.record(AgentRoleSchema, z.string()),
  processImprovements: z.array(z.string()),
  critiqueMarkdown: z.string().min(50),
});

export type RunCritiqueOutput = z.infer<typeof RunCritiqueOutputSchema>;
