# Custom Skills Index

**Purpose:** Catalog of the custom skills authored for Class's Strategic AI Operating Model. Each skill lives in its own subfolder with a SKILL.md. Read the relevant SKILL.md when Russell's request matches a trigger phrase or describes the work the skill does.

Updated: 2026-05-21
Active skills: 6

## Skills

### weekly-cash-forecast
**Path:** `weekly-cash-forecast/SKILL.md`
**What it does:** Refresh Class's weekly cash forecast. Pulls NS (cash + AR + AP) + AWS (class + collab summed) + SF (committed pipeline + renewals) in parallel; reconciles against Cash Lever Model v5 sheet `07_Weekly_Engine`; reports W30 trough delta.
**Triggers:** "refresh the cash forecast", "weekly cash refresh", "what's the W30 trough this week", "update the cash model", any current-cash-position question
**Schedule:** Auto-runs Monday 6am ET
**Status:** ACTIVE
**Layers on:** class-aws-connector, NetSuite MCP, Salesforce MCP

### covenant-tracker
**Path:** `covenant-tracker/SKILL.md`
**What it does:** Tracks Class's Barclays facility covenants against live NS data. Four covenants (leverage, FCCR, liquidity, customer concentration). GREEN/YELLOW/RED/BREACH bands.
**Triggers:** "covenant check", "are we within covenants", "tripwire scan", "Barclays covenant status", "FCCR", "leverage ratio"
**Schedule:** Auto-runs Monday 6am ET
**Status:** PARTIAL — facility thresholds ASSUMED until CFO inputs verbatim covenant definitions from credit agreement
**Layers on:** NetSuite MCP, weekly-cash-forecast skill

### renewal-forecast
**Path:** `renewal-forecast/SKILL.md`
**What it does:** 90-day renewal book with per-account risk scoring tuned to Class NRR definition. Eight-signal composite score. Segment cuts by `Account_Vertical_Segment__c` (Intl HED watch).
**Triggers:** "renewal forecast", "renewals at risk", "what's our 90-day renewal book", "NRR forecast", "which customers are about to churn"
**Schedule:** Auto-runs Sundays
**Status:** ACTIVE (Day Zero confirmations pending for NRR formula + risk weights)
**Layers on:** Salesforce MCP, Chorus MCP, NetSuite MCP

### call-intelligence
**Path:** `call-intelligence/SKILL.md`
**What it does:** Extracts renewal risk, competitive intel, stakeholder dynamics, and action-item slippage from Chorus call data. Five modes: account scan, weekly sweep, 1:1 prep, competitive monitoring, internal flight-risk.
**Triggers:** "what did we discuss on the call with X", "Chorus signal", "call intelligence", "any competitive mentions"
**Schedule:** Sunday 6pm ET weekly sweep; ad-hoc for other modes
**Status:** ACTIVE (Day Zero confirmations pending for competitor list + sentiment phrases)
**Layers on:** Chorus MCP, Salesforce MCP

### run-critique
**Path:** `run-critique/SKILL.md`
**What it does:** Agent observability layer. Auto-fires post every `/deep` to score the run on five dimensions (source rigor 25%, lens balance 20%, red-team sharpness 20%, deliverable usefulness 20%, memory hygiene 15%). Composite 0-100. Writes feedback memory. Pattern-codification trigger after 3+ same-pattern critiques.
**Triggers:** Auto-fires post `/deep`; manual `/post-mortem [topic-slug]`; manual quarterly meta-critique
**Schedule:** Triggered by `/deep` completion + manual + quarterly meta
**Status:** ACTIVE
**Layers on:** session_info MCP, skill-creator

### system-check
**Path:** `system-check/SKILL.md`
**What it does:** Verifies the operating model is wired correctly. Checks file presence, connector health, scheduled task status, memory freshness, position/decision/workstream state. Reports green/yellow/red per check.
**Triggers:** `/system-check`, "verify the system is working", "is the operating model loaded", "audit the wiring"
**Schedule:** Ad-hoc
**Status:** ACTIVE
**Layers on:** All

## Layered v1/v2 skills (not in this folder, but available)

The Class Strategic AI ecosystem also leans on these existing skills from the standard library:
- `class-brand-voice`, `class-content-writer`, `class-content-qa` — Class voice and content
- `class-brand-document`, `class-brand-excel`, `class-brand-presentations`, `class-ppt-cyan-light` — branded output
- `class-aws-connector` — AWS billing for both class + collab profiles
- `class-investor-quarterly-kpis`, `forecast-deck-creator` — board materials
- `russell-voice` — Russell's personal prose tone
- `finance:*`, `marketing:*`, `operations:*`, `legal:*` — domain skill suites
- `daloopa:*` — public-company benchmarking
- `searchfit-seo:*`, `brightdata-plugin:*` — competitive intel + SEO
- `common-room:*`, `zoominfo:*` — customer + buyer intel
- `enterprise-search:*` — cross-system retrieval
- `data:*` — SQL, analysis, viz
- `productivity:memory-management`, `anthropic-skills:consolidate-memory` — memory hygiene
- `skill-creator`, `mcp-builder`, `cowork-plugin-management:*` — self-extension
- `bootstrap-project` — folder ingestion
- Document creation: `docx`, `pptx`, `xlsx`, `pdf`, `canvas-design`, `html-dashboard-generator`

Full mapping in `../Strategic_AI_Stack_Inventory.md`.

## How to invoke

For any of the six custom skills above, when Russell's prompt matches a trigger phrase, read that skill's SKILL.md and execute its steps. Don't summarize the skill back — just execute it and return the report shape defined in the skill.
