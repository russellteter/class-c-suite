// packages/shared-types/src/run-plan.ts
// Source: docs/decisions/0004-ch3-runtime-spine.md §1.1
import { z } from 'zod';

export const RunPlanSchema = z.object({
  steps: z.array(z.string()).min(1),
  autoApproveAfterMs: z.number().nullable().optional(),
});

export type RunPlan = z.infer<typeof RunPlanSchema>;
