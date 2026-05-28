# Ch.8 Wave 2 — Gmail MCP Builder Brief

Pattern-match the Salesforce sub-agent's shape (Ch.8 Wave 1, commits `cacb1e7..9320d7f`). Read those files first — they're your template.

## Contract
`docs/decisions/0010-ch8-mcp-integration.md` §3 (framework) + §7 (Gmail). `packages/shared-types/src/mcp.ts` defines the `McpClient` interface — implement it.

## Working directory
`/Users/russellteter/Claude Code Projects/c-suite/` (quote — has spaces).

## Scope (yours alone — non-overlapping with NetSuite / AWS+Chorus / Notarization)

### `apps/utility/src/mcp/gmail/`
- `client.ts` — `GmailClient implements McpClient` from `@c-suite/shared-types/mcp`. Methods: `searchThreads(query, options)`, `getThread(id)`, `getMessage(id)`, `isAuthenticated()`, `reconnect()`, `healthCheck()`. Auto-refresh on 401.
- `oauth-flow.ts` — Google OAuth 2.0 read-only scope (`https://www.googleapis.com/auth/gmail.readonly`). Browser open + localhost callback :53683 (use a DIFFERENT port from Salesforce :53682 to avoid conflict) + token exchange + `storeCredential('gmail', refreshToken, ...)`. Russell pastes Google Cloud OAuth client_id + client_secret from env vars `GMAIL_CLIENT_ID` + `GMAIL_CLIENT_SECRET` on first OAuth flow.
- `typed-queries.ts`:
  - `recentThreadsByStakeholderQuery({ stakeholderEmail, since })` — used by `stakeholder_1_1`.
  - `recentExecCorrespondenceQuery({ keywords, since })` — used by `board_narrative` + `restructure_decision`.
- `errors.ts` — `GmailAuthExpiredError`, `GmailThreadNotFoundError`, `GmailRateLimitedError`.
- `index.ts` — exports.

### `docs/setup/gmail-oauth-app.md`
Russell-facing setup doc: how to create OAuth client in Google Cloud Console with the read-only scope. 5-step minimum.

### `scripts/mcp-live-smoke.sh`
Append §Gmail section. Smoke: search last 7 days for any thread; assert non-empty response. BLOCKED-flag exit 0 if OAuth not yet set up.

### `tests/unit/mcp/gmail/`
- `client.spec.ts` — isAuthenticated / reconnect / healthCheck / query happy path + 401 retry.
- `typed-queries.spec.ts` — each typed query against a stub returns expected Gmail search query string.

≥15 specs.

## Forbidden inferences

- Reading/writing Gmail bodies that contain credentials, API keys, OAuth tokens, or other sensitive data. Read-only scope is the only scope allowed.
- Storing credentials anywhere except via `storeCredential` (use the safeStorage vault Wave 1 shipped).
- Touching other MCP services.
- `console.log`-ing thread bodies or message contents in production code paths.

## What "done" looks like

- All files written + `pnpm -r typecheck` exit-0 clean.
- All existing tests pass (`pnpm vitest run`). No new failures vs the 80-test pre-existing baseline.
- `scripts/mcp-live-smoke.sh gmail` exits 0 (BLOCKED-flagged if Russell hasn't set up OAuth).
- ≥15 new specs.
- Atomic commits — `ch.8 gmail: <what> — <why>`. No Claude attribution.

## Russell-action items (surface in report)
- Create Google Cloud OAuth client with read-only scope; provide `GMAIL_CLIENT_ID` + `GMAIL_CLIENT_SECRET` env vars on first launch.
- Authorize on first OAuth flow.

## Report-back (≤200 words)
- Commits + first-line.
- Vitest + typecheck results.
- Russell-action items.
