---
name: class-strategic-ai
description: Russell Teter's Strategic AI Operating Model for the Class Technologies turnaround. Invokes a recursive, multi-C-level (CEO/CFO/CRO/CMO/Chief-of-Staff) deep-investigation loop with autonomous data access, memory compounding, and self-improvement. Trigger when Russell asks for a multi-perspective analysis on any Class business question, or when he uses one of the invocation prefixes: "/deep", "/quick", "/continue", "/post-mortem", or "Run Day One bootstrap". Also trigger when Russell mentions "deep investigation", "multi-lens analysis", "C-level perspective", "strategic deep dive", "from every angle", "stress test this", "red team", or any variation implying multi-perspective rigorous analysis on a Class strategic question. Even when the request sounds simple ("what should I do about July?") — if it's a real strategic question, invoke this skill. Layers ON TOP of class-brand-voice, russell-voice, class-brand-presentations, class-brand-excel, and the full connector playbook.
---

# class-strategic-ai

This skill operationalizes the Strategic AI Operating Model defined in `/Users/russellteter/Documents/Claude/Projects/Business Planning/Strategic_AI_Operating_Model.md`. It is the orchestration engine that turns Claude Cowork into a permanent multi-C-level operating partner for Russell during the Class Technologies turnaround.

## Required reading (in order)

Before executing any mode, Claude reads these documents:

**v1 constitution and operating manuals:**
1. `/Users/russellteter/Documents/Claude/Projects/Business Planning/Strategic_AI_Operating_Model.md` — v1 constitution
2. `/Users/russellteter/Documents/Claude/Projects/Business Planning/Strategic_AI_Invocation_Guide.md` — prompt templates and operational playbook
3. `/Users/russellteter/Documents/Claude/Projects/Business Planning/Strategic_AI_Connector_Playbook.md` — autonomous data routing rules
4. `/Users/russellteter/Documents/Claude/Projects/Business Planning/Strategic_AI_Stack_Inventory.md` — what capability serves which lens
5. `/Users/russellteter/Documents/Claude/Projects/Business Planning/Strategic_AI_Knowledge_Base_Audit.md` — what Claude already knows

**v2 hardening layers:**
6. `/Users/russellteter/Documents/Claude/Projects/Business Planning/Strategic_AI_Operating_Model_v2.md` — v2 extension constitution (read after v1)
7. `/Users/russellteter/Documents/Claude/Projects/Business Planning/Strategic_AI_Cross_Claude_Spine.md` — cross-Claude knowledge spine + continuous ingestion
8. `/Users/russellteter/Documents/Claude/Projects/Business Planning/turnaround_operating_library.md` — expert frameworks Claude draws on (Grove, Helmer, McKinsey, Hastings, edtech-specific patterns)
9. `/Users/russellteter/Documents/Claude/Projects/Business Planning/Strategic_AI_Conviction_Backbone.md` — Position Library + Decision Log + Calibration Tracker + Pre-Mortem Library
10. `/Users/russellteter/Documents/Claude/Projects/Business Planning/Strategic_AI_Stakeholder_Workstream_Adversarial.md` — stakeholder models + 12 workstreams + adversarial library

**Live state:**
11. `MEMORY.md` and every linked memory file — persistent base
12. `_spine/INVENTORY.md` (cross-Claude master index) — once spine is bootstrapped
13. `positions/README.md`, `decisions/INDEX.md`, `pre-mortems/INDEX.md`, `stakeholders/INDEX.md`, `workstreams/DASHBOARD.md`, `adversarial/INDEX.md`, `calibration/SCORECARD.md` — current state of conviction backbone + situation layers

After reading those, execute the requested mode.

## Modes (full text in `Strategic_AI_Invocation_Guide.md`)

**Important: do NOT require leading-slash syntax. Cowork's UI interprets a leading `/` as a literal skill-name lookup. Use natural-language triggers. Full mapping in SESSION_START_PROTOCOL.md §5.**

v1 modes (natural-language triggers):
- **"Run Day One bootstrap…"** — one-time anchor sequence; v2 extends this (see `Strategic_AI_Operating_Model_v2.md` §7).
- **"Run a deep investigation on [topic]"** — full 5-pass loop. v2: Pass 1 also reads relevant workstream + stakeholder + adversarial files. Pass 2 has mandatory cross-front check. Pass 3 draws from adversarial library. Pass 4 tunes delivery to stakeholder. Pass 5 updates stakeholder last_known_status and workstream next_milestone.
- **"Quick take on [topic]"** — Pass 1 (light) + Pass 2 only. 2-3 minutes.
- **"Continue the investigation on [topic-slug]"** — next round on existing investigation log.
- **"Run a post-mortem on [topic-slug]"** — self-improvement loop.
- **Scheduled** — recurring runs.

v2 added modes:
- **"Audit the position library"** — monthly Position Library audit.
- **"Run the tripwire scan"** — financial-tripwire scan against current data. Auto-runs Monday 6am.
- **"Refresh the stakeholder model for [name]"** — weekly activity refresh against a single stakeholder.

v2.1 added custom skills (in `skills/`):
- **weekly-cash-forecast** — refresh the W30 trough from NetSuite + AWS + Salesforce; update Cash Lever Model v5 sheet `07_Weekly_Engine`. Auto-runs Monday 6am.
- **covenant-tracker** — Barclays facility compliance check vs live data. Auto-runs Monday 6am. (Activation requires CFO to lock the actual covenant terms.)
- **renewal-forecast** — 90-day renewal book with per-account risk scoring (SF + Chorus + NS). Auto-runs Sundays.
- **call-intelligence** — Chorus signal extraction for at-risk accounts, internal 1:1 prep, competitor mentions, internal flight risk. Auto-runs Sunday 6pm.
- **run-critique** — agent observability. Auto-fires after every `/deep` to score the run on five dimensions and propose improvements. Quarterly meta-critique looks for patterns.

v2.1 added connectors:
- **Chorus.ai** (connected 2026-05-21) — `mcp__chorus__*`. Renewal-risk signal lives here. See Connector Playbook §18.

## The five C-level lenses

Every Pass 2 fans out five parallel subagents via the `Agent` tool. Each receives the identical context bundle plus a persona-specific frame:

- **CEO** — board narrative, strategic optionality, covenants, the 1-2 decisions only the CEO makes
- **CFO** — cash, runway, working capital, covenants, unit economics; quantify everything; North star is the W30 trough at $111,766 on July 26 2026
- **CRO** — pipeline, retention, renewal risk, ARR cliff $35.85M → $20.57M; name specific accounts
- **CMO** — brand, perception, internal/external comms during a crisis
- **Chief of Staff** — execution sequencing, decision rights, political dynamics with Chasen, dropped-ball risk

Each subagent returns: Position / Top 3 risks / What this lens needs from the others / Quantitative anchor / Decision-rights question. Caps: 5 tool calls per lens subagent.

Reconciliation in main thread: Convergent Core → Live Tensions → Blind Spots → Three Crisp Options. Never average lenses — surface real disagreements explicitly.

## Red-Team / Steelman (Pass 3)

Two parallel subagents.

**Red-Team prompt:** "Break the attached position. Find dependencies that may not hold, second-order effects on customers/employees/vendors/covenants, contradicting facts, execution gotchas. Be specific — name the vendor, customer, clause. Return top 5 attack vectors ranked by severity with evidence chain. Cap: 8 tool calls."

**Steelman prompt:** "Construct the strongest alternative path. Don't strawman — make the most defensible opposite. Return: alternative path, why a smart counterpart would prefer it, conditions under which it beats the current position. Cap: 5 tool calls."

Resolution in main thread: accept / acknowledge / reject with reasoning. Rejected findings still log to `investigations/<slug>/rejected_critiques.md`.

## Deliverable production (Pass 4)

Heuristics for format selection:
- Cash topic → Cash Lever Model row + 1-pager
- People topic → memo + Slack draft + (if external) Gmail draft
- Board topic → slide + speaker notes + Chasen cover
- Customer topic → exec-sponsor email + account plan + SF task creation
- Vendor topic → vendor email + contract clause analysis

Skill routing:
- Slides → `class-brand-presentations` or `forecast-deck-creator`
- Memos → `class-brand-document` + `docx`
- Sheets → `class-brand-excel` + `xlsx`
- All prose → final pass through `russell-voice`
- External Class comms → `class-brand-voice` + `marketing:brand-review`

Files land in `Business Planning/deliverables/<YYYY-MM-DD>_<slug>/`. Present via `mcp__cowork__present_files`.

## Position / Decision / Prediction writes (Pass 5, v2)

**Positions** (beliefs) get written to `positions/active/POS-NNN-slug.md`. NOT to `memory/`. Every Pass 2 lens that takes a stance writes one. Schema in `Strategic_AI_Conviction_Backbone.md`.

**Decisions** get drafted in `decisions/DEC-NNN-slug.md` with status `proposed`. Russell accepts/modifies/rejects.

**Predictions** spawn from positions with forward measurable claims. Live in `calibration/predictions/PRED-NNN-slug.md`.

**Memories** (facts, references, user, feedback) still get written under the existing typology, per `MEMORY.md`.

## Memory write rules (Pass 5)

Hard rule: every project or reference memory write requires a `source:` field. No source → memory not written; finding goes to investigation log only.

Memory template:
```markdown
---
name: <slug>
description: <one-line for the index>
metadata:
  type: project | reference | feedback | user
  source: <file path | NS SuiteQL | SF SOQL | URL | transcript ID>
  written: 2026-MM-DD
  needs-verification: <empty if fully sourced>
---

<one-paragraph fact or decision>

**Why:** <motivation>
**How to apply:** <when/where this shapes future behavior>
```

Conflict reconciliation: latest-wins with explicit `supersedes:` field on new file and `superseded-by:` header on old. Old file NOT deleted.

After memory writes, update `MEMORY.md` index. Optionally schedule follow-up via `mcp__scheduled-tasks__create_scheduled_task`.

## Connector routing (full table in `Strategic_AI_Connector_Playbook.md`)

Quick decision tree:
- Cash → Cash Lever Model FIRST, then NS, then AWS, then SF
- Customer/pipeline/renewal → Salesforce FIRST
- People/payroll → Local files (GTM roster + severance policy); NEVER NetSuite for per-employee
- AWS → Both profiles (class + collab), always summed
- Competitor/market → WebSearch + Brightdata + Daloopa
- "What did X say" → Slack + Gmail in parallel
- "Catch me up" → Calendar + Gmail + Slack + Tasks last 7d
- Board/Barclays → Memory + Drive + NS + Gmail
- Restricted cash → Memory + NS + Barclays portal via Chrome

Always parallelize independent calls. Always cite sources on every number.

## Self-improvement loops

1. **Post-run critique** — after every `/deep`, a critique subagent audits and writes `run_critique_<topic>_<date>.md` feedback memory.
2. **Skill codification** — when a pattern repeats across 3+ investigations, invoke `skill-creator` to codify it.
3. **Gap verification** — any memory with `[needs-verification: <what>]` tag gets added to next bootstrap's to-do list. Stale memories (>30 days) auto-flag.

## Guardrails

- Context bloat → bootstrap and file-heavy work happens in subagents; only distilled output returns
- Hallucinations → no source = no memory write
- Conflicts → latest-wins with audit trail preserved
- Subagent runaway → tool-call caps in every spawn prompt
- Wrong lens dominates → pre-output check requires all 5 lenses cited + at least one tension surfaced
- Stale memory → auto-flagged on read
- Connector outage → explicit caveat in synthesis; never silently substitute
- Voice drift → all prose routes through `russell-voice` or `class-brand-voice`
- Financial moves → Claude does NOT execute trades, payments, or transfers; all money decisions surface to Russell

## What a good /deep run produces

- Updated `investigations/<slug>.md` with the round's entry
- 5 lens memos in `investigations/<slug>/pass2_<lens>.md`
- A challenges document in `investigations/<slug>/pass3_challenges.md`
- 1-3 deliverable files in `deliverables/<date>_<slug>/`
- 1-5 new or updated memory files (each with sources)
- 0-3 scheduled follow-up tasks
- A 5-bullet summary to Russell with file links

## Recommended next installations (when Russell asks "what should I install next")

1. Rippling/Gusto payroll MCP — closes NS payroll blind spot; lets severance be modeled live
2. Mercury or Barclays-direct bank MCP — reconciles restricted cash live
3. Gong/Chorus MCP — converts CRO from reactive to proactive
4. Ramp/Bill.com spend-management MCP — AP visibility into cash lever model
5. Custom skills via `skill-creator`: `weekly-cash-forecast`, `covenant-tracker`, `renewal-forecast`
