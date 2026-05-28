# Connector State Matrix

Generated: 2026-05-28
Source: `./scripts/mcp-live-smoke.sh all`

## States

| State | Meaning |
|---|---|
| PASS | Connector authenticated + live query returned expected data |
| DEGRADED | Connector authenticated; downstream permission or data gap (auth OK, external operator action needed — not a code defect) |
| BLOCKED | Operator gate not satisfied (creds not configured, app not launched, project not cloned, etc.) |
| FAIL | Unexpected error — code defect or environment problem |

DEGRADED and BLOCKED exit with code 0. FAIL increments the failure counter and exits non-zero.

## Current state (2026-05-28)

| Connector | State | Reason |
|---|---|---|
| salesforce | PASS | SFDX session valid (user=class-prod); committedPipelineQuery totalSize=5 |
| powerbi | BLOCKED | customer-dashboard Google OAuth credentials.json missing — credentials.json not present at expected path. See docs/research/powerbi-customer-dashboard-google-oauth.md |
| gmail | BLOCKED | GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET not set in environment — Gmail OAuth App not yet configured |
| netsuite | BLOCKED | TBA env vars not set (awaiting Brian's TBA enablement — B1) |
| aws | PASS | Both SSO profiles authenticated (class=783411846536, collab=421879804649) |
| chorus | BLOCKED | Chorus API key not configured (env or vault) |

## Auth probe design (Salesforce)

Salesforce has a typed three-state probe (`SalesforceClient.probeAuth()`) that distinguishes:

1. `connected_app_ok` — Connected App OAuth refresh token present in safeStorage vault. Runtime can query without any external dependencies. Triggered after first-launch OAuth flow with `SALESFORCE_CLIENT_ID` + `SALESFORCE_CLIENT_SECRET`.

2. `sfdx_ok` — No Connected App credential, but SFDX CLI has a live authenticated session. `probeSfdxAuth()` in `sfdx-auth.ts` calls `sf org display --json` to get a fresh access token. Depends on `sf` binary on PATH + session not expired. Renewal: `sf org login web --instance-url https://classedu.my.salesforce.com`.

3. `neither` — Neither vault credential nor live SFDX session. `sfdxDetail` field distinguishes: `sf CLI not on PATH` / `sf CLI installed but no default target-org` / `SFDX session expired`. Recovery path is in the reason string.

The probe is also used by `healthCheck()` to populate `McpHealth.ok` and `McpHealth.lastError`.

## NetSuite DEGRADED classification

When TBA tokens are set and the auth header is accepted, but the token role lacks table permissions (HTTP 400 `INVALID_PARAMETER` + "Record was not found"), the smoke script classifies as DEGRADED (not FAIL). This means:

- Auth is confirmed working (TBA HMAC accepted, session established)
- The gap is a NetSuite role configuration issue — external admin action required
- Code path is correct; no code defect

Fix: Setup > Users/Roles > Manage Roles > [token role] > Permissions > add View access for: Lists>Accounts, Lists>Departments, Lists>Classes, Lists>Employees, Setup>Manage Accounting Periods.

## Action items to reach PASS

| Connector | Required action | Who |
|---|---|---|
| powerbi | Download customer-dashboard credentials.json from Google Cloud Console and place at project root. Run pipeline once manually to complete OAuth flow. | Russell |
| gmail | Set GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET (create OAuth client in Google Cloud Console). App first-launch completes the flow. | Russell |
| netsuite | Provide TBA token env vars (B1 — Brian). Add role permissions for account/department/classification/employee/accountingperiod tables. | Brian (NetSuite admin) |
| chorus | Set CHORUS_API_KEY in environment or complete onboarding flow in app. | Russell |
