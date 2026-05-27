# Phase 1 Ultra-Review — 2026-05-27

## Executive Verdict

**RECOMMENDATION: YELLOW**

The Phase 1 spine is architecturally sound: SafeWrite atomic/hash/git pattern is correct, Verifier input contract assembler fails closed with a 6-lens minimum, all 10 Phase 0 decisions are explicitly resolved, and rigor formula matches PRD §5 exactly. However, five accumulated violations prevent GREEN: (1) six of eight playbooks route to open_qa by default instead of their specified lens rosters; (2) the live Verifier never executes — `verifier-runner.js` is absent and `run-loop.ts` hardcodes pass; (3) the N=3 iteration cap is specified in phase-r-decisions.md but not enforced in state-machine.ts; (4) git-commit failures in safeWrite.ts are swallowed silently, violating the mandatory-audit-trail principle; (5) the stakeholder_1on1_prep playbook wires the wrong lens roster. Phase 2 is conditionally unblocked — the four Critical fixes must be resolved before live runs, not deferred to future chapters.

---

## Per-Dimension Findings

### A) PRD §5 Design Principle Compliance (12 principles)

| Principle | Status | Evidence | Notes |
|---|---|---|---|
| Vault is SSOT — all structured output lands in vault | PASS | `safeWrite.ts:104-229`; SQLite at userData, vault at VAULT_PATH | SQLite = runtime store; vault = final output. Correct split. |
| Vault writes are git-tracked with auto-commit | CONCERN | `safeWrite.ts:213-229` | Commit fires, but lines 227-229 swallow git errors with silent catch. A failed commit produces no error, no retry, no flag. |
| Parallel-independent lens execution (no cross-lens contamination) | PASS | `shared-types/src/lens-context-bundle.ts`; `verifierInput.ts` calls `findCrossLensLeaks()` | B3 keystone fixed in Ch.3; isolation enforced. |
| Plan-approval gate before any MCP or external call | PASS | `state-machine.ts:57-60` — `plan-approved` required before `mcp-gather` transition | Legal transition enforced. |
| Synthesizer/Verifier split — separate models, separate prompts | PASS | `Synthesizer.prompt.md` (Sonnet); `Verifier.prompt.md` (Opus); separate files, separate schemas | Correct structural split. |
| Every claim citation linked to tool-call row in SQLite | PASS | `shared-types/src/verifier-input.ts:ToolCallAuditEntry`; `MemoViewer.tsx:39-80` | Citation badge → IPC → `queryToolCallBySourceId`. AC-7 BY-HAND verified. |
| Rigor gate — memo below threshold written as .draft.md | PASS | `safeWrite.ts` + `scoring/rigorScore.ts`; `shipStatus()` → draft path in safeWrite | AC-8 green. |
| Auto draft write-back when rigor gate fails | PASS | `run-loop.ts:87-108` — `writeback-proposed` state triggers safeWrite with `.draft.md` suffix | Correct. |
| Iterative feedback loop until convergence or N=3 | CONCERN | `state-machine.ts:224` sets `iteration: 1` on `review` entry; no guard in `review → write-back-proposed` transition | Decision 3 in phase-r-decisions.md locks N=3 but no enforcing code exists. Infinite loop possible. |
| Concurrent-edit safety for Cowork | PASS | `safeWrite.ts:145-175` — sidecar `.conflicts` file on hash mismatch | Decision 1 (accept sidecar conflicts) implemented. |
| Round-table substance ribbon | CONCERN | `state-machine.ts` IPC events defined; `RoundTable.tsx` scaffold exists | AC-9 RTL tests are `it.skip`; no active assertion that the substance ribbon renders non-empty content. |
| No auto-distribution (human gate before export) | PASS | `Home.tsx` — no distribution trigger wired; plan-approval gate in state machine | No auto-send path exists in Ch.0-5. |

**A summary: 9 PASS / 3 CONCERN / 0 FAIL**

---

### B) PRD §6 Product Surface

| Item | Status | Evidence | Notes |
|---|---|---|---|
| 6 lens prompts shipped | PASS | `apps/utility/src/prompts/`: CEO, CFO, CRO, CMO, CPO, COS all present | All 6 authored with structured output schemas. |
| Cash lever playbook routed correctly | PASS | `classify-playbook.ts:25-50` — `cash_lever` routes with correct lens roster | Cash lever: CEO+CFO+CRO in run-plan-builder.ts. |
| Stakeholder 1:1 Prep routed — correct lens roster | FAIL | `run-plan-builder.ts:92` — wires `lenses: ['CEO', 'COS']`; PRD §6 playbook 4 specifies "COS only — single-agent fast lane" | CEO lens incorrectly added. Two-lens cost for a single-lens playbook. |
| 6 remaining playbooks routed to correct lens roster | FAIL | `classify-playbook.ts:70-77` — all 6 fall through to `open_qa` with `AD-HOC` stamp | weekly_cash_forecast, quarterly_ops_review, annual_plan_workshop, pre_mortem, red_ocean_teardown, quick_read all misrouted. |
| 7 non-cash playbooks shown as "Coming in Ch.7" tiles | PASS | `Home.tsx` — 7 tiles with `lit: false`; tile label visible | Correct deferral presentation. |
| Open Q&A bar | PASS | `Home.tsx` — Q&A bar present with `openQAMode` flag | Correctly present. |
| 5 V1 MCPs stubbed | PASS | `cash-lever/index.ts` — 5 MCP stubs present; real wiring deferred to Ch.8 per ADR-0006 §8 | Plumbing correct. |
| Scheduled jobs | PASS (DEFERRED) | ADR-0006 §8 — deferred to Ch.10 explicitly | Correct deferral. |
| Cowork handoff capability | PASS (DEFERRED) | ADR-0005 §7 — deferred to Ch.9 explicitly | Correct deferral. |
| Iterative feedback pane | PASS (DEFERRED) | ADR-0006 §8 — deferred to Ch.6 explicitly | Correct deferral. |
| Output format and brand standards | PASS | `mockup-generator.spec.ts` green; 8 mockups confirmed at `~/Desktop/cstuite-design-step-{1..8}.html`; navy/purple/gold tokens present | AC-11 verified. |
| Run cost transparency | PASS | `Home.tsx` — `useCostUsage` hook wired to cost meter | Present. |

**B summary: 8 PASS / 0 CONCERN / 2 FAIL** (playbook routing + stakeholder lens roster)

---

### C) The 4 Critical Issues

| Issue | Status | Evidence | Notes |
|---|---|---|---|
| C-1: Verifier input contract — reads ONLY structured outputs from SQLite | PASS | `shared-types/src/verifier-input.ts` — `lensOutputs: z.array(LensOutputSchema).min(6).max(6)`; all 6 required fields present; toolCallAuditTrail with source_id; positionMetadata; redTeamOutput; steelmanOutput | Contract assembler fails closed. No reasoning-trace field in schema. |
| C-2: Vault git-tracked with auto-commit on every write | CONCERN | `safeWrite.ts:213-229` — simple-git fires on every write; commit message format correct: `c-suite: ${agent} wrote ${relPath} during ${playbook} run ${runId}`. BUT lines 227-229: `} catch { /* git commit failed — non-fatal */ }` — silent swallow | Commit fires correctly. Failure is invisible. Audit trail could have silent gaps. |
| C-3: MCP credentials never plaintext | CONCERN | No `safeStorage` write path exists in `apps/` or `packages/` (Ch.8 scope). Grep confirms no `apiKey`, `consumerSecret`, or `password` literals in production code — but the plumbing Russell will need is completely absent, not just "deferred but scaffolded." | Per brief: "Ch.0-5 just plumbed." No plumbing exists yet. Cannot mark PASS. Cannot mark FAIL (Ch.8 scope). CONCERN with reason. |
| C-4: Phase 0 exit criteria — all 10 decisions resolved | PASS | `docs/research/phase-r-decisions.md` — all 10 decisions present with explicit RECOMMENDATION + RATIONALE + SPEC-PATCH entries; all 8 spec-patch checklist items marked [x] | All 10 resolved. |

**C summary: 2 PASS / 2 CONCERN / 0 FAIL**

---

### D) The 8 Important Issues

| Issue | Status | Evidence | Notes |
|---|---|---|---|
| D-1: C-Suite/Cowork concurrent-write | PASS | `safeWrite.ts:145-175` — hash mismatch on re-read writes `.conflicts` sidecar | Decision 1 implemented. |
| D-2: Verifier anti-sycophancy heuristics | PASS | `Verifier.prompt.md` — all 5 patterns: structural isolation, forced JSON, Opus model spec, null-rejection, canary sentence; discretionary falsifier 15pts with structured rubric | Solid. |
| D-3: Iterative feedback convergence rule (N=3) | CONCERN | `state-machine.ts:224` — `iteration: 1` set on review entry; `review → write-back-proposed` transition (lines 229-235) has no max guard | Decision 3 says "N=3 hard cap." No enforcement in code. |
| D-4: Playbook missing-prerequisite handling | CONCERN | `run-plan-builder.ts` has `DegradationWarning` for missing MCP data; ADR-0006 §3 documents the pattern. No enforcement for structural prereqs (e.g., vault-bootstrap.sh not run = B22 active). `VaultNotInitializedError` at `safeWrite.ts:95-116` throws correctly — but only catches vault-not-init, not missing xlsx or missing SSO. | Partial: vault guard present; MCP degraded-mode present; structural prereq enforcement incomplete. |
| D-5: Scheduled job error/retry | PASS (DEFERRED) | ADR-0006 §8 — deferred to Ch.10. No scheduler code exists yet. Correct deferral. | No concern at Ch.5 stage. |
| D-6: Plan-approval UX per playbook | CONCERN | `PlanApproval.tsx` scaffold exists; IPC types defined. `playbook-classifier.spec.ts` has 2 `it.skip` for "needs orchestrator integration." No active test asserts plan-approval gate blocks MCP calls per playbook type. | Spec correct; enforcement unverified. |
| D-7: Daemon edge cases | PASS (DEFERRED) | Ch.10 scope per ROADMAP.md. No daemon code shipped in Ch.0-5. | Correct deferral. |
| D-8: Run cost transparency | PASS | `Home.tsx` — cost meter wired via `useCostUsage`; IPC type `cost:update` defined in shared-types | Present. |

**D summary: 4 PASS / 3 CONCERN / 0 FAIL / 1 DEFERRED**

---

### E) Slop-Risk Surfaces

| Surface | Status | Evidence | Notes |
|---|---|---|---|
| Pass 3 red-team never bypassed | CONCERN | `state-machine.ts:31-46` legal transitions: every run goes `fan-out → red-team-steelman → synthesizer`. No playbook-specific bypass path. BUT PRD §5 + PRD §6 specify Quick Read and 1:1 Prep as bypass-eligible. The bypass is NOT implemented — Quick Read gets the same full pipeline. This is both a slop-risk gap (Quick Read should be lighter) and a feature gap. | Red-team is never bypassed — which prevents slop but contradicts PRD's intended fast lanes. No bypass in place is safer from slop perspective but misaligned with spec. |
| Live Verifier executes | FAIL | `run-loop.ts:109-114` — `verifier.pass({ rigorScore: 85 })` hardcoded; `verifier-runner.js` absent from `apps/utility/src/agents/`; only `index.ts` and `registry.ts` present | The Verifier is the primary slop-risk check. It never runs in the current codebase. All runs produce rigorScore=85 regardless of memo quality. |
| Unverified claims stripped or visually flagged | PASS | `Synthesizer.prompt.md` — "FALSIFIERS — NON-NEGOTIABLE" section; `MemoViewer.tsx` DRAFT banner for rigor<70 | Contract is correct; enforcement depends on live Verifier (which is absent). |
| Verifier discretionary 10pts has structured rubric | PASS | `Verifier.prompt.md` — falsifier dimension is 15pts with structured rubric (not free-form); weights 35/20/15/15/15 | Correct. Note: brief says "10pts" but PRD §5 + Verifier.prompt.md both say 15pts for falsifier. Brief's "10pts" appears to be a stale reference. |

**E summary: 2 PASS / 1 CONCERN / 1 FAIL**

---

### F) Skill Substrate Integration

| Item | Status | Evidence | Notes |
|---|---|---|---|
| 8 skills from _extracted_skills ingested | CONCERN | `docs/research/R0-skill-inventory.md` — all 8 skills have TRUNCATED stubs at `~/.claude/skills/`; full bodies at `business-planning/skills/`. No `grep` of `apps/` or `packages/` finds any invocation of skill names or subprocess calls to skill binaries | Skills exist as files. None are referenced, imported, or invokable from production code. "Ingested" per skill-inventory claim; "wired" = no. |
| russell-voice baked into Synthesizer + Verifier | PASS | `Synthesizer.prompt.md:32-105` — "VOICE RULES — russell-voice" section verbatim; `Verifier.prompt.md` — structural isolation enforces russell-voice output check | Both prompts carry the voice rules. |
| renewal-forecast Owner.Name BUG fixed | PASS | `apps/utility/src/prompts/cro.prompt.md` — SOQL builder uses `Account_Manager__r.Name` with `IsActive = TRUE` filter; no `Opportunity.Owner.Name` present | Bug fixed in CRO prompt. |

**F summary: 2 PASS / 1 CONCERN / 0 FAIL**

---

### G) Phase 0 Decisions

| Decision | Status | Evidence |
|---|---|---|
| 1 — Cowork concurrent-write | PASS | `phase-r-decisions.md` §1: RECOMMENDATION = accept sidecar conflicts; implemented in safeWrite.ts |
| 2 — Verifier anti-sycophancy | PASS | `phase-r-decisions.md` §2: 5 simultaneous patterns; Verifier.prompt.md implements all 5 |
| 3 — Iterative feedback N=3 | PASS | `phase-r-decisions.md` §3: RECOMMENDATION = N=3 hard cap | Decision resolved; enforcement not yet in code (flagged D-3) |
| 4 — Synthesis model | PASS | `phase-r-decisions.md` §4: Sonnet for Synthesizer, Opus for Verifier; prompts reflect this |
| 5 — Vault storage format | PASS | `phase-r-decisions.md` §5: markdown with YAML frontmatter; safeWrite.ts enforces |
| 6 — Lens isolation | PASS | `phase-r-decisions.md` §6: buildLensContextBundle + findCrossLensLeaks; Ch.3 keystone implemented |
| 7 — Rigor formula weights | PASS | `phase-r-decisions.md` §7: 35+20+15+15+15=100; rigorScore.ts matches exactly |
| 8 — SQLite schema for tool_calls | PASS | `phase-r-decisions.md` §8: source_id column; migration-003 confirmed in Ch.5 audit |
| 9 — PowerBI skill invocation | PASS | `phase-r-decisions.md` §9: Python subprocess with -j flag |
| 10 — Credential storage | PASS | `phase-r-decisions.md` §10: safeStorage only; deferred to Ch.8 per decision |

**G summary: 10 PASS / 0 CONCERN / 0 FAIL**

---

## Consolidated Rollup

### Critical Fixes (must do before Phase 2)

1. **Live Verifier absent** — `apps/utility/src/agents/verifier-runner.js` does not exist; `run-loop.ts:109-114` hardcodes `verifier.pass({ rigorScore: 85 })`. Every run produces a fabricated rigor score. The Verifier is the primary quality gate. Until this ships, the rigor system is entirely bypassed. [E: FAIL]

2. **Playbook routing — 6 of 8 misrouted** — `classify-playbook.ts:70-77` falls through to `open_qa` with `AD-HOC` for: weekly_cash_forecast, quarterly_ops_review, annual_plan_workshop, pre_mortem, red_ocean_teardown, quick_read. Each has a specified lens roster in PRD §6 that is never applied. [B: FAIL]

3. **stakeholder_1on1_prep wrong lens roster** — `run-plan-builder.ts:92` wires `['CEO', 'COS']`; PRD §6 specifies "COS only — single-agent fast lane." CEO lens incorrectly added, doubling inference cost and violating the fast-lane spec. [B: FAIL]

4. **N=3 iteration cap unenforced** — `state-machine.ts:224-235`: `review → write-back-proposed` loop has no guard on `iteration`. Decision 3 (phase-r-decisions.md) explicitly locks N=3. An unbounded loop is a runaway risk on every live run. [D-3: CONCERN]

5. **Silent git-commit failure in safeWrite** — `safeWrite.ts:227-229` swallows git errors with empty catch. A failed commit produces no log entry, no error state, no IPC event. PRD §5 mandates every write is git-tracked; silent failure destroys that guarantee without detection. [C-2 / A: CONCERN]

### Important Fixes (should do before Phase 2)

1. **8 skills not wired into production code** — `R0-skill-inventory.md` lists 8 Cowork skills as ingested; zero have invocation paths in `apps/` or `packages/`. PRD §5 requires skill substrate integration. Skills as inert files provide no value. [F: CONCERN]

2. **Plan-approval gate per playbook unverified** — `playbook-classifier.spec.ts` has 2 `it.skip` for plan-approval orchestrator integration. No active test asserts MCP calls are blocked before `run.plan.approved`. AC-10 is NW. [D-6: CONCERN]

3. **MCP credential plumbing absent** — No safeStorage write path exists in Ch.0-5. Decision 10 defers implementation to Ch.8, but no scaffold, interface, or placeholder marks the integration point. Ch.8 will discover a blank slate. [C-3: CONCERN]

4. **Round-table substance ribbon unverified** — `round-table-honest-signal.spec.ts` has 3 `it.skip` for RTL integration. AC-9 is NW. No active test confirms `RoundTable.tsx` renders non-empty content during a run. [A / ch5 audit: CONCERN]

5. **B22 ACTIVE — vault has zero commits** — Russell has not run `scripts/vault-bootstrap.sh`. `safeWrite.ts:95-116` throws `VaultNotInitializedError` on first write. AC-6 is blocked. No live run can complete until this is resolved on-Mac. [BLOCKERS.md B22]

### Optional Improvements

1. **Quick Read / 1:1 Prep red-team bypass** — PRD §5 lists these as bypass-eligible; state-machine.ts forces full pipeline. Currently over-delivers (safer from slop perspective) but misaligned with spec. Lower priority than routing gaps above.

2. **Verifier discretionary rubric label** — Brief says "10pts" for discretionary; actual implementation is 15pts for falsifier. Brief is stale; code is correct. Update brief or ADR for consistency.

3. **`isQuantOrNamed` module flip** — `is-quant-or-named.spec.ts` asserts the module is RED (not yet resolvable). When activated, test must be flipped to a real import assertion. Currently passes by design; will silently break if module path changes.

---

## Sign-off

Auditor: Ultra-Review (independent Audit sub-agent, fresh context, did not build any Phase 1 code)
Date: 2026-05-27
Phase 1 commits reviewed: 199 from `bd5446a` (initial commit) to `fa6d3cb` (ultrareview brief)
Test run baseline at review: 784 passed / 16 skipped / 0 failed (800 total)
