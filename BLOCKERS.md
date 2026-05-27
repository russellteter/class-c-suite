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

### B3 — Verifier reasoning-trace leak (rubber-stamp risk) `SEEDED` `P0`
**What.** If the Verifier's input includes any lens reasoning trace (chain-of-thought, intermediate prompts), the Verifier will rubber-stamp instead of grading. **This is the single trust-defining wiring in the product.**
**Bites at.** Ch.4 (Verifier prompt + input contract).
**Status.** Architecture spec explicit; enforcement is the keystone.
**Mitigation.**
- Verifier input assembled **only from structured outputs + audit trail** — never from lens transcripts.
- Assertion throws on any lens-transcript content reaching the Verifier.
- **Planted-unsourced-claim canary fixture** as permanent regression guard. Goes red if a future model makes the Verifier lenient.
- Verifier output schema forces falsifier + missing-data flags; rejects null returns.

### B4 — Claude Max 220K/5-hr window blind to Russell's other Claude usage `SEEDED` `P1`
**What.** Russell also uses Claude.ai and Cowork on the same Max subscription. The C-Suite's scheduler cannot see external usage — risks throttling Russell's primary workflows or being throttled itself.
**Bites at.** Ch.1 (scheduler) + Ch.10 (autonomy concurrency).
**Status.** Phase R R2 verifies actual Max rate-limit behavior + Russell's typical concurrent load.
**Mitigation.**
- Treat the 220K/5-hr ceiling as effectively ~180K to leave headroom for external usage.
- **Interactive runs strict-priority over scheduled jobs** in the scheduler.
- Degrade-to-sequential under pressure (six lenses run serially if concurrent-window math says so).
- Per-run cost meter surfaces credit-proximity in UI (PRD §6 home-screen + memo header).

### B5 — `maxBudgetUsd` / `total_cost_usd` semantics on Max unconfirmed `SEEDED` `P2`
**What.** The Claude Agent SDK's cost-meter fields may be USD-denominated (API-billing semantics) or may not exist for Max subscriptions.
**Bites at.** Ch.1 (cost meter).
**Status.** Phase R R2 verifies.
**Mitigation.** If cost is non-metered on Max, the meter is **token-based not USD**. Surface as "tokens used / window cap remaining" rather than dollars.

---

## Product-shape risks (P1-P2)

### B6 — Covenant terms are ASSUMED `SEEDED` `P2`
**What.** The `covenant-tracker` skill's thresholds are not verbatim from Class's credit agreement with Barclays — they're best-effort guesses.
**Bites at.** Ch.7 (playbook 1 prereqs + autonomy tripwire scan).
**Mitigation.**
- Day-Zero form on first scheduled run captures the verbatim covenant cutoff + terms.
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

### B8 — Concurrent edits: Cowork `/deep` bypasses SafeWrite on shared zones `SEEDED` `P2`
**What.** PRD locks Cowork `/deep` as a fallback. Cowork does not implement SafeWrite. Concurrent C-Suite + Cowork writes to the same shared-zone file (workstream, decision, position) may produce conflicts.
**Bites at.** Ch.2 (SafeWrite design) + Ch.5 first-slice ops.
**Mitigation.**
- Decide-and-log per Phase R decision #1 default: **don't block Cowork; sidecar handles it.**
- Document Cowork as **read-mostly** post-ship; Russell uses Cowork for `/deep` fallback investigations and execution work, not for routine vault edits.
- SafeWrite sidecars surface in UI; Russell merges manually.

### B9 — iCloud-synced vault → atomic-rename / git-corruption hazard `SEEDED` `P1`
**What.** If the vault folder lives in iCloud Drive (default Documents folder behavior on modern macOS), file metadata sync can corrupt atomic-rename operations and confuse git.
**Bites at.** Ch.2 (SafeWrite) + Ch.11 (setup runbook).
**Mitigation.**
- Verify vault is in a **non-syncing location** — Russell's vault is at `/Users/russellteter/Documents/Claude/Projects/Business Planning/`. Phase R R0 confirms whether `Documents/` is iCloud-synced on Russell's Mac (Sequoia default behavior).
- If iCloud-synced, document prominently in Ch.11 setup runbook: move vault to a non-iCloud path (e.g. `/Users/russellteter/Vault/`) or disable iCloud Drive Documents sync.
- Pre-flight check at C-Suite startup detects iCloud-sync attribute and refuses to operate if detected.

### B10 — `isQuantOrNamed` classifier is load-bearing for 35% of rigor score; boundary is fuzzy `SEEDED` `P2`
**What.** The rigor formula gives 35 points for claim-source binding, gated by an `isQuantOrNamed(claim)` classifier. Quantitative or named-entity claims must cite; opinion claims need not. The boundary between "quantitative/named" and "opinion" is fuzzy; an LLM classifier would drift run-to-run.
**Bites at.** Ch.4 (rigor formula).
**Mitigation.**
- Ship a **frozen, unit-tested deterministic classifier** (regex + heuristics + unit-test fixtures). Two runs of the same memo score identically.
- 50+ test cases covering edge cases (numbers in opinions, named entities in hypotheticals, etc.).

### B11 — Chorus exposes only AI summaries (no raw transcript) — weak health evidence `SEEDED` `P3`
**What.** Chorus's API gives AI-generated call summaries, not raw transcripts. Summaries are LLM-derived and can amplify hallucinations if treated as primary evidence.
**Bites at.** Ch.8 (Chorus MCP).
**Mitigation.**
- **Cap Chorus-only-sourced claims at <70 confidence.**
- Always pair Chorus claims with Salesforce or NetSuite corroboration before crossing the rigor threshold.
- Memo footer notes when a claim is Chorus-only.

### B12 — `amount_usd` is free-text in workstreams — tripwire scan can't compute on it `SEEDED` `P2`
**What.** Workstream files use free-text for `amount_usd` ("$1.2M," "approx $500K," "TBD"). Autonomy tripwire scans can't reliably do math on these.
**Bites at.** Ch.7 (playbooks reading workstreams) + Ch.10 (autonomy tripwire scan).
**Mitigation.**
- **Mirror a structured numeric** (cents-as-integer) into SQLite **rather than mutating the vault shape.** Vault stays human-friendly free-text; runtime gets a typed mirror.
- Tripwire scan + cash forecasting read the SQLite mirror.
- A parser converts free-text → mirror on workstream write; ambiguous entries flag for Russell.

### B13 — Decision frontmatter lacks machine-readable position/prediction links (Bases queries) `SEEDED` `P3`
**What.** Existing `decisions/` frontmatter uses prose for cross-references rather than typed arrays. Obsidian Bases queries can't traverse without typed links.
**Bites at.** Ch.6 (write-back schema + Bases-readable indexes).
**Mitigation.**
- **Additive** `linked_positions: [...]` / `predictions_spawned: [...]` keys (Day-Zero Bases form captures the mapping Russell wants).
- Doesn't break existing files; only enriches.
- Synthesizer/Verifier populate the typed arrays on new decisions; back-fill is optional.

### B14 — better-sqlite3 + native-module notarization entitlements `SEEDED` `P2`
**What.** Native node modules (better-sqlite3, possibly chokidar's OS-watcher backend) require correct electron-builder entitlements to pass Apple notarization. Pinning is touchy.
**Bites at.** Ch.8 / Ch.11.
**Mitigation.**
- **`electron-rebuild` pinned** to the Electron version in `package.json`.
- **Test notarization on a throwaway build mid-Ch.8** — don't wait for Ch.11 to discover this is broken.
- Document the working entitlements + signing identity in the Ch.11 setup runbook.

### B15 — Calibration-freshness when zero positions cited — product-philosophy call `SEEDED` `P3`
**What.** The rigor formula's calibration-freshness component (15 points) penalizes stale calibration use. But what if a memo legitimately cites zero positions because the question is novel? Penalty or pass?
**Bites at.** Ch.4 (rigor formula edge case).
**Mitigation.**
- "Decide and log" under doctrine: **reward using the library** rather than only penalizing stale use. Memos with zero position citations don't get the 15 points but don't get penalized below threshold either.
- If Russell wants stricter (penalize for not using library), surface as Day-Zero form question.

### B16 — Audit trail contains sensitive SF/NS excerpts — durability vs git-pushed vault `SEEDED` `P3`
**What.** The audit trail records tool-call results including Salesforce / NetSuite excerpts. If the vault git repo is push to a private remote for off-machine backup, sensitive data crosses the network.
**Bites at.** Ch.1 (audit trail storage).
**Mitigation.**
- **Keep audit trail in SQLite (runtime metadata)**, not in the vault. SQLite is local-only by default.
- Optional **in-vault export** of audit excerpts gated by Russell (separate review).
- Vault git push remains for the artifact corpus; SQLite stays local.

---

## New blockers (added during Phase R or chapters)

### B21 — `type:` discriminator field absent from all vault artifacts `NEW` `P0`
**What.** Every Zod schema in `docs/architecture/data.md` uses `z.literal('position'|'decision'|...)` for the `type` field. R0-Vault verified across 75+ files: **zero** have a `type:` key in their YAML frontmatter. Parser will fail for 100% of vault reads.
**Bites at.** Ch.0 (schema design), Ch.1 (indexer), Ch.2 (SafeWrite read-side), Ch.3 (lens context bundle).
**Status.** Surfaced via R0-Vault `docs/research/R0-constraints-ledger.md` §SD-01.
**Mitigation.**
- Inject `type` at parse time from file-path zone (Option B in R0 ledger). Do NOT write `type:` keys back to vault files (would touch 75+ files unnecessarily).
- Update `data.md` Zod schemas to omit `type` and provide a `parseArtifact(rawYaml, zone)` wrapper.
- Ch.0 architect codifies the zone→type map.
**Owner.** Ch.0 architect.

### B22 — Vault git has zero commits `NEW` `P0`
**What.** Vault path is git-initialized (`/Users/russellteter/Documents/Claude/Projects/Business Planning/.git/` exists, mtime 2026-05-26) but `git log --oneline -5` returns `fatal: your current branch 'main' does not have any commits yet`. SafeWrite's auto-commit hook (`git add <path>; git commit -m "c-suite: ..."`) will produce orphan history; the institutional change-history reading depends on a non-empty `git log`.
**Bites at.** Ch.2 (SafeWrite), all post-Ch.2 vault writes.
**Status.** Surfaced via R0-Vault verification command output.
**Mitigation.**
- Ch.0 setup: perform initial bulk commit of vault contents BEFORE Ch.2 ships. Use a `scripts/vault-bootstrap.sh` that runs `git -C <vault> add . && git commit -m "vault: pre-C-Suite SafeWrite baseline (manual snapshot)"`.
- Vault `.gitignore` is absent — preflight should suggest adding `.DS_Store`, `*.tmp-*`, `*.proposed-*`, `_extracted_skills_for_c_suite.md` (if it's meant to be local-only) before the bootstrap commit.
- Document in Ch.11 setup runbook so Russell's fresh-Mac install reproduces the bootstrap.
**Owner.** Ch.0 architect (writes the bootstrap script); deferred from Phase R per scaffold-session decision to keep vault writes SafeWrite-aware.

### B23 — Kebab vs snake key naming chaos across every artifact type `NEW` `P0`
**What.** Vault uses **kebab-case** for positions (`last-retested`, `superseded-by`, `decision-this-supports`), pre-mortems (kebab variant), predictions (PRED-007), and parts of stakeholders. Other artifacts use **snake_case**. `data.md` schemas assume snake_case. Zod parse will fail for every kebab-keyed file.
**Bites at.** Ch.1 (frontmatter parser), Ch.3 (lens context bundle assembly).
**Status.** Surfaced via R0-Vault §SD-02. 4 of 14 pre-mortems use snake; rest use kebab. Mixed within single artifact type.
**Mitigation.**
- YAML key normalizer middleware: replace `-` → `_` in object keys at parse time, then validate via existing snake_case schemas.
- Do NOT migrate vault files — leave Russell's preferred kebab style intact.
- Codify in `packages/shared-types/src/normalizeKeys.ts` (Ch.0).
**Owner.** Ch.0 architect.

### B24 — `WorkstreamFrontmatter` in data.md under-specified by 10+ fields `NEW` `P1`
**What.** `data.md` WorkstreamFrontmatter has 6 fields (type, id, title, status, amount_usd, dependencies, milestones). Real corpus has 15+: `cash_impact` (object), `arr_impact` (object), `status_criteria` (object), `people_involved`, `depends_on`, `depended_on_by`, `next_milestone`, `next_milestone_date`, `decisions_pending`, `linked_positions`, `linked_decisions`. **`amount_usd` is nested inside `cash_impact`, not at top-level** — the SQLite `workstream_amounts_mirror` parser must read `cash_impact.amount_usd`.
**Bites at.** Ch.1 (indexer), Ch.3 (lens context bundle), Ch.10 (tripwire-scan reads workstream amounts).
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

### B26 — Pre-mortem `impact` enum is completely wrong in data.md `NEW` `P1`
**What.** `data.md` enum: `catastrophic|severe|significant|recoverable`. On-disk reality across 14 files: `existential`, `HIGH`, `high`, `medium`. **Zero overlap.** Zod parse fails 100% of pre-mortems.
**Bites at.** Ch.1 (parser), Ch.7 (pre-mortem-on-proposed-action playbook reads them).
**Mitigation.** Replace enum with on-disk values. Normalize case (`HIGH` → `high`) in middleware. See R0-Vault §SD-05.
**Owner.** Ch.0 architect.

### B27 — `StakeholderFrontmatter` bifurcates by subdirectory `NEW` `P1`
**What.** `internal-exec-board/` + `internal-dependencies/` (12 files) use lean 5-key person shape. `customers-top-arr/seu-bme.md` uses 18-key account shape. data.md has neither correctly.
**Bites at.** Ch.1 (parser), Ch.7 (stakeholder 1:1 prep playbook).
**Mitigation.** `z.union([StakeholderPersonFrontmatter, StakeholderAccountFrontmatter])` per R0-Vault §SD-04. Discriminate by presence of `account_id` key.
**Owner.** Ch.0 architect.

### B28 — Mirror `business-planning/` diverges from canonical vault `NEW` `P2`
**What.** Mirror at `c-suite/business-planning/` is stale. R0-Vault confirmed WS-01 has meaningfully drifted (Vault: `phase=maintenance status=YELLOW`; Mirror: `phase=execution status=RED`). 3 entire directories are absent from mirror (`scheduled-reports/`, `scheduled-task-ledger/`, `transformation-backbone/`).
**Bites at.** Build-process integrity; risk of orchestrator reading stale mirror data.
**Status.** **Surfaced to Russell.** This is a genuine product-shape fork — mirror was intentionally created during scaffold session for reproducibility; removing it changes bootstrap. Auto-mode does NOT delete.
**Mitigation candidates (Russell picks):**
- (a) Keep mirror, add `scripts/sync-mirror.sh` that rsyncs from vault on demand (read-only direction).
- (b) Delete mirror; reference vault directly per `docs/architecture/data.md`. Update preflight to verify vault path.
- (c) Convert mirror to `.gitignore`'d symlink — small repo footprint, lives only on developer machines.
**Recommendation (under DOCTRINE creativity-within-guardrails):** (b) — vault is canonical SoT per data.md; mirror creates drift risk. But preserve `business-planning/skills/` + `business-planning/_extracted_skills_for_c_suite.md` (these are install fixtures, not mirrored vault content).
**Owner.** Russell (next session) approves option.

### B29 — `scripts/install-extracted-skills.py` writes truncated SKILL.md stubs `NEW` `P2`
**What.** 6 of 8 operating-logic skills installed at `~/.claude/skills/<name>/SKILL.md` are 15-29 line truncations (header + first section only). Full bodies (168-232 lines) exist at `business-planning/skills/<name>/SKILL.md`. The install script extracted from `_extracted_skills_for_c_suite.md` but appears to have cut at section boundaries.
**Bites at.** Ch.7 (playbook prereqs invoke skills), Ch.10 (scheduler invokes skills as subprocesses).
**Status.** B17 was MITIGATED based on skill presence in registry; this finding REOPENS partial — bodies are not what Ch.7/Ch.10 will invoke.
**Mitigation.**
- Until installer is fixed: Ch.10 scheduler references `c-suite/business-planning/skills/<name>/SKILL.md` paths directly (full bodies are there + git-tracked).
- Fix the installer (`scripts/install-extracted-skills.py`) to write full bodies, then re-run.
- Add preflight check: SKILL.md line count >= 50 per installed skill.
**Owner.** Ch.0 architect (preflight + installer fix); Russell at next session if codify-vs-invoke decision shifts.

### B30 — Pre-existing SQLite at `c-suite/ruvector.db` of unknown schema `NEW` `P3`
**What.** R0-Vault found a `ruvector.db` file in the repo root. data.md assumes a fresh SQLite store for runtime. If ruvector.db is related to an existing tool (Ruflo? RuVector memory graph?), it may conflict or coexist.
**Bites at.** Ch.3 (SQLite migration runner).
**Mitigation.** Ch.3 architect: investigate ruvector.db schema (run `sqlite3 ruvector.db .schema`) before declaring a fresh SQLite store. Most likely unrelated to C-Suite (Ruflo plugin artifact), but verify.
**Owner.** Ch.3 architect.

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
