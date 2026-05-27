# RESEARCH — Phase R Protocol

> `/goal`'s first action. Before any chapter is coded, Phase R runs deep, adversarial research over everything that already exists, to ground the build in reality and surface blockers before they cost a chapter. **Protocol only — execute on Russell's Mac.**

Phase R deploys parallel research sub-agents (Explore-class for breadth, deep-read agents for fidelity) under `DOCTRINE.md`. It uses **`context7`** for up-to-date library/SDK docs and **firecrawl** for current best practices. **It never guesses where it can verify.** All findings land in `docs/research/` and corrections fold back into `docs/architecture/*.md` (recursive — Phase R is allowed to rewrite the architecture).

## Structure

Three sub-phases run with parallelism where independent. Total budget: research-only, no production code.

| Sub-phase | Focus | Output | Exit gate |
|---|---|---|---|
| **R0** | Corpus & asset deep-dive | `docs/research/R0-knowledge-inventory.md` + `docs/research/R0-constraints-ledger.md` | every artifact type catalogued; every binding constraint logged with source cite |
| **R1** | Live-environment recon | `docs/research/R1-connector-reality.md` + folded corrections into `docs/architecture/mcp.md` | every assumed schema/field/count verified or flagged; NetSuite TBA request sent to Brian |
| **R2** | Blind-spot & blocker discovery | `BLOCKERS.md` (fully populated) + go/no-go notes on critical-path externals | every spec-flagged "open risk" verified against reality; new risks hunted; severity + chapter + mitigation per item |

## R0 — Corpus & asset deep-dive

**Mandate.** Systematically read *every* file in `business-planning/`, not a sample. Use parallel `Explore` and deep-read sub-agents under `DOCTRINE.md` law #3 (persistence — multiple tactics before declaring missing).

### Required reads (no skipping)

**Operating-model spine:**
- `Strategic_AI_Operating_Model.md` — v1 constitution. 5 lenses. 5-pass loop. Connector playbook.
- `Strategic_AI_Operating_Model_v2.md` — conviction backbone, stakeholder/workstream/adversarial layers.
- `Strategic_AI_Invocation_Guide.md` — exact prompt templates per lens and mode.
- `Strategic_AI_Connector_Playbook.md` — connector routing, SuiteQL/SOQL patterns, data-quality discipline.
- `Strategic_AI_Conviction_Backbone.md` — schema for positions, decisions, calibration, pre-mortems.
- `Strategic_AI_Stakeholder_Workstream_Adversarial.md` — schemas for stakeholders, workstreams, adversarial library.
- `Strategic_AI_Cross_Claude_Spine.md` ⚠️ — flagged in ultraplan as not yet read; read now.
- `Strategic_AI_Stack_Inventory.md` ⚠️ — flagged; read now.
- `Strategic_AI_Knowledge_Base_Audit.md` ⚠️ — flagged; read now.
- `turnaround_operating_library.md` — doctrine library lens agents cite.
- `SESSION_START_PROTOCOL.md` — Russell's session-start discipline.

**Artifact-type inventories (each directory + every artifact, not just the INDEX):**
- `positions/` — every active position; note `correction-log[]` schema, supersession chain pattern, frontmatter fields actually present (vs. design-doc claims).
- `decisions/` — every active and resolved decision; note snake_case fields, tripwire schema, link conventions.
- `workstreams/` — all 12 turnaround tracks; note `amount_usd` shape (free-text per ultraplan B12), dependency model, status lifecycle.
- `stakeholders/` — all 13 models; note lean frontmatter (per ultraplan), what's actually populated vs. spec.
- `pre-mortems/` — all 13 entries; note probability/impact/early-warning/mitigation schema.
- `calibration/` — `SCORECARD.md` plus per-prediction files; note Brier-score-equivalent shape.
- `adversarial/` — competitor watch, financial tripwires, regulatory exposure, defection patterns.
- `investigations/` — both completed `/deep` runs (`class-org-institutional-read`, `class-gtm-strategy-2026`) read end-to-end. These are working ground truth for "what good output looks like."
- `deliverables/` — past run outputs including `.xlsx`/`.csv`/`.html` artifacts.

**Financial / business artifacts:**
- `Class_Cash_Lever_Model_v5_2026-05-18.xlsx` (the cash lever spreadsheet)
- `Class_Cash_Model_2026-05-18.xlsx`, `Coverage_Ratio_Model_2026-05-22.xlsx`, `Class_Scenario_Strategy_2026-05-18.xlsx`
- `State_of_the_Company_2026-05-22.md`
- `Operating_Agreement_Analysis_2026-05-22.md`
- `The_October_8_2026_Cliff.md`
- `Class Board Meeting Slides - May 2026 (1) (1).pdf`
- `aws_data/` — Class's AWS account inventory and spend data.

**Memory:**
- Locate the correct `MEMORY.md` under `/Users/russellteter/Library/Application Support/Claude/local-agent-mode-sessions/` (there are multiple `space` dirs — find the one corresponding to the C-Suite or Business Planning project). Read MEMORY.md and **every file it links via `[[name]]` syntax**.

**External-but-required code/skills:**
- `customer-dashboard-poc` project at `/Users/russellteter/Claude Code Projects/customer-dashboard-poc/` (or wherever found). Read codebase: how it connects to PowerBI, query patterns, data shape, auth flow. **This is required at V1, not deferred — see additional decision #9.**
- Russell's installed skills, especially:
  - **Operating-logic skills:** `weekly-cash-forecast`, `covenant-tracker`, `renewal-forecast`, `call-intelligence`, `run-critique`, `system-check`, `class-aws-connector`.
  - **Brand-voice skills:** `class-brand-document`, `class-brand-excel`, `class-brand-presentations`, `class-ppt-cyan-light`, `class-brand-voice`, `russell-voice`, `class-content-writer`, `class-content-qa`.
  - Skill content lives in Russell's Claude environment under the plugin skills directory; locate and read each.

### R0 outputs

1. **`docs/research/R0-knowledge-inventory.md`** — comprehensive map: every artifact type, every directory, file count per type, schema patterns (verified, not assumed), freshness signals, missing/orphan files. Every claim binds to a source path.
2. **`docs/research/R0-constraints-ledger.md`** — every real schema, ID convention, number, and rule the code must honor. Examples: actual frontmatter keys present in `positions/`, the `correction-log[]` shape, decision snake_case vs. camelCase, workstream `amount_usd` free-text reality, stakeholder lean frontmatter shape, calibration scorecard structure. Each entry sourced.
3. **`docs/research/R0-skill-inventory.md`** — what each relevant skill does, its inputs/outputs, whether the C-Suite invokes it as a subprocess vs. codifies its logic, brand patterns to bake into Synthesizer/Verifier/template prompts.
4. **`docs/research/R0-mirror-divergence-policy.md`** — the repo at `c-suite/business-planning/` is a **mirror** of the source-of-truth corpus at `/Users/russellteter/Documents/Claude/Projects/Business Planning/`. Phase R R0 documents the policy for keeping them in sync: detection (file-mtime + sha256 comparison), reconciliation cadence (manual via a `scripts/sync-business-planning.sh`? automated on Phase R start? on each chapter start?), and which direction is canonical when they disagree (source-of-truth always wins for original content; mirror wins for the additive `§11 Build Program` / `§10 Reference block` sections). Required so the augmented mirror sections don't drift away from any source-of-truth changes Russell makes in his Documents/ corpus.

### R0 exit criteria

- Every required read above is logged with a brief summary in the inventory.
- Every artifact-type schema discrepancy between PRD/design-docs and on-disk reality is documented.
- `docs/architecture/data.md` Zod schemas updated to match on-disk truth byte-for-byte; gaps explicitly marked `UNKNOWN — needs <X>` per DOCTRINE law #1.

---

## R1 — Live-environment recon

**Mandate.** Enumerate the MCP connectors actually available; verify real schemas, field names, and counts against reality. Correct every assumption the architecture specs made.

### Verifications required (per service)

**Salesforce (Class's `classedu.my.salesforce.com` org):**
- Use the `salesforce-connector` skill or `sf` CLI to inspect actual object schemas: `Account`, `Opportunity`, `Contact`, `Lead`, custom fields actually present.
- Confirm: which renewal-related fields exist (`Renewal_Date__c`? `Renewal_Status__c`?), what custom object the renewal forecast actually queries.
- Verify the ultraplan B7 concern: `renewal-forecast` skill uses `Owner.Name` — but the active-AM rule says `Account_Manager__r` + `IsActive`. Confirm reality and propose fix in the skill source.
- Confirm "Committed" filter shape: `StageName IN (S4, S5, Commit, BestCase)` — verify the actual stage labels used by Class's org.
- Auth flow: OAuth Connected App in Class's org with PKCE; refresh-token storage in `safeStorage`.

**NetSuite (Class's instance):**
- Confirm SuiteQL is enabled; identify Saved Searches actually present.
- Document TBA token requirement: this is the longest-lead external dependency (the human "Brian" must enable). **Send the TBA enablement request in R1, not later.** Track the ask in `BLOCKERS.md` B1.
- Verify `foreigntotal` / payroll-blind-spot rules from the Connector Playbook.
- Verify the `>24 month` skip rule for closed periods.

**AWS:**
- Verify Russell's SSO profile names locally (`aws configure list-profiles`).
- Ultraplan claim: spec assumed ~50 accounts, agent found **60** on the `class` profile. Confirm actual count via `aws organizations list-accounts`. **This drift is exactly what R1 exists to catch — log every similar drift.**
- Confirm `class` + `collab` sum rule.
- Read the existing `class-aws-connector.skill` for current query patterns.

**Gmail:**
- Confirm Google OAuth scopes required (read-only for the morning brief; no send).
- Confirm refresh-token rotation cadence.

**Chorus:**
- Confirm API key flow (simple key, no OAuth).
- Document what's exposed: AI summaries vs. raw transcripts. Ultraplan B11 flag: Chorus exposes only summaries — weak as health evidence; must cap Chorus-only-sourced claims <70 confidence and pair with SF/NS.

**PowerBI (via `customer-dashboard-poc`):**
- **R1 must read the entire `customer-dashboard-poc` codebase.** Document: dataset shape, query patterns, current connection auth, what feature/engagement metrics are actually retrievable.
- Ultraplan B2: PowerBI shape is unknown to the architecture spec; treat current integration as the source of truth. Verify whether the existing project's auth pattern transfers cleanly to an Electron subprocess or new MCP wrapper.
- Resolve additional decision #9: import code? subprocess with tool interface? new MCP? Recommend with rationale.

### Connector-Playbook rule verification

Read `Strategic_AI_Connector_Playbook.md` and verify every rule it states against the live data:
- Committed pipeline definition (S4 + S5 + Commit + BestCase).
- Active-AM ownership (`Account_Manager__r` + `IsActive`, not `Owner.Name`).
- AWS sum of `class` + `collab`.
- NetSuite `foreigntotal` and payroll-blind-spot rules.
- 24-month closed-period skip.
- Chorus pairing requirement.

For each rule: confirm or correct. Update the typed parameterized SOQL/SuiteQL builders in `docs/architecture/mcp.md` to encode the verified rules.

### R1 outputs

1. **`docs/research/R1-connector-reality.md`** — per service: auth flow, real schema, actual counts, query patterns. Every divergence from the architecture spec called out explicitly with severity.
2. **`docs/architecture/mcp.md`** — updated with verified schemas, corrected query builders, real auth flows.
3. **NetSuite TBA request to Brian** — sent. Tracked in `BLOCKERS.md` B1 with date sent and expected enablement window.

### R1 exit criteria

- All 6 services (SF, NS, AWS, Gmail, Chorus, PowerBI) have a verified connector-reality entry.
- Every Connector-Playbook rule is verified or corrected.
- NetSuite TBA request sent and tracked.
- Every "open risk" the architecture spec listed for connectors is resolved or escalated to BLOCKERS.

---

## R2 — Blind-spot & blocker discovery (adversarial feasibility pre-mortem on the tool itself)

**Mandate.** Red-team the build. *What would make this app fail to work, lose data, hallucinate, get throttled, or be unbuildable in this environment?* Verify every "open risk" the architecture team flagged against reality, and hunt for new ones.

### Verification of seeded blockers

Walk the `BLOCKERS.md` seeded register (B1-B16) item by item. For each:
- Verify the blocker exists in current reality (not just in the architecture spec's assumption space).
- Confirm severity is current (some may have downgraded; some upgraded).
- Confirm `Bites at` chapter is still correct given R0/R1 findings.
- Confirm mitigation is still viable; propose alternative if not.
- Mark each as `VERIFIED`, `DOWNGRADED`, `UPGRADED`, `MITIGATED`, or `NEW-EVIDENCE`.

### Critical-path external dependencies — go/no-go

- **NetSuite TBA (Brian).** Document expected timeline. Confirm Ch.8 acceptance criteria can be met without TBA (degrade to local model + AWS). If not, escalate.
- **PowerBI dataset shape.** R1 reads the poc; R2 confirms the shape is stable and that the integration interface contract in `docs/architecture/mcp.md` matches.
- **Max-window economics.** Verify Russell's actual Claude Max usage pattern (his Claude.ai + Cowork concurrent load). Confirm the ultraplan B4 mitigation: treat the 220K / 5-hr ceiling as ~180K; interactive runs strict-priority over scheduled; degrade-to-sequential under pressure. Verify Max can carry the expected load via web research on current rate limits + concrete throughput math at 10 agents × 8 playbooks × 5 jobs/day.
- **`maxBudgetUsd` / `total_cost_usd` semantics on Max.** Verify. If cost is non-metered on Max (likely), the cost meter is token-based not USD. Update spec accordingly.

### New-risk hunt

Adversarial agent ("what could go wrong that we haven't listed?") sweep across:
- macOS Sequoia / current-version quirks (Electron + Mac signing/notarization changes, App Sandbox interactions, `safeStorage` behavior, LaunchAgent quirks).
- Claude Agent SDK version drift (any breaking changes between draft date and now).
- Obsidian plugin landscape (Bases version, Dataview status, any new Drift / sync alternatives).
- Concurrent-write hazards beyond Obsidian: iCloud sync, Time Machine snapshots, Dropbox/Drive sync.
- better-sqlite3 + native module notarization entitlements (ultraplan B14).
- Renderer security: contextIsolation, nodeIntegration, preload script surface.
- Token-streaming protocols and partial-message handling current best practice.

### R2 outputs

1. **`BLOCKERS.md`** — fully populated, every item with status, severity (re-verified), `Bites at` chapter, mitigation, owner.
2. **`docs/research/R2-feasibility-notes.md`** — go/no-go notes per critical-path external. New-risk additions to BLOCKERS justified here.
3. **`docs/architecture/*.md`** updates folding R2 findings into the implementation contracts.

### R2 exit criteria

- Every BLOCKERS item has a verification status (`VERIFIED` / `DOWNGRADED` / `UPGRADED` / `MITIGATED` / `NEW-EVIDENCE`).
- Every critical-path external has an explicit go/no-go and a mitigation path.
- The "open risk" lists in the architecture docs are zeroed out (either verified or escalated to BLOCKERS).

---

## Phase R exit gate (into Chapter 0)

ALL of the following must be true:

- ☐ R0 Knowledge Inventory complete; every required read logged.
- ☐ R0 Constraints Ledger complete; every binding rule sourced.
- ☐ R0 Skill Inventory complete; brand-voice patterns extracted.
- ☐ R1 Connector-Reality Report complete; folded into `docs/architecture/mcp.md`.
- ☐ NetSuite TBA request sent to Brian; tracked.
- ☐ R2 BLOCKERS fully populated; every item statused.
- ☐ Every architecture-spec assumption either verified or flagged.
- ☐ The 10 additional Phase 0 decisions from `business-planning/C_Suite_CLAUDE.md` §2 each have an explicit recommendation with rationale in `docs/research/phase-r-decisions.md`.
- ☐ `docs/build-log.md` has a Phase R completion entry with token spend, decisions made, plan deltas, and learnings.

**If any criterion is unmet, /goal does not enter Chapter 0.** Per DOCTRINE law #1 (truth over completion appearance), an explicit "unmet — needs X" is correct; a glossed pass is failure.

---

## How `/goal` runs Phase R

1. **Read this document end to end.**
2. **Dispatch parallel research sub-agents** using the `dispatching-parallel-agents` skill. Recommended fan-out:
   - R0-Spine reader (the 11 operating-model files + memory).
   - R0-Vault inventorier (all artifact directories in parallel; one sub-agent per directory).
   - R0-Skills reader (the 8 brand-voice + 7 operating-logic skills).
   - R0-Code reader (`customer-dashboard-poc` + any auxiliary code).
   - R1-Connectors verifier (parallel per service: SF, NS, AWS, Gmail, Chorus, PowerBI).
   - R2-Adversarial pre-mortem (red-team agent on the build itself).
3. **Each sub-agent reports back with a structured summary** (file paths, citations, deltas, blocker candidates) — not raw transcripts. `/goal` integrates into the deliverables above.
4. **Update `docs/architecture/*.md` and `BLOCKERS.md`** based on findings. Update this plan via `docs/build-log.md` if a Phase R discovery invalidates a downstream chapter.
5. **Send the NetSuite TBA request to Brian** — earliest possible point in R1.
6. **Resolve the 10 additional Phase 0 decisions** (CLAUDE.md §2) — each as an entry in `docs/research/phase-r-decisions.md` with options-considered, recommendation, rationale.
7. **Check exit criteria.** Enter Chapter 0 only when all are met.

Russell does not gate Phase R completion. Per DOCTRINE law #1, `/goal` self-declares Phase R complete based on the criteria above and proceeds to Ch.0. If any decision in step 6 turns out to be a genuine product-shape fork (one that materially changes the V1 product), surface it via the `interactive-html-decisions` or `html-driven-codev` pattern; otherwise decide and log.
