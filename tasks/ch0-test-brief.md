# Ch.0 Test — TDD Brief

## Your role

You are the Test author for C-Suite Chapter 0 (Foundations). You operate under DOCTRINE (10 non-negotiable laws). You write tests against the SPEC at `docs/decisions/0001-ch0-foundations.md` Section 9 (acceptance criteria, 15 rows). You do NOT write production code (Runtime dispatch owns implementation, in parallel with you, against the same ADR). You do NOT see Runtime's reasoning trace — write tests against the spec.

## Mission

For every Section 9 row owned by "Test" (rows 4, 5, 6, 7, 9, 12 — confirm by reading ADR §9 yourself), write the test file specified. For rows owned by Runtime + Test jointly, write the test the audit will run. Use `superpowers:test-driven-development` skill — invoke it via Skill tool before starting.

## Required reads (in order)

1. `docs/decisions/0001-ch0-foundations.md` — your authoritative spec. Read end-to-end, focusing on §2, §3, §5, §6, §7, §8, §9.
2. `docs/research/R0-constraints-ledger.md` §3 — the schema reality your fixtures + parser tests must reflect.
3. `tests/fixtures/` — existing fixtures (`rigor-cases.json`, `canary-memo.md`). DO NOT MODIFY EXISTING. Add new ones.
4. `docs/architecture/delivery.md` §test strategy — vitest patterns, coverage gates.

## Test files to write (paths + contents requirements)

### `tests/unit/vault-schemas.spec.ts` (Section 9 row 4)

For EACH of the 10 artifact zones (`position`, `decision`, `workstream`, `stakeholder_person`, `stakeholder_account`, `pre-mortem`, `prediction`, `memo`, `handoff`, `tripwire`, `competitor`):
- Load one fixture from `tests/fixtures/vault/<zone>/sample.md`.
- Parse frontmatter (YAML between `---` markers) — use `js-yaml` or `gray-matter`.
- Assert `parseArtifact(rawYaml, zone)` returns a typed object.
- Assert ALL required fields per schema are present.
- Assert at least one optional field is correctly typed.

Edge cases:
- Position with `correction-log` array (POS-014 fixture).
- Workstream with `arr_impact.amount_usd: 0` bare integer (WS-04 fixture).
- Pre-mortem snake variant (PM-003 fixture) with `probability: "30%"`.
- Pre-mortem kebab variant (PM-001 fixture) with `probability: 15` bare int.
- Stakeholder person AND account both parse.

### `tests/unit/parseArtifact.spec.ts` (Section 9 row 5 — B21)

- `parseArtifact(yamlWithoutType, 'position')` returns `{ type: 'position', ... }` — type injected.
- `parseArtifact(yamlWithoutType, 'decision')` returns `{ type: 'decision', ... }`.
- Same for every zone.
- `parseArtifact(malformedYaml, 'position')` throws `VaultSchemaParseError` with `zone: 'position'` in the error.

### `tests/unit/normalizeKeys.spec.ts` (Section 9 row 6 — B23)

- `normalizeKeys({'last-updated': '2026-05-26'})` returns `{last_updated: '2026-05-26'}`.
- Recursive: `normalizeKeys({a: {'b-c': 1}})` returns `{a: {b_c: 1}}`.
- Arrays of objects: `normalizeKeys({arr: [{'k-v': 1}]})` returns `{arr: [{k_v: 1}]}`.
- Top-level keys with NO hyphens are unchanged.
- Mixed kebab + snake (PM-001 fixture) parses correctly via `parseArtifact`.

### `tests/unit/ipc.spec.ts` (Section 9 row 7)

For EACH of the 22 IpcMessage variants in ADR §3:
- Build a valid payload matching the variant's schema.
- Assert `parseIpc(validPayload)` returns the typed message.
- Build a payload with `kind` correct but a missing required field.
- Assert `parseIpc(invalidPayload)` throws Zod error.
- Build a payload with unknown `kind`.
- Assert `parseIpc(unknownKind)` throws.

### `tests/unit/stub-harness.spec.ts` (Section 9 row 9)

- `STUB_MODE=replay`: `stubClient.invoke(def, ctx)` returns the canned fixture matching `stableHash(def.role, ctx)`.
- `STUB_MODE=record`: invoking writes a new fixture file.
- `STUB_MODE=live`: invoking throws "live not implemented" (Ch.3 wires it).
- `stableHash` returns identical output for identical inputs across runs.

### `tests/unit/installer.spec.ts` (Section 9 row 12 — B29 REGRESSION TEST per ADR §7)

**Critical — this is the test the advisor specifically called out.**

```python
# tests/unit/installer.spec.ts (or .test.ts) — run via vitest with child_process.exec
For each name in [
  'weekly-cash-forecast', 'covenant-tracker', 'renewal-forecast',
  'call-intelligence', 'run-critique', 'system-check',
  'class-aws-connector', 'russell-voice'
]:
  installedLines = countLines('~/.claude/skills/' + name + '/SKILL.md')
  fullBodyLines = countLines('business-planning/skills/' + name + '/SKILL.md')

  if (fullBodyLines === 0):
    SKIP with message "no full body to compare for " + name
  else:
    assert installedLines >= 0.95 * fullBodyLines
       with message: name + " installed " + installedLines + " lines vs full body " + fullBodyLines
```

If `business-planning/skills/` folder doesn't exist for one of the 8 (per R0-Skills `class-aws-connector` was extracted separately), skip the row with a message, don't fail.

### `tests/unit/preflight.spec.ts` (Section 9 row 11 — B33)

- Stub fixture: a Dropbox marker file at a test vault path → preflight FAIL.
- Stub: Google Drive process detection mock → preflight FAIL.
- Stub: skill file < 50 lines → preflight FAIL.
- All clean → preflight OK with exit 0.

### `tests/fixtures/vault/<zone>/sample.md` files

You CREATE the fixtures (one per zone) for the vault-schemas test. Copy verbatim from the live vault path (per R0-Vault):
- `tests/fixtures/vault/position/POS-001.md` — from `vault/positions/active/POS-001-*.md`
- `tests/fixtures/vault/decision/DEC-005.md` — from `vault/decisions/DEC-005-*.md`
- `tests/fixtures/vault/workstream/WS-04.md` (for `arr_impact: 0` edge case) — from `vault/workstreams/WS-04-*.md`
- `tests/fixtures/vault/workstream/WS-03.md` (for divergent `id:` vs `workstream_id:` shape) — from `vault/workstreams/WS-03-*.md`
- `tests/fixtures/vault/stakeholder_person/chasen-michael-ceo.md` — from `vault/stakeholders/internal-exec-board/chasen-michael-ceo.md`
- `tests/fixtures/vault/stakeholder_account/seu-bme.md` — from `vault/stakeholders/customers-top-arr/seu-bme.md`
- `tests/fixtures/vault/pre-mortem/PM-001.md` (kebab) + `tests/fixtures/vault/pre-mortem/PM-003.md` (snake) — from `vault/pre-mortems/`
- `tests/fixtures/vault/prediction/PRED-001.md` (snake) + `tests/fixtures/vault/prediction/PRED-007.md` (kebab) — from `vault/calibration/predictions/`
- `tests/fixtures/vault/tripwire/barclays-leverage-covenant.md` — from `vault/adversarial/financial-tripwires/`
- `tests/fixtures/vault/competitor/engageli.md` — from `vault/adversarial/competitor-watch/`

If a memo or handoff fixture is needed but the vault has no such directory (R0-Vault confirmed memos/ + handoffs/ don't exist yet), write a synthetic fixture matching the spec shape and tag it `# SYNTHETIC FIXTURE — created Ch.0 Test dispatch` in a comment at the top.

## Coverage gates

Per `docs/architecture/delivery.md` §test strategy:
- Unit: ≥80% line coverage of `packages/shared-types/src/` and `packages/stub-harness/src/`.
- Integration: not yet required at Ch.0 (lands at Ch.1+).

Configure vitest in `vitest.config.ts` at root to emit coverage reports (`@vitest/coverage-v8`).

## Discipline

- TDD style: tests describe the intended behavior. They will fail until Runtime's implementation lands. That's expected.
- DO NOT MOCK the Runtime code — your tests run against the real implementation.
- Cite the ADR section + acceptance criterion row in each test file's header docblock.
- DO NOT modify production source files (Runtime's territory).
- Use Sonnet — TDD-style test authoring is the canonical Sonnet case per cost discipline.
- Commit tests in atomic chunks per file (one commit per `tests/unit/<name>.spec.ts`).
- After committing, return structured summary (under 500 words):
  - Test files created (paths).
  - Fixtures created (paths).
  - Coverage estimate based on test count vs source surface.
  - Any spec ambiguity (what + how resolved).
  - Last 10 commit SHAs.
  - Status of `tail -5 .git/auto-push.log`.

## Out of scope

- Production code (Runtime dispatch owns).
- E2E / Playwright tests (Ch.5+ — Ch.0 has no UI).
- Fuzz tests (Ch.2 — SafeWrite is the canonical fuzz target).
- ADR modification.
- Audit/QA work (separate sub-agent post-build).
