# PRODUCTION PLAN — C-Suite to a fully working V1

> Owner: Claude (full execution authority granted by Russell 2026-05-28). This plan is the
> hypothesis the build refines (DOCTRINE law #9). It supersedes the "chapters checked off"
> model with **assembled-app, real-data verification gates**. Updated as reality corrects it.

## The bar (what "production" means here)

Source: `PURPOSE.md`, `ROADMAP.md` Ch.11, `<vault>/C_Suite_PRD.md` §4–6 (target-spec audit).

Production = **all 8 V1 outcome demos pass on Russell's Mac**, with:
- 8 playbooks + Open Q&A producing sourced, rigor-scored memos.
- 6 connectors (Salesforce, NetSuite, AWS, Gmail, Chorus, PowerBI) returning **100% real, real-time, cited data** — PowerBI required at V1, not deferred (PRD §6).
- `source_id` on every numeric/named claim; the full Verifier input contract honored; below-threshold memos ship as DRAFT with explicit failure reasons.
- The compounding write-back loop (positions/decisions/predictions/pre-mortems/stakeholders/workstreams) working end-to-end.
- 5 cron jobs firing on schedule, surviving sleep/wake, with catch-up + native notifications.
- Concurrent-edit-safe vault (C-Suite + Obsidian + Cowork), zero data loss.
- Cowork "Draw up" handoff round-trip auto-linked back to the originating decision.

**Done is NOT:** chapters closed, CI green, typecheck clean, or components verified in isolation. Those are necessary, never sufficient. (Drift diagnosis: every one of those was claimed and every one was an overclaim.)

## Why it drifted (root cause — drift audit) and the gates that now prevent recurrence

| Root cause | Governing gate this plan enforces |
|---|---|
| The assembled app was never launched as a close gate (10 chapters of silent accumulation) | **APP-PROOF GATE:** every phase closes only when the running Electron app performs the real action and the result is observed (vault file, screenshot, log, real data) — not jsdom, not mocks. |
| DB-backed tests never execute locally (better-sqlite3 ABI quarantine) → schema/wiring bugs ship uncaught | **Phase 0 makes the DB-backed suite actually run under the real ABI**, then keeps it enforcing. |
| Mocking hides cross-process wiring gaps | Integration proofs use **non-mocked** round-trips (renderer↔main↔utility↔vault). |
| "Typecheck green = done" (startRun had zero callers) | **Zero-caller grep** is a mandatory close step for any new callable/IPC kind. |
| CONCERN-CLOSE deferrals stacked across chapters without convergence | Each phase resolves its predecessor's integration-pending items **before** new work; no stacking. |
| Writer graded own work | **Writer ≠ grader (DOCTRINE #7):** an independent audit agent re-derives PASS/FAIL per phase from this plan + the spec. |

On-Mac steps the cloud cannot self-certify (OAuth browser consent, native notifications, sleep/wake, the 8 demos) are **hard gates surfaced to Russell** (DOCTRINE operating-mode override). Everything else is "decide and log."

## Current-state map (code-reality audit, cited)

- **WORKS-E2E:** Ch.0 foundations, Ch.1 process arch, Ch.2 SafeWrite+git, Ch.4 rigor scoring.
- **PARTIAL:** Ch.3 runtime spine (no re-audit receipt), Ch.5 cash-lever (routes to generic path, live unproven), Ch.8 MCP (SF/AWS/Chorus live-verified; NetSuite/Gmail/PowerBI not).
- **WIRED-UNPROVEN (jsdom only, zero integration proof):** Ch.6 write-backs, Ch.7 screens+home, Ch.9 handoff, Ch.10 scheduler.
- **UNBUILT:** Ch.11 (no `pnpm build`, no on-Mac demo); CPO lens prompt (PRD §6 build gap); Google Workspace output surfaces (declared, `createSlides()` never called).

### P0 bugs — will throw or fabricate on first real use (fix in Phase 0/1)
1. **Fabricated financial data, CLEAN stamp.** `gtm-realloc/index.ts:38–80` stub factories ($14.2M pipeline, $1.84M payroll, 0.61 active, 1.08 NRR) flow to the Synthesizer under `STUB_MODE=live`; `STUBBED_SOURCES:[]` so the guard never fires. (Connector audit.)
2. **`tool_calls` INSERT throws on first live tool call.** `hooks.ts:143` writes `(run_id, role, tool_name, input_json, result_json, ts)`; prod schema needs `call_id` PK, `invocation_id` FK NOT NULL, `agent_role`, `args_json`, `called_at`. (Code + connector audits.)
3. **`resumeRun()` reads a nonexistent column.** `orchestrator/index.ts:21–25` queries test-schema `role`; prod is `agent_role` → silently never resumes a crashed run.
4. **Home screen crashes/blanks on real launch.** `Home.tsx` reads `workstream_amounts_mirror` — a table in no migration.
5. **`runtime.db` is never written during a run.** `inMemoryDb.ts:44` opens a per-run in-memory DB → "recent runs" always empty, crash-resume non-executable. (My own staged slice — must replace with shared-DB persistence.)
6. **37 theater assertions** (`expect(true).toBe(true)`) across 9 files (verifier-canary 8, named-entity-registry 10, checkpoint-resume 7) — green, assert nothing. (Test audit.)

## Phases (each closes on the APP-PROOF GATE + independent audit)

### Phase 0 — Anti-drift foundation (the test layer tells the truth about the REAL schema)
**Goal:** the enforcement layer fails when prod would fail — so nothing else can silently drift.
**Root insight (advisor correction):** the schema bugs did NOT ship because tests don't run — CI runs the DB tests under Node ABI. They shipped because DB-backed tests build their OWN hand-rolled schema (inline `CREATE TABLE` with `role`/`output_json`), so they pass against a fictional schema while prod throws. **ABI is secondary; seed-from-migrations is the real fix.**
- **Seed-from-migrations, not inline DDL.** All DB-backed tests open `:memory:` and apply `db/migrations/*.sql` via a shared helper. No test invents its own schema. ABI-agnostic.
- **Real coverage for the zero-coverage persistence paths.** Add tests exercising `hooks.ts` `agent_invocations` + `tool_calls` INSERT and `verifier-assembler.ts` reads against the migration-seeded schema (the exact paths whose absence let the P0 bugs ship).
- **Verify-the-verifier (drift-fails-a-test).** Deliberately rename a migration/hooks column; confirm a test goes RED; restore. If nothing fails, the foundation is still theater.
- **Kill theater.** Replace the 37 `expect(true).toBe(true)` placeholders (verifier-canary 8, named-entity-registry 10, checkpoint-resume 7, + others) with real assertions or `it.todo`.
- **ABI story:** enforcing run = Node ABI (CI already; local via `pnpm rebuild better-sqlite3`); app + e2e proofs = Electron ABI (`pnpm rebuild:electron`). Script the two-mode dance so it is not a footgun. (`ELECTRON_RUN_AS_NODE` vitest tried → `ERR_REQUIRE_ESM` under Electron 33 + vitest 3; not worth the rabbit-hole.) Invariant that matters: **same migrations seed both tests and app.**
- Wire `tests/e2e/**` into a runnable script + CI; replace the `test:integration` no-op. Document the APP-PROOF gate in DOCTRINE.
**Close gate:** DB suite green, seeded-from-migrations, with REAL assertions; a deliberate column rename turns a test RED; the previously-hidden P0 schema bugs (tool_calls, resumeRun) are each now caught by a test; e2e wired into CI.

### Phase 1 — Data integrity (zero fabrication, real schema)
**Goal:** no fabricated data can reach a memo; persistence matches the real schema.
- Fix P0 #1 (gtm_realloc fabrication) — wire real clients or declare+guard the stubs so no CLEAN-stamped fabrication is possible. Sweep ALL playbooks for the same pattern. **Per the PowerBI kit analysis (`docs/research/powerbi-integration-kit-analysis.md`): the stub conflated metric sources — NRR/churn/expansion are FINANCIAL (NetSuite/Salesforce), NOT in the PowerBI per-account usage data. Fix is: PowerBI yields real health-score + at-risk-count (build `aggregatePbiMetrics()`); financial metrics come from the financial source or are marked UNKNOWN — never fabricated onto `source: 'powerbi'`.**
- Fix P0 #2–#5 (tool_calls schema, resumeRun column, Home.tsx table, runtime.db persistence — replace the in-memory slice with shared-DB writes so runs persist + resume works).
- Audit every data path for stub/hardcoded values; enforce: stubbed source ⇒ degraded stamp, never CLEAN.
**Close gate:** a live-mode run writes real rows to `runtime.db`; the runs-list + home render real data; grep proves no unguarded stub in any live path.

### Phase 2 — Connectors to 100% real-time accurate data
**Goal:** all 6 sources return real, validated, cited data. (Fan-out: one agent per connector.)
- NetSuite: complete OAuth2 in-app consent (HARD GATE — Russell); validate all 9 tables under his role; confirm SuiteQL schema live.
- Gmail: first-launch OAuth consent (HARD GATE); prove real thread reads.
- PowerBI: track spec'd in `docs/research/powerbi-integration-kit-analysis.md`. Architecture confirmed correct (PowerBI→Power Automate→OneDrive CSVs→Python subprocess; no live PowerBI API). venv bootstrapped + OneDrive synced (both verified). **Single HARD GATE: drop `credentials.json` (Google Sheets account-master creds) into the customer-dashboard project + complete first-run OAuth — blocking, non-automatable.** Then 4 code changes: expand `schema.ts` Zod fields (raw usage only — **REMOVE health-score fields; per Russell 2026-05-28 the health-score methodology is stale/deprecated and must NOT be exposed or consumed**), build `aggregatePbiMetrics()` over raw signals (replaces the gtm_realloc stub), add a CSV-presence check to `preflight.ts`, add the primary-OneDrive-path env check. Account-master sheet: `1CJ7qql7UgUkzYaTTCYb8k_Dcid-F4R7vKxMnQc03Xls`. Verify: `mcp-live-smoke.sh powerbi` + Python spot-check (~330 records, real account names, real `minutes_90d`/`max_users_90d` — NOT health-score fields).
- Salesforce/AWS/Chorus: re-confirm live; add schema-drift detection (empty result ⇒ flag, not silent).
- Build the cash-model xlsx reader (removes the last guarded stub).
**Close gate:** `scripts/mcp-live-smoke.sh all` returns real data (not BLOCKED) for all 6; each query validated against live schema.

### Phase 3 — Live orchestration end-to-end (real inference, real data, real memo)
**Goal:** the core action works live, not replay.
- Run Cash Lever in `STUB_MODE=live`: real Claude inference + real MCP data → sourced memo → Verifier rigor score → SafeWrite + git commit. (My prior proof was replay-only.)
- Route `cash_lever` to its bespoke CFO+COS MCP path (currently generic).
- Author the CPO lens prompt (PRD §6 build gap).
- Prove the full Verifier input contract (lens outputs + tool-call audit trail + citations + red-team/steelman).
**Close gate:** a live Cash Lever run produces a real sourced memo in the vault with a real rigor score and clickable claim→tool-call drilldown; below-threshold ⇒ DRAFT.

### Phase 4 — Surface integration proofs + compounding loop (fan-out: one agent per screen)
**Goal:** every screen renders real data in the running app; the write-back loop closes.
- Deliver the B46 INTEGRATION PROOFs for Ch.6/7/8/9/10 (real screenshots, real data): Home, Round Table (live substance ribbon), Memo viewer (claim drilldown), Write-back review (diff + Accept/Edit/Reject/Feedback), Conversation pane, Accepted history, Handoff preview, Scheduler.
- Wire the compounding loop: run → auto-drafted write-backs → accept/edit/reject → active library grows.
- Google Workspace output surfaces (board_narrative gslides, etc.).
**Close gate:** each screen screenshotted in the running app with real data; an accepted write-back flips to active and persists.

### Phase 5 — Autonomy + native feel
**Goal:** unattended operation + macOS-native behavior.
- 5 cron jobs fire on schedule via LaunchAgent; survive sleep/wake; catch-up fires each missed job once; outputs on home screen.
- Native notification on tripwire flip; global hotkey; menubar resident; no manual restart after sleep/wake (HARD GATES — Russell, on-Mac + over time).
- Concurrent-edit-safe vault: Obsidian open + C-Suite write + Cowork `/deep` → zero data loss, exactly one sidecar on real conflict.
- Cowork handoff round-trip auto-linked.
**Close gate:** a week of real cron fires observed; concurrent-write test passes on-Mac; handoff round-trip auto-links.

### Phase 6 — V1 on-Mac outcome demos (the only true "done")
**Goal:** all 8 demos pass on Russell's Mac (HARD GATE — cloud cannot self-certify).
- `pnpm build` → unsigned `.app`; install; run each of the 8 outcome demos (PURPOSE.md lines 23–31).
- Each demo PASS/FAIL re-derived by an independent audit agent against the spec.
**Close gate:** 8/8 demos PASS on-Mac. V1 done.

## Execution model
- **Fan-out** per-connector (Phase 2) and per-screen (Phase 4) via parallel agent teams / workflows; sequential surgical work for interdependent schema+infra fixes (Phase 0/1).
- **Writer ≠ grader:** a separate audit agent closes each phase against this plan.
- **Build-log discipline:** every phase writes `docs/build-log.md`; reality that contradicts this plan updates the plan (DOCTRINE #9). No silent overclaims — the word "done" requires app-proof evidence cited inline.
- **Hard gates** (NetSuite/Gmail/PowerBI consent, native behavior, the 8 demos) are surfaced to Russell explicitly; everything else proceeds autonomously.

## Provenance
Formed 2026-05-28 from five parallel evidence audits (target-spec, drift-diagnosis, code-reality, connector/data-accuracy, test/QA). Every claim above traces to those audits + cited `file:line`. This is the corrected premise; the loop refines it.
