// packages/shared-types/src/memo.ts
// Source: docs/decisions/0004-ch3-runtime-spine.md §1.1 (verifier state carries Memo)
import { z } from 'zod';
import { CitationSchema } from './lens-output.js';

export const PositionMetadataSchema = z.object({
  positionId: z.string(),
  role: z.string(),
  claim: z.string(),
  isQuantitative: z.boolean(),
  namedEntity: z.string().optional(),
  citations: z.array(CitationSchema),
  sourceText: z.string(),
});

export const MemoSchema = z.object({
  runId: z.string(),
  memoMarkdown: z.string().min(1),
  executiveSummary: z.string(),
  keyDecisions: z.array(z.string()),
  citations: z.array(CitationSchema),
  positionMetadata: z.array(PositionMetadataSchema),
});

export type PositionMetadata = z.infer<typeof PositionMetadataSchema>;
export type Memo = z.infer<typeof MemoSchema>;
