# Ch.1 Test — TDD Brief

## Your role

Test author for Ch.1. Write tests against ADR-0002 §9 acceptance criteria. You do NOT write production code (Runtime dispatch, in parallel). DOCTRINE law #7.

## Required reads

1. `docs/decisions/0002-ch1-process-architecture.md` — your spec. Section 9 (acceptance criteria, 12 rows) is your test surface.
2. `docs/decisions/0001-ch0-foundations.md` — Ch.0 ADR. Don't regress Ch.0's 170 tests.
3. Existing tests at `tests/unit/*.spec.ts` — don't modify; only add new files.
4. `vitest.config.ts` — root config; add new aliases if needed for `@c-suite/main`, `@c-suite/utility`.

## Test files to write (path + criteria mapping)

### `tests/unit/ipc-roundtrip.spec.ts` (ADR §9 row 1)

- Set up Electron MessagePort pair in a Node-only context (use `worker_threads` MessagePort polyfill if Electron is unavailable in test env).
- Send message from "main" → "utility"; assert utility receives it.
- Send response from "utility" → "main"; assert main receives.
- Measure round-trip time; assert < 50ms (single in-process channel).

### `tests/unit/supervisor.spec.ts` (ADR §9 rows 2 + 10)

- Mock `utilityProcess.fork()` to spawn a child that exits with code 1 after 100ms.
- Supervisor detects exit; respawns within 1000ms.
- After respawn, `run.resumed` event fires within 1500ms total.
- After 5 crashes within 60s, supervisor surfaces `utility.failed` IPC + halts.
- `process_events` SQLite row inserted on each fork + each exit.

### `tests/unit/scheduler.spec.ts` (ADR §9 rows 3 + 11)

- Construct scheduler with windowCap=180_000.
- Dispatch 10 invocations × 20_000 tokens each (200K total).
- Expect first 9 dispatches return promises; 10th triggers degradation to sequential (`scheduler.throttle` emitted).
- After window reset (mock 5-hr advance), `scheduler.window.reset` emitted; tokensConsumed resets to 0.
- Test the `scheduler.window.reset` IPC variant parses via `IpcMessage` discriminated union.

### `tests/unit/migrate.spec.ts` (ADR §9 row 4)

- Set up temp SQLite DB.
- Run `migrate()` once; assert `schema_version` row count = 1.
- Run `migrate()` again; assert no-op (schema_version still 1 row; no errors).
- Verify all expected tables exist: `runs`, `agent_invocations`, `tool_calls`, `process_events`, `cost_ledger`, `schema_version`.

### `tests/unit/logging.spec.ts` (ADR §9 row 5)

- Mock pino to capture log entries.
- Invoke a run that crosses main → utility → main boundaries.
- Assert every log entry tagged with the same runId.
- Assert all 3 processes' logs contain that runId.

### `tests/unit/heartbeat.spec.ts` (ADR §9 row 6)

- Simulate 1000 token events from SDK over 10s.
- Verify renderer receives ≤ 45 heartbeat events (capped at 4/sec × 10s + tolerance).
- Verify final `agent.complete` event always lands (not dropped).
- Backpressure: if renderer doesn't ack in >2s, heartbeats drop but completion event survives.

### `tests/unit/subpath-exports.spec.ts` (ADR §9 row 7)

- Run `pnpm build:packages` (via vitest's `child_process.execSync` or `runCommand` helper).
- Assert `packages/shared-types/dist/parseArtifact.js`, `dist/normalizeKeys.js`, `dist/vault-schemas.js`, `dist/ipc.js` exist.
- Import via subpath syntax (`require('@c-suite/shared-types/parseArtifact')` in a child process to bypass vitest aliases) — assert resolves.
- Skip the subpath-import test if running under vitest only (alias intercepts); document this in comment.

### `tests/unit/db-open.spec.ts` (ADR §9 row 8)

- Mock `app.getPath('userData')` to return a temp dir.
- Open `runtime.db` via the production handle module.
- Verify file lands at `{tempDir}/runtime.db`, NOT in `~/Documents/`.
- Verify `PRAGMA journal_mode` returns `WAL`.

### `tests/unit/orchestrator-resume.spec.ts` (ADR §9 row 12)

- Pre-populate SQLite with: 1 run in `current_state='fan-out'`, 3 agent_invocations (2 completed, 1 in_progress).
- Call `resumeRun(runId)`.
- Assert the 2 completed agents' outputs are loaded into the run state.
- Assert the 1 in_progress agent is re-dispatched (not skipped).
- Assert no completed agent is re-run.

### `tests/unit/error-handling.spec.ts` (Section 6 — Decision 5 table)

For each failure type in `phase-r-decisions.md` §Decision 5:
- Network timeout → exponential backoff (30s, 2m, 10m); max 3 retries.
- Auth expired → NO retry; emit `mcp.auth.expired` immediately.
- MCP down → exponential backoff (1m, 5m, 30m); max 3 retries.
- Vault unreachable → retry 3× at 10s; then HALT.
- Vault git commit fail → no retry; queue git-commit-retry every 5m.

Assert each policy fires correctly via mocked failures.

## Coverage gates

≥80% line coverage of `apps/main/src/`, `apps/utility/src/`, `apps/renderer/src/`.

## Discipline

- TDD: tests describe intended behavior. They fail until Runtime ships.
- Use vitest. Real production modules (no mocks of the modules-under-test).
- Mock Electron APIs (`app.getPath`, `utilityProcess.fork`, `BrowserWindow`) only — they're not testable in Node.
- Commit per test file. Each auto-pushes.

## Return

Under 500 words: test files created (paths), coverage estimate, any spec ambiguity, commit SHAs (last 10), `tail -5 .git/auto-push.log`.

## Out of scope

- Production code (Runtime).
- ADR modification.
- E2E / Playwright (Ch.5).
- SafeWrite fuzz (Ch.2).
