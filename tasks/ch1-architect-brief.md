# Ch.1 Architect — SPEC Brief

## Your role

You are the Architect for C-Suite Chapter 1 (Process architecture, IPC, SQLite, scheduler). You operate under DOCTRINE (10 non-negotiable laws). You write SPEC + ADR only — no production code. The Runtime + Test dispatches that follow you must not see your reasoning trace (DOCTRINE law #7).

## Required reads (in order)

1. `ROADMAP.md` §Ch.1 (lines ~55-66) — chapter exit criteria.
2. `docs/decisions/0001-ch0-foundations.md` — Ch.0 ADR (shared types, IPC types, pinned versions, repo skeleton). Your spec builds on this; do NOT contradict.
3. `docs/architecture/runtime.md` — process architecture + IPC + scheduler scaffolds.
4. `docs/architecture/data.md` — SQLite runtime store schema (lines 280-386).
5. `docs/research/phase-r-decisions.md` §Decision 5 — Error handling per failure type table (drop into your spec verbatim).
6. `docs/research/R2-feasibility-notes.md` §B16 + §B34 — SQLite userData path requirement + heartbeat-only IPC relay constraint.
7. `BLOCKERS.md` B4 (Max window economics — DOWNGRADED P2), B5 (cost semantics), B16 (audit-trail in SQLite local), B30 (ruvector.db investigation), B32 (subpath exports for Electron runtime — surfaced by Ch.0 Audit/QA).
8. `docs/reviews/ch0-audit-qa-report.md` §7d — subpath exports concern flagged for Ch.1.

## Deliverables

Produce ONE ADR at `docs/decisions/0002-ch1-process-architecture.md`. It must contain:

### Section 1 — Three-process Electron shell

Concrete process model + lifecycle. Main process is the system-tray owner. Utility process is the Claude Agent SDK orchestrator + MCP clients + SafeWrite executor (Ch.2 implements). Renderer is React + UI (Ch.5 first uses).

Specify:
- `utilityProcess.fork()` invocation per Ch.0 ADR §1.2 (Electron 42.x). Include the `modulePath`, `args`, `options` shape.
- Renderer `BrowserWindow` config: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `preload` script path.
- Main↔utility IPC: `MessagePort` pair set up at fork time. Main↔renderer IPC: `ipcMain.handle` / `ipcRenderer.invoke` for request-response; `webContents.send` / `ipcRenderer.on` for events.
- The preload script's `contextBridge.exposeInMainWorld('ipc', { ... })` surface — minimum API only.

### Section 2 — Subpath exports for Electron runtime (Ch.0 Audit/QA concern §7d)

Update each affected `package.json` with an `exports` map covering the subpaths the renderer + utility + main processes will import:

```json
"exports": {
  ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" },
  "./parseArtifact": { "import": "./dist/parseArtifact.js", "types": "./dist/parseArtifact.d.ts" },
  "./normalizeKeys": { ... },
  "./vault-schemas": { ... },
  "./ipc": { ... }
}
```

This means each package needs a `build` step that emits `dist/*.js` + `dist/*.d.ts`. Specify the TypeScript build command (`tsc` per package).

### Section 3 — Supervised utility-process restart from SQLite checkpoint

The main process owns supervision. If the utility process crashes (exit code ≠ 0), main:
1. Logs the crash (event + stack from utility's stderr) to SQLite `process_events` table.
2. Restarts the utility process within 1 second.
3. Restored utility process reads from SQLite to determine in-flight run state.
4. Resumes from last checkpoint (per `docs/architecture/runtime.md` §Checkpoint and resume).

Specify:
- The supervision loop logic + max-retries (default 5 within 60s; after that, surface error to renderer + halt).
- The `process_events` SQLite table schema.
- The checkpoint-resume API contract: `Orchestrator.resumeRun(runId)` → reads `runs` table + `agent_invocations` table; restarts from last completed lens.

### Section 4 — SQLite runtime store

Per `docs/architecture/data.md` §SQLite + R2 B16 finding (path = `app.getPath('userData')`):
- Path: `path.join(app.getPath('userData'), 'runtime.db')` — NEVER `app.getPath('documents')` (avoids iCloud sync territory).
- `better-sqlite3` for synchronous transactional writes (vault writes are atomic per Ch.2 SafeWrite).
- Migration runner: read `schema_version`, apply pending migrations in single transaction.
- Migration file naming: `db/migrations/NNN_<name>.sql` (3-digit zero-padded, lexicographically sorted).
- Idempotency: every migration uses `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, etc.

Specify:
- Initial schema (Ch.1 deliverable) = `runs`, `agent_invocations`, `tool_calls`, `process_events`, `cost_ledger`, `schema_version`. (`writebacks`, `jobs`, `workstream_amounts_mirror`, `calibration_window` land in later chapters.)
- The migration-runner TypeScript module path: `apps/main/src/db/migrate.ts`.
- Concurrency: SQLite WAL mode (`PRAGMA journal_mode=WAL`).
- **B30 (ruvector.db) gate:** Ch.1 architect MUST run `sqlite3 ruvector.db .schema` and document what it is. Likely Ruflo plugin artifact. If unrelated to C-Suite, document + ignore. If conflicts with our `runtime.db` path, decide rename strategy.

### Section 5 — Token-budget concurrency scheduler

Per `docs/architecture/runtime.md` §Token-budget scheduler + B4 DOWNGRADED:
- Window cap: 180K tokens (B4 conservative — Max limits doubled May 2026; 180K leaves headroom for external Claude usage).
- Scheduler state struct (per runtime.md line 184).
- **Priority rule:** interactive runs strict-priority over scheduled. In-flight scheduled completes; pending-scheduled pauses.
- **Degradation rule:** if `tokensConsumed + estimatedAgentTokens > windowCap`, downgrade run from parallel to sequential.
- **Backoff:** exponential with jitter on 429; never silently retry.
- **Cost meter (B5 verified):** display `result.usage.total_cost_usd` as reference figure with tooltip "API-equivalent cost (Max plan pays flat monthly)". Display window-remaining tokens as the primary signal.

Specify:
- `Scheduler.canDispatch(estimatedTokens)`: boolean.
- `Scheduler.dispatch(invocation)`: `Promise<AgentResult>` — gates via canDispatch; tracks tokens; emits `scheduler.throttle` IPC event on degradation.
- `Scheduler.reset()`: clears window when 5-hr rolling window expires.
- IPC events emitted: `scheduler.throttle`, `cost.usage`, `scheduler.window.reset`.

### Section 6 — Error handling table (Decision 5 verbatim)

Drop in the table from `docs/research/phase-r-decisions.md` §Decision 5 — per failure type retry/degrade/escalate behavior. Include B32 (AWS SSO mid-job) item.

### Section 7 — Heartbeat-only IPC relay (B34)

Partial-message streaming from SDK → main → renderer MUST be throttled. Raw stream events would saturate the IPC channel on long Opus Verifier runs.

Specify:
- Heartbeat interval: 250ms (4 events/sec max per agent).
- Heartbeat payload: `{ agentId, role, kind: 'thinking', tokensSoFar, lastTokenAt }` — NOT raw token text.
- Full structured output flows on `agent.complete` (one event per agent, not per token).
- Backpressure design: if the renderer is unresponsive (>2s without ack on a critical event), main buffers and drops heartbeats (preserves correctness events).

### Section 8 — Structured JSON logs with cross-process correlation IDs

- Format: JSON Lines, one log entry per line.
- Fields: `{ ts, level, runId, agentId?, process: 'main'|'utility'|'renderer', message, ...payload }`.
- Correlation: `runId` spans main + utility for any run-related event. `agentId` spans utility + renderer for any agent event.
- Log destination: `app.getPath('logs')` + rotation per Electron's default.
- Renderer logs: relayed via IPC to main, written to the same log file (single source of truth).

### Section 9 — Acceptance criteria checklist (testable)

Map each ROADMAP §Ch.1 exit criterion to a test or observation. 8-12 rows. Format: `| # | Criterion | Test/Observation | Owner |`.

Include:
- IPC round-trip test (main → utility → main, < 50ms latency).
- Supervised restart test (kill utility process, verify main respawns within 1s, run resumes from checkpoint).
- Scheduler caps test (request 10 concurrent agents at 20K tokens each; scheduler degrades to sequential).
- Migration idempotency test (run migrate twice; second run is no-op).
- Log correlation test (a single run produces events in main + utility both tagged with the same runId).

### Section 10 — Considered alternatives

For each major decision: what you considered + rejected (e.g., `MessagePort` vs `ipcMain.handle` for main↔utility; LevelDB vs better-sqlite3 for runtime store; cron vs node-cron for scheduler — though scheduler internal, not jobs).

### Section 11 — DOCTRINE amendment ratification (if Russell approves)

If `docs/build-log.md` shows the Ch.0 DOCTRINE amendment proposal is unaddressed by Russell, surface it again here with: "Russell ratifies at Ch.1 boundary." If unsurfaced/unaddressed, do NOT auto-apply.

## Discipline

- SPEC only. No production code.
- Cite Ch.0 ADR section + runtime.md/data.md line ranges for every architectural claim.
- UNKNOWN over fabrication.
- After writing ADR-0002, return structured summary (<500 words): ADR path, key contract diffs (table + scheduler signatures), acceptance criteria table, B30 ruvector.db verdict, any UNKNOWN items.
- Opus 4.7 — architecture-across-many-files.

## Out of scope

- SafeWrite (Ch.2).
- Agent definitions / prompts (Ch.3 + Ch.4).
- UI screens (Ch.5).
- Vault writes.
