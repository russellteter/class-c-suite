# Gmail First-Launch UX

Source: `apps/utility/src/mcp/gmail/oauth-flow.ts` + `apps/utility/src/mcp/gmail/client.ts`

## What happens at first launch

1. The app calls `GmailClient.reconnect()`, which delegates to `runOAuthFlow(vault)` in `oauth-flow.ts`.
2. `runOAuthFlow` reads `GMAIL_CLIENT_ID` + `GMAIL_CLIENT_SECRET` from env (bootstrap values Russell sets once after creating the Google Cloud OAuth client). If either is missing, it throws `GmailOAuthAppMissingError`.
3. An authorization URL is constructed with:
   - `response_type=code`
   - `scope=https://www.googleapis.com/auth/gmail.readonly`
   - `access_type=offline` (required for refresh token)
   - `prompt=consent` (forces Google to return a new refresh_token every flow — avoids the silent omission on re-authorization)
   - A random `state` parameter for CSRF protection
4. `shell.openExternal(authorizeUrl)` opens the system browser (Electron). In non-Electron contexts (CLI/test), the URL prints to stdout.
5. A local HTTP server starts at `localhost:53683/callback` and waits (120s timeout).
6. The user sees the Google consent screen and approves read-only Gmail access.
7. Google redirects to `http://localhost:53683/callback?code=<auth_code>&state=<state>`.
8. The server validates the `state` parameter (CSRF check), then calls the token endpoint (`https://oauth2.googleapis.com/token`) with the auth code.
9. Google returns `{ access_token, refresh_token, expires_in }`. The `refresh_token` is stored in safeStorage via `vault.storeCredential('gmail', refreshToken, 'oauth_refresh_token', ...)`. The `access_token` is held in memory only — never written to disk.
10. The browser tab shows "C-Suite connected to Gmail. You may close this tab."

## What is verifiable in Node (without Electron)

- `refreshAccessToken(refreshToken)` in `oauth-flow.ts` is pure HTTP (POST to `oauth2.googleapis.com/token`). It is testable in Node with real credentials.
- `GmailClient.searchThreads()` and `getThread()` are also pure HTTP against `gmail.googleapis.com`. Both are testable in Node once a refresh token is available.
- The 401 auto-refresh cycle in `GmailClient.apiFetch()` is fully testable in Node (mock the HTTP endpoint).

## What requires Electron

- `vault.storeCredential()` calls `safeStorage.encryptString()` (Electron API). In Node smoke contexts, the vault is a mock or stub — the safeStorage write path is verified at Ch.11 on-Mac.
- `shell.openExternal(authorizeUrl)` requires Electron. In tests and CLI, the URL is printed to stdout for manual opening.

## Refresh token lifecycle

- Refresh tokens do not expire on a fixed schedule. Google revokes them only if: the token is unused for 6 months, the user revokes access via myaccount.google.com, the OAuth client credentials are changed, or the consent is re-granted (which is why `prompt=consent` is used — it forces issuance of a new refresh token each flow).
- `GmailClient.refreshToken()` is called automatically on 401 responses. It reads the stored refresh token from the vault, POSTs to the token endpoint, and caches the new access token in memory.
- If the refresh token itself is rejected (`invalid_grant` in the response), `GmailAuthRevokedError` is thrown and the user must run `reconnect()` again.

## Error states (smoke-testable)

| Error class | Trigger | Recovery |
|---|---|---|
| `GmailOAuthAppMissingError` | `GMAIL_CLIENT_ID` or `GMAIL_CLIENT_SECRET` not set | Set env vars; see `docs/setup/gmail-oauth-app.md` |
| `GmailAuthExpiredError` | No credential in vault | Run `GmailClient.reconnect()` (first-launch flow) |
| `GmailAuthRevokedError` | Refresh token rejected (`invalid_grant`) | Run `GmailClient.reconnect()` (re-authorizes) |
| `GmailNetworkError` | Network timeout or non-200/401/404/429 response | Check network; retry |
| `GmailRateLimitedError` | HTTP 429 | Back off and retry |

## Setup prerequisite

Before first launch, Russell must create a Google Cloud OAuth 2.0 client for the C-Suite app and populate `GMAIL_CLIENT_ID` + `GMAIL_CLIENT_SECRET`. See `docs/setup/gmail-oauth-app.md` for full Google Cloud Console steps. The OAuth client's authorized redirect URI must include `http://localhost:53683/callback`.
