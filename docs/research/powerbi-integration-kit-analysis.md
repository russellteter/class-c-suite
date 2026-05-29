# PowerBI Integration Kit Analysis

**Generated:** 2026-05-28  
**Kit source:** `/Users/russellteter/Desktop/powerbi_usage_data_transfer_kit/`  
**Existing connector:** `apps/utility/src/mcp/powerbi/`  
**Customer-dashboard project:** `/Users/russellteter/Claude Code Projects/customer-dashboard/`

---

## RUSSELL'S DIRECTIVES (2026-05-28) — these override the kit

1. **DO NOT expose or compute health-score metrics.** The kit's health-score methodology
   (`04_DEFINITIONS_AND_METHODOLOGY/`) is **stale and no longer accurate**. The connector must
   NOT surface `health_score`, `health_category`, `health_score_method`, or
   `health_score_confidence`, and must NOT drive any lens/playbook off them. Expose only the
   raw usage signals (minutes, sessions, users, active days, support cases, feature adoption,
   survey responses) — leave any health rollup to a later, re-derived definition.
2. **Account-master Google Sheet (authoritative source-of-truth for the account list):**
   `https://docs.google.com/spreadsheets/d/1CJ7qql7UgUkzYaTTCYb8k_Dcid-F4R7vKxMnQc03Xls/edit?gid=172562421#gid=172562421`
   This is the sheet `load_commercial_as_base()` reads via `fetch_commercial_data()`. The
   `credentials.json` OAuth client must have read access to this spreadsheet.

---

## Data source and architecture

The kit describes a **CSV-on-disk pipeline**, not a live API. Usage data flows:

```
Power BI (4 datasets) → Power Automate flow "Customer Dashboard - Weekly Data Export"
  → SharePoint → OneDrive sync (local) → Python reads CSVs → health-scored account records → JSON
```

**There is no live API call from Python to Power BI.** (`02_EXTRACTION/EXTRACTION_FLOW.md`: "There is no live API call from Python to Power BI… This is deliberate.")

The 4 Power BI datasets (all confirmed same Class tenant, same IDs as the kit):
- Class Usage — workspace `fb605e88`, dataset `c89c7661`
- Monthly Collab/Class — workspace `986dc016`, dataset `746a255c`
- Class Scorecard — workspace `fb605e88`, dataset `49716d23`
- End User Survey — workspace `fb605e88`, dataset `2672afa7`

Power Automate flow GUID: `7df99b8c-8647-4254-9788-868c71dd382f`  
(`01_DATA_MODEL/POWER_BI_QUICK_REFERENCE.md`)

**Auth model — two-layer:**

1. **Google Sheets auth (BLOCKING for account base):** `load_commercial_as_base()` (`data_processor.py:3592`) calls `fetch_commercial_data()` from `google_sheets_client.py` to load the account master from the "Collab/Class 2026" Google Sheet. This call raises `DataLoadError` on failure — it is not optional. The pipeline cannot run without Google Sheets credentials. This is why `credentials.json` is BLOCKING in the existing preflight. This is **not a red herring**.

2. **OneDrive sync (BLOCKING for usage data):** The 17 usage CSVs must exist at the OneDrive-synced path. The pipeline auto-detects between two paths:
   - Primary: `~/Library/CloudStorage/OneDrive-SharedLibraries-ClassEDU/ClassEDU - CustomerDashboard/Data/`
   - Alt: `~/Library/CloudStorage/OneDrive-SharedLibraries-ClassEDU(2)/Business - Documents/CustomerDashboard/Data/`
   
   **Verified:** Primary path exists and has 17 CSVs. Alt path exists with only 10 CSVs (missing: `class_sessions`, `account_velocity`, `account_calculations`, `user_roles`, `collab_monthly_minutes`, `survey_by_period`). The `settings.py` auto-detect prefers primary; if primary is healthy this is fine. However the Power Automate flow's write target must stay pointed at the primary path or the pipeline silently uses stale sample data from `data/`.

No Power Automate credentials are needed in the C-Suite app — the flow runs on its own schedule and deposits CSVs. Python only reads them.

---

## CSV schema and metrics exposed

The connector exposes **per-account records** (one row per ~330 Class customers) after joining 17 usage CSVs onto the Google Sheets account master:

| CSV | Key fields delivered | Join method |
|-----|---------------------|-------------|
| `accounts.csv` (Power BI base) | Account Name, Subdomain, Product Category, Status, Go Live Date, entitlements | direct |
| `class_monthly_minutes.csv` | minutes by month (12-month series) | Account ID (direct) |
| `meeting_minutes.csv` | daily minutes, activity, recency | subdomain/name (fuzzy) |
| `class_sessions.csv` | session_count, avg_students, session spread | subdomain/name (fuzzy) |
| `account_velocity.csv` | MinutesLast30/Prev30, MaxUsersLast30/Prev30 | Account ID (direct) |
| `collab_minutes.csv` + `collab_accounts.csv` | Collab minutes 30d/90d, days active | PSID → Account ID |
| `feature_usage.csv` | per-feature session counts (76 columns) | school name (fuzzy) |
| `survey_data.csv` | AvgRating, StarCounts, TotalResponses | Account ID / name |
| `support_cases.csv` | open cases, priority, age bins | SF AccountId (direct) |
| `account_calculations.csv` | churn signal counts (lack_of_features, poor_support, poor_ux) | Account ID (direct) |
| `user_roles.csv` | instructor/student/admin/guest counts | subdomain/name (fuzzy) |
| `enhanced_opportunities.csv` | licensed seats, entitlements | Account ID (direct) |
| `collab_monthly_minutes.csv` | monthly Collab minutes per PSID | PSID → Account ID |
| `survey_by_period.csv` | per-period (30d/90d/12mo) Apdex, NPS, rating | subdomain → Account ID (registry) |

**Derived fields to expose (raw usage only — NO health score, per Russell's directive #1):**
- `usage_trend_pct` (30d-vs-90d momentum), `minutes_per_user` (engagement depth)
- `renewal_urgency`, `days_until_renewal` (from commercial/account data, not usage)
- `active_days_90d`, `max_users_30d`/`max_users_90d` (authoritative from `account_velocity.csv`)

**EXCLUDED (stale, do not surface):** `health_score`, `health_category`,
`health_score_method`, `health_score_confidence`, and all health-score modifiers. The
pipeline still computes these internally; the connector must drop them from the exposed
contract and no lens/playbook may consume them. (`DATA_SCHEMA.md`; methodology doc deprecated.)

---

## Subprocess vs. direct API: KEEP the subprocess

The kit explicitly endorses the CSV/subprocess path as "deliberate." Switching to direct Power BI REST API would require:
- Replicating all DAX queries in TypeScript/node
- Implementing the entire 4-layer RapidFuzz reconciliation engine in TypeScript
- Handling all edge cases documented in `05_RULES_LEARNINGS_GOTCHAS.md` (33+ serialization bugs, the SUMMARIZECOLUMNS join-key drop, NaN-is-truthy, etc.)

**Decision: KEEP the subprocess architecture.** The existing `PowerBIClient` in `apps/utility/src/mcp/powerbi/subprocess.ts` is architecturally correct. Only wiring and data-model gaps need fixing.

---

## Top 5 concrete wiring changes needed

### 1. Establish Google Sheets credentials (`credentials.json`) — one-time manual

Russell must:
1. Download the `credentials.json` OAuth client JSON from Google Cloud Console for the customer-dashboard GCP project.
2. Place it at `/Users/russellteter/Claude Code Projects/customer-dashboard/credentials.json` (or set `CUSTOMER_DASHBOARD_GOOGLE_CREDENTIALS` env var).
3. Run the pipeline once manually to complete the OAuth token exchange (browser prompt):
   ```bash
   cd "/Users/russellteter/Claude Code Projects/customer-dashboard"
   python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
   python3 src/main.py --no-am-dashboards
   ```
4. Confirm `token.json` (or equivalent) is written alongside `credentials.json`.

**This is the single hard gate.** Nothing in C-Suite code can substitute for it.

Reference: `powerbi-customer-dashboard-google-oauth.md`, `preflight.ts:resolveGoogleCredsPath()`.

### 2. Verify primary OneDrive path is used (not the alt/partial path)

The primary OneDrive path (`OneDrive-SharedLibraries-ClassEDU`) has all 17 CSVs and must be the active one at runtime. Verify by running:
```bash
python3 -c "
from pathlib import Path
p = Path.home() / 'Library/CloudStorage/OneDrive-SharedLibraries-ClassEDU/ClassEDU - CustomerDashboard/Data'
print('PRIMARY:', p.exists(), list(p.glob('*.csv')) if p.exists() else [])
"
```
If `settings.py` picks the alt path (only 10 CSVs), session-based health scoring degrades to `user-based-fallback` for all Class accounts because `class_sessions.csv` is absent, and `MaxUsersLast30` (from `account_velocity.csv`) is lost.

No C-Suite code change is needed; this is an environment check.

### 3. Expand the Zod schema to include critical missing fields

`schema.ts` validates only 12 fields from a 100+ field record. Add the **raw usage** fields lenses consume — and REMOVE the three existing health-score fields (`health_score`, `health_status`, `health_category`) per Russell's directive #1:

```typescript
// In CustomerDashboardRecordSchema (apps/utility/src/mcp/powerbi/schema.ts):
// REMOVE these (stale — must not be in the exposed contract):
//   health_score, health_status, health_category
// ADD these raw usage signals:
minutes_per_user: z.number().nullable().optional(),
usage_trend_pct: z.number().nullable().optional(),
active_days_90d: z.number().nullable().optional(),
days_until_renewal: z.number().nullable().optional(),
product_category: z.string().nullable().optional(),        // 'Class for Zoom' | 'Class for Microsoft Teams'
subdomain: z.string().nullable().optional(),
account_manager: z.string().nullable().optional(),         // already in schema
open_cases: z.number().nullable().optional(),
avg_rating: z.number().nullable().optional(),
```

The `.passthrough()` on the record schema means the Python pipeline's health-score fields will
still pass through in the raw JSON; the connector layer must **strip** them (or the consuming
lens must ignore them) so a deprecated score never reaches a memo. Removing them from the Zod
contract is the first guard; add an explicit strip in `runFullExport`/`getAccountUsage` as the
second (defense-in-depth).

(`schema.ts`, `DATA_SCHEMA.md`; health-score methodology deprecated per directive #1)

### 4. Replace `stubPowerBiDashboard()` in `gtm-realloc/index.ts` with real data

`gtm-realloc/index.ts:190` calls `stubPowerBiDashboard()` (line 72) which returns static `nrr=1.08`, `grossChurnRate=0.042`, etc. This stub is in the synthesizer section that generates the memo markdown.

The `PowerBIClient.runFullExport()` returns per-account records; it does NOT directly return aggregate NRR/churn. An aggregation layer is needed. Proposed addition in `gtm-realloc/index.ts`:

Aggregate from **raw usage signals only** — no health score (directive #1). Define "low-usage"
by a raw, explainable threshold (e.g. zero minutes in 30d, or no active days in 90d), not a
health category:

```typescript
async function aggregatePbiMetrics(deps: PlaybookDeps, runId: string) {
  if (!deps.powerbi) return null;
  const records = await deps.powerbi.runFullExport({ runId });
  const withUsage = records.filter(r => (r.minutes_90d ?? 0) > 0);
  const dormant = records.filter(r => (r.minutes_30d ?? 0) === 0); // raw, explainable signal
  const avgMinutesPerUser = withUsage.length
    ? withUsage.reduce((s, r) => s + (r.minutes_per_user ?? 0), 0) / withUsage.length
    : null;
  return {
    source: 'powerbi' as const,
    totalAccounts: records.length,
    activeAccounts: withUsage.length,
    dormantAccounts: dormant.length,          // zero usage last 30d — raw signal, not a score
    dormantPct: records.length ? dormant.length / records.length : null,
    avgMinutesPerUser: avgMinutesPerUser,
    // NRR / gross churn / expansion are NOT in usage data — financial source or UNKNOWN.
    // Health score is DEPRECATED (directive #1) — do not compute or expose it.
  };
}
```

Two corrections in one: (a) `nrr`/`grossChurnRate`/`expansionRevenue` are **financial**, not PowerBI — source from Salesforce/NetSuite or mark UNKNOWN, never fabricate onto `source: 'powerbi'`; (b) the at-risk rollup is expressed as a **raw dormancy signal**, not a health category, per directive #1.

(`gtm-realloc/index.ts:72–80, 190–200`)

### 5. Add `account_velocity.csv` to the data availability guard in preflight

`preflight.ts` currently checks: python3 present, project present, venv present, `credentials.json` present. It does not verify that the CSV data files exist or are fresh. Add a data-freshness check:

```typescript
// In preflight.ts — add after googleCreds check:
const dataDir = resolveDataDir(); // reads settings.py path logic or env override
const criticalCsvs = ['accounts.csv', 'meeting_minutes.csv', 'account_velocity.csv', 'class_sessions.csv'];
for (const f of criticalCsvs) {
  const p = join(dataDir, f);
  if (!existsSync(p)) {
    remediation.push(`Missing CSV: ${p} — OneDrive sync may not be complete`);
  }
}
```

This surfaces the "Power Automate flow hasn't run yet" failure mode before the 120-second subprocess timeout.

---

## Live verification procedure (step-by-step)

**Prerequisites:** Steps 1–3 above must be complete (credentials, venv, OneDrive path confirmed).

**Step 1 — Bootstrap venv:**
```bash
cd "/Users/russellteter/Claude Code Projects/customer-dashboard"
python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
```

**Step 2 — Complete Google OAuth (first-run only; browser will open):**
```bash
python3 src/main.py --no-am-dashboards
# Confirm output includes "Loaded N rows from Google Sheets" and "Exported JSON" or no error.
# A token.json (or similar) will be written to the project directory.
```

**Step 3 — Verify data files are present:**
```bash
ls ~/Library/CloudStorage/OneDrive-SharedLibraries-ClassEDU/"ClassEDU - CustomerDashboard/Data/" | wc -l
# Expect 17+. If less than 15, the Power Automate flow needs to run.
```

**Step 4 — Run the C-Suite smoke script:**
```bash
cd "/Users/russellteter/Claude Code Projects/c-suite"
./scripts/mcp-live-smoke.sh powerbi
```
Expected: `record_state "powerbi" "PASS"` with `records: ~330`.

**Step 5 — Spot-check a real record (proves non-stub data):**
```bash
python3 -c "
import subprocess, json
result = subprocess.run(
  ['.venv/bin/python3', 'src/main.py', '-j', '/tmp/cdash-verify.json', '--no-am-dashboards'],
  cwd='/Users/russellteter/Claude Code Projects/customer-dashboard',
  capture_output=True, text=True, timeout=180
)
if result.returncode == 0:
  data = json.loads(open('/tmp/cdash-verify.json').read())
  r = data[0]
  print(f'accounts={len(data)}, first={r.get(\"account_name\",\"?\")[:20]}, minutes_90d={r.get(\"minutes_90d\")}, max_users_90d={r.get(\"max_users_90d\")}')
else:
  print('FAILED:', result.stderr[-500:])
"
```
A PASS shows real account names (not stub) and real raw usage values (`minutes_90d`, `max_users_90d`). Do NOT validate against health-score fields — they are deprecated (directive #1).

**Step 6 — Confirm lens consumption (after wiring change #4):**
After replacing `stubPowerBiDashboard()`, run `npx vitest run apps/utility/src/playbooks/gtm-realloc/` and verify the test no longer uses the hardcoded nrr=1.08 value.

---

## Gaps and risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Google Sheets credentials missing** — `credentials.json` not present; `load_commercial_as_base()` raises `DataLoadError`; pipeline cannot start at all. Currently BLOCKED. | Critical | Russell places credentials.json and runs manual first-run auth (Step 1 above). No code workaround exists. |
| **OneDrive sync staleness** — Power Automate flow runs weekly. If OneDrive is paused or the flow fails, CSVs are up to 7+ days old. The pipeline has no freshness guard; it silently uses stale data. | High | Add mtime check in preflight for `meeting_minutes.csv` (>8 days old → DEGRADED). |
| **Primary vs alt OneDrive path** — `settings.py` auto-detect logic picks the first existing path. If `OneDrive-SharedLibraries-ClassEDU` is absent (e.g., Mac synced to alt), settings picks the alt which has only 10 CSVs, dropping `class_sessions`, `account_velocity`, and 5 others. Raw signals silently disappear: no session counts, and `MaxUsersLast30` (the authoritative user count) is lost for all ~208 Class accounts. | High | Add CSV presence check in preflight (Change #5). Log which path was selected. |
| **`user_stats.csv` overcounts users (gotcha E4)** — summing `count` across rows massively overcounts unique users. `account_velocity.csv`'s `MaxUsersLast30` is the authoritative source. If the schema or lens code reads `user_stats` for user counts, numbers are wrong. | Medium | Use `MaxUsersLast30` from `account_velocity.csv`. Do not sum `user_stats.csv`. Cite: `05_RULES_LEARNINGS_GOTCHAS.md §E4`. |
| **Serialization gate** — any new field added to `CustomerDashboardRecordSchema` or any `enrich_with_*` method that is not threaded through `_prepare_records()` in `data_processor.py` silently disappears from JSON output. 33+ bugs in the source project. | Medium | Per `05_RULES_LEARNINGS_GOTCHAS.md §C1`: any field added to the schema must be verified to actually appear in the output JSON before declaring done. |
| **NRR/gross-churn are not in usage data** — `stubPowerBiDashboard()` puts financial metrics (nrr, grossChurnRate, expansionRevenue) on a `source: 'powerbi'` object. These fields do not exist in per-account usage records; they must come from a financial source (NetSuite AR, Salesforce opportunities). The stub masks a data-model gap. | Medium | `aggregatePbiMetrics()` in Change #4 explicitly marks them UNKNOWN. Wire financial metrics from NetSuite/Salesforce in a later chapter. |
| **120s subprocess timeout** — if OneDrive has full 17 CSVs and Google Sheets is slow, the pipeline can take 90–150s. `POWERBI_SUBPROCESS_TIMEOUT_MS` defaults to 120s. | Low | Set `POWERBI_SUBPROCESS_TIMEOUT_MS=180000` in `.env.local`. Add to CLAUDE.md / .env.local documentation. |
| **`SUMMARIZECOLUMNS` join-key loss** — `survey_by_period.csv` uses a SUMMARIZECOLUMNS query that drops the Account ID. Python must rebuild the join via `build_master_subdomain_registry()`. This is already implemented in `data_processor.py`; but if someone modifies the DAX query for this CSV without understanding the constraint, the join will silently break. | Low | Document in connector's inline comments. Do not modify Q12b DAX without reading gotcha A1. |

---

## What transfers vs what is Class-specific

The C-Suite uses the **same tenant, same datasets, same Power Automate flow** as the customer-dashboard source project. Per `06_ADAPT_TO_YOUR_SOURCE.md §If SAME source`: "You only need access, not changes." The dataset IDs, DAX queries, CSV schemas, and column names in the kit apply as-is to this project. No schema-discovery or re-keying is needed.

**Class-specific items to build fresh (do not copy from kit):**
- `manual_match_overrides.csv` — start empty from `03_INTEGRATION_CODE/manual_match_overrides.SCHEMA.csv`, grow as mismatches surface.
- `INTERNAL_ACCOUNT_PATTERNS` — replace with Class internal/test account names if different.

---

## Decision: subprocess vs. direct PowerBI API

**Recommendation: KEEP the subprocess.** The kit architecture is "no live API call from Python to Power BI — this is deliberate." Direct REST API would require replicating the DAX queries, the reconciliation engine, and all serialization discipline in TypeScript. The existing `PowerBIClient` subprocess wrapper is the correct integration boundary. The five changes above wire it correctly; none require architectural replacement.

---

*This document is the Phase 2 implementation brief for the PowerBI connector. Drive all code changes from the five wiring items above. Verify the live smoke (Step 4–5) before declaring any change done.*
