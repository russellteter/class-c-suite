// packages/shared-types/src/handoff.ts
// Source: docs/decisions/0011-ch9-cowork-handoff.md §3 + §4
// HandoffFrontmatter and related types for the Cowork execution handoff flow.
// Replaces the thin placeholder in vault-schemas.ts (removed to avoid duplicate export).
import { z } from 'zod';
import type { PlaybookId } from './playbook.js';

// --- CoworkBrandSkillId — fixed catalog (ADR §3.3) ---

export const CoworkBrandSkillIdSchema = z.enum([
  'class-brand-document',
  'class-brand-excel',
  'class-brand-presentations',
  'class-ppt-cyan-light',
  'class-brand-voice',
]);
export type CoworkBrandSkillId = z.infer<typeof CoworkBrandSkillIdSchema>;

// --- HandoffStatus ---

export const HandoffStatusSchema = z.enum(['drafted', 'sent', 'executed']);
export type HandoffStatus = z.infer<typeof HandoffStatusSchema>;

// --- HandoffOriginType (snake_case per ADR §3.1; distinct from ArtifactZone kebab) ---

export const HandoffOriginTypeSchema = z.enum([
  'decision',
  'memo',
  'position',
  'pre_mortem',
]);
export type HandoffOriginType = z.infer<typeof HandoffOriginTypeSchema>;

// --- HandoffFrontmatter (ADR §3.1) ---
// NOTE: replaces the thin placeholder from vault-schemas.ts (deleted there to avoid duplicate-export).

export const HandoffFrontmatter = z.object({
  type: z.literal('handoff').default('handoff'),
  id: z.string(),                                          // HANDOFF-<YYYY-MM-DD>-<slug>
  // origin reference — one of: decision_id | memo_id | position_id | pre_mortem_id
  decision_id: z.string().optional(),
  memo_id: z.string().optional(),
  position_id: z.string().optional(),
  pre_mortem_id: z.string().optional(),
  origin_type: HandoffOriginTypeSchema,
  origin_path: z.string(),                                 // vault-relative path to originating artifact
  created: z.string(),                                     // YYYY-MM-DD
  created_by_run_id: z.string(),                           // run that authored this handoff
  status: HandoffStatusSchema,
  cowork_brand_skills: z.array(CoworkBrandSkillIdSchema),
  executed_by: z.union([
    z.string(),
    z.array(z.string()),
  ]).nullable().optional(),                                // set when Cowork writes execution artifact(s) back
}).passthrough();
export type HandoffFrontmatter = z.infer<typeof HandoffFrontmatter>;

// --- HandoffGeneratorInput (ADR §4.2) ---

export interface HandoffGeneratorInput {
  origin: {
    type: HandoffOriginType;
    id: string;
    path: string;             // vault-relative
    title: string;
    bodyMarkdown: string;     // origin artifact body
    frontmatter: Record<string, unknown>;
  };
  runContext: {
    runId: string;
    playbookId: PlaybookId;
    stakeholdersOfInterest: string[];     // resolved from playbook deps
    workstreamsOfInterest: string[];      // resolved from origin artifact's linked_workstreams
    memoMarkdown?: string;               // originating memo if origin is decision/position
  };
}

// --- HandoffBrief (ADR §4.3) ---

export interface HandoffBrief {
  frontmatter: HandoffFrontmatter;
  bodyMarkdown: string;   // matches ADR §3.2 sections verbatim
  filename: string;       // <YYYY-MM-DD>-<slug>.md
  fullPath: string;       // <vault>/handoffs/<filename>
}
