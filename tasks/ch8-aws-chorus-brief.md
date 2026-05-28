# Ch.8 Wave 2 — AWS + Chorus MCP Builder Brief

Pattern-match the Salesforce sub-agent's shape (Ch.8 Wave 1, commits `cacb1e7..9320d7f`). Read those files first. Two services here because both are small surfaces.

## Contract
`docs/decisions/0010-ch8-mcp-integration.md` §3 (framework) + §6 (AWS) + §8 (Chorus) + BLOCKERS §B11 (Chorus <70 confidence cap).

## Working directory
`/Users/russellteter/Claude Code Projects/c-suite/` (quote — has spaces).

## Scope (yours alone — non-overlapping with Gmail / NetSuite / Notarization)

### `apps/utility/src/mcp/aws/`
**Auth.** Local SSO. Reads from `~/.aws/credentials` + `~/.aws/config`. No browser flow. Use `@aws-sdk/client-cost-explorer`, `@aws-sdk/client-organizations`, `@aws-sdk/credential-providers` (sso credentials provider).
- `client.ts` — `AWSClient implements McpClient`. Methods: `getCostExplorer({ profile, start, end })`, `getOrganizationAccounts({ profile })`, `isAuthenticated()`, `reconnect()`, `healthCheck()`. **Critical rule**: sum `class` + `collab` profiles always (per R1-verified). If only one is present, return result + `degraded_sources: ['aws-collab' | 'aws-class']`.
- `typed-queries.ts` — pre-built aggregations encoding the `class + collab` sum.
- `errors.ts` — `AWSProfileNotFoundError`, `AWSSSOExpiredError`, `AWSCostExplorerError`.
- `index.ts` — exports.

Live smoke: `aws --profile class sts get-caller-identity` + `aws --profile collab sts get-caller-identity`. If one profile fails → BLOCKED-flag with remediation `aws sso login --profile <name>`.

### `apps/utility/src/mcp/chorus/`
**Auth.** API key. Russell pastes once → stored via `safeStorage` as `credential_type: 'api_key'`.
- `client.ts` — `ChorusClient implements McpClient`. Methods: `listEngagements({ since })`, `getEngagementSummary(id)`, `searchCallsByParticipant({ name })`, `isAuthenticated()`, `reconnect()`, `healthCheck()`.
- `typed-queries.ts`:
  - `recentCallsForStakeholderQuery({ stakeholder, since })` — used by `stakeholder_1_1` + `restructure_decision`.
  - `callsByAccountIdQuery({ accountId, since })`.
- `confidence-cap.ts` — exports constant `CHORUS_CONFIDENCE_CAP = 69` per B11. Every result from client tagged `source_type: 'chorus'` + `sourceConfidenceCap: 69`. Confirms the Synthesizer's existing cap-enforcement consumes this.
- `errors.ts` — `ChorusAuthExpiredError`, `ChorusRateLimitedError`, `ChorusAPIKeyMissingError`.
- `index.ts` — exports.

Live smoke: `listEngagements({ since: yesterday })` → assert ≥1 engagement returned. BLOCKED-flag if API key not present.

### `scripts/mcp-live-smoke.sh`
Append §AWS + §Chorus sections.

### `tests/unit/mcp/aws/` + `tests/unit/mcp/chorus/`
- AWS: `client.spec.ts` (class+collab sum + degraded-source flag); `typed-queries.spec.ts`; `cost-explorer-mock.spec.ts`.
- Chorus: `client.spec.ts`; `typed-queries.spec.ts`; `confidence-cap.spec.ts` (assert every returned record carries `sourceConfidenceCap: 69`).

≥30 specs total (15 per service).

## Forbidden inferences
- Touching other MCP services.
- Hard-coding AWS account IDs or Chorus API key in source.
- Skipping the class+collab sum rule (AWS).
- Skipping the <70 Chorus cap.

## What "done" looks like
- All files + `pnpm -r typecheck` exit-0 clean.
- All existing tests pass.
- `scripts/mcp-live-smoke.sh aws` + `scripts/mcp-live-smoke.sh chorus` both exit 0.
- ≥30 new specs.
- Atomic commits — `ch.8 aws: <what>` or `ch.8 chorus: <what>`. No Claude attribution.

## Russell-action items
- Run `aws sso login --profile class` + `aws sso login --profile collab` if either SSO is expired.
- Provide Chorus API key on first launch — env var `CHORUS_API_KEY`; safeStorage saves it.

## Report-back (≤200 words)
- Commits + first-line.
- AWS profile + Chorus key presence on Russell's Mac.
- Vitest + typecheck results.
- Russell-action items.
