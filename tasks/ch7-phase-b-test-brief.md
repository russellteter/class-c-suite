# Ch.7 Phase B — Test Builder Brief

You are the Test sub-agent for C-Suite Phase 2 Ch.7 **Phase B**. Phase A audit closed CONCERN-CLOSE; Phase A's 185 specs pass. You add specs for the 4 homogeneous playbooks.

## Working directory
`/Users/russellteter/Claude Code Projects/c-suite/` (quote — has spaces).

## Phase B test scope
- 4 playbook specs (one file per playbook): `gtm_realloc`, `strategic_option`, `board_narrative`, `restructure_decision`.
- An extension to `evaluatePrereqs.spec.ts` (if the Runtime sub-agent added new prereq cases — verify by reading the source post-dispatch).
- An extension to `playbookRouter.spec.ts` — assert the 4 Phase B playbooks now route correctly (no `throw 'not implemented'`).

**Out of scope:** Phase A specs (already pass; do not modify). Renderer specs (no Phase B renderer changes). Integration / E2E (Audit/QA owns).

## You operate under DOCTRINE
- Truth over completion appearance.
- One assertion per `it`. Split if you need multiple.
- Use `StubClaudeClient` from `@c-suite/stub-harness/stub` for LLM-call mocking — seed deterministic outputs.
- If a spec genuinely can't be written, `it.todo('reason')` is acceptable (cap at 5%).

## Scope (yours alone — non-overlapping with Runtime brief)

### 1. `tests/unit/playbooks/gtm-realloc.spec.ts`
- LENSES constant equals `['CRO', 'CFO', 'CMO', 'CPO', 'COS']`.
- Threshold = 70.
- All 5 lenses dispatched in parallel (assert via mocked `dispatchLens` call count + args).
- Salesforce auth-expired → block; degrade on stale (per Phase R Decision 4).
- Stamp set: CLEAN | DRAFT | DEGRADED.
- Memo output contains expected sections (current GTM cost, recommended reallocation, pipeline impact, risks, workstream-update proposals).

### 2. `tests/unit/playbooks/strategic-option.spec.ts`
- LENSES constant equals `['CEO', 'CFO', 'CPO', 'COS']`.
- Threshold = 80.
- Block when Salesforce + AWS + cash-data not all available; degrade otherwise.
- **Heavy Red-Team pass fires** — assert RedTeam lens is called AFTER Synthesizer's draft, with `{ synthesizedMemo, originalPrompt }` inputs only (no lens transcripts — B3 invariant spot-check).
- Three options surface in memo output (one per `recap | sale | wind_down | turnaround`, Synthesizer picks the most-relevant three).
- Writebacks: prediction proposals + (conditionally) decision proposals + workstream-update proposals.

### 3. `tests/unit/playbooks/board-narrative.spec.ts`
- LENSES constant equals all six.
- Threshold = 70.
- Block if any of {Salesforce, NetSuite, PowerBI, calibration} unavailable.
- Memo footer contains "Draw up for Cowork" CTA with `class-brand-presentations` skill name.
- Writebacks: position-update + prediction proposals.
- Stamp set: CLEAN | DRAFT | DEGRADED.

### 4. `tests/unit/playbooks/restructure-decision.spec.ts`
- Baseline LENSES = `['COS', 'CFO']`.
- **CPO added** when `subject.role` contains 'product' (case-insensitive). Test 6 cases: 'CTO', 'VP Eng', 'VP Product', 'product manager' → CPO added; 'CFO', 'SVP Sales' → CPO NOT added.
- Threshold = 80.
- Block if Salesforce + NetSuite + cash-model unavailable.
- **Heavy Red-Team section** in memo output (separate section title verifiable in memo).
- Writebacks: decision proposal + workstream-update + position-update.

### 5. Extend `tests/unit/playbooks/playbookRouter.spec.ts`
- 4 new `it()` assertions: each Phase B playbook id → `routeToPlaybook(id)` returns a module with `runPlaybook` function (no `throw`).

### 6. Possibly extend `tests/unit/playbooks/evaluatePrereqs.spec.ts`
- Read the post-Runtime-dispatch state of `apps/utility/src/playbooks/lib/evaluatePrereqs.ts`. If Runtime added new prereq cases, add specs to cover them. Otherwise, no changes needed.

## Forbidden inferences

- Testing Phase A playbooks again (their 185 specs already pass).
- Asserting LLM behavior nondeterministically — use `StubClaudeClient` with seeded outputs.
- Reading the Verifier reasoning trace from any test — B3 invariant.
- Modifying production code.

## What "done" looks like

- 4 new spec files written + extensions to `playbookRouter.spec.ts` (and `evaluatePrereqs.spec.ts` if needed).
- `pnpm vitest run` exit-0 clean. All new specs pass; Phase A's 185 still pass; pre-existing 80 failures unchanged.
- ≥50 new specs across the 4 playbook files (rough estimate; quality > count).
- Atomic commits: one file per commit ideally. `ch.7 tests: <file> — <N specs>`. No Claude attribution.

## Report-back (≤200 words)

- Commits made (SHA + first-line message).
- Spec count by file.
- `pnpm vitest run` final summary: passed / failed / todo.
- Any `it.todo` retentions + reason.
- Any blocker hit + three approaches tried.

DO NOT touch production code. DO NOT close the chapter.
