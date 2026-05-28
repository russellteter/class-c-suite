# NetSuite Current Table Accessibility State

> Last verified: 2026-05-28
> Account: 603734
> Source: context7 + handoff findings (2026-05-28_05-34) + prior session live probes
> Live probe script: `scripts/netsuite-smoke-which-tables-work.ts`

## Accessible Tables (PASS)

| Table | Status | Evidence | Action |
|---|---|---|---|
| `transaction` | PASS | Prior session: 8,148 transactions returned via live MCP probe | — |
| `subsidiary` | PASS | Prior session: subsidiaries returned via whoami + subsidiary query | — |

## Blocked Tables (role permission denied)

| Table | Status | Evidence | Action Required |
|---|---|---|---|
| `account` | BLOCKED | HTTP 400 "Record 'account' not found" — NS permission-denied signal | Grant View in Lists tab |
| `department` | BLOCKED | HTTP 400 "Record 'department' not found" | Grant View in Lists tab |
| `classification` | BLOCKED | HTTP 400 "Record 'classification' not found" | Grant View in Lists tab |
| `employee` | BLOCKED | HTTP 400 "Record 'employee' not found" | Grant View in Lists tab |
| `accountingperiod` | BLOCKED | HTTP 400 "Record 'accountingperiod' not found" | Grant View in Lists tab |

## Unknown / Not Yet Probed

Tables below require live credentials to probe. Run the smoke script after sourcing `.env.local`:

```
source apps/main/.env.local && npx tsx scripts/netsuite-smoke-which-tables-work.ts
```

Tables to probe: `vendor`, `customer`, `item`, `currency`, `location`, `budgetcategory`,
`billingaccount`, `rolepermissions`, and transaction sub-types via `type` filter.

## metaDataProvider Research Finding

**Context7 confirmed (2026-05-28):** The `metaDataProvider` option is a SuiteScript N/query module
parameter only — not available as an HTTP header on the REST `/services/rest/query/v1/suiteql`
endpoint.

Sources:
- https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_157960586441.html
- https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_1510780212.html

Behavior:
- `SUITE_QL` (default): query fails with HTTP 400 if role lacks permission on any referenced table.
- `STATIC`: query proceeds but silently omits data for unauthorized fields/records.

**Critical finding:** `STATIC` is only settable from SuiteScript server-side code (N/query module).
It is **not** settable via HTTP header on the REST API. The C-Suite app uses REST + TBA — there is
no technical workaround. The `metaDataProvider=STATIC` path is inaccessible from the integration.

**Conclusion:** No alternate metaDataProvider bypasses role permission via REST. Brian must grant
View on the 5 blocked tables. See `docs/external/brian-netsuite-role-perms-request.md`.

## Degraded-mode client hardening (Ch.8)

`isNetSuiteTableReadable(table)` added to `apps/utility/src/mcp/netsuite/client.ts`:
- Seeds known-blocked 5 tables as `false` on construction (no round-trip on cold start).
- Lazy-probes unknown tables on first call; caches result for client instance lifetime.
- Playbooks call this before any gated SuiteQL query; if `false`, include a `DegradationWarning`
  in `PlaybookResult.degradationWarnings` instead of crashing.
- `buildDegradationWarning(table, attemptedQuery?)` produces the structured warning.

`DegradationWarning` type added to `packages/shared-types/src/playbook.ts`:
```ts
interface DegradationWarning {
  table: string;
  reason: string;
  remediation: string;
  attemptedQuery?: string;
}
```

`PlaybookResult.degradationWarnings?: DegradationWarning[]` added to the result schema.

## Next steps

1. Send `docs/external/brian-netsuite-role-perms-request.md` to Brian.
2. After perms granted, run `scripts/netsuite-smoke-which-tables-work.ts` — all 5 should flip PASS.
3. Remove those 5 from `KNOWN_BLOCKED_TABLES` in `client.ts` once confirmed PASS.
4. Wire real SuiteQL cash/payroll queries into playbooks (currently stubs) in Ch.8 full wiring.
