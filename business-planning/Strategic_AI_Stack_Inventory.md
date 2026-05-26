# Strategic AI Stack Inventory

**Companion to:** `Strategic_AI_Operating_Model.md`
**Purpose:** The full per-skill, per-plugin, per-MCP rationale for which capability serves which C-level role. Use this as the reference when a Pass 4 deliverable-builder needs to know which skill to invoke.

---

## 1. CEO Stack

The CEO function inside Class right now is narrative discipline plus capital-structure literacy. The system needs to hold the cap table, the debt covenants, the ARR cliff, and the board's last ask in working memory and reason across them.

### Active capabilities
- `class-investor-quarterly-kpis` → Templates and metric definitions for the numbers the board cares about — ARR, NRR, burn, runway — in the format Holdco/Barclays already see.
- `class-brand-document`, `class-brand-presentations`, `class-ppt-cyan-light` → Board-deck-grade output in the company's actual visual system.
- `forecast-deck-creator` → Turns the weekly cash forecast XLSX (May 10 baseline) into the board-deck slide format that already passed scrutiny.
- `daloopa:tearsheet`, `daloopa:bull-bear`, `daloopa:capital-allocation`, `daloopa:precedent-transactions` → Public-company benchmarks for M&A or recap narrative — what comparable edtech traded at, capital allocation frames the board recognizes.
- `daloopa:guidance-tracker`, `daloopa:inflection` → Frame Class's trajectory against public-comp inflection points (Coursera / Instructure / Powerschool-shaped curves).
- `enterprise-search:knowledge-synthesis`, `enterprise-search:digest`, `enterprise-search:search` → Pull from Gmail/Drive/Slack to reconstruct what was actually said about strategy.
- `legal:review-contract`, `legal:legal-risk-assessment`, `legal:meeting-briefing` → Read the Barclays facility, Holdco recap docs, MIP plan; surface risk before a board call.
- Salesforce + NetSuite MCPs → The two source-of-truth systems for revenue and finance.
- `productivity:memory-management`, `MEMORY.md` auto-memory → Persistent recall of cap structure, restricted cash, COO leverage, the W30 trough.
- `russell-voice` → Drafts external communications in your tone, not Chasen's, not generic CEO-speak.

### Gaps
- No board-portal / cap-table tool — Carta / Pulley MCP would close equity, options, and MIP modeling.
- No DocSend-equivalent — readership signal on the deck.
- No `strategic-options` or `decision-framework` skill — closest is Daloopa's IB toolkit, but it's analyst-oriented. Should be authored via `skill-creator`.
- No investor-CRM — Affinity or DealCloud, even basic, would track LP / strategic-acquirer conversations across the recap process.

### Recommended invocation pattern
For a board cycle: `enterprise-search:digest` to pull the last 7 days of board-relevant signal → `class-investor-quarterly-kpis` to lock the metric set → `forecast-deck-creator` against the May 10 weekly forecast for the cash slide → `daloopa:bull-bear` to stress-test the narrative against public comps → `class-ppt-cyan-light` to render the deck. Cover note in `russell-voice`, routed to Chasen via Gmail.

---

## 2. CFO Stack

The densest part of the stack and the one most directly load-bearing on July 26. The CFO function has to be right to the dollar.

### Active capabilities
- **NetSuite MCP** (`ns_runReport`, `ns_runSavedSearch`, `ns_runCustomSuiteQL`, `ns_getSubsidiaries`, `ns_listAllReports`) → Direct query access to GL, AR aging, AP aging, vendor spend, subsidiary rollups. The cash model refresh path post-Tomas.
- **AWS API MCP** + `class-aws-connector` skill → Direct AWS cost queries against `class` and `collab` profiles. AWS is one of the few real July 26 levers because it can be cut without severance timing problems.
- `finance:financial-statements`, `finance:close-management`, `finance:reconciliation`, `finance:variance-analysis`, `finance:journal-entry`, `finance:journal-entry-prep` → Full month-end close support, which matters because close discipline is wobbly post-Tomas.
- `finance:audit-support`, `finance:sox-testing` → Audit-grade evidence trails, relevant given Barclays covenants and Holdco's quarterly reporting expectations.
- `daloopa:working-capital`, `daloopa:dcf`, `daloopa:build-model`, `daloopa:unit-economics`, `daloopa:comp-sheet` → Benchmark unit economics against public comps for CAC/LTV or gross-margin defense.
- `class-brand-excel`, `xlsx` skill → Cash-model variants in the workbook format that already lives in `Business Planning/` (Cash Lever Model v5 lineage).
- `data:write-query`, `data:sql-queries`, `data:analyze`, `data:validate-data` → SQL against NetSuite extracts and the cash model when needed beyond native reports.
- `operations:vendor-review`, `legal:vendor-check` → Vendor spend triage — which contracts can be cut, deferred, or renegotiated.
- `operations:risk-assessment`, `operations:compliance-tracking` → Risk register discipline around the cash trough and covenant tripwires.
- Salesforce MCP → Bookings/billings live so AR forecast in the cash model isn't lagging by a week.
- Computer-use + Desktop Commander → Drives Excel directly when the model needs interactive recalc beyond headless `xlsx`.

### Gaps
- No payroll/HRIS MCP (Rippling/Gusto/ADP) — per the memory file, payroll is external and a NetSuite blind spot. This is the highest-leverage missing piece for defending July 26.
- No Ramp / Brex / Bill.com spend-management MCP — AP automation and vendor-card visibility would expose deferrable spend faster than NetSuite AP queries.
- No bank MCP (Mercury, JPMC, Barclays-direct) — restricted-cash visibility ($2.5M BACA, $3.245M Coso-TD) currently requires manual reconciliation.
- No purpose-built `weekly-cash-forecast` skill — you've been hand-building it; should be authored to lock the methodology.
- No `covenant-tracker` for the Barclays facility — should be authored as a custom skill wrapping facility terms + live NS/SF data.

### Recommended invocation pattern
Weekly cash cycle: `ns_runCustomSuiteQL` for AR + AP aging → `class-aws-connector` for AWS spend delta vs. budget → Salesforce MCP for new bookings + at-risk renewals → Feed into Cash Lever Model v5 via `xlsx` + Desktop Commander → `finance:variance-analysis` to explain the week-over-week move → `forecast-deck-creator` for the board slide.

Severance modeling: pair `operations:capacity-plan` with `class-gtm-data` (per-person roster) → trough-impact deltas → `legal:compliance-check` for review.

---

## 3. CRO Stack

Revenue retention is the other side of the cliff. CRO at Class is less about new pipeline and more about defending the ARR base.

### Active capabilities
- **Salesforce MCP** (full read+write — query, opportunities, accounts, contacts, pipeline summary, segment summary, contact coverage) → The CRO's primary instrument.
- `class-gtm-data` → Class's GTM context — territory, ICP, segment definitions.
- `salesforce-dx` toolkit → Heavy customization muscle for when the data model itself needs to change.
- `common-room:account-research`, `common-room:call-prep`, `common-room:weekly-prep-brief`, `common-room:generate-account-plan`, `common-room:prospect`, `common-room:compose-outreach` → Behavioral and signal data on customers and prospects.
- `zoominfo:account-research`, `zoominfo:buying-committee`, `zoominfo:enrich-company`, `zoominfo:enrich-contact`, `zoominfo:meeting-prep`, `zoominfo:recommend-contacts`, `zoominfo:find-similar`, `zoominfo:competitor-analysis`, `zoominfo:build-list` → Firmographics, intent, committee mapping.
- `enterprise-search:search`, `enterprise-search:digest` → Cross-system retrieval of every email, call note, Slack thread about a customer.
- Slack plugin → CS/AE chatter as an early-warning system.
- `productivity:task-management`, `productivity:update` → Account-plan execution tracking.
- `class-content-writer`, `class-brand-voice`, `russell-voice` → Renewal save plays and exec-sponsor outreach that sounds like Class.

### Gaps
- No Gong / Chorus / call-recording MCP — the single biggest CRO gap. Renewal-risk signals live in calls, not Salesforce fields.
- No CS platform MCP (Gainsight, Catalyst, Vitally, ChurnZero) — health scores currently reconstructed from Salesforce.
- No product-usage telemetry MCP — Amplitude / Mixpanel / Pendo. Without this, you can't see who is using the platform vs. renewing on inertia.
- No `renewal-forecast` skill tuned to the Class NRR definition.
- No CRO-specific battlecard skill keyed to the live Salesforce competitor field.

### Recommended invocation pattern
At-risk renewal cohort: SF MCP query for accounts with renewal in next 90 days + engagement-score below threshold → `common-room:account-research` + `zoominfo:buying-committee` enrichment → `enterprise-search:search` for call/email/Slack history → `common-room:generate-account-plan` + `common-room:compose-outreach` + `russell-voice` for exec-sponsor outreach → push tasks back into Salesforce via the MCP write path.

---

## 4. CMO Stack

CMO in this context is narrative defense and demand efficiency, not brand awareness. Marketing budget is one of the few discretionary lines that helps July 26 directly.

### Active capabilities
- `class-brand-voice`, `class-content-writer`, `class-content-qa`, `class-brand-document`, `class-brand-presentations` → Class-specific voice + visual system enforced on every output. Critical because brand drift during a crisis signals the company is dying.
- `marketing:content-creation`, `marketing:draft-content`, `marketing:campaign-plan`, `marketing:email-sequence`, `marketing:performance-report`, `marketing:competitive-brief`, `marketing:brand-review`, `marketing:seo-audit` → Full demand-gen toolkit.
- `searchfit-seo:*` suite (`seo-audit`, `technical-seo`, `on-page-seo`, `content-strategy`, `keyword-cluster`, `internal-linking`, `schema-markup`, `ai-visibility`, `content-brief`) → SEO is fixed-cost; `ai-visibility` is the new frontier (being recommended by ChatGPT/Claude/Perplexity when EDU buyers research collaboration platforms).
- `brightdata-plugin:competitive-intel`, `brightdata-plugin:scrape`, `brightdata-plugin:search`, `brightdata-plugin:seo-audit` → Competitor monitoring at scale — pricing pages, careers pages (strategic shift signals), feature releases.
- `zoominfo:competitor-analysis`, `common-room:prospect` → Buyer-side + competitor-side intel pairing.
- `data:build-dashboard`, `html-dashboard-generator`, `data:create-viz` → Marketing-performance dashboards the board can actually open.
- Google Workspace MCP → Distribute everything where the team already works.
- `class-ppt-cyan-light` → Visual system carried through to marketing collateral.

### Gaps
- No active marketing automation MCP — HubSpot/Marketo/Klaviyo (Klaviyo plugin auth listed but not connected). Activate if Class uses it.
- No Google Ads / LinkedIn Ads / Meta Ads MCP — paid spend is a direct cash-trough lever and has no telemetry path into the cash model today.
- No GA4 / web-analytics MCP — Supermetrics plugin listed but not authenticated.
- No Canva / Figma active — both plugin auths listed but not authenticated.
- No PR / press monitoring — Muck Rack, Meltwater, or a Brightdata-driven press scraper.

### Recommended invocation pattern
Paid-spend triage for July 26: pull GA4/Ads spend → cross-reference Salesforce-attributed pipeline → `marketing:performance-report` to score ROI by channel → `marketing:campaign-plan` to redesign at lower spend.

Brand integrity: every external comms piece runs through `class-brand-voice` + `marketing:brand-review` before publish.

---

## 5. C-AI / Chief of Staff Stack

The meta-layer — the system that makes the other four C-suites coherent across sessions.

### Active capabilities
- `productivity:memory-management`, `MEMORY.md` auto-memory → Persistent context across every session.
- `anthropic-skills:consolidate-memory` → Periodically prune and reorganize the memory file.
- `anthropic-skills:setup-cowork` → Reinstall/reconfigure Cowork when the stack needs to migrate.
- `skill-creator`, `cowork-plugin-management:create-cowork-plugin`, `cowork-plugin-management:cowork-plugin-customizer`, `mcp-builder` → The recursive-improvement loop — every gap can be closed by authoring a new skill or wrapping a new MCP.
- `bootstrap-project` → Full codebase/folder ingestion when a new domain needs to come fully into context.
- `scheduled-tasks` (`create_scheduled_task`, `list_scheduled_tasks`, `update_scheduled_task`) → Recurring jobs — weekly cash-model refresh, daily board-digest, Monday call-prep.
- `enterprise-search:source-management`, `enterprise-search:search-strategy` → Configure which sources Claude searches first.
- Slack plugin → Internal comms surface for AI to push status updates, standups, channel answers.
- Computer-use, Desktop Commander, Chrome control → Last-mile execution when MCPs don't cover the surface (board portal, vendor login, stubborn Excel file).
- `session_info:read_transcript` → Read prior session transcripts; act on continuity, not just memory snippets.
- `cowork:create_artifact`, `update_artifact`, `list_artifacts` → Durable artifacts that persist across sessions.
- `mcp-registry:search_mcp_registry`, `plugins:suggest_plugin_install`, `skills:suggest_skills` → Self-extending — Claude can identify and propose what to install next.
- `apply-to-role`, `apply-daily-briefing` → Parallel job-hunt track; the chief-of-staff layer holds both Class and the job-hunt without leakage.
- `locality-*` skills → Russell's side business stays accessible from the same operating environment.

### Gaps
- No workflow orchestration (n8n/Zapier/Make MCP) — to run multi-step jobs without Claude in the loop.
- No vector knowledge base with explicit indexing of the Business Planning folder — relies on filesystem search.
- No observability / agent-evaluation layer — bad outputs aren't auto-flagged for review.
- No calendar-driven autonomy — scheduled-tasks exists but isn't yet wired to Calendar event triggers.

### Recommended invocation pattern
Every Monday 6:00am ET via `scheduled-tasks`: `enterprise-search:digest` across Gmail/Slack/Drive for prior week → refresh cash model (NS + AWS + SF) → produce W+1 board snapshot via `forecast-deck-creator` → draft weekly Chasen update in `russell-voice` → stage as draft Gmail. Memory consolidated weekly via `anthropic-skills:consolidate-memory`.

---

## 6. Cross-Cutting Foundation (always-on)

**Memory.** `productivity:memory-management` + `anthropic-skills:consolidate-memory` is the substrate — without it, every session restarts at zero.

**Voice.** `russell-voice` for personal, `class-brand-voice` for company. Ensures tone consistency from board memo to renewal email.

**Output rendering.** `docx`, `pptx`, `xlsx`, `pdf`, `canvas-design`, `html-dashboard-generator`, plus the Class-specific brand-document/brand-excel/brand-presentations and `class-ppt-cyan-light` theme.

**Source-of-truth access.** NetSuite, Salesforce, AWS, Google Workspace, Slack MCPs are the data spine for all four C-roles.

**Last-mile execution.** Computer-use, Desktop Commander, Chrome control catch what MCPs don't cover (Barclays portal, Holdco docs, payroll provider).

**Knowledge retrieval.** `enterprise-search` plus `bootstrap-project` ensures Claude can pull from every prior decision and document.

---

## 7. Top 5 Recommended Additions

1. **Payroll / HRIS MCP (Rippling or Gusto)** — Closes the NetSuite payroll blind spot. Models per-person severance cash timing without side workbooks. Single highest-leverage missing piece.
2. **Bank / treasury MCP (Mercury, or Barclays-direct if available)** — Reconciles $2.5M BACA restricted and $3.245M Coso-TD against board cash claim live. Daily cash position without manual export.
3. **Gong or Chorus MCP** — Renewal-risk signal lives in calls. Converts CRO from reactive to proactive.
4. **Spend-management MCP (Ramp or Bill.com)** — AP visibility + vendor-card-level spend; wires directly into the cash lever model.
5. **Custom-authored skills via `skill-creator`** — `weekly-cash-forecast` (locks May 10 baseline methodology), `covenant-tracker` (wraps Barclays facility terms against live data), `renewal-forecast` (tuned to Class NRR definition).

---

## 8. Auto-deploy Order

Stack-loading order matters because later layers depend on earlier ones.

**Layer 1 — Foundation (always first):** `MEMORY.md` auto-memory + `productivity:memory-management` + `russell-voice` + `class-brand-voice`. Without these, every other skill operates without continuity or tone.

**Layer 2 — Source-of-truth MCPs:** NetSuite, Salesforce, AWS, Google Workspace, Slack. The data spine. Loading them before role-specific skills means every downstream skill can pull live data instead of asking Russell to paste it.

**Layer 3 — Role-specific skills:** Load by current priority. For Class's situation: CFO (cash crisis) → CRO (ARR cliff) → CEO (board narrative) → CMO (demand efficiency).

**Layer 4 — Output renderers:** `class-brand-presentations`, `class-ppt-cyan-light`, `xlsx`, `forecast-deck-creator`, `docx`, `pdf`. Load last because they're pure surface — they shape what Layer 3 produces.

**Layer 5 — Meta / orchestration (on-demand):** `skill-creator`, `mcp-builder`, `scheduled-tasks`, `bootstrap-project`. Invoked when the stack itself needs to extend.

**Why ordering matters:** If a CFO query runs before NetSuite MCP is live, Claude will hallucinate or ask for paste. If voice skills load after content skills, the first draft is generic. If output renderers load before role skills, the deck format is locked before the analysis is shaped. Wrong order is the most common reason Cowork sessions feel underpowered — Monday auto-load should follow this exact sequence.
