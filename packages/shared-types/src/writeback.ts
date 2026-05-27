// packages/shared-types/src/writeback.ts
// Source: docs/decisions/0004-ch3-runtime-spine.md §1.1
import { z } from 'zod';

export const WritebackDraftSchema = z.object({
  writebackId: z.string(),
  artifactType: z.string(),
  draftPath: z.string(),
  description: z.string().optional(),
});

export type WritebackDraft = z.infer<typeof WritebackDraftSchema>;
