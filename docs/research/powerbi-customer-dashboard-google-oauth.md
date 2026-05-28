# PowerBI — Customer-Dashboard Google OAuth Setup

The PowerBI connector spawns the `customer-dashboard` Python subprocess. That subprocess uses Google APIs (Sheets, Drive) to pull data. It requires its own Google OAuth credentials file — entirely separate from the C-Suite app's Gmail OAuth client (`GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET`).

## Why these are different

| What | App | Google Cloud Project | Purpose |
|---|---|---|---|
| Gmail OAuth client | C-Suite (this app) | C-Suite GCP project | Read Russell's Gmail via `gmail.readonly` |
| Customer-dashboard credentials | `customer-dashboard` Python project | Customer-dashboard GCP project | Access Google Sheets / Drive for customer data |

Mixing them would require scopes from two different services on one client, violating least-privilege. The customer-dashboard project has its own GCP project and OAuth client.

## credential file path

Default: `<customer-dashboard-project-dir>/credentials.json`

Override: set `CUSTOMER_DASHBOARD_GOOGLE_CREDENTIALS` env var to an absolute path.

The C-Suite code reads this path via `resolveGoogleCredsPath()` in `apps/utility/src/mcp/powerbi/preflight.ts`. It is checked during preflight — a missing file blocks the subprocess before spawn.

## Setup steps

1. Go to Google Cloud Console for the customer-dashboard project.
2. Navigate to APIs & Services > Credentials.
3. Download the OAuth 2.0 client credentials JSON for the customer-dashboard service.
   - If using a service account: download the service account key JSON instead.
4. Save the file to `<customer-dashboard-project-dir>/credentials.json` (or the path in `CUSTOMER_DASHBOARD_GOOGLE_CREDENTIALS`).
5. Run the customer-dashboard pipeline once manually to complete the OAuth token exchange (Google will open a browser for user consent on first run):
   ```bash
   cd "/Users/russellteter/Claude Code Projects/customer-dashboard"
   source .venv/bin/activate
   python3 src/main.py --no-am-dashboards
   ```
   This writes a `token.json` (or similar) to the project directory, caching the OAuth token for future runs.
6. Re-run the C-Suite smoke script: `./scripts/mcp-live-smoke.sh powerbi`

## What the smoke script checks

1. `credentials.json` present at the resolved path (`preflight.googleCreds === 'ok'`).
2. Subprocess exits 0 and writes the JSON output file.
3. JSON is an array of objects (structural check).

If `credentials.json` is present but the OAuth token exchange is incomplete (first-run authorization not done), the subprocess will fail with an auth error. The smoke script classifies this as DEGRADED (infrastructure config gap, not a code defect) with instructions to run the manual first-time authorization above.

## Smoke classifications

| Condition | Classification |
|---|---|
| `credentials.json` missing | BLOCKED |
| `credentials.json` present, OAuth token exchange incomplete | DEGRADED |
| `credentials.json` present, token valid, subprocess exits 0 | PASS |
| Subprocess exits non-zero for reasons other than Google auth | FAIL |
