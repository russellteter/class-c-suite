# Ch.4 Test — TDD Brief (Prompts + rigor scoring + Verifier canary)

## Your role

Test author for Ch.4. TDD-first against ADR-0005 §10 acceptance criteria. Tests RED until Ch.4 Runtime ships. DOCTRINE law #7 — no production code.

## Required reads

1. `docs/decisions/0005-ch4-prompts-rigor.md` — spec. Section 10 acceptance criteria. Read end-to-end.
2. `tests/fixtures/canary-memo.md` (Ch.0 scaffold) — the planted-claim fixture.
3. `tests/fixtures/rigor-cases.json` (Ch.0 scaffold) — 12-case rigor table.
4. `docs/architecture/prompts.md` §rigorScore + §isQuantOrNamed + §canary — implementation contracts.

## Test files to write

### `tests/unit/rigor-score-table.spec.ts` (ADR §6 + §10 keystone)

The 12-case locked table. For each row in `tests/fixtures/rigor-cases.json`:
- Call `rigorScore(verifierOutput)` with the inputs.
- Assert returned score matches expected total exactly.
- Call `rigorThreshold(playbook)` — assert returned threshold matches expected.
- Call `shipStatus(score, playbook)` — assert it returns the expected status.

All 12 cases must pass for the chapter to close.

### `tests/unit/is-quant-or-named.spec.ts` (ADR §7 + R2 §B3 edge cases)

50+ test cases including the 5 R2 edge cases:
1. `"by next quarter"` → false
2. `"if Barclays were to call"` → true (named entity)
3. `"a thousand cuts"` → false (no digits, just word "thousand")
4. `"ARR might grow 15% if renewals hold"` → true (percentage)
5. `"$M range"` → false (no digit after $)

Plus 45+ more cases — name them in the test file. Include positive cases (numbers, dates, dollar amounts, named entities) and negative cases (opinions, hypotheticals without entities, metaphors).

### `tests/unit/verifier-canary.spec.ts` (ADR §5 + AC; THE permanent regression guard)

NOTE: Ch.3 Test already started this file (commit `456c870` per Ch.3 Test summary). Ch.4 Test EXTENDS — don't replace.

Add tests:
- Load Verifier prompt from `apps/utility/src/prompts/Verifier.prompt.md` (Runtime ships).
- Build VerifierInput with the canary memo + a synthetic lens output structure.
- Run via stub harness with the canary fixture at `tests/fixtures/lens-outputs/canary-run/Verifier.json` (Ch.4 records this).
- Assert: `claims_unverified` includes the `$43M` claim; `ship_status === 'draft'`; `claim_source.score < 35` (failing band).
- Assert: NO `<thinking>` or `chain_of_thought` strings in the VerifierInput JSON (B3 enforcement).

### `tests/unit/named-entity-registry.spec.ts` (ADR §8)

- Mock vault path with 2 stakeholder files + 1 competitor file + the turnaround library snippet.
- Call `loadNamedEntityRegistry()` at startup.
- Assert it contains: stakeholder names from frontmatter, competitor names, hardcoded bootstrap entities (Barclays, Class, Zoom, etc.).
- Mock a chokidar `vault.changed` event for a stakeholder file → registry reloads.
- Assert registry includes the updated stakeholder name.

### `tests/unit/lens-prompts.spec.ts` (ADR §1 + §2)

For each of the 6 lens prompts (CEO/CFO/CRO/CMO/CPO/COS):
- Load prompt file at `apps/utility/src/prompts/<role>.prompt.md`.
- Assert it includes the verbatim text from `docs/research/R0-knowledge-inventory.md` §verbatim-lens-prompts (cite line numbers).
- For CRO specifically: assert it uses the CORRECTED stage labels (`Verbal Agreement, Verbal Approval, Contracting, Quote in Review, Negotiation`) NOT the invalid `S4/S5/Commit/BestCase`.

### `tests/unit/synthesizer-voice-bake.spec.ts` (ADR §3)

- Load `apps/utility/src/prompts/Synthesizer.prompt.md`.
- Assert it contains a "VOICE RULES — russell-voice" section with the 57 rules from R0-Skills.
- Assert it contains a "VOICE RULES — class-brand-voice" section with the 29 rules.
- Assert the prompt has explicit routing instructions ("personal-facing" → russell-voice; "company-facing" → class-brand-voice).

### `tests/unit/handoff-runcritic-prompts.spec.ts` (ADR §9)

- Load Handoff prompt; assert it includes the brand-skill recommendations table (class-brand-document, class-brand-excel, class-brand-presentations).
- Load RunCritic prompt; assert it includes the 5-dimension rubric verbatim (Source rigor / Lens balance / Red-team sharpness / Deliverable usefulness / Memory hygiene).

## Discipline

- TDD: tests RED until Runtime ships prompts + code.
- Use `Skill('superpowers:test-driven-development')` BEFORE writing.
- Commit per test file. Each auto-pushes.
- Do not modify earlier-chapter tests or production code.

## Return

Under 500 words: test files created, 12-case rigor table verification, 50+ isQuantOrNamed cases listed by category, commit SHAs (last 10), `tail -5 .git/auto-push.log`.

## Out of scope

- Production code.
- ADR modification.
- E2E (Ch.5).
- UI (Ch.5).
