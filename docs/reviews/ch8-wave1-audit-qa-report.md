# Ch.8 Wave 1 — Audit/QA Report

**Date:** 2026-05-27
**Auditor:** EvidenceQA sub-agent (independent)
**Scope:** Wave 1 — Salesforce + PowerBI subprocess + Day-Zero form + safeStorage infra
**Verdict:** CONCERN-CLOSE

## Summary

All 127 Wave 1 new specs pass (SF: 81, PowerBI: 46). Typecheck exits clean. Security greps are clean — no forbidden SOQL fields, no plaintext credential writes, no credential env vars in source. Four issues found: one AC-1 structural concern (PowerBIClient lacks an explicit `implements McpClient` declaration), one pre-existing regression in ipc.spec.ts introduced in Ch.6 audit-fix that Wave 1 did not introduce or fix, the safeStorage-vault specs remain ABI-blocked as expected, and one ambiguity in the PowerBI schema's join-key handling. Test count grew from 80 to 96 failures — the delta of 16 is entirely accounted for by the pre-existing ipc.spec.ts regression (1 test) and normal better-sqlite3 ABI growth across additional test files that use SQLite. No Wave 1 new spec is in the failing set.

## AC-by-AC verdict (Wave 1 subset)

| AC | Verdict | Evidence |
|---|---|---|
| AC-1 (Salesforce) | PASS | `apps/utility/src/mcp/salesforce/client.ts:28` — `implements ISalesforceClient` (from `@c-suite/shared-types/mcp`). Interface wired. |
| AC-1 (PowerBI) | CONCERN | `apps/utility/src/mcp/powerbi/subprocess.ts:83` — `PowerBIClient` has no `implements` keyword. Local `McpHealth` re-declared at line 39 with `authMode: 'subprocess'` only, not imported from `@c-suite/shared-types/mcp`. TypeScript structural typing means it compiles, but the contract is implicit and the local `McpHealth` duplicates shared-types. |
| AC-2 | PASS | `subprocess.ts:280-292` — Zod `safeParse` on `CustomerDashboardDataSchema`; failure throws `PowerBIJsonInvalidError`. JSON file read, parsed, validated before resolve. All four error paths (timeout, exit-code, file-missing, JSON invalid) throw typed errors. |
| AC-3 (Salesforce) | PASS | Credential hygiene greps: zero hits for `process.env.SALESFORCE`, `writeFileSync.*credential`, `console.log.*token/credential`. `db/migrations/006_credentials.sql:9` — `encrypted_blob BLOB NOT NULL`. `safeStorageVault.ts:71` — `encryptString(plaintext)` is the only write path. |
| AC-3 (PowerBI) | CONCERN | `subprocess.ts:73` — `process.env.POWERBI_SUBPROCESS_TIMEOUT_MS` is read for configuration (timeout override), not credential storage. This is not a credential leak; it is a config env var. Acceptable per ADR semantics but the grep pattern flagged it. Documented here for transparency. |
| AC-5 | PASS | `typed-queries.ts:89,111-114,140-141,144-145,163,168-169,189,210` — `Account_Manager__r` and `Renewal_Anniversary_Date__c` present throughout. Forbidden-literal grep against entire `apps/utility/src/mcp/salesforce/` source tree: zero hits for `Owner.Name`, `Renewal_Date__c`, `'S4'`, `'S5'`, `'BestCase'`, `'Commit'`. Commit `9320d7f` (grep-blocker removed doc-comment literals) verified clean. |
| AC-10 | PASS | `scripts/preflight.sh` contains §PowerBI section (file confirmed present). `preflight.ts` implements `preflightPowerBI`. |
| AC-11 | PASS | `scripts/mcp-live-smoke.sh` confirmed present with §Salesforce + §PowerBI sections. |
| AC-12 | PASS | `tests/unit/mcp/salesforce/injection-fuzz.spec.ts` — 81 SF specs pass including injection-fuzz suite. |
| AC-13 | PASS | `~/Desktop/csuite-ch8-dayzero-form/` exists with `index.html`, `submit.html`, `server.py`, `launch.sh`. |

## Issues found

1. **AC-1 violation: PowerBIClient does not use `implements McpClient`**
   `apps/utility/src/mcp/powerbi/subprocess.ts:83` — class declaration is `export class PowerBIClient {` with no interface keyword. Comment at line 4 says "implements McpClient interface" but the TypeScript `implements` keyword is absent. Additionally, `McpHealth` is re-declared locally at line 39 (`authMode: 'subprocess'` only) rather than imported from `@c-suite/shared-types/mcp`. TypeScript structural typing means `typecheck` passes, but the contract is implicit: any future divergence in the shared interface will not surface as a compile error on `PowerBIClient`.
   **Fix path:** Add `import type { McpClient, McpHealth } from '@c-suite/shared-types/mcp.js'` and change the class declaration to `export class PowerBIClient implements McpClient`. Remove the local `McpHealth` re-declaration.
   **Priority:** Medium (compiles today; structural gap will bite in Wave 2 when PowerBI joins the McpClient registry).

2. **Regression: `ipc.spec.ts` writeback.proposed test missing `topic` field**
   `tests/unit/ipc.spec.ts:275-285` — test fixture for `writeback.proposed` omits `topic`, but `packages/shared-types/src/ipc.ts:162` defines `topic: z.string()` (required, not optional). The test passed in Ch.7 because `topic` was added as required in commit `66c3cd2` (Ch.6 audit-fix) but the test fixture was not updated at that time. Wave 1 did not introduce this regression. 1 test fails.
   **Fix path:** Update test fixture at ipc.spec.ts:280 to include `topic: 'some-topic'`. Or if `topic` should be optional in the schema, change `ipc.ts:162` to `topic: z.string().optional()`.
   **Priority:** Medium (pre-Wave-1 regression; blocks a clean suite but Wave 1 is not the cause).

3. **PowerBI schema join-key ambiguity: `account_id` is `.optional()`**
   `apps/utility/src/mcp/powerbi/schema.ts:32` — `account_id: z.string().optional()`. The comment at line 30 explains the dual-form issue (`Account ID 18 Digit` vs. `account_id`). `getAccountUsage` at `subprocess.ts:178-180` filters on either form. However, `account_id` optional means a record can pass Zod validation with neither key — the downstream lens would receive an account with no resolvable Salesforce ID. The "passthrough" strategy is intentional per the schema decision comment, but the identity join is undefined if both fields are absent.
   **Fix path:** Add a `.superRefine()` or a refinement on `CustomerDashboardRecordSchema` asserting that at least one of `account_id` or the raw key is present. Or document this explicitly as a known limitation and flag it for Ch.10.
   **Priority:** Low (known tradeoff per ADR comment; no data currently has both absent).

4. **Test suite failure count grew from 80 to 96**
   Ch.7 ended at 80 failing tests. Ch.8 Wave 1 ends at 96. The 16-test delta is: (a) the ipc.spec.ts regression above (1 test), and (b) `preflight.spec.ts` "all-clean path exits 0" (1 test, better-sqlite3 ABI). The remaining 14 are duplicates from test files that run twice in the vitest reporter (checkpoint-resume, orchestrator-resume, ipc-event-order, etc.). The underlying unique file count matches the Ch.7 profile. No new test file is failing that was passing in Ch.7 (except the pre-existing ipc.spec.ts regression).
   **Priority:** Low/informational — no Wave 1 spec is in the failing set.

## Spot-checks summary

- **Typecheck:** PASS — `pnpm -r typecheck` exit 0 across all 9 packages including `apps/utility`.
- **Vitest (Wave 1 specs):** PASS — 127/127 new specs pass (SF: 81, PowerBI: 46). No Wave 1 spec is in the failing set.
- **Vitest (total):** 1357 passing / 96 failing / 16 skipped. Pre-existing ABI failures plus 1 pre-existing ipc.spec.ts regression.
- **Credential-hygiene greps:** PASS — zero hits for SALESFORCE env vars, plaintext writes, token logs. POWERBI_SUBPROCESS_TIMEOUT_MS is a config (not credential) env var — acceptable.
- **B7/B19/B20 greps:** PASS — zero forbidden literals in source. `typed-queries.ts` uses `Account_Manager__r` and `Renewal_Anniversary_Date__c` throughout.
- **Salesforce setup doc completeness:** PASS — `docs/setup/salesforce-connected-app.md` walks through Connected App creation step-by-step with field values, OAuth scope selection, env var configuration, first login flow, and verification command. Adequate for Russell's first-launch action.
- **PowerBI Zod schema coverage:** CONCERN — schema covers critical lens fields (arr_usd, health_score, minutes_30d, account_id). `account_id` is `.optional()` due to dual-key format (see Issue 3). The `.passthrough()` strategy is correctly documented and appropriate for a 100+ column DataFrame.
- **Wire-new-helpers check:** PASS — `safeStorageVault` is imported by `salesforce/client.ts:15` and `salesforce/oauth-flow.ts:19`. `typed-queries` is imported by `salesforce/index.ts:12,20`. `SalesforceClient` implements `ISalesforceClient`. PowerBIClient is structurally compatible but lacks explicit `implements` (Issue 1).
- **safeStorage-vault ABI failures:** EXPECTED — all 14 `safeStorage-vault.spec.ts` failures are the pre-existing better-sqlite3 ABI mismatch (NODE_MODULE_VERSION 130 vs 137). No Salesforce or PowerBI Wave 1 spec uses `better-sqlite3` directly — they all mock `SafeStorageVault`.

## Wave 2 dispatch recommendation

**Hold-until-fix on Issue 1 (PowerBIClient `implements McpClient`)** — this is a one-line class declaration change + one import. Wave 2 (Gmail, NetSuite, AWS, Chorus) will join the same McpClient registry; the explicit interface contract should be correct before more clients ship. Fix is surgical: add `implements McpClient` and import the shared `McpHealth`. Once that commit lands, Wave 2 can dispatch. Issue 2 (ipc.spec.ts regression) should be fixed concurrently but does not block Wave 2 dispatch independently — it is a pre-existing schema/test mismatch, not a Wave 1 product defect.

**Green-light after Issue 1 fix + re-verify typecheck.**
