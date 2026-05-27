# Gmail OAuth App Setup

C-Suite connects to Gmail via a Google OAuth 2.0 App with read-only scope. This document walks through creating the OAuth credentials in Google Cloud Console. Complete these steps once; the refresh token is stored in safeStorage and rotates automatically.

## Prerequisites

- A Google account with access to the Gmail inbox you want to read.
- A Google Cloud project (or permission to create one).

## Step 1 — Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com).
2. Click **Select a project** at the top, then **New Project**.
3. Name it `C-Suite MCP` (or any name). Click **Create**.

## Step 2 — Enable the Gmail API

1. In the project, open **APIs and Services > Library**.
2. Search for **Gmail API** and click **Enable**.

## Step 3 — Configure the OAuth consent screen

1. Go to **APIs and Services > OAuth consent screen**.
2. Choose **External** (Internal requires Google Workspace; External works for personal accounts).
3. Fill in **App name** (`C-Suite`), **User support email**, and **Developer contact email**.
4. On the **Scopes** screen, add the scope: `https://www.googleapis.com/auth/gmail.readonly`.
5. On the **Test users** screen, add your Gmail address as a test user. This is required — without it, Google will return `access_denied` for unverified apps.
6. Save and continue.

## Step 4 — Create OAuth 2.0 credentials

1. Go to **APIs and Services > Credentials**.
2. Click **Create Credentials > OAuth client ID**.
3. Application type: **Desktop app**.
4. Name: `C-Suite MCP Desktop`.
5. Click **Create**. Google shows the `client_id` and `client_secret`.
6. Copy both values. Do not commit them.

## Step 5 — Set environment variables

Set the credentials as environment variables before launching C-Suite:

```bash
export GMAIL_CLIENT_ID="<your-client-id>"
export GMAIL_CLIENT_SECRET="<your-client-secret>"
```

For persistent configuration, add these to the C-Suite `.env` file (not committed to the repo) or to your shell profile. C-Suite reads them at startup.

## Step 6 — Authorize on first launch

On first launch, C-Suite will open your browser to the Google consent page. Grant access. The browser will redirect to `localhost:53683/callback`, which C-Suite intercepts, exchanges the code for a refresh token, and stores it in safeStorage (Keychain on macOS). Subsequent launches use the stored token — no browser prompt.

## Notes

- **Scope**: `gmail.readonly` — C-Suite can read threads and messages. It cannot send, modify, or delete.
- **Port**: The OAuth callback listens on `:53683` (different from the Salesforce callback on `:53682`).
- **Token rotation**: Google refresh tokens do not expire unless revoked. If you revoke access in [myaccount.google.com/permissions](https://myaccount.google.com/permissions), re-run the OAuth flow via the C-Suite reconnect menu.
- **Unverified app warning**: Google shows a warning screen for unverified apps. Click **Advanced > Go to C-Suite (unsafe)** during development. This is normal for internal tools not submitted for verification.
