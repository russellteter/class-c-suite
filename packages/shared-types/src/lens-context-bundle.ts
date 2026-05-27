// packages/shared-types/src/lens-context-bundle.ts
// Source: docs/decisions/0004-ch3-runtime-spine.md §4
// B3 keystone: lens isolation enforcement — compile-time + runtime.
import { z } from 'zod';
import { ContextDocumentSchema, LensOutputSchema } from './lens-output.js';
import type { LensRole } from './agent-definition.js';
import { LENS_ROLES } from './agent-definition.js';

// --- Compile-time branded bundle (phantom type prevents cross-lens assignment) ---

declare const __lensRoleBrand: unique symbol;
type BrandedFor<R extends LensRole> = { readonly [__lensRoleBrand]: R };

export type LensContextBundle<R extends LensRole> = BrandedFor<R> & {
  runId: string;
  role: R;
  question: string;
  playbook: string;
  contextDocuments: z.infer<typeof ContextDocumentSchema>[];
};

// --- Runtime violation error ---

export class LensIsolationViolation extends Error {
  constructor(
    public readonly forRole: LensRole,
    public readonly leakedRole: string,
    public readonly fieldPath: string,
  ) {
    super(`LensIsolationViolation: ${forRole} context bundle contains data tagged for ${leakedRole} at ${fieldPath}`);
    this.name = 'LensIsolationViolation';
  }
}

// --- Cross-lens leak detector ---

/**
 * Recursively walk an object and return all violations where a nested object
 * has a 'role' field that is a LensRole other than the expected role.
 */
export function findCrossLensLeaks(
  value: unknown,
  expectedRole: LensRole,
  path: string,
): Array<{ leakedRole: string; path: string }> {
  if (typeof value !== 'object' || value === null) return [];
  const obj = value as Record<string, unknown>;
  const violations: Array<{ leakedRole: string; path: string }> = [];

  // Check this object's own 'role' field
  if ('role' in obj && (LENS_ROLES as readonly string[]).includes(obj.role as string) && obj.role !== expectedRole) {
    violations.push({ leakedRole: obj.role as string, path });
  }

  // Recurse into all values
  for (const [key, val] of Object.entries(obj)) {
    violations.push(...findCrossLensLeaks(val, expectedRole, `${path}.${key}`));
  }

  return violations;
}

// --- Runtime Zod schema with superRefine ---

/**
 * Returns a Zod schema for a lens context bundle that enforces lens isolation
 * at runtime by rejecting any bundle containing another lens's tagged output.
 *
 * Fix (B3 keystone): Zod v4 strips unknown keys before superRefine runs on
 * z.object(). .passthrough() preserves unknown keys so findCrossLensLeaks
 * sees them inside superRefine. Defense-in-depth: also use buildLensContextBundle()
 * which pre-checks raw input before Zod parse.
 */
export function buildLensContextBundleSchema<R extends LensRole>(
  role: R,
): z.ZodType<LensContextBundle<R>> {
  return z.object({
    runId: z.string(),
    role: z.literal(role),
    question: z.string(),
    playbook: z.string(),
    contextDocuments: z.array(ContextDocumentSchema),
  }).passthrough().superRefine((data, ctx) => {
    const violations = findCrossLensLeaks(data, role, '$');
    for (const v of violations) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `LensIsolationViolation: leaked ${v.leakedRole} at ${v.path}`,
      });
    }
  }) as unknown as z.ZodType<LensContextBundle<R>>;
}

/**
 * Defense-in-depth entry point for building a validated LensContextBundle.
 * Pre-checks raw input for cross-lens leaks BEFORE Zod strips unknown keys,
 * then runs schema validation. Throws LensIsolationViolation on the first leak.
 *
 * Callers should use this instead of buildLensContextBundleSchema(role).parse().
 */
export function buildLensContextBundle<R extends LensRole>(
  role: R,
  raw: unknown,
): LensContextBundle<R> {
  // Layer 1: pre-check raw input before Zod strips unknown keys
  const violations = findCrossLensLeaks(raw, role, '$');
  if (violations.length > 0) {
    const first = violations[0];
    throw new LensIsolationViolation(role, first.leakedRole, first.path);
  }
  // Layer 2: schema validation (also enforces isolation via .passthrough() + superRefine)
  return buildLensContextBundleSchema(role).parse(raw);
}

// Re-export for convenience
export type { LensRole };
export { LensOutputSchema };
