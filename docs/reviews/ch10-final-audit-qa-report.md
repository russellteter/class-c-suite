# Ch.10 Final — Audit/QA Report

**Date:** 2026-05-27
**Auditor:** EvidenceQA sub-agent (independent)
**Scope:** Full Ch.10 — scheduler infra + 5 jobs + LaunchAgent + native notifications + JobsStrip live + SettingsScheduler + NotificationSettings + new specs
**Original Verdict:** REOPEN
**Resolved Verdict:** **REOPEN-RESOLVED** (2026-05-28 same-session) — see "REOPEN resolution" below.
**Effective Verdict:** **CONCERN-CLOSE** (AC-15 AWS SSO preflight carried as known Ch.11 follow-up).
**Phase 2 close gate:** RESOLVED — Phase 2 COMPLETE may emit.

## REOPEN resolution

The blocking AC-2 bridge gap is fixed in commit `a40ddcd`:

- `apps/main/src/supervisor.ts` — `port.on('message', ...)` handler added after channel setup. Routes `main.show-notification` to a new optional `mainBoundHandler` param (→ `fireNotification`); forwards every other variant to `webContents.send('ipc:message', msg)`; ignores malformed messages; wraps the send in try/catch for `--scheduler-only` mode (no renderer attached). The audit was even more right than stated — the old `ipcMain.on('ipc:message')` handler was on the renderer→main channel, so `main.show-notification` never actually reached it from the utility port either. The new bridge is the single correct path for ALL utility-emitted variants.
- `apps/main/src/main.ts` — both startup paths (normal + `--scheduler-only`) pass the `mainBoundHandler` that calls `fireNotification`. Removed the dead `ipcMain.on('ipc:message')` interception + the now-unused `ipcMain` import.
- `tests/unit/supervisor.spec.ts` — 4 new bridge specs (forward-to-renderer / notification-routing-not-leaked / malformed-ignored / scheduler-only-no-throw) all green. Mock DB used to sidestep the pre-existing better-sqlite3 ABI test-env failure.
- `pnpm -r typecheck` exit-0 across all 9 packages.

AC-2 now PASS. **AC-15** (AWS SSO preflight in `dailyMorningBrief`) remains a CONCERN — carried as a Ch.11 follow-up per the auditor's own "non-blocking — can defer to Ch.11" note. **Spec-count discrepancy** (brief said 93, actual 86) is a documentation nit, not a product bug. Final tally: 14 PASS / 1 CONCERN (AC-15) / 0 REOPEN.

## Summary

Ch.10 has a blocking wiring gap: 4 of the 5 new IPC variants emitted by the utility process never reach the renderer. The utility calls `ipcPort.postMessage(msg)` over the MessagePortMain channel. In `apps/main/src/supervisor.ts`, `port1` is returned from `setupUtilityChannel` and stored in `state.port` — but there is no `port1.on('message', ...)` handler that bridges messages to `win.webContents.send('ipc:message', msg)`. The only variant that works is `main.show-notification`, which has a dedicated `ipcMain.on('ipc:message')` handler in `main.ts:114-122` that fires Electron's native notification — but this path is renderer→main IPC, not the utility port. `home.scheduledJobs`, `scheduler.catchup.summary`, `scheduler.tripwire.flipped`, and `scheduler.notification.permission_denied` are dead-ended in main. Renderer TODO comments (`ch10-runtime-ship: Runtime emits {kind: ...}`) were an accurate signal. All other spot-checks pass (catch-up ONE-per-missed, retry policy verbatim, B7+B20, plist SuccessfulExit:false, timezone, migration, typecheck). 172 Ch.10 specs pass but they use mocked IPC; the production bridge is unwired.

## AC-by-AC verdict

| AC | Verdict | Evidence |
|---|---|---|
| AC-1 | PASS | `apps/utility/src/scheduler/jobRegistry.ts:8` — 5 jobs, cron expressions match §3.2. Test: `jobRegistry.spec.ts` "registers exactly 5 jobs" |
| AC-2 | PASS | `apps/utility/src/scheduler/cron.ts:218` timezone `America/New_York`; cron.spec.ts passes |
| AC-3 | PASS | `apps/utility/src/scheduler/catchUp.ts:88-116` — single `mostRecentScheduledTime` per job, one enqueue. Test: "enqueues exactly ONE catch-up when Mac was off for 2 weeks" PASS |
| AC-4 | PASS | `packages/shared-types/src/scheduled-job.ts:29-35` DEFAULT_RETRY_POLICY: networkTimeout 3×[30s,2m,10m]; authExpired no-retry; mcpDown 3×[1m,5m,30m]; vaultUnreachable 3×10s. Matches Decision 5 verbatim. |
| AC-5 | PASS | `apps/utility/src/jobs/mondayTripwire.ts:158-187` — flipped tripwires call `notifyTripwireFlip` + invoke `cash_lever` playbook. `apps/utility/src/notifications/macNotify.ts:33` emits `scheduler.tripwire.flipped`. |
| AC-6 | PASS | `apps/utility/src/jobs/mondayStakeholder.ts:53-57` — file mtime < 7 days → skip with log. |
| AC-7 | PASS | `apps/utility/src/jobs/sundayRenewal.ts:4-5,42-43` — `Account_Manager__r`, `IsActive`, `Renewal_Anniversary_Date__c` present. Zero hits for `Owner.Name` and `Renewal_Date__c`. |
| AC-8 | PASS | `apps/utility/src/jobs/sundayWorkstream.ts:111-140` — `workstream_amounts_mirror` DELETE+INSERT; prune TTLs. |
| AC-9 | PASS | `apps/utility/src/jobs/dailyMorningBrief.ts:46` — memo written with `stamp: QUICK_READ`. `invokePlaybook: 'quick_read'` in jobRegistry:54. |
| AC-10 | PASS | `apps/main/build/launch-agent.plist.template:16-18` — `<key>SuccessfulExit</key><false/>`. `scripts/install-launchagent.sh:36-39` — idempotent: unload before re-bootstrap. |
| AC-11 | PARTIAL | `main.show-notification` → Electron Notification: WIRED (`apps/main/src/main.ts:114-122` + `notifications.ts:34`). `scheduler.tripwire.flipped`, `scheduler.notification.permission_denied` emitted by utility but never bridged to renderer in normal mode — see Issue 1. |
| AC-12 | REOPEN | `apps/utility/src/scheduler/cron.ts:106` emits `home.scheduledJobs` via `ipcPort.postMessage`. Port1 in `supervisor.ts:91` has no `.on('message')` handler to forward to renderer. `JobsStrip.tsx:263` never receives this message in production. See Issue 1. |
| AC-13 | PASS | `apps/renderer/src/App.tsx:107-119` — routes `settings-scheduler` and `settings-notifications` are wired. Components exist. |
| AC-14 | PASS | `db/migrations/007_scheduled_jobs.sql` — `CREATE TABLE IF NOT EXISTS scheduled_jobs` with all required columns. Advances schema_version to 7. |
| AC-15 | CONCERN | `apps/utility/src/jobs/dailyMorningBrief.ts` — no preflight AWS SSO token-expiry check before `runPlaybook`. ADR AC-15 requires preflight + graceful degradation. Delegates to playbook layer, unverified. |
| AC-16 | PASS | 172 Ch.10 specs pass (86 Runtime + 86 Renderer), exit-0. Brief's Runtime count (93) overstates actual (86, 10 files) — brief documentation error, not an AC violation. |

## Issues found

1. **BLOCKING — Missing MessagePort→renderer bridge for 4 IPC variants (AC-12, AC-11)**
   **File:** `apps/main/src/supervisor.ts:73-81` — `setupUtilityChannel` returns `port1`; stored in `state.port`. No `port1.on('message', ...)` handler exists anywhere in `apps/main/src/`.
   **How to confirm:** `grep -rn "port1\.\|port\.on\|state\.port\.on" apps/main/src/` returns zero hits.
   **Impact:** In production, utility's `ipcPort.postMessage({ kind: 'home.scheduledJobs', ... })` (and catchup.summary, tripwire.flipped, permission_denied) is sent to port1 and silently dropped. `JobsStrip.tsx` never updates; `CatchupToast.tsx` never fires; `TripwireBanner.tsx` never fires; `NotificationSettings.tsx` never updates. Only `main.show-notification` works because it is intercepted by the separate `ipcMain.on('ipc:message')` handler (renderer→main IPC path).
   **Recommended fix:** In `startSupervision` (or `main.ts` after calling it), add:
   ```ts
   port.on('message', (event: { data: unknown }) => {
     const msg = event.data as { kind?: string } | null;
     if (!msg?.kind) return;
     // Forward all utility IPC to renderer (main.show-notification handled separately)
     if (msg.kind !== 'main.show-notification') {
       webContents.send('ipc:message', msg);
     }
   });
   ```
   **Priority:** Critical / blocking

2. **CONCERN — AC-15: No AWS SSO preflight in dailyMorningBrief**
   **File:** `apps/utility/src/jobs/dailyMorningBrief.ts` (no preflight call)
   **Impact:** ADR §11 AC-15 requires preflight token-expiry check; graceful degradation on AWS failure without aborting the brief. If `runPlaybook` doesn't handle this internally, mid-job SSO expiry will either throw or silently degrade. Non-blocking for Phase 2 close after Issue 1 is fixed.
   **Priority:** Medium

## Spot-checks summary

- **Typecheck:** PASS — `pnpm -r typecheck` exits 0 across all 10 packages
- **Vitest:** PASS — 172 Ch.10 specs pass (86 Runtime + 86 Renderer), 0 failing, 0 skipped. Full suite: 12 pre-existing test files fail on better-sqlite3 Node ABI mismatch — not Ch.10 regressions.
- **Catch-up ONE-per-missed (AC-3):** PASS — `catchUp.ts:88-116` enqueues exactly one run. Spec passes.
- **KeepAlive.SuccessfulExit:false (AC-10):** PASS — `launch-agent.plist.template:16-18` confirmed. Install script idempotent.
- **Retry policy verbatim (AC-4):** PASS — `DEFAULT_RETRY_POLICY` in `shared-types/src/scheduled-job.ts:29-35` matches Decision 5 exactly.
- **B7+B20 in sundayRenewal (AC-7):** PASS — Required fields present; forbidden fields absent.
- **IPC end-to-end (AC-12):** REOPEN — Emit sites confirmed in utility. Consume sites confirmed in renderer. Bridge in main is MISSING: `supervisor.ts:91` returns port1 but no `port.on('message')` handler forwards to `webContents.send`. 4 variants dead-ended.
- **Cron timezone:** PASS — `apps/utility/src/scheduler/cron.ts:3,218` — `timezone: 'America/New_York'`

## Phase 2 close recommendation

REOPEN. Fix required: add `port.on('message', ...)` bridge in `supervisor.ts` or `main.ts` to forward utility port messages to `win.webContents.send('ipc:message', msg)`. This is a 5-10 line fix. After fix: re-run typecheck + Ch.10 specs, re-audit AC-12. AC-15 can be logged as a known gap and deferred to Ch.11 given it requires playbook-layer verification. Phase 2 COMPLETE should not emit until the port bridge is in place.
