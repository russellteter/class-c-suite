# Ch.8 Wave 1 — Intermediate Audit Brief

You are the **independent** Audit/QA sub-agent for Ch.8 Wave 1. You did NOT write any of the Wave 1 code. Per DOCTRINE law #7: writer ≠ grader.

Contract: `docs/decisions/0010-ch8-mcp-integration.md`. This audit gates Wave 2 dispatch (Gmail + NetSuite + AWS+Chorus). Find real issues with file_path:line evidence. Default to skepticism — EvidenceQA finds 3-5 real issues per audit.

## Working directory
`/Users/russellteter/Claude Code Projects/c-suite/` (quote — has spaces).

## Wave 1 surface (what you're auditing)

### Salesforce (6 commits `cacb1e7..9320d7f`)
- `packages/shared-types/src/mcp.ts` — shared MCP types (used by ALL services).
- `db/migrations/006_credentials.sql` — credentials table.
- `apps/utility/src/credentials/safeStorageVault.ts` — credential store (used by ALL services).
- `apps/utility/src/mcp/salesforce/{client,oauth-flow,typed-queries,errors,index}.ts`.
- `docs/setup/salesforce-connected-app.md` — Russell-facing setup doc.
- `tests/unit/mcp/salesforce/{injection-fuzz,typed-queries,client}.spec.ts` + `tests/unit/credentials/safeStorage-vault.spec.ts`.
- `scripts/mcp-live-smoke.sh` — §Salesforce.

### PowerBI (1 commit `f0a5ffe` — 15 files)
- `apps/utility/src/mcp/powerbi/{subprocess,schema,preflight,errors,index}.ts`.
- `scripts/preflight.sh` — extended with §PowerBI.
- `scripts/mcp-live-smoke.sh` — §PowerBI.
- `tests/unit/mcp/powerbi/{subprocess,schema,preflight,types}.spec.ts`.

### Day-Zero form (no repo commits — form lives on Desktop; outputs to `business-planning/_dayzero/`)
- `~/Desktop/csuite-ch8-dayzero-form/{index,submit,server.py,launch.sh}`.

## ADR §13 ACs (Wave-1 subset)

Verify each PASS / CONCERN / REOPEN with file_path:line evidence and test name:

- **AC-1 (Salesforce + PowerBI portion)**: `SalesforceClient` and `PowerBIClient` both implement `McpClient` contract (`packages/shared-types/src/mcp.ts`).
- **AC-2**: PowerBI subprocess wrapper produces validated JSON consumable by lenses.
- **AC-3 (Salesforce + PowerBI portion)**: Every credential stored via `safeStorage`. Audit greps:
  - `grep -rn "process.env.SALESFORCE\|process.env.POWERBI" apps/utility/src/` — expect zero hits to credential variables.
  - `grep -rn "writeFileSync.*credential\|fs.writeFile.*token" apps/utility/src/credentials/` — expect zero plaintext writes.
  - `grep -rn "console.log.*token\|console.log.*credential" apps/utility/src/` — expect zero.
- **AC-5**: Salesforce typed SOQL builder encodes B7, B19, B20 correctly.
  - `grep -n "Account_Manager__r" apps/utility/src/mcp/salesforce/typed-queries.ts` — expect hit.
  - `grep -n "Owner.Name" apps/utility/src/mcp/salesforce/typed-queries.ts` — expect zero (forbidden).
  - `grep -n "Renewal_Anniversary_Date__c" apps/utility/src/mcp/salesforce/typed-queries.ts` — expect hit.
  - `grep -n "Renewal_Date__c" apps/utility/src/mcp/salesforce/typed-queries.ts` — expect zero (forbidden).
  - `grep -n "'S4'\|'S5'\|'BestCase'\|'Commit'" apps/utility/src/mcp/salesforce/typed-queries.ts` — expect zero (forbidden).
- **AC-10**: PowerBI preflight in `scripts/preflight.sh`; subprocess fallback documented.
- **AC-11 (Salesforce + PowerBI portion)**: Live-smoke script at `scripts/mcp-live-smoke.sh` with §Salesforce + §PowerBI sections.
- **AC-12 (Salesforce portion)**: Injection-fuzz spec for Salesforce typed builder — ≥20 cases pass.
- **AC-13 (form portion)**: Day-Zero form is built (Desktop scope; outputs path correct).

**Out of scope this audit:** Wave 2 services (Gmail, NetSuite, AWS, Chorus), notarization smoke, playbook dep injection (§10 — happens after Wave 2), final close.

## Critical spot-checks

1. **safeStorage usage everywhere a credential exists.** Read `safeStorageVault.ts` end-to-end. Confirm `safeStorage.encryptString` / `safeStorage.decryptString` are the only persistence path. Confirm the SQLite `credentials` table stores `encrypted_blob BLOB`, not plaintext strings.
2. **Russell-action documentation completeness.** Read `docs/setup/salesforce-connected-app.md` — does it actually walk Russell through Connected App setup with screenshots-equivalent step-by-step? Or is it a stub?
3. **Subprocess error semantics.** Read `apps/utility/src/mcp/powerbi/subprocess.ts` — does it actually handle: subprocess timeout, exit code != 0, stdout/stderr streaming, JSON validation failure? Each must throw a typed error.
4. **PowerBI Zod schema coverage.** Read `apps/utility/src/mcp/powerbi/schema.ts`. Does it validate the JSON shape the Python project actually emits (per the sub-agent's "passthrough on full record, strict on critical lens fields" claim)? Spot-check against `customer-dashboard/src/data_processor.py` if you need to verify.
5. **The pre-existing 80 better-sqlite3 ABI failures** — confirm the Wave 1 specs that are in the failing set are ALL the safeStorage-vault specs (which the sub-agent flagged) and NOT the new injection-fuzz / typed-queries / client specs.
6. **Forbidden-literal grep** — the Salesforce sub-agent flagged a "grep-blocker removed (forbidden literals from doc comments)" commit (`9320d7f`). Verify no forbidden literals remain in the source tree — the grep guard was the safety mechanism.

## Audit method

1. **Read every Wave 1 file.** Cite line numbers in every claim.
2. **Run `pnpm vitest run`.** Confirm Wave 1 new specs pass (Salesforce: 81; PowerBI: 46). Confirm the 80 pre-existing failures pattern hasn't grown.
3. **Run `pnpm -r typecheck`.** Verify exit-0 clean.
4. **Run the wire-up greps from "Critical spot-checks" above.**
5. **Read `docs/setup/salesforce-connected-app.md`** — judge completeness for Russell.
6. **Sanity-check the PowerBI Zod schema** against `customer-dashboard/src/data_processor.py` shape.

## What you don't do

- Write code. If you find a bug, REOPEN with a specific fix path.
- Write tests.
- Audit Wave 2 (doesn't exist yet).
- Block on Russell-action items (Connected App setup, venv bootstrap) — those are explicit pre-conditions, not bugs.

## Verdict format

Output `docs/reviews/ch8-wave1-audit-qa-report.md`:

```markdown
# Ch.8 Wave 1 — Audit/QA Report

**Date:** <ISO>
**Auditor:** EvidenceQA sub-agent (independent)
**Scope:** Wave 1 — Salesforce + PowerBI subprocess + Day-Zero form + safeStorage infra (shared by all services)
**Verdict:** PASS | CONCERN-CLOSE | REOPEN

## Summary
<one para>

## AC-by-AC verdict (Wave 1 subset)
| AC | Verdict | Evidence |
|---|---|---|
...

## Issues found
1. <issue with file_path:line + impact + recommended fix>
...

## Spot-checks summary
- Typecheck: <result>
- Vitest: <result>
- Credential-hygiene greps: <result>
- B7/B19/B20 greps: <result>
- Salesforce-setup doc completeness: <result>
- PowerBI Zod schema coverage: <result>

## Wave 2 dispatch recommendation
<green-light / hold-until-fix / REOPEN>
```

Then commit with `ch.8 audit: wave-1 report — <verdict>`. No Claude attribution.

## Report-back (≤250 words)

- Verdict + count of PASS / CONCERN / REOPEN per AC.
- Top 3-5 issues.
- Wave 2 dispatch recommendation.
