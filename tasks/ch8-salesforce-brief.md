# Ch.8 Wave 1 — Salesforce MCP Builder Brief

You are the Salesforce sub-agent for Ch.8 Wave 1. Contract: `docs/decisions/0010-ch8-mcp-integration.md` §3 (framework) + §4 (Salesforce-specific). Read both fully.

## Working directory
`/Users/russellteter/Claude Code Projects/c-suite/` (quote — has spaces).

## Scope (yours alone — non-overlapping with PowerBI / Day-Zero / Wave 2 briefs)

### 1. Shared MCP types — `packages/shared-types/src/mcp.ts` (new file)
Per ADR §3.1. Export `McpClient`, `McpServiceId`, `McpHealth`, `CredentialType`. Zod schemas where wire-crossing. Re-export from `packages/shared-types/src/index.ts`.

### 2. SafeStorage credentials infra — `apps/utility/src/credentials/`
Per ADR §3.2.
- `safeStorageVault.ts` — `storeCredential`, `loadCredential`, `deleteCredential` per ADR API signatures.
- `db/migrations/006_credentials.sql` — `CREATE TABLE credentials` per ADR schema. Idempotent. Advances `schema_version` to 6.
- `index.ts` — re-exports.

### 3. Salesforce client — `apps/utility/src/mcp/salesforce/`
- `client.ts` — `SalesforceClient implements McpClient`. Methods per ADR §4: `query(soql)`, `queryAll(soql)`, `describeObject(name)`, `isAuthenticated()`, `reconnect()`, `healthCheck()`. Auto-refresh on 401.
- `oauth-flow.ts` — Connected App OAuth (Auth Code grant). Browser open + localhost callback :53682 + token exchange + `storeCredential('salesforce', ...)`. **If Russell hasn't provided Connected App `client_id` + `client_secret` yet**, stub them as env-var reads (`SALESFORCE_CLIENT_ID` + `SALESFORCE_CLIENT_SECRET`) and document the bootstrap in `docs/setup/salesforce-connected-app.md`. Russell will populate when he creates the Connected App in Class org.
- `typed-queries.ts` — per ADR §4 typed builder list:
  - `committedPipelineQuery({ asOfDate })` — encode B19 R1-verified stage labels exactly. Two variants: new-business stages + renewal stages. Use the conservative default until Day-Zero form refines.
  - `accountAMHealthQuery({ accountId })` — B7: `Account_Manager__r` + `IsActive` (never `Owner.Name`).
  - `renewalForecastQuery({ months })` — B20: `Account.Renewal_Anniversary_Date__c`.
  - At least 3 more queries needed by Phase B playbooks (read each playbook's `evaluatePrereqs` consumption to identify).
- `errors.ts` — typed error class hierarchy per ADR.
- `index.ts` — exports `SalesforceClient` + the typed-query functions.

### 4. Live smoke — `scripts/mcp-live-smoke.sh`
Per ADR §3.3. New file or append. **§Salesforce.** Section that runs once (`bash scripts/mcp-live-smoke.sh salesforce`) and:
- Confirms credentials loaded.
- Invokes `committedPipelineQuery({})` against live Class org.
- Logs the count + first 5 records.
- Exits 0 on success, non-zero on auth/field/network errors.

If Connected App not yet set up: smoke prints "BLOCKED: awaiting Russell — Connected App in Class org" and exits 0 (don't fail the chapter).

### 5. Injection-fuzz spec — `tests/unit/mcp/salesforce/injection-fuzz.spec.ts`
Per ADR §3.5. Pattern from existing `packages/soql-builder/` tests. Reject:
- SOQL injection via stage name (`'); DROP --`).
- ORDER BY injection.
- LIMIT/OFFSET injection.
- Subquery injection.

≥20 fuzz cases.

### 6. Unit specs — `tests/unit/mcp/salesforce/`
- `client.spec.ts` — `isAuthenticated`, `reconnect`, `healthCheck`, query happy path + 401 retry.
- `typed-queries.spec.ts` — each typed query against a stubbed client returns the expected SOQL string.
- `safeStorage-vault.spec.ts` — credential store/load/delete roundtrip; encryption/decryption verified.

Use existing test patterns. ≥30 specs total across the salesforce/ + credentials/ tree.

## Forbidden inferences (audit will REOPEN)

- Storing credentials anywhere except `safeStorage`-encrypted SQLite. No plaintext to disk. No env-var writes. No log lines containing tokens.
- `Owner.Name` in any SOQL builder — B7 violation.
- `Renewal_Date__c` in any SOQL builder — B20 violation.
- Old stage labels (`S4`, `S5`, `Commit`, `BestCase`) — B19 violation.
- Inventing fields not in the live Class org schema (per R1 verification). When in doubt, run `describeObject('Account')` mentally — if you can't justify the field name, ask.
- Touching `apps/utility/src/mcp/{netsuite,aws,gmail,chorus,powerbi}/` — out of scope.
- Touching `apps/renderer/`, tests outside `tests/unit/mcp/salesforce/` + `tests/unit/credentials/`.
- Committing without `pnpm vitest run` + `pnpm -r typecheck` green.

## What "done" looks like

- All files above written + `pnpm -r typecheck` exit-0 clean.
- All existing tests still pass (`pnpm vitest run`). You must not break Ch.0–7's specs.
- ≥30 new specs across the salesforce + credentials tree.
- `grep -rn "salesforce" apps/utility/src/credentials/` — confirms credential layer references salesforce service ID.
- `grep -rn "Owner.Name\|Renewal_Date__c\|StageName IN ('S4'\|'BestCase'" apps/utility/src/mcp/salesforce/` — zero hits.
- `scripts/mcp-live-smoke.sh salesforce` exits 0 (BLOCKED-flagged if Connected App not set up).
- Atomic commits — one concept per commit. `ch.8 sf: <what> — <why>`. No Claude attribution.

## Russell-action items (surface in report)

- Create the Salesforce Connected App in Class org (`classedu.my.salesforce.com`). Doc you write at `docs/setup/salesforce-connected-app.md` walks Russell through the form. Russell provides `client_id` + `client_secret` (Russell pastes into the OAuth flow on first launch; safeStorage saves the refresh token thereafter).
- Provide his Salesforce login. The OAuth flow opens the browser — Russell logs in once, refresh token persists.

## Report-back (≤300 words)

- Commits made (SHA + first-line).
- Files created/modified count.
- `pnpm vitest run` summary (passed / failed / todo).
- `pnpm -r typecheck` result.
- Live-smoke status (PASS / BLOCKED-awaiting-Russell).
- Russell-action items.
- Any contract ambiguity resolved + the decision.
- Any blocker hit + the three approaches tried.

DO NOT touch PowerBI / Gmail / NetSuite / AWS / Chorus. DO NOT write the Day-Zero form. DO NOT close Ch.8.
