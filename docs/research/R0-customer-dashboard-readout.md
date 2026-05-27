# R0-Customer-Dashboard Readout

**Agent:** R0-Code  
**Date:** 2026-05-26  
**Source repo:** `/Users/russellteter/Claude Code Projects/customer-dashboard/`  
**Scope:** B2 + B18 closure; Phase 0 decision #9 resolution  

---

## 1. Repo Overview

| Item | Value | Source |
|---|---|---|
| Language | Python 3.11 (badge + CI matrix) | `README.md:4`, `.github/workflows/tests.yml:15` |
| Min required | Python 3.10+ | `README.md:48` |
| LOC | ~43K total (22K Python + 19K Jinja2/JS/CSS) | `CLAUDE.md:14` |
| Test suite | 2,654 tests across 48 files | `CLAUDE.md:14` |
| CI/CD | GitHub Actions pytest on Python 3.11 | `.github/workflows/tests.yml:15` |
| Entry point | `python src/main.py` | `src/main.py:635` |
| Package manager | pip + `requirements.txt` (no pyproject.toml) | `requirements.txt:1-30` |

### Package layout

| Module | Purpose | Source |
|---|---|---|
| `src/main.py` | CLI entry point, pipeline orchestration | `src/main.py:1` |
| `src/data_processor.py` | Core ETL: 11K+ lines, load → merge → validate → transform | `src/data_processor.py:1` |
| `src/google_sheets_client.py` | Google Sheets API, OAuth, 1-hour Parquet cache | `src/google_sheets_client.py:1` |
| `src/monitoring.py` | `--health-check` implementation; pipeline run history | `src/monitoring.py:1` |
| `src/data_validator.py` | `--validate` implementation; non-blocking schema checks | `src/data_validator.py:1` |
| `src/metrics.py` | Health scores, renewal urgency, size segments | `CLAUDE.md:173` |
| `src/enhanced_metrics.py` | YoY, quarterly trends, velocity | `CLAUDE.md:174` |
| `src/generator.py` | Jinja2 HTML generation | `CLAUDE.md:177` |
| `config/settings.py` | All thresholds, file paths, feature flags | `config/settings.py:1` |

### Dependency surface (requirements.txt)

Key dependencies: `pandas==2.3.3`, `google-api-python-client==2.156.0`, `google-auth==2.37.0`, `google-auth-oauthlib==1.2.1`, `rapidfuzz>=3.5.0`, `pyarrow>=14.0.0`, `jinja2==3.1.6`, `openpyxl==3.1.5`, `flask==3.1.0` (dev server only).

**Critical absence:** No `msal`, `azure-identity`, `powerbi-rest-api-client`, or any Power BI Python SDK. Power BI is NOT accessed via API from this code.

Source: `requirements.txt:1-30`

---

## 2. Per-Data-Source Readout

### 2a. Power BI — Class Usage (DAX queries)

**What it provides:** Minutes (30d, 90d, 365d), max daily users, avg daily users, session counts, feature adoption (Breakout Rooms, Poll, Whiteboard, Assessment, Recording, Files, Proctor, Browse Web), user roles, platform distribution, account velocity.

**Auth flow:** NONE from Python. Power Automate (external to this repo) executes DAX queries against Power BI datasets and exports results to CSV files in SharePoint/OneDrive. Python reads the pre-exported CSVs via `pandas.read_csv()`. No Azure AD token, no MSAL, no REST API call.

**Data path:**
```
Power BI dataset (DAX)
  → Power Automate flow (weekly, Monday 8:30 PM)
  → SharePoint / OneDrive sync
  → Local path: ~/Library/CloudStorage/OneDrive-SharedLibraries-ClassEDU/ClassEDU - CustomerDashboard/Data/
  → Python: pd.read_csv(POWER_AUTOMATE_FILES["accounts"])
```

**Files read:** `accounts.csv`, `meeting_minutes.csv`, `user_stats.csv`, `opportunities.csv`, `enhanced_opportunities.csv`, `feature_usage.csv`, `support_cases.csv`, `survey_data.csv`, `class_sessions.csv`, `account_calculations.csv`, `account_velocity.csv`, `user_roles.csv` (11 total CSV files).

Source: `config/settings.py:44-77`, `src/data_processor.py:779-1019`, `CLAUDE.md:305-310`

**Freshness:** Weekly automated refresh. Staleness threshold: 45 days (`DATA_FRESHNESS_CONFIG["csv_stale_threshold_days"]`). Source: `src/monitoring.py:264`

**Failure modes:**
- File not found → `DataLoadError` raised, pipeline aborts unless `load_commercial=False` fallback used. Source: `src/data_processor.py:795-811`
- OneDrive sync failure → stale CSVs on disk; pipeline runs with stale data and logs WARNING. Source: `src/monitoring.py:289-295`
- Power Automate flow outage → no new CSV exports; detection via `check_data_freshness()`. Source: `src/monitoring.py:250-342`

**Can refresh without human intervention?** No. Power Automate is the refresh agent; it runs on a schedule outside this Python codebase. Python has zero ability to trigger a new Power BI export.

---

### 2b. Power BI — Collaborate (Monthly Collab/Class dataset)

**What it provides:** Collaborate minutes (30d, 90d), collab days active, monthly collab minutes by PSID (Query 22), collab accounts list.

**Auth flow:** Same pattern as Class Usage — Power Automate exports CSVs, Python reads them. No direct Power BI API access.

**Files read:** `collab_minutes.csv`, `class_monthly_minutes.csv`, `collab_accounts.csv`, `class_monthly_historical.csv`, `collab_monthly_historical.csv`, `collab_monthly_minutes.csv`.

Source: `config/settings.py:67-77`

**Join complexity:** Collaborate uses PSID (Power BI internal site ID), not `Account ID 18 Digit`, as the primary key in source data. `_build_pbi_to_gs_account_id_map()` bridges PSID to Account ID via fuzzy name matching. Source: `CLAUDE.md:265-270`

**Failure modes:** Same as Class Usage — missing CSV → skip enrichment with WARNING (non-blocking per `CLAUDE.md:238`). Stale data detected by `check_data_freshness()`.

---

### 2c. Google Sheets — Master Renewal Playbook

**What it provides:** Account list (SOURCE OF TRUTH), AM assignments, ARR (original + adjusted), renewal dates, renewal quarter, sales stage, geo, country, LMS, contract end dates, OUG status, Collab Minutes rolling columns.

**Auth flow:** OAuth 2.0 via `InstalledAppFlow`. Priority:
1. `GOOGLE_TOKEN_PICKLE` env var (base64-encoded pickle)
2. `.secrets/token.pickle` file (preferred location)
3. `credentials.json` OAuth client secrets file → opens browser for first-time auth

Token auto-refreshes if expired (`creds.refresh(Request())`). No human intervention needed after initial auth IF a valid `token.pickle` exists and the refresh token hasn't been revoked.

Source: `src/google_sheets_client.py:131-189`

**Spreadsheet:** ID `1CJ7qql7UgUkzYaTTCYb8k_Dcid-F4R7vKxMnQc03Xls`, sheet `Collab/Class 2026`. Source: `src/google_sheets_client.py:31-32`

**Scope:** `https://www.googleapis.com/auth/spreadsheets.readonly`. Source: `src/google_sheets_client.py:28`

**Cache:** 1-hour Parquet cache in `cache/` directory. Cache path: `cache/<spreadsheetId>_<sheet_name>.parquet`. Source: `src/google_sheets_client.py:191-203`

**Can refresh without human intervention?** Yes, once `token.pickle` is seeded. The OAuth refresh token handles ongoing re-auth. Exception: if Google revokes the token (rare; requires re-auth via browser).

**Failure modes:**
- `HttpError` from Google Sheets API → raises `DataLoadError`, logged as ERROR. Source: `src/google_sheets_client.py:277-283`
- Quota exhaustion (429) → `HttpError` raised, same handling.
- `credentials.json` missing → `DataLoadError` with setup instructions. Source: `src/google_sheets_client.py:168-176`
- Cache corruption → falls back to fresh fetch with WARNING. Source: `src/google_sheets_client.py:228-230`
- Stale Google Sheets data: no content-staleness check exists for GS (only file-mtime staleness for CSVs). If the AM team stops updating the spreadsheet, the pipeline won't warn.

---

## 3. `-j` JSON Output Schema

The `-j` flag calls `processor.to_json(output_file)` at `src/main.py:272-273`, which calls `self.processed_df.to_dict(orient="records")` — a flat list of raw DataFrame row dicts (NOT the `_prepare_records()` shape used for HTML). NaN → `null`, `pd.Timestamp` → ISO string.

Source: `src/data_processor.py:10024-10065`

**Important distinction:** `-j` exports the raw processed DataFrame (all ~200+ columns from the ETL pipeline). It does NOT export the `_prepare_records()` shaped dict that goes to the HTML template. The two schemas are different. The HTML template uses `to_dict_for_dashboard()` → `_prepare_records()`. The JSON file uses the raw DataFrame columns.

**TypeScript/Zod-ready schema sketch (representative top-level keys from `_prepare_records()` — this is the shape C-Suite should consume):**

```typescript
import { z } from "zod";

// Per-account record (from _prepare_records() output via to_dict_for_dashboard())
const AccountRecord = z.object({
  // Identity
  account_name: z.string().nullable(),
  account_id: z.string().nullable(),          // 18-char Salesforce ID (join key)
  account_id_18: z.string().nullable(),       // alias
  salesforce_url: z.string().nullable(),
  account_manager: z.string().nullable(),
  product: z.string().nullable(),             // "Class", "Collaborate", etc.
  product_type: z.string().nullable(),        // "Class", "Collaborate", "Unknown"
  status: z.string().nullable(),

  // Commercial (from Google Sheets)
  arr_usd: z.number().nullable(),             // effective ARR (adjusted if set, else original)
  arr_adjusted_usd: z.number().nullable(),
  arr_usd_original: z.number().nullable(),
  renewal_date: z.string().nullable(),        // ISO date string or null
  renewal_quarter: z.string().nullable(),     // "Q1", "Q2", etc.
  days_until_renewal: z.number().nullable(),
  renewal_urgency: z.string().nullable(),     // "Critical", "High", "Medium", "Low", "Renewed"
  sales_stage: z.string().nullable(),
  geo: z.string().nullable(),
  country: z.string().nullable(),

  // Usage (Class — from Power BI CSVs)
  minutes_30d: z.number().nullable(),
  minutes_90d: z.number().nullable(),
  users_30d: z.number().nullable(),
  users_90d: z.number().nullable(),
  classes_held_90d: z.number().nullable(),
  usage_trend_pct: z.number().nullable(),

  // Usage (Collaborate — from Power BI CSVs)
  collab_minutes_30d: z.number().nullable(),
  collab_minutes_90d: z.number().nullable(),
  combined_minutes_90d: z.number().nullable(),

  // Health
  health_score: z.number().nullable(),        // 0–100
  health_category: z.string().nullable(),     // "Excellent", "Healthy", "Needs Attention", "Health Risk"
  health_score_method: z.string().nullable(), // "CL", "CB", "FB"

  // Support
  open_case_count: z.number().nullable(),
  critical_case_count: z.number().nullable(),

  // Survey
  survey_avg_star_rating: z.number().nullable(), // 1–5
  survey_response_count: z.number().nullable(),
  survey_apdex_score: z.number().nullable(),

  // Feature adoption
  breakout_adoption_pct: z.number().nullable(),
  poll_adoption_pct: z.number().nullable(),
  recording_adoption_pct: z.number().nullable(),
  feature_adoption_count: z.number(),        // 0–8 count of features with >0% adoption

  // Time-series (nested dicts)
  monthly_usage: z.record(z.any()).nullable(),
  profitability: z.object({
    cost_basis: z.number().nullable(),
    value: z.number().nullable(),
    margin_pct: z.number().nullable(),
    status: z.string().nullable(),
    has_data: z.boolean(),
    is_collaborate: z.boolean(),
    is_partner: z.boolean(),
    effective_moderators: z.number().nullable(),
  }),
  pricing_simulator: z.record(z.any()).nullable(),
  gross_margin: z.record(z.any()).nullable(),
  am_recommendation: z.record(z.any()).nullable(),
}).passthrough(); // ~200+ fields total; passthrough for unlisted fields

// Top-level JSON from to_dict_for_dashboard()
const DashboardData = z.object({
  records: z.array(AccountRecord),
  record_count: z.number(),
  summary: z.object({
    total_accounts: z.number(),
    active_accounts: z.number(),
    avg_health_score: z.number().nullable(),
    total_arr: z.number().nullable(),
    // ... additional summary fields
  }),
  filters: z.object({
    account_managers: z.array(z.string()),
    statuses: z.array(z.string()),
    products: z.array(z.string()),
    health_categories: z.array(z.string()),
    size_segments: z.array(z.string()),
    geo_values: z.array(z.string()),
  }),
  coverage_stats: z.record(z.any()),
  coverage_progress: z.record(z.any()),
  portfolio_trends: z.record(z.any()),
  am_summary: z.record(z.any()),
  validation: z.object({
    is_valid: z.boolean(),
    error_count: z.number(),
    warning_count: z.number(),
  }),
});
```

Source: `src/data_processor.py:10326-10340` (top-level keys), `src/data_processor.py:11317-11866` (`_prepare_records()` field list).

---

## 4. CLI Behavior Reference

| Flag | What it does | Exit code | Output | Source |
|---|---|---|---|---|
| `python src/main.py` | Full pipeline: load all sources, enrich, generate HTML dashboards | 0 success, 1 failure | HTML files in `output/` | `src/main.py:554-625` |
| `-j <path>` | Also export JSON alongside HTML | Same as above | `<path>.json` of raw DataFrame records | `src/main.py:379-383`, `src/data_processor.py:10024-10065` |
| `--health-check` | Runs `PipelineMonitor.run_all_health_checks()` — checks data file freshness, output freshness, recent run history, data completeness, account drift. No dashboard generation. | 0 if `overall_status == "healthy"`, 1 otherwise | stdout: formatted health report | `src/main.py:471-473`, `src/monitoring.py:697-730` |
| `--validate` | Loads data (without Google Sheets), runs `DataValidator.validate_pipeline_data()`. Schema validation: date ranges, integrity. Non-blocking — warnings only. | 0 if `pipeline_healthy`, 1 otherwise | stdout: validation summary | `src/main.py:507-545`, `src/data_validator.py:268-354` |
| `--power-automate` | Force-load from Power Automate CSVs (OneDrive path) | As above | — | `src/main.py:409-410` |
| `--local` | Force-load from local Excel file | As above | — | `src/main.py:411-416` |
| `--no-am-dashboards` | Generate master dashboard only (skip per-AM files) | As above | Single HTML | `src/main.py:418-432` |
| `--show-runs N` | Print last N pipeline run summaries from JSON reports. | 0 | stdout | `src/main.py:476-503` |

**`--validate` is read-only but NOT a dry-run.** It still calls `DataProcessor.process(load_commercial=False)`, which reads and processes CSV files — it just skips Google Sheets. No writes occur. Source: `src/main.py:510-511`

**`--health-check` is fully read-only.** It reads run-report JSON files and file modification times. No data processing. Source: `src/monitoring.py:697-730`

---

## 5. Subprocess Integration Feasibility

**Verdict: Yes, feasible — with important caveats.**

### Recommended subprocess invocation

```bash
python3 src/main.py -j /tmp/cdash-<runId>.json --power-automate
```

Or for health checking:
```bash
python3 src/main.py --health-check
```

### What works

- `-j` produces a complete, well-structured JSON file. NaN → `null`, Timestamps → ISO strings. Source: `src/data_processor.py:10024-10065`
- Exit codes are reliable: 0 = success, 1 = failure. Source: `src/main.py:625-631`
- `--health-check` and `--validate` are non-destructive read-only paths. Source: `src/main.py:471-545`
- The pipeline is self-contained: no daemon, no hot reload needed.

### Caveats

1. **Google Sheets auth requires `token.pickle` on disk** (or `GOOGLE_TOKEN_PICKLE` env var). The subprocess inherits the parent's environment. Russell must seed the token once locally; subsequent refreshes are automatic. Source: `src/google_sheets_client.py:146-189`

2. **Power BI data is NOT fetched at subprocess time.** The subprocess reads pre-exported CSV files from OneDrive. If OneDrive isn't synced or Power Automate hasn't run, data is stale. The subprocess cannot trigger a Power BI export. This is the most significant architectural constraint.

3. **Cold-start time estimate (UNKNOWN — no sample run available):** Based on the pipeline structure: Python startup (~1s), CSV loading + joins (~5-30s depending on data volume), Google Sheets fetch (network-dependent, ~2-5s with cold cache, <0.1s with warm Parquet cache), metrics computation (~2-5s). Total estimate: **10-45 seconds** cold, **5-20 seconds** warm (Parquet cache hit). This is too slow for interactive use; the subprocess should be run as a scheduled background job, not on-demand per C-Suite session.

4. **The `-j` flag exports the RAW DataFrame**, not the `_prepare_records()` shaped dict used by the HTML template. The two schemas diverge. C-Suite should either: (a) call `to_dict_for_dashboard()` output and add a new CLI flag for that shape, or (b) parse the raw DataFrame output and apply its own field mapping. See §3 for the distinction.

5. **stdout/stderr mixing:** The pipeline logs to stderr via Python `logging`. The JSON file is written to disk (not stdout). C-Suite subprocess wrapper should read the output file path, not parse stdout.

6. **No Python version pinning in venv path detection.** C-Suite must invoke `python3` (or the venv's `python`) from within the customer-dashboard's activated virtualenv, or prepend the venv path explicitly: `/path/to/customer-dashboard/venv/bin/python3 src/main.py ...`.

7. **Working directory matters.** `src/main.py` uses `Path(__file__).parent.parent` for project root. It must be invoked from within the `customer-dashboard/` directory OR `PROJECT_ROOT` resolution works correctly regardless of CWD (it does — Path-relative resolution). Source: `src/main.py:14-15`

---

## 6. Phase 0 Decision #9 Recommendation

**Recommendation: (b) Subprocess with stable tool interface.**

**Rationale:**

The codebase is 43K LOC with 2,654 tests and an active phase history (Phase 34+ visible in code). Importing it into C-Suite (option a) would:
- Couple C-Suite to pandas, rapidfuzz, pyarrow, jinja2, flask — all Python dependencies in a Node/Electron app.
- Require maintaining parallel implementations whenever the customer-dashboard ETL evolves.
- Lose the existing 2,654-test safety net (tests are pytest, not jest).

An MCP server (option c) is over-engineered for V1. The subprocess pattern already exists in C-Suite's architecture (`.github/workflows/deploy-dashboard.yml` uses it). The customer-dashboard already has a clean CLI contract.

**What makes (b) work well here:**
- CLI contract is stable: `-j`, `--health-check`, `--validate` are documented flags.
- Exit codes are reliable (0/1).
- JSON output is structurally complete (see §3 Zod sketch).
- The biggest risk (stale data due to Power Automate dependency) exists regardless of integration pattern — it's not solvable by changing the integration shape.

**What to build for (b):** A TypeScript subprocess wrapper in C-Suite's utility process that:
1. Checks for customer-dashboard directory and Python venv.
2. Runs `--health-check` to gate data freshness before a full run.
3. Runs `python3 src/main.py -j /tmp/cdash-<runId>.json --power-automate` for data.
4. Reads and Zod-validates the output JSON.
5. Caches the result (data refreshes weekly; no need to re-run more than once per session).

Source for recommendation basis: `docs/architecture/mcp.md:239`, `src/main.py:379-383`, `src/data_processor.py:10024-10065`, `requirements.txt:1-30`

---

## 7. Ch.8 Architect Deliverables List

The Chapter 8 architect (utility-process integration) must deliver:

1. **Setup runbook (B18 closure):**
   - Step-by-step: install Python 3.11, create venv in `customer-dashboard/`, `pip install -r requirements.txt`.
   - Seed Google Sheets token: run `python src/google_sheets_client.py` once interactively from local machine. This opens a browser OAuth flow and saves `token.pickle`. Russell must do this once.
   - Verify OneDrive sync path is accessible at `~/Library/CloudStorage/OneDrive-SharedLibraries-ClassEDU/...`.
   - Confirm data files exist: `ls ~/Library/CloudStorage/.../CustomerDashboard/Data/*.csv`.
   - Document the venv activation path for subprocess invocation.

2. **Preflight check module** (`src/utilities/customer-dashboard-preflight.ts`):
   - Verify `customer-dashboard/` directory exists at configured path.
   - Verify Python 3.10+ installed.
   - Verify `customer-dashboard/venv/` exists (or system Python has required packages).
   - Run `--health-check` and parse JSON response; surface HealthStatus.CRITICAL as a hard gate.
   - Verify `GOOGLE_TOKEN_PICKLE` env var is set OR `token.pickle` file exists.

3. **Subprocess wrapper module** (`src/utilities/customer-dashboard-runner.ts`):
   - TypeScript class: `CustomerDashboardRunner`.
   - Methods: `runHealthCheck() → HealthReport`, `fetchData(outputPath: string) → void`, `readOutput(outputPath: string) → DashboardData`.
   - Handles: process spawn, timeout (2-minute hard cap), exit-code checking, stderr capture for error logging.
   - Caching: check if output JSON is < N hours old before re-running (data is weekly-refreshed; no benefit to re-running per session).

4. **Zod schema module** (`src/schemas/customer-dashboard.ts`):
   - `AccountRecord` schema (see §3 above, start with 5 key top-level fields, expand as needed).
   - `DashboardData` top-level schema.
   - Validation function: `validateDashboardData(raw: unknown) → DashboardData`.

5. **Environment variable documentation:**
   - `CUSTOMER_DASHBOARD_PATH`: absolute path to `customer-dashboard/` directory.
   - `CUSTOMER_DASHBOARD_PYTHON`: path to Python executable (defaults to `python3`).
   - `GOOGLE_TOKEN_PICKLE` (optional): base64-encoded token for CI/non-interactive environments.

6. **Ch.11 notarization note:** Python is a user-installed prerequisite — it is NOT bundled with or notarized alongside the C-Suite Electron app. The setup runbook must make this explicit: Russell installs Python 3.11 via `brew install python@3.11` or `python.org`, then configures the C-Suite's `CUSTOMER_DASHBOARD_PYTHON` env var. Electron's `app.getAppPath()` cannot resolve `python3` from the macOS app sandbox without explicit configuration. Source: `README.md:48`, `CLAUDE.md:42`

---

## 8. Top Findings / Risks

### Findings that change the architecture assumptions in `docs/architecture/mcp.md §PowerBI`

1. **Power BI data arrives as pre-exported CSVs, not via API.** `mcp.md:253` asked "Current auth flow (Azure AD? PowerBI personal token? Service principal?)." Answer: NONE — no Python code touches Power BI's API. Power Automate exports CSVs weekly. This means C-Suite cannot trigger a fresh Power BI export on demand. Data freshness is bounded by the Power Automate schedule (weekly). Source: `requirements.txt:1-30` (no Azure/PBI SDK), `config/settings.py:44-77` (CSV file paths), `src/data_processor.py:815` (`pd.read_csv()`).

2. **The `-j` flag exports the raw DataFrame, not the template-ready records.** `mcp.md` implies `-j` produces the schema C-Suite would consume. In fact, `to_json()` calls `processed_df.to_dict()` (raw DataFrame), while the HTML template uses `_prepare_records()` (a shaped, aliased, derived-field dict). These schemas diverge significantly. C-Suite should add a new flag or use `to_dict_for_dashboard()` output shape. Source: `src/data_processor.py:10024-10065` vs `src/data_processor.py:11168-11866`.

3. **Google Sheets IS directly API-queried (not CSV).** This is the one data source Python fetches live. It requires a `token.pickle` seeded by an interactive browser OAuth flow. In an Electron app context, the subprocess must have access to either `token.pickle` or `GOOGLE_TOKEN_PICKLE` env var. Source: `src/google_sheets_client.py:131-189`.

4. **Google Sheets is the SOURCE OF TRUTH for the account list.** Dashboard shows ONLY Google Sheets accounts. Power BI usage data is enrichment (LEFT JOIN). If Google Sheets is unavailable, the pipeline has no account list. Source: `CLAUDE.md:119-130`.

5. **No staleness check on Google Sheets content.** File-mtime staleness is checked for CSVs. No equivalent check exists for Google Sheets data content (only for the Parquet cache). If the AM team stops updating the spreadsheet, the pipeline runs without warning. Source: `src/monitoring.py:250-342`.

### Top risks for C-Suite integration

| Risk | Severity | Mitigation |
|---|---|---|
| Power BI data is weekly-refreshed only — no on-demand refresh from C-Suite | High | Cache output JSON; treat as weekly snapshot; surface data age to user |
| Google Sheets `token.pickle` expires or is revoked | High | Preflight check; expose error clearly in C-Suite UI; document re-auth steps in runbook |
| OneDrive sync path varies between machines (primary vs `(2)` suffix) | Medium | Preflight reads `config/settings.py` logic; expose configurable `CUSTOMER_DASHBOARD_PATH` |
| Cold start 10–45s is too slow for interactive use | Medium | Run subprocess on a timer (e.g., nightly), not on-demand per lens |
| `-j` schema drift as customer-dashboard evolves | Medium | Zod `passthrough()` + strict validation on the 15 fields C-Suite actually uses |
| Serialization drift guard (`SerializationDriftError`) can block pipeline on new columns | Low | Already handled internally by `bypass_drift_check` escape hatch; not a subprocess concern |

---

## Citations

All claims above are cited inline. Key source files:
- `customer-dashboard/CLAUDE.md` — authoritative project guide
- `customer-dashboard/src/main.py` — CLI contract
- `customer-dashboard/src/data_processor.py` — ETL, `to_json()`, `_prepare_records()`
- `customer-dashboard/src/google_sheets_client.py` — OAuth + API auth
- `customer-dashboard/src/monitoring.py` — `--health-check` implementation
- `customer-dashboard/src/data_validator.py` — `--validate` implementation
- `customer-dashboard/config/settings.py` — data file paths, feature flags
- `customer-dashboard/requirements.txt` — dependency surface
- `customer-dashboard/README.md` — Python version requirements
- `customer-dashboard/.github/workflows/tests.yml` — CI Python version (3.11)
