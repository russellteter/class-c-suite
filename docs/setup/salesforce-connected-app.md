# Salesforce Connected App Setup

**Russell action required before Salesforce MCP is live.**

## What this does

C-Suite authenticates to `classedu.my.salesforce.com` via OAuth 2.0 Authorization Code grant. You create the Connected App once in Class Admin, provide the client credentials, then log in once via browser. The refresh token is stored in macOS Keychain via Electron's `safeStorage` — you never log in again unless the refresh token is revoked.

## Steps

### 1. Create the Connected App in Class Salesforce Admin

1. Log in to `https://classedu.my.salesforce.com` as an admin.
2. Go to **Setup → App Manager → New Connected App**.
3. Fill in:
   - **Connected App Name**: `C-Suite`
   - **API Name**: `C_Suite`
   - **Contact Email**: your admin email
4. Under **OAuth Settings**:
   - Check **Enable OAuth Settings**
   - **Callback URL**: `http://localhost:53682/callback`
   - **Selected OAuth Scopes**: add `Access and manage your data (api)` + `Perform requests at any time (refresh_token, offline_access)`
5. **Require Proof Key for Code Exchange (PKCE)**: leave unchecked (not implemented in this version)
6. Click **Save**. Salesforce may take 2–10 minutes to activate the app.

### 2. Get the client credentials

After saving, click **Manage Consumer Details** (or navigate back to the app):
- Copy **Consumer Key** → this is `SALESFORCE_CLIENT_ID`
- Copy **Consumer Secret** → this is `SALESFORCE_CLIENT_SECRET`

### 3. Set env vars for first launch

Before the first C-Suite launch after creating the Connected App, set:

```bash
export SALESFORCE_CLIENT_ID="<your Consumer Key>"
export SALESFORCE_CLIENT_SECRET="<your Consumer Secret>"
```

Or add them to `apps/main/.env.local` (not committed — already in `.gitignore`):

```
SALESFORCE_CLIENT_ID=<your Consumer Key>
SALESFORCE_CLIENT_SECRET=<your Consumer Secret>
```

### 4. First login

On first C-Suite launch, the app will open your browser to the Salesforce login page. Log in with your Class admin account. After authorizing, the browser shows "C-Suite connected to Salesforce. You may close this tab." — the refresh token is now stored in macOS Keychain.

Subsequent launches use the stored refresh token silently.

### 5. Verify

After login, run the live smoke test:

```bash
bash scripts/mcp-live-smoke.sh salesforce
```

Expected output: record count + first 5 committed-pipeline opportunities.

## Notes

- The refresh token does NOT expire unless you revoke it in Setup → Connected Apps → Manage → Revoke.
- If you see `SalesforceAuthRevokedError`, repeat Step 4.
- The Connected App only needs `api` + `refresh_token` scopes — no admin or metadata API access needed.
- `SALESFORCE_CLIENT_ID` / `SALESFORCE_CLIENT_SECRET` are only needed at first launch to obtain the initial refresh token. Once stored, they are still required at refresh-token exchange time (Salesforce requires client credentials on every token refresh with the Authorization Code flow).
