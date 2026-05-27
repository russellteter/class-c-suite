# Ch.4 Fix-Integration — Flip Pre-Flight Indicators to Assertions

## Your role

Fix-Integration engineer for Ch.4. The Ch.4 Test agent wrote "pre-flight indicator" tests with `expect(fileExists).toBe(false)` to confirm files DON'T exist before Runtime ships them. Ch.4 Runtime now shipped → indicators fail. Flip them.

DOCTRINE law #2 — verify before claiming done.

## Failing tests (find via `pnpm run test:unit | grep FAIL`)

- `tests/unit/handoff-runcritic-prompts.spec.ts` — "Handoff.prompt.md does not yet exist" + "RunCritic.prompt.md does not yet exist"
- `tests/unit/lens-prompts.spec.ts` — "prompt directory does not yet contain .prompt.md files"
- `tests/unit/synthesizer-voice-bake.spec.ts` — possibly similar pre-flight indicator
- `tests/unit/verifier-canary.spec.ts` — possibly similar
- `tests/unit/named-entity-registry.spec.ts` — possibly similar

## Required reads

1. `docs/decisions/0005-ch4-prompts-rigor.md` — what each prompt file should contain.
2. `tests/unit/handoff-runcritic-prompts.spec.ts` + others — see each test's intent.
3. The shipped prompt files at `apps/utility/src/prompts/`.
4. `apps/utility/src/scoring/rigorScore.ts`, `apps/utility/src/scoring/isQuantOrNamed.ts`, `apps/utility/src/registry/namedEntities.ts`.

## Mission

For each failing test:
1. Read it.
2. Identify the pre-flight indicator (`expect(...).toBe(false)` for a file that should now exist; or `expect(content).toContain("...not yet")`).
3. Replace with the actual assertion the test was meant to perform once Runtime ships (e.g., `expect(content).toContain('verbatim line from R0-Spine')`, `expect(file).toExist()`, etc.).
4. Run `pnpm vitest run tests/unit/<file>` and confirm GREEN.

Some assertions you'll need:
- `lens-prompts.spec.ts`: load each of `CEO.prompt.md, CFO.prompt.md, CRO.prompt.md, CMO.prompt.md, CPO.prompt.md, COS.prompt.md`. For CRO specifically: assert it contains `'Verbal Agreement'` and does NOT contain `'StageName IN (S4'`. Other lenses: assert non-empty content + at least one verbatim phrase per `docs/research/R0-knowledge-inventory.md` §2.
- `handoff-runcritic-prompts.spec.ts`: load Handoff.prompt.md, assert it includes `'class-brand-document'` or `'class-brand-presentations'`. Load RunCritic.prompt.md, assert it includes `'Source rigor'` + `'Lens balance'` + `'Red-team sharpness'` + `'Deliverable usefulness'` + `'Memory hygiene'`.
- `synthesizer-voice-bake.spec.ts`: load Synthesizer.prompt.md, assert it includes `'VOICE RULES — russell-voice'` + `'VOICE RULES — class-brand-voice'`.
- `verifier-canary.spec.ts`: assert the canary fixture exists + the Verifier output stub at `tests/fixtures/lens-outputs/canary-run/Verifier.json` has `rigor_score < 70` + `ship_status === 'draft'` + the planted `$43M` claim flagged.
- `named-entity-registry.spec.ts`: import `loadNamedEntityRegistry` from `apps/utility/src/registry/namedEntities.ts`; assert registry contains bootstrap entities (Barclays, Class, etc.); assert reload on stakeholder change.

## Discipline

- Test-only changes. Do NOT modify production code.
- Do NOT modify production prompt files (Ch.4 Runtime owns; they're correct per ADR-0005).
- Run `pnpm run test:unit` after each fix. Commit when each file is green.
- Atomic commits per test file.
- Auto-push fires per commit.

## Out of scope

- Ch.5 tests (Ch.5 Runtime is running in parallel; their tests will go green when Ch.5 Runtime ships).
- migrate.spec.ts (Ch.3 Runtime already fixed it).
- ADR modification.

## Return

Under 400 words: per-file outcome (FIXED / DEFERRED), final test summary (X passed / Y failed where Y is only Ch.5 RED), commit SHAs, `tail -5 .git/auto-push.log`.
