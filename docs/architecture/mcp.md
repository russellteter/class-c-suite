# MCP Integration

> Six services. Auth flows. Credential storage. Typed query builders. PowerBI via `customer-dashboard-poc`. Implementation contract for Chapter 8. Marks `🔍 R0/R1/R2 VERIFY:` where Phase R must confirm.

## The six services

| Service | Auth | Storage | Phase R verification |
|---|---|---|---|
| **Salesforce** (Class's `classedu.my.salesforce.com`) | OAuth 2.0 PKCE (Connected App) | `safeStorage` refresh token | R1 confirm schemas + Connector Playbook rules |
| **NetSuite** (Class's instance) | TBA tokens (admin-issued) | `safeStorage` consumer/token pairs | R1 confirm SuiteQL enabled; **B1: send TBA request to Brian** |
| **AWS** (Russell's local SSO profiles) | local SSO via `~/.aws/` | profile name + SDK-native cache | R1 confirm `class` + `collab` profiles + account count (~60 per ultraplan, not ~50) |
| **Gmail** | Google OAuth (read-only scope) | `safeStorage` refresh token | R1 confirm required scopes |
| **Chorus** | API key | `safeStorage` API key | R1 confirm `/calls` endpoint shape; B11 confidence cap |
| **PowerBI via `customer-dashboard-poc`** | depends on poc's pattern | `safeStorage` whatever poc needs | **R1 reads poc end-to-end (B2)** |

🔍 R1 VERIFY: any version drift between the Connector Playbook's documented patterns and current API surfaces (Salesforce API version, NetSuite SuiteQL syntax, AWS SDK v3 vs v2 conventions, Google API quota policies).

## Credential storage discipline (locked principle)

**Locked:** no secrets in plaintext, no `.env` files in the repo, no plaintext on disk.

**Implementation:** Electron `safeStorage` API. `safeStorage` uses the macOS Keychain when available (`isEncryptionAvailable()` returns true on Mac). Credentials are encrypted at rest with a system-issued key bound to the app's signing identity.

```typescript
import { safeStorage } from 'electron';

async function saveSecret(service: McpService, key: string, value: string): Promise<void> {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new EncryptionUnavailable('macOS Keychain not available — refusing to write plaintext.');
  }
  const encrypted = safeStorage.encryptString(value);
  // Persist as base64 in SQLite (still encrypted)
  await db.run(
    `INSERT OR REPLACE INTO secrets (service, key, encrypted_b64) VALUES (?, ?, ?)`,
    service, key, encrypted.toString('base64')
  );
}

async function loadSecret(service: McpService, key: string): Promise<string> {
  const row = await db.get(`SELECT encrypted_b64 FROM secrets WHERE service = ? AND key = ?`, service, key);
  if (!row) throw new SecretMissing({ service, key });
  return safeStorage.decryptString(Buffer.from(row.encrypted_b64, 'base64'));
}
```

**`keytar` is deprecated and is NOT used.** (CLAUDE.md §2 explicitly flags this.)

🔍 R1 VERIFY: `safeStorage.isEncryptionAvailable()` returns true on Russell's Mac under the actual signing identity used by electron-builder (B14 — notarization entitlements matter).

## Token refresh + re-consent UX

Every OAuth service has a refresh-token lifecycle. The orchestrator handles:

1. **Silent refresh.** Before any MCP call, check token expiry. If <60s remaining, refresh via the service's refresh-token endpoint. New access token saved via `safeStorage`.
2. **Refresh failure (token revoked / refresh-token expired).** Emit `IpcMessage<'mcp.auth.expired'>` with service name. UI surfaces a banner: "Salesforce session ended — reconnect to continue." Russell clicks → re-runs PKCE flow → new refresh token saved.
3. **In-flight failure mid-scheduled-job.** Scheduled job pauses, writes degraded-mode flag (`auth_expired: salesforce`), surfaces native notification, retries next cron fire if reauth completed.

## Salesforce

Connected App in Class's org with the PKCE flow. Refresh-token strategy (long-lived; new access token every ~2 hours via refresh).

```typescript
type SalesforceConfig = {
  loginUrl: 'https://classedu.my.salesforce.com',
  clientId: string,                      // Connected App consumer key
  redirectUri: 'class-c-suite://oauth/salesforce/callback',
  scopes: ['refresh_token', 'api'],
};
```

**Typed SOQL builder** encodes Connector-Playbook rules. **No string concatenation.** All parameters bind.

```typescript
// Committed pipeline (S4+S5+Commit+BestCase per Connector Playbook)
function committedPipelineQuery(opts: { activeAm?: boolean; stagesIn?: string[] }) {
  const stages = opts.stagesIn ?? ['Closed Won - Committed', 'Best Case', 'Commit', 'Stage 4 - Negotiation', 'Stage 5 - Verbal'];
  return buildSoql({
    select: ['Id', 'Name', 'Amount', 'CloseDate', 'StageName',
             'Account.Name', 'Account_Manager__r.Name', 'Account_Manager__r.IsActive'],
    from: 'Opportunity',
    where: [
      whereIn('StageName', stages),
      ...(opts.activeAm ? [whereEq('Account_Manager__r.IsActive', true)] : []),
      whereGreaterThanOrEqual('CloseDate', isoDateMonthsFromNow(0)),
    ],
    limit: 500,
  });
}

// Renewal forecast — corrects BLOCKERS B7: use Account_Manager__r + IsActive, never Owner.Name.
function renewalForecastQuery(opts: { windowMonths: number }) {
  return buildSoql({
    select: ['Id', 'Name', 'Renewal_Date__c', 'Renewal_Risk__c',
             'Account_Manager__r.Name', 'Account_Manager__r.IsActive'],
    from: 'Account',
    where: [
      whereEq('Account_Manager__r.IsActive', true),
      whereBetween('Renewal_Date__c', isoDateMonthsFromNow(0), isoDateMonthsFromNow(opts.windowMonths)),
    ],
    orderBy: 'Renewal_Date__c',
  });
}
```

🔍 R1 VERIFY: exact Salesforce object/field names against Class's actual schema. The fields `Renewal_Date__c`, `Renewal_Risk__c`, `Account_Manager__r` are spec assumptions — confirm or correct. Use the `salesforce-connector` skill or `sf` CLI.

**Injection defense:** `buildSoql` rejects any value not passed through a parameterized binder. Fuzz test in Ch.8 acceptance: inject SOQL metacharacters into every parameter; expect parametric binding to neutralize.

## NetSuite

TBA tokens. SuiteQL queries. Saved Searches as fallback for things SuiteQL can't express.

```typescript
type NetSuiteConfig = {
  account: 'class_main',                // 🔍 R1 VERIFY
  consumerKey: string,                  // from safeStorage
  consumerSecret: string,                // from safeStorage
  tokenId: string,                       // TBA token id (Brian issues)
  tokenSecret: string,                   // TBA token secret
  apiBase: 'https://<account>.suitetalk.api.netsuite.com',
};
```

**Typed SuiteQL builder** encoding playbook rules: `foreigntotal` for FX-correct cash, payroll-blind-spot exclusion, 24-month skip for closed periods.

```typescript
function cashPositionQuery() {
  return buildSuiteQL({
    select: [
      'TRUNC(t.tranDate, "MM") AS month',
      'SUM(t.foreigntotal) AS net_amount',                   // foreigntotal per Playbook
      'a.acctType',
      'a.acctNumber',
    ],
    from: ['transaction t', 'transactionAccountingLine tal', 'account a'],
    where: [
      'tal.transaction = t.id',
      'tal.account = a.id',
      `a.acctType IN ('Bank', 'OthCurAsset')`,
      `t.tranDate >= TO_DATE('${isoDateMonthsAgo(24)}','YYYY-MM-DD')`,  // 24-month skip
      `t.posting = 'T'`,
      // Payroll blind-spot: PR runs may not post yet at scan time; flag separately.
    ],
    groupBy: ['month', 'a.acctType', 'a.acctNumber'],
    orderBy: 'month DESC',
  });
}
```

🔍 R1 VERIFY: actual SuiteQL syntax + the Saved Searches Russell currently uses; some queries may have to run via Saved Search rather than SuiteQL.

## AWS

Uses Russell's local SSO profiles (`~/.aws/credentials` + `~/.aws/config`). No credential storage by the C-Suite — the AWS SDK handles SSO session cache.

```typescript
import { fromIni } from '@aws-sdk/credential-providers';
import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer';

async function awsSpendSummary(opts: { months: number }) {
  const classCreds = fromIni({ profile: 'class' });
  const collabCreds = fromIni({ profile: 'collab' });

  const [classSpend, collabSpend] = await Promise.all([
    queryCostExplorer(classCreds, opts.months),
    queryCostExplorer(collabCreds, opts.months),
  ]);

  // Connector Playbook rule: SUM class + collab — never report separately as "total."
  return sumSpend(classSpend, collabSpend);
}
```

**Account count verification.** Ultraplan claims spec assumed ~50 AWS accounts; an agent found **60** on the `class` profile. R1 confirms actual count via `aws organizations list-accounts` per profile and updates the autonomy job math.

🔍 R1 VERIFY: SSO session refresh behavior — when SSO expires mid-scheduled-job, surface re-consent in UI.

## Gmail

Google OAuth, read-only `gmail.readonly` scope. Used for: morning brief (recent activity scan), stakeholder activity refresh (look for emails from/to tracked stakeholders).

```typescript
type GmailConfig = {
  clientId: string,
  clientSecret: string,
  redirectUri: 'class-c-suite://oauth/gmail/callback',
  scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
};
```

**No send capability ever.** PRD §5 locks no-auto-distribution.

🔍 R1 VERIFY: refresh-token revocation behavior; Google occasionally revokes refresh tokens on policy changes.

## Chorus

Simple API key. The Chorus call-intelligence endpoint exposes AI-summaries of recorded calls (NOT raw transcripts).

```typescript
type ChorusConfig = {
  apiBase: 'https://chorus.ai/api/v1',  // 🔍 R1 VERIFY current API base
  apiKey: string,
};

async function recentCallSummaries(opts: { sinceDays: number; accountFilter?: string[] }) {
  // Returns AI summaries, NOT raw transcripts.
  return chorus.get('/calls', { params: { since: isoDaysAgo(opts.sinceDays), account_in: opts.accountFilter }});
}
```

**B11 enforcement:** any claim sourced only from Chorus gets confidence capped at <70 in the structured lens output. The lens prompt explicitly instructs: "If Chorus is the only source for a claim, you MUST pair with a Salesforce or NetSuite corroboration before stating with confidence."

## PowerBI via `customer-dashboard-poc`

**Phase R decision #9** resolves the integration shape. **The reading is REQUIRED at V1** — customer-facing playbooks (renewal risk if added, GTM reallocation, strategic option evaluation touching retention, board narrative) need product-usage substrate beyond Salesforce CRM.

### Three integration options (Phase R recommends one)

**(a) Import poc patterns directly into C-Suite.** Copy the connection code, queries, and auth into a new C-Suite module. Pros: no subprocess overhead; full type safety. Cons: takes on maintenance burden; couples C-Suite to PowerBI client library versions.

**(b) Subprocess with stable tool interface (RECOMMENDED until R1 disproves).** Run `customer-dashboard-poc` as a Node child process. C-Suite calls it via a typed CLI interface (JSON-in / JSON-out). Pros: poc stays a separate-evolving artifact; clean tool contract; failure isolation. Cons: serialization overhead; the poc must be wrapped with a CLI entrypoint.

**(c) Wrap as a new MCP server.** Conform to the same pattern as the V1 MCPs. Pros: consistent abstraction across all data sources; agents see PowerBI as "just another tool." Cons: highest engineering investment; only worth it if other consumers will use the MCP later.

🔍 R1 ACTION: R1 reads `customer-dashboard-poc` end-to-end. Document:
- Current auth flow (Azure AD? PowerBI personal token? Service principal?).
- Query patterns (DAX? REST API calls? Pre-rendered dataset extract?).
- Dataset shape (tables, columns, freshness, last-refreshed cadence).
- External dependencies (Node packages, Python? if so, IPC bridge needed).

Then **recommend (a), (b), or (c) with rationale** in `docs/research/phase-r-decisions.md`.

### What each customer-touching playbook consumes

| Playbook | PowerBI signal | Bootstrap-bundle inclusion | Cited source_id |
|---|---|---|---|
| GTM resource reallocation | Per-segment ARR + engagement | All segments' last-90d usage trend | `pbi-segment-usage-<segment>` |
| Strategic option evaluation | Top-10 ARR accounts' usage health | Active/at-risk/declining tiles | `pbi-account-health-<accountId>` |
| Board narrative prep | NRR + churn signals | NRR by cohort + churn-risk count | `pbi-nrr-cohort-q<n>` |
| Quick multi-lens read (when customer-relevant) | Spot account-level signal | Per question; load on-demand | `pbi-account-spot-<accountId>` |

🔍 R1 VERIFY: every signal above against what poc actually exposes. Adjust playbook plans if a signal isn't available.

## Operating-logic skills (R0 decision: invoke as subprocess vs codify)

Russell has skills that encode the playbook logic:

- `weekly-cash-forecast` — drives Monday cash forecast scheduled job.
- `covenant-tracker` — drives covenant proximity in tripwire scan.
- `renewal-forecast` — drives renewal risk in Sunday sweep. **B7: contains `Owner.Name` bug; flag for Russell.**
- `call-intelligence` — drives Chorus sweep.
- `run-critique` — drives Run-Critic agent at end of every run.
- `system-check` — drives morning brief health check.
- `class-aws-connector` — drives AWS queries.
- `salesforce-connector` — drives Salesforce queries.

**R0 decision:** for each skill, decide whether to (1) invoke as a Claude Code subprocess from the C-Suite, or (2) codify the skill's logic into a C-Suite module.

Recommended default: **(1) subprocess for first 2 weeks of operation** to validate behavior against Cowork's working baseline; then incrementally codify (2) the high-traffic ones where subprocess overhead matters. This preserves Russell's ability to update skill behavior in Cowork without rebuilding the C-Suite.

🔍 R0 ACTION: read each skill's source; document inputs/outputs; recommend subprocess vs codify per skill in `docs/research/R0-skill-inventory.md`.

## Open items for Phase R

| Item | Sub-phase | Reference |
|---|---|---|
| **Send NetSuite TBA request to Brian** | R1 (earliest) | B1 |
| Salesforce schema verification (Renewal_Date__c, Account_Manager__r, etc.) | R1 | Connector Playbook rules |
| NetSuite SuiteQL availability + Saved Searches inventory | R1 | Query strategy |
| AWS actual account count per profile | R1 | Per autonomy job math |
| Chorus current API endpoint shape | R1 | Connector contract |
| `customer-dashboard-poc` deep-read + integration recommendation | R1 | Decision #9; B2 |
| Per-skill invoke-vs-codify decision | R0 | Operating-logic skills |
| `safeStorage.isEncryptionAvailable()` under notarization entitlements | R1/R2 | B14 |
