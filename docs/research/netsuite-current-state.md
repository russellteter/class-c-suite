# NetSuite Current Table Accessibility State

> Last updated: 2026-05-28 (ADR-0015 OAuth migration)
> Account: 603734
> Auth: OAuth 2.0 public client + PKCE via the NetSuite AI Connector Service (MCP), scope `mcp`
> Live probe script: `scripts/netsuite-smoke-which-tables-work.ts`

## Auth model (replaces TBA)

The integration moved off Token-Based Authentication (TBA / OAuth 1.0a + REST SuiteQL) onto
OAuth 2.0 against the hosted NetSuite AI Connector Service (remote MCP server, streamable HTTP).
Queries run via the MCP Standard Tools (`ns_runCustomSuiteQL`, `ns_runSavedSearch`) under
Russell's user (custom MCP) role, **not** the limited TBA integration role.

Canonical role requirement (already granted ~2 months ago):
- **MCP Server Connection** (Full)
- **Log in using OAuth 2.0 Access Tokens** (Full)
- **REST Web Services** (Full) — required for the SuiteQL tool to be visible
- Record/list View permissions for the data the tools should read
- A dedicated custom role (the Administrator role is blocked by design)

## Table accessibility (VERIFY-PENDING-CREDS)

Under the TBA integration role, `account`, `department`, `classification`, `employee`, and
`accountingperiod` returned HTTP 400 permission-denied; `transaction` and `subsidiary` read.

Under OAuth + the user's MCP role these five are **expected to read clean**. This has NOT yet
been verified live — `NETSUITE_OAUTH_CLIENT_ID` is not yet set in `apps/main/.env.local` and
the Integration Record creation is a Russell action. The deny-list cold-start seed was removed
from the client; `isNetSuiteTableReadable` now probes each table live (no pre-poisoned cache).

To verify once creds land:

```
source apps/main/.env.local && npx tsx scripts/netsuite-smoke-which-tables-work.ts
```

Expected: 9 PASS (transaction, subsidiary, account, department, classification, employee,
accountingperiod, customer, vendor), 0 BLOCKED. The script rewrites this file with live results.

## Sources

- Oracle — NetSuite AI Connector Service FAQ (Auth Code + PKCE, non-Admin role):
  https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_4160616848.html
- Oracle — Available Tools in the MCP Standard Tools SuiteApp (SuiteQL / Saved Search tools):
  https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_0902023508.html
- Dust — NetSuite connector config (scope `mcp`, authorize + token URLs):
  https://docs.dust.tt/docs/netsuite
