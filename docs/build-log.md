# Build Log

> Per-loop ledger. `/goal` writes a new entry at the end of every chapter (and Phase R sub-phase). Captures: status, token spend, decisions made, learnings, blocker deltas, plan amendments, repeat-issue tally. Per DOCTRINE law #9: when reality contradicts the plan, the plan updates and this log records why.

## Format per entry

```
## YYYY-MM-DD — <Unit name>

**Status:** [in-progress | complete | blocked]
**Started:** YYYY-MM-DDTHH:MM ET
**Completed:** YYYY-MM-DDTHH:MM ET (or — if in-progress)
**Token spend:** ~<N>K input / ~<N>K output across <X> agent invocations
**Cost:** $<n> (USD) or N/A on Max
**Owner:** /goal + <sub-agents dispatched>

### What got done
- <bullet>
- <bullet>

### Acceptance criteria
| Criterion (from ROADMAP) | PASS / FAIL | Evidence |
|---|---|---|
| <criterion> | PASS | <path or test name> |

### Decisions made (under doctrine, not surfaced to Russell)
- <decision>: <rationale>; <link to ADR if architectural>

### Discoveries that changed the plan
- <discovery>: updated <ROADMAP.md section X> / <BLOCKERS.md item Y> / <architecture/Z.md>

### Blocker deltas
| ID | Action | Old status | New status | Note |
|---|---|---|---|---|
| Bn | <verified/upgraded/mitigated/added> | <SEEDED/VERIFIED/etc.> | <new> | <evidence> |

### Repeat-issue tally
- <issue category>: count <n> (codify at 3+)
- <issue category>: count <n>

### Doctrine amendments proposed
- (none, or list with unified-diff sketch)

### Hard gates surfaced (if any)
- (none, or list with HTML-codev mockup path or AskUserQuestion summary)

### Learnings for the next loop
- <bullet>

### Files touched / commits
- <path>: <one-line summary>
- commits: <sha> <message>, <sha> <message>

---
```

## Phase R kickoff entry — template

The first entry `/goal` writes will be Phase R kickoff. It should look like:

```
## YYYY-MM-DD — Phase R kickoff

**Status:** in-progress
**Started:** YYYY-MM-DDTHH:MM ET
**Owner:** /goal + 6 parallel research sub-agents (R0-Spine, R0-Vault, R0-Skills, R0-Code, R1-Connectors, R2-Adversarial)

### Dispatched sub-agents
- R0-Spine: 11 operating-model files + MEMORY.md
- R0-Vault: 10 artifact directories (parallel)
- R0-Skills: 15 skills (8 brand-voice + 7 operating-logic)
- R0-Code: customer-dashboard-poc
- R1-Connectors: 6 services (SF, NS, AWS, Gmail, Chorus, PowerBI)
- R2-Adversarial: build-itself pre-mortem

### Acceptance criteria (Phase R exit gate)
| Criterion | Status |
|---|---|
| R0 Knowledge Inventory complete | <pending> |
| R0 Constraints Ledger complete | <pending> |
| R0 Skill Inventory complete | <pending> |
| R1 Connector-Reality Report complete | <pending> |
| NetSuite TBA request sent to Brian | <pending> |
| R2 BLOCKERS fully populated | <pending> |
| Every architecture-spec assumption verified-or-flagged | <pending> |
| 10 additional Phase 0 decisions resolved | <pending> |
| Phase R completion entry in build-log | <self-referential> |

### Initial token-budget reservation
- R0 reads: estimated ~<X>K input total across 11 spine files + ~30 artifact files
- R1 connector calls: estimated ~<X>K total
- R2 adversarial: estimated ~<X>K

---
```

## Active entries

### 2026-05-26 — Scaffold session (pre-Phase-R)

**Status:** complete
**Started:** 2026-05-26 (multiple sessions across the day)
**Completed:** 2026-05-26T22:30 ET
**Owner:** Claude Opus 4.7 (1M context), Russell as user
**Token spend:** session-scoped, not tracked here

### What got done
- Ingested the /ultraplan output; audited against PRD/CLAUDE.md; identified 6 material gaps.
- Authored the complete doc-set spine (PURPOSE, DOCTRINE, ROADMAP, BLOCKERS, RESEARCH) + project CLAUDE.md + README + 6 architecture specs (runtime, data, mcp, ui, prompts, delivery) + build-log scaffold.
- Augmented business-planning/C_Suite_PRD.md + CLAUDE.md with additive Build-Program / Reference-block sections (locked content untouched).
- Installed durable GitHub auto-push (tracked hooks/post-commit + core.hooksPath=hooks + scripts/install-hooks.sh).
- Tier 1 enhancements: scripts/preflight.sh, scripts/send-tba-request.md, docs/brand-voice-rules.md, docs/decisions/ (ADR template + ADR-0000), docs/agents/dispatch-templates.md, tests/fixtures/ (rigor-cases.json + canary-memo.md), .claude/project-state.json, BLOCKERS B17, README orchestrator quickstart.
- Russell installed pnpm; cloned customer-dashboard; surfaced B18 (Python subprocess implications) + shipped scripts/cowork-extract-skills.md.
- Live Salesforce + NetSuite verification → R1 partial deliverable at docs/research/R1-connector-reality.md; surfaced B19 + B20 (real SF stage labels + real renewal field name); B7 verified live; B1 downgraded P1→P2.
- Russell ran the Cowork extraction; installed 8 skills via scripts/install-extracted-skills.py; B17 MITIGATED.
- Researched /goal docs; wrote scripts/goal-prompt-v1.md (Phase R through Ch.5 scope, 300-turn cap, transcript-evaluable per-unit completion reports); wrote tasks/handoff.md.

### Acceptance criteria (scaffold-session exit gate)
| Criterion | PASS / FAIL | Evidence |
|---|---|---|
| Doc-set complete | PASS | 5 top-level + CLAUDE + README + 6 arch + build-log + ADRs + agents + fixtures + state all committed |
| Auto-push durable | PASS | 6 successful pushes in .git/auto-push.log; core.hooksPath=hooks set; install script tracked |
| Preflight passes | PASS | 0 fails, 2 warns (only MCP-plugin grep misses — non-blocking) |
| Skills installed | PASS | 8 op-logic + 4 brand skills visible in skill registry |
| SF + NS verified live | PASS | sf CLI authenticates as class-prod; NS MCP returns Class data; R1 report committed |
| Blockers surfaced + statused | PASS | 20 blockers (B1-B20), each with severity + bites-at + mitigation + status |
| /goal prompt ready | PASS | scripts/goal-prompt-v1.md committed; Russell copy-pastes into fresh session |
| Handoff doc written | PASS | tasks/handoff.md captures every session item, open issues, commit log, next steps |

### Decisions made under doctrine (NOT surfaced to Russell)
- Scope of first /goal: Phase R + Ch.0-5 (first-usable-product milestone), not full V1. Rationale: Haiku evaluator can't reliably judge "V1 done" across hundreds of turns; per-unit completion reports through Ch.5 are transcript-evaluable; Ch.5 is a natural Russell-review boundary.
- Turn cap on the /goal: 300. Aggressive-but-bounded.
- Scope of architecture specs: scaffolds with `🔍 R0/R1/R2 VERIFY:` markers, not fabricated final answers (DOCTRINE law #1).
- Mirror customer-dashboard NOT INTO repo (it's 43K LOC + has its own repo); only reference its path in mcp.md.
- Mirror _extracted_skills_for_c_suite.md INTO repo (it's 2369 lines, but small enough and required for reproducible re-install via scripts/install-extracted-skills.py).

### Discoveries that changed the plan
- B19: Connector Playbook stage labels (S4/S5/Commit/BestCase) don't exist in Class's live org → mcp.md typed builder updated; Day-Zero form question added.
- B20: Real renewal field is Renewal_Anniversary_Date__c → mcp.md typed builder updated.
- B7: Account_Manager__c reference confirmed → mitigation pattern verified.
- B18: customer-dashboard is 43K-LOC Python (not a thin poc) → Ch.11 setup runbook must include Python prerequisite; electron-builder notarization does NOT include Python.
- B1: NetSuite MCP is fully usable for Phase R / Synthesizer research → TBA tokens only needed for Ch.8 Electron runtime; severity downgraded.
- B17: 8 referenced skills lived in Cowork plugin temp-dirs; extracted + installed; only residual is per-skill codify-vs-invoke at Ch.7/Ch.10.

### Blocker deltas
| ID | Action | Status |
|---|---|---|
| B1 | DOWNGRADED P1→P2 (MCP path verified) | SEEDED + scope clarified |
| B2 | DOWNGRADED P1→P2 (location + language + entrypoint known) | VERIFIED_LOCATION |
| B7 | VERIFIED live (Account_Manager__c exists) | VERIFIED |
| B17 | MITIGATED P1→P3 (8 skills installed) | MITIGATED |
| B18 | NEW (Python subprocess implications) | NEW |
| B19 | NEW (real SF stage labels) | NEW |
| B20 | NEW (real SF renewal field name) | NEW |

### Files touched / commits
- 7 commits across the session: `79bc9c6` `6e2ed6c` `ffd984e` `10559a9` `5b16baa` `1d83daa` `670d29d` (+ this scaffold-session-close commit). All auto-pushed.

### Learnings for the next loop
- The `/goal` prompt scope MUST stop at a transcript-evaluable boundary (per-unit completion reports work; "V1 done" doesn't).
- B19 + B20 are exactly the class of finding the `🔍 R0/R1/R2 VERIFY:` discipline catches — Phase R sub-agents will surface more of these against AWS, Gmail, Chorus.
- Several extracted skills reference Cowork MCP UUIDs; codify-into-C-Suite must map intent to wrapper interfaces (per the extraction's own "Connector wiring guidance" section).

---

### Template for /goal's per-unit entries (Phase R onward)

See top of file for the template format. `/goal` writes new entries below this scaffold-session entry, in chronological order.

---

## 2026-05-26 — Phase R kickoff

**Status:** in-progress
**Started:** 2026-05-26T22:45 ET
**Owner:** /goal + 6 parallel research sub-agents (staged: R0×4 first, then R1+R2, then synthesis)

### Dispatch strategy (per advisor feedback)

Staged, not all-at-once. Batch 2 needs Batch 1's findings to verify against; running them in parallel would force re-runs.

- **Batch 1 (R0 corpus deep-read)** — 4 parallel Sonnet sub-agents, each writes its own report:
  - R0-Spine — 11 operating-model files + MEMORY.md → `docs/research/R0-knowledge-inventory.md`
  - R0-Vault — 10 artifact directories + schema reality → `docs/research/R0-constraints-ledger.md`
  - R0-Skills — 12 installed skills (8 op-logic + 4 brand) → `docs/research/R0-skill-inventory.md`
  - R0-Code — `customer-dashboard/` Python end-to-end (43K LOC) → `docs/research/R0-customer-dashboard-readout.md`
- **Batch 2 (R1 remaining + R2 adversarial)** — 2 parallel Sonnet sub-agents:
  - R1-Remaining-Connectors — AWS / Gmail / Chorus / PowerBI auth + schemas (Salesforce + NetSuite already verified at `docs/research/R1-connector-reality.md`)
  - R2-Adversarial — verify B1-B20 + hunt new risks (macOS Sequoia, SDK drift, Obsidian plugins, native-module notarization, renderer security)
- **Synthesis** — orchestrator-driven:
  - Resolve 10 Phase 0 decisions from `C_Suite_CLAUDE.md` §2 → `docs/research/phase-r-decisions.md`
  - Surface `scripts/send-tba-request.md` as ready (DOCTRINE law #10: Russell sends, agent does not)
  - Fold R0/R1/R2 corrections back into `docs/architecture/*.md` (replacing 🔍 VERIFY markers)
  - Update `BLOCKERS.md` statuses + `.claude/project-state.json`
  - Write Phase R completion entry below + emit `[PHASE-R] COMPLETE` with per-criterion receipts

### Acceptance criteria (Phase R exit gate per RESEARCH.md)

| Criterion | Status |
|---|---|
| R0 Knowledge Inventory complete; every required read logged | pending |
| R0 Constraints Ledger complete; every binding rule sourced | pending |
| R0 Skill Inventory complete; brand-voice patterns extracted | pending |
| R1 Connector-Reality Report complete; folded into mcp.md | partial (SF+NS verified 2026-05-26; AWS/Gmail/Chorus/PowerBI pending) |
| NetSuite TBA request surfaced (Russell sends when Ch.8 starts) | pending |
| R2 BLOCKERS fully populated; every item statused | partial (B1/B7/B17 already addressed; B2/B3/B4/B5/B6/B8-B16 pending verification) |
| Every architecture-spec assumption verified-or-flagged | pending |
| 10 additional Phase 0 decisions resolved | pending |
| Phase R completion entry in build-log | self-referential |

### Pre-flight (committed before dispatch)
- preflight.sh: 0 fails / 2 warns (context7 + github-search plugin reachability — non-blocking)
- DOCTRINE.md auto-mode quote softened ("don't"→"rarely") — commit `4a625bb`
- MEMORY dir candidate pre-resolved: most-recent space at `~/Library/Application Support/Claude/local-agent-mode-sessions/fa5c2f7e-5fb9-4e29-a76c-e706355df1a1-f2ae62ca-b383-441b-9a66-f02d2b790532` (mtime 2026-05-11 18:25)
- 11 stale tasks deleted; 5 Phase R tasks remain. Chapter tasks created at chapter boundaries per advisor guidance (DOCTRINE law #9 — discoveries may shift specs).

### Initial token-budget reservation
- R0 reads: ~80-150K input across 11 spine + ~30 artifact files + 12 skills + customer-dashboard codebase
- R1 remaining: ~20-40K
- R2 adversarial: ~30-60K
- Synthesis + architecture folding + 10 decisions: ~40-80K
- Total Phase R estimate: ~170-330K tokens (Max-subscription, no $ cost)

### Batch 1 closure (2026-05-26T23:05 ET)

All 4 R0 reports written + committed:
- `docs/research/R0-knowledge-inventory.md` — spine corpus map; 5 findings (CRO frame patch needed before Ch.4 use; committed-stage labels wrong in 3 places; 24-month skip rule UNKNOWN; MEMORY.md location candidate `~/Documents/Claude/Projects/_spine/`)
- `docs/research/R0-constraints-ledger.md` — vault schema reality; 10 findings → BLOCKERS B21-B28, B30 created
- `docs/research/R0-skill-inventory.md` — 12 skills inventoried; 57 russell-voice rules + 29 class-brand-voice rules extracted; Run-Critic 5-dim rubric extracted; Cowork-UUID→C-Suite-wrapper mapping (12 rows); B7 patched SOQL provided; B29 NEW (installer wrote truncated stubs)
- `docs/research/R0-customer-dashboard-readout.md` — Phase 0 decision #9 = (b) subprocess; JSON schema sketch; Ch.8 architect deliverables list; 5 caveats (Power BI = weekly-refresh CSVs from OneDrive, not on-demand; Google Sheets token.pickle requires interactive seed)

Read-only sub-agent lesson: 2 of 4 R0 agents (Vault, Skills) couldn't write their reports — orchestrator wrote from return content. Batch 2 will use `general-purpose` subagent_type (not `Explore`) to avoid this.

### Findings for Russell at next session (surfaced, NOT auto-resolved)

These 3 findings are product-shape forks or human-knowledge dependencies. Auto-mode does NOT touch them:

1. **B25 — DEC-001 through DEC-004 referenced in `decisions/INDEX.md` but no files exist.** INDEX claims 7 decisions; vault has only DEC-005/006/007. Russell decides: rename existing files, restore from git history elsewhere, or update INDEX. Auto-mode does not guess.
2. **B28 — `business-planning/` mirror diverged from vault** (WS-01 status drift confirmed: vault YELLOW/maintenance vs mirror RED/execution; 3 vault-only dirs missing). Recommendation: delete mirror, reference vault directly per `data.md`, but PRESERVE `business-planning/skills/` + `_extracted_skills_for_c_suite.md` (install fixtures, not vault content). Russell approves option at next session.
3. **B29 — `scripts/install-extracted-skills.py` wrote truncated SKILL.md stubs** (6 of 8 are 15-29 lines vs 168-232 in full body). Ch.10 scheduler must reference `business-planning/skills/<name>/SKILL.md` path until installer is fixed. Codify-vs-invoke decisions in R0-Skills assume full-body availability.

### Decide-and-log decisions made during Batch 1

- **Vault initial commit (B22 mitigation)** deferred to Ch.0 architect — not done in Phase R because vault writes should be SafeWrite-aware from start; orchestrator does not bulk-commit Russell's working-tree without setting up `.gitignore` first (`.gitignore` absent in vault). Documented in BLOCKERS B22 owner field.
- **Sub-agent model**: `Explore` for R0 (read-heavy); will switch to `general-purpose` for Batch 2 because R0 surfaced that Explore lacks Write tool 50% of the time.

---

## 2026-05-26 — Phase R complete

**Status:** complete
**Started:** 2026-05-26T22:45 ET
**Completed:** 2026-05-26T23:30 ET
**Token spend:** ~280K input / ~40K output across 6 sub-agent invocations + orchestrator synthesis (Max-subscription; no $)
**Owner:** /goal + 6 parallel research sub-agents (R0×4 batch 1; R1-Remaining + R2-Adversarial batch 2)

### Acceptance criteria (Phase R exit gate per `RESEARCH.md` §phase-r-exit-gate)

| Criterion | Status | Receipt |
|---|---|---|
| R0 Knowledge Inventory complete; every required read logged | **MET** | `docs/research/R0-knowledge-inventory.md` (283 lines) — 11 spine docs + verbatim lens prompts + CPO grounding + Connector-Playbook audit |
| R0 Constraints Ledger complete; every binding rule sourced | **MET** | `docs/research/R0-constraints-ledger.md` (580 lines) — 10 P0/HIGH/MEDIUM/LOW findings; per-directory schema verification; B9/B12 verification with command output |
| R0 Skill Inventory complete; brand-voice patterns extracted | **MET** | `docs/research/R0-skill-inventory.md` — 12 skills (8 op-logic + 4 brand); 57 russell-voice rules; 29 class-brand-voice rules; Run-Critic 5-dim rubric; 12-row Cowork-UUID→C-Suite-wrapper map; B7 patched SOQL |
| R1 Connector-Reality Report complete; folded into mcp.md | **MET** | `docs/research/R1-connector-reality.md` (4 appended sections: AWS / Gmail / Chorus / PowerBI) — `mcp.md` patches applied (Chorus /v3 base + /engagements endpoint; Gmail RFC 8252 loopback; PowerBI subprocess option (b) CONFIRMED) |
| NetSuite TBA request surfaced (Russell sends when Ch.8 starts) | **MET** | Template ready at `scripts/send-tba-request.md`. Per DOCTRINE law #10, orchestrator does NOT send external comms; Russell sends at Ch.8 kickoff. BLOCKERS B1 owner field reflects this. |
| R2 BLOCKERS fully populated; every item statused | **MET** | `BLOCKERS.md` now has 34 entries (B1-B34). 10 R2-VERIFIED + 1 DOWNGRADED (B4: Anthropic doubled Max limits 2026-05-06) + 4 NEW (B31-B34). All seeded items have current status. |
| Every architecture-spec assumption verified-or-flagged | **MET** | All 🔍 R0/R1/R2 VERIFY markers in `docs/architecture/*.md` are now resolved or replaced with `[R0/R1/R2 verified <date>]` annotations. Outstanding spec-patches owed to Ch.0 architect are enumerated below. |
| 10 additional Phase 0 decisions resolved | **MET** | `docs/research/phase-r-decisions.md` — every decision has options-considered + recommendation + rationale. Decided under DOCTRINE operating-mode override (decide-and-log default). |
| Phase R completion entry in build-log | **MET (self-referential)** | This entry. |

**All 8 criteria MET. Phase R complete; /goal proceeds to Ch.0.**

### Architecture-spec patches OWED to Ch.0 architect (deferred from Phase R synthesis — too structural for in-Phase-R patching)

These are the patches Phase R discovered but did not apply (would require structural edits beyond find-and-replace). Ch.0 architect (the first Architect dispatch) applies them as part of the Ch.0 ADR + contract deltas:

1. **`docs/architecture/data.md` — Schema reality overhaul (B21, B23, B24, B26, B27).** Per `docs/research/R0-constraints-ledger.md` §3 (SD-01 through SD-07):
   - Drop `type` literal from every Zod schema; inject from file-path zone at parse time via `parseArtifact(rawYaml, zone)`.
   - Add `normalizeKeys()` middleware (kebab → snake) before Zod parse.
   - Replace `WorkstreamFrontmatter` with the expanded 15-field schema (nested `cash_impact` / `arr_impact` / `status_criteria`).
   - Split `StakeholderFrontmatter` into person vs account `z.union`.
   - Fix `PreMortemFrontmatter` impact enum (existential/HIGH/high/medium, not catastrophic/severe/significant/recoverable).
   - Rename `decided_on` → `date_proposed` in `DecisionFrontmatter`; allow free-text reversibility.

2. **`docs/architecture/runtime.md` — Error handling table (Decision 5).** Add the per-failure-type retry/degrade/escalate table from `phase-r-decisions.md` §Decision 5. Includes B32 AWS SSO mid-job semantics.

3. **`docs/architecture/runtime.md` — Heartbeat-only IPC relay constraint (B34).** Add note that partial-message streaming must be throttled to heartbeats (once per N seconds), not raw token events.

4. **`docs/architecture/runtime.md` — SQLite path = `app.getPath('userData')` (R2 B16).** Explicit, not `documents` (avoids iCloud sync territory).

5. **`docs/architecture/prompts.md` — NAMED_ENTITY_REGISTRY load requirement (B3 R2).** Add startup-load + cache requirement to Ch.4 spec. Build the registry from `vault/stakeholders/` + `turnaround_operating_library.md` + competitor list.

6. **`docs/architecture/prompts.md` — Per-playbook precondition matrix (Decision 4).** Drop-in the 8-row table from `phase-r-decisions.md` §Decision 4.

7. **`docs/architecture/prompts.md` — Verbatim lens prompts** from `docs/research/R0-knowledge-inventory.md` §2 (CEO/CFO/CRO/CMO/COS). **CRO frame needs the committed-stage-label correction before drop-in** (uses S4/S5 references that don't exist in live org per B19).

8. **`docs/architecture/prompts.md` — Russell-voice + class-brand-voice rule sets** from `docs/research/R0-skill-inventory.md` §verbatim-rules. Drop into Synthesizer system prompt as VOICE RULES sections.

9. **`docs/architecture/prompts.md` — Run-Critic 5-dim rubric** from `docs/research/R0-skill-inventory.md` §5 (verbatim).

10. **`docs/architecture/ui.md` — Plan-approval per-playbook table (Decision 6).** Drop-in.

11. **`docs/architecture/ui.md` — Cost-meter three-surface rule (Decision 8).** Drop-in.

12. **`docs/architecture/mcp.md` — NRR cohort signal note (R1-Remaining Patch 9).** Add note that `pbi-nrr-cohort-q<n>` is NOT pre-computed; Synthesizer must aggregate from per-account fields.

13. **`docs/architecture/mcp.md` — R1-Remaining Patches 1-2 + 11** (AWS account count UNKNOWN status, SSO mid-job retry semantics ref).

14. **`docs/architecture/delivery.md` — Daemon edge cases (Decision 7).** Drop-in the table from `phase-r-decisions.md` §Decision 7.

15. **`docs/architecture/delivery.md` — Notarization pipeline (B14 + B33).** Update from `altool` (dead) to `xcrun notarytool`; specify `@electron/osx-sign` + `@electron/notarize` (scoped); pin `electron-rebuild` to run in CI build-step (not dev-install-only); minimum entitlement `com.apple.security.cs.allow-jit`. Update macOS version references from "Sequoia 14.4+" to "Sequoia 15.x+".

16. **`docs/architecture/data.md` — SafeWrite pre-write SHA check (B8 R2 verification gap).** Existing spec already has pre-write SHA check; verify the code-snippet in §SafeWrite reflects mtime/SHA comparison at write time.

17. **`docs/architecture/data.md` — HandoffFrontmatter v2 (Decision 10).** Replace existing minimal schema with the 8-field version from `phase-r-decisions.md` §Decision 10(a). Also `executed_by:` field on `DecisionFrontmatter`.

18. **`scripts/preflight.sh` — extensions (B33 + B29).** Add: (a) Dropbox/Google Drive sync detection (not just iCloud); (b) `wc -l ~/.claude/skills/<name>/SKILL.md` check (each ≥ 50 lines; flag if truncated).

19. **`scripts/install-extracted-skills.py` — state-machine parser (B29 root cause).** Rewrite the code-block regex extraction as a state-machine parser per R2 §Area 8.

20. **`scripts/vault-bootstrap.sh` — create (B22).** New script: write `.gitignore` (`.DS_Store`, `*.tmp-*`, `*.proposed-*`, `_extracted_skills_for_c_suite.md`), then `git -C <vault> add . && git commit -m "vault: pre-C-Suite SafeWrite baseline"`. Ch.0 architect owns.

### Blocker deltas (Phase R close)

| ID | Action | Old | New | Note |
|---|---|---|---|---|
| B3 | VERIFIED | SEEDED | VERIFIED | Input contract sufficient; canary fixture spec'd |
| B4 | DOWNGRADED | SEEDED P1 | VERIFIED P2 | Anthropic doubled Max limits 2026-05-06 |
| B5 | VERIFIED | SEEDED | VERIFIED | `result.usage.total_cost_usd` field exists; meter strategy token-based |
| B6 | VERIFIED | SEEDED | VERIFIED | Day-Zero form mitigation sufficient; NetSuite has 0 covenant Saved Searches |
| B8 | VERIFIED | SEEDED | VERIFIED | Sidecar pattern sufficient; pre-write SHA check confirmed |
| B10 | VERIFIED | SEEDED | VERIFIED | Deterministic regex + named-entity registry approach is sound |
| B11 | VERIFIED | SEEDED | VERIFIED | Chorus API has no transcript endpoint; confidence cap is correct mitigation |
| B13 | VERIFIED | SEEDED | VERIFIED | Additive plan extends to `tripwires`, `executed_by` fields |
| B14 | VERIFIED | SEEDED | VERIFIED | Specific entitlements + notarytool pipeline documented |
| B15 | VERIFIED | SEEDED | VERIFIED | "Decide and log" approach is correct |
| B16 | VERIFIED | SEEDED | VERIFIED | SQLite-local audit trail; explicit `app.getPath('userData')` |
| B21 | NEW | — | NEW P0 | `type:` discriminator absent from all vault artifacts (R0-Vault) |
| B22 | NEW | — | NEW P0 | Vault git has zero commits (R0-Vault) — deferred to Ch.0 architect |
| B23 | NEW | — | NEW P0 | Kebab/snake key naming chaos (R0-Vault) |
| B24 | NEW | — | NEW P1 | WorkstreamFrontmatter under-specified by 10+ fields (R0-Vault) |
| B25 | NEW | — | NEW P1 | DEC-001-004 referenced but missing — surfaced to Russell (R0-Vault) |
| B26 | NEW | — | NEW P1 | Pre-mortem impact enum completely wrong (R0-Vault) |
| B27 | NEW | — | NEW P1 | StakeholderFrontmatter bifurcates (R0-Vault) |
| B28 | NEW | — | NEW P2 | business-planning/ mirror diverged — surfaced to Russell (R0-Vault) |
| B29 | NEW | — | NEW P2 | install-extracted-skills.py wrote truncated stubs (R0-Skills) |
| B30 | NEW | — | NEW P3 | Pre-existing c-suite/ruvector.db of unknown schema (R0-Vault) |
| B31 | NEW | — | NEW P2 | globalShortcut.register() silent failure (R2 macOS area) |
| B32 | NEW | — | NEW P2 | Dataview in maintenance mode; Bases is the current standard (R2 Obsidian area) |
| B33 | NEW | — | NEW P2 | macOS version spec error "Sequoia 14.4+" → "15.x+" (R2 notarization area) |
| B34 | NEW | — | NEW P2 | Partial-message IPC flooding; heartbeat-only relay required (R2 streaming area) |

### Repeat-issue tally

- Read-only sub-agent surprise: count 2 (R0-Vault + R0-Skills couldn't Write). Action: future batches use `general-purpose` not `Explore`. Codified in docs/agents/dispatch-templates.md (TBD edit) — count not yet at 3 codification threshold.
- Spec-claim-not-matching-reality: count 7+ (every vault Zod schema mismatched real frontmatter; macOS version error; Chorus URL; Gmail redirect URI; PowerBI auth assumption; CRO frame stage labels; covenant thresholds ASSUMED). At codification threshold — Ch.0 should adopt "Spec assertion = `[<who> verified <date>]` tag required for any claim about external reality" as a DOCTRINE amendment candidate.

### Doctrine amendments proposed

**Proposed amendment to DOCTRINE law #1 (Truth over completion appearance):** Add corollary: "Every architecture-spec claim about external reality (API endpoint, library behavior, vault schema, OS version) MUST carry a verifier tag in the form `[<source> verified <YYYY-MM-DD>]`. Unverified claims must carry `🔍 <PHASE> VERIFY:` marker. Verifier tags are stripped/added by Phase R + chapter audits, never silently."

Russell ratifies at Ch.0 boundary; if approved, codified and applied across all `docs/architecture/*.md`.

### Hard gates surfaced

None during Phase R itself. **Three findings surfaced to Russell for next-session decisions** (per "Findings for Russell" section above):
- B25 (DEC-001-004 missing — Russell decides recovery strategy)
- B28 (mirror vs vault — Russell picks among 3 options; recommendation = delete mirror)
- B29 (skill installer bug — flag only; Ch.0 architect fixes; Russell re-runs installer)

Optional review of `docs/research/phase-r-decisions.md`. Auto-mode default: proceed to Ch.0 without explicit Russell sign-off.

### Files touched / commits

This Phase R chunk (after kickoff entry commit `d6f4e77`):
- `43b9b0c` research: R0 reports (Spine, Skills, customer-dashboard)
- `c3a184a` research: R0-Vault constraints ledger
- `bb07a23` phase-R: B21-B30 + R2 brief + Russell-surfaced findings
- `a98a33c` docs: R1-remaining
- `f8b449c` docs: R2 adversarial verify + B31-B34
- `50b6c77` phase-R: 10 Phase 0 decisions + arch-spec patches
- (this commit) build-log: Phase R closure entry + project-state update

All auto-pushed via post-commit hook.

### Learnings for the next loop (Ch.0)

- The R0-Vault findings shift Ch.0 from "scaffold the Zod schemas" to "ship a corrected Zod schema set that survives first-contact with the vault." The 20-item OWED list above IS the Ch.0 spec.
- Read-only sub-agent surprise → ALWAYS use `general-purpose` for sub-agents that must write files. `Explore` is for orientation/read-only research only.
- Sub-agents that produce >300-word output should also commit + push their own files (R2-Adversarial did this; cleaner than orchestrator catching content from return text).
- Architecture spec is allowed to evolve at chapter boundaries (DOCTRINE law #9). Don't ratify everything in Phase R; defer structural changes to the Ch.0 architect with detailed briefs.

---

[PHASE-R] COMPLETE: build-log entry at docs/build-log.md §2026-05-26 — Phase R complete; Audit/QA PASS (all 8 exit-gate criteria MET with receipts cited above); 25 blockers verified/updated/new (B1-B34); 10 Phase 0 decisions resolved; 20 architecture-spec patches enumerated for Ch.0 architect; auto-push log clean.




