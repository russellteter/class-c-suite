# Ch.10 — Runtime Builder Brief (Scheduler + 5 Jobs + LaunchAgent + Notifications)

Contract: `docs/decisions/0012-ch10-scheduler-autonomy.md` (read fully — §3 framework, §4-8 per-job, §9 LaunchAgent, §11 ACs). Inherits ADR-0009 (playbook router) + ADR-0010 (buildDeps + MCP clients).

## Working directory
`/Users/russellteter/Claude Code Projects/c-suite/` (quote — has spaces).

## Scope (yours alone — non-overlapping with Renderer brief)

### 1. Shared types — `packages/shared-types/src/scheduled-job.ts` (new)
Per ADR §3.1. Export `JobId`, `JobDefinition`, `RetryPolicy`, `JobRunRecord`, `JobSummary`. Zod schemas where wire-crossing. Re-export from index.ts.

### 2. SQLite migration — `db/migrations/007_scheduled_jobs.sql` (new)
Per ADR §3.7 verbatim. Idempotent. Advances `schema_version` to 7.

### 3. Job registry — `apps/utility/src/scheduler/jobRegistry.ts` (new)
Per ADR §3.2. Single source of truth for 5 jobs. Each entry matches the §4-8 specifications.

### 4. Cron driver — `apps/utility/src/scheduler/cron.ts` (new)
Per ADR §3.3. Use `node-cron` package (add to apps/utility/package.json deps). On `initScheduler()`: read JOB_REGISTRY, schedule each with `timezone: 'America/New_York'`. Wraps job runner with retry + writes to scheduled_jobs SQLite.

### 5. Catch-up logic — `apps/utility/src/scheduler/catchUp.ts` (new)
Per ADR §3.4. On scheduler init: for each job, compute most-recent-scheduled-time from cron expression; query SQLite for last actuallyRanAt; if missed, enqueue ONE catch-up run (NOT N for N missed weeks). Emit `scheduler.catchup.summary` IPC.

### 6. Retry policy executor — `apps/utility/src/scheduler/retry.ts` (new)
Per ADR §3.5. Implements Phase R Decision 5 verbatim. `executeWithRetry(jobDef, runFn, db)` catches typed errors, applies backoff per `RetryPolicy`, marks job state, fires native notifications per `notifyOnFailure`, escalates to P2 alert after 3 consecutive failures.

### 7. Native macOS notifications — `apps/utility/src/notifications/macNotify.ts` (new)
Per ADR §3.6. Uses Electron's `Notification` API. Posts from utility process via IPC to main, main fires notification. 3 types per ADR §3.6 table. Click action: opens C-Suite window + navigates.

Add IPC variant: `main.show-notification` — payload `{ type, title, body, clickAction }`. Main side: `apps/main/src/notifications.ts` handler.

Permission check: on first scheduled-job invocation, ensure `Notification.requestPermission()` is granted. On denied: fall back to in-app banner via `scheduler.notification.permission_denied` IPC.

### 8. 5 job runners — `apps/utility/src/jobs/`
One file per job, matching ADR §4-8:
- `mondayTripwire.ts` — covenant scan + transition detection + `cash_lever` invocation on flip + weekly-cash-forecast output.
- `mondayStakeholder.ts` — foreach stakeholder file (skip if updated <7d); sequential `stakeholder_1_1` invocations.
- `sundayRenewal.ts` — `renewal-forecast` skill (B7 + B20 mitigations) + Chorus call lookup + memo at scheduled-reports/.
- `sundayWorkstream.ts` — re-parse vault workstreams → repopulate `workstream_amounts_mirror` SQLite + memory consolidation (prune old rows per documented TTLs).
- `dailyMorningBrief.ts` — fixed-prompt `quick_read` invocation.

### 9. LaunchAgent — `scripts/install-launchagent.sh` + `scripts/uninstall-launchagent.sh` + `apps/main/build/launch-agent.plist.template`
Per ADR §9.1-9.3. Install script templates the plist with `$(whoami)` + app path, writes to `~/Library/LaunchAgents/`, loads via `launchctl bootstrap`. Idempotent.

### 10. `--scheduler-only` main flag
Per ADR §9.1. `apps/main/src/index.ts` (or wherever the CLI flag parsing is): when `--scheduler-only` passed, start utility + scheduler but DO NOT create renderer BrowserWindow. Lock file at `~/Library/Application Support/c-suite/.scheduler.lock` so the normal launch detects the running instance + connects.

### 11. IPC additions — `packages/shared-types/src/ipc.ts`
Per ADR §10.1:
- `home.scheduledJobs` — payload `{ jobs: JobSummary[] }`.
- `scheduler.catchup.summary` — payload `{ caughtUp: Array<{ jobId, missedScheduledFor }> }`.
- `scheduler.tripwire.flipped` — payload `{ tripwireId, oldState, newState }`.
- `scheduler.notification.permission_denied` — payload `{}`.

### 12. Specs — `tests/unit/scheduler/` + `tests/unit/jobs/` + `tests/unit/notifications/`
- `cron.spec.ts` — verify each job's cron expression parses + next-run-time matches.
- `catchUp.spec.ts` — Mac-off-for-2-weeks simulation: 14 missed daily-morning-brief → exactly ONE catch-up enqueued.
- `retry.spec.ts` — each error type (network/auth/mcp/vault) gets correct retry behavior per Decision 5.
- `jobs/*.spec.ts` — per-job runner with mocked playbook + mocked MCP deps; verify cash_lever invoked on tripwire flip; verify stakeholder skip-if-recent; verify B7+B20 in renewal; verify workstream_amounts_mirror repopulation; verify quick_read invocation.
- `notifications.spec.ts` — 3 notification types fire on correct triggers; click action opens correct surface.
- `jobRegistry.spec.ts` — 5 jobs registered with correct ID/cron/runner.

≥80 specs total.

## Forbidden inferences (audit will REOPEN)

- Inventing job IDs not in the 5-job set.
- Skipping the catch-up `ONCE per missed schedule` rule (Decision 7).
- Auto-restarting on user force-quit (Decision 7 explicit: `KeepAlive.SuccessfulExit: false`).
- Storing credentials anywhere outside safeStorage.
- Bypassing the scheduled_jobs SQLite table for any run-state write.
- Inventing your own retry policy — Decision 5 is verbatim.
- Touching `apps/renderer/` (Renderer scope).

## What "done" looks like

- All files written + `pnpm -r typecheck` exit-0 clean.
- All existing tests pass (`pnpm vitest run`); no new failures.
- ≥80 new specs.
- `node-cron` added to apps/utility/package.json deps.
- LaunchAgent install script tested (chmod +x; verified plist templates correctly).
- Atomic commits — `ch.10 sched: <what>` or `ch.10 jobs: <what>` or `ch.10 notify: <what>`. No Claude attribution.

## Russell-action items (surface in report)

- Run `bash scripts/install-launchagent.sh` post-Ch.11 install to schedule jobs to fire even when C-Suite isn't open.
- Approve macOS notification permission on first scheduled-job run.

## Report-back (≤300 words)
- Commits + first-line.
- Typecheck + vitest results.
- Russell-action items.

DO NOT touch renderer. DO NOT close Ch.10.
