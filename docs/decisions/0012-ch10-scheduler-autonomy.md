# ADR-0012 — Scheduled Jobs Autonomy (Ch.10)

**Status:** Accepted
**Date:** 2026-05-27
**Owner:** /goal Phase 2 — Ch.10 architect
**Builds on:** ADR-0002 (Ch.1 process arch — scheduler skeleton + 5-hr window cap), ADR-0009 (Ch.7 playbooks — jobs invoke playbooks), ADR-0010 (Ch.8 MCPs — jobs consume MCP clients via PlaybookDeps), ADR-0011 (Ch.9 handoff — jobs may emit handoff briefs). Phase R Decision 5 (retry semantics — VERBATIM source) + Decision 7 (LaunchAgent vs LaunchDaemon — VERBATIM source).
**Closes:** ROADMAP §Ch.10 acceptance criteria; PRD §6 (5 scheduled jobs); PRD §4 outcomes #5, #6.
**Inherits:** Ch.1 scheduler skeleton (`apps/utility/src/scheduler/scheduler.ts`) + cost-meter window (180K, 5-hr); Ch.7 playbook router (`KNOWN_CH7_PLAYBOOK_IDS`); Ch.8 MCP clients via `buildDeps`; Ch.9 handoff (some jobs may surface "draw-up" recommendation in their memo).
**Last build chapter.** After Ch.10 audit closes, Phase 2 emits COMPLETE. Hard stop at Ch.11 (Russell on-Mac demos).

---

## 1. Problem

The C-Suite is reactive today (Russell opens it, runs a playbook). Russell's operating model demands proactive surfacing: tripwires that flip Monday morning, renewal risk that spikes Sunday afternoon, morning briefs that prep him for the day. 5 named scheduled jobs per PRD §6 must:
1. Fire on the documented cron via LaunchAgent (survives sleep/wake/Mac restart).
2. Catch up missed runs ONCE on next wake (not N times — per Decision 7).
3. Retry per failure type per Decision 5 (network → backoff, auth-expired → no retry + reconnect prompt, MCP-down → backoff, vault-unreachable → halt).
4. Degrade gracefully — flag missing sources in memo header; NEVER invent data (Russell's preference per CLAUDE.md).
5. Surface outputs on home screen (Ch.7's `JobsStrip` component currently renders "Pending Ch.10" placeholders — Ch.10 wires real data).
6. Emit native macOS notifications on: tripwire flip (state transition GREEN→YELLOW→RED), memo ready (post-run), scheduled-job failure (3 consecutive fires).

Today (post-Ch.9): `apps/utility/src/scheduler/scheduler.ts` exists with token-window accounting; `apps/utility/src/scheduler/index.ts` exports `initScheduler(emit)`. No cron triggers, no jobs registered, no LaunchAgent, no native notifications, no catch-up, no retry, no home-screen wiring.

## 2. Decision

Ship Ch.10 as **§3 framework (job contract + cron registry + retry/catch-up + native notifications) + §4–8 per-job contracts + §9 LaunchAgent + §10 home-screen wiring + §11 ACs + §12 build sequencing.**

**Build: 2 parallel sub-agents + 1 sequential follow-up.**
- **Runtime sub-agent** — job registry + cron driver + catch-up logic + retry per Decision 5 + native notifications + LaunchAgent .plist generator + 5 job definitions. Owns its own specs.
- **Renderer sub-agent** — `JobsStrip` wiring (replaces "Pending Ch.10" placeholders), `NotificationSettings` panel in Settings, optional run-history view per Decision 7's "Caught up N missed jobs" surface.
- **Final Ch.10 audit (single)** — EvidenceQA pass covers the chapter. CONCERN-CLOSE acceptable per Ch.7/Ch.8/Ch.9 precedent.

Effort estimate: 8-12 days per ROADMAP.

---

## 3. Framework

### 3.1 Job contract — `packages/shared-types/src/scheduled-job.ts` (new)

```ts
export type JobId =
  | 'monday-tripwire'
  | 'monday-stakeholder'
  | 'sunday-renewal'
  | 'sunday-workstream'
  | 'daily-morning-brief';

export interface JobDefinition {
  id: JobId;
  cronExpression: string;          // standard cron, ET timezone
  description: string;
  invokePlaybook?: PlaybookId;     // optional — some jobs invoke a playbook
  customRunner?: 'tripwire' | 'workstream-regen' | 'memory-consolidation';  // custom paths
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
  retryPolicy: RetryPolicy;        // per Decision 5
}

export interface RetryPolicy {
  networkTimeout: { maxRetries: 3; backoffMs: [30_000, 120_000, 600_000] };
  authExpired: 'no_retry_reconnect_prompt';
  mcpDown: { maxRetries: 3; backoffMs: [60_000, 300_000, 1_800_000] };
  vaultUnreachable: { maxRetries: 3; backoffSeconds: 10 };
  vaultGitCommitFail: 'no_retry_queue_5m_retries';
}

export interface JobRunRecord {
  jobId: JobId;
  scheduledFor: Date;
  actuallyRanAt: Date | null;       // null if missed and not yet caught up
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'caught_up' | 'skipped_auth_expired';
  degraded_sources: DegradedSource[];
  outputMemoPath?: string;          // vault path if job produced a memo
  failureReason?: string;
  runId?: string;                   // link to runs table if invokePlaybook fired
  durationMs?: number;
}
```

### 3.2 Job registry — `apps/utility/src/scheduler/jobRegistry.ts` (new)

Single source of truth for the 5 jobs. Each job declares its cron + invocation:

```ts
export const JOB_REGISTRY: Record<JobId, JobDefinition> = {
  'monday-tripwire': {
    id: 'monday-tripwire',
    cronExpression: '0 6 * * 1',        // 6am ET Monday
    description: 'Financial tripwire scan + weekly cash forecast',
    customRunner: 'tripwire',            // tripwire scanner + invokes cash_lever playbook if RED flip
    notifyOnSuccess: false,
    notifyOnFailure: true,
    retryPolicy: DEFAULT_RETRY_POLICY,
  },
  'monday-stakeholder': {
    cronExpression: '0 7 * * 1',         // 7am ET Monday
    invokePlaybook: 'stakeholder_1_1',   // runs against ALL active stakeholders; foreach loop in customRunner
    customRunner: 'tripwire',            // custom because foreach-stakeholders, not single
    notifyOnSuccess: false,
    notifyOnFailure: true,
    // ...
  },
  'sunday-renewal': {
    cronExpression: '0 18 * * 0',        // 6pm ET Sunday
    invokePlaybook: 'gtm_realloc',       // close approximation; or custom 'renewal-sweep' runner
    // ...
  },
  'sunday-workstream': {
    cronExpression: '0 20 * * 0',        // 8pm ET Sunday
    customRunner: 'workstream-regen',    // regenerates workstream dashboard mini-view; runs memory consolidation
    // ...
  },
  'daily-morning-brief': {
    cronExpression: '0 6 * * *',         // 6am ET every day
    invokePlaybook: 'quick_read',        // six-lens compact read
    // ...
  },
};
```

### 3.3 Cron driver — `apps/utility/src/scheduler/cron.ts` (new)

Uses `node-cron` package. On scheduler init:
1. Read `JOB_REGISTRY`.
2. For each job: `cron.schedule(def.cronExpression, () => runJob(def))` with `timezone: 'America/New_York'`.
3. Job runner wraps `dispatchPlaybook(def.invokePlaybook)` or `runCustomRunner(def.customRunner)` with retry + timeout per `RetryPolicy`.
4. Each invocation writes to `scheduled_jobs` SQLite table (new migration 007) — captures `JobRunRecord`.

### 3.4 Catch-up logic — `apps/utility/src/scheduler/catchUp.ts` (new)

Per Phase R Decision 7. On scheduler init (after Mac wake / app launch):
1. For each job: compute the most recent scheduled time per its cron expression.
2. Query `scheduled_jobs` table for the latest `actuallyRanAt` per job ID.
3. If `latestRun < mostRecentScheduledTime`: enqueue a single catch-up run for that job. Mark `status: 'caught_up'`. Order: most-recent-first if multiple missed.
4. Catch-up runs ONCE per missed schedule even if multiple schedules have passed (e.g., Mac off for 2 weeks → daily-morning-brief runs ONE catch-up at next wake, not 14).
5. Emit IPC `scheduler.catchup.summary` payload `{ caughtUp: [{ jobId, missedScheduledFor }] }` — renderer surfaces "Caught up N missed jobs" toast.

### 3.5 Retry per Decision 5 (verbatim)

`apps/utility/src/scheduler/retry.ts` (new) — exports `executeWithRetry(jobDef, runFn, db)` that:
- Catches typed errors (network timeout / auth expired / MCP down / vault unreachable / vault git commit fail).
- Applies the `RetryPolicy` from §3.1 verbatim per Decision 5.
- After max retries: marks job `status: 'failed'`, surfaces native notification if `notifyOnFailure`, escalates to home-screen P2 alert if 3 consecutive scheduled fires fail (per Decision 5 escalation rule).
- On auth-expired: marks `status: 'skipped_auth_expired'`, emits native notification "Reconnect <service> to restore <jobId>". After 7 days expired: P1 home-screen alert.

### 3.6 Native macOS notifications — `apps/utility/src/notifications/macNotify.ts` (new)

Uses Electron's `Notification` API (works from main process; utility process posts IPC to main to fire). 3 notification types:

| Type | Trigger | Title | Body |
|---|---|---|---|
| Tripwire flip | `monday-tripwire` job detects GREEN→YELLOW or YELLOW→RED transition on a tracked covenant/cash KPI | "Tripwire flipped: <covenant>" | "Status: <new>. Click to view." |
| Memo ready | Any scheduled job produces a memo (run completes, `outputMemoPath` set) | "C-Suite: <jobId> memo ready" | "<one-line memo summary>" |
| Job failure | After max retries fail OR 3 consecutive scheduled fires fail | "C-Suite: <jobId> failed" | "<failureReason>. Click for details." |

Click action: opens the C-Suite window + navigates to the relevant surface (tripwire view, memo viewer, or job-status detail).

**Permission check.** Electron requires user grant for notifications. On first scheduled-job run after Ch.11 install, check `Notification.requestPermission()` if not granted; if denied, fall back to in-app banner only.

### 3.7 SQLite migration — `db/migrations/007_scheduled_jobs.sql` (new)

```sql
CREATE TABLE scheduled_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL,
  scheduled_for INTEGER NOT NULL,           -- Unix epoch ms
  actually_ran_at INTEGER,                  -- NULL if missed
  status TEXT NOT NULL,                     -- 'pending' | 'running' | 'succeeded' | 'failed' | 'caught_up' | 'skipped_auth_expired'
  degraded_sources TEXT,                    -- JSON array
  output_memo_path TEXT,
  failure_reason TEXT,
  run_id TEXT,                              -- FK to runs.run_id
  duration_ms INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (run_id) REFERENCES runs(run_id)
);

CREATE INDEX idx_scheduled_jobs_job_id_scheduled_for ON scheduled_jobs(job_id, scheduled_for DESC);
CREATE INDEX idx_scheduled_jobs_status ON scheduled_jobs(status);
```

---

## 4. `monday-tripwire` — Financial tripwire scan + weekly cash forecast

**Cron.** `0 6 * * 1` (6am ET Monday). **Custom runner.**

**Behavior.**
1. Scan covenant tripwires per `covenant-tracker` skill (B6-derived thresholds; Day-Zero form values if submitted, else conservative defaults flagged "directional").
2. For each tripwire: compute current state vs threshold; detect GREEN/YELLOW/RED transitions vs last scan.
3. If any tripwire flipped (GREEN→YELLOW or YELLOW→RED or any→BREACH): emit "Tripwire flipped" native notification + invoke `cash_lever` playbook with the flipped tripwire as input context.
4. Always: invoke `weekly-cash-forecast` skill; output goes to `<vault>/scheduled-reports/<date>-weekly-cash.md`.
5. If `cash_lever` playbook ran: its memo lands at `<vault>/memos/<runId>.md` per existing Ch.5 path.

**Failure modes.** NetSuite unreachable → degrade (cash forecast runs with stale data flag). Tripwire scan total failure → job fails + native notification.

**Module.** `apps/utility/src/jobs/mondayTripwire.ts`.

---

## 5. `monday-stakeholder` — Stakeholder activity refresh

**Cron.** `0 7 * * 1` (7am ET Monday). **Custom runner.**

**Behavior.**
1. List all stakeholder files in `<vault>/stakeholders/` (excluding `_skeleton-*` skeletons).
2. For each: invoke `stakeholder_1_1` playbook with that stakeholder as input target. **Sequential** (not parallel) — respects window cap.
3. Each playbook produces a memo; lands at `<vault>/memos/`.
4. **Skip stakeholders whose file was updated <7 days ago** — recent prep is current; don't burn tokens.
5. Aggregate: emit a single "Stakeholder refresh complete" IPC; no per-stakeholder notification.

**Failure modes.** Per-stakeholder degraded mode propagates from `stakeholder_1_1` playbook (Ch.7). Whole-job failure only if SafeWrite is broken or DB is unreachable.

**Module.** `apps/utility/src/jobs/mondayStakeholder.ts`.

---

## 6. `sunday-renewal` — Renewal forecast + Chorus sweep

**Cron.** `0 18 * * 0` (6pm ET Sunday). **Custom runner.**

**Behavior.**
1. Run `renewal-forecast` skill (Ch.8 Salesforce typed-query for accounts where `Renewal_Anniversary_Date__c` ≤ 90 days; B7 + B20 mitigations baked in).
2. For each at-risk account: query Chorus for recent calls (`recentCallsForStakeholderQuery`) — surface health signals.
3. Aggregate into a renewal-risk memo at `<vault>/scheduled-reports/<date>-renewal-sweep.md`.
4. If any account hits "critical" health threshold: emit native notification "Renewal at risk: <account>".

**Failure modes.** Salesforce auth-expired → skipped_auth_expired + reconnect notification. Chorus down → degrade (renewal data still ships; call signals flagged missing).

**Module.** `apps/utility/src/jobs/sundayRenewal.ts`.

---

## 7. `sunday-workstream` — Workstream dashboard regenerate + memory consolidation

**Cron.** `0 20 * * 0` (8pm ET Sunday). **Custom runner.**

**Behavior.**
1. Re-parse all `<vault>/workstreams/*.md` → repopulate `workstream_amounts_mirror` SQLite table (B12 mitigation; Ch.0 indexer was the original source).
2. Regenerate the workstream-dashboard mini-view aggregate (status pills, totals, dependency-graph snapshot) → SQLite.
3. Memory consolidation: prune old `process_events` (>30 days), old `runs` (>90 days), old `scheduled_jobs` (>180 days). Vacuum SQLite. Update `schema_version` if needed.

**Failure modes.** Vault unreachable → halt + immediate notification (P0). DB corruption → halt + Settings → Diagnostics surface.

**Module.** `apps/utility/src/jobs/sundayWorkstream.ts`.

---

## 8. `daily-morning-brief` — Six-lens compact read

**Cron.** `0 6 * * *` (6am ET daily, including Mondays — runs before `monday-tripwire`).

**Behavior.**
1. Invoke `quick_read` playbook (all six lenses, no Verifier, no Red-Team, no writeback per ADR-0009 §3.5).
2. Prompt template (fixed): `"Six-lens compact read for $(today). What's the one thing in each lens's domain that Russell needs to know before today's work starts?"`
3. Memo lands at `<vault>/scheduled-reports/<date>-morning-brief.md`. Stamped QUICK_READ.
4. Emit "Morning brief ready" native notification with the memo's headline-section.

**Failure modes.** Any MCP down → degraded mode per `quick_read` (skip lens whose required artifact missing; flag in stamp). Brief always ships even with degraded lenses.

**Module.** `apps/utility/src/jobs/dailyMorningBrief.ts`.

---

## 9. LaunchAgent — `~/Library/LaunchAgents/com.classedu.csuite.scheduler.plist`

Per Phase R Decision 7 (LaunchAgent, not LaunchDaemon).

### 9.1 plist contents (generated by Ch.10 build)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.classedu.csuite.scheduler</string>
  <key>ProgramArguments</key>
  <array>
    <string>/Applications/C-Suite.app/Contents/MacOS/C-Suite</string>
    <string>--scheduler-only</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <false/>
  </dict>
  <key>StandardOutPath</key>
  <string>/Users/USERNAME/Library/Logs/C-Suite/scheduler.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/USERNAME/Library/Logs/C-Suite/scheduler.err.log</string>
</dict>
</plist>
```

`--scheduler-only` flag: main process starts utility + scheduler but NO renderer window. When Russell opens C-Suite normally, the running instance is detected (lock file) + the window opens against it.

### 9.2 Install script — `scripts/install-launchagent.sh` (new)

- Templates the plist with Russell's username + app path.
- Writes to `~/Library/LaunchAgents/com.classedu.csuite.scheduler.plist`.
- Loads via `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.classedu.csuite.scheduler.plist`.
- Idempotent (unload first if already loaded).

### 9.3 Uninstall script — `scripts/uninstall-launchagent.sh` (new)

- `launchctl bootout gui/$(id -u) com.classedu.csuite.scheduler`.
- Remove plist file.

Both scripts ship in Ch.11 setup runbook; Russell runs once.

### 9.4 Edge cases (Decision 7 verbatim)

- **Mac restart while running** — LaunchAgent re-launches; in-flight run resumes from SQLite checkpoint per Ch.3.
- **User force-quit** — LaunchAgent does NOT auto-restart (respect user intent — `KeepAlive.SuccessfulExit: false` per plist).
- **Mac shutdown for several days** — catch-up logic fires each missed job ONCE at next login.
- **User not logged in when scheduled fires** — LaunchAgent runs in user session only; missed jobs caught up at next login.
- **Sleep during a long-running job** — node-cron pauses naturally; job resumes if it was mid-execution via Ch.3 checkpoint resume.

---

## 10. Home-screen wiring (Renderer scope)

The Ch.7 `JobsStrip` component renders 5 grayed "Pending Ch.10" placeholders. Ch.10 wires real data:

### 10.1 IPC variants — `packages/shared-types/src/ipc.ts` (Runtime adds)

- `home.scheduledJobs` — payload `{ jobs: JobSummary[] }`. Renderer subscribes; replaces "Pending" placeholders.
- `scheduler.catchup.summary` — payload `{ caughtUp: Array<{ jobId, missedScheduledFor }> }`. Renderer shows toast.
- `scheduler.tripwire.flipped` — payload `{ tripwireId, oldState, newState }`. Renderer shows banner.
- `scheduler.notification.permission_denied` — payload `{}`. Renderer shows in-app fallback banner.

### 10.2 `JobsStrip.tsx` (Renderer modifies — existing Ch.7 component)

- Subscribes to `home.scheduledJobs` IPC.
- Per-job row: cron summary ("Mondays 6am ET"), last run + status pill, degraded-sources chips, "view memo" link if `outputMemoPath` populated.
- Click on row → opens job-status detail modal or Settings → Scheduler view.

### 10.3 Settings → Scheduler view (Renderer adds)

- 5 jobs listed with: enable/disable toggle (writes to SQLite `scheduler_enabled` table; nothing in Ch.10 actually disables, but the UX hook is there for Phase 2.5).
- Per-job: last 10 runs (drill-down to job-status detail).
- "Reconnect <service>" buttons for any service with auth-expired status.

### 10.4 NotificationSettings panel (Renderer adds)

- Toggle per notification type: tripwire-flip / memo-ready / job-failure.
- Stored in SQLite (so persists across launches).
- Defaults: tripwire-flip ON, memo-ready ON, job-failure ON.

---

## 11. Acceptance criteria

- **AC-1**: 5 jobs registered in `JOB_REGISTRY` matching §3.2 cron expressions.
- **AC-2**: `node-cron` driver fires each job at its scheduled time (verified via fast-forward time mock in test).
- **AC-3**: Catch-up logic enqueues exactly ONE run per missed schedule (not N) — verified via test with Mac-off-for-2-weeks simulation.
- **AC-4**: Retry policy per Decision 5 — network timeout retries 3× with backoff [30s, 2m, 10m]; auth-expired never retries + reconnect notification fires; MCP-down retries 3× with backoff [1m, 5m, 30m].
- **AC-5**: `monday-tripwire` detects covenant state transitions and emits native notification + invokes `cash_lever` playbook on flip.
- **AC-6**: `monday-stakeholder` skips stakeholders updated <7 days ago.
- **AC-7**: `sunday-renewal` uses B7 (`Account_Manager__r` + `IsActive`) + B20 (`Renewal_Anniversary_Date__c`).
- **AC-8**: `sunday-workstream` regenerates `workstream_amounts_mirror` table; memory-consolidation prunes old rows per documented TTLs.
- **AC-9**: `daily-morning-brief` invokes `quick_read` playbook; QUICK_READ stamp present in memo.
- **AC-10**: LaunchAgent plist + install/uninstall scripts ship; idempotent.
- **AC-11**: Native macOS notifications fire for 3 documented triggers (tripwire-flip / memo-ready / job-failure).
- **AC-12**: Home-screen `JobsStrip` consumes `home.scheduledJobs` IPC and replaces "Pending Ch.10" placeholders.
- **AC-13**: Settings → Scheduler view + NotificationSettings panel ship.
- **AC-14**: `scheduled_jobs` SQLite table populates on each job run; queryable.
- **AC-15**: B32 — AWS SSO mid-job expiry: preflight token-expiry check before AWS job starts; graceful degradation when expired (skip AWS section, surface re-login prompt); do not abort full brief on AWS failure alone.
- **AC-16**: `pnpm vitest run` exit-0 clean for new specs.

---

## 12. Build sequencing

```
Runtime sub-agent ‖ Renderer sub-agent (parallel)
  ↓
Final Ch.10 audit (EvidenceQA)
  ↓
Ch.10 close — build-log + state.json + handoff
  ↓
Phase 2 COMPLETE emission
  ↓
HARD STOP — Ch.11 awaits Russell on-Mac demos
```

No intermediate audit — Ch.10 is one feature surface (scheduler), not a fan-out of N independent surfaces like Ch.7 (8 playbooks) or Ch.8 (5 MCPs).

## 13. UNKNOWN at write-time

- Whether `node-cron` v3+ is the right pick vs alternative cron libs — Runtime sub-agent picks; documents in module header.
- Exact format of B6 covenant thresholds (still pending Russell's Day-Zero form submission). Conservative defaults ship; flagged "directional" until form lands.
- Apple Developer team ID for code-signed app binary path in plist — defer to Ch.11 (notarization smoke from Ch.8 already surfaced this as a Russell-action).
- Whether all 5 jobs actually need to ship in Ch.10 or whether 1-2 are V1.5 deferrable — current plan ships all 5; if effort overruns, surface in handoff for Russell's call.
