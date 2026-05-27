# R0 Skill Inventory

> Phase R · R0-Skills sub-agent · 2026-05-26
> Source authority: `/Users/russellteter/Claude Code Projects/c-suite/business-planning/skills/*/SKILL.md` (full bodies). Installed stubs at `~/.claude/skills/*/SKILL.md` are truncated — see BLOCKER below.
>
> **Orchestrator note (2026-05-26):** R0-Skills sub-agent ran read-only and could not write files. This report content is the sub-agent's verbatim return; orchestrator wrote it to disk. Citations preserved as given.

---

## BLOCKER: Installed Skill Bodies Are Truncated

`scripts/install-extracted-skills.py` extracted skills from `~/Documents/Claude/Projects/Business Planning/_extracted_skills_for_c_suite.md` and wrote to `~/.claude/skills/`. The installed bodies are 15-29 lines each (header + first section only). Full bodies (168-232 lines) exist at `/Users/russellteter/Claude Code Projects/c-suite/business-planning/skills/`. All contract documentation below is sourced from the full-body versions.

**Impact:** If C-Suite invokes skills via the installed `~/.claude/skills/` path, the truncated stubs will fire without execution steps. Ch.10 scheduler must reference the `business-planning/skills/` path or reinstall from the source `.md`.

---

## Per-Skill Rows

### 1. weekly-cash-forecast

**Path:** `/Users/russellteter/Claude Code Projects/c-suite/business-planning/skills/weekly-cash-forecast/SKILL.md` (218 lines)
Installed stub: `~/.claude/skills/weekly-cash-forecast/SKILL.md` (29 lines — TRUNCATED)

**Purpose:** Single-command refresh of Class's authoritative weekly cash forecast using the May 10 baseline. Produces the W30 trough delta vs. prior week.

**Input contract:** Optional date-to-forecast (default 13 weeks) + optional scenario flag (`base` | `stress` | `recovery`).

**Output contract:** Structured cash report with: this week's trough ($, week, Wnn), prior week's trough, delta, drivers per connector (NS/AWS/SF/AP), tripwire status (GREEN/YELLOW/RED vs $250K board target). Writes position POS-003 if trough moves >5%.

**MCP / tool dependencies:**
- NetSuite SuiteQL via `mcp__c1f73cc9-916c-4b4e-b5fc-db2960d27602__ns_runCustomSuiteQL` (Cowork UUID — see mapping table)
- AWS Cost Explorer via `mcp__AWS_API_MCP_Server__call_aws` (Cowork MCP name)
- Salesforce SOQL (unnamed MCP in full body; uses standard SF MCP)
- Layers ON TOP OF `class-aws-connector` skill

**Slack-touching paths:** Line 201: "post results to 'Strategic Operating Dashboard' Cowork artifact" on scheduled Monday 6am run. PRD §6 defers Slack to V1.5+ — this path must be gated/disabled in V1.

**Codify-vs-invoke recommendation:** INVOKE AS SUBPROCESS for first 2 weeks. Then CODIFY: this is the highest-traffic Monday job and needs typed integration with C-Suite scheduler. NetSuite UUID must be remapped to `cashPositionQuery()` in `apps/utility/src/mcps/netsuite/queries.ts`.

**Known bugs:** Step 3 SOQL uses `StageName IN ('S4', 'S5') OR ForecastCategoryName IN ('Commit', 'Best Case')` — these stage labels do not exist in live org (BLOCKERS B7/B19). Must use verified labels: `Verbal Agreement`, `Verbal Approval`, `Contracting`, `Quote in Review`, `Negotiation` for new-biz; `Renewal Quote Sent` for renewal.

---

### 2. covenant-tracker

**Path:** `/Users/russellteter/Claude Code Projects/c-suite/business-planning/skills/covenant-tracker/SKILL.md` (184 lines)
Installed stub: `~/.claude/skills/covenant-tracker/SKILL.md` (25 lines — TRUNCATED)

**Purpose:** Live compliance check of Class's Barclays $30M facility covenants (leverage ratio, FCCR, liquidity, customer concentration) against NetSuite data. Returns GREEN/YELLOW/RED with days to next test date.

**Input contract:** None at invocation; reads memory files + NetSuite SuiteQL at runtime.

**Output contract:** Per-covenant tripwire report with current value, threshold, headroom, band classification, and composite worst-band. Writes to adversarial library + workstream WS-06.

**MCP / tool dependencies:**
- NetSuite SuiteQL (generic — skill body references `mcp__` for NS without specifying UUID in body; UUID `mcp__c1f73cc9-...` inferred from weekly-cash-forecast pattern)
- Salesforce SOQL for customer concentration pull
- Layers ON TOP OF `weekly-cash-forecast` skill

**Slack-touching paths:** None directly. Output goes to position/adversarial files.

**Codify-vs-invoke recommendation:** INVOKE AS SUBPROCESS initially. Covenant thresholds are ASSUMED not confirmed (facility terms not yet machine-readable per line 10-12). Cannot codify accurately until Russell/CFO confirms verbatim Barclays credit agreement terms (Day Zero gate).

**Status:** PARTIAL. Covenant thresholds all flagged [ASSUMED]. Composite output is directional, not compliance. Day Zero gate: CFO inputs verbatim terms from facility doc.

---

### 3. renewal-forecast

**Path:** `/Users/russellteter/Claude Code Projects/c-suite/business-planning/skills/renewal-forecast/SKILL.md` (232 lines)
Installed stub: `~/.claude/skills/renewal-forecast/SKILL.md` (25 lines — TRUNCATED, but line 6 has import-fix note)

**Purpose:** 90-day rolling renewal forecast with per-account risk scoring. Produces ranked risk list, NRR forecast, segment cuts, and recommended levers (exec sponsor / pricing / technical escalation / churn).

**Input contract:** None at invocation. Runs automatically on Sundays.

**Output contract:** Aggregate NRR forecast %, gross retention %, segment cuts by vertical/tier/CSM, ranked at-risk account table (account, ARR, close date, risk score 0-100, risk band, recommended lever). Writes stakeholder files and position updates.

**MCP / tool dependencies:**
- Salesforce SOQL — primary data source
- Chorus via `mcp__chorus__search_calls_by_participant` + `mcp__chorus__get_engagement_summary`
- NetSuite SuiteQL — billing history per account
- Note: `mcp__chorus__*` is a Cowork-era named MCP, not a UUID; see mapping table

**Slack-touching paths:** None directly in skill body.

**Known bugs (BLOCKERS B7):**
1. Step 1 SOQL uses `Opportunity.Owner.Name` (line 55-56) — surfaces terminated reps. The installed stub has a partial fix: "IMPORT FIX APPLIED: add `AND Owner.IsActive = TRUE`" but the full-body SOQL still has the unfixed query.
2. Step 1 SOQL uses stage labels `S4`, `S5`, `Commit`, `Best Case` — do not exist in live org (B19). Hard Rule line 222 still references "S4 + S5 + Commit/Best Case."
3. NRR formula uses `Account.Account_Vertical_Segment__c` (line 163) — field existence in live org UNKNOWN (not verified in R1). Use `Account.Account_Type__c` (verified present) or confirm with Russell.

**Codify-vs-invoke recommendation:** CODIFY into C-Suite module. High traffic (weekly Sunday job), two known SOQL bugs must be patched, and typed integration needed. Use corrected SOQL in §B7 section below.

---

### 4. call-intelligence

**Path:** `/Users/russellteter/Claude Code Projects/c-suite/business-planning/skills/call-intelligence/SKILL.md` (168 lines)
Installed stub: `~/.claude/skills/call-intelligence/SKILL.md` (18 lines — TRUNCATED)

**Purpose:** Extracts renewal risk, competitive intel, stakeholder dynamics, and action-item slippage from Chorus call data. Five invocation modes: account scan, weekly sweep, pre-1:1 prep, competitive monitoring, internal flight-risk scan.

**Input contract:** Mode 1 (account scan): account name or SF ID. Mode 2 (weekly sweep): no args — reads `stakeholders/customers-at-risk/` list. Modes 3/4/5: person name/email or no args.

**Output contract:** Structured signal block with: engagements analyzed, frequency trend, champion presence, late-cycle stakeholders, action-item slippage, competitive mentions, sentiment flags, composite call-signal score (0-100). Updates stakeholder files, adversarial library, intelligence spine.

**MCP / tool dependencies:**
- Chorus via `mcp__chorus__list_engagements`, `mcp__chorus__get_engagement`, `mcp__chorus__get_engagement_summary`, `mcp__chorus__list_users`, `mcp__chorus__get_user`, `mcp__chorus__search_calls_by_participant`
- Salesforce MCP for account/contact resolution
- Note: Chorus MCP uses named format (`mcp__chorus__*`), not a UUID format. B11: Chorus public v3 API exposes AI-generated summaries only — no raw utterance transcripts.

**Slack-touching paths:** None in skill body. Mode 2 writes to `_spine/intelligence/` files, not Slack.

**Codify-vs-invoke recommendation:** INVOKE AS SUBPROCESS for first 2 weeks (Chorus API was only activated 2026-05-21; behavior not yet well-characterized). Then CODIFY the weekly sweep (Mode 2) into a Ch.10 scheduled job. Modes 1/3/4/5 can remain as subprocess invocations.

---

### 5. run-critique

**Path:** `/Users/russellteter/Claude Code Projects/c-suite/business-planning/skills/run-critique/SKILL.md` (167 lines)
Installed stub: `~/.claude/skills/run-critique/SKILL.md` (68 lines — MOST COMPLETE of installed stubs)

**Purpose:** Agent observability layer. Auto-fires after every `/deep` run to score the investigation on five weighted dimensions and write a feedback memory. Proposes skill codification after 3+ same-pattern critiques.

**Input contract:** Implicit — reads investigation logs, lens memos, deliverables from prior `/deep` run. Manual invocation: `slug` of closed investigation.

**Output contract:** `run_critique_<slug>_<date>.md` feedback memory with scores table, composite score (weighted average), weakest-pass identification, one concrete improvement, pattern flag. Composite score surfaced to Russell only when <50 or explicitly asked.

**MCP / tool dependencies:** File reads only (Glob, Read). No connector calls.

**Slack-touching paths:** None.

**Codify-vs-invoke recommendation:** NOT codified into C-Suite module. This skill applies to the Cowork `/deep` investigation system, not to C-Suite's daily Synthesizer/Verifier pattern. However: the five-dimension rubric IS the schema for C-Suite's Run-Critic agent in Ch.4 (see Rubric section below).

**Five-dimension rubric (verbatim for runcritic.prompt.md):**

```
Dimension 1: Source rigor (weight 25%)
  Score 10 = every number tagged with connector + timestamp; every doctrine claim
             cited to the turnaround library by section; every stakeholder claim
             cited to a specific call/email/file.
  Score 1  = floating claims, hand-waved confidence, "according to industry
             research" with no citation.

Dimension 2: Lens balance (weight 20%)
  Score 10 = each lens produced a distinct, useful position; the reconciliation
             surfaced at least one real tension; no lens was a token paragraph.
  Score 1  = one lens drove the entire conclusion and the others were window dressing.

Dimension 3: Red-team sharpness (weight 20%)
  Score 10 = red team caught a specific named dependency, second-order effect,
             or fact-conflict that materially changed the position.
  Score 1  = red team raised generic concerns that didn't move anything.

Dimension 4: Deliverable usefulness (weight 20%)
  Default at run time: "deferred — assess in 7 days."
  Score 10 = Russell quoted from the deliverable in a real conversation, sent it
             forward, or it materially changed a decision.
  Score 1  = the deliverable was produced and never opened.

Dimension 5: Memory hygiene (weight 15%)
  Score 10 = every memory write had a source: field; positions went to positions/;
             facts went to MEMORY.md; conflicts properly superseded with audit trail.
  Score 1  = silent overwrites, missing sources, beliefs filed as facts.

Composite = weighted average.
90-100: gold standard. 75-89: solid, one improvement. 50-74: acceptable, one
dimension flagged. 0-49: weak; reflect on topic choice.
```

---

### 6. system-check

**Path:** `/Users/russellteter/Claude Code Projects/c-suite/business-planning/skills/system-check/SKILL.md` (184 lines)
Installed stub: `~/.claude/skills/system-check/SKILL.md` (15 lines — TRUNCATED)

**Purpose:** Diagnostic — verifies every load-bearing piece of the Strategic AI Operating Model (Cowork-era) is in place and operational. Returns GREEN/YELLOW/RED per check with remediation steps.

**Input contract:** None.

**Output contract:** 10-check consolidated report with per-connector health (GREEN/YELLOW/RED), scheduled-task status, Day Zero confirmation status. Dense/scannable, one screen when all green.

**MCP / tool dependencies:** Reads files, pings all 7 connectors (NetSuite, Salesforce, AWS class, AWS collab, Google Workspace Gmail, Google Workspace Drive, Slack, Chorus). Check 6 explicitly pings Slack (`slack_search_users`).

**Slack-touching paths:** Check 6 (connector health probe). PRD §6 defers Slack to V1.5+. C-Suite's equivalent `system-check` module must skip the Slack probe in V1 or degrade gracefully (YELLOW not RED if Slack unreachable).

**Codify-vs-invoke recommendation:** INVOKE AS SUBPROCESS. The Cowork-era system-check verifies Cowork artifacts (Business Planning files, Cowork spine) that don't exist in C-Suite. C-Suite needs its own health-check module that verifies: Electron app health, SQLite connectivity, MCP auth token freshness, scheduled-job registration, Vault write path. This is a separate Ch.8 deliverable, not a codification of this skill.

---

### 7. class-aws-connector

**Path:** `~/.claude/skills/class-aws-connector/SKILL.md` (34 lines — TRUNCATED)
Full body: not found in `business-planning/skills/` (only 6 operating-logic skills were installed via `install-extracted-skills.py`; class-aws-connector was extracted but the install script shows it separately).
References available: `~/.claude/skills/class-aws-connector/references/cash_model_context.md` (36 lines), `common_queries.md` (5 lines), `recovery.md` (5 lines).

**Purpose:** Operating guide for AWS CLI queries across two separate AWS orgs (Class product ~50 accounts, Collaborate ~15) via two SSO profiles (`class` / `collab`). Feeds AWS cost data into Cash Lever Model v5 sheets `05_AWS_Analysis` and `03_Cost_Levers`.

**Input contract:** Implicit from context (cost query type). AWS SSO tokens expire every ~12 hours.

**Output contract:** AWS Cost Explorer results (MTD spend by service, 90-day forecast). Data flows to specific named cells in `Class_Cash_Lever_Model_v5_2026-05-18.xlsx`.

**Key rule — class + collab profile sum:** Always sum `class` + `collab` profile results. Never report one org alone. Sources: `~/.claude/skills/class-aws-connector/SKILL.md` line 121 (full body line in weekly-cash-forecast): "Sum class + collab for any 'AWS spend' figure."

| Profile | SSO Portal | Billing Account ID | Role |
|---|---|---|---|
| `class` | `https://d-906761edcb.awsapps.com/start` | `783411846536` | `BillingAccess` |
| `collab` | `https://d-9067b2215a.awsapps.com/start` | `421879804649` | `Billing` |

**MCP / tool dependencies:** Local AWS CLI (`/opt/homebrew/bin/aws`). For C-Suite runtime, uses `mcp__AWS_API_MCP_Server__call_aws` (Cowork-era MCP; see mapping table).

**Slack-touching paths:** None.

**Codify-vs-invoke recommendation:** CODIFY into `apps/utility/src/mcps/aws/queries.ts` for C-Suite. The Electron utility process cannot pipe through Claude's MCP — it needs its own direct AWS SDK calls. Use AWS SDK v3 (`@aws-sdk/client-cost-explorer`) with SSO profile auth.

---

### 8. russell-voice

**Path:** `~/.claude/skills/russell-voice/SKILL.md` (125 lines) + references/phrases.md + references/structures.md + references/russell-lexicon.md

**Purpose:** Final-pass quality filter for all prose Russell produces. Strips AI writing patterns and produces spoken-word scripts for live presentations.

**Input contract:** Any prose draft. Applied AFTER brand skill (class-brand-voice, etc.).

**Output contract:** Revised prose conforming to voice rules. For prompt scripts: short-line formatted speaking script with stage directions.

**MCP / tool dependencies:** None.

**Slack-touching paths:** None.

**Codify-vs-invoke recommendation:** BAKE VERBATIM RULES into `apps/utility/src/prompts/synthesizer.prompt.md`. Do not invoke as subprocess for each synthesis — rules belong inline in the Synthesizer system prompt.

---

### 9. class-brand-voice

**Path:** `~/.claude/skills/class-brand-voice/SKILL.md` (138 lines) + references/terminology.md (119 lines) + references/anti-patterns.md (145 lines) + references/messaging-pillars.md (120 lines) + references/voice-examples.md (117 lines)

**Purpose:** Source of truth for all Class Technologies marketing content voice. Defines voice constants, tone flexes, terminology rules, messaging pillars, and anti-patterns.

**Input contract:** Any Class-facing content draft.

**Output contract:** Content conforming to brand voice. For `class-content-writer` and `class-content-qa` — primary reference.

**MCP / tool dependencies:** None.

**Slack-touching paths:** None.

**Codify-vs-invoke recommendation:** BAKE KEY RULES into `apps/utility/src/prompts/synthesizer.prompt.md` (company-facing content mode). Full reference files remain in skill directory for detailed QA runs.

---

### 10. class-brand-document

**Path:** `~/.claude/skills/class-brand-document/SKILL.md` (431 lines, complete)

**Purpose:** Creates Class-branded .docx and PDFs using python-docx. Provides complete typography hierarchy (Roboto/Roboto Light), color palette (Navy #0A1849, Purple #4739E7, Gold #FFBA00), table styles, and document templates.

**Input contract:** Content request for a Word document or PDF.

**Output contract:** `.docx` file following Class brand standards. Filename convention: `Class_[DocumentType]_[Topic]_[Date].docx`.

**MCP / tool dependencies:** Python `python-docx` library (local execution).

**Codify-vs-invoke recommendation:** INVOKE AS SUBPROCESS for Ch.9 Handoff brief when Cowork must produce .docx deliverables. Not a C-Suite core module. Referenced from Handoff brief generator.

---

### 11. class-brand-excel

**Path:** `~/.claude/skills/class-brand-excel/SKILL.md` (92 lines, complete)

**Purpose:** Creates Class-branded .xlsx spreadsheets using openpyxl. Covers financial reports, P&L, balance sheets, dashboards with Navy/Gold/Purple color system and Arial typography.

**Input contract:** Data + spreadsheet type request.

**Output contract:** `.xlsx` file following Class brand standards.

**MCP / tool dependencies:** Python `openpyxl` library (local execution).

**Codify-vs-invoke recommendation:** INVOKE AS SUBPROCESS for Ch.9 Handoff brief Excel deliverables. Not a C-Suite core module.

---

### 12. class-brand-presentations

**Path:** `~/.claude/skills/class-brand-presentations/SKILL.md` (452 lines, complete; v5.1-hybrid MDP formalization)

**Purpose:** Creates Class-branded PowerPoint decks using html2pptx pipeline. Enforces 15-atmospheric-background system, Inter typography universally, yellow-pill and glassmorphic-card signature techniques. 14-item brand QA checklist + bounded rework counters.

**Input contract:** Content brief for a presentation. Refuses non-Class brand requests.

**Output contract:** `output.pptx` + signature-elements report. Must pass S9 visual validation + S10 brand QA before delivery.

**MCP / tool dependencies:** Local html2pptx pipeline, soffice (for PDF render), pdftoppm (for JPEG inspect). pptxgen for native charts/tables.

**Codify-vs-invoke recommendation:** INVOKE AS SUBPROCESS for Ch.9 Handoff brief .pptx deliverables. Not a C-Suite core module.

---

## Verbatim Russell-Voice Rules (Drop-in for synthesizer.prompt.md)

Source: `~/.claude/skills/russell-voice/SKILL.md` lines 14-68 + reference files.

### Stop-Slop Foundation (8 rules)

1. Cut filler phrases. No throat-clearing openers, emphasis crutches, adverbs.
2. Break formulaic structures. No binary contrasts, negative listings, dramatic fragmentation, rhetorical setups, false agency.
3. Use active voice. Every sentence needs a human subject doing something. No passive constructions. No inanimate objects performing human actions.
4. Be specific. No vague declaratives. Name the thing. No lazy extremes doing vague work.
5. Put the reader in the room. "You" beats "People." No narrator-from-a-distance voice.
6. Vary rhythm. Mix sentence lengths. Two items beat three. End paragraphs differently. No em dashes.
7. Trust readers. State facts directly. Skip softening, justification, hand-holding.
8. Cut quotables. If it sounds like a pull-quote, rewrite it.

### Russell's Voice Layer (post-stop-slop)

**Contractions are mandatory.** "We would" → "We'd." "You all" stays as "you all." "It is" → "It's."

**Plain over corporate.** "up and running" not "operational." "handle" not "navigate challenges." "fits" not "aligns with." "works" not "functions." "talk" not "have a dialogue."

**Context before the ask.** Lead with the thing that matters, then ask. Never lead with "I'm reaching out because."

**Warm specificity.** Name the person, the company, the product, the metric.

**Softening without weakness.** "if there's any appetite on your end." "totally understand if now isn't the right time."

**Connector words:** "Anyway," "Either way," "So," (pivot), "that said," "on that note."

**Words Russell reaches for:** "appetite," "circle back," "low-lift," "forcing factors," "up and running," "framed around," "spotlight," "go-forward," "clean up," "the nature of."

**Words Russell avoids:** "Leverage," "synergy," "optimize," "holistic," "robust," "scalable," "ecosystem" (unless quoting), "empower," "cutting-edge," "innovative," "best-in-class," "world-class," "thought leader."

### Vocabulary Swap Table (from russell-lexicon.md)

| AI/Corporate Default | Russell Says |
|---|---|
| leverage / utilize | use |
| optimize | improve, tighten up |
| facilitate | help, run, set up |
| implement | roll out, set up, launch |
| operationalize | get running, put in place |
| operational | up and running |
| navigate challenges | handle, deal with, work through |
| align with | fits, matches, works with |
| functions as | works as, acts as |
| have a dialogue | talk, chat |
| at your earliest convenience | when you get a chance |
| comprehensive solution | [name what it does specifically] |
| innovative platform | [name it + what it does] |
| best-in-class | [cut or name specific advantage] |
| cutting-edge | [cut — just describe the thing] |
| empower | help, let, give [person] the ability to |
| holistic approach | [name the specific parts] |
| robust | solid, strong, thorough |
| scalable | [name the actual scale] |
| ecosystem | [name the actual pieces] |
| thought leader | [cut entirely] |

### Banned Structures (from structures.md — abbreviated)

- Binary contrasts: "Not because X. Because Y." → State Y directly.
- Negative listing: "Not a X... Not a Y... A Z." → State Z.
- Dramatic fragmentation: "[Noun]. That's it." → Complete sentences.
- Rhetorical setups: "What if [reframe]?" → Make the point.
- False agency: "the data tells us" → "I read the data and concluded."
- Passive voice: always find and name the actor.
- Sentence starters with What/When/Where/Which/Who/Why/How → restructure.
- Three-item lists → use two items.
- Em-dashes → remove; use commas or periods.

### Quick Checks Before Delivering

- Contractions used everywhere possible?
- Any sentence a real person wouldn't say out loud?
- Any adverbs? Kill them.
- Any passive voice? Find the actor.
- Inanimate thing doing a human verb? Name the person.
- Any "here's what/this/that" throat-clearing?
- Any "not X, it's Y" contrasts?
- Three consecutive same-length sentences?
- Em-dash anywhere? Remove.
- Does it sound like an email from a human being who has a job and knows you?

**Rule count: 8 stop-slop foundation rules + ~14 Russell-voice rules + ~21 vocabulary swaps + ~14 banned structures = 57 discrete rules.**

---

## Verbatim Class-Brand-Voice Rules (Drop-in for synthesizer.prompt.md)

Source: `~/.claude/skills/class-brand-voice/SKILL.md` lines 22-131 + references/terminology.md.

### Voice Constants (Never Change)

- **Credible:** Every major claim has a research citation, customer quote, or data point. Class demonstrates, not asserts.
- **Accessible:** Complex ideas explained in plain terms. Use contractions. Write like a person.
- **Practical:** Every section includes something the reader can act on.
- **Honest:** Class acknowledges real limitations of virtual training.
- **Consultant-Like:** Best practices first. Product second.
- **Outcome-Focused:** Features only matter in terms of what they enable.
- **Evidence-Driven:** Third-party research carries more weight than proprietary claims.
- **Measured:** Pragmatic optimism. Problems are solvable, not overnight.

### Core Positioning

"Meeting tools were built for meetings. Class was built for learning."

"Class adds a learning-centric layer to Zoom and Microsoft Teams."

### Terminology Rules (Critical)

**Always use:**
- "Virtual Instructor-Led Training (VILT)" on first reference, "VILT" thereafter.
- "Purpose-built" when differentiating from meeting tools.
- "Engagement" to mean measurable participation, not just attendance.
- "Built on Zoom and Teams" (not "integrates with").
- "Class sits inside Zoom and Teams" for Russell-voice contexts.
- "AI-native" not "AI-powered" (per brief; not found in SKILL.md — UNKNOWN, needs confirmation).

**Never use:** "Revolutionary," "cutting-edge," "game-changing," "next-level," "best-in-class," "synergy," "leverage" (as a verb), "holistic," "robust" (use "solid" or "thorough"), "ecosystem" (name the actual pieces), "innovative" (show it, don't label it), "empower" (sparingly).

**Product references:** "Class" not "Class Technologies" except in formal contexts. Features by outcome, not name: "monitor all breakout groups from one view" not "Bird's Eye View feature."

### Anti-Patterns (Never Do)

- No feature-dumping without outcome connections.
- No unsourced statistics or vague metrics.
- No aggressive sales language in educational content.
- No competitor bashing (position against "traditional meeting tools" as a category).
- No one-size-fits-all framing.
- No dismissing existing methods.
- No artificial urgency or fear-based messaging.
- No passive voice (find the actor).
- No AI writing patterns.

### How Class References Itself (4-step pattern)

1. Introduce a real problem the audience faces.
2. Explain universal best practices (platform-agnostic).
3. Show how Class enables those practices specifically.
4. Support with customer quote or data point.

**Rule count: 8 voice constants + 8 core terminology rules + 12 anti-patterns + 1 product-reference pattern = 29 discrete rules.**

---

## Run-Critique Rubric Dimensions (Drop-in for runcritic.prompt.md)

Source: `~/.claude/skills/run-critique/SKILL.md` lines 36-81 (installed stub, complete for this section) + full body at `/Users/russellteter/Claude Code Projects/c-suite/business-planning/skills/run-critique/SKILL.md` lines 36-81.

See §5 above for full verbatim text. Summary:

| Dimension | Weight | Score 10 anchor | Score 1 anchor |
|---|---|---|---|
| Source rigor | 25% | Every number cited with connector + timestamp | Floating claims, no citations |
| Lens balance | 20% | Each lens distinct; reconciliation surfaced tension | One lens dominated, others decorative |
| Red-team sharpness | 20% | Caught named dependency that changed the position | Generic concerns, nothing moved |
| Deliverable usefulness | 20% | Russell used it in a real decision or conversation | Produced and never opened |
| Memory hygiene | 15% | Every write has source:, positions vs facts properly sorted | Silent overwrites, beliefs filed as facts |

Composite score scale: 90-100 gold; 75-89 solid; 50-74 acceptable; 0-49 weak.

---

## Cowork-UUID → C-Suite Wrapper Mapping Table

Source: Full-body skill files in `/Users/russellteter/Claude Code Projects/c-suite/business-planning/skills/`.

| Skill | Cowork MCP call | Intent | C-Suite wrapper |
|---|---|---|---|
| weekly-cash-forecast | `mcp__c1f73cc9-916c-4b4e-b5fc-db2960d27602__ns_runCustomSuiteQL` | Run NetSuite SuiteQL | `apps/utility/src/mcps/netsuite/queries.ts cashPositionQuery()` |
| weekly-cash-forecast | `mcp__AWS_API_MCP_Server__call_aws` (aws ce get-cost-and-usage --profile class) | Pull AWS Cost Explorer MTD — Class org | `apps/utility/src/mcps/aws/queries.ts awsCostQuery({ profile: 'class' })` |
| weekly-cash-forecast | `mcp__AWS_API_MCP_Server__call_aws` (aws ce get-cost-and-usage --profile collab) | Pull AWS Cost Explorer MTD — Collab org | `apps/utility/src/mcps/aws/queries.ts awsCostQuery({ profile: 'collab' })` |
| call-intelligence | `mcp__chorus__list_engagements` | List Chorus engagements | `apps/utility/src/mcps/chorus/client.ts listEngagements()` |
| call-intelligence | `mcp__chorus__get_engagement` | Get single engagement | `apps/utility/src/mcps/chorus/client.ts getEngagement(id)` |
| call-intelligence | `mcp__chorus__get_engagement_summary` | Get AI summary | `apps/utility/src/mcps/chorus/client.ts getEngagementSummary(id)` |
| call-intelligence | `mcp__chorus__list_users` | List Chorus users | `apps/utility/src/mcps/chorus/client.ts listUsers()` |
| call-intelligence | `mcp__chorus__get_user` | Get Chorus user | `apps/utility/src/mcps/chorus/client.ts getUser(id)` |
| call-intelligence | `mcp__chorus__search_calls_by_participant` | Search by email | `apps/utility/src/mcps/chorus/client.ts searchCallsByParticipant(email)` |
| renewal-forecast | `mcp__chorus__search_calls_by_participant` | Same as above | Same as above |
| renewal-forecast | `mcp__chorus__get_engagement_summary` | Same as above | Same as above |
| covenant-tracker | NetSuite SuiteQL (no UUID specified in body; same as weekly-cash-forecast pattern) | Run NetSuite SuiteQL | Same as cashPositionQuery() |

**Row count: 12 mapping rows.**

Note: The installed `~/.claude/skills/` stubs did not contain the Cowork UUIDs — they were found only in the full-body files at `business-planning/skills/`. The Class Technologies NetSuite MCP (`mcp__claude_ai_Class_Technologies_NetSuite__*`) is the live C-Suite-compatible surface and maps to all NetSuite SuiteQL calls.

---

## B7 Patched SOQL

**Problem (BLOCKERS B7):** `renewal-forecast` skill Step 1 SOQL uses `Opportunity.Owner.Name` (line 55-56 of full body). R1 verified the correct field is `Account_Manager__c` (an Account-level reference field, not Opportunity.Owner). Additionally, `Renewal_Date__c` does not exist — the real field is `Renewal_Anniversary_Date__c` (Account-level).

**Source of bug:** `/Users/russellteter/Claude Code Projects/c-suite/business-planning/skills/renewal-forecast/SKILL.md` lines 41-62 (Step 1 SOQL).

**Corrected SOQL** (sourced from `docs/research/R1-connector-reality.md` lines 117-134 + `docs/architecture/mcp.md` lines 90-102):

```sql
-- Corrected renewal-forecast Step 1 SOQL
-- Replaces: Opportunity.Owner.Name → Account_Manager__r.Name (B7)
-- Replaces: Renewal_Date__c → Renewal_Anniversary_Date__c (B20)
-- Replaces: stage labels S4/S5 → live verified labels (B19)
SELECT
  Id,
  Name,
  Account_ID_18_Digit__c,
  Renewal_Anniversary_Date__c,
  Renewal_at_Risk__c,
  Customer_Health_Level__c,
  Customer_Health_Color__c,
  ARR__c,
  Current_ICP_Tier__c,
  Account_Type__c,
  Account_Manager__r.Name,
  Account_Manager__r.IsActive,
  CSM_Name__c,
  Number_of_Open_Renewal_Opportunities__c,
  PowerBI_Class_URL__c
FROM Account
WHERE Account_Manager__c != NULL
  AND Renewal_Anniversary_Date__c >= TODAY
  AND Renewal_Anniversary_Date__c <= NEXT_N_DAYS:90
ORDER BY Renewal_Anniversary_Date__c
```

**TypeScript typed-builder equivalent** (from `docs/architecture/mcp.md` lines 91-102):

```typescript
function renewalForecastQuery(opts: { windowMonths: number }) {
  return buildSoql({
    select: ['Id', 'Name', 'Account_ID_18_Digit__c',
             'Renewal_Anniversary_Date__c', 'Renewal_at_Risk__c',
             'Customer_Health_Level__c', 'Customer_Health_Color__c',
             'ARR__c', 'Current_ICP_Tier__c', 'Account_Type__c',
             'Account_Manager__r.Name', 'Account_Manager__r.IsActive',
             'CSM_Name__c', 'Number_of_Open_Renewal_Opportunities__c',
             'PowerBI_Class_URL__c'],
    from: 'Account',
    where: [
      whereNotNull('Account_Manager__c'),
      whereBetween('Renewal_Anniversary_Date__c',
        isoDateMonthsFromNow(0), isoDateMonthsFromNow(opts.windowMonths)),
    ],
    orderBy: 'Renewal_Anniversary_Date__c',
  });
}
```

**Remaining issue:** `Account.Account_Vertical_Segment__c` (used in renewal-forecast Step 7 for segment cuts) is not in the R1-verified field list. Use `Account.Account_Type__c` (verified: picklist, describes vertical segment) until `Account_Vertical_Segment__c` is confirmed in a SOQL describe call.

---

## Top Findings

1. **Installed skill stubs are truncated.** Six of 8 operating-logic skills installed to `~/.claude/skills/` contain only 15-29 lines (header + first section). Full bodies (168-232 lines) with SOQL, MCP calls, and execution steps are at `/Users/russellteter/Claude Code Projects/c-suite/business-planning/skills/`. Ch.10 scheduler must use the full-body path or reinstall correctly.

2. **Cowork UUID confirmed: `mcp__c1f73cc9-916c-4b4e-b5fc-db2960d27602__ns_runCustomSuiteQL`.** Found in `weekly-cash-forecast` full body line 28. Maps to `cashPositionQuery()` in the C-Suite typed NetSuite wrapper. The live C-Suite surface is `mcp__claude_ai_Class_Technologies_NetSuite__ns_runCustomSuiteQL` (already working per R1).

3. **B7 bug is in the full-body SOQL, not just the stub.** `renewal-forecast` Step 1 still queries `Opportunity.Owner.Name` and uses `S4`/`S5` stage labels. The corrected query (Account-level, `Account_Manager__r`, `Renewal_Anniversary_Date__c`) is documented above and in `docs/architecture/mcp.md` lines 91-102. This is a codify trigger — SOQL must be patched before Ch.10 Sunday job goes live.

4. **Slack-touching path found.** `weekly-cash-forecast` Step 7 (line 201, full body) posts results to "Strategic Operating Dashboard Cowork artifact" on scheduled Monday run. `system-check` Check 6 pings Slack. PRD §6 defers Slack to V1.5+ — both these paths must be gated/removed in V1 C-Suite.

5. **covenant-tracker is PARTIAL with all thresholds ASSUMED.** Facility terms (leverage ratio ≤4.5x, FCCR ≥1.10x, liquidity ≥$1.5M, concentration <50%) are all flagged [ASSUMED] in the skill body. No covenant compliance output is reliable until Russell or CFO locks the verbatim Barclays credit agreement terms. Day Zero gate required before Ch.7 tripwire playbook can go live.

6. **`mcp__chorus__*` is a named (not UUID) Cowork MCP.** 6 Chorus tool names documented in call-intelligence. B11 constraint: Chorus public v3 API provides AI-generated summaries only — no raw transcript access. Confidence cap on Chorus signal must be enforced in C-Suite's renewal-forecast codification.

7. **class-aws-connector `class` + `collab` sum rule is locked.** Both profiles must always be summed for any "AWS spend" figure. Profile names, SSO portal URLs, billing account IDs, and role names verified at `~/.claude/skills/class-aws-connector/SKILL.md` lines 18-26. C-Suite AWS module must enforce the sum constraint structurally.
