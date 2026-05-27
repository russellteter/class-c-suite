# R1 — Connector Reality Report (partial — Salesforce + NetSuite verified 2026-05-26)

> Started ahead of /goal Phase R because Russell asked for live verification of Salesforce + NetSuite data access before /goal launches. Salesforce and NetSuite sections are **verified against the live Class production environment**. Remaining sections (AWS, Gmail, Chorus, PowerBI) are deferred to /goal's full R1 pass.

## Surfaces tested and verified

| Service | Surface tested | Auth path | R1 Status | Notes |
|---|---|---|---|---|
| Salesforce | `sf` CLI (v2.130.9) | `sf.operations@classedu.com` web auth, persistent | **WORKING** | 325 Account + 358 Opp custom fields; 103,749 Accounts |
| Salesforce | `mcp__salesforce__*` MCP | Same `sf` CLI auth shared | **WORKING** | `run_soql_query` operational |
| NetSuite | `mcp__claude_ai_Class_Technologies_NetSuite__*` MCP | MCP-managed (Class Technologies-branded MCP) | **WORKING (read-only)** | SuiteQL + Saved Searches; REST metadata 403 |
| AWS | AWS CLI SSO profiles (`class`, `collab`) | SSO, browser-based, ~12h expiry | **PARTIAL** | Profiles confirmed; SSO expired; account count UNKNOWN |
| Gmail | Google OAuth 2.0 + PKCE | Browser OAuth → safeStorage refresh token | **NEEDS-RUSSELL** | Scope confirmed; redirect URI correction pending Ch.8 |
| Chorus | Chorus v3 REST API | API key → safeStorage | **PARTIAL** | Base URL corrected; B31 transcript scope conflict |
| PowerBI (customer-dashboard subprocess) | Python subprocess + OneDrive CSVs + GS OAuth | No PBI auth; GS OAuth separate from C-Suite safeStorage | **PARTIAL** | Pattern confirmed; NRR gap; credential separation documented |

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

---

## AWS — PARTIAL (SSO sessions expired; live account count not verifiable today)

**Verified date:** 2026-05-26. SSO tokens for both profiles cached 2026-05-21, `expiresAt` confirmed expired for both. `aws organizations list-accounts --profile class` returned: `Error when retrieving token from sso: Token has expired and refresh failed`. Live count query was not possible.

### 1. Connection (auth path, persistence, scope)

Both profiles confirmed present in `~/.aws/config`. Config verified live:

| Item | Class product | Collaborate product |
|---|---|---|
| Profile name | `class` | `collab` |
| SSO portal URL | `https://d-906761edcb.awsapps.com/start` | `https://d-9067b2215a.awsapps.com/start` |
| Billing payer account ID | `783411846536` (ClassEDU-master) | `421879804649` (bb-master-payer-collab) |
| IAM role | `BillingAccess` | `Billing` (different name — not a typo) |
| Region | `us-east-1` | `us-east-1` |
| SSO region | `us-east-1` | `us-east-1` |
| Token cache | `~/.aws/sso/cache/` (4 JSON files present) | same directory |

Source: `~/.aws/config` (read live 2026-05-26); SSO cache files confirmed present at `~/.aws/sso/cache/` with 4 entries.

SSO tokens live approximately 8–12 hours. Both `expiresAt` values read from cache were 2026-05-21T17:17:50Z and 2026-05-21T17:09:27Z — expired 5 days ago. No refresh token is present in the SSO cache (SSO does not issue long-lived refresh tokens; each session requires a new browser-based `aws sso login` initiation).

### 2. What's verified live vs documented vs UNKNOWN

| Claim | Status | Source |
|---|---|---|
| Both profiles (`class`, `collab`) exist in `~/.aws/config` | **VERIFIED LIVE** | `~/.aws/config` read 2026-05-26 |
| Profile names, SSO URLs, billing account IDs, role names | **VERIFIED LIVE** | same |
| SSO token cache location (`~/.aws/sso/cache/`) | **VERIFIED LIVE** | `ls ~/.aws/sso/cache/` |
| SSO session expires ~12 hours | **DOCUMENTED** | `~/.claude/skills/class-aws-connector/SKILL.md` line 12 |
| `class` profile account count | **UNKNOWN — live query blocked by expired SSO** | SSO error 2026-05-26 |
| `collab` profile account count | **UNKNOWN — live query blocked** | same |
| `class` + `collab` sum rule | **DOCUMENTED** | `~/.claude/skills/class-aws-connector/SKILL.md` lines 40–44; `R0-skill-inventory.md:205` |
| AWS CLI at `/opt/homebrew/bin/aws` | **DOCUMENTED** | `SKILL.md` line 33 |

**Account count — open question:** `mcp.md:187` states a prior agent found 60 on the `class` profile; `SKILL.md` states ~50. `R0-skill-inventory.md:199` documents "~50 accounts, Collaborate ~15." The ultraplan and mcp.md already reflect the 60-vs-50 discrepancy. Count for `collab` is documented as ~15 but also unverified live. **Russell must run the following when next SSO session is active:**

```bash
aws sso login --profile class
aws organizations list-accounts --profile class --output json | jq '.Accounts | length'
# then
aws sso login --profile collab
aws organizations list-accounts --profile collab --output json | jq '.Accounts | length'
```

### 3. Schema / endpoint / query patterns

The C-Suite AWS module uses AWS SDK v3 with SSO profile auth. The pattern documented in `mcp.md:169–185` is correct:

```typescript
import { fromIni } from '@aws-sdk/credential-providers';
import { CostExplorerClient } from '@aws-sdk/client-cost-explorer';
// Profile 'class' → BillingAccess role → ClassEDU-master payer (account 783411846536)
// Profile 'collab' → Billing role → bb-master-payer-collab (account 421879804649)
// Sum both for any "AWS spend" figure — never report one org alone.
```

For organization-level queries: `aws organizations list-accounts` must be called against the payer account (which the billing role grants access to). Cost Explorer queries must also use the payer account for consolidated visibility.

Source: `~/.claude/skills/class-aws-connector/SKILL.md`; `~/.aws/config` verified live.

### 4. Failure modes

**SSO session expiry mid-scheduled-job (B31 — new blocker).** SSO tokens last ~12 hours. The 6am Monday morning brief fires when Russell has been offline overnight. If the last SSO login was Sunday afternoon, the session will be expired by 6am Monday. `aws` CLI calls in the Electron utility process will throw `Token has expired and refresh failed`. The utility process cannot re-initiate `aws sso login` because that requires a browser pop-up (user interaction).

**Required Ch.10 retry semantics:** when any AWS SDK call fails with a credential error, surface in UI as "AWS session expired — run `aws sso login --profile class` and `aws sso login --profile collab` in Terminal." Do NOT silently skip the AWS section of the brief. The brief template must include a `dataSourceStatus` block indicating AWS is stale.

No credential storage in C-Suite `safeStorage` for AWS — the AWS SDK cache is the correct pattern. The SSO token path is `~/.aws/sso/cache/`. The utility process can check whether the cache token is expired BEFORE attempting a query and gate accordingly.

### 5. Architecture corrections for `docs/architecture/mcp.md`

**Patch 1 (mcp.md:187):** Replace "R1 confirms actual count via `aws organizations list-accounts`" with: "SSO sessions expired at time of R1 verification (2026-05-26). Count confirmed open — Russell runs `aws sso login --profile class && aws organizations list-accounts --profile class | jq '.Accounts | length'` at next active session. SKILL.md documents ~50 (class) + ~15 (collab). Prior agent recorded 60 for class. Treat as UNKNOWN pending live verification."

**Patch 2 (mcp.md:189):** Add to the SSO expiry note: "SSO tokens last ~12 hours. If Monday 6am brief fires after an overnight gap, AWS queries will fail. Electron utility process must check token freshness and surface a re-consent prompt (cannot auto-refresh; requires user to run `aws sso login` in Terminal). See B31."

### 6. Open questions for Russell at Ch.8 setup time

- Run the account-count commands above when SSO is active. Update `mcp.md:187` with the confirmed number.
- Confirm the 6am brief timing relative to Russell's typical last-SSO-login. If he logs in early Monday morning, no problem. If he logs in late Sunday, it will expire by brief time. Options: (a) run `aws sso login` as part of brief startup ritual, (b) rely on AWS SSO session extension (not always available depending on org config), (c) skip AWS data in brief if session expired and flag prominently.

---

## Gmail — PARTIAL (no live OAuth verification possible; RFC 8252 correction needed)

**Verified date:** 2026-05-26. No live Gmail OAuth flow verified — correct per brief (R1 cannot run a browser OAuth flow). Research via web sources.

### 1. Connection (auth path, persistence, scope)

**Auth flow:** OAuth 2.0 Authorization Code flow with PKCE (RFC 7636). Required for all native/desktop apps per Google's current guidance. Source: [Google OAuth 2.0 for Desktop Apps](https://developers.google.com/identity/protocols/oauth2/native-app) (current as of April 2026).

**Scope:** `https://www.googleapis.com/auth/gmail.readonly` — confirmed current name. Source: [Choose Gmail API scopes](https://developers.google.com/workspace/gmail/api/auth/scopes). Scope has not been deprecated or renamed.

**Redirect URI — architecture correction (see §5):** `mcp.md:199` specifies `class-c-suite://oauth/gmail/callback` (custom URL scheme). Google's current best practice per RFC 8252 is **loopback IP redirect** (`http://127.0.0.1:<port>`). See §5 for the recommended patch.

**Credential storage:** After first auth, the refresh token is stored in C-Suite's `safeStorage` (Electron's encrypted keychain). All subsequent Gmail API calls use the stored refresh token to obtain short-lived access tokens. No re-consent required unless the refresh token is revoked.

### 2. What's verified live vs documented vs UNKNOWN

| Claim | Status | Source |
|---|---|---|
| `gmail.readonly` scope name is current | **VERIFIED** (web research) | [Google Gmail API Scopes](https://developers.google.com/workspace/gmail/api/auth/scopes) |
| PKCE is required for desktop/native apps | **VERIFIED** (web research) | [Google OAuth for Desktop](https://developers.google.com/identity/protocols/oauth2/native-app) |
| Loopback redirect is recommended over custom scheme | **VERIFIED** (web research) | RFC 8252; [Google Loopback Migration Guide](https://developers.google.com/identity/protocols/oauth2/resources/loopback-migration) |
| Refresh token revocation triggers | **VERIFIED** (web research) | [Google OAuth Policies](https://developers.google.com/identity/protocols/oauth2/policies) |
| Live OAuth callback pattern in Electron | **NEEDS-RUSSELL** | Ch.8 decision required |
| Russell has an OAuth client ID + secret configured | **UNKNOWN** | Not verifiable without Ch.8 setup |

### 3. Refresh-token revocation triggers

Google revokes OAuth refresh tokens under these conditions (source: [Google OAuth Policies](https://developers.google.com/identity/protocols/oauth2/policies); [Nango Blog: invalid_grant](https://nango.dev/blog/google-oauth-invalid-grant-token-has-been-expired-or-revoked/)):

1. **User explicitly revokes access** via Google Account settings.
2. **Password change** — when the token includes Gmail scopes (it does), password changes invalidate the refresh token. Source: [Google Workspace Admin Help](https://support.google.com/a/answer/6328616).
3. **6 months of inactivity** — if the refresh token is not used for 6 months, Google may revoke it. For C-Suite running daily, this is unlikely.
4. **OAuth client credential change or deletion** — if the Google Cloud Console project's client credentials are modified or the project is inactive for 6+ months.
5. **Suspicious activity flag** — Google's automated security systems can revoke tokens.
6. **App in "Testing" mode** — tokens expire in 7 days. The C-Suite OAuth app must be published (not in testing) to avoid this.

**Recovery path:** when the refresh token is revoked, the C-Suite must initiate a new browser OAuth flow. The utility process surfaces a "Re-authorize Gmail" prompt in the UI; the user completes the browser flow, and the new refresh token is stored in `safeStorage`.

### 4. Failure modes

- Refresh token revoked → all Gmail reads fail with `invalid_grant`. Surface re-consent prompt.
- Access token fetch fails (network down) → time out after N seconds; mark Gmail as unavailable in brief.
- Google Workspace admin restricts third-party OAuth access for the `classedu.com` domain → OAuth flow blocked entirely. **UNKNOWN risk — needs Russell to verify with IT/admin at Ch.8.**
- Rate limits: Gmail API free quota is 250 "quota units" per second; read-only morning scan will not approach this limit.

### 5. Architecture corrections for `docs/architecture/mcp.md`

**Patch 3 (mcp.md:196–202) — redirect URI pattern:** Current `mcp.md` specifies `class-c-suite://oauth/gmail/callback`. RFC 8252 and Google's current best practice recommend loopback IP (`http://127.0.0.1:<port>`) for desktop apps. Custom URL schemes require macOS `LSHandlers` registration (which can break in unsigned dev builds and requires code-signing entitlement changes for notarization).

Recommended replacement in `GmailConfig`:

```typescript
type GmailConfig = {
  clientId: string,
  clientSecret: string,
  // RFC 8252 preferred: loopback IP. Ch.8 must register this redirect URI
  // in Google Cloud Console. Port is dynamically allocated at auth time.
  redirectUri: `http://127.0.0.1:${number}/oauth/gmail/callback`,
  scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
};
```

Custom scheme (`class-c-suite://oauth/gmail/callback`) remains as fallback only if loopback port binding fails on the user's machine. Both URIs must be registered in Google Cloud Console. This is a Ch.8 setup question for Russell.

**Patch 4 (mcp.md:206):** Expand the refresh-token revocation note to include the 5 triggers above and add: "If `classedu.com` Google Workspace admin has restricted third-party OAuth, the entire flow may be blocked — verify with IT at Ch.8 setup."

### 6. Open questions for Russell at Ch.8 setup time

1. Does a Google Cloud Console project with OAuth credentials exist for C-Suite? If not, Russell creates one and adds `http://127.0.0.1` (loopback, port-wildcard) and optionally `class-c-suite://oauth/gmail/callback` as authorized redirect URIs.
2. Is the `classedu.com` Google Workspace admin policy permissive of third-party OAuth apps? Some organizations block all non-preapproved OAuth clients.
3. What Gmail scopes does the morning brief actually need? `gmail.readonly` covers all read. If only subject/sender metadata is needed, `gmail.metadata` is narrower and may face fewer admin restrictions.
4. Has the OAuth consent screen been set to "Production" (vs "Testing")? Testing mode tokens expire in 7 days.

---

## Chorus — PARTIAL (verified via API docs + skill source; transcript scope conflict flagged as B31)

**Verified date:** 2026-05-26. No live Chorus API call possible (no API key exposed in this context). Research via web sources and `~/.claude/skills/call-intelligence/SKILL.md`.

### 1. Connection (auth path, persistence, scope)

**Auth:** Simple API key (token-based). No OAuth, no workspace ID required in the auth header. API tokens are generated per Chorus user via Personal Settings. Source: [Chorus API docs](https://api-docs.chorus.ai/); [Stitchflow Chorus.ai User Management API Guide](https://www.stitchflow.com/user-management/chorus.ai/api).

**Auth header format:** `Authorization: <api_key>` (raw token, no "Bearer" prefix). Source: web research (apitracker.io, Stitchflow). Verify against live docs at setup.

**Credential storage:** API key stored in C-Suite `safeStorage`. Pattern is correct per `mcp.md:213–215`.

**Persistence:** API keys do not expire unless manually rotated or the user account is removed. No refresh flow needed.

### 2. What's verified live vs documented vs UNKNOWN

| Claim | Status | Source |
|---|---|---|
| Base URL is `https://chorus.ai/v3/` (not `/api/v1`) | **VERIFIED** (web research) | Web search + [api-docs.chorus.ai](https://api-docs.chorus.ai/); multiple sources cite `v3/engagements` |
| Auth is simple API key, no workspace ID in header | **VERIFIED** (web research) | Chorus docs; Stitchflow guide |
| `Authorization: <token>` format (no "Bearer") | **DOCUMENTED** (web research, unconfirmed against live docs) | Stitchflow; apitracker.io |
| Engagements endpoint at `/v3/engagements` | **VERIFIED** (web research) | Multiple sources cite this path |
| `call-intelligence` skill tools (`list_engagements`, `get_engagement`, etc.) | **DOCUMENTED** | `~/.claude/skills/call-intelligence/SKILL.md` lines 20–26 |
| Rate limits | **UNKNOWN** — not found in web research | See §6 |
| Raw transcript access (full utterance-level) | **CONFLICT** — see B31 below | Multiple web sources conflict |

### 3. Base URL correction — critical architecture patch

`mcp.md:214` hardcodes `apiBase: 'https://chorus.ai/api/v1'`. Web research consistently shows the correct base is `https://chorus.ai/v3/`. The engagements endpoint is `GET https://chorus.ai/v3/engagements`. Source: [Chorus API docs](https://api-docs.chorus.ai/), [getknit.dev Chorus integration](https://developers.getknit.dev/docs/chorus-usecases), [Tray.ai Chorus transcript template](https://docs.tray.ai/library/template/f31cce4d-ba07-4453-b0d0-481641e34e98-get-complete-chorus-call-transcript-by-engagement-id).

The `call-intelligence` skill documents the tool surface as `mcp__chorus__list_engagements`, `mcp__chorus__get_engagement`, `mcp__chorus__get_engagement_summary`, `mcp__chorus__list_users`, `mcp__chorus__get_user`, `mcp__chorus__search_calls_by_participant`. These are Cowork-era MCP tool names. For the C-Suite Electron utility process, the underlying REST call maps to `https://chorus.ai/v3/engagements` (list) and `https://chorus.ai/v3/engagements/<id>` (single engagement + summary).

### 4. Endpoint / query patterns

```typescript
type ChorusConfig = {
  // CORRECTED from mcp.md:214 — was 'https://chorus.ai/api/v1'
  apiBase: 'https://chorus.ai/v3',
  apiKey: string,  // stored in safeStorage; no "Bearer" prefix
};

// List recent engagements (calls/meetings) — corrected endpoint
async function recentCallSummaries(opts: { sinceDays: number; accountFilter?: string[] }) {
  return chorus.get('/engagements', {
    headers: { Authorization: opts.apiKey },  // no "Bearer"
    params: {
      from_date: isoDaysAgo(opts.sinceDays),
      // account_in filter: check Chorus docs at Ch.8 — parameter name unconfirmed
    }
  });
}
```

The `call-intelligence` skill documents the engagement object carries: `meeting_summary` (AI-generated), `action_items` (AI-generated), participants, account/opportunity context. Source: `~/.claude/skills/call-intelligence/SKILL.md` line 8.

**Pagination:** cursor-based via `continuation_key`. A `continuation_key` of `" "` (single space) signals no more results. Source: `call-intelligence/SKILL.md` line 19.

### 5. B11 reality — transcript vs summary conflict (B31 new blocker)

`mcp.md:210` and `call-intelligence/SKILL.md` state: "NOT raw transcripts — AI summaries only." However:

- [Tray.ai](https://docs.tray.ai/library/template/f31cce4d-ba07-4453-b0d0-481641e34e98-get-complete-chorus-call-transcript-by-engagement-id) documents a "Get Complete Chorus Call Transcript by Engagement ID" integration — implying a transcript endpoint exists.
- [getknit.dev](https://developers.getknit.dev/docs/chorus-usecases) states their integration "only includes meetings that have associated transcript utterances" — implying utterance-level transcript data is accessible via API.
- The official Chorus API docs ([api-docs.chorus.ai](https://api-docs.chorus.ai/)) were not directly scrapable in this research pass.

**Conflict:** the skill author may have built `call-intelligence` using only the summary endpoint to reduce token volume (a reasonable choice), even if utterance-level data was available. OR utterance access may require a higher Chorus contract tier that Class does not have. This is unresolved.

**B31 (new):** "Chorus transcript vs summary scope: verify against Class's Chorus contract tier whether utterance-level transcript data is accessible. If yes, `call-intelligence` skill can optionally use raw transcripts for higher-fidelity signals. If no, confirm the AI-summary-only constraint documented in B11 is accurate." Assign P3 (no current workstream blocks on raw transcripts; B11 semantics still apply).

B11 confidence-cap enforcement stands regardless of resolution: any Chorus-only claim capped at <70 confidence. This applies equally to AI summaries and raw transcripts.

### 6. Failure modes

- API key invalid or expired → 401 response; surface "Chorus API key invalid" in UI.
- Engagement not found → 404; log and skip.
- Rate limit hit (limits UNKNOWN) → 429; retry with exponential backoff after 1s, 2s, 4s. If still blocked, skip Chorus for this run.
- Chorus itself is down → timeout; mark Chorus as unavailable; brief proceeds without call intelligence section.

### 7. Architecture corrections for `docs/architecture/mcp.md`

**Patch 5 (mcp.md:214) — base URL correction:** Replace `apiBase: 'https://chorus.ai/api/v1'` with `apiBase: 'https://chorus.ai/v3'`. Verified via web research; multiple sources cite `/v3/engagements`. Source: [api-docs.chorus.ai](https://api-docs.chorus.ai/).

**Patch 6 (mcp.md:218–220) — endpoint path correction:** Replace `/calls` with `/engagements`. The Chorus v3 API uses `/engagements` as the resource name for calls/meetings. The `account_in` filter parameter name may differ; confirm at Ch.8.

**Patch 7 (mcp.md:210) — auth header format note:** Add: "Auth header format is `Authorization: <api_key>` (raw token, no 'Bearer' prefix). Verify against live Chorus docs at Ch.8 — some sources show Basic Auth, others show raw token."

### 8. Open questions for Russell at Ch.8 setup time

1. What is Class's Chorus contract tier? Does it include API access (some tiers restrict API to enterprise contracts)?
2. Is utterance-level transcript data accessible under Class's contract (B31 resolution)?
3. What is the API rate limit under Class's contract?
4. Generate a Chorus API key from Personal Settings and store in C-Suite safeStorage.

---

## PowerBI — Phase 0 decision #9 framing (codebase mechanics in R0-Code report)

**Verified date:** 2026-05-26. Codebase mechanics documented in `docs/research/R0-customer-dashboard-readout.md` (read in full during this R1 pass). This section documents the connector-pattern framing per the brief's scope boundary.

### 1. Connection (auth path, persistence, scope)

Power BI is NOT accessed via API by `customer-dashboard`. There is no Azure AD token, no MSAL SDK, no Power BI REST API call. Source: `R0-customer-dashboard-readout.md §2a`; `requirements.txt` (no `msal`, `azure-identity`, or Power BI SDK present).

**Actual data path:**

```
Power BI dataset (DAX queries)
  → Power Automate flow (weekly, Monday 8:30 PM)
  → SharePoint / OneDrive sync
  → Local path: ~/Library/CloudStorage/OneDrive-SharedLibraries-ClassEDU/...
  → Python pd.read_csv() — no live Power BI connection
```

Source: `R0-customer-dashboard-readout.md §2a`; `config/settings.py:44-77`.

**Google Sheets — separately API-queried (direct, live):** The one data source Python fetches live is Google Sheets (`spreadsheets.readonly` scope). It requires a `token.pickle` seeded by an interactive browser OAuth flow. This is separate from the C-Suite's own Gmail OAuth token. Source: `R0-customer-dashboard-readout.md §2c`.

### 2. What's verified live vs documented vs UNKNOWN

| Claim | Status | Source |
|---|---|---|
| Power BI data arrives as pre-exported CSVs (no API) | **VERIFIED** | `R0-customer-dashboard-readout.md §2a` |
| Power Automate runs weekly (Monday 8:30 PM) | **DOCUMENTED** | `R0-customer-dashboard-readout.md §2a` |
| Google Sheets is SOURCE OF TRUTH for account list | **VERIFIED** | `R0-customer-dashboard-readout.md §8 finding 4` |
| `-j` exports raw DataFrame (NOT `_prepare_records()` shape) | **VERIFIED** | `R0-customer-dashboard-readout.md §3` |
| Subprocess (option b) is viable integration pattern | **VERIFIED** | `R0-customer-dashboard-readout.md §5, §6` |
| NRR cohort signal (`pbi-nrr-cohort-q<n>`) available in output | **NOT FOUND** in `_prepare_records()` — see §4 |

### 3. Phase 0 decision #9 — recommendation

**Recommendation: (b) Subprocess with stable tool interface.** This confirms R0-Code's recommendation (`R0-customer-dashboard-readout.md §6`) from the connector-pattern perspective.

Rationale (R1 perspective, not codebase mechanics):
- The customer-dashboard's data sources (Power Automate CSVs + Google Sheets OAuth) have their own auth state that is entirely separate from C-Suite's MCP auth pattern. Treating this as a subprocess preserves that separation without requiring C-Suite to embed or replicate the auth flows.
- Option (a) (import directly) would require C-Suite to manage `token.pickle` and OneDrive path resolution internally — pulling in Python auth patterns into a Node/Electron codebase.
- Option (c) (MCP server) is over-engineered for V1 and imposes the same auth-management burden as (a), plus the MCP wrapper overhead.
- The subprocess isolation means when Power Automate CSVs are stale, the failure is localized: preflight `--health-check` surfaces it before wasting a full pipeline run.

### 4. Credential-handling delta vs V1 MCPs

V1 MCPs (Salesforce, NetSuite, AWS, Gmail, Chorus) store credentials in C-Suite `safeStorage`. The customer-dashboard subprocess has its own auth state:

- **Power BI data:** no credential at all — pre-exported CSVs on OneDrive. C-Suite has no credential responsibility here.
- **Google Sheets (`token.pickle`):** the subprocess manages this independently (stored at `customer-dashboard/.secrets/token.pickle` or via `GOOGLE_TOKEN_PICKLE` env var). C-Suite should NOT merge this into its own `safeStorage` for V1. Rationale: the subprocess is short-lived per invocation; it reads `token.pickle` at startup and auto-refreshes if needed. The only C-Suite responsibility is ensuring the env var `GOOGLE_TOKEN_PICKLE` is set OR the file path is accessible when the subprocess spawns.

**Recommendation:** Keep the two auth stores separate for V1. C-Suite `safeStorage` holds the 5 V1 MCP credentials. The customer-dashboard subprocess owns its own `token.pickle`. The preflight check (`CustomerDashboardPreflight`) verifies `token.pickle` exists before running; if missing, it surfaces the runbook step for Russell to re-seed.

### 5. Signal availability against `mcp.md §PowerBI` playbook table

Verifying each signal in `mcp.md:262–267` against the `_prepare_records()` schema documented in `R0-customer-dashboard-readout.md §3`:

| Playbook signal (mcp.md) | Available in output? | Notes |
|---|---|---|
| Per-segment ARR + engagement (GTM reallocation) | **YES** — `arr_usd`, `minutes_90d`, `users_90d`, `product`, `geo` all present | Source: R0 §3 schema |
| Last-90d usage trend by segment (GTM) | **YES** — `usage_trend_pct`, `classes_held_90d`, `collab_minutes_90d` | Source: R0 §3 schema |
| Top-10 ARR accounts' usage health (strategic option) | **YES** — `arr_usd`, `health_score`, `health_category`, `account_id` sortable | Source: R0 §3 schema |
| Active/at-risk/declining tiles (strategic option) | **YES** — `health_category` ("Excellent", "Healthy", "Needs Attention", "Health Risk") | Source: R0 §3 schema |
| NRR + churn signals by cohort (board narrative) | **PARTIAL** — individual account `renewal_urgency` and `health_score` are present; NRR as a COMPUTED METRIC (Net Revenue Retention %) is NOT directly exposed in `_prepare_records()` | Source: R0 §3; NRR absent from schema |
| Spot account-level signal (quick multi-lens) | **YES** — all per-account fields in `_prepare_records()` | Source: R0 §3 schema |

**Architecture note on `pbi-nrr-cohort-q<n>`:** This signal ID in `mcp.md:265` assumes NRR by cohort is a pre-computed output. It is not. The customer-dashboard computes individual account health and renewal urgency, but NRR as a portfolio metric requires aggregation across accounts and comparison against a prior-period ARR baseline. C-Suite must compute NRR in the Synthesizer layer from the per-account records, or add a new computation step in the TypeScript wrapper. This is a Ch.8 architecture decision.

### 6. Failure modes (subprocess context)

- OneDrive not synced → stale CSVs → `check_data_freshness()` returns WARNING; preflight surfaces this before full run. Source: `R0-customer-dashboard-readout.md §2a`.
- `token.pickle` revoked → Google Sheets fetch fails → `DataLoadError`; subprocess exits 1; preflight check exposes "Google Sheets auth invalid — re-seed token." Source: `R0-customer-dashboard-readout.md §2c`.
- Cold-start time 10–45s → schedule as nightly background job, not on-demand per lens. Source: `R0-customer-dashboard-readout.md §5 caveat 3`.
- `-j` schema drift as customer-dashboard evolves → Zod `passthrough()` on the 15 fields C-Suite actually uses. Source: `R0-customer-dashboard-readout.md §8 top risks`.

### 7. Architecture corrections for `docs/architecture/mcp.md`

**Patch 8 (mcp.md:253) — auth flow answer:** Replace "Current auth flow (Azure AD? PowerBI personal token? Service principal?)" with: "NO Power BI API auth — data arrives as pre-exported CSVs via Power Automate (weekly, Monday 8:30 PM) to OneDrive. Python reads local CSV files. No Azure AD token, no MSAL. Google Sheets is separately API-queried with OAuth (`spreadsheets.readonly`, `token.pickle`). Source: R0-customer-dashboard-readout.md §2a, §2c."

**Patch 9 (mcp.md:265) — NRR cohort signal:** Add note: "NRR cohort metric (`pbi-nrr-cohort-q<n>`) is NOT a pre-computed output of customer-dashboard. Individual account `renewal_urgency` and `health_score` are present; NRR must be computed by C-Suite Synthesizer layer from per-account records. Ch.8 architect must design this aggregation step."

**Patch 10 (mcp.md:248) — option (b) confirmed:** Update "(RECOMMENDED until R1 disproves)" to "(CONFIRMED by R1)." R0-Code recommended (b); R1 connector-pattern analysis confirms (b) is the right pattern for V1.

### 8. Open questions for Russell at Ch.8 setup time

1. Where is the customer-dashboard repo cloned on the build machine? Configurable via `CUSTOMER_DASHBOARD_PATH` env var per R0-Code §7 runbook.
2. Seed `token.pickle` once by running `python src/google_sheets_client.py` interactively from within customer-dashboard — opens browser OAuth. Russell must do this once before C-Suite can use the subprocess.
3. Confirm OneDrive sync path. R0-Code §7 notes it may vary between machines (possible `(2)` suffix on path). Preflight must handle this.
4. Confirm NRR computation approach: does C-Suite compute NRR from per-account ARR + renewal dates in the records, or does Russell want to expose it differently?

---

## Updated status table

| Service | Surface tested | Auth path | Status | Scope confirmed |
|---|---|---|---|---|
| Salesforce | `sf` CLI (v2.130.9) | `sf.operations@classedu.com` web auth, persistent | **WORKING** | All standard + 325 Account custom fields + 358 Opportunity custom fields readable; 103,749 Accounts in org |
| Salesforce | `mcp__salesforce__*` MCP | Same `sf` CLI auth shared | **WORKING** | `run_soql_query` operational |
| NetSuite | `mcp__claude_ai_Class_Technologies_NetSuite__*` MCP | MCP-managed | **WORKING (read-only via SuiteQL + Saved Searches)** | 4 subsidiaries, full transaction-table SuiteQL access |
| AWS | AWS CLI SSO profiles (`class`, `collab`) | SSO, browser-based, ~12h expiry | **PARTIAL** | Profiles confirmed; SSO expired 2026-05-21; live account count UNKNOWN |
| Gmail | Google OAuth 2.0 + PKCE | Browser OAuth, refresh token → safeStorage | **NEEDS-RUSSELL** | Scope confirmed (`gmail.readonly`); no live OAuth test possible; redirect URI architecture correction pending |
| Chorus | Chorus v3 REST API | API key → safeStorage | **PARTIAL** | Base URL corrected to `https://chorus.ai/v3`; transcript scope conflict flagged as B31 |
| PowerBI (via customer-dashboard subprocess) | Python subprocess + pre-exported CSVs | No PBI auth; Google Sheets OAuth for GS source | **PARTIAL** | Subprocess pattern confirmed; NRR cohort signal gap identified; credential separation documented |
