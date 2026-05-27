# Ch.3 Fix-Integration — Resolve Audit/QA REOPEN (B3 keystone + test placeholders)

## Your role

Fix-Integration engineer for Ch.3 REOPEN. Two issues: (1) B3 P0 KEYSTONE — runtime lens isolation broken because Zod v4 strips unknown keys before `superRefine`; (2) ~30 Ch.3 AC tests are `expect(true).toBe(true)` tautologies. DOCTRINE law #2.

## Required reads

1. `docs/decisions/0004-ch3-runtime-spine.md` §4 (lens isolation enforcement) + §5 (Verifier input contract).
2. `docs/reviews/ch3-audit-qa-report.md` — full findings.
3. `packages/shared-types/src/lens-context-bundle.ts` — `buildLensContextBundleSchema()` (the broken Zod schema).
4. `apps/utility/src/orchestrator/dispatch.ts` — `dispatchLens()` (uses the schema).
5. `packages/shared-types/src/lens-context-bundle.ts` companions: `findCrossLensLeaks()` function.
6. Ch.3 test files (all 9 of them) — to activate assertions:
   - `tests/unit/lens-isolation/cross-lens-leak.spec.ts` (AC-2 — KEYSTONE)
   - `tests/unit/verifier-contract.spec.ts` (AC-3)
   - `tests/unit/checkpoint-resume.spec.ts` (AC-4 + AC-9)
   - `tests/unit/agent-definitions.spec.ts` (AC-5)
   - `tests/unit/ipc-event-order.spec.ts` (AC-6)
   - `tests/unit/verifier-canary.spec.ts` (AC-7 — partial; structural assertion)
   - `tests/unit/state-machine.spec.ts` (AC-8)
   - `tests/unit/run-loop-e2e.spec.ts` (AC-1)
   - `tests/types/compile-error.ts` (AC-10 inert)

## Issue 1 — AC-2 FAIL (B3 KEYSTONE; P0)

**Root cause:** Zod v4.4.3 `z.object().superRefine()` receives the parsed (stripped) data, NOT the raw input. Unknown keys (like a leaked `croOutput` on a CFO bundle) are removed before `superRefine` can check them. `findCrossLensLeaks` runs on raw input and correctly identifies leaks, but `superRefine` no longer sees those leaks.

**Fix approaches (pick the cleanest):**

(a) **Use `.passthrough()` on the schema** — Zod v4 preserves unknown keys when passthrough is enabled. Then `superRefine` sees them. Recommend.

```typescript
const schema = z.object({...}).passthrough().superRefine((data, ctx) => {
  const leaks = findCrossLensLeaks(data, role);
  if (leaks.length > 0) {
    ctx.addIssue({...});
  }
});
```

(b) **Pre-validate via raw input check BEFORE `schema.parse()`** — check for cross-lens leaks on the raw input outside Zod. If leaks, throw `LensIsolationViolation` directly without invoking Zod.

```typescript
export function buildLensContextBundle(role: LensRole, raw: unknown): LensContextBundle {
  // 1. Pre-check raw input for cross-lens leaks BEFORE Zod parse strips them
  const leaks = findCrossLensLeaks(raw, role);
  if (leaks.length > 0) throw new LensIsolationViolation(role, leaks);
  // 2. Now Zod parse for schema validation
  return schema.parse(raw);
}
```

(c) **Use `.strict()` on the schema** — rejects unknown keys outright. Then leaked keys fail parse with a clear error. Simpler but produces less-specific error messages.

Recommend (a) `.passthrough()` for cleanest fix + clearest semantics. Verify the resulting Zod error mentions the leaked role.

Update tests: `cross-lens-leak.spec.ts` must invoke the real path and assert `LensIsolationViolation` (or `ZodError` with the leak in `ctx.issues`).

## Issue 2 — Activate 9 test files (currently `expect(true).toBe(true)`)

For each AC test file in the list above, replace the placeholder `expect(true).toBe(true)` blocks with real assertions per the ADR §8 acceptance criteria + the failing-test comments. Refer to ADR-0004 §8 for the per-AC contract.

Key activations:
- AC-1 (`run-loop-e2e.spec.ts`): run a full bootstrap → handoff loop through 14 RunState transitions using `STUB_MODE=replay`. Assert final state is `committed` or `shipped-clean`.
- AC-3 (`verifier-contract.spec.ts`): call `buildVerifierInput(runId)` against state missing each required input. Assert `VerifierInputContractViolation` with the missing field name.
- AC-4 / AC-9 (`checkpoint-resume.spec.ts`): pre-populate SQLite with completed + in-progress invocations; call `resumeRun(runId)`; assert re-dispatched lenses match in-progress set.
- AC-5 (`agent-definitions.spec.ts`): load each of 12 AgentDefinitions; parse seed fixture against outputSchema. Assert all 12 succeed.
- AC-6 (`ipc-event-order.spec.ts`): mock IPC; run dispatchLens; assert emit order matches `[agent.start, agent.tool.pre, agent.tool.post, agent.complete]`.
- AC-7 (`verifier-canary.spec.ts`): structural assertion that VerifierInput JSON contains no `<thinking>`, `chain_of_thought`, `reasoning_trace` keys.
- AC-8 (`state-machine.spec.ts`): mock SQLite; execute `transition('bootstrap', planReadyEvent)`; assert state transitions to `plan-approval` AND a row inserted into state_transitions.

## Discipline

- MINIMAL changes. Per fix should be 5-50 lines.
- Run `pnpm run test:unit` after each commit; commit only when each file is green.
- Do NOT modify Ch.0/Ch.1/Ch.2 tests or production code.
- Test files only for issue 2; production code only for issue 1 (the Zod fix).

## Exit criteria

- `pnpm run test:unit` shows all earlier-chapter tests still green + Ch.3 AC tests now exercise real behavior with passing assertions (not tautologies).
- `cross-lens-leak.spec.ts` proves runtime lens isolation: malformed bundle → `LensIsolationViolation` (or Zod parse error citing the leaked field).
- BY-HAND: open Node REPL, import `buildLensContextBundle`, pass `{role: 'CFO', illegalLeak: {role: 'CRO', output: {...}}}`. Observe the error.

## Commit discipline

1. `ch3-fix: B3 keystone — passthrough() + raw-input pre-check restores lens isolation (ADR §4)`
2. `ch3-fix: activate AC-1 run-loop-e2e assertions`
3. `ch3-fix: activate AC-2 cross-lens-leak assertions (B3 keystone test)`
4. `ch3-fix: activate AC-3 verifier-contract assertions`
5. `ch3-fix: activate AC-4 + AC-9 checkpoint-resume assertions`
6. `ch3-fix: activate AC-5 agent-definitions assertions`
7. `ch3-fix: activate AC-6 ipc-event-order assertions`
8. `ch3-fix: activate AC-7 verifier-canary structural assertion`
9. `ch3-fix: activate AC-8 state-machine assertions`

After all 9 land, update `docs/reviews/ch3-audit-qa-report.md`:
- Mark verdict as "REOPEN resolved 2026-05-27" with commit SHAs.
- Per-criterion table: FAIL → PASS for AC-2; all 9 NW → PASS.

Update `BLOCKERS.md` B3 status: ACTIVE P0 → VERIFIED P0 (runtime isolation restored; canary structural test active).

Update `.claude/project-state.json`: `current_phase: ch-3-complete-ready-for-ch4`.

## Return

Under 500 words: per-AC outcome, B3 status, final test summary, commit SHAs, `tail -5 .git/auto-push.log`.

## Out of scope

- Mockup work (parallel agent owns).
- Ch.4 Audit/QA (waits for this).
- Ch.5 work.
