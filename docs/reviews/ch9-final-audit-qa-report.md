# Ch.9 Final — Audit/QA Report

**Date:** 2026-05-27
**Auditor:** EvidenceQA sub-agent (independent)
**Scope:** Full Ch.9 — Handoff agent + brief schema + UI preview + link-back watcher + 156 new specs
**Verdict:** CONCERN-CLOSE

## Summary

Ch.9 core functionality is correct: the B3 invariant is clean, the explicit-trigger guard is properly gated, DrawUpCTA is correctly scoped, all 221 Ch.9-scoped specs pass, and typecheck exits clean across all 9 packages. Three issues require fixes before Ch.10 entry. Two are concrete bugs — a stale fixture that Ch.9's tightened Zod schema now rejects (breaking AC-13), and a `pre_mortem` vs `pre-mortems` path-naming drift between the IPC handler and the linkback resolver (breaks linkback for pre-mortem origin type in production). One is a structural gap — the IPC handler builds a nearly empty HandoffGeneratorInput claiming "runner.ts enriches from vault" but runner.ts does no vault enrichment; production briefs triggered from the IPC path will have empty body, frontmatter, stakeholder, and workstream data.

## AC-by-AC verdict

| AC | Verdict | Evidence |
|---|---|---|
| AC-1 | PASS | `packages/shared-types/src/handoff.ts:37-55` — Zod schema; `runner.ts:141` calls `HandoffFrontmatter.parse(frontmatterRaw)`; 8-section body contract enforced in `prompt.ts:22-34` |
| AC-2 | PASS | `apps/utility/src/agents/handoff/prompt.ts:7` — "You are Russell's Chief of Staff"; no lens role introduced |
| AC-3 | PASS | `skill-selector.ts:29,34,39,44` — 5 heuristic case regexes; `pickAllBrandSkills` covers cyan-light variant; 23 skill-selector specs pass |
| AC-4 | PASS with concern | `writer.ts:52-64` calls `safeWrite`; `runner.ts:113` writes to `path.join(handoffsDir, filename)`; BUT IPC trigger path (`index.ts:100-104`) passes empty body/frontmatter — no vault enrichment happens; see Issue 3 |
| AC-5 | PASS | `writer.ts:67-73` calls `regenerateHandoffIndex(db)` after every successful safeWrite; `indexRegen.ts:83-84` does full directory scan excluding INDEX.md — deletions propagate |
| AC-6 | PASS | DrawUpCTA grep: `MemoViewer.tsx:13,192` and `AcceptedHistory.tsx:10,175` only. `AcceptedHistory.tsx:170-176` guards on `entry.originType === 'decision' || 'position' || 'pre_mortem'` — excludes prediction/stakeholder/workstream. No DrawUpCTA import in any prediction/stakeholder/workstream component. |
| AC-7 | PASS | `HandoffPreview.tsx:345` renders `data-testid="brief-body-rendered"`; `textarea` at line 323 for editing; "Send to Cowork" button at line 441 |
| AC-8 | PASS | `handleCancel` at `HandoffPreview.tsx:137-140` calls `sendHandoffCancelled` + `onClose()` — no file write. File write only triggered by `handleSend` at line 116-134. |
| AC-9 | PASS | `executionLinkback.ts:164-181` — chokidar `add` event triggers `appendExecutedBy`; BUT pre-mortem origin path drift (see Issue 2) |
| AC-10 | PASS | `executionLinkback.ts:117-119` — `if (executedBy.includes(executionPath)) return { updated: false }` before any write |
| AC-11 | PASS | `AcceptedHistory.tsx:166-167` — `<LinkedExecution executedBy={entry.executedBy ?? null} />` rendered when field is populated |
| AC-12 | PASS | B3 invariant grep: ZERO hits for `thinking\|chain_of_thought\|reasoning_trace` in `apps/utility/src/agents/handoff/`. `runner.ts:27-54` explicitly whitelists prompt context fields with `// NOTE: no lensOutputs, no redTeam, no steelman, no verifierOutput — B3` at line 53 |
| AC-13 | CONCERN | Ch.9-scoped specs (221) all pass; however `tests/unit/vault-schemas.spec.ts` (2 tests) and `tests/unit/parseArtifact.spec.ts` (1 test) fail because the pre-existing `tests/fixtures/vault/handoff/sample.md` (created Ch.0, commit `6af34d1`) was not updated when Ch.9 tightened the Zod schema |

## Issues found

1. **Stale fixture breaks AC-13 (vault-schemas + parseArtifact 3 tests fail)**
   - `tests/fixtures/vault/handoff/sample.md` — fixture authored Ch.0 (`6af34d1`), schema tightened Ch.9 (`5d28f51`)
   - Fixture missing required fields: `origin_type`, `origin_path`, `created_by_run_id`
   - Fixture has invalid `cowork_brand_skills` values: `weekly-cash-forecast`, `covenant-tracker` — not in the closed-set enum (`class-brand-document | class-brand-excel | class-brand-presentations | class-ppt-cyan-light | class-brand-voice`)
   - Error evidence: `VaultSchemaParseError [zone=handoff]: invalid_value on origin_type, invalid_type on origin_path + created_by_run_id`
   - Priority: HIGH — AC-13 explicitly requires vitest exit-0 for new specs; this is a Ch.9-introduced regression (schema tightened, fixture not updated)
   - Fix: Update `tests/fixtures/vault/handoff/sample.md` with valid fields per the current `HandoffFrontmatter` Zod schema

2. **`pre_mortem` path-naming drift between IPC handler and linkback resolver**
   - `apps/utility/src/index.ts:100` — builds `path: \`${payload.originType}s/${payload.originId}.md\`` — for `pre_mortem` origin type this produces `pre_mortems/<id>.md` (underscore)
   - `apps/utility/src/watchers/executionLinkback.ts:43` — `resolveOriginPath` maps `PM-NNN` IDs to `pre-mortems/<id>.md` (hyphen, matches vault convention)
   - These paths never reconcile: the IPC-constructed `origin_path` field stored in handoff frontmatter will use `pre_mortems/` while the linkback resolver uses `pre-mortems/`, meaning `executed_by` writebacks for pre-mortem artifacts will write to the wrong origin path
   - Priority: MEDIUM — silent data integrity bug; affects pre-mortem execution tracking only
   - Fix: Normalize `pre_mortem` → `pre-mortems` in `index.ts:100` path constructor

3. **IPC handler builds empty HandoffGeneratorInput; no vault enrichment in runner**
   - `apps/utility/src/index.ts:93-104` — comment at line 93 states "The renderer provides only the trigger fields; runner.ts enriches from vault" but `runner.ts:27-54` (`buildPromptContext`) does no vault enrichment — it uses `input.origin.bodyMarkdown`, `input.origin.frontmatter`, `input.runContext.stakeholdersOfInterest` etc. directly
   - Production briefs triggered via the explicit CTA path will have: empty `bodyMarkdown`, empty `frontmatter`, empty `stakeholdersOfInterest`, empty `workstreamsOfInterest`, no `memoMarkdown`
   - The resulting brief will have valid structure (Zod passes) but every section will default to "UNKNOWN — verify with Russell before sending"
   - Priority: MEDIUM — functional gap, not a crash; briefs generate but are empty/useless from this trigger path
   - Fix: Either implement vault enrichment in a `fetchOriginContext(originType, originId, vaultPath)` helper called before `generateHandoffBrief`, or document in the ADR that the IPC trigger path produces a scaffold-only brief requiring manual editing

## Spot-checks summary

- **Typecheck**: PASS — `pnpm -r typecheck` exits 0 across all 9 workspace packages (apps/utility, apps/renderer, apps/main, packages/shared-types, packages/vault-watcher, packages/vault-writer, packages/writeback-engine, packages/stub-harness, packages/soql-builder)
- **Vitest (Ch.9 scope)**: PASS — 221/221 Ch.9 specs pass (`tests/unit/agents/handoff`, `tests/unit/watchers`, `tests/unit/renderer`)
- **Vitest (full suite)**: CONCERN — 97 failures / 1701 pass / 1814 total; 3 failures are Ch.9-introduced regressions (vault-schemas + parseArtifact fixture drift); remaining 94 failures are pre-existing (better-sqlite3 ABI mismatch, RED stubs, Ch.5 unshipped)
- **B3 invariant grep**: PASS — ZERO hits for `thinking|chain_of_thought|reasoning_trace` in `apps/utility/src/agents/handoff/`
- **CTA forbidden-surfaces grep**: PASS — `DrawUpCTA` imports exist only in `MemoViewer.tsx:13`, `AcceptedHistory.tsx:10`, and `DrawUpCTA.tsx:1` itself. Zero imports in prediction/stakeholder/workstream screens
- **Explicit-trigger guard**: PASS — `apps/utility/src/index.ts:85-87` — comment "ONLY fires when renderer sends handoff.preview.requested; never auto" enforced by explicit `kind === 'handoff.preview.requested'` check; no auto-trigger on `writeback.accepted` or any other event
- **Link-back idempotency**: PASS — `executionLinkback.ts:117-119` — `if (executedBy.includes(executionPath)) return { updated: false }` guards before append; 10 idempotency specs pass

## Ch.10 dispatch recommendation

Hold until Issue 1 (fixture fix, AC-13 regression) is resolved. Issues 2 and 3 are medium-priority and may be addressed in the same fix commit or deferred to Ch.10's scope with an ADR amendment. Issue 1 is a blocking regression introduced in Ch.9 — vitest must exit clean before Ch.10 entry.

Recommended path: developer fixes `tests/fixtures/vault/handoff/sample.md` + `index.ts:100` path constructor in a single commit; confirm `pnpm vitest run` exits 0; re-audit is a desk-check (no full audit needed for these targeted fixes). Issue 3 (missing enrichment) should be resolved via ADR amendment if the scaffold-only behavior is intentional, or via implementation if not.
