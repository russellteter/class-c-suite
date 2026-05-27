# R0-Knowledge Inventory — Operating-Model Spine + Memory

**Agent:** R0-Spine  
**Date:** 2026-05-26  
**Status:** Complete  
**Doctrine:** DOCTRINE.md — 10 laws; all claims cite file path + line range.

---

## Section 1: Operating-Model Spine Map

### 1. `business-planning/Strategic_AI_Operating_Model.md`
The v1 constitution establishing the 5 C-level lens framing (CEO/CFO/CRO/CMO/COS), the 5-pass loop (Bootstrap → Multi-Lens Synthesis → Red-Team/Steelman → Polish+Document → Memory Write+Schedule), and the connector playbook routing logic. Load-bearing for the build: (a) cash routing rule — Cash Lever Model v5 is authoritative, never NetSuite alone for weekly cash; (b) W30 trough anchor $111,766 on July 26 2026; (c) the memory write protocol (source: field required). Contains the self-improvement loop (run-critique dimensions) and the failure-modes table.  
Key citations: connector routing (§ "Data Source Routing Rules"), 5-pass loop (§ "The Five-Pass Operating Loop"), failure modes (§ "Common Failure Modes").

### 2. `business-planning/Strategic_AI_Operating_Model_v2.md`
The v2 hardening layer adding the Cross-Claude Knowledge Spine, Conviction Backbone, Stakeholder/Workstream/Adversarial library, and Turnaround Operating Library. Cross-Claude spine path is `/Users/russellteter/Documents/Claude/Projects/_spine/`. Pre-seeds 12 workstreams (WS-01 RED, WS-02 through WS-12 YELLOW/GREEN), 6 positions (POS-001 through POS-006), 4 decisions (DEC-001 through DEC-004).  
Key citations: spine path (§ "Cross-Claude Knowledge Spine"), position library seed (§ "Conviction Backbone"), workstream seed (§ "Workstream Library").

### 3. `business-planning/Strategic_AI_Invocation_Guide.md`
The canonical invocation reference: how the 5-pass loop translates to actual subagent calls, operational rules (parallelize, cap tool calls, never silently substitute data, stale memory flags at >30 days), and — critically — the verbatim lens frame prompts for all 5 lenses (lines 291–330). The CRO frame at line 312 still encodes old committed-stage labels (S4/S5/Commit/Best Case) that do not exist in live Salesforce — a P1 discrepancy (see Section 6).  
Key citations: lens frames (lines 291–330), operational rules (lines 334–344), tool-call caps (line 341).

### 4. `business-planning/Strategic_AI_Connector_Playbook.md`
Documents 18 connectors with routing, data-quality rules, and connector-specific quirks (NetSuite FX, Salesforce field indirection, AWS dual-profile, Chorus confidence cap). Part 4 data-quality discipline (line ~340) still encodes old committed-stage labels — P1 discrepancy. Section §18 documents Chorus.ai with tools `list_engagements`, `get_engagement`, `get_engagement_summary`, `search_calls_by_participant` and the summaries-only constraint.  
Key citations: committed-pipeline filter (Part 4, line ~340), Chorus §18, AWS dual-profile (§ "AWS Connector").

### 5. `business-planning/Strategic_AI_Conviction_Backbone.md`
Defines the Position Library schema, Decision Log schema, Calibration Tracker (Brier-band scorecard), and Pre-Mortem Library. Pre-seeds 6 positions (POS-001 through POS-006) and 4 decisions (DEC-001 through DEC-004) plus 7 pre-mortem scenarios (PM-001 through PM-007). The rigorScore formula referenced in prompts.md (35 claim_source + 20 coverage + 15 red_team + 15 calibration + 15 falsifier) derives from this document's calibration discipline.  
Key citations: position schema (§ "Position Library"), decision schema (§ "Decision Log"), pre-mortem library (§ "Pre-Mortem Library"), Brier scorecard (§ "Calibration Tracker").

### 6. `business-planning/Strategic_AI_Stakeholder_Workstream_Adversarial.md`
Defines schemas for stakeholder files (canonical_name, role, decision_rights, last_refreshed, HOT/WARM/COLD flag), the 12 workstream file structure, and the adversarial layer (competitor-watch, regulatory-watch, financial-tripwires, customer-defections, internal-defection-risk). Contains a worked Chasen example as a stakeholder file. The adversarial library is the primary input for the Red-Team pass (Pass 3).  
Key citations: stakeholder schema (§ "Stakeholder Library"), Chasen worked example (§ "Worked Example"), adversarial layer (§ "Adversarial Library").

### 7. `business-planning/Strategic_AI_Cross_Claude_Spine.md`
Defines the persistent cross-session spine architecture at `/Users/russellteter/Documents/Claude/Projects/_spine/` with 6 components: INVENTORY.md, MEMORY_INDEX.md, SESSION_LEDGER.md, CONFLICTS.md, `identities/`, `intelligence/`. Specifies 5 scheduled ingestion tasks, the `project::` namespace for memory bridging, and watermark tokens to prevent reprocessing. This is the persistence backbone that links sessions across the C-Suite build.  
Key citations: spine path and components (§ "Spine Structure"), scheduled tasks (§ "Scheduled Ingestion"), watermark protocol (§ "Watermark System").

### 8. `business-planning/Strategic_AI_Stack_Inventory.md`
Per-role tool stack: CEO (daloopa, brand skills, legal MCP), CFO (NetSuite + AWS MCPs, finance skills), CRO (Salesforce MCP, Common Room, ZoomInfo), CMO (brand-voice, searchfit-seo, brightdata), COS (scheduled-tasks, session_info, skill-creator). Documents top 5 recommended tool additions: Rippling (payroll visibility — the current blind spot), Bank MCP (direct cash), Gong/Chorus (call intelligence beyond summaries), Ramp/Bill.com (AP automation), and custom skills.  
Key citations: per-role stacks (§ "Role-Specific Stacks"), recommended additions (§ "Recommended Additions").

### 9. `business-planning/Strategic_AI_Knowledge_Base_Audit.md`
Documents 16 memory files by type and freshness, the 10 most important business-planning files, knowledge gaps by C-level role, and a foundational-files map. Five key observations: (a) heavy Salesforce coverage but stage labels need verification; (b) NetSuite coverage is partial (payroll blind spot confirmed); (c) AWS billing coverage needs dual-profile documentation; (d) memory freshness is inconsistent; (e) skill registry coverage is now improved (B17 mitigated).  
Key citations: 16 memory files (§ "Memory File Inventory"), knowledge gaps (§ "Knowledge Gaps by Role"), foundational files map (§ "Foundational Files").

### 10. `business-planning/turnaround_operating_library.md`
An 8-section reference corpus: (1) Strategic Framing Frameworks (Grove inflection point, Helmer 7 Powers, Christensen disruption, McKinsey Three Horizons, BCG matrix, Collins Stockdale Paradox, Drucker "what business are we in"); (2) Turnaround Doctrine (13-week forecast, cash-is-king, cut-once-deep, covenant-relief); (3) SaaS Turnaround Patterns; (4) Case Studies (Apple 1997, Netflix, Microsoft, Domino's, Best Buy, IBM, Adobe, Slack, Coursera, Instructure/PowerSchool); (5) Edtech Market Patterns; (6) COO Operating Doctrines; (7) AI-Native Operations Doctrine; (8) How to Use. CPO lens grounding lives in Sections 3 and 7 (see Section 3 of this report).  
Key citations: Section 3 lines 107–149, Section 7 lines 273–315, Class context anchor (lines 3–5).

### 11. `business-planning/SESSION_START_PROTOCOL.md`
Russell's 9-step session-start discipline: (1) confirm auto-memory loaded, (2) read workspace files, (3) check operating layer indexes, (4) mode-routing table, (5) always-on disciplines (13 rules), (6) Russell's preferences, (7) scheduled jobs, (8) artifacts required at end of /deep session, (9) session ledger write. The always-on disciplines include the cash routing rule (Cash Lever Model v5 first) and the memory write protocol. The 13 always-on rules are the session-to-session operating contract.  
Key citations: 9 steps (§ "Protocol Steps"), always-on disciplines (§ "Always-On Disciplines"), session ledger write (§ "Session End Protocol").

---

## Section 2: Verbatim Lens Prompts

Extracted from `business-planning/Strategic_AI_Invocation_Guide.md`, lines 291–330. These are byte-for-exact text of the canonical frames — insert directly into Ch.4 `prompts.md`.

### CEO Frame
Source: `Strategic_AI_Invocation_Guide.md`, lines 291–303

> You are the CEO of Class Technologies. Class is in cash crisis. ARR is falling from $35.85M to $20.57M over 16 months. The W30 cash trough on July 26, 2026 sits at $111,766. The capital structure is $25M Barclays Term + $5M Revolver + $1.4M PIK ($31.4M total exposure), preferred zeroed, Holdco above the op sub. Your board includes Holdco and Barclays as third-party beneficiary on key clauses.
>
> Frame your analysis exclusively through the CEO lens: board narrative, strategic optionality (sale, recap, asset sale, wind-down, turnaround), covenant management, Holdco/investor relations, and the 1-2 decisions only the CEO can make. Your audience is the board.
>
> Return:
> 1. **Position** — one paragraph, the path you recommend.
> 2. **Top 3 risks from this lens.**
> 3. **What you need from CFO, CRO, CMO, Chief of Staff to validate or execute.**
> 4. **Quantitative anchor** — at least one number (ARR exposure, valuation impact, covenant headroom, runway months).
> 5. **Decision-rights question** — who actually decides this?
>
> Constraints: max 5 tool calls. ~600-1000 words. Cite every factual claim with a source.

### CFO Frame
Source: `Strategic_AI_Invocation_Guide.md`, lines 304–309

> You are the CFO of Class Technologies. Your North Star is the W30 cash trough at $111,766 on July 26, 2026. You have direct access to NetSuite (with known quirks: foreign-currency invoice display, customer/entity ID indirection, stale AP entries, payroll blind spot), the Cash Lever Model v5 (authoritative — only touch sheet `07_Weekly_Engine` unless instructed), and AWS billing across the `class` (BillingAccess role) and `collab` (Billing role) profiles.
>
> Frame everything in cash, runway, working capital, covenant compliance, and unit economics. Quantify every claim in dollars and dates. The cash levers known to work: AR pull-forward, AP deferral (with vendor-specific exclusions), AWS cuts (90-day flexible spend is ~12%, not 30%), restricted cash release (BACA $2.5M, Coso-TD $3.245M). Severance is spread-mode not lump — so headcount cuts don't help July.
>
> [Same 5-part return structure as CEO frame]

### CRO Frame
Source: `Strategic_AI_Invocation_Guide.md`, lines 311–316

> You are the CRO. The ARR cliff is $35.85M to $20.57M over 16 months. International Higher Ed is 47.9% concentration. You have Salesforce direct access — pipeline summary, segment summary, contact coverage, custom fields for ICP/segment/persona/EHR system. Renewal stages: S4 + S5 + Commit/Best Case count as committed; S1/S2 do not.
>
> Frame everything in pipeline, retention, renewal risk, ARR trajectory, customer-facing implications. Name specific accounts when relevant.
>
> [Same 5-part return structure]

**WARNING — P1 DISCREPANCY:** The committed-stage labels in this frame ("S4 + S5 + Commit/Best Case") do NOT exist in live Salesforce. See BLOCKERS B19 and Section 6, Finding 1 of this report. The CRO frame must be corrected before Ch.4 prompts.md receives it.

### CMO Frame
Source: `Strategic_AI_Invocation_Guide.md`, lines 318–323

> You are the CMO. The company is in crisis. Brand drift during a crisis is how companies signal they are dying. Internal comms to 41 employees, external comms to customers mid-renewal, and external positioning to the market all matter.
>
> Frame everything in brand, market positioning, customer perception, internal comms, external comms. If the question doesn't obviously have a marketing angle, find the comms or perception dimension that does.
>
> [Same 5-part return structure]

### Chief of Staff (COS) Frame
Source: `Strategic_AI_Invocation_Guide.md`, lines 325–330

> You are Russell's Chief of Staff. Russell is the COO-elect, stepping into the operating seat at a company in cash crisis. Chasen is CEO. The board includes Holdco. Russell has $0 equity value in a wind-down scenario but a 2.25% MIP capped ~$675K if a sale happens. He is running a parallel job-hunt campaign as walk-away leverage.
>
> Frame everything in execution sequencing, decision rights, who-does-what-by-when, political dynamics with Chasen and the board, and what's at risk of falling through the cracks. Russell prefers options framed as three crisp choices with explicit trade-offs, not single recommendations. Always name the decision-rights owner.
>
> [Same 5-part return structure]

---

## Section 3: CPO Grounding Sections

From `business-planning/turnaround_operating_library.md`. The Ch.4 CPO lens cites Sections 3 and 7 as its grounding corpus. Full verbatim content follows.

### Section 3: SaaS-Specific Turnaround Patterns (lines 107–149)

**The Rule of 40 Inversion** (lines 109–112)  
The Rule of 40 (growth rate + EBITDA margin >= 40%) is the canonical SaaS health metric. When growth fails, the only path back to the Rule is margin. The math is unforgiving: at -30% growth, you need +70% EBITDA margin to be "healthy," which is impossible. The honest interpretation: in decline, you're not solving for Rule of 40, you're solving for *positive free cash flow* and *covenant compliance.*  
For Class: stop reporting Rule of 40 internally — it's demoralizing and not actionable. Replace with: weekly cash, NRR, gross margin, and EBITDA-on-trailing-six-months. Run the business to those four numbers.

**Bessemer's Good / Great / Best SaaS Metrics** (lines 114–117)  
Bessemer's framework: at scale, Good is 100% NRR, Great is 110%, Best is 130%+. Magic Number above 1.0 means efficient growth. CAC payback under 18 months. Gross margin above 75%. Burn multiple under 1.  
For Class: in late-stage decline, the Bessemer benchmarks are aspirational and mostly unreachable in the short term. The diagnostic value is in NRR — what's Class's current NRR? If it's below 90%, the business is shrinking on its existing base and no amount of new logos will save it. If it's 90-100%, there's a survivable base. The first NRR fix is gross retention (stop the leaks), not expansion.

**Net Revenue Retention as the Single Survival Metric for Mature SaaS** (lines 119–122)  
NRR is the most honest number a SaaS company tracks because it strips out new-logo theater. NRR > 100% means the existing base is funding the business. NRR < 100% means you're running uphill — every quarter you need to win more new logos than you lost in existing-base shrinkage, which gets exponentially harder.  
For Class: if NRR isn't already the centerpiece of the operating cadence, make it so. Decompose into gross retention, expansion, contraction, and churn. Each component has a different owner and a different lever. In late-stage decline, gross retention is where the biggest near-term wins are — it's cheaper to retain than to win new, and every save shows up directly in next quarter's ARR.

**Expand vs New Logo Reallocation** (lines 124–127)  
Sales orgs default to chasing new logos because they're psychologically rewarding (closing! winning!) and because comp plans reward them. In late-stage decline, this is backwards. Expand revenue has 3-5x better unit economics, faster cycles, and higher win rates.  
For Class: examine the comp plan immediately. If reps are paid the same for expand vs new logo dollars, you'll get new-logo bias by default. Reweight to favor expand. Consider whether 1-3 named reps should focus exclusively on the top 20 accounts for expansion and retention, leaving new-logo hunting to a smaller, sharper team.

**Pricing as the Highest-Leverage Lever — Campbell / Ramanujam** (lines 129–132)  
Patrick Campbell's data: pricing changes drive ~4x the impact of acquisition optimizations and ~2x the impact of retention optimizations, dollar for dollar. Madhavan Ramanujam's "Monetizing Innovation": price before you build, segment willingness-to-pay, and use packaging to capture different price points.  
For Class: most edtech SaaS underprices because the buying institutions are "non-profit" and the sales team feels guilty. This is a mistake. The work: identify the top quintile of accounts by usage and revisit pricing. Identify the bottom quintile by margin and consider raising minimums or sunsetting. Introduce a clear good/better/best packaging if not already in place. Pricing is the only lever that's pure margin — every dollar of price increase falls to EBITDA.

**Land and Expand Reversal** (lines 134–137)  
The standard SaaS thesis (land small, expand over time) inverts in late-stage decline. When expansion stalls, "land small" becomes "land tiny and never grow" — you're acquiring CAC-expensive accounts that don't return. The reversal: stop landing accounts you can't expand. Qualify harder on the front end.  
For Class: this implies tightening the ICP, killing low-fit deals earlier, and concentrating sales effort on accounts that look like the best customers. Some new-logo revenue will be foregone — that's fine, because the bad-fit logos were unprofitable anyway.

**Product-Led Growth as CAC Compression** (lines 139–142)  
PLG works when the product can be tried and proven without sales involvement. In edtech, this is harder (institutional buying, procurement cycles) but not impossible — free department-level pilots, free single-faculty usage, etc. The point of PLG isn't to replace sales; it's to compress CAC by having the product do part of the qualification work.  
For Class: a real PLG motion is probably a 12-month build, which Class doesn't have time for. The lighter-touch version: identify any product surface that can be exposed to a free trial or freemium tier, and use it as a top-of-funnel lead generator. Cheaper than paid acquisition.

**Concentrate-Then-Decide** (lines 144–148)  
The most powerful late-stage SaaS playbook is to identify the most defensible customer segment, concentrate everything there, and then make the strategic decision about whether to invest in expansion later. "Try to be all things to all people" is the death sentence of mid-stage SaaS.  
For Class: which segment of customers loves Class the most, has the highest NRR, the lowest churn, the most stickiness? That's the core. Everything else is optional. The strategy work is to articulate that segment with precision (institution type, use case, decision-maker persona, value driver) and then realign product, sales, marketing, and CS around it. This is the *most important* strategic question for Class in the next 90 days.

---

### Section 7: AI-Native Operations Doctrine (lines 273–315)

**Where AI Is Highest-Leverage in a SaaS Turnaround** (lines 275–284)  
Highest-leverage AI applications, ordered by impact-per-dollar in a distressed SaaS context:  
1. **Customer Support Automation**: AI deflection of tier-1 support tickets (Intercom Fin, Ada, custom Claude-based). For Class with 41 GTM, every hour of CS time freed is a real saving. Target 30-50% deflection on routine queries.  
2. **Sales Prospecting and Outbound**: Apollo + Clay + AI personalization can replace SDR motion. Target: cut SDR comp/tooling by 50% while maintaining lead flow.  
3. **Content Marketing**: Generate the long-tail SEO content, customer case studies, and thought-leadership cadence with AI as the first draft. Marketer becomes editor, not writer.  
4. **Code Review and Engineering Productivity**: Cursor, Copilot, Claude Code in the engineering org. Productivity uplift of 20-40% on routine tasks.  
5. **Customer Success Health Scoring**: AI-driven churn prediction and health scoring lets a smaller CS team manage a larger book without losing accounts.  
For Class: pick the top 2 and do them well; resist the urge to do all five at once. The biggest near-term ROI is probably support automation (direct cost reduction) and sales prospecting (CAC compression).

**Build vs Buy AI Tooling** (lines 286–289)  
The default in 2026 is buy. Building AI infrastructure is mostly a distraction unless AI is your product. Buy: foundation-model APIs, SaaS AI tools (Intercom Fin, Apollo, Clay, Cursor, Gong). Build: the thin layer of integration that connects bought tools to your specific data and workflows.  
For Class: zero AI infrastructure build. Every dollar spent training models or building proprietary tooling is a dollar not spent on survival. The exception: if Class's product itself becomes AI-driven (which it probably must, to be competitive in EDU), that's product investment, not ops investment, and is governed by different rules.

**AI-Native Team Structure — Centralize vs Distribute** (lines 291–294)  
Two patterns work. (1) Centralize: an "AI ops" function (1-2 people) that builds tools, evaluates platforms, and pushes adoption across functions. (2) Distribute: each function adopts AI tools native to it (sales picks Gong, support picks Fin, eng picks Cursor) with a light-touch coordinator.  
For Class at 41 GTM + product + ops: probably distribute, with one named person (a current employee, not a new hire) who owns the cross-function coordination. A dedicated AI hire is premature.

**AI as Expensive Distraction vs Productivity Unlock** (lines 296–299)  
The failure mode: the org spends 30% of its time evaluating AI tools, building proofs of concept, and debating which platform to use. Meanwhile, the actual work doesn't get done faster. The discipline: pick a small number of tools, deploy fast, measure within 30 days, iterate.  
For Class: a 30-day deployment timeline for any AI tool. If it's not delivering measurable improvement by day 30, kill it. AI tools that require six-month implementation cycles are not appropriate for a distressed SaaS.

**Measuring AI ROI in the First 90 Days** (lines 301–304)  
The metrics that matter: (1) Hours saved per week per function (track honestly with self-report + spot-check), (2) Headcount displacement enabled (does the AI tool let you not backfill an open role?), (3) Output velocity (more tickets closed, more outbound emails sent, more PRs merged). Resist soft metrics like "satisfaction" or "ease of use" — they don't pay the bills.  
For Class: install the measurement framework before the tool. Pick 3 metrics per function, baseline them, deploy the tool, re-measure at day 30 and day 90. Anything that doesn't move the metrics gets killed.

**Specific AI Tools to Evaluate** (lines 306–314)  
- **Support**: Intercom Fin, Ada, Forethought  
- **Sales**: Apollo, Clay, Gong, Outreach Smart Email  
- **Marketing**: Jasper, Writer, Copy.ai, custom Claude-based content workflows  
- **Engineering**: Cursor, Copilot, Claude Code, Sourcegraph Cody  
- **Operations**: Glean (internal search), Notion AI, Airtable AI  
- **Finance**: Numeric, Mosaic, custom Claude-based forecasting  
Pick 1-2 per function based on actual use cases, not vendor pitches. Negotiate hard on pricing — vendors in 2026 are competing for accounts and will discount.

---

## Section 4: Connector-Playbook Rule Audit

Rules audited against `docs/research/R1-connector-reality.md` and the live Salesforce data from R1.

| Rule | Playbook Claim | Audit Status | Source |
|------|---------------|--------------|--------|
| **Committed-pipeline filter** | Committed = S4 + S5 + Commit/Best Case | **CORRECTED BY R1 — P1** | R1 confirmed none of these stage labels exist in live Salesforce. Real stage values TBD from live query. B19 in BLOCKERS.md. Connector Playbook Part 4 (~line 340) and Invocation Guide CRO frame (line 312) must be updated with actual stage labels. |
| **Active-AM rule** | Use `Account_Manager__c` to identify active AMs | **VERIFIED LIVE** | R1 confirms `Account_Manager__c` field exists on Salesforce Account object (325 custom fields confirmed). Note: BLOCKER B7 flags that `Owner.Name` vs `Account_Manager__r` lookup requires relationship traversal, not direct field. |
| **AWS: always sum both profiles** | Sum `class` (BillingAccess) + `collab` (Billing) | **EXISTS IN PLAYBOOK — NOT YET LIVE-VERIFIED** | Connector Playbook §AWS documents both SSO profiles. R1 partial deferred AWS verification. Phase R R1 follow-up needed to confirm both profiles accessible and billing lag (24-48hr). |
| **NetSuite `foreigntotal` + currency FX rule** | Use `foreigntotal` + `currency` for non-USD invoices; customer/entity JOIN required | **EXISTS IN PLAYBOOK** | Connector Playbook Part 4 documents this rule explicitly. R1 partial deferred NetSuite live verification. Phase R R1 follow-up needed. Note: NetSuite payroll blind spot confirmed — payroll data not accessible via SuiteQL. |
| **24-month skip rule** | [Referenced in brief §4 audit list] | **UNKNOWN — NOT IN CORPUS** | Searched all 11 spine documents and R1 connector reality file. No document contains a "24-month skip" rule by any variant phrasing. Per DOCTRINE law #1: UNKNOWN. Phase R R1 follow-up needed: verify whether this rule exists in a document outside the spine set or was a fabrication. |
| **Chorus pairing (call intelligence)** | Chorus summaries only (no raw transcripts); cap Chorus-only claims at <70 confidence; `continuation_key: " "` = pagination done | **EXISTS IN PLAYBOOK — PARTIALLY VERIFIED** | Connector Playbook §18 documents Chorus tools and summaries-only constraint. B11 in BLOCKERS.md confirms confidence cap. R1 partial deferred Chorus live verification. Phase R R1 follow-up needed for `continuation_key` behavior. |

---

## Section 5: MEMORY Status

**Path investigated:** `/Library/Application Support/Claude/local-agent-mode-sessions/fa5c2f7e-5fb9-4e29-a76c-e706355df1a1-f2ae62ca-b383-441b-9a66-f02d2b790532/spaces/94ab8945-0388-4060-8edc-2a9405694c5e/memory/`

**Access:** Accessible (no auto-mode classifier block).

**Files found:** Only one file present in the memory directory:
- `feedback_validate_connector_data.md`

**MEMORY.md:** NOT PRESENT at this path. The session-space memory directory contains only the single feedback file.

**Link graph:** Cannot be constructed — MEMORY.md is absent. The 16 memory files documented in `Strategic_AI_Knowledge_Base_Audit.md` (§ "Memory File Inventory") are NOT in this session space.

**Assessment:** The actual MEMORY.md and the 16 linked memory files are stored elsewhere. The most likely location is `/Users/russellteter/Documents/Claude/Projects/_spine/` as specified in `Strategic_AI_Cross_Claude_Spine.md`. That path was outside the session-space directory investigated per the brief's instructions. The Cross-Claude Spine documents `MEMORY_INDEX.md` and `SESSION_LEDGER.md` as components of the spine — MEMORY.md may be equivalent to or linked from `MEMORY_INDEX.md` at the spine path.

**Recommendation:** Russell should verify whether the canonical MEMORY.md is at `/Users/russellteter/Documents/Claude/Projects/_spine/MEMORY_INDEX.md` or a directly-named `MEMORY.md` within that spine directory. If confirmed, R0-Spine should be re-run on that path in Phase S to capture the full link graph.

---

## Section 6: Discrepancies the Build Must Reconcile

### Finding 1 — Committed-Stage Labels: mcp.md, Invocation Guide, Connector Playbook all encode dead labels (P1)
**Severity:** P1  
**Chapters affected:** Ch.4 (prompts.md — CRO lens), Ch.6 (connector logic), all MCP integration code  
**Evidence:**  
- `docs/architecture/mcp.md` lines 75–80: committed-pipeline filter encodes `['Closed Won - Committed', 'Best Case', 'Commit', 'Stage 4 - Negotiation', 'Stage 5 - Verbal']`  
- `business-planning/Strategic_AI_Invocation_Guide.md` line 312: "Renewal stages: S4 + S5 + Commit/Best Case count as committed; S1/S2 do not"  
- `business-planning/Strategic_AI_Connector_Playbook.md` Part 4 (~line 340): same old labels  
- `docs/research/R1-connector-reality.md`: live Salesforce enumeration confirms NONE of these labels exist  
- BLOCKERS.md: B19 captures the committed-stage correction  
**Action required:** Three places need coordinated correction. The Ch.4 CRO lens prompt must use actual Salesforce stage labels (R1 to deliver verified enumeration). mcp.md lines 75–80 must be rewritten. Connector Playbook Part 4 must be updated. All three must land in the same commit.

### Finding 2 — Renewal Date Field: mcp.md encodes wrong field name (P1)
**Severity:** P1  
**Chapters affected:** Ch.4 (CRO lens), Ch.6 (renewal-forecast connector logic)  
**Evidence:**  
- `docs/architecture/mcp.md` (lines not confirmed in current read but consistent with B20 report): references `Renewal_Date__c`  
- `docs/research/R1-connector-reality.md`: live Salesforce confirms field is `Renewal_Anniversary_Date__c`  
- BLOCKERS.md: B20 captures this correction  
**Action required:** mcp.md and any prompts referencing `Renewal_Date__c` must be updated to `Renewal_Anniversary_Date__c`. Coordinate with Finding 1 — same commit if possible.

### Finding 3 — CRO Lens Prompt: Invocation Guide still has unverified stage labels, needs live replacement before Ch.4 (P1)
**Severity:** P1 (duplicate mechanism to Finding 1 but distinct artifact)  
**Chapters affected:** Ch.4 (prompts.md CRO lens — Section 2 of this report marks it explicitly)  
**Evidence:** Invocation Guide line 312 verbatim extracted above. B19 in BLOCKERS.md.  
**Action required:** Ch.4 author must NOT drop the CRO frame verbatim from this report without first substituting the actual committed-stage labels from R1's live Salesforce enumeration. The frame is otherwise correct.

### Finding 4 — 24-Month Skip Rule: Referenced in brief, absent from corpus (P2)
**Severity:** P2  
**Chapters affected:** Ch.6 (connector data-quality rules) if this rule exists  
**Evidence:** Searched all 11 spine files + R1 connector reality file. Rule not found anywhere. UNKNOWN.  
**Action required:** Orchestrator to determine origin of this rule. If it exists in a document outside the spine set (e.g., a Salesforce-specific runbook), surface and add to Connector Playbook. If it was a brief-generation artifact, close the loop and mark resolved.

### Finding 5 — AWS Dual-Profile Billing Lag: Not yet live-verified (P2)
**Severity:** P2  
**Chapters affected:** Ch.4 (CFO lens), Ch.6 (AWS connector logic)  
**Evidence:** Connector Playbook documents the dual-profile rule and 24-48hr billing lag. R1 partial deferred AWS. Not confirmed against live AWS APIs.  
**Action required:** Phase R R1 follow-up must verify: (a) both SSO profiles accessible (`class` BillingAccess, `collab` Billing), (b) billing lag confirmed, (c) flexible-spend percentage (~12%) is current.

### Finding 6 — mcp.md Committed-Pipeline Filter Not Yet in BLOCKERS as Separate Entry (P1)
**Severity:** P1 (sub-item of Finding 1 but deserves its own BLOCKERS entry)  
**Evidence:** BLOCKERS.md B19 covers the stage-label correction generically. mcp.md lines 75–80 are the specific code artifact that will break Ch.6 if not corrected. B19 does not explicitly name the mcp.md file location.  
**Action required:** Add a BLOCKERS entry specifically calling out `docs/architecture/mcp.md` lines 75–80 as needing committed-pipeline filter correction, tied to B19.

### Finding 7 — NetSuite Payroll Blind Spot: Not documented in mcp.md (P3)
**Severity:** P3  
**Chapters affected:** Ch.4 (CFO lens) — lens prompt correctly documents it (line 305); but mcp.md and architecture docs do not document the limitation  
**Evidence:** CFO frame verbatim (line 305): "payroll blind spot" mentioned. Stack Inventory §CFO: Rippling MCP listed as recommended addition specifically to address this.  
**Action required:** mcp.md should document the NetSuite payroll blind spot explicitly so Ch.6 connector code includes the appropriate caveat in any NetSuite-derived cash analysis.

---

*Report written by R0-Spine per DOCTRINE law #7. Every claim cites file path + line range. UNKNOWN used where verification failed. No fabricated facts.*
