// packages/shared-types/src/writeback.ts
// Source: docs/decisions/0008-write-backs-and-iterative-feedback.md §3.1 + §10.4
import { z } from 'zod';

export const ArtifactType = z.enum([
  'position',
  'decision',
  'prediction',
  'pre-mortem-update',
  'stakeholder-update',
  'workstream-advance',
]);
export type ArtifactType = z.infer<typeof ArtifactType>;

export const WritebackStatus = z.enum([
  'proposed', 'accepted', 'edited', 'rejected', 'iterating',
]);
export type WritebackStatus = z.infer<typeof WritebackStatus>;

export const ProposedBy = z.object({
  runId: z.string(),
  agent: z.literal('Synthesizer'),         // authorship lock per §2.1
  playbook: z.string(),
  lensesContributing: z.array(z.string()), // AgentRole names whose evidence backs this writeback
  proposedAt: z.number(),                  // epoch ms
});
export type ProposedBy = z.infer<typeof ProposedBy>;

export const WritebackDraftSchema = z.object({
  writebackId: z.string(),                 // uuid
  runId: z.string(),
  artifactType: ArtifactType,
  artifactId: z.string(),                  // POS-NNN, DEC-NNN, etc.
  isNew: z.boolean(),                      // true = create; false = update existing
  draftPath: z.string(),                   // absolute path to <vault>/<zone>/<id>.draft-<runId>.md
  activePath: z.string(),                  // absolute path the writeback would become on accept
  proposedBody: z.string(),               // full markdown (frontmatter + body)
  proposedFrontmatter: z.record(z.string(), z.unknown()), // parsed frontmatter for diff rendering
  diffAgainstActive: z.string().nullable(), // unified diff vs current active file; null if isNew
  description: z.string(),                 // one-sentence "what this writeback changes"
  topic: z.string(),                       // §10.1 derivation: workstream title | playbook label | "General"
  proposedBy: ProposedBy,
  status: WritebackStatus,
  iterationCount: z.number().int().min(0), // per-writeback (§2.3); defaults 0
});
export type WritebackDraft = z.infer<typeof WritebackDraftSchema>;

export const IterationHistoryEntry = z.object({
  iterationNumber: z.number().int().min(1).max(3),
  requestedAt: z.number(),
  russellFeedback: z.string(),
  contestedLenses: z.array(z.string()),
  priorDraftPath: z.string(),              // snapshot taken before this iteration
  newDraftPath: z.string(),               // .draft-<runId>.md after this iteration
  verifierScoreBefore: z.number().nullable(),
  verifierScoreAfter: z.number().nullable(),
});
export type IterationHistoryEntry = z.infer<typeof IterationHistoryEntry>;
