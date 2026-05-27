/**
 * ADR-0004 §8 row AC-10 — Compile-time lens isolation type guard
 * Test owner: Ch.3 Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0004-ch3-runtime-spine.md §4.1 + §8 AC-10
 *
 * PURPOSE: Verify that TypeScript's type system REJECTS assigning a
 * LensContextBundle<'CRO'> to the `contextBundle` parameter of dispatchLens<'CFO'>.
 *
 * This file is NOT a .spec.ts and is NOT included in vitest's test glob
 * (tests/unit/**\/*.spec.ts). It exists only to be type-checked.
 *
 * UNKNOWN: tsconfig.json does not currently include 'tests/' in its `include`
 * array (it specifies `rootDir: src`). This means this file may be INERT until
 * Ch.3 Runtime adds a tsconfig check step. CI must run one of:
 *   a) tsc --noEmit --project tsconfig.test.json (where tests/ is included), OR
 *   b) tsc --noEmit tests/types/compile-error.ts (direct file invocation)
 * Ch.3 Runtime is responsible for wiring the CI step that exercises this file.
 * Until then, this file serves as documentation of the compile-time contract.
 *
 * HOW IT WORKS:
 * - The offending line is annotated with `// @ts-expect-error`.
 * - When the LensContextBundle branded types exist and the type guard is real:
 *     tsc sees the type mismatch AND the @ts-expect-error suppressor → compilation SUCCEEDS.
 * - If Ch.3 removes the type guard (making dispatchLens accept any bundle):
 *     tsc sees no type error, @ts-expect-error is "unused" → tsc FAILS with
 *     "Unused '@ts-expect-error' directive". This proves the guard was real.
 *
 * STATUS: Inert (no compile error possible) until Ch.3 ships the branded
 * LensContextBundle types and the dispatchLens<R> generic signature.
 *
 * CI activation (Ch.3 Runtime responsibility):
 *   Add to CI: `tsc --noEmit --strict tests/types/compile-error.ts`
 *   Or: configure a tsconfig.test.json with `include: ["tests/**\/*"]`
 */

// ── Runtime imports (uncomment when Ch.3 Runtime ships) ─────────────────────
// import type { LensContextBundle } from '../../packages/shared-types/src/lens-context-bundle.js';
// import type { dispatchLens } from '../../apps/utility/src/orchestrator/index.js';

// ── Compile-time type guard test ──────────────────────────────────────────────
//
// When the imports above are uncommented, this block enforces the compile-time guard.
// The @ts-expect-error annotation makes tsc self-verifying:
//   - If the type error IS present: @ts-expect-error suppresses it → tsc SUCCEEDS.
//   - If the type error is NOT present (type guard broken): @ts-expect-error unused → tsc FAILS.
//
// Uncomment when Ch.3 Runtime ships:
//
// type CROBundle = LensContextBundle<'CRO'>;
// type CFOBundleParam = Parameters<typeof dispatchLens<'CFO'>>[1]; // LensContextBundle<'CFO'>
//
// declare const croBundle: CROBundle;
//
// // @ts-expect-error — LensContextBundle<'CRO'> is not assignable to LensContextBundle<'CFO'>
// const _illegalAssignment: CFOBundleParam = croBundle;
//
// // The above line MUST produce a TypeScript error when the branded phantom types are active.
// // If tsc reports no error here, the type guard has been broken.

// ── Placeholder export (prevents "empty module" TS errors) ───────────────────
export {};
