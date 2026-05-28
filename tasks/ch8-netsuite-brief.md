# Ch.8 Wave 2 — NetSuite MCP Builder Brief

Pattern-match the Salesforce sub-agent's shape (Ch.8 Wave 1, commits `cacb1e7..9320d7f`). Read those files first.

## Contract
`docs/decisions/0010-ch8-mcp-integration.md` §3 (framework) + §5 (NetSuite) + BLOCKERS §B1 (TBA tokens pending Brian) + §B20 (renewal field).

## Working directory
`/Users/russellteter/Claude Code Projects/c-suite/` (quote — has spaces).

## Critical: TBA-stubbed + skip-and-flag fallback per ADR §2

Russell can't provision NetSuite TBA tokens — Brian does. The client MUST be functional in two modes:
- **Token-present mode**: real SuiteQL calls.
- **Token-absent mode**: every method returns `null` with `degraded: true` flag; playbooks degrade per ADR-0009 §3.6.

This is by design — Ch.8 must close without Brian.

## Scope (yours alone — non-overlapping with Gmail / AWS+Chorus / Notarization)

### `apps/utility/src/mcp/netsuite/`
- `client.ts` — `NetSuiteClient implements McpClient`. Methods: `runSuiteQL(query)`, `runSavedSearch(id)`, `isAuthenticated()`, `reconnect()`, `healthCheck()`. **Token-absent mode**: all methods return `null` and `client.degraded = true`. Auth check: `safeStorage` lookup for `netsuite` credential.
- `tba-auth.ts` — TBA token signature per NetSuite docs (HMAC-SHA256 with token + secret + consumer key + consumer secret + nonce + timestamp). Stub when credentials absent.
- `typed-queries.ts`:
  - `cashGLBalanceQuery({ asOfDate })` — encodes Class cash GL accounts (no covenant-specific saved search per B6 — derived from raw SuiteQL).
  - `payrollByDeptQuery({ month })` — GTM payroll lookup.
  - `foreignTotalQuery({ accountId, currency })` — encodes `foreigntotal` rule from `docs/architecture/mcp.md`.
  - `payrollBlindSpotQuery` — encodes the payroll-blind-spot rule.
  - `revenueWith24MonthSkip` — encodes the 24-month skip rule.
- `errors.ts` — `NetSuiteTBAExpiredError`, `NetSuiteSavedSearchNotFoundError`, `NetSuiteSuiteQLError`, `NetSuiteAuthMissingError`.
- `index.ts` — exports.

### `scripts/mcp-live-smoke.sh`
Append §NetSuite section. Smoke:
- If TBA tokens present: run `cashGLBalanceQuery({})` → assert non-zero rows.
- If absent: print "BLOCKED: awaiting Brian's TBA enablement (B1)" + exit 0.

### `scripts/send-tba-request.md`
Already exists (Russell-facing email template). Update if anything has changed for the C-Suite project specifically.

### `tests/unit/mcp/netsuite/`
- `client.spec.ts` — both modes (token-present mock + token-absent degraded).
- `typed-queries.spec.ts` — each typed query returns expected SuiteQL string. B20 specific test: `Renewal_Anniversary_Date__c` (not `Renewal_Date__c`).
- `tba-auth.spec.ts` — HMAC signature matches a known fixture.
- `injection-fuzz.spec.ts` — SuiteQL injection fuzz (≥15 cases).

≥35 specs total.

## Forbidden inferences
- Hard-coding TBA tokens anywhere — even in test fixtures. Use the safeStorage vault.
- B20 violation: `Renewal_Date__c` field anywhere in source.
- Touching other MCP services.
- Skipping the token-absent fallback path — without it, Ch.8 cannot close.

## What "done" looks like
- All files written + `pnpm -r typecheck` exit-0 clean.
- All existing tests pass.
- `scripts/mcp-live-smoke.sh netsuite` exits 0 (BLOCKED-flagged absent TBA).
- ≥35 new specs.
- Atomic commits — `ch.8 ns: <what> — <why>`. No Claude attribution.

## Russell-action items
- Relay `scripts/send-tba-request.md` to Brian for TBA token issuance (B1).
- Once tokens arrive: paste into env vars `NETSUITE_TBA_TOKEN_ID`, `NETSUITE_TBA_TOKEN_SECRET`, `NETSUITE_CONSUMER_KEY`, `NETSUITE_CONSUMER_SECRET`, `NETSUITE_ACCOUNT_ID` on first launch; safeStorage saves them.

## Report-back (≤200 words)
- Commits + first-line.
- Token-absent fallback verified (test name).
- Vitest + typecheck results.
- Russell-action items.
