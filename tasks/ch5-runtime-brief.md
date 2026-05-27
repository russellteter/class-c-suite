# Ch.5 Runtime — Cash Lever First End-to-End Slice Implementation

## Your role

Runtime engineer for Ch.5. Implements against `docs/decisions/0006-ch5-cash-lever-slice.md`. Activates 7 TDD-RED test files from Ch.5 Test + adds the cash-lever production logic. DOCTRINE law #7.

This is the FIRST USABLE PRODUCT milestone. After Ch.5: Russell can ask "should we shift our W30 trough mitigation..." and get a sourced rigor-scored memo in the vault.

## Required reads

1. `docs/decisions/0006-ch5-cash-lever-slice.md` — your spec.
2. `docs/decisions/0004-ch3-runtime-spine.md` — RunState machine + 12 AgentDefinitions (Ch.3 Runtime ships these).
3. `docs/decisions/0005-ch4-prompts-rigor.md` — prompts + rigor (Ch.4 Runtime ships these).
4. `apps/utility/src/orchestrator/` (Ch.3 Runtime shipped).
5. `apps/utility/src/prompts/` (Ch.4 Runtime shipped).
6. `apps/utility/src/scoring/` (Ch.4 Runtime shipped).
7. `tests/e2e/cash-lever-stub.spec.ts` + `tests/unit/playbook-classifier.spec.ts` + `tests/unit/run-plan-builder.spec.ts` + `tests/unit/click-claim-tool-call.spec.ts` + `tests/unit/draft-path.spec.ts` + `tests/unit/round-table-honest-signal.spec.ts` + `tests/unit/degraded-mode.spec.ts` + `tests/unit/mockup-generator.spec.ts`.
8. `docs/architecture/ui.md` §design tokens + §round-table contract + §memo viewer.

## Deliverables

### Section 1 — Playbook classifier

`apps/utility/src/playbooks/classifier.ts`:
- `classifyPlaybook(question: string): PlaybookId` — heuristic + keyword-based classifier.
- Initially routes "cash lever" / "trough" / "W30" / "AWS spend" → `cash_lever`.
- Routes "1:1" / "prep" / stakeholder name → `stakeholder_1on1_prep` (stub for Ch.7).
- Default to `open_qa` with AD-HOC stamp.

### Section 2 — RunPlan builder

`apps/utility/src/playbooks/runPlanBuilder.ts`:
- `buildRunPlan(playbook, question): RunPlan`.
- For cash_lever: lenses = [CFO, COS], mcps = ['salesforce', 'aws', 'netsuite', 'cash_model_xlsx'], tokenEstimate via Ch.1 scheduler.canDispatch().

### Section 3 — Cash lever playbook orchestration

`apps/utility/src/playbooks/cash-lever/index.ts`:
- Wires the RunState machine for cash lever specifically.
- CFO + COS lenses fan out in parallel.
- Tool calls: SF SOQL (per `apps/utility/src/mcps/salesforce/queries.ts` from Ch.8 placeholder — for Ch.5 use stub), AWS Cost Explorer (stub), NetSuite SuiteQL (stub), xlsx parse (stub).
- Each tool call inserts a row in `tool_calls` with `source_id`.

### Section 4 — UI screens (4 mockups + 4 React components)

#### Mockups (HTML, via html-driven-codev pattern)

Generate 8 mockups via `html-driven-codev` skill OR write static HTML files at:
- `~/Desktop/cstuite-design-step-1.html` (design-system sheet)
- `~/Desktop/cstuite-design-step-2.html` (home stub)
- `~/Desktop/cstuite-design-step-3.html` (plan-approval)
- `~/Desktop/cstuite-design-step-4.html` (round-table quiet)
- `~/Desktop/cstuite-design-step-5.html` (round-table mid-run)
- `~/Desktop/cstuite-design-step-6.html` (round-table synthesis)
- `~/Desktop/cstuite-design-step-7.html` (memo clean)
- `~/Desktop/cstuite-design-step-8.html` (memo draft)

Per design tokens in `docs/architecture/ui.md`. Per DOCTRINE override + Phase R Decision 6: mockups auto-approved (no Russell countdown).

#### React components

`apps/renderer/src/screens/`:
- `Home.tsx` — 8 tiles + Open Q&A bar.
- `PlanApproval.tsx` — review + Approve/Edit/Cancel.
- `RoundTable.tsx` — substance-ribbon contract, IPC subscription.
- `MemoViewer.tsx` — markdown with clickable citations + side panel.

### Section 5 — Click-claim → tool-call panel

`apps/renderer/src/screens/MemoViewer.tsx`:
- Parses memo markdown; each `[^source-id]` footnote becomes a button.
- Click → IPC `ipc.invoke('tool-call:get', { call_id })` → SQLite `SELECT * FROM tool_calls WHERE call_id = ?` → render in side panel.

### Section 6 — DRAFT path

When `verifier.score.rigor_score < 70`:
- Memo file path gets `.draft.md` suffix.
- UI renders amber DRAFT banner + expandable failure_reasons.

### Section 7 — Degraded-mode handling

Per ADR §degraded-mode + AC-12:
- AWS SSO expired → flag `degraded_sources: ['aws']` in synthesizer output.
- Memo banner: "ran with stale AWS data — re-consent needed."
- Run continues (don't crash on AWS failure alone).

## Commit discipline

1. `ch5: playbook classifier + RunPlan builder (AC-2 + AC-3)`
2. `ch5: cash lever orchestration + stub MCP calls (AC-1)`
3. `ch5: 8 design mockups (HTML; ui.md tokens; AC-11)`
4. `ch5: Home + PlanApproval React screens`
5. `ch5: RoundTable component (honest-signal contract; AC-9)`
6. `ch5: MemoViewer + click-claim tool-call panel (AC-7 + AC-8)`
7. `ch5: degraded-mode handling (AC-12)`

Each auto-pushes.

## Verify before claiming done

- `pnpm -r run typecheck` PASS
- `pnpm run test:unit` — all 752+ green + 8 Ch.5 test files now activated (target: most TDD-RED tests turn green)
- `pnpm test:fuzz` still green
- Mockups exist at the 8 Desktop paths.

## Return

Under 500 words: files created/modified, commit SHAs (last 10), spec ambiguity resolved (esp the 5 ADR-0006 UNKNOWNs — Russell-facing items that are deferred), `tail -5 .git/auto-push.log`.

## Out of scope

- Other 7 playbooks (Ch.7).
- Write-back engine (Ch.6).
- Cowork handoff (Ch.9).
- Real MCP integration (Ch.8; Ch.5 uses stubs).
- Autonomy (Ch.10).
- Packaging (Ch.11).
