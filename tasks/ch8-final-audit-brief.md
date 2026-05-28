# Ch.8 Final Audit/QA Brief

You are the **independent** Audit/QA sub-agent for the full Ch.8 close. Wave 1 audit closed CONCERN-CLOSE (`docs/reviews/ch8-wave1-audit-qa-report.md`). This final audit reaches verdict on the full chapter — all 5 MCPs + PowerBI subprocess + buildDeps wiring + notarization smoke.

## Working directory
`/Users/russellteter/Claude Code Projects/c-suite/` (quote — has spaces).

## Ch.8 surface

### Wave 1 (already audited; re-check no regressions)
- Salesforce client + OAuth + typed-queries + injection-fuzz (81 specs).
- PowerBI subprocess + Zod schema + preflight (46 specs).
- safeStorage credentials infra + migration 006.
- Day-Zero form (Desktop scope; outputs to business-planning/_dayzero/).

### Wave 2 (primary focus this audit)
- **Gmail** (`fddf687`) — Google OAuth read-only + typed queries + 33 specs.
- **NetSuite** (`8e516b7..7f29b73`) — TBA + token-absent fallback + 5 SuiteQL builders + 101 specs.
- **AWS+Chorus** (`8d3d558`) — local SSO (class+collab sum) + API key (B11 cap) + 55 specs.
- **Notarization smoke** (`73fb285`) — BLOCKED awaiting Apple credentials; build config + entitlements ready.

### Integration (post-Wave-2)
- **buildDeps** wiring (`<latest>`) — hydrates real MCP clients into PlaybookDeps per ADR-0010 §10.

## ADR-0010 §13 ACs (full audit)

Verify each PASS / CONCERN / REOPEN with file_path:line evidence and test name:

- **AC-1**: All 5 MCP clients implement `McpClient` contract.
- **AC-2**: PowerBI subprocess wrapper produces validated JSON consumable by lenses.
- **AC-3**: Every credential stored via `safeStorage`. **Critical greps:**
  - `grep -rn "process.env.SALESFORCE_TOKEN\|process.env.NETSUITE_TOKEN\|process.env.GMAIL_TOKEN\|process.env.CHORUS_API_KEY" apps/utility/src/` — expect zero direct token reads in client logic (env-var bootstrap on first launch is acceptable in the OAuth flow files only).
  - `grep -rn "writeFileSync.*credential\|fs.writeFile.*token\|fs.appendFile.*token" apps/utility/src/` — expect zero.
  - `grep -rn "console.log.*token\|console.log.*credential\|log\..*token" apps/utility/src/` — expect zero (allow log.warn message strings that don't include the token value).
- **AC-4**: `buildDeps` injects clients into PlaybookDeps. `apps/utility/src/playbooks/lib/buildDeps.ts` exists and `apps/utility/src/orchestrator/run-loop.ts` calls it with `(playbookId, db)`.
- **AC-5**: Salesforce typed SOQL — B7 + B19 + B20.
  - `grep -n "Account_Manager__r" apps/utility/src/mcp/salesforce/typed-queries.ts` — expect ≥1.
  - `grep -n "Owner.Name" apps/utility/src/mcp/salesforce/typed-queries.ts` — expect 0.
  - `grep -n "Renewal_Anniversary_Date__c" apps/utility/src/mcp/salesforce/typed-queries.ts` — expect ≥1.
  - `grep -n "Renewal_Date__c" apps/utility/src/mcp/salesforce/typed-queries.ts` — expect 0.
  - `grep -n "'S4'\|'S5'\|'BestCase'\|'Commit'" apps/utility/src/mcp/salesforce/typed-queries.ts` — expect 0.
- **AC-6**: NetSuite typed SuiteQL — `foreigntotal`, payroll-blind-spot, 24-month skip.
  - `grep -n "Renewal_Date__c" apps/utility/src/mcp/netsuite/` — expect 0 (B20 carry-over check).
- **AC-7**: AWS sums `class` + `collab` profiles; degrades if one missing.
- **AC-8**: Gmail OAuth read-only scope; silent refresh.
- **AC-9**: Chorus claims tagged `source_type: 'chorus'`, capped <70 confidence (`sourceConfidenceCap: 69`).
- **AC-10**: PowerBI subprocess fallback documented; `scripts/preflight.sh` checks Python + venv.
- **AC-11**: Live-endpoint smoke at `scripts/mcp-live-smoke.sh` — sections for all 5 services + PowerBI. BLOCKED-with-exit-0 acceptable for services pending Russell-action.
- **AC-12**: Injection-fuzz specs for each typed builder. Salesforce SOQL (≥20), NetSuite SuiteQL (≥15).
- **AC-13**: B6 + B19 Day-Zero form built and ready (Desktop scope OK).
- **AC-14**: B14 notarization smoke completed — `docs/research/R3-notarization-smoke.md` written with PASS or BLOCKED status + Ch.11 findings.
- **AC-15**: `pnpm vitest run` exit-0 clean (plus pre-existing better-sqlite3 ABI failures).
- **AC-16**: B11 Chorus cap propagates — verify `confidence-cap.ts` exports `CHORUS_CONFIDENCE_CAP = 69` AND client tags results with it.

## Critical spot-checks

1. **buildDeps signature alignment** — `buildDeps(playbookId, db)` is called from run-loop.ts:88 (or whatever line). Confirm the call signature matches the implementation.
2. **Credential hygiene grep across the FULL Ch.8 surface.** Run greps from AC-3. Document any hits.
3. **NetSuite token-absent mode actually flips degraded=true.** Read `apps/utility/src/mcp/netsuite/client.ts` — verify the no-credential path sets `degraded=true` AND every method returns null. Confirm via spec name.
4. **PowerBI Zod schema is `passthrough` on the full record + `strict` on lens-critical fields.** Read `apps/utility/src/mcp/powerbi/schema.ts` to confirm.
5. **The pre-existing 80 → 94 → 100 failure creep.** Confirm the new failures are NOT new Ch.8 specs but are pre-existing patterns (better-sqlite3 ABI, RED stubs, etc.).
6. **Notarization config readiness.** Read `apps/main/build/entitlements.mac.plist` + `electron-builder.yml` (or root config) — verify entitlements are minimal-but-correct per BLOCKERS B14.

## Audit method

1. **Read every Wave 2 + integration file.** Cite line numbers.
2. **Run `pnpm vitest run`.** Confirm Ch.8 specs pass. Capture total pass/fail count + delta from baseline 80 failures.
3. **Run `pnpm -r typecheck`.** Verify exit-0 clean.
4. **Run the wire-up greps from "Critical spot-checks" above.**
5. **Verify each client.ts implements McpClient.** `grep -rn "implements McpClient\|implements I.*Client" apps/utility/src/mcp/` — every client should hit.

## What you don't do

- Write code. If you find a bug, REOPEN with a specific fix path.
- Write tests.
- Audit beyond Ch.8.
- Block on Russell-action items (Salesforce Connected App / Gmail OAuth / NetSuite TBA / Chorus key / Apple credentials / venv bootstrap / Day-Zero form) — those are explicit pre-conditions, not bugs.

## Verdict format

Output `docs/reviews/ch8-final-audit-qa-report.md`:

```markdown
# Ch.8 Final — Audit/QA Report

**Date:** <ISO>
**Auditor:** EvidenceQA sub-agent (independent)
**Scope:** Full Ch.8 — 5 MCPs + PowerBI subprocess + safeStorage infra + Day-Zero form + notarization smoke + buildDeps wiring
**Verdict:** PASS | CONCERN-CLOSE | REOPEN
**Prior Wave-1 audit:** docs/reviews/ch8-wave1-audit-qa-report.md (CONCERN-CLOSE)

## Summary
<one paragraph>

## AC-by-AC verdict
| AC | Verdict | Evidence |
|---|---|---|
...

## Wave 2 specific findings
1. <if any>

## Issues found
1. <issue with file_path:line + impact + recommended fix>
...

## Spot-checks summary
- Typecheck: <result>
- Vitest: <result>
- Credential-hygiene greps: <result>
- B7/B19/B20 greps: <result>
- buildDeps wiring: <result>
- Notarization readiness: <result>

## Ch.8 close + Ch.9 dispatch recommendation
<green-light / hold-until-fix / REOPEN>
```

Then commit with `ch.8 audit: final report — <verdict>`. No Claude attribution.

## Report-back (≤250 words)

- Verdict + AC count.
- Top 3-5 issues.
- Ch.9 dispatch recommendation.
- Russell-action items remaining (pre-conditions only; don't count as bugs).
