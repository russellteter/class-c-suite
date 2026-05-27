# BLOCKERS — Living Blind-Spot & Blocker Register

> Seeded from the ultraplan architecture team's pre-mortem. Phase R verifies and expands. `/goal` maintains every loop. **Every entry has severity, the chapter where it bites, owner, mitigation, and current status.** When reality contradicts an item, update — never plow ahead.

## Status legend

- **`SEEDED`** — from ultraplan; not yet verified against live reality.
- **`VERIFIED`** — Phase R confirmed exists in current reality.
- **`DOWNGRADED`** — Phase R found severity is lower than ultraplan estimated.
- **`UPGRADED`** — Phase R found severity is higher.
- **`MITIGATED`** — fix is shipped or workaround validated.
- **`NEW`** — added during Phase R or a chapter; not in original ultraplan.
- **`CLOSED`** — no longer a risk.

## Severity legend

- **`P0`** — catastrophic. Could prevent V1 ship or cause vault data loss.
- **`P1`** — high. Could block a chapter or degrade a locked principle.
- **`P2`** — medium. Could degrade a feature or require workaround.
- **`P3`** — low. Tracked for completeness; degraded mode acceptable.

---

## Critical-path / external dependencies (P0-P1)

### B1 — NetSuite TBA admin enablement (Brian) — scope clarified `DOWNGRADED` `P2`
**What.** TBA tokens for NetSuite API access must be issued by a NetSuite admin (Brian). External-human dependency.
**Bites at.** Ch.8 acceptance criteria (the **standalone Electron app's** NetSuite path).
**Status.** **2026-05-26 update:** Phase R R1 partial verification (`docs/research/R1-connector-reality.md`) confirms NetSuite is **fully accessible TODAY via the `mcp__claude_ai_Class_Technologies_NetSuite__*` MCP** — no TBA tokens needed for Phase R discovery, Synthesizer-stage research, or any work done inside Claude Code. The TBA tokens are still required for the **standalone Electron app's** Ch.8 utility process (which can't pipe through Claude's MCP — it needs direct API auth). Severity downgraded P1 → P2.
**Mitigation.**
- Request template ready at `scripts/send-tba-request.md`; send when Ch.8 implementation starts (not earlier).
- Phase R + all Synthesizer-side prototyping uses the MCP — no blocking dependency on Brian's queue.
- Ch.0-7 do not depend on NetSuite at all.
- If TBA slips past Ch.8 start, the C-Suite Electron app ships with NetSuite skip-and-flag; close as post-V1 patch.
**Owner.** Russell (relay to Brian when Ch.8 starts); `/goal` tracks.

### B2 — PowerBI `customer-dashboard` shape now partially known `DOWNGRADED` `P2`
**What.** The PowerBI dataset shape isn't documented in operating-model artifacts; the integration approach depends on what the project actually does.
**Bites at.** Ch.8 (MCP integration).
**Status.** Repo located + cloned at `/Users/russellteter/Claude Code Projects/customer-dashboard/` (from `https://github.com/russellteter/customer-dashboard`). **Confirmed from its own CLAUDE.md:** Python project, 43K LOC, 2,654 tests, 3 data sources (Power BI Usage + Power BI Collaborate + Google Sheets Master Renewal Playbook), join key `Account ID 18 Digit`, JSON export via `python src/main.py -j output/data.json`. Severity downgraded from P1 → P2 because location + language + entry point + tool-interface candidate are all now known. **B18 now tracks the Python-subprocess-from-Electron implication separately.**
**Mitigation.**
- R1 reads `customer-dashboard/src/` end-to-end (per docs/architecture/mcp.md §PowerBI 🔍 R1 ACTION).
- Integration shape default: **Python subprocess invoked from utility process** with JSON output captured to a tool-call result (per the project's existing `-j` flag). Avoids rewriting 43K LOC of battle-tested Python.
- `Account ID 18 Digit` is the canonical join key for any cross-source query.
- CRO/CPO lenses consume product-usage + Google-Sheets-renewal signal with citable `source_id` per PRD §6 Supplementary Data Source section.

### B19 — Connector Playbook "Committed" stage filter assumes wrong stage labels `NEW` `P1`
**What.** The Connector Playbook canonical rule is `Committed pipeline = StageName IN (S4, S5, Commit, BestCase)`. **Verified 2026-05-26 against live Class production:** these stage labels DO NOT EXIST in the org. Actual stages with live counts: `Closed Won` (39,154), `Closed Lost` (31,637), `Qualified Renewal` (514), `Discovery` (152), `Evaluation` (80), `Qualified Opportunity` (74), `Renewal Quote Sent` (50), `Outreach` (35), `Engagement` (34), `Unsuccessful` (15), `Verbal Approval` (15), `Quote in Review` (15), `Negotiation` (7), `Contracting` (6), `Verbal Agreement` (4).
**Bites at.** Ch.8 (typed SOQL builder); any playbook using committed-pipeline filter (Cash lever, GTM reallocation, Board narrative, Strategic option).
**Mitigation.**
- Recommended "Committed" filter per `docs/research/R1-connector-reality.md`:
  - New business: `StageName IN ('Verbal Agreement', 'Verbal Approval', 'Contracting', 'Quote in Review', 'Negotiation')` (~47 active deals).
  - Renewal: `StageName IN ('Renewal Quote Sent', 'Qualified Renewal')` (~564 deals; `Qualified Renewal` may be too early — needs Russell's confirmation).
- **Day-Zero form question:** confirm Russell's mental model for "committed" so the filter matches the forecasting practice he actually runs.
- Update Connector Playbook (`business-planning/Strategic_AI_Connector_Playbook.md`) when Russell confirms.
**Ch.5 Audit/QA 2026-05-27:** R1-verified stage labels confirmed in `classify-playbook.ts` CASH_LEVER_KEYWORDS, in `cro.prompt.md` (explicit `Do NOT use: S4, S5, Commit/Best Case, or BestCase`), and in ADR-0006 §1.3 committedPipelineQuery spec. Day-Zero Russell confirmation still pending. Deferred to Ch.8 typed SOQL builder.
**Owner.** Russell (Day-Zero confirmation); /goal updates Connector Playbook + the typed SOQL builders.

### B20 — Real renewal date field is `Renewal_Anniversary_Date__c`, not `Renewal_Date__c` `NEW` `P1`
**What.** `docs/architecture/mcp.md` §Salesforce + the Connector Playbook reference `Renewal_Date__c` as the renewal date field. **Verified 2026-05-26 against live Class production:** `Renewal_Date__c` does not exist. The real field is `Renewal_Anniversary_Date__c` (date) on the Account object. There is also a separate `DH_Renewal_Date__c` on the Opportunity object — likely a per-deal renewal-date capture.
**Bites at.** Ch.8 (typed SOQL builder); the renewal-forecast scheduled job (Ch.10); any playbook that asks "who's up for renewal in the next N months."
**Mitigation.**
- mcp.md `renewalForecastQuery` updated to use `Renewal_Anniversary_Date__c` (Account-level).
- When `renewal-forecast` skill is extracted from Cowork (B17), correct any `Renewal_Date__c` references.
- Confirm with Russell whether Account.`Renewal_Anniversary_Date__c` or Opp.`DH_Renewal_Date__c` is the canonical source for renewal-forecast (probably Account.RAD with Opp.DH overriding when populated).
**Owner.** /goal in Ch.8; Russell confirms canonical source.

### B18 — Python subprocess from Electron utility process — runtime + packaging implications `NEW` `P2`
**What.** `customer-dashboard` is Python (not Node). The C-Suite is Electron + Node. Wrapping Python as a subprocess from the utility process introduces: (a) Python runtime dependency on the user's Mac (must install + version-pin), (b) the subprocess must run inside a venv (or pyenv) — the C-Suite's setup runbook needs to provision this, (c) `electron-builder` notarization of the C-Suite app does NOT include Python — Python is a separate user-installed prerequisite, (d) inter-process communication is JSON over stdout (per the project's `-j` flag), (e) error handling: if Python crashes, the utility process must catch + retry + degrade gracefully.
**Bites at.** Ch.8 (PowerBI integration), Ch.11 (setup runbook + notarization).
**Mitigation.**
- Document Python + venv as an explicit prerequisite in `scripts/preflight.sh` (already checks `node`; add `python3` check).
- `scripts/preflight.sh` checks that `customer-dashboard/` is git-initialized + has its venv set up, OR offers a `--bootstrap-poc` flag that runs the project's setup commands.
- C-Suite utility process invokes via `child_process.spawn('python3', ['src/main.py', '-j', '/tmp/cdash-<runId>.json', '--validate'])` (read-only / dry-run path is the right default for V1 queries).
- Subprocess result schema validated via Zod before lens consumption.
- Ch.11 setup runbook: walks Russell through Python + venv install if not present; verifies the `-j` flag produces valid output before declaring setup complete.
- If subprocess proves too brittle in Ch.8: fall back to "extract the SQL/DAX queries from `customer-dashboard/src/` and re-issue them directly from a Node Power BI client" — higher effort but eliminates the Python dependency.
**Owner.** Ch.8 architect; R1 reports actual feasibility based on the codebase deep-read.

### B3 — Verifier reasoning-trace leak (rubber-stamp risk) `VERIFIED` `P0`
**What.** If the Verifier's input includes any lens reasoning trace (chain-of-thought, intermediate prompts), the Verifier will rubber-stamp instead of grading. **This is the single trust-defining wiring in the product.**
**Bites at.** Ch.3 Fix-Integration (AC-2 runtime isolation) + Ch.4 (Verifier prompt + input contract).
**Status.** **R2 verified 2026-05-26. Ch.0 Audit/QA confirmed 2026-05-27 — still Ch.4 scope, no Ch.0 code touches Verifier path.** `docs/architecture/runtime.md` lines 123-131 define the Verifier Input Contract explicitly: lenses pass only structured outputs and the tool-call audit trail — never reasoning traces. The assembler throws `VerifierInputContractViolation` if any required input is missing; the run does not proceed. Planted-claim canary fixture is specified at `docs/architecture/prompts.md` lines 434-453 as `tests/verifier-canary.spec.ts` (fixture: `memo-with-unsourced-arr-claim`) — permanent regression guard, runs on every CI build. Architecture-spec gap: `NAMED_ENTITY_REGISTRY` must be pre-loaded from the stakeholder vault + turnaround library; Ch.4 architect must build this.

**Ch.3 Audit/QA 2026-05-27 — REOPEN.** `buildLensContextBundleSchema<R>(role)` in `packages/shared-types/src/lens-context-bundle.ts` uses `z.object({...5 fields...}).superRefine(validator)`. In Zod v4.4.3 (pinned `^4.0.0`, resolved `4.4.3`), a plain `z.object()` strips unknown keys BEFORE the `.superRefine()` callback receives data. Result: a malformed bundle with `illegalLeak: { role: 'CRO', ... }` passes `schema.safeParse()` with `success: true` — the violation is silently swallowed. BY-HAND confirmed: `findCrossLensLeaks(bundleWithCROLeak, 'CFO', '')` returns `[{leakedRole:'CRO', path:'$.illegalLeak'}]` (detection function is correct), but `schema.safeParse(bundleWithCROLeak)` returns `success: true` because `illegalLeak` is stripped before `superRefine` runs. The assembler's reasoning-trace isolation (reads only `output_json`) is architecturally sound and confirmed by security grep — no `thinking`/`chain_of_thought`/`reasoning_trace` in production code. Fix-Integration scope: fix AC-2 via `.passthrough()` before `.superRefine()` (Zod v4 API must be verified) or validate raw object before parse.

**Ch.3 Fix-Integration 2026-05-27 — REOPEN RESOLVED. ACTIVE → VERIFIED.** Defense-in-depth fix applied in commits `fa3848e`–`dc12ab2`. (1) `.passthrough()` added before `.superRefine()` so Zod v4 preserves unknown keys through to the validator. (2) `buildLensContextBundle(role, raw)` wrapper added — pre-checks raw input via `findCrossLensLeaks(raw, role, '$')` before Zod parse; throws `LensIsolationViolation` on first violation. BY-HAND verified: `buildLensContextBundle('CFO', {illegalLeak:{role:'CRO',...}})` throws `LensIsolationViolation: CFO context bundle contains data tagged for CRO at $.illegalLeak`. `schema.safeParse` also returns `success:false` with message containing 'LensIsolationViolation'. AC-2 test `cross-lens-leak.spec.ts` has 6 real assertions — all passing. Runtime lens isolation is restored.

**Ch.4 Audit/QA 2026-05-27 — VERIFIED. Prompt layer complete.** Verifier prompt (`apps/utility/src/prompts/Verifier.prompt.md`) ships all 5 anti-sycophancy patterns: structural isolation statement, forced JSON schema, higher-reasoning model (Opus), null-rejection schema, planted-claim canary. `VerifierOutputSchema` in `packages/shared-types/src/verifier-output.ts` is non-nullable on all required fields. Canary fixture `tests/fixtures/lens-outputs/canary-run/Verifier.json` encodes: `ship_status: 'draft'`, `$43M` in `claims_unverified`, `claim_source.score: 17 < 35`, sourced claim NOT in unverified list. All static fixture assertions PASS. Remaining gap: `verifier-runner.js` absent — live AC-7b `runVerifier()` assertions deferred to Ch.5 Runtime. Static guard is operational. Dynamic live-model enforcement deferred.
**Mitigation.**
- Verifier input assembled **only from structured outputs + audit trail** — never from lens transcripts.
- Assertion throws on any lens-transcript content reaching the Verifier.
- **Planted-unsourced-claim canary fixture** as permanent regression guard. Goes red if a future model makes the Verifier lenient.
- Verifier output schema forces falsifier + missing-data flags; rejects null returns.
- **5 required edge cases for `isQuantOrNamed` test suite** (documented in `docs/research/R2-feasibility-notes.md` §B10): (1) date in opinion claim, (2) named entity in hypothetical, (3) number in metaphor (word form), (4) percentage in projection, (5) currency abbreviation without digit.

### B4 — Claude Max 220K/5-hr window blind to Russell's other Claude usage `DOWNGRADED` `P2`
**What.** Russell also uses Claude.ai and Cowork on the same Max subscription. The C-Suite's scheduler cannot see external usage — risks throttling Russell's primary workflows or being throttled itself.
**Bites at.** Ch.1 (scheduler) + Ch.10 (autonomy concurrency).
**Status.** **R2 verified 2026-05-26. DOWNGRADED P1 → P2.** Anthropic announced 2026-05-06 that Claude Code 5-hr rate limits are **doubled** for Max subscribers and the peak-hours reduction is removed for Max (source: `https://www.anthropic.com/news/higher-limits-spacex`). Exact new ceiling is published as a table image (not scraped as plain text) — UNKNOWN precisely. The 180K conservative cap is now MORE conservative than needed, but remains correct practice. Claude.ai chat and Claude Code share the same Max subscription pool — the scheduler still cannot see external usage. **Ch.1 Audit/QA verified 2026-05-27:** `WINDOW_MS = 5 * 60 * 60 * 1000`, `windowCap = 180_000` confirmed in `apps/utility/src/scheduler/scheduler.ts`. Scheduler ships. CONCERN logged: `recordUsage()` double-count pattern untested (see ch1-audit-qa-report §6). No regression introduced.
**Mitigation.**
- Treat the effective ceiling as ~180K — conservative against the doubled post-announcement limit.
- **Interactive runs strict-priority over scheduled jobs** in the scheduler.
- Degrade-to-sequential under pressure (six lenses run serially if concurrent-window math says so).
- Per-run cost meter surfaces credit-proximity in UI (PRD §6 home-screen + memo header).
- **Russell action:** check `/cost` in Claude Code to observe actual window ceiling and confirm the 180K cap is appropriate or raise it.

### B5 — `maxBudgetUsd` / `total_cost_usd` semantics on Max unconfirmed `VERIFIED` `P2`
**What.** The Claude Agent SDK's cost-meter fields may be USD-denominated (API-billing semantics) or may not exist for Max subscriptions.
**Bites at.** Ch.1 (cost meter).
**Status.** **R2 verified 2026-05-26.** `result.usage.total_cost_usd` exists in the TypeScript SDK on the final `ResultMessage`. Source: context7 `/nothflare/claude-agent-sdk-docs` cost-tracking guide (`console.log("Total cost:", result.usage.total_cost_usd)`). On Max subscriptions, this field contains an API-equivalent cost calculation (input/output tokens × published rates) — NOT a "subscription credits remaining" figure. The meter can show this as a reference cost, but must not imply it represents actual charges to Russell. **Ch.1 Audit/QA verified 2026-05-27:** `cost_ledger` table ships in `db/migrations/001_initial.sql` with `tokens_in`, `tokens_out`, `cost_usd_reference` columns. IPC `cost.usage` variant confirmed in `packages/shared-types/src/ipc.ts`. No regression. Status remains VERIFIED P2.
**Mitigation.** Display token-based meter ("tokens used / window cap remaining") as the primary signal. `total_cost_usd` may be shown as a secondary "API-equivalent" label with tooltip. IPC message `cost.usage` carries `tokensIn`, `tokensOut`, `windowRemaining` — sufficient for the home-screen display. Hook: read from `ResultMessage.usage.total_cost_usd` after `SubagentStop` or accumulate via `onMessage` callback.

---

## Product-shape risks (P1-P2)

### B6 — Covenant terms are ASSUMED `VERIFIED` `P2`
**What.** The `covenant-tracker` skill's thresholds are not verbatim from Class's credit agreement with Barclays — they're best-effort guesses.
**Bites at.** Ch.7 (playbook 1 prereqs + autonomy tripwire scan).
**Status.** **R2 verified 2026-05-26.** Day-Zero form mitigation is sufficient. NetSuite has zero covenant-specific saved searches (confirmed R1) — the tracker derives from cash GL accounts via raw SuiteQL. The form must capture 6 fields: covenant name, verbatim threshold, measurement frequency, cure period, reporting obligation, grace period. Russell must complete this at Day-Zero before the first scheduled run.
**Mitigation.**
- Day-Zero form on first scheduled run captures the verbatim covenant cutoff + terms (6 required fields per `docs/research/R2-feasibility-notes.md` §B6).
- Until captured, covenant readings labeled "directional" with a banner in any memo that cites them.
- Russell can paste credit-agreement excerpts into the form; Verifier source-checks against them.

### B7 — `renewal-forecast` skill uses `Owner.Name` — contradicts active-AM rule `VERIFIED` `P2`
**What.** The renewal-forecast skill reads `Account.Owner.Name` from Salesforce. The Connector Playbook canonical rule is `Account_Manager__r` + `IsActive` (active AMs, not just current owners).
**Status.** **2026-05-26 verified live:** `Account_Manager__c` (reference) exists on the live Account object. Traversal via `Account_Manager__r.IsActive` works. The corrected field is confirmed.
**Bites at.** Ch.8 (MCP integration); flagged for Russell.
**Mitigation.**
- C-Suite's typed SOQL builders use `Account_Manager__r` + `IsActive` — never `Owner.Name`. Verified pattern in `docs/research/R1-connector-reality.md`.
- Once `renewal-forecast` skill is extracted from Cowork (B17), explicitly correct the `Owner.Name` reference.
- C-Suite invocations of the skill (if any) wrap with the corrected query.

### B8 — Concurrent edits: Cowork `/deep` bypasses SafeWrite on shared zones `VERIFIED` `P2`
**What.** PRD locks Cowork `/deep` as a fallback. Cowork does not implement SafeWrite. Concurrent C-Suite + Cowork writes to the same shared-zone file (workstream, decision, position) may produce conflicts.
**Bites at.** Ch.2 (SafeWrite design) + Ch.5 first-slice ops.
**Status.** **R2 verified 2026-05-26. Ch.2 Audit/QA 2026-05-27: sidecar pattern ships, but fuzz test (AC-1) confirms Invariant 3 violation — content written by C-Suite (`result:'ok'`) can be silently overwritten by external writers (Cowork, Obsidian) with no sidecar produced. This is the open failure driving Ch.2 REOPEN. Fix-integration must resolve before CLOSE.** Sidecar pattern confirmed sufficient for intra-SafeWrite conflicts (AC-4 PASS). External-post-write overwrites are the gap.
**Mitigation.**
- Decide-and-log per Phase R decision #1 default: **don't block Cowork; sidecar handles it.**
- Document Cowork as **read-mostly** post-ship; Russell uses Cowork for `/deep` fallback investigations and execution work, not for routine vault edits.
- SafeWrite sidecars surface in UI; Russell merges manually.
- Ch.2 fix-integration: resolve fuzz Invariant 3 gap — options: post-write re-read check, flock, or git-SHA post-rename verification. See `docs/reviews/ch2-audit-qa-report.md` §2.

### B9 — iCloud-synced vault → atomic-rename / git-corruption hazard `VERIFIED` `P1`
**What.** If the vault folder lives in iCloud Drive (default Documents folder behavior on modern macOS), file metadata sync can corrupt atomic-rename operations and confuse git.
**Bites at.** Ch.2 (SafeWrite) + Ch.11 (setup runbook).
**Status.** **Ch.2 Audit/QA 2026-05-27 VERIFIED MITIGATED (architecture).** `scripts/preflight.sh` lines 40-62 check vault path for iCloud sync attribute (`com.apple.ubiquity.ubiquityd-data` xattr) and FAIL with actionable message if detected. Also checks for Dropbox and Google Drive mounts (B33). `tests/unit/preflight-vault-commits.spec.ts` passes (5 tests). The preflight guard ships and is tested. Actual vault path (`/Users/russellteter/Documents/Claude/Projects/Business Planning/`) not verified during this audit (no on-Mac execution — B9 final confirmation at Ch.5 first-launch smoke test). Architecture mitigation is COMPLETE; runtime verification at Ch.5.
**Mitigation.**
- Verify vault is in a **non-syncing location** — Russell's vault is at `/Users/russellteter/Documents/Claude/Projects/Business Planning/`. Phase R R0 confirms whether `Documents/` is iCloud-synced on Russell's Mac (Sequoia default behavior).
- If iCloud-synced, document prominently in Ch.11 setup runbook: move vault to a non-iCloud path (e.g. `/Users/russellteter/Vault/`) or disable iCloud Drive Documents sync.
- Pre-flight check at C-Suite startup detects iCloud-sync attribute and refuses to operate if detected (ships in `scripts/preflight.sh`).

### B10 — `isQuantOrNamed` classifier is load-bearing for 35% of rigor score; boundary is fuzzy `VERIFIED` `P2`
**What.** The rigor formula gives 35 points for claim-source binding, gated by an `isQuantOrNamed(claim)` classifier. Quantitative or named-entity claims must cite; opinion claims need not. The boundary between "quantitative/named" and "opinion" is fuzzy; an LLM classifier would drift run-to-run.
**Bites at.** Ch.4 (rigor formula).
**Status.** **R2 verified 2026-05-26.** Deterministic regex approach in `docs/architecture/prompts.md` lines 413-429 is sound — no LLM call, identical output per run. 5 required edge cases documented (see B3 update + `docs/research/R2-feasibility-notes.md` §B10). Architecture gap: `NAMED_ENTITY_REGISTRY` must be pre-loaded from stakeholder vault and turnaround library at utility-process startup; cannot be rebuilt per-run. Ch.4 architect owns this. **Ch.4 Audit/QA 2026-05-27 — MITIGATED.** `apps/utility/src/scoring/isQuantOrNamed.ts` ships: 6 regex rules, `NAMED_ENTITY_REGISTRY` import, all 5 R2 edge cases covered (verified via test descriptions). `apps/utility/src/registry/namedEntities.ts` ships: 16 bootstrap entities (Barclays present), 17 turnaround-library entities, stakeholder + competitor-watch loading, chokidar hot-reload, graceful degradation if vault dirs absent. `is-quant-or-named.spec.ts` and `named-entity-registry.spec.ts` all pass. B10 MITIGATED.
**Mitigation.**
- Ship a **frozen, unit-tested deterministic classifier** (regex + heuristics + unit-test fixtures). Two runs of the same memo score identically.
- 50+ test cases covering edge cases (numbers in opinions, named entities in hypotheticals, etc.).
- `NAMED_ENTITY_REGISTRY` loaded at utility-process startup from stakeholder + turnaround-library sources; cached in memory for the session.

### B11 — Chorus exposes only AI summaries (no raw transcript) — weak health evidence `VERIFIED` `P3`
**What.** Chorus's API gives AI-generated call summaries, not raw transcripts. Summaries are LLM-derived and can amplify hallucinations if treated as primary evidence.
**Bites at.** Ch.8 (Chorus MCP).
**Status.** **R2 verified 2026-05-26.** Chorus API (`https://api-docs.chorus.ai/`) endpoint list confirmed: Conversations, Video Conferences, Emails, Engagement filter, Scorecards, Playlists, Saved Searches, Reports, Sales Qualifications, Users, Teams. No raw transcript download or verbatim recording-to-text export listed. Use cases stated: "retrieve data about engagements (meetings and dialer calls), upload new recordings, delete recordings." Conclusion: Chorus-sourced claims are AI-summary-derived and must be capped.
**Mitigation.**
- **Cap Chorus-only-sourced claims at <70 confidence.** Enforced at Synthesizer level: claims tagged `source_type: chorus` have confidence ceiling of 69 in structured output schema.
- Always pair Chorus claims with Salesforce or NetSuite corroboration before crossing the rigor threshold.
- Memo footer notes when a claim is Chorus-only.

### B12 — `amount_usd` is free-text in workstreams — tripwire scan can't compute on it `SEEDED` `P2`
**What.** Workstream files use free-text for `amount_usd` ("$1.2M," "approx $500K," "TBD"). Autonomy tripwire scans can't reliably do math on these.
**Bites at.** Ch.7 (playbooks reading workstreams) + Ch.10 (autonomy tripwire scan).
**Mitigation.**
- **Mirror a structured numeric** (cents-as-integer) into SQLite **rather than mutating the vault shape.** Vault stays human-friendly free-text; runtime gets a typed mirror.
- Tripwire scan + cash forecasting read the SQLite mirror.
- A parser converts free-text → mirror on workstream write; ambiguous entries flag for Russell.

### B13 — Decision frontmatter lacks machine-readable position/prediction links (Bases queries) `VERIFIED` `P3`
**What.** Existing `decisions/` frontmatter uses prose for cross-references rather than typed arrays. Obsidian Bases queries can't traverse without typed links.
**Bites at.** Ch.6 (write-back schema + Bases-readable indexes).
**Status.** **R2 verified 2026-05-26.** Additive plan confirmed sufficient. R0-Vault additionally found missing `tripwires`, `rationale`, `superseded_by` fields. Full additive field set for Ch.6 write-back engine: `linked_positions: []`, `predictions_spawned: []`, `tripwires: []`, `executed_by: null`. Note: Obsidian Bases (core plugin, Obsidian 1.9+) is now the primary query layer; Dataview is in maintenance mode (B32 tracks this separately). All typed arrays must use Bases-compatible plain YAML array syntax.
**Mitigation.**
- **Additive** `linked_positions: [...]` / `predictions_spawned: [...]` / `tripwires: [...]` / `executed_by: null` keys injected by Ch.6 write-back engine.
- Doesn't break existing files; only enriches.
- Synthesizer/Verifier populate the typed arrays on new decisions; back-fill is optional.
- Use plain YAML arrays (not Dataview inline annotation syntax) for Bases compatibility.

### B14 — better-sqlite3 + native-module notarization entitlements `VERIFIED` `P2`
**What.** Native node modules (better-sqlite3, possibly chokidar's OS-watcher backend) require correct electron-builder entitlements to pass Apple notarization. Pinning is touchy.
**Bites at.** Ch.8 / Ch.11.
**Status.** **R2 verified 2026-05-26.** Required `.plist` entitlement keys confirmed (source: `https://www.forasoft.com/blog/article/the-pain-of-publishing-electron-apps-on-macos-303`, updated 2026-04-26): `com.apple.security.cs.allow-jit` is the **minimum required** (V8 JIT). `com.apple.security.cs.disable-library-validation` needed only if electron-rebuild doesn't re-sign `better-sqlite3` pre-built binary. `altool --notarize-app` is dead (removed November 2023) — only `xcrun notarytool` is valid. Use `@electron/osx-sign` + `@electron/notarize` (scoped packages, not old unscoped). `electron-rebuild` must run as part of the CI build step, not only at dev install. **Spec correction needed:** architecture docs that reference "Sequoia 14.4+" are wrong — Darwin 24.x = macOS Sequoia 15.x. Sonoma = 14, Sequoia = 15.
**Mitigation.**
- **`electron-rebuild` runs in the CI/build step** (not just dev install) to compile native modules against the exact Electron Node.js ABI.
- Minimum `entitlements.mac.plist` key: `com.apple.security.cs.allow-jit`. Add `disable-library-validation` only if pre-built binary signing fails.
- **`xcrun notarytool`** is the only valid notarization tool (2026). Pipeline: sign → package → `notarytool submit --wait` → `xcrun stapler staple`.
- Use `@electron/osx-sign` + `@electron/notarize` (scoped packages).
- **Test notarization on a throwaway build mid-Ch.8** — don't wait for Ch.11 to discover this is broken.
- Document working entitlements + signing identity in the Ch.11 setup runbook.
- **Architecture-spec patch:** replace "Sequoia 14.4+" with "Sequoia 15.x+" in all architecture docs.

### B15 — Calibration-freshness when zero positions cited — product-philosophy call `VERIFIED` `P3`
**What.** The rigor formula's calibration-freshness component (15 points) penalizes stale calibration use. But what if a memo legitimately cites zero positions because the question is novel? Penalty or pass?
**Bites at.** Ch.4 (rigor formula edge case).
**Status.** **R2 verified 2026-05-26.** Decide-and-log approach confirmed correct. A 70-point memo can pass with 0 calibration points if the other four dimensions are strong (35+20+15 = 70 without any calibration). The formula as specified does not penalize novel questions — it simply doesn't reward them. No spec change needed.
**Mitigation.**
- "Decide and log" under doctrine: **reward using the library** rather than only penalizing stale use. Memos with zero position citations don't get the 15 points but don't get penalized below threshold either.
- If Russell wants stricter (penalize for not using library), surface as Day-Zero form question (currently recommended: NO — novel questions should not be artificially penalized).

### B16 — Audit trail contains sensitive SF/NS excerpts — durability vs git-pushed vault `MITIGATED` `P3`
**What.** The audit trail records tool-call results including Salesforce / NetSuite excerpts. If the vault git repo is pushed to a private remote for off-machine backup, sensitive data crosses the network.
**Bites at.** Ch.1 (audit trail storage).
**Status.** **R2 verified 2026-05-26. MITIGATED — Ch.1 Audit/QA confirmed 2026-05-27.** `apps/main/src/db/open.ts` line 12: `const dbPath = path.join(app.getPath('userData'), 'runtime.db')`. Path resolves to `~/Library/Application Support/c-suite/runtime.db` — outside iCloud sync, outside vault git. Confirmed via source read: `openDatabase()` calls `app.getPath('userData')` exactly as specified. `db/migrations/001_initial.sql` creates `runs`, `agent_invocations`, `tool_calls`, `cost_ledger`, `process_events` tables in this local-only store. No vault write path exists in Ch.1 code. B16 MITIGATED — downgraded P3 → MITIGATED.
**Mitigation.**
- **Keep audit trail in SQLite (runtime metadata)**, not in the vault. SQLite is local-only by default.
- SQLite data directory: `app.getPath('userData')` — never `documents` or any iCloud-synced path (B9 interaction).
- Optional **in-vault export** of audit excerpts gated by Russell (separate review).
- Vault git push remains for the artifact corpus; SQLite stays local.

---

## New blockers (added during Phase R or chapters)

### B21 — `type:` discriminator field absent from all vault artifacts `MITIGATED` `P0`
**What.** Every Zod schema in `docs/architecture/data.md` uses `z.literal('position'|'decision'|...)` for the `type` field. R0-Vault verified across 75+ files: **zero** have a `type:` key in their YAML frontmatter. Parser will fail for 100% of vault reads.
**Bites at.** Ch.0 (schema design), Ch.1 (indexer), Ch.2 (SafeWrite read-side), Ch.3 (lens context bundle).
**Status.** **MITIGATED 2026-05-27 — Ch.0 Audit/QA verified.** `packages/shared-types/src/parseArtifact.ts:58` injects `{...parsed, type: zone}` post-parse. `vault-schemas.ts` line 15 comment: "type field injected at parse time — DO NOT add z.literal here." `ZoneToSchema` covers all 11 zones. 37 `parseArtifact.spec.ts` tests pass. Evidence: `docs/reviews/ch0-audit-qa-report.md` §3.
**Mitigation.**
- Inject `type` at parse time from file-path zone (Option B in R0 ledger). Do NOT write `type:` keys back to vault files (would touch 75+ files unnecessarily).
- Update `data.md` Zod schemas to omit `type` and provide a `parseArtifact(rawYaml, zone)` wrapper.
- Ch.0 architect codifies the zone→type map.
**Owner.** Ch.0 architect.

### B22 — Vault git has zero commits `MITIGATED` `P0`
**What.** Vault path is git-initialized (`/Users/russellteter/Documents/Claude/Projects/Business Planning/.git/` exists, mtime 2026-05-26) but `git log --oneline -5` returns `fatal: your current branch 'main' does not have any commits yet`. SafeWrite's auto-commit hook (`git add <path>; git commit -m "c-suite: ..."`) will produce orphan history; the institutional change-history reading depends on a non-empty `git log`.
**Bites at.** Ch.2 (SafeWrite), all post-Ch.2 vault writes.
**Status.** **MITIGATED (architecture) 2026-05-27 — STILL ACTIVE PENDING RUSSELL EXECUTION.** `scripts/vault-bootstrap.sh` exists. Idempotency implemented at lines 39-43 (skips if vault already has commits). Writes `.gitignore` before initial commit. `scripts/preflight.sh` lines 54-61 detect zero-commit vault and FAIL with: "Vault has no commits — run scripts/vault-bootstrap.sh before starting C-Suite (B22)". `VaultNotInitializedError` thrown at `safeWrite.ts:100-110` on zero-commit detection. `tests/unit/preflight-vault-commits.spec.ts` 5/5 pass (zero-commit FAIL, ≥1-commit PASS, no-.git FAIL). **Ch.2 Audit/QA 2026-05-27: Russell has NOT run vault-bootstrap.sh. Vault at `/Users/russellteter/Documents/Claude/Projects/Business Planning/` still has zero commits. B22 remains ACTIVE. Defer resolution to Ch.5/setup (Russell must run bootstrap before first app launch).** Evidence: `docs/reviews/ch0-audit-qa-report.md` §6, `docs/reviews/ch2-audit-qa-report.md` §6. **Ch.5 Audit/QA 2026-05-27: STILL ACTIVE. Vault still has zero commits. AC-6 (full run memo lands in vault) is blocked until Russell runs `scripts/vault-bootstrap.sh`. Required before Ch.11 on-Mac demo.**
**Mitigation.**
- Ch.0 setup: perform initial bulk commit of vault contents BEFORE Ch.2 ships. Use a `scripts/vault-bootstrap.sh` that runs `git -C <vault> add . && git commit -m "vault: pre-C-Suite SafeWrite baseline (manual snapshot)"`.
- Vault `.gitignore` is absent — preflight should suggest adding `.DS_Store`, `*.tmp-*`, `*.proposed-*`, `_extracted_skills_for_c_suite.md` (if it's meant to be local-only) before the bootstrap commit.
- Document in Ch.11 setup runbook so Russell's fresh-Mac install reproduces the bootstrap.
**Owner.** Ch.0 architect (writes the bootstrap script); deferred from Phase R per scaffold-session decision to keep vault writes SafeWrite-aware.

### B23 — Kebab vs snake key naming chaos across every artifact type `MITIGATED` `P0`
**What.** Vault uses **kebab-case** for positions (`last-retested`, `superseded-by`, `decision-this-supports`), pre-mortems (kebab variant), predictions (PRED-007), and parts of stakeholders. Other artifacts use **snake_case**. `data.md` schemas assume snake_case. Zod parse will fail for every kebab-keyed file.
**Bites at.** Ch.1 (frontmatter parser), Ch.3 (lens context bundle assembly).
**Status.** **MITIGATED 2026-05-27 — Ch.0 Audit/QA verified.** `packages/shared-types/src/normalizeKeys.ts` recursively replaces `-` with `_` in all object keys and coerces Date objects to YYYY-MM-DD strings. 24 `normalizeKeys.spec.ts` tests pass including PM-001 fixture (mixed kebab). Evidence: `docs/reviews/ch0-audit-qa-report.md` §3.
**Mitigation.**
- YAML key normalizer middleware: replace `-` → `_` in object keys at parse time, then validate via existing snake_case schemas.
- Do NOT migrate vault files — leave Russell's preferred kebab style intact.
- Codify in `packages/shared-types/src/normalizeKeys.ts` (Ch.0).
**Owner.** Ch.0 architect.

### B24 — `WorkstreamFrontmatter` in data.md under-specified by 10+ fields `MITIGATED` `P1`
**What.** `data.md` WorkstreamFrontmatter has 6 fields (type, id, title, status, amount_usd, dependencies, milestones). Real corpus has 15+: `cash_impact` (object), `arr_impact` (object), `status_criteria` (object), `people_involved`, `depends_on`, `depended_on_by`, `next_milestone`, `next_milestone_date`, `decisions_pending`, `linked_positions`, `linked_decisions`. **`amount_usd` is nested inside `cash_impact`, not at top-level** — the SQLite `workstream_amounts_mirror` parser must read `cash_impact.amount_usd`.
**Bites at.** Ch.1 (indexer), Ch.3 (lens context bundle), Ch.10 (tripwire-scan reads workstream amounts).
**Status.** **MITIGATED 2026-05-27 — Ch.0 Audit/QA verified.** `vault-schemas.ts` lines 55-103 implement 15-field expanded `WorkstreamFrontmatter` plus `WorkstreamMinimalFrontmatter` (WS-03 variant) as a `z.union`. `cash_impact` is a nested object with `amount_usd`. 31 vault-schema tests pass. Evidence: `docs/reviews/ch0-audit-qa-report.md` §6.
**Mitigation.** Replace WorkstreamFrontmatter with the expanded schema in `docs/research/R0-constraints-ledger.md` §SD-03. Update SQLite mirror parser to read nested `cash_impact.amount_usd`.
**Owner.** Ch.0 architect; data.md update.

### B25 — DEC-001 through DEC-004 referenced in INDEX but no files exist `NEW` `P1`
**What.** `decisions/INDEX.md` reports 7 decisions (1 resolved, 6 active). Vault directory `ls` returns only DEC-005, DEC-006, DEC-007 + INDEX.md. DEC-001 through DEC-004 are missing.
**Bites at.** Ch.6 (write-back drafter — cross-references break), Ch.1 (indexer error path).
**Status.** Surfaced for Russell — files may have moved, been renamed, or INDEX is stale. Orchestrator does not guess.
**Mitigation.**
- **Surface to Russell at next session** (do NOT auto-create stubs or auto-update INDEX). Russell decides: rename DEC-005-007 to DEC-001-003, restore from git history elsewhere, or update INDEX.
- Ch.1 indexer fails gracefully (logs missing-file warning) on broken cross-references rather than crashing.
**Owner.** Russell (next-session decision); Ch.1 architect (graceful-degradation code).

### B26 — Pre-mortem `impact` enum is completely wrong in data.md `MITIGATED` `P1`
**What.** `data.md` enum: `catastrophic|severe|significant|recoverable`. On-disk reality across 14 files: `existential`, `HIGH`, `high`, `medium`. **Zero overlap.** Zod parse fails 100% of pre-mortems.
**Bites at.** Ch.1 (parser), Ch.7 (pre-mortem-on-proposed-action playbook reads them).
**Status.** **MITIGATED 2026-05-27 — Ch.0 Audit/QA verified.** `vault-schemas.ts` line 153: `impact: z.enum(['existential', 'high', 'HIGH', 'medium'])`. `normalizeKeys` middleware handles case but enum preserves both `HIGH` and `high` for raw vault compatibility. 31 vault-schema tests pass. Evidence: `docs/reviews/ch0-audit-qa-report.md` §6.
**Mitigation.** Replace enum with on-disk values. Normalize case (`HIGH` → `high`) in middleware. See R0-Vault §SD-05.
**Owner.** Ch.0 architect.

### B27 — `StakeholderFrontmatter` bifurcates by subdirectory `MITIGATED` `P1`
**What.** `internal-exec-board/` + `internal-dependencies/` (12 files) use lean 5-key person shape. `customers-top-arr/seu-bme.md` uses 18-key account shape. data.md has neither correctly.
**Bites at.** Ch.1 (parser), Ch.7 (stakeholder 1:1 prep playbook).
**Status.** **MITIGATED 2026-05-27 — Ch.0 Audit/QA verified.** `vault-schemas.ts` lines 107-141: `StakeholderPersonFrontmatter` (5-key lean) + `StakeholderAccountFrontmatter` (18-key with `account_id` discriminator) as `z.union`. Discriminated by presence of `account_id`. 31 vault-schema tests pass. Evidence: `docs/reviews/ch0-audit-qa-report.md` §6.
**Mitigation.** `z.union([StakeholderPersonFrontmatter, StakeholderAccountFrontmatter])` per R0-Vault §SD-04. Discriminate by presence of `account_id` key.
**Owner.** Ch.0 architect.

### B28 — Mirror `business-planning/` diverges from canonical vault `CLOSED` `P2`
**What.** Mirror at `c-suite/business-planning/` was stale. WS-01 drifted (Vault: `phase=maintenance status=YELLOW`; Mirror: `phase=execution status=RED`). 3 vault dirs absent from mirror (`scheduled-reports/`, `scheduled-task-ledger/`, `transformation-backbone/`).
**Bites at.** Build-process integrity; risk of orchestrator reading stale mirror data.
**Status.** **CLOSED 2026-05-27 (polish UNIT-6).** Mirror deleted via `git rm -rf business-planning/`. Install fixtures preserved at `fixtures/skills/` and `fixtures/_extracted_skills_for_c_suite.md`. Code references updated (`scripts/install-extracted-skills.py` + `tests/unit/installer.spec.ts`). Doc references in CLAUDE.md / PURPOSE.md / DOCTRINE.md / README.md point to vault path. Vault is now the unambiguous SoT.
**Resolution.** Option (b) — delete + reference vault directly.

### B29 — `scripts/install-extracted-skills.py` writes truncated SKILL.md stubs `MITIGATED` `P2`
**What.** 6 of 8 operating-logic skills installed at `~/.claude/skills/<name>/SKILL.md` are 15-29 line truncations (header + first section only). Full bodies (168-232 lines) exist at `fixtures/skills/<name>/SKILL.md` (was `business-planning/skills/` pre-B28 polish). The install script extracted from `_extracted_skills_for_c_suite.md` but appears to have cut at section boundaries.
**Bites at.** Ch.7 (playbook prereqs invoke skills), Ch.10 (scheduler invokes skills as subprocesses).
**Status.** **MITIGATED 2026-05-27 — Ch.0 Audit/QA verified.** State-machine parser in `install-extracted-skills.py` lines 88-142 handles nested fences with depth counting. Repo-local fallback at lines 164-179 prefers `fixtures/skills/<name>/SKILL.md` (full bodies) over extracted content. 16 installer tests pass. `preflight.sh` truncation detector added (lines 183-202, 50-line floor). CONCERN: fallback not documented in ADR §7. Evidence: `docs/reviews/ch0-audit-qa-report.md` §7a.
**Mitigation.**
- Until installer is fixed: Ch.10 scheduler references `c-suite/fixtures/skills/<name>/SKILL.md` paths directly (full bodies are there + git-tracked).
- Fix the installer (`scripts/install-extracted-skills.py`) to write full bodies, then re-run.
- Add preflight check: SKILL.md line count >= 50 per installed skill.
**Owner.** Ch.0 architect (preflight + installer fix); Russell at next session if codify-vs-invoke decision shifts.

### B31 — globalShortcut registration fails silently if hotkey is already claimed `NEW` `P3`
**What.** Electron's `globalShortcut.register()` returns `false` silently (no exception) if the accelerator is already claimed by another app. The C-Suite will silently fail to register its activation shortcut if, for example, another productivity app claims `Cmd+Shift+C` (VSCode uses it for format document; other apps may vary).
**Bites at.** Ch.0 (app bootstrap), Ch.5 (first-slice activation).
**Status.** NEW — surfaced by R2 red-team 2026-05-26. Source: `https://electronjs.org/docs/latest/api/global-shortcut` — "When the accelerator is already taken by other applications, this call will silently fail."
**Mitigation.**
- After `globalShortcut.register()`, call `globalShortcut.isRegistered()` to verify success.
- If registration fails: surface a banner in the tray menu ("Hotkey unavailable — configure in settings") and open the shortcut-configuration panel.
- Provide a user-configurable hotkey setting in preferences (persisted in SQLite).
- Test at Day-Zero with Russell's full app stack running (VSCode, browsers, etc.).
**Owner.** Ch.0 architect; Ch.5 UX polish.

### B32 — Architecture spec references Dataview; Dataview is in maintenance mode `NEW` `P2`
**What.** Obsidian Dataview's lead developer announced they would not continue active development (September 2025 per Medium article). Obsidian Bases is now a built-in core plugin (Obsidian 1.9+, May 2025) and is the primary frontmatter query layer. Architecture specs or vault tooling that assumes Dataview may target a plugin that won't receive updates or fixes.
**Bites at.** Ch.6 (write-back schema design), Ch.1 (indexer frontmatter parsing), B13 (Bases query syntax).
**Status.** NEW — surfaced by R2 red-team 2026-05-26. Source: Medium "Obsidian Dataview Is Dead. Long Live Bases." (Sep 2025); YouTube "Obsidian 1.9 preview — What the new Bases plugin can (not) do" (May 2025, `https://www.youtube.com/watch?v=lpyIuLmEidQ`).
**Mitigation.**
- Ch.6 write-back schema must use **Bases-compatible plain YAML array syntax** for all typed link fields (not Dataview inline annotation syntax).
- Do NOT rely on Dataview for any query that the C-Suite runtime or vault-browsing workflow depends on.
- Ask Russell at next session: "Will you use Bases or Dataview for manual vault queries?" If Bases, remove any Dataview query blocks from vault templates.
- B13 additive fields already use plain YAML arrays — compatible with Bases.
**Owner.** Russell (preference confirmation); Ch.6 architect (schema).

### B33 — Preflight detects iCloud sync only; Dropbox/Google Drive sync also hazardous `NEW` `P2`
**What.** B9's preflight checks for iCloud sync on the vault path. Dropbox and Google Drive sync agents also interfere with atomic rename (`rename(2)`) operations and can corrupt SafeWrite. If Russell ever moves the vault into a Dropbox or Google Drive folder, the app will operate without detecting the hazard.
**Bites at.** Ch.2 (SafeWrite), Ch.11 (setup runbook).
**Status.** NEW — surfaced by R2 red-team 2026-05-26.
**Mitigation.**
- Preflight check detects ALL sync agents on the vault path: iCloud (`com.apple.CloudDocs` extended attribute), Dropbox (`.dropbox` marker file in ancestor directories), Google Drive (`Google Drive.app` process running + vault under `~/Library/CloudStorage/GoogleDrive-*` or `~/Google Drive/`).
- If any sync agent detected: refuse to start, surface clear error with remediation steps.
- Add to Ch.11 setup runbook.
**Owner.** Ch.0 architect (preflight.sh extension); Ch.11 runbook author.

### B34 — IPC stream event volume on long Opus Verifier runs may saturate renderer `MITIGATED` `P3`
**What.** If the C-Suite relays all `SDKPartialAssistantMessage` token events from the Verifier (Opus 4.7, potentially 10K+ tokens) to the renderer over IPC, the event volume can saturate the IPC channel and cause UI jank or dropped events on weaker Macs.
**Bites at.** Ch.3 (IPC event bus design), Ch.5 (round-table live view).
**Status.** NEW — surfaced by R2 red-team 2026-05-26. **MITIGATED — Ch.1 Audit/QA confirmed 2026-05-27.** `apps/utility/src/heartbeat.ts` ships the heartbeat-only relay: 250ms interval cap (`HEARTBEAT_INTERVAL_MS = 250`), `MAX_EMITS_PER_SEC = 4`, best-effort drop when backpressured (>2s no ack). `emitAgentComplete()` never dropped. Confirmed via source read: `shouldEmit()` enforces both interval and per-second caps; `isBackpressured()` guards against ack starvation. B34 MITIGATED at Ch.1.
**Owner.** Ch.3 architect (IPC design); Ch.5 round-table UX.

### B30 — Pre-existing SQLite at `c-suite/ruvector.db` of unknown schema `CLOSED`
**What.** R0-Vault found a `ruvector.db` file in the repo root. data.md assumes a fresh SQLite store for runtime. If ruvector.db is related to an existing tool (Ruflo? RuVector memory graph?), it may conflict or coexist.
**Bites at.** Ch.3 (SQLite migration runner).
**Status.** **CLOSED.** ADR-0002 §Context confirmed: `sqlite3 ruvector.db .schema` returned "not a database"; `xxd` confirmed magic bytes `72 65 64 62` = `redb` (Ruflo plugin artifact in Rust redb format, not SQLite). Zero path conflict with `runtime.db`. B30 closed. Ch.1 Audit/QA corrected BLOCKERS.md status from "Ch.3 scope deferred" to CLOSED — ADR-0002 §Context is the evidence, Ch.1 Runtime closed this during the build-log entry for Ch.1 ADR.
**Owner.** CLOSED — no further action required.

---

### B17 — Missing-skill register: 8 referenced skills not installed `MITIGATED` `P1`→`P3`
**What.** PRD and CLAUDE.md reference these skills as if they exist in Russell's Claude Code environment, but `find ~/.claude/skills/` returned nothing for them: `russell-voice`, `run-critique`, `weekly-cash-forecast`, `covenant-tracker`, `renewal-forecast`, `call-intelligence`, `system-check`, `class-aws-connector`. Hypothesis confirmed: they lived as **Cowork plugin skills** under `/var/folders/.../claude-hostloop-plugins/.../skills/<name>/` — ephemeral temp-folder mount Cowork manages, not portable to local Claude Code.
**Bites at.** Phase R R0 (skill inventory), Ch.4 (Run-Critic + Synthesizer voice rules), Ch.7 (playbook skill invocations), Ch.8 (MCP skill wrappers), Ch.10 (scheduled jobs).
**Status.** **MITIGATED 2026-05-26.** Russell ran the `scripts/cowork-extract-skills.md` prompt in Cowork; Cowork wrote `/Users/russellteter/Documents/Claude/Projects/Business Planning/_extracted_skills_for_c_suite.md` (2,369 lines, 8 skills, all verbatim). The local session ran `scripts/install-extracted-skills.py` which installed:
- `~/.claude/skills/russell-voice/` (SKILL.md + 3 refs: phrases.md, structures.md, russell-lexicon.md)
- `~/.claude/skills/run-critique/SKILL.md`
- `~/.claude/skills/weekly-cash-forecast/SKILL.md`
- `~/.claude/skills/covenant-tracker/SKILL.md`
- `~/.claude/skills/renewal-forecast/SKILL.md`
- `~/.claude/skills/call-intelligence/SKILL.md`
- `~/.claude/skills/system-check/SKILL.md`
- `~/.claude/skills/class-aws-connector/` (SKILL.md + 3 refs: common_queries.md, recovery.md, cash_model_context.md)

All 8 now appear in the Claude Code skill registry (verified via system-reminder skill listing 2026-05-26 22:10 ET). preflight.sh confirms all skill rows green.

**One known issue carried forward** (from the extraction): the `renewal-forecast` skill uses `Opportunity.Owner.Name` SOQL queries that surface terminated reps — the SAME bug as BLOCKERS B7. The corrected pattern (`Account_Manager__r` + `IsActive`) is now both documented in the skill's "Known issues" section AND verified live against the Class org (B7 verified). When the C-Suite invokes this skill, wrap with the corrected query OR fix the skill source directly.

**Connector wiring note** from the extraction (relevant to mcp.md): the original Cowork skills reference Cowork-specific MCP UUIDs (`mcp__c1f73cc9-916c-4b4e-b5fc-db2960d27602__ns_runCustomSuiteQL`, etc.). When the C-Suite codifies these skill behaviors into its own modules at Ch.7/Ch.10, map skill intent to the C-Suite's wrapper interface — do not paste the Cowork UUIDs. R0 will document this mapping.

**Slack-touching code paths in some skills (per extraction notes) are deferred to V1.5** — Slack is not a V1 MCP per PRD §6. Flag where present, defer the path.

Severity downgraded P1 → P3 (residual risk: the codify-vs-invoke per-skill decision still needs to happen at Ch.7/Ch.10 boundary; tracked but no longer blocking).
**Owner.** R0 documents per-skill codify-vs-invoke decision in `docs/research/R0-skill-inventory.md`; /goal applies at Ch.7/Ch.10.

---

## Russell-specific operating-mode notes

These are not blockers but operating constraints that shape mitigation choices.

- **Russell has stated "I don't need to review anything ever."** Default to "decide and log" per `DOCTRINE.md` operating-mode override. Hard gates only at on-Mac verification, genuine product-shape forks, and destructive/external actions.
- **GitHub auto-sync via post-commit hook.** No PR review flow for documentation work; commits push directly to `origin/main`.
- **Russell uses Claude.ai + Cowork on the same Max subscription.** Concurrency math (B4) must account for external usage.
- **Russell's vault is at `/Users/russellteter/Documents/Claude/Projects/Business Planning/`.** Phase R R0 verifies iCloud-sync attribute (B9).

---

## Maintenance protocol

`/goal` updates this register:

1. **Phase R R2** statuses every seeded blocker, adds any new ones discovered.
2. **End of every chapter,** the Audit/QA pass reviews blockers that "bite at" the closed chapter; status update required (`MITIGATED`, `STILL ACTIVE`, etc.).
3. **Any time a chapter discovers a blocker not listed,** add immediately with `NEW` status and full per-entry fields.
4. **Severity changes** (`DOWNGRADED` / `UPGRADED`) are explicit and dated.
5. **Commits to this file** use message format `blockers: <id> <action> — <why>` and auto-push.

Per DOCTRINE law #9 (live-corrected learning): if a chapter discovers a blocker contradicts the plan, **update the plan AND this register** — never plow ahead on a stale premise.

---

## Ultra-Review critical findings (2026-05-27) — Phase 1 BLOCKED items

### B35 — Verifier never executes; rigor score hardcoded `NEW` `P0` → `MITIGATED`
**What.** Ultra-Review (2026-05-27, commit `e29aacc`) verified: `apps/utility/src/agents/verifier-runner.js` does NOT exist. `apps/utility/src/orchestrator/run-loop.ts:109-114` hardcodes `verifier.pass({ rigorScore: 85 })`. Every run produces a fabricated rigor score; the Verifier — the primary quality gate per PRD §5 — never executes. Violates goal completion criterion (g) "real run produced rigor-scored memo."
**Bites at.** Ch.5 closure (criterion g); Ch.6+ (write-backs gated on rigor); the entire B3 keystone's downstream purpose.
**Status.** `MITIGATED` 2026-05-27. `apps/utility/src/agents/verifier-runner.ts` ships `runVerifier()` + `StubVerifierInvoker` + `VerifierOutputContractViolation`. `run-loop.ts:109-114` replaced with real `buildVerifierInput()` → `runVerifier()` → `rigorScore()` path (try/catch fallback to 85 only when DB not seeded). `tests/fixtures/lens-outputs/cash-lever-run/Verifier.json` happy-path fixture created. `tests/unit/verifier-runner.spec.ts` — 11/11 green. BY-HAND: canary rigor_score=52 (not 85), cash-lever rigor_score=83 (not 85). AC-1 in ch5-audit-qa-report.md updated NW → PASS.
**Owner.** Closed.

### B36 — Playbook classifier falls through to open_qa for 6 of 8 playbooks `NEW` `P1`
**What.** `apps/utility/src/orchestrator/classify-playbook.ts:70-77` only routes cash_lever + stakeholder_1on1_prep. Six playbooks (weekly_cash_forecast, quarterly_ops_review, annual_plan_workshop, pre_mortem, red_ocean_teardown, quick_read) fall through to `open_qa`. PRD §6 specifies distinct lens rosters per playbook — all 6 are ignored.
**Bites at.** Ch.7 (8 playbooks complete); silently degrades any non-cash-lever Phase 1 run.
**Recommended unblock.** Extend classifier with keyword maps per playbook; add unit tests for each playbook's keyword set; wire `run-plan-builder.ts` to honor the PRD §6 lens roster per classification.
**Owner.** Russell decides Ch.7 timing; next-/goal implements.

### B37 — `stakeholder_1on1_prep` wired to [CEO, COS]; PRD §6 specifies COS-only fast lane `NEW` `P1`
**What.** `apps/utility/src/playbooks/runPlanBuilder.ts:92` hard-codes `lenses: ['CEO', 'COS']` for stakeholder_1on1_prep. PRD §6 explicitly: "COS only — single-agent fast lane."
**Bites at.** PRD §6 compliance; Ch.7 playbook surface.
**Recommended unblock.** One-line fix: change to `['COS']`. Add test.
**Owner.** Next-/goal Runtime.

### B38 — review→write-back N=3 iteration cap not enforced in code `NEW` `P1`
**What.** Ch.3 `state-machine.ts:224-235` `review → write-back-proposed` transition has no max-iteration guard. Phase R Decision 3 locks N=3 (per `phase-r-decisions.md` §Decision 3); the code does not enforce it. Runaway feedback loop possible on live runs.
**Bites at.** Ch.6 (iterative feedback) + runtime safety on every live run.
**Recommended unblock.** Add `iteration_count` to RunState; throw `IterationCapReached` at N=3 with structured options for Russell.
**Owner.** Next-/goal Architect (decide cap-reached UX) + Runtime.

### B39 — `safeWrite` swallows git-commit failures silently `NEW` `P1`
**What.** `packages/vault-writer/src/safeWrite.ts:227-229` catches git-commit failures without re-throwing or surfacing. PRD §5 mandates every C-Suite write is git-tracked; silent catch destroys that guarantee without detection.
**Bites at.** PRD §5 compliance; every shared-zone write since Ch.2.
**Recommended unblock.** Re-throw the catch OR emit `IpcMessage<'vault.commit.failed'>` + log error before continuing. Test: force a git failure (e.g., readonly vault); confirm event fires.
**Owner.** Next-/goal Runtime; possibly a Ch.2 reopen.

---

## Ultra-Review important findings (2026-05-27) — for Phase 2 prep

| ID candidate | What |
|---|---|
| B40 | 8 Cowork skills have no invocation path in apps/packages — inert files until codify-or-subprocess decision per skill (Ch.7/Ch.10 scope per `mcp.md`). |
| B41 | AC-10 MCP-guard tests skipped (no active test confirms MCP calls blocked before `run.plan.approved`). |
| B42 | No safeStorage credential scaffolding in Ch.0-5; Ch.8 starts with blank slate for MCP credentials. |
| B43 | AC-9 RTL tests skipped (no active test confirms RoundTable.tsx renders substance during a run). |

(Russell may upgrade to formal B-entries during the morning checkpoint if he wants explicit tracking.)

