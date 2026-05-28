# ADR-0015: NetSuite migration from TBA to OAuth 2.0 via the AI Connector Service (MCP)

## Status

`accepted`

## Date

2026-05-28

## Context

The NetSuite integration shipped on Token-Based Authentication (TBA / OAuth 1.0a) against
the REST SuiteQL endpoint, running under a limited integration role. That role could read
`transaction` and `subsidiary` but returned HTTP 400 "Record not found" (NetSuite's
insufficient-permission signal) for `account`, `department`, `classification`, `employee`,
and `accountingperiod` — the tables the cash-position, payroll, and covenant queries need.
This forced permanent degraded-mode operation (BLOCKERS B1) and a pending role-permission
request to Brian (`docs/external/brian-netsuite-role-perms-request.md`).

Two months ago Russell's NetSuite admin already granted a custom MCP role the permissions
the NetSuite AI Connector Service requires (MCP Server Connection + "Log in using OAuth 2.0
Access Tokens" + REST Web Services) and installed the MCP Standard Tools SuiteApp. OAuth 2.0
runs queries under Russell's user role rather than the limited TBA integration role, so the
five blocked tables should read clean.

## Decision

Migrate NetSuite off TBA/REST-SuiteQL onto **OAuth 2.0 Authorization Code grant with PKCE
(S256), PUBLIC CLIENT (no client secret)**, talking to the **hosted NetSuite AI Connector
Service** (remote MCP server, streamable HTTP, protocol 2025-06-18). Data access goes through
the MCP Standard Tools — `ns_runCustomSuiteQL` for SuiteQL and `ns_runSavedSearch` for saved
searches — not the REST SuiteQL endpoint, because the OAuth **scope is `mcp`**, which does not
grant REST SuiteQL access. The local-loopback OAuth redirect is pinned to the fixed URI
`http://localhost:8765/oauth/callback`. Tokens persist in Electron `safeStorage`; the access
token auto-refreshes ~5 min before expiry. The degraded-mode safety net is retained as a
runtime fallback (credential-absent → query returns null, never throws).

## Rationale

- DOCTRINE law #1 (truth over appearance): scope `mcp` does not authorize REST
  `/services/rest/query/v1/suiteql`. A REST-SuiteQL data path with an `mcp`-scoped token would
  pass every mocked test and then 401 in production — exactly the failure mode that
  `verify-live-endpoints-before-done.md` warns about. Using the MCP tools is the only honest
  path that matches the granted scope.
- The brief explicitly directs the Agent-SDK SSE/streamable-HTTP transport at the hosted URL.
- Oracle's AI Connector FAQ confirms the connector requires Authorization Code + PKCE and a
  non-Administrator role; the Dust connector guide gives the concrete scope (`mcp`) and the
  authorize/token URLs.
- Public client + PKCE (no secret) per Russell's directive and NetSuite's public-client model
  for the AI Connector integration record.

## Considered options

- **OAuth 2.0 + AI Connector MCP tools, scope `mcp`** (chosen) — matches the granted role +
  installed SuiteApp + the scope that is actually authorized; eliminates degraded mode.
- **OAuth 2.0 Bearer against REST SuiteQL, scope `rest_webservices`** — rejected: would require
  a different scope/role grant than the one already provisioned, and the brief/coordinator
  pinned the AI Connector path. Would have 401'd under the `mcp` scope.
- **Keep TBA + ask Brian for the 5 table grants** — rejected: leaves OAuth 1.0a, a manual
  token-rotation burden, and the limited integration role; superseded by the AI Connector path.

## Consequences

- Positive: the 5 previously-blocked tables read under Russell's user role; no manual token
  rotation (refresh tokens are long-lived, access tokens auto-refresh); reusable OAuth
  primitives (`apps/utility/src/mcp/oauth/`) that Gmail can adopt.
- Negative / costs: adds `@modelcontextprotocol/sdk` dependency; data path now goes through
  MCP tool calls (one MCP session per query) rather than direct REST; result-shape parsing
  depends on the `ns_runCustomSuiteQL` tool's JSON payload, which should be verified live.
- Follow-up work: live creds-gated smoke + cash-lever E2E (BUILD-COMPLETE-VERIFY-PENDING-CREDS);
  Gmail (TRACK 5) refactor onto the shared OAuth primitives; main→utility IPC wiring for the
  `connector.netsuite.connect` / `connector.netsuite.status` channels; TRACK 6 restyle of the
  Connectors screen.
- Reversibility: medium — TBA code was removed but git history retains it; reverting means
  restoring `tba-auth.ts` + the OAuth1.0a client.

## Affected artifacts

- `apps/utility/src/mcp/oauth/{pkce,loopbackServer,authCodeFlow,tokenStore,index}.ts` — new reusable OAuth primitives (public client + PKCE, fixed port 8765).
- `apps/utility/src/mcp/netsuite/client.ts` — rewritten onto OAuth + MCP tools.
- `apps/utility/src/mcp/netsuite/mcp-transport.ts` — new; opens MCP session over streamable HTTP with Bearer token.
- `apps/utility/src/mcp/netsuite/oauth-config.ts` — new; endpoints, scope `mcp`, env reader (no secret).
- `apps/utility/src/mcp/netsuite/errors.ts` — added OAuth errors; `NetSuiteTBAExpiredError` kept as deprecated alias.
- `apps/utility/src/mcp/netsuite/{tba-auth.ts}` + its spec — removed.
- `apps/utility/src/playbooks/lib/buildDeps.ts` — dropped TBA env auto-seed (no env seed under OAuth).
- `apps/renderer/src/screens/Connectors.tsx` + `App.tsx` — new Settings → Connectors screen with NetSuite Connect button.
- `apps/main/.env.local` + `.env.local.template` — TBA vars removed; `NETSUITE_OAUTH_CLIENT_ID` + `NETSUITE_OAUTH_REDIRECT_URI` + `NETSUITE_MCP_SERVER_URL` (no secret).
- `scripts/netsuite-smoke-which-tables-work.ts` — OAuth + MCP-tool probe.
- `docs/external/brian-netsuite-role-perms-request.md` — marked SUPERSEDED.
- `docs/research/netsuite-current-state.md` — OAuth canonical role requirement.
- Related ADRs: ADR-0010 (Ch.8 MCP integration — TBA origin).

## Tripwires

- `ns_runCustomSuiteQL` returns a payload shape that fails `NetSuiteQueryResultSchema` after normalization → revisit `parseToolResult`.
- The hosted MCP server requires legacy SSE (`type: 'sse'`) rather than streamable HTTP → revisit `mcp-transport.ts`.
- Token exchange rejects the public-client (no-secret) request → the Integration Record is not a Public Client; revisit the env/config.
- A previously-blocked table still returns permission-denied under OAuth → the user's MCP role lacks View on that table.

---

**Author / agent role:** Backend / connector engineer (TRACK 3)
**Reviewed by Audit/QA in chapter ritual step 6:** pending (BUILD-COMPLETE-VERIFY-PENDING-CREDS)
