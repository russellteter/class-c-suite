# ADR-0010 — MCP Integration (Ch.8)

**Status:** Accepted
**Date:** 2026-05-27
**Owner:** /goal Phase 2 — Ch.8 architect
**Builds on:** ADR-0006 (Ch.5 cash-lever slice — stub MCPs), ADR-0009 (Ch.7 playbook contracts), `docs/architecture/mcp.md`, `docs/research/R1-connector-reality.md` (live SOQL verification), BLOCKERS §B1/§B2/§B7/§B14/§B18/§B19/§B20.
**Closes:** ROADMAP §Ch.8 acceptance criteria; PRD §6 (5 V1 MCPs + PowerBI); Phase R Decision 9 (PowerBI subprocess); Phase R Decision 4 (per-playbook prereq matrix's MCP-block dimension).
**Inherits:** Ch.7 closed PASS (all 8 playbooks ship with stubbed MCP clients via `PlaybookDeps`). Phase B sub-agents wrote degraded-mode handlers expecting real MCP clients — Ch.8 fulfills the interface.

---

## 1. Problem

Phase 2 Ch.7 ships every playbook with `PlaybookDeps` interface declared but unimplemented (`salesforce?: SalesforceClient | undefined` — always undefined at runtime). The Synthesizer + Verifier pipeline runs against stub data. Ch.8 must:

1. Implement five V1 MCP clients (Salesforce, NetSuite, AWS, Gmail, Chorus) with real auth + safeStorage credential storage + typed query builders encoding BLOCKERS-mitigation rules (B7 active-AM, B19 stage labels, B20 renewal field).
2. Wire PowerBI customer-dashboard subprocess per Phase R Decision 9 — invoke `python3 src/main.py -j /tmp/<runId>.json` and consume the JSON.
3. Inject these clients into every playbook's `PlaybookDeps` so Phase B playbook degraded-mode logic (already shipped) starts firing against real data.
4. Capture Day-Zero forms (B6 covenant terms + B19 committed-pipeline mental model) — the typed builders need Russell's confirmation of "committed" semantics.
5. Notarization smoke (B14) mid-chapter — don't defer to Ch.11.

## 2. Decision

Ship Ch.8 as **§3 framework (auth + safeStorage + live-verification protocol) + §4-9 per-service contracts + §10 PowerBI subprocess + §11 Day-Zero form + §12 notarization smoke + §13 ACs + §14 build sequencing.**

**Build sequencing (per advisor + Ch.7 lessons).** Two-wave dispatch with intermediate audit:

- **Wave 1 (novel patterns, dispatched in parallel):**
  - Salesforce sub-agent — Connected App OAuth + safeStorage refresh-token + typed SOQL builder + live curl smoke against Class org.
  - PowerBI subprocess sub-agent — Python invocation wrapper + JSON consumer + venv preflight + error handling.
  - Day-Zero form sub-agent (small) — html-driven-codev surfaces B6 + B19 questions in parallel; Russell answers async.
- **Intermediate audit (EvidenceQA)** — verify both novel patterns + the safeStorage + live-verification spot-checks. Catch wire-new-helpers anti-patterns before pattern-matchers compound them.
- **Wave 2 (pattern-matchers, dispatched in parallel — 3 sub-agents):**
  - Gmail sub-agent — Google OAuth read-only (mirrors Salesforce shape; smaller).
  - NetSuite sub-agent — TBA tokens (B1 pending Brian) + skip-and-flag fallback + typed SuiteQL builder (B20 renewal field).
  - AWS + Chorus sub-agent — AWS local SSO from `~/.aws/` (smallest surface, no auth flow) + Chorus API key (trivial, ~50 lines).
- **Notarization smoke** dispatched mid-chapter (after Wave 1 audit closes) — throwaway build + `xcrun notarytool submit --wait`. Don't wait for Ch.11.
- **Final audit** — full Ch.8 EvidenceQA pass. CONCERN-CLOSE acceptable per Ch.6/Ch.7 precedent.

**File-scope separation per sub-agent.** Each MCP gets its own directory `apps/utility/src/mcp/<service>/` with `client.ts` (auth + raw calls) + `typed-queries.ts` (builders encoding BLOCKERS rules) + `errors.ts` (per-service error semantics). Shared types in `packages/shared-types/src/mcp.ts`.

---

## 3. Framework (applies to all MCP clients)

### 3.1 Client contract (`packages/shared-types/src/mcp.ts`)

```ts
export interface McpClient {
  serviceId: McpServiceId;        // 'salesforce' | 'netsuite' | 'aws' | 'gmail' | 'chorus' | 'powerbi'
  isAuthenticated(): Promise<boolean>;
  reconnect(): Promise<void>;      // triggers re-auth flow (browser open + safeStorage save)
  healthCheck(): Promise<McpHealth>; // { ok: boolean; lastSuccessAt?: Date; lastError?: string }
}

export type McpServiceId = 'salesforce' | 'netsuite' | 'aws' | 'gmail' | 'chorus' | 'powerbi';

export interface McpHealth {
  ok: boolean;
  lastSuccessAt?: Date;
  lastError?: string;
  authMode: 'oauth' | 'tba' | 'sso' | 'api_key' | 'subprocess';
}
```

Service-specific clients extend this with their typed query methods (see §4-9).

### 3.2 Credential storage — `apps/utility/src/credentials/safeStorageVault.ts`

**Lock.** ALL credentials go through Electron's `safeStorage.encryptString(...)` → SQLite `credentials` table → `safeStorage.decryptString(...)` at use-time. Zero plaintext on disk. Zero in repo. Zero in process.env.

```ts
// New SQLite migration: db/migrations/006_credentials.sql
CREATE TABLE credentials (
  service_id TEXT PRIMARY KEY,         // 'salesforce', 'gmail', etc.
  encrypted_blob BLOB NOT NULL,        // safeStorage.encryptString(JSON-serialized credential)
  credential_type TEXT NOT NULL,       // 'oauth_refresh_token', 'tba_token', 'api_key', 'sso_profile_ref'
  expires_at INTEGER,                  // Unix epoch ms, NULL if non-expiring
  last_refreshed_at INTEGER NOT NULL,
  metadata_json TEXT                   // service-specific (e.g., Salesforce instance URL)
);
```

API:
```ts
async function storeCredential(serviceId: McpServiceId, plaintext: string, type: CredentialType, expiresAt?: Date, metadata?: object): Promise<void>;
async function loadCredential(serviceId: McpServiceId): Promise<{ plaintext: string; type: CredentialType; expiresAt?: Date; metadata?: object } | null>;
async function deleteCredential(serviceId: McpServiceId): Promise<void>;
```

**Forbidden inferences.** No service may write credentials to vault, to env vars, to plain files, or to logs. Audit will grep for `process.env.SALESFORCE_TOKEN` / `process.env.NETSUITE_TOKEN` / etc — must return zero.

### 3.3 Live-verification protocol (`~/.claude/rules/verify-live-endpoints-before-done.md`)

Every Ch.8 sub-agent MUST script a curl or service call against the real production service after their client lands, and capture the response in `docs/research/R3-mcp-live-smoke.md` (one §per service). CI mocks will not catch field-name drift, saved-search shape drift, or stale auth refresh. The verification is part of done — not a follow-up.

The script lives at `scripts/mcp-live-smoke.sh` — one section per service. Sub-agents append.

### 3.4 Error semantics (Phase R Decision 5 verbatim)

Each client surfaces typed errors per `docs/research/phase-r-decisions.md` Decision 5 (network timeout / auth-expired / MCP-down / vault-unreachable / vault-git-commit-fail). Errors propagate to playbooks via `PrereqDecision` (block/degrade/proceed) per ADR-0009 §3.6.

### 3.5 Injection-fuzz on typed builders

Every typed query builder (SOQL, SuiteQL, etc.) must pass an injection-fuzz spec — see `tests/unit/mcp/<service>/injection-fuzz.spec.ts`. Pattern from existing `packages/soql-builder/` tests.

---

## 4. Salesforce (`apps/utility/src/mcp/salesforce/`)

**Auth.** OAuth 2.0 Connected App in the Class org (`classedu.my.salesforce.com`). Refresh-token grant. Russell triggers Connected App setup once in Class admin; refresh token stored via §3.2.

**Files.**
- `client.ts` — `SalesforceClient implements McpClient`. Methods: `query(soql)`, `queryAll(soql)`, `describeObject(name)`. Handles refresh-on-401.
- `typed-queries.ts` — pre-built typed queries encoding BLOCKERS rules:
  - `committedPipelineQuery({ asOfDate? })` — B19: `StageName IN ('Verbal Agreement', 'Verbal Approval', 'Contracting', 'Quote in Review', 'Negotiation')` for new business; `StageName IN ('Renewal Quote Sent', 'Qualified Renewal')` for renewals (Day-Zero answer may refine).
  - `accountAMHealthQuery({ accountId })` — B7: traverses `Account_Manager__r` + `IsActive = TRUE` (never `Owner.Name`).
  - `renewalForecastQuery({ months })` — B20: reads `Account.Renewal_Anniversary_Date__c` (not `Renewal_Date__c`).
- `oauth-flow.ts` — opens browser to `https://classedu.my.salesforce.com/services/oauth2/authorize?...`, listens on `http://localhost:53682/callback`, exchanges authcode for refresh token, calls `storeCredential('salesforce', refreshToken, ...)`.
- `errors.ts` — `SalesforceAuthExpiredError`, `SalesforceFieldNotFoundError`, etc.

**Live smoke.** `scripts/mcp-live-smoke.sh` appends: `node -e "const c = require('./dist/mcp/salesforce/client.js'); c.committedPipelineQuery({}).then(console.log)"` — confirms real records return.

**Day-Zero dependency.** B19 form answer narrows the committed-pipeline filter. Without it, ship the conservative default in `typed-queries.ts` and surface a "directional — Day-Zero pending" flag on memos that consume it.

---

## 5. NetSuite (`apps/utility/src/mcp/netsuite/`)

**Auth.** TBA tokens issued by Brian (B1). **TBA-stubbed + skip-and-flag fallback per ADR §2.**

**Files.**
- `client.ts` — `NetSuiteClient implements McpClient`. Methods: `runSuiteQL(query)`, `runSavedSearch(id)`. **If `safeStorage` has no `netsuite` credential, every method returns `null` + sets `degraded: true` on the client; playbooks receive `null` and degrade per their prereq matrix.**
- `typed-queries.ts`:
  - `cashGLBalanceQuery({ asOfDate })` — reads Class cash GL accounts (NetSuite has no covenant-specific saved search per B6 — derived from raw SuiteQL).
  - `payrollByDeptQuery({ month })` — GTM payroll lookup.
  - `foreignTotalQuery({ accountId, currency })` — encodes `foreigntotal` rule from `docs/architecture/mcp.md` §NetSuite.
  - `payrollBlindSpotQuery` — encodes the payroll-blind-spot rule.
  - `revenueWith24MonthSkip` — encodes the 24-month skip rule.
- `tba-setup.md` — Russell-facing doc to relay to Brian when TBA tokens are needed. Existing `scripts/send-tba-request.md` already drafts this.
- `errors.ts` — `NetSuiteTBAExpiredError`, `NetSuiteSavedSearchNotFoundError`, etc.

**Live smoke.** If TBA tokens are not yet present: smoke uses the MCP fallback (`mcp__claude_ai_Class_Technologies_NetSuite__*` tools that work for Synthesizer-stage prototyping per B1 mitigation) and notes "TBA pending Brian." If TBA present: live SuiteQL call returns real cash balance.

---

## 6. AWS (`apps/utility/src/mcp/aws/`)

**Auth.** Local SSO. Reads from `~/.aws/credentials` + `~/.aws/config`. **No browser flow.** Just shells out to AWS CLI or uses `aws-sdk-v3` with SSO credentials provider.

**Files.**
- `client.ts` — `AWSClient implements McpClient`. Methods: `getCostExplorer({ profile, start, end })`, `getOrganizationAccounts({ profile })`. **Critical rule:** sum `class` + `collab` profiles always (per PRD §6 + R1 verified). If only one is present, degrade-flag.
- `typed-queries.ts` — pre-built aggregations encoding the `class + collab` sum.
- `errors.ts` — `AWSProfileNotFoundError`, `AWSSSOExpiredError`.

**Live smoke.** `aws --profile class sts get-caller-identity` + `aws --profile collab sts get-caller-identity` from sub-agent's terminal. Confirms both profiles authenticated.

**B32 carryover.** AWS SSO mid-job expiry — Ch.10 scheduler implements preflight token-expiry check; Ch.8 surfaces the typed error.

---

## 7. Gmail (`apps/utility/src/mcp/gmail/`)

**Auth.** Google OAuth 2.0 read-only scope (`https://www.googleapis.com/auth/gmail.readonly`). Mirrors Salesforce OAuth shape — sub-agent pattern-matches §4.

**Files.**
- `client.ts` — `GmailClient implements McpClient`. Methods: `searchThreads(query, options)`, `getThread(id)`, `getMessage(id)`.
- `typed-queries.ts`:
  - `recentThreadsByStakeholderQuery({ stakeholderEmail, since })` — used by `stakeholder_1_1` playbook.
  - `recentExecCorrespondenceQuery({ keywords, since })` — used by board_narrative + restructure_decision.
- `oauth-flow.ts` — browser flow on Google's OAuth endpoint, localhost callback.
- `errors.ts` — `GmailAuthExpiredError`, `GmailThreadNotFoundError`.

**Live smoke.** Search the last 7 days of Russell's inbox for any thread; confirm non-empty response.

---

## 8. Chorus (`apps/utility/src/mcp/chorus/`)

**Auth.** API key. Russell pastes the key once via UI (or env-bootstrap); stored via §3.2 as `credential_type: 'api_key'`.

**Files.**
- `client.ts` — `ChorusClient implements McpClient`. Methods: `listEngagements({ since })`, `getEngagementSummary(id)`, `searchCallsByParticipant({ name })`.
- `typed-queries.ts`:
  - `recentCallsForStakeholderQuery({ stakeholder, since })` — used by stakeholder_1_1 + restructure_decision.
  - `callsByAccountIdQuery({ accountId, since })`.
- `errors.ts` — `ChorusAuthExpiredError`, `ChorusRateLimitedError`.
- **B11 cap.** All Chorus-sourced claims must be tagged `source_type: 'chorus'` and capped <70 confidence per BLOCKERS B11. Client emits `sourceConfidenceCap: 69` on every result.

**Live smoke.** `listEngagements({ since: yesterday })` returns at least one result.

---

## 9. PowerBI customer-dashboard subprocess (`apps/utility/src/mcp/powerbi/`)

**Auth.** Inherits from the customer-dashboard project's own auth (Russell's Microsoft account + Google Sheets OAuth for the Master Renewal Playbook source). No new credentials in C-Suite scope. C-Suite C-Suite path:
- Verify Python 3.11+ is on PATH via `which python3`.
- Verify customer-dashboard project exists at `/Users/russellteter/Claude Code Projects/customer-dashboard/`.
- Verify the project's venv exists at `customer-dashboard/.venv/`; if not, surface remediation.

**Files.**
- `subprocess.ts` — `PowerBIClient implements McpClient`. Methods:
  - `runFullExport({ runId }): Promise<CustomerDashboardData>` — spawns `python3 src/main.py -j /tmp/cdash-<runId>.json --validate` from the customer-dashboard cwd, parses the JSON, validates via Zod schema.
  - `getAccountUsage({ accountId18 })` — for one-account queries; uses the project's existing query interface if available, falls back to full-export + filter.
- `schema.ts` — Zod schemas for the JSON shape the Python project emits. Validated before lens consumption.
- `errors.ts` — `PowerBIPythonMissingError`, `PowerBIVenvMissingError`, `PowerBISubprocessError`, `PowerBIJsonInvalidError`.

**Live smoke.** Spawn the subprocess; confirm valid JSON returned; spot-check one record against the Class customer-dashboard truth.

**B18 + B2 mitigations.** `scripts/preflight.sh` adds Python + venv check. Ch.11 setup runbook documents bootstrap. Subprocess fallback path documented for Ch.8 sub-agent if Python proves brittle.

---

## 10. Playbook dependency injection

`apps/utility/src/playbooks/lib/buildDeps.ts` (new) — assembles `PlaybookDeps` per the playbook's declared needs. Reads from the credentials vault + auth-status checks. Returns a `PlaybookDeps` object with each service either populated or `undefined` (for the playbook's prereq evaluator to handle).

`apps/utility/src/orchestrator/run-loop.ts` — calls `buildDeps(playbookId)` at run-start, passes into `runPlaybook(input, ctx)`. **Single change to run-loop.ts** beyond Ch.7 — minimal blast radius.

## 11. Day-Zero form (B6 + B19)

Built via html-driven-codev sub-agent in parallel with Salesforce + PowerBI Wave 1 work. Surfaces 5 questions:
1. **Committed pipeline definition** (B19) — confirm or refine the conservative default.
2. **Barclays covenant — leverage ratio** (B6).
3. **Barclays covenant — FCCR** (B6).
4. **Barclays covenant — customer concentration** (B6).
5. **Covenant grace period + cure semantics** (B6).

Answers persist to `business-planning/_dayzero/2026-05-27-ch8-form.md` (one canonical doc; later forms append). Typed builders read from this file on startup (cached).

If Russell doesn't answer before Ch.8 close: ship the conservative defaults + flag affected memos as "directional pending Day-Zero confirmation." Don't block Ch.8 close.

## 12. Notarization smoke (B14)

Dispatched mid-chapter (after Wave 1 audit closes) as a parallel single-purpose sub-agent:
- Run `pnpm electron-builder build --mac --publish=never` to produce a `.dmg`.
- Run `xcrun notarytool submit <dmg> --apple-id <Russell's> --team-id <Class Apple Developer team ID> --wait`.
- On notarization success: `xcrun stapler staple <dmg>`.
- Smoke test: install the stapled `.dmg`, launch, confirm main process starts without "developer cannot be verified" warning.

**Entitlements file.** `apps/main/build/entitlements.mac.plist` — start minimal per BLOCKERS B14 (`com.apple.security.cs.allow-jit` only). Add `disable-library-validation` only if pre-built binary signing fails.

**If notarization fails:** sub-agent halts + writes findings to `docs/research/R3-notarization-smoke.md`. Don't loop; report.

**Russell action required:** provide Apple Developer team ID + ensure `xcrun altool/notarytool` is set up with app-specific password. /goal cannot do this; surface in handoff if not done before Ch.8 close.

## 13. Acceptance criteria

- **AC-1**: All 5 MCP clients (Salesforce + NetSuite + AWS + Gmail + Chorus) implement `McpClient` contract.
- **AC-2**: PowerBI subprocess wrapper produces validated JSON consumable by lenses with citable `source_id`.
- **AC-3**: Every credential stored via `safeStorage` — zero plaintext on disk, zero in repo, zero in env. Audit grep returns zero hits for hard-coded keys.
- **AC-4**: `apps/utility/src/playbooks/lib/buildDeps.ts` injects clients into all 8 playbooks' `PlaybookDeps`. Playbooks consume real data when authenticated; degrade per ADR-0009 §3.6 when not.
- **AC-5**: Salesforce typed SOQL builder encodes B7 (`Account_Manager__r` + `IsActive`), B19 (R1-verified stage labels), B20 (`Renewal_Anniversary_Date__c`).
- **AC-6**: NetSuite typed SuiteQL builder encodes `foreigntotal` + payroll-blind-spot + 24-month skip rules.
- **AC-7**: AWS client sums `class` + `collab` profiles; degrades if one missing.
- **AC-8**: Gmail OAuth read-only scope; silent refresh on access-token expiry.
- **AC-9**: Chorus claims tagged `source_type: 'chorus'`, capped <70 confidence.
- **AC-10**: PowerBI subprocess fallback path documented; preflight.sh checks Python + venv.
- **AC-11**: Live-endpoint smoke scripts at `scripts/mcp-live-smoke.sh` (one section per service) — all sections pass against real services.
- **AC-12**: Injection-fuzz specs at `tests/unit/mcp/<service>/injection-fuzz.spec.ts` — all 5 typed builders fuzz-clean.
- **AC-13**: B6 + B19 Day-Zero form captured (or conservative defaults flagged as directional if Russell hasn't answered).
- **AC-14**: B14 notarization smoke completes — `.dmg` notarized + stapled, OR findings doc written if it failed (no silent skip).
- **AC-15**: `pnpm vitest run` exit-0 clean (plus the pre-existing 80 better-sqlite3 ABI failures unchanged).
- **AC-16**: B11 Chorus cap propagates through Synthesizer's confidence schema (existing Ch.4 cap-enforcement path consumes Chorus's `sourceConfidenceCap: 69`).

## 14. Build sequencing summary

```
Day-Zero form sub-agent (parallel from start)
  ↓ (form lands when Russell answers; build doesn't block)
Wave 1: Salesforce sub-agent ‖ PowerBI subprocess sub-agent
  ↓
Intermediate Wave-1 audit (EvidenceQA — credential hygiene + live verification + framework conformance)
  ↓
Wave 2: Gmail ‖ NetSuite ‖ AWS+Chorus (3 parallel sub-agents)
  ↓ (parallel)
Notarization smoke sub-agent (single-purpose; runs while Wave 2 builds)
  ↓
Final Ch.8 audit (EvidenceQA — full ACs)
  ↓
Ch.8 close — build-log + state.json + handoff
```

Effort estimate: 12-16 days per ROADMAP. With parallel Wave-2 + notarization-smoke, target compression to ~8 sub-agent dispatches with intermediate-audit gating.

## 15. UNKNOWN at write-time

- Connected App client_id + client_secret for Salesforce — Russell creates the Connected App in Class org; surfaces credentials to Wave 1 Salesforce sub-agent on first run.
- Apple Developer team ID for notarization — Russell provides; sub-agent halts if absent.
- Brian's TBA enablement timeline — NetSuite sub-agent ships skip-and-flag fallback; live SuiteQL smoke deferred until TBA lands.
- Exact venv state of customer-dashboard — PowerBI sub-agent's first action is `ls customer-dashboard/.venv/`; if absent, runs the project's bootstrap per its CLAUDE.md.
- Russell's covenant terms verbatim — Day-Zero form captures; conservative defaults ship until then.
