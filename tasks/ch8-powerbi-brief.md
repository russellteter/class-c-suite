# Ch.8 Wave 1 — PowerBI Subprocess Builder Brief

You are the PowerBI sub-agent for Ch.8 Wave 1. Contract: `docs/decisions/0010-ch8-mcp-integration.md` §3 (framework) + §9 (PowerBI subprocess). Read both fully.

## Working directory
`/Users/russellteter/Claude Code Projects/c-suite/` (quote — has spaces).

## External project (READ ONLY — do not modify)
`/Users/russellteter/Claude Code Projects/customer-dashboard/` — Python project. Entry: `src/main.py` with `-j/--json` flag (line 379). Verified.

Read its `CLAUDE.md` to understand the data shape it emits. Read `src/main.py` to understand what `--json` produces. Read `src/data_processor.py` if needed for JSON shape.

## Scope (yours alone — non-overlapping with Salesforce / Day-Zero / Wave 2 briefs)

### 1. PowerBI client — `apps/utility/src/mcp/powerbi/`
- `subprocess.ts` — `PowerBIClient implements McpClient`. Methods per ADR §9:
  - `runFullExport({ runId }): Promise<CustomerDashboardData>` — spawns `python3 src/main.py -j /tmp/cdash-<runId>.json --validate` from the customer-dashboard cwd, parses the JSON, validates via Zod schema.
  - `getAccountUsage({ accountId18 })` — derives single-account from `runFullExport` cached result (cache TTL 1hr; runId-scoped fresh cache).
  - `isAuthenticated()` — returns true if python3 + venv + customer-dashboard project all present.
  - `reconnect()` — runs preflight check + reports findings.
  - `healthCheck()` — runs a fast subprocess smoke and reports lastSuccessAt + lastError.
- `schema.ts` — Zod schemas for the JSON shape the Python project emits. Read `customer-dashboard/src/data_processor.py` + `customer-dashboard/src/generator.py` to understand the shape. Add Zod schemas with field-by-field validation. Key fields per customer-dashboard CLAUDE.md: `Account ID 18 Digit`, segment, engagement_score, last_activity_date, renewal_date_proxy. (Use the actual fields the project emits; don't invent.)
- `preflight.ts` — exports `preflightPowerBI()` returning `{ python: 'ok' | 'missing'; venv: 'ok' | 'missing'; project: 'ok' | 'missing' }`. Used by `scripts/preflight.sh` (extend that script too).
- `errors.ts` — `PowerBIPythonMissingError`, `PowerBIVenvMissingError`, `PowerBISubprocessError`, `PowerBIJsonInvalidError`.
- `index.ts` — exports.

### 2. preflight.sh extension
Append a `§PowerBI` section to `scripts/preflight.sh`:
- Check `python3 --version` exits 0 and version is ≥3.11.
- Check `/Users/russellteter/Claude Code Projects/customer-dashboard/.venv/` exists.
- Check `customer-dashboard/src/main.py` exists.
- Report PASS / FAIL with remediation for each.

If venv is absent: the FAIL message tells Russell to run `cd customer-dashboard && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt` (or whatever the project's bootstrap is — confirm from its CLAUDE.md).

### 3. Live smoke — `scripts/mcp-live-smoke.sh`
Per ADR §3.3. Append §PowerBI section that:
- Runs preflight.
- Spawns the subprocess: `python3 src/main.py -j /tmp/cdash-smoke.json --validate` (cwd=customer-dashboard) via the C-Suite client wrapper.
- Validates the output JSON against the Zod schema.
- Reports count of records + first 3 anonymized.
- Exits 0 on success, non-zero on failure.

If venv is absent: smoke prints "BLOCKED: awaiting venv bootstrap" and exits 0.

### 4. Subprocess robustness — error handling
- Subprocess timeout: 120s default. Configurable via env `POWERBI_SUBPROCESS_TIMEOUT_MS`. On timeout: kill, emit `PowerBISubprocessError`.
- stdout/stderr streamed to debug log (not parsed JSON output — that lands in the `-j` file path).
- Exit code != 0: read stderr tail + throw `PowerBISubprocessError({ exitCode, stderrTail })`.
- JSON validation failure: throw `PowerBIJsonInvalidError({ zodError, jsonPath })`.

### 5. Unit + integration specs — `tests/unit/mcp/powerbi/`
- `subprocess.spec.ts` — mock spawn() + assert correct args + cwd; assert timeout fires; assert error semantics.
- `schema.spec.ts` — Zod schemas catch malformed JSON; valid JSON parses.
- `preflight.spec.ts` — preflight returns correct state for present/absent python/venv/project (use temp dir scaffolding).

≥20 specs total.

## Forbidden inferences (audit will REOPEN)

- Modifying anything under `/Users/russellteter/Claude Code Projects/customer-dashboard/` — that project is owned separately. **You may read it freely. You must not write to it.**
- Inventing JSON fields the Python project doesn't actually emit — read its source first.
- Storing customer-dashboard credentials in C-Suite — auth inherits from the Python project's own config (Microsoft account + Google Sheets OAuth in that project, not in C-Suite).
- Touching `apps/utility/src/mcp/{salesforce,netsuite,aws,gmail,chorus}/` — out of scope.
- Skipping the live smoke. The PowerBI subprocess is a Python dependency the C-Suite has never exercised — verifying it actually works at Ch.8 entry catches integration drift early.

## What "done" looks like

- All files above written + `pnpm -r typecheck` exit-0 clean.
- All existing tests pass.
- `scripts/preflight.sh` reports PowerBI status with PASS/FAIL/remediation.
- `scripts/mcp-live-smoke.sh powerbi` exits 0 (BLOCKED-flagged if venv missing).
- ≥20 new specs.
- Atomic commits — one concept per commit. `ch.8 pbi: <what> — <why>`. No Claude attribution.

## Russell-action items (surface in report)

- If customer-dashboard project venv is not set up: Russell runs the project's bootstrap. The preflight FAIL message tells him exactly what.
- If Python 3.11+ is not on his PATH: install via `brew install python@3.12` or pyenv.

## Report-back (≤300 words)

- Commits made (SHA + first-line).
- Files created/modified count.
- Preflight status of his Mac (Python version, venv presence, project presence).
- Live-smoke status (PASS / BLOCKED).
- JSON shape summary (top-level fields the Python project emits — 1-2 sentences).
- `pnpm vitest run` + `pnpm -r typecheck` results.
- Russell-action items if any.
- Any contract ambiguity resolved + decision.

DO NOT touch other MCP services. DO NOT close Ch.8.
