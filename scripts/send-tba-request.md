# NetSuite TBA Request Template

> Pre-drafted message to Brian (NetSuite admin) to issue Token-Based Authentication (TBA) credentials for the C-Suite. **Send this on day 1 of Phase R R1** — this is the longest-lead external dependency (BLOCKERS B1) and runs in parallel to all other Phase R work.

## What to send

Channel: Slack DM, email, or however Russell and Brian usually coordinate NetSuite work.

**Subject:** NetSuite TBA tokens for a new internal tool (Russell — C-Suite)

**Body (Russell sends; Russell-voice; no AI-tells):**

---

Hey Brian,

Building an internal tool that needs read-only NetSuite access for cash-position queries, AR/AP, and account balances — same patterns the existing operating-model already runs in Cowork, just inside a desktop app that automates the Monday morning tripwire scan and the weekly cash forecast.

To wire it up I need a Token-Based Authentication (TBA) credential pair. Specifically:

- A new **Integration Record** in NetSuite (Setup → Integration → Manage Integrations → New), with Token-Based Authentication enabled and the appropriate permissions for the role the token will run as. The integration should be set up for a service-account user (not a named human) so the credential survives anyone changing roles. Name it something like `C-Suite Integration`.
- An **Access Token** issued against that integration record for the role/user combo (Setup → Users/Roles → Access Tokens → New). I need the Token ID and Token Secret returned at creation time (they're not retrievable later).
- The **Consumer Key + Consumer Secret** from the Integration Record (also shown only at create time).
- The **NetSuite Account ID** (visible in the URL or under Setup → Company → Company Information).

So I'll need from you, returned over a secure channel (1Password share or Slack-DM):
1. NetSuite Account ID (looks like `1234567` or `1234567_SB1` for sandbox)
2. Consumer Key
3. Consumer Secret
4. Token ID
5. Token Secret

**Permissions** the role needs (read-only is fine for V1):
- Transactions: View
- Accounting Lists: View
- Reports: View
- Saved Search: Run / View / Edit Saved Search (so I can use existing saved searches without creating new ones)
- Lists → Customers, Vendors, Items: View
- Setup → SOAP/REST Web Services: Permission required for the role
- SuiteQL access (verify with the integration record's settings)

If the existing service-account role we use for Cowork's NetSuite hits already has these, that role is fine — just issue a new access token against it for the new integration.

Timing: ideal within the next week so I can wire it up without blocking the broader tool build. No urgency past that.

Let me know if you need me to fill out anything internal (change ticket, etc.) for the access request.

Thanks —
Russell

---

## After Brian responds

Russell pastes the 5 values into the C-Suite Settings → NetSuite connection screen (Ch.8). The values land in `safeStorage` (macOS Keychain) — never in `.env`, never in the repo. See `docs/architecture/mcp.md` §NetSuite.

The Sunday-evening renewal-forecast scheduled job (Ch.10) and the Monday-morning tripwire / cash-forecast jobs are the primary consumers; they degrade gracefully (skip NetSuite, flag in memo) if TBA tokens aren't yet active.

## Update BLOCKERS.md when sent

Once sent, update `BLOCKERS.md` B1 to add:

```
**Sent:** YYYY-MM-DD (replace with actual date)
**ETA from Brian:** <Brian's response or "awaiting"> 
```

And on receipt:
```
**Status:** MITIGATED
**Tokens received:** YYYY-MM-DD
```
