// packages/shared-types/src/vault-schemas.ts
// Source: docs/research/R0-constraints-ledger.md §3 SD-01 through SD-07
// (verified against 75+ vault files 2026-05-26 by R0-Vault sub-agent).
// `type` field injected by parseArtifact(rawYaml, zone) — NOT in vault YAML.
import { z } from 'zod';

export type ArtifactZone =
  | 'position' | 'decision' | 'workstream' | 'stakeholder_person'
  | 'stakeholder_account' | 'pre-mortem' | 'prediction' | 'memo'
  | 'handoff' | 'tripwire' | 'competitor';

// --- PositionFrontmatter (SD-01, R0 ledger §2.1) ---

export const PositionFrontmatter = z.object({
  // type field injected at parse time — DO NOT add z.literal here.
  id: z.string(),                                    // "POS-001"
  slug: z.string(),                                  // kebab slug
  title: z.string(),
  status: z.string(),                                // observed "active" only; keep open
  confidence: z.number().int().min(0).max(100),
  created: z.string(),                               // YYYY-MM-DD
  last_updated: z.string(),                          // normalized from last-updated
  last_retested: z.string(),                         // normalized from last-retested
  supersedes: z.string().nullable(),                 // POS-id or null
  superseded_by: z.string().nullable(),              // normalized from superseded-by
  authored_by: z.string(),                           // normalized from authored-by
  decision_this_supports: z.string(),                // normalized from decision-this-supports
  predictions_spawned: z.array(z.string()),
  source: z.string(),
  correction_log: z.array(z.string()).optional(),    // POS-014 only; strings (not objects)
  // Ch.9: execution back-link appended by link-back watcher
  executed_by: z.union([z.string(), z.array(z.string())]).nullable().optional(),
}).passthrough();
export type PositionFrontmatter = z.infer<typeof PositionFrontmatter>;

// --- DecisionFrontmatter (SD-06, R0 ledger §2.2 + §3) ---

export const DecisionFrontmatter = z.object({
  id: z.string(),                                    // "DEC-005"
  title: z.string(),
  date_proposed: z.string(),                         // RENAMED from decided_on (snake on-disk)
  decision_maker: z.string(),                        // free text
  status: z.enum(['proposed', 'in-execution', 'resolved-correct', 'deferred']),
  reversibility: z.string(),                         // free text (NOT enum low|medium|high)
  confidence: z.number().int().optional(),
  source: z.string(),
  // Additive fields injected by Ch.6 write-back engine (B13):
  linked_positions: z.array(z.string()).optional(),
  predictions_spawned: z.array(z.string()).optional(),
  tripwires: z.array(z.string()).optional(),
  // Ch.9: widened from string to array — link-back watcher appends multiple execution paths.
  // Union covers legacy single-string values already in the vault.
  executed_by: z.union([z.string(), z.array(z.string())]).nullable().optional(),
}).passthrough();
export type DecisionFrontmatter = z.infer<typeof DecisionFrontmatter>;

// --- WorkstreamFrontmatter (SD-03, R0 ledger §3 — 15-field expanded shape) ---

export const WorkstreamFrontmatter = z.object({
  workstream_id: z.string(),                         // "WS-01" (WS-03 uses 'id' — see union below)
  title: z.string(),
  owner: z.string(),
  phase: z.string(),                                 // free text
  status: z.string(),                                // observed "GREEN" | "YELLOW" | "RED" | "YELLOW (will move GREEN...)"
  status_criteria: z.object({
    green: z.string(),
    yellow: z.string(),
    red: z.string(),
    orange: z.string().optional(),                   // WS-13 only
  }),
  cash_impact: z.object({
    amount_usd: z.union([z.string(), z.number()]),   // free text OR bare 0 (WS-04/11)
    direction: z.string(),
    timing: z.string(),
  }),
  arr_impact: z.object({
    amount_usd: z.union([z.string(), z.number()]),
    direction: z.string(),
    timing: z.string(),
  }),
  people_involved: z.array(z.string()),
  depends_on: z.array(z.string()),
  depended_on_by: z.array(z.string()),
  next_milestone: z.string(),
  next_milestone_date: z.string(),                   // date or "TBD"
  decisions_pending: z.array(z.string()),
  linked_positions: z.array(z.string()),
  linked_decisions: z.array(z.string()),
  last_updated: z.string(),
}).passthrough();

// WS-03 minimal variant (R0 ledger §2.3): uses 'id' instead of 'workstream_id'.
export const WorkstreamMinimalFrontmatter = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  owner: z.string(),
  phase: z.string(),
  last_updated: z.string(),
  source: z.string(),
}).passthrough();

export const WorkstreamFrontmatterUnion = z.union([
  WorkstreamFrontmatter,
  WorkstreamMinimalFrontmatter,
]);
export type WorkstreamFrontmatterUnion = z.infer<typeof WorkstreamFrontmatterUnion>;

// --- StakeholderFrontmatter (SD-04, R0 ledger §3 — discriminated z.union) ---

export const StakeholderPersonFrontmatter = z.object({
  name: z.string(),                                  // e.g. "chasen-michael-ceo"
  sensitivity: z.string(),                           // "HIGH"
  last_known_status: z.string(),                     // "WARM" | "HOT"
  last_refresh: z.string(),                          // YYYY-MM-DD
  source: z.string(),
}).passthrough();

export const StakeholderAccountFrontmatter = z.object({
  account_id: z.string(),                            // SF account ID (discriminator key)
  account_name: z.string(),
  short_name: z.string(),
  segment: z.string(),
  territory: z.string(),
  location: z.string(),
  customer_type: z.string(),
  total_contacts: z.number().int(),
  account_owner: z.string(),
  current_opp_owner: z.string(),
  mediated_through: z.string().optional(),
  class_share_of_arr: z.string(),
  last_updated: z.string(),
  linked_pre_mortems: z.array(z.string()).optional(),    // normalized from linked_pre-mortems
  linked_tripwires: z.array(z.string()).optional(),
  linked_positions: z.array(z.string()).optional(),
  linked_workstreams: z.array(z.string()).optional(),
  sensitivity: z.string(),
}).passthrough();

// Discriminate by presence of `account_id` (per R0 ledger §3 SD-04):
export const StakeholderFrontmatter = z.union([
  StakeholderPersonFrontmatter,
  StakeholderAccountFrontmatter,
]);
export type StakeholderFrontmatter = z.infer<typeof StakeholderFrontmatter>;

// --- PreMortemFrontmatter (SD-05, R0 ledger §3 — corrected enum + probability union) ---

export const PreMortemFrontmatter = z.object({
  id: z.string().optional(),                         // absent in snake variant
  slug: z.string().optional(),                       // absent in snake variant
  name: z.string().optional(),                       // snake variant only
  probability: z.union([
    z.number().int(),                                // kebab files: bare integer (15, 25)
    z.string().regex(/^\d+%$/),                      // snake files: "30%"
  ]),
  impact: z.enum(['existential', 'high', 'HIGH', 'medium']),
  last_reviewed: z.string(),                         // normalized from last-reviewed
  related_positions: z.array(z.string()).optional(), // normalized from related-positions
  related_workstreams: z.array(z.string()).optional(),
  related_pre_mortems: z.array(z.string()).optional(),
  related_tripwires: z.array(z.string()).optional(),
  depends_on: z.array(z.string()).optional(),        // normalized from depends-on
  source: z.string().optional(),
  // Ch.9: execution back-link
  executed_by: z.union([z.string(), z.array(z.string())]).nullable().optional(),
}).passthrough();
export type PreMortemFrontmatter = z.infer<typeof PreMortemFrontmatter>;

// --- PredictionFrontmatter (SD-07, R0 ledger §3) ---

export const PredictionFrontmatter = z.object({
  id: z.string(),
  claim: z.string(),
  confidence: z.union([z.number().int(), z.string().regex(/^\d+$/)]).optional(),   // PRED-007 uses confidence-at-time-of-prediction instead
  resolution_date: z.string().optional(),            // snake: resolution_date; kebab normalized
  spawned_by: z.string().optional(),
  position: z.string().optional(),                   // PRED-007 only
  spawned: z.string().optional(),                    // PRED-007 creation date
  resolution_criterion: z.string().optional(),       // PRED-007 only (normalized from resolution-criterion)
  status: z.enum(['open', 'resolved']),
  source: z.string().optional(),
}).passthrough();
export type PredictionFrontmatter = z.infer<typeof PredictionFrontmatter>;

// --- MemoFrontmatter (aspirational; Ch.5 Synthesizer creates first memos) ---

export const MemoFrontmatter = z.object({
  run_id: z.string(),
  playbook: z.string(),
  question: z.string(),
  created: z.string(),
  rigor_score: z.number().int().min(0).max(100),
  rigor_threshold: z.number().int(),
  status: z.enum(['clean', 'draft', 'quick_read', 'ad_hoc']),
  failure_reasons: z.array(z.string()).optional(),
  citations: z.array(z.object({
    claim_id: z.string(),
    source_id: z.string(),
    call_id: z.string(),
  })),
  proposed_writebacks: z.array(z.object({
    artifact_type: z.string(),
    draft_path: z.string(),
  })).optional(),
  handoff_path: z.string().optional(),
  // Ch.9: execution back-link (memo can also be executed directly)
  executed_by: z.union([z.string(), z.array(z.string())]).nullable().optional(),
}).passthrough();

// NOTE: HandoffFrontmatter moved to packages/shared-types/src/handoff.ts (Ch.9).
// Re-exported from index.ts via './handoff'. Do NOT re-define here.

// --- TripwireFrontmatter (R0 §2.8 — financial-tripwires/ shape) ---

export const TripwireFrontmatter = z.object({
  tripwire_id: z.string(),
  title: z.string(),
  category: z.string(),
  source: z.string(),
  owner: z.string(),
  scan_cadence: z.string(),
  escalation: z.string(),
  last_updated: z.string(),
}).passthrough();

// --- CompetitorFrontmatter (R0 §2.7 — competitor-watch/ shape) ---

export const CompetitorFrontmatter = z.object({
  competitor: z.string(),
  threat_level: z.string(),
  last_updated: z.string(),
  last_signal: z.string(),
  sources: z.array(z.string()),
}).passthrough();
