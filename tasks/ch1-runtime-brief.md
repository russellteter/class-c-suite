# Ch.1 Runtime — Implementation Brief

## Your role

You are the Runtime engineer for C-Suite Chapter 1 (Process arch + IPC + SQLite + scheduler). You implement against the SPEC at `docs/decisions/0002-ch1-process-architecture.md`. You operate under DOCTRINE (10 laws). You do NOT write tests (parallel Test dispatch).

## Required reads

1. `docs/decisions/0002-ch1-process-architecture.md` — your authoritative spec. Read end-to-end.
2. `docs/decisions/0001-ch0-foundations.md` §1-3 — pinned versions + repo skeleton.
3. `packages/shared-types/src/` — Ch.0 outputs you build on (vault-schemas, parseArtifact, normalizeKeys, ipc).
4. `docs/architecture/runtime.md` + `data.md` — reference scaffolds.

## Deliverables (per ADR-0002 sections)

### Section 2 — Subpath exports + build pipeline (NEW Ch.1 — fixes Ch.0 Audit/QA §7d)

For each `@c-suite/*` package (shared-types, stub-harness, soql-builder):
- Add `exports` map to `package.json` covering each subpath (`./parseArtifact`, `./normalizeKeys`, `./vault-schemas`, `./ipc`, `./stub`).
- Add `tsconfig.build.json` extending root `tsconfig.json` with `noEmit: false`, `outDir: dist`, `rootDir: src`.
- Add `build` script: `tsc -p tsconfig.build.json`.
- Add root script: `pnpm -r --filter @c-suite/* run build` as `pnpm build:packages`.
- Ensure pnpm-lock.yaml reflects changes if any new devDeps land.

### Section 1 — Three-process Electron shell

Per ADR §1.1-1.5. Implement in `apps/main/src/`:
- `main.ts` — app lifecycle, tray, single-window creation, supervisor loop.
- `ipc/handlers.ts` — `ipcMain.handle` registrations for renderer-initiated queries (read-only SQLite views like "list runs," "get run").
- `db/handle.ts` — opens `better-sqlite3` at `path.join(app.getPath('userData'), 'runtime.db')`, applies `PRAGMA journal_mode=WAL`.
- `db/migrate.ts` — migration runner; reads `db/migrations/NNN_*.sql` lexicographically; applies in single transaction; tracks via `schema_version` table.
- `supervisor.ts` — owns the utility process lifecycle; tracks restart count; emits `process_events` rows to SQLite on every fork/exit.
- `preload.ts` — `contextBridge.exposeInMainWorld('csIpc', { invoke, on, off })` typed surface.

Implement in `apps/utility/src/`:
- `index.ts` — entry point spawned by `utilityProcess.fork()`. Listens on MessagePort for orchestrator commands.
- `orchestrator/index.ts` — owns RunState machine (skeleton only — full state lands Ch.3). Exposes `resumeRun(runId)` that reads SQLite via IPC proxy.
- `scheduler/index.ts` — token-budget scheduler singleton; implements `canDispatch()`, `dispatch()`, `reset()`. Window cap 180K. 5-hr rolling reset.
- `sql/proxy.ts` — SQL proxy that sends queries to main via MessagePort, awaits response. (Utility doesn't open the DB directly.)
- `logger.ts` — pino-based structured JSON logger. Cross-process correlation IDs.

Implement in `apps/renderer/src/`:
- `index.tsx` — React entry point. Subscribes to IPC events via the typed `csIpc` surface.
- `App.tsx` — placeholder root (Ch.5 ships real screens). For Ch.1, just renders "C-Suite — Ch.1 runtime ready" + a window-remaining counter from `cost.usage` events.

### Section 3 — Supervised restart

Per ADR §3:
- On utility crash (non-zero exit code OR uncaught error): wait 100ms, fork new utility, increment counter.
- If 5 restarts within 60s: surface to renderer as `IpcMessage<'utility.failed'>` (new variant — add to ipc.ts if needed) + halt loop.
- After successful restart: utility reads `runs` table for `current_state ≠ 'shipped_*'`, emits `run.resumed` IPC event.

### Section 4 — SQLite migrations

Create `db/migrations/001_initial.sql` per ADR §4:
- `schema_version` table
- `runs`, `agent_invocations`, `tool_calls`, `process_events`, `cost_ledger` tables
- All `CREATE TABLE IF NOT EXISTS` for idempotency
- Indexes on `tool_calls(run_id)`, `tool_calls(call_id)`, `runs(status)`, `process_events(ts)`

Migration runner test: run twice; second run is no-op (verified by `schema_version` having exactly one row).

### Section 5 — Token-budget scheduler

Per ADR §5:
- Singleton in utility process: `scheduler.ts`.
- Track `tokensConsumed`, `windowStartedAt`.
- `canDispatch(estimatedTokens)`: `tokensConsumed + estimatedTokens <= windowCap`.
- `dispatch(invocation)`: gates on canDispatch; runs in parallel for interactive, sequential under throttle.
- 5-hr window reset via `setTimeout` rearmed each window.
- Emits `scheduler.throttle`, `scheduler.window.reset`, `cost.usage` events.

### Section 6 — Error handling (Decision 5 table)

Per ADR §6 (which references `phase-r-decisions.md` §Decision 5):
- Implement retry logic per failure type (network timeout, auth expired, MCP down, vault unreachable, vault git commit fail).
- Each failure category emits a typed IPC event.
- Surface to renderer via native notifications (skeleton — Ch.10 adds full notification UI).

### Section 7 — Heartbeat-only IPC relay (B34)

Per ADR §7:
- Throttle partial messages to 250ms intervals (4/sec).
- Heartbeat payload: `{ agentId, role, kind: 'thinking', tokensSoFar, lastTokenAt }`.
- `agent.complete` is one event with full structured output (no heartbeat for completion).
- Backpressure: drop heartbeats if renderer hasn't ack'd in >2s.

### Section 8 — Structured logs

Per ADR §8:
- pino (JSON Lines, no native modules — falls back to plain pino without `pino-pretty`).
- Path: `path.join(app.getPath('logs'), 'csuite.jsonl')` with daily rotation.
- Fields: `ts, level, runId, agentId?, process, msg, ...payload`.
- Renderer logs relayed via `ipcMain.handle('log:write')`.

## Commit discipline

Atomic commits per ADR section:
1. `ch1: subpath exports + tsconfig.build + pnpm build:packages (ADR §2)`
2. `ch1: SQLite migrations 001_initial + migrate runner (ADR §4)`
3. `ch1: main process — tray + window + DB handle + IPC handlers (ADR §1)`
4. `ch1: utility process — orchestrator skeleton + SQL proxy + logger (ADR §1)`
5. `ch1: renderer — placeholder app + IPC subscriptions (ADR §1)`
6. `ch1: supervisor — utility lifecycle + crash restart (ADR §3)`
7. `ch1: token-budget scheduler (ADR §5)`
8. `ch1: error handling per failure type (ADR §6 / phase-r-decisions §Decision 5)`
9. `ch1: heartbeat-only IPC relay (ADR §7; B34)`
10. `ch1: pino structured logs with correlation IDs (ADR §8)`

Each auto-pushes via the post-commit hook.

## Verify before claiming done

- Run `pnpm -r run typecheck` — all 6 packages PASS.
- Run `pnpm build:packages` — all 3 @c-suite/* packages emit dist/.
- Run `pnpm run test:unit` — 170/170 still green (Ch.0 tests must continue passing).

## Return

Under 500 words: files created/modified (count), commit SHAs (last 10), any spec ambiguity resolved, status of `tail -5 .git/auto-push.log`. Note: Test dispatch is running in parallel — do NOT touch tests/.

## Out of scope

- Production tests (Test dispatch handles).
- SafeWrite (Ch.2).
- Agent definitions / prompts (Ch.3 + Ch.4).
- UI screens (Ch.5).
- ADR modification.
