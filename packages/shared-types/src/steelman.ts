// packages/shared-types/src/steelman.ts
// Source: docs/decisions/0004-ch3-runtime-spine.md §2.8
import { z } from 'zod';
import { AgentRoleSchema, CitationSchema } from './lens-output.js';

export const SteelmanOutputSchema = z.object({
  role: z.literal('Steelman'),
  runId: z.string(),
  steelmen: z.array(z.object({
    targetRole: AgentRoleSchema,
    bestCaseArgument: z.string(),
    evidenceSupport: z.array(z.string()),
  })).min(1),
  citations: z.array(CitationSchema),
});

export type SteelmanOutput = z.infer<typeof SteelmanOutputSchema>;
