// packages/shared-types/src/verifier-output.ts
// ADR-0005 §4.3 — Authoritative VerifierOutputSchema.
// Supersedes the stub VerifierOutputSchema from ADR-0004 §2.10.
// Source: docs/decisions/0005-ch4-prompts-rigor.md §4.3

import { z } from 'zod';

export const VerifierDimensionsSchema = z.object({
  claim_source: z.object({
    score: z.number().int().min(0).max(35),
    claims_total: z.number().int().min(0),
    claims_verified: z.number().int().min(0),
    claims_unverified: z.array(z.object({
      claim_excerpt: z.string().min(1),
      issue: z.string().min(1),
    })),
  }),
  coverage: z.object({
    score: z.number().int().min(0).max(20),
    lenses_run: z.array(z.string()),
    lenses_cited_in_memo: z.array(z.string()),
    missing_findings: z.array(z.string()),
  }),
  red_team: z.object({
    score: z.number().int().min(0).max(15),
    addressed: z.number().int().min(0),
    unaddressed: z.number().int().min(0),
    unaddressed_details: z.array(z.string()),
  }),
  calibration: z.object({
    score: z.number().int().min(0).max(15),
    stale_position_citations: z.array(z.object({
      position_id: z.string(),
      age_days: z.number().int().min(0),
    })),
  }),
  falsifier: z.object({
    score: z.number().int().min(0).max(15),
    present: z.boolean(),
    quality: z.enum(['missing', 'perfunctory', 'strong']),
  }),
});

export const VerifierOutputSchema = z.object({
  rigor_score: z.number().int().min(0).max(100),
  ship_status: z.enum(['clean', 'draft', 'fail']),
  dimensions: VerifierDimensionsSchema,
  failure_reasons: z.array(z.string()),
  draft_path_recommendation: z.string().optional(),
  verifier_notes: z.string(),
});

export const VerifierContractViolationSchema = z.object({
  error: z.literal('VerifierInputContractViolation'),
  missing: z.array(z.string()),
});

// Union: valid output OR contract violation
export const VerifierResponseSchema = z.union([
  VerifierOutputSchema,
  VerifierContractViolationSchema,
]);

export type VerifierOutput = z.infer<typeof VerifierOutputSchema>;
export type VerifierContractViolation = z.infer<typeof VerifierContractViolationSchema>;
export type VerifierResponse = z.infer<typeof VerifierResponseSchema>;
export type VerifierDimensions = z.infer<typeof VerifierDimensionsSchema>;
