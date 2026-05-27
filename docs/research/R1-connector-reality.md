# R1 — Connector Reality Report (partial — Salesforce + NetSuite verified 2026-05-26)

> Started ahead of /goal Phase R because Russell asked for live verification of Salesforce + NetSuite data access before /goal launches. Salesforce and NetSuite sections are **verified against the live Class production environment**. Remaining sections (AWS, Gmail, Chorus, PowerBI) are deferred to /goal's full R1 pass.

## Surfaces tested and verified

| Service | Surface tested | Auth path | Status | Scope confirmed |
|---|---|---|---|---|
| Salesforce | `sf` CLI (v2.130.9) | `sf.operations@classedu.com` web auth, persistent | **WORKING** | All standard + 325 Account custom fields + 358 Opportunity custom fields readable; 103,749 Accounts in org |
| Salesforce | `mcp__salesforce__*` MCP | Same `sf` CLI auth shared | **WORKING** | `run_soql_query` operational |
| NetSuite | `mcp__claude_ai_Class_Technologies_NetSuite__*` MCP | MCP-managed (existing Class Technologies-branded NetSuite MCP) | **WORKING (read-only via SuiteQL + Saved Searches)** | 4 subsidiaries, 1 Primary Accounting Book, full transaction-table SuiteQL access; REST Web Services metadata endpoint 403 (permission tier) |

**Implication for BLOCKERS B1.** The Brian-TBA-token request remains needed for the **standalone Electron app** at Ch.8 (the C-Suite utility process can't pipe through Claude's MCP — it needs its own direct API auth). BUT for **Phase R discovery, Synthesizer-stage research, and any agent that runs inside Claude Code**, NetSuite is fully accessible today via the MCP. B1's "longest external lead" framing applies only to the runtime Electron path — not to Phase R completion. Severity downgraded P1 → P2.

---

## Salesforce — verified against live Class production org

### Connection
- Org ID: `00D4W000001WPt2UAG`
- Instance: `https://classedu.my.salesforce.com`
- Username: `sf.operations@classedu.com`
- Alias: `class-prod` (default org + default DevHub)
- Auth: web flow, `sf` CLI manages refresh
- Persistence: tokens stored in `~/.config/sf/` and auto-refreshed by the CLI; survives across sessions indefinitely as long as auth isn't revoked.

### Account object — verified schema highlights (325 custom fields total)

**Critical fields for C-Suite playbooks** (verified present):

| Field | Type | Purpose / use |
|---|---|---|
| `Account_ID_18_Digit__c` | string | **Join key with `customer-dashboard`** (PowerBI data uses this) |
| `Account_Manager__c` | reference | **REPLACES `Owner.Name` per BLOCKERS B7** — active AM lookup |
| `Renewal_Anniversary_Date__c` | date | **REPLACES the spec's assumed `Renewal_Date__c`** — see B20 |
| `Renewal_at_Risk__c` | boolean | At-risk flag |
| `Number_of_Open_Renewal_Opportunities__c` | double | Renewal pipeline density |
| `ARR__c` | currency | Account-level ARR |
| `Customer_Health_Level__c` | picklist | **Current health field** (use this) |
| `Customer_Health_Color__c` | string | Health color (visual) |
| `Health_Status__c` | picklist | **"Health Status - Do Not Use"** — superseded; skip |
| `Health_Matrix__c` | url | Link to health matrix doc |
| `Health_Status_Notes__c` | textarea | Free-text health notes |
| `CSM_Name__c` | string | Customer Success Manager |
| `CSM_Meeting_Cadence__c` | picklist | Cadence pattern |
| `CSM_Task_Trigger__c` | boolean | Trigger flag |
| `AE_CSM_Handoff_Meeting__c` | date | Handoff date |
| `Current_ICP_Tier__c` | string | ICP tier |
| `Account_Type__c` | picklist | **Vertical Segment** (corp / gov / EDU / etc.) |
| `Account_Sub_Type__c` | picklist | Vertical Sub Segment |
| `PowerBI_Class_URL__c` | url | **Direct per-account PowerBI link** — surface in memo when relevant |
| `Zoom_Customer__c` | boolean | Zoom platform indicator |
| `Number_of_Open_Opportunites__c` | double | (typo in field name preserved — `Opportunites` not `Opportunities`) |
| `Number_of_Opportunities__c` | double | (correct spelling — different field) |
| `Number_of_Faculty__c` | double | EDU vertical context |
| `Number_of_Students__c` | double | "Full Time Enrollment" |
| `Territory__c` | picklist | Sales territory |
| `SDR_Owner__c` | reference | SDR ownership |
| `Solutions_Engineers__c` | reference | SE assignment |
| `Support_Account_Owner__c` | reference | Support owner |
| `Partner_Contact__c` | reference | Partner relationship |
| `DOZISF__ZoomInfo_Id__c` | string | ZoomInfo enrichment ID |
| `DOZISF__ZoomInfo_Last_Updated__c` | datetime | Enrichment freshness |

### Opportunity object — verified stage labels (corrects major Connector Playbook assumption)

**The Connector Playbook assumed:** `Committed = S4 + S5 + Commit + BestCase` (forecast-category-style).

**Reality (verified from live SOQL `SELECT StageName, COUNT(Id) FROM Opportunity GROUP BY StageName`):**

| Stage label | Active count | Likely classification |
|---|---|---|
| `Closed Won` | 39,154 | terminal — won |
| `Closed Lost` | 31,637 | terminal — lost |
| `Qualified Renewal` | 514 | renewal pipeline (early) |
| `Discovery` | 152 | new-business pipeline (early) |
| `Evaluation` | 80 | new-business pipeline (mid) |
| `Qualified Opportunity` | 74 | new-business pipeline (early-mid) |
| `Renewal Quote Sent` | 50 | renewal pipeline (mid-late) |
| `Outreach` | 35 | new-business pipeline (very early) |
| `Engagement` | 34 | new-business pipeline (very early) |
| `Unsuccessful` | 15 | terminal — lost (alternate label?) |
| `Verbal Approval` | 15 | **committed candidate** |
| `Quote in Review` | 15 | **committed candidate** |
| `Negotiation` | 7 | **committed candidate** |
| `Contracting` | 6 | **committed candidate** |
| `Verbal Agreement` | 4 | **committed candidate** |

**Recommended "Committed" filter** (subject to Russell's confirmation as a Day-Zero form question):
- **New business committed:** `StageName IN ('Verbal Agreement', 'Verbal Approval', 'Contracting', 'Quote in Review', 'Negotiation')` (~47 active deals)
- **Renewal committed:** `StageName IN ('Renewal Quote Sent', 'Qualified Renewal')` (~564 active deals; "Qualified Renewal" is high-volume so may be too early — needs Russell's call)

This needs Russell to confirm what he treats as "committed" in his actual forecast vs. what's just "in the funnel." Add as a Day-Zero form (BLOCKERS B19 mitigation).

### Opportunity object — verified schema highlights (358 custom fields)

Most are marketing-attribution noise (`utmsource__c`, `utmmedium__c`, `GCLID__c`, etc.). The load-bearing ones for C-Suite playbooks:

| Field | Type | Use |
|---|---|---|
| `Paying_Account__c` | reference | Joint pricing / parent-account billing |
| `Loss_Reason__c` | picklist | Closed-Lost analysis |
| `Discovery_Completed__c` | boolean | Pipeline-quality signal |
| `First_Demo_Occurred__c` | date | Sales-cycle timing |
| `Budget_Confirmed__c` | boolean | Pipeline-quality signal |
| `DH_Renewal_Date__c` | date | Renewal date (Opp-level; check vs Account `Renewal_Anniversary_Date__c`) |
| `Primary_Opportunity_Contact_Title__c` | string | Contact context |
| `Inbound_SDR__c` | reference | Attribution |
| `SLA_Addendum__c` | boolean | Contract-shape flag |
| `Early_Adopter__c` | boolean | Cohort flag |

### Verified live SOQL patterns (for typed builder)

```typescript
// CORRECTED: renewal forecast using Account_Manager__c + Renewal_Anniversary_Date__c.
//   Original spec assumed Owner.Name + Renewal_Date__c — both wrong per live data.
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
      whereBetween('Renewal_Anniversary_Date__c', isoDateMonthsFromNow(0), isoDateMonthsFromNow(opts.windowMonths)),
    ],
    orderBy: 'Renewal_Anniversary_Date__c',
  });
}

// CORRECTED: committed pipeline using REAL stage labels.
function committedPipelineQuery(opts: { includeRenewals?: boolean }) {
  const newBizCommitted = ['Verbal Agreement', 'Verbal Approval', 'Contracting', 'Quote in Review', 'Negotiation'];
  const renewalCommitted = ['Renewal Quote Sent'];   // 'Qualified Renewal' likely too early
  const stages = opts.includeRenewals
    ? [...newBizCommitted, ...renewalCommitted]
    : newBizCommitted;
  return buildSoql({
    select: ['Id', 'Name', 'Amount', 'CloseDate', 'StageName',
             'Account.Name', 'Account.Account_ID_18_Digit__c',
             'Account_Manager__r.Name', 'Account_Manager__r.IsActive',
             'Loss_Reason__c', 'Discovery_Completed__c', 'Budget_Confirmed__c'],
    from: 'Opportunity',
    where: [
      whereIn('StageName', stages),
      whereGreaterThanOrEqual('CloseDate', isoDateMonthsFromNow(0)),
    ],
    limit: 500,
  });
}
```

---

## NetSuite — verified via Class Technologies MCP

### Connection
- Surface: `mcp__claude_ai_Class_Technologies_NetSuite__*` (12 tools, already loaded in Claude Code session)
- Auth: MCP-managed (the MCP server runs on Anthropic's side with its own auth to Class's NetSuite). **No TBA tokens needed on Russell's Mac** for this surface.
- Persistence: as long as the MCP plugin is enabled in Claude Code, access persists.
- Scope: read-only via SuiteQL + Saved Searches + Reports + a small set of metadata endpoints.

### Subsidiaries (verified)
```
id=1   Class Technologies, Inc.
id=2   Class Parent Holdco, LLC
id=3   Ele-Class Parent Holdco, LLC
id=-2  Class Parent Holdco, LLC (Consolidated)    [negative ID = consolidated]
```

### Accounting Books
```
id=1   Primary Accounting Book
```

### Limitations discovered
- `ns_getSuiteQLMetadata` returns **HTTP 403 "You do not have permission to access the REST Web Services feature."** Means we can't auto-enumerate the schema, but **SuiteQL queries against known tables work fine.** Workaround: use NetSuite documentation + working query patterns from existing Class artifacts (`weekly-cash-forecast` skill once extracted via Cowork) to learn the schema.

### Live SuiteQL — verified working
Sample query (cash-relevant transactions, last 5 months) succeeded:
```sql
SELECT TO_CHAR(t.trandate, 'YYYY-MM') AS month,
       COUNT(*) AS txn_count,
       SUM(t.foreigntotal) AS net_amount
FROM transaction t
WHERE t.posting = 'T'
  AND t.trandate >= TO_DATE('2026-01-01', 'YYYY-MM-DD')
GROUP BY TO_CHAR(t.trandate, 'YYYY-MM')
ORDER BY month DESC;
```
Returned 7 monthly rows spanning 2026-01 through 2027-02 (a future-dated test posting). Monthly net totals range from -$6.54M (March 2026) to +$21.73M (January 2026). Live cash data is queryable.

### Saved Searches — verified inventory (relevant subset)

**Cash:** 6 found
- `customsearch_atlas_wkly_cshproject_rpt` — **Weekly Cash Projection Overview** (Transaction) — likely the spine of `weekly-cash-forecast`
- `customsearch_esc_my_cash_sales` — My Cash Sales
- `customsearch_atlas_ar_cashoutlay_rpt` — Accounts Receivable Cash Outlay
- `customsearch_atlas_ar_cashincoming_rpt` — Accounts Receivable Cash Incoming
- `customsearch_atlas_ap_cash_outlay_rpt` — Accounts Payable Cash Outgoing
- `customsearch_atlas_accounts_payable_cash` — Accounts Payable Cash Outlay

**Renewal:** 9 found
- `customsearch_class_renewalviewer` — Current Year Renewal Viewer (Contract)
- `customsearch_class_upcm_rnwls_qt` — Upcoming Renewals this Quarter (Contract)
- `customsearch_atlas_saas_renewalrecurring` — Renewal Recurring Revenue (Transaction)
- `customsearch_m_renewals_to_close_90days` — Maintenance Renewals to Close (90 Days) (Transaction)
- `customsearch_ls_renewals_to_close_90days` — License & Support Renewals to Close (90 Days) (Transaction)
- `customsearch_swe_ci_renewal_value` — Contract Item Renewal Value Search
- `customsearch_renewal_uplift_cap_basis_rt` — Renewal Uplift Cap Basis Rate (for script)
- `customsearch_renewal_item_view` — Contract Renewals Item View
- `customsearch_renewal_item_view_2` — tyContract Renewals Item View C (likely test copy)

**Covenant:** 0 found — **`covenant-tracker` has no NetSuite Saved Search backing it.** Must be derived from cash + line-of-credit GL accounts via raw SuiteQL. Confirm covenant definition with Russell via Day-Zero form (BLOCKERS B6 already covers).

---

## What's verified vs what /goal's R1 still must verify

**Verified now (Salesforce + NetSuite):**
- Auth path for both surfaces.
- Live data access scope.
- Real Salesforce schema (Account custom fields, Opportunity custom fields, actual stage labels).
- Connector Playbook stage-label correction.
- Renewal-forecast field correction (`Renewal_Anniversary_Date__c`).
- Active-AM rule field confirmed (`Account_Manager__c` reference, with `IsActive` traversable via `Account_Manager__r.IsActive`).
- NetSuite subsidiaries + accounting books + cash + renewal saved searches.
- NetSuite live SuiteQL works against transaction table.
- Permission limit: REST Web Services metadata endpoint is 403 (not blocking, but limits schema enumeration).

**Deferred to /goal's full R1 pass:**
- AWS: SSO profile names verification; actual account count per profile; `class-aws-connector` extraction (B17).
- Gmail: OAuth scope confirmation; refresh-token behavior.
- Chorus: API endpoint shape; capability scope; B11 mitigation tactics.
- PowerBI: end-to-end read of `customer-dashboard/src/` per B2.
- Skills extracted from Cowork (B17) — wait for the user-driven extraction.
