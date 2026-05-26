# Strategic AI Connector Playbook

**Companion to:** `Strategic_AI_Operating_Model.md`
**Purpose:** Per-connector capability map, question-to-connector routing table, autonomous-query heuristics, and data-quality discipline. When Russell asks a question, this is where Claude looks first to know how to answer.

---

## Part 1: Per-Connector Capability Map

### 1. Salesforce (classedu.my.salesforce.com)
**Domain:** Pipeline, accounts, contacts, opportunities, campaigns, ICP segmentation, persona, territory, EHR system data, renewals.
**Primary C-level lens:** CRO
**Secondary lenses:** CEO (concentration, board narrative), CMO (segmentation, attribution), CFO (revenue forecasting).

**Top questions it answers:**
- Pipeline coverage by segment / rep / quarter
- At-risk renewals (next 90 days)
- Customer concentration (top 5/10/20 % of ARR)
- ISM→S2 conversion rate
- Activity history per account

**Canonical query patterns:**
- Pipeline coverage: `get_pipeline_summary` first, then drill via SOQL:
  `SELECT Owner.Name, StageName, SUM(Amount), COUNT(Id) FROM Opportunity WHERE CloseDate = THIS_QUARTER AND IsClosed = false GROUP BY Owner.Name, StageName`
- Segment coverage: `get_segment_summary` then:
  `SELECT Account.Current_ICP_Tier__c, Account.Account_Vertical_Segment__c, SUM(Amount) FROM Opportunity WHERE CloseDate <= NEXT_N_DAYS:90 GROUP BY ROLLUP(Account.Current_ICP_Tier__c, Account.Account_Vertical_Segment__c)`
- Concentration:
  `SELECT Account.Name, SUM(Amount) FROM Opportunity WHERE StageName = 'Closed Won' AND CloseDate = LAST_N_DAYS:365 GROUP BY Account.Name ORDER BY SUM(Amount) DESC LIMIT 20`
- Renewals at risk:
  `SELECT Id, Name, Account.Name, Amount, CloseDate, StageName FROM Opportunity WHERE Type = 'Renewal' AND CloseDate <= NEXT_N_DAYS:90 ORDER BY Amount DESC`
- Conversion: `SELECT StageName, COUNT(Id) FROM OpportunityHistory WHERE CreatedDate = LAST_N_DAYS:90 GROUP BY StageName`

**Gotchas:**
- "Committed" definition: S4 + S5 + Commit/Best Case forecast categories. S1/S2 are pipeline only — never include them in a forecast number.
- `Amount` is gross; for ARR, pull custom ARR fields, not Amount.
- `Account_Vertical_Segment__c` and `Current_ICP_Tier__c` are the official rollup dims — do not invent buckets.
- Owner.Name returns terminated reps too — cross-check against the active 41-person roster.

---

### 2. NetSuite
**Domain:** GL, AR, AP, cash, invoices, vendor bills, customers (with entity ID indirection), subsidiaries, FX, accounting books.
**Primary C-level lens:** CFO
**Secondary lenses:** CEO (board financials), CRO (collected vs billed), Chief of Staff (close calendar).

**Top questions it answers:**
- AR aging by customer + days late
- AP aging by vendor + deferrability assessment
- Collections last week vs forecast
- True cash position by entity
- Revenue actuals by customer LTM

**Canonical query patterns:**
- AR aging:
  `SELECT c.entityid, c.companyname, t.tranid, t.trandate, t.duedate, t.foreigntotal, t.currency, (CURRENT_DATE - t.duedate) AS days_late FROM transaction t JOIN customer c ON t.entity = c.id WHERE t.type = 'CustInvc' AND t.status NOT IN ('Paid In Full','Closed') ORDER BY days_late DESC`
- AP aging: same shape, `WHERE t.type = 'VendBill' AND t.status NOT IN ('Paid In Full')` — always cross-check against bank feed.
- Cash position:
  `SELECT a.acctname, a.subsidiary, SUM(tl.foreignamount) FROM account a JOIN transactionline tl ON tl.account = a.id WHERE a.accttype = 'Bank' GROUP BY a.acctname, a.subsidiary`
- Always start with `ns_listSavedSearches` and `ns_listAllReports` — prefer prebuilt over raw SuiteQL.

**Gotchas:**
- **Payroll blind spot** — per-employee comp NOT in NetSuite. Don't derive headcount cost from GL; use local roster + memory.
- Foreign-currency invoices display in local currency; always pull `foreigntotal` AND `currency`, convert with FX rate effective on `trandate`.
- Stale AP entries — bills sit "open" past payment because the close didn't true them up. Cross-reference against bank-feed credits before stating AP.
- Customer/entity ID indirection — `transaction.entity` references `customer.id`, not `entityid`. Always JOIN.
- Two subsidiaries (Class + Coso/Collab) — call `ns_getSubsidiaries` once and filter explicitly.

---

### 3. AWS API MCP (class + collab profiles)
**Domain:** AWS billing, Cost Explorer, service spend, forecasts, usage.
**Primary C-level lens:** CFO
**Secondary lenses:** CEO (largest non-payroll cost).

**Top questions it answers:**
- Where to cut $X of AWS in N days
- Forecast next 3 months by service
- Accounts > $10K/month
- Class vs Collab spend comparison
- Run-rate on RDS / EC2 / DataTransfer specifically

**Canonical query patterns:**
- Always re-auth first if stale: `aws sso login --profile class`, `aws sso login --profile collab` (~12hr token lifetime).
- Top services: `aws ce get-cost-and-usage --time-period Start=2026-04-01,End=2026-05-01 --granularity MONTHLY --metrics UnblendedCost --group-by Type=DIMENSION,Key=SERVICE --profile class`
- By linked account: `--group-by Type=DIMENSION,Key=LINKED_ACCOUNT`
- Forecast: `aws ce get-cost-forecast --time-period Start=2026-05-22,End=2026-08-22 --granularity MONTHLY --metric UNBLENDED_COST --profile class`
- Always run BOTH `--profile class` AND `--profile collab` and sum.

**Gotchas:**
- Class side ~50 accounts, Collab side ~15. Confirm count with `aws organizations list-accounts` per profile before aggregating.
- BillingAccess (class) vs Billing (collab) — different role names. Don't swap.
- SSO tokens expire ~12hr. On ExpiredToken, refresh; don't retry blindly.
- Cost Explorer has 24-48hr lag — yesterday's spend may be partial.

---

### 4. Google Workspace MCP (Gmail, Drive, Docs, Sheets, Slides, Calendar, Tasks, Forms, Chat, Custom Search)
**Domain:** Everything Russell writes, reads, schedules, or shares.
**Primary C-level lens:** Chief of Staff
**Secondary lenses:** All — board docs (CEO), cash model (CFO), pipeline reviews (CRO), campaigns (CMO).

**Top questions it answers:**
- "What's on my calendar this week that needs prep?"
- "Find the latest board deck."
- "What did Chasen email me about Barclays?"
- "Draft a reply to [X]."
- "Open the cash model and pull this week's trough."

**Canonical patterns:**
- Calendar: `get_events` with timeMin = today, timeMax = +7 days; for each external attendee pull last-touch from Gmail + Salesforce.
- File find: `search_drive_files` with name + recency filter; prefer `modifiedTime desc`.
- Gmail thread: `search_gmail_messages` (`from:chasen subject:barclays`) → `get_gmail_thread_content`.
- Cash model: `read_sheet_values` against the May 18 cash model path stored in memory.
- Board prep: `search_drive_files` for "board" + last 30 days → `get_doc_content` or `export_doc_to_pdf`.

**Gotchas:**
- Drive search is keyword, not semantic — try 2-3 phrasings.
- Sheets formulas are NOT evaluated on read of formula cells; pull values, not formulas.
- Calendar events with shared rooms double-count attendees; dedupe by email.

---

### 5. Slack
**Domain:** Internal decisions, real-time signal, who-said-what, file shares.
**Primary C-level lens:** Chief of Staff
**Secondary lenses:** CEO (exec channels), CRO (deal-desk), CFO (#finance).

**Top questions it answers:**
- "What did exec decide about X this week?"
- "Catch me up on last 7 days of decisions."
- "Did anyone discuss the July cash trough?"
- "Who's the right person for X?"

**Canonical patterns:**
- Decision search: `slack_search_public_and_private` with topic + last 7d → `slack_read_thread` on hits.
- Catch-up: identify exec channels (#exec, #leadership, #finance); `slack_read_channel` for each, last 7d.
- Person: `slack_search_users` → `slack_read_user_profile`.

**Gotchas:**
- Search ranks recency loosely — sort by `ts` explicitly.
- Threads NOT returned by channel reads — call `slack_read_thread` per parent msg.
- Private channels Russell isn't in are invisible — never claim "nobody discussed it" without that caveat.

---

### 6. Google Drive standalone (second Drive connector)
Use when you need raw file bytes (download, copy, permission audit) rather than parsed Doc content. Otherwise prefer Workspace Drive.

---

### 7. Computer Use (full desktop control)
Use when driving the local Cash Lever Model v5 (Excel), interacting with non-Workspace tools, final QA of a deliverable. Slow and brittle — always prefer API/MCP first.

---

### 8. Control Chrome + Claude in Chrome
Use for anything behind a login that no MCP covers — Rippling (payroll), DocuSign reports, Barclays portal, Holdco portal.

---

### 9. Desktop Commander
Local filesystem + processes + terminal. Use for editing the Cash Lever Model, running `aws` CLI, kicking python scripts, accessing files at paths stored in memory.

---

### 10. MCP Registry
Use when Russell asks "is there a connector for X?" — `search_mcp_registry` + `suggest_connectors`. For proposing Rippling, Stripe, Barclays-feed connectors.

---

### 11. Plugins Registry
Use when looking for vertical-specific tooling — `search_plugins`.

---

### 12. Skills Registry
Use to invoke existing skills — `list_skills` + `suggest_skills`.

---

### 13. Scheduled Tasks
Persistent recurring or one-shot jobs. Use for "Send Monday cash position every week" / "Refresh AWS forecast monthly" / "Remind me 48hr before each renewal closes."

---

### 14. Cowork Artifacts
Persistent, self-refreshing HTML pages that re-call MCPs on load. Use for live AR aging dashboards, live cash trough tracker, live pipeline coverage page that re-queries on open.

---

### 15. Session Info (`read_transcript`)
Use for "What did I ask you about last Tuesday?" or rebuilding context on a complex thread.

---

### 16. WebSearch + Brightdata
Public web — competitors, market data, news, scraping. WebSearch first for speed; Brightdata for structured scrape (Crunchbase, LinkedIn, G2, hiring pages).

---

### 17. Salesforce DX
Don't use for executive analysis. Reserved for SF admin/dev work — custom fields, deploys, Apex. Mention only if Russell wants a new custom field or report definition.

---

### 18. Chorus.ai (CALL INTELLIGENCE) — connected 2026-05-21
**Domain:** Recorded customer calls, meeting summaries, action items, participant context, account/opportunity links.
**Primary C-level lens:** CRO
**Secondary lenses:** CEO (top-account exec dynamics), CMO (objection patterns), Chief of Staff (1:1 history).

**Top questions it answers:**
- "What did we discuss on the last call with [customer]?"
- "Which at-risk renewal customers have shown competitive mentions in calls?"
- "Has any account stopped engaging on calls before renewal?"
- "What action items have we committed to and not delivered for [account]?"
- "Who at [account] is on every call, who has disappeared?"

**Tools available:**
- `list_engagements` — paginated list of all recorded engagements (cursor-based via `continuation_key`)
- `get_engagement` — single engagement detail with AI-generated `meeting_summary` and `action_items`
- `get_engagement_summary` — summary view
- `list_users` / `get_user` — Chorus user directory
- `search_calls_by_participant` — find calls involving a specific person

**Canonical query patterns:**
- At-risk customer call review: `search_calls_by_participant` for primary customer contact → `get_engagement_summary` on most recent 5 engagements → look for: champion change, competitive mentions, action-item slippage, frequency drop.
- Account-level renewal risk scan: list at-risk SF accounts → `search_calls_by_participant` for each → flag accounts with no calls in last 30 days OR calls with declining sentiment OR new procurement contact appearing late-cycle.
- 1:1 prep with Chasen or board member: `search_calls_by_participant` → `get_engagement_summary` → outstanding action items.

**Gotchas:**
- **No raw transcripts.** Chorus public v3 API does not expose utterance-level transcripts. You get `meeting_summary` and `action_items` only (both AI-generated).
- **Pagination is cursor-based.** `list_engagements` returns `continuation_key`; pass it on the next call. `continuation_key: " "` (single space) means no more results.
- **Account/opportunity links come from CRM bridge.** Cross-reference Chorus engagement with Salesforce via the Account or Opportunity ID where available.
- **AI-generated summaries can miss tone.** Treat "no negative signal in summary" as weak evidence of health, not strong evidence.

**Operating discipline:**
- Weekly Sunday scan: pull all engagements from the past 7 days with at-risk customer accounts. File any findings to `adversarial/customer-defections/` or `stakeholders/customers-at-risk/`.
- Before any major customer-facing decision: query Chorus first for the last 30-90 days of engagement on that account.

---

## Part 2: C-Level Question → Connector Routing Table

### CEO
| Question | Primary | Secondary |
|---|---|---|
| "What's our story for the board?" | NS financials + Cash Model + SF pipeline + concentration | Drive last deck, Slack last week |
| "What does the cap table look like after the next raise?" | Local files + Drive | Memory: `russell_newco_equity_stack` |
| "Which customers are at risk of churn?" | Salesforce (renewal stage + last activity) | Gmail/Slack for recent signal |
| "What's our top customer concentration?" | NS revenue by customer LTM + SF ARR rollup | Cross-check |
| "What changed this week?" | Slack last 7d + Gmail + SF opportunity history | Calendar |

### CFO
| Question | Primary | Secondary |
|---|---|---|
| "What's our cash position this week?" | Cash Lever Model v5 (authoritative) + NS bank balances | AWS for cost |
| "Where can we cut $500K of AWS?" | AWS Cost Explorer (both profiles) | Local AWS deep-dive in CLM |
| "Show me AP aging" | NS SuiteQL on `transaction WHERE type=VendBill` | Verify against bank feed |
| "Show me AR aging" | NS SuiteQL on `CustInvc` | SF for collection-risk context |
| "What's the actual cost of [employee]?" | Local GTM roster (memory) — NOT NetSuite | Rippling via Chrome if needed |
| "What's the variance to plan?" | Cash Lever Model + NS actuals | Drive for plan doc |
| "What's the cost to terminate [employee]?" | Local roster × CFO severance policy | Don't ask NS |
| "Restricted cash status?" | Memory: `class_restricted_cash` + NS bank | Barclays portal via Chrome |

### CRO
| Question | Primary | Secondary |
|---|---|---|
| "What's pipeline coverage by rep?" | SF `get_pipeline_summary` then SOQL by Owner | — |
| "Which renewals close in next 90 days?" | SF SOQL `Type='Renewal' CloseDate<=NEXT_N_DAYS:90` | NS for billed amount validation |
| "Show ISM→S2 conversion" | SF `OpportunityHistory` by stage transition | — |
| "Who's churning and why?" | SF (closed lost + downsell) + Gmail/Slack | NS for revenue drop |
| "Coverage by segment?" | SF `get_segment_summary` + `Account_Vertical_Segment__c` | — |
| "What's our federal customer telling us?" | SF account 360 + Gmail + Slack | News via WebSearch |

### CMO
| Question | Primary | Secondary |
|---|---|---|
| "SEO position vs competitors?" | WebSearch + Brightdata (SERP scrape) | searchfit-seo skills |
| "What content is converting?" | SF campaign attribution + Sheets reports | Custom Search engine |
| "Brand in AI search?" | `searchfit-seo:ai-visibility` + WebSearch | — |
| "Buying committee at [account]?" | SF contacts by `Persona__c/Seniority__c` | Brightdata (LinkedIn fill-in) |
| "What competitor moved this week?" | WebSearch + Brightdata | Scheduled news alerts |

### Chief of Staff
| Question | Primary | Secondary |
|---|---|---|
| "Catch me up on last 7 days of decisions" | Slack search exec channels + Gmail | Calendar recaps |
| "What's on my calendar this week needing prep?" | Google Calendar `get_events` +7d → per-attendee prep | SF account 360 for externals |
| "Open action items I owe?" | Gmail (sent threaded) + Slack mentions + Google Tasks | Drive comments assigned to me |
| "Draft [X] for me" | Gmail `draft_message` + `russell-voice` | — |
| "Schedule recurring [X]" | Scheduled Tasks | — |
| "Live dashboard of [X]" | Cowork Artifacts | — |

---

## Part 3: Autonomous-Query Heuristics

Routing decisions for open-ended questions:

**1. Cash / burn / runway / trough / liquidity** → Local Cash Lever Model v5 FIRST (authoritative), then NS for actuals reconciliation, then AWS for cost lever, then SF for inbound forecast. Never report cash from NS alone — always reconcile to the May 10 weekly forecast.

**2. Customer / account / pipeline / renewal / churn / ARR** → Salesforce FIRST for the CRM state, **Chorus second** for call signal (renewal risk lives here), NS third for billing/revenue validation, then Gmail/Slack for the human signal between calls.

**3. Team / employee / payroll / severance / comp / headcount** → Local files FIRST (GTM roster + CFO severance policy in memory). Explicitly do NOT hit NS for per-employee numbers. Rippling via Chrome only if local roster is stale.

**4. AWS / cloud / infra cost** → Both AWS profiles, always summed. Cross-check against AWS deep-dive in Cash Lever Model.

**5. Competitor / market / news / public company / industry** → WebSearch FIRST for speed, Brightdata for structured scrape, Daloopa for public-comp financial questions.

**6. "What did X say" / "where did we decide" / "who emailed"** → Slack + Gmail in parallel, then Drive for the document.

**7. "What's on my plate" / "catch me up" / "prep me"** → Calendar + Gmail + Slack + Tasks, last 7 days default.

**8. Board / investor / Barclays / debt / capital structure** → Memory files first (debt structure, equity stack), then Drive for latest deck, then NS for actuals, then Gmail for current thread.

**9. Restricted cash / escrow / Coso-TD / BACA** → Memory (`class_restricted_cash`) + NS bank accounts + Barclays portal via Chrome.

**10. Anything ambiguous** → Read recent transcript first (session info), then start with the highest-stakes connector for the inferred role.

**Always parallelize independent calls.** Never serialize NS + SF + AWS if they're independent. Batch in one tool block.

---

## Part 4: Data Quality & Freshness Discipline

Rules Claude must follow every time.

**NetSuite payroll blind spot.** Per-employee comp NOT in NS. Payroll runs through external (Rippling). For any headcount cost / severance / per-person economics, go to local GTM roster (memory: `class_gtm_roster`) and CFO severance policy (memory: `cfo_severance_policy`). Fallback is Rippling via Chrome — never NS GL accounts.

**Foreign-currency invoice display.** NS shows invoices in local currency for foreign customers. Always pull `foreigntotal` AND `currency`; convert to USD using FX rate on `trandate`, not today. If reporting aggregate, state FX assumption explicitly.

**Stale AP entries.** AP bills can sit "open" in NS past payment. Always cross-reference open AP against bank-feed credits in last 30 days before reporting AP balance. When in doubt, footnote as "per NS open AP — may include stale entries."

**Customer/entity ID indirection.** NS `transaction.entity` references `customer.id` (internal numeric), not `entityid` (human-readable). Always JOIN through `customer` table.

**Cash position is owned by the Cash Lever Model.** The May 10 weekly forecast XLSX is the authoritative baseline. W30 trough = $111,766 on July 26 matches board deck slide 16. NS cash is a reconciliation source, not source of truth.

**Salesforce committed-stage definition.** "Committed" = S4 + S5 + Commit/Best Case. S1/S2 are pipeline only. Never include them in forecast numbers. State stage filter when reporting forecast.

**Salesforce custom rollup dims.** Segment uses `Account_Vertical_Segment__c` + `Current_ICP_Tier__c`. ICP uses `Current_ICP__c`. Persona uses `Persona__c` + `Seniority__c`. Never invent buckets.

**Owner.Name includes terminated reps.** Sharae Long and Tomas Novotny exited. Always cross-check Owner.Name against active 41-person roster. Reassign or footnote orphan pipeline.

**AWS profiles & roles.** `class` profile uses `BillingAccess` role; `collab` profile uses `Billing` role. Don't swap. SSO tokens expire ~12hr — on ExpiredToken run `aws sso login --profile <name>` and retry. Always sum class + collab for "AWS spend"; never one alone.

**Cost Explorer lag.** AWS billing data has 24-48hr lag. State date range explicitly on every cost answer.

**Slack search recency.** Search ranks recency loosely. Sort hits by `ts` descending before summarizing. Threads NOT returned by channel reads — call `slack_read_thread` per parent. Private channels Russell isn't in are invisible — never claim "nobody discussed X" without caveat.

**Drive search is keyword.** Try 2-3 phrasings before concluding a file doesn't exist. Prefer `modifiedTime desc`.

**Sheets formula vs value.** Reading a formula cell returns the formula, not the result. Pull values explicitly.

**Computer-use is a last resort.** Slow and brittle. Always prefer MCP/API path; fall back to computer-use or Chrome only when no programmatic path exists.

**Cite the source.** Every number Russell sees in a final answer carries a tag — "(NS SuiteQL, AR aging, pulled today)" or "(Cash Lever Model v5, W30)". Hard rule. If reconciled, name all sources.

**Read memory first.** Before assuming context, read prior transcript (session info). Before assuming policy, read memory files. Russell's auto-memory is the single source of truth for capital structure, severance policy, roster, key open items.

---

*End of connector playbook. Pair with `Strategic_AI_Operating_Model.md` and `Strategic_AI_Invocation_Guide.md`.*
