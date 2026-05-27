// packages/shared-types/src/red-team.ts
// Source: docs/decisions/0004-ch3-runtime-spine.md §2.7
import { z } from 'zod';
import { AgentRoleSchema, CitationSchema } from './lens-output.js';

export const RedTeamOutputSchema = z.object({
  role: z.literal('RedTeam'),
  runId: z.string(),
  challenges: z.array(z.object({
    targetRole: AgentRoleSchema,
    claim: z.string(),
    counterargument: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
  })).min(1),
  overallRisk: z.enum(['low', 'medium', 'high', 'critical']),
  citations: z.array(CitationSchema),
});

export type RedTeamOutput = z.infer<typeof RedTeamOutputSchema>;
