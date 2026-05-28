# Ch.10 — Renderer Builder Brief (JobsStrip + Settings → Scheduler + Notifications panel)

Contract: `docs/decisions/0012-ch10-scheduler-autonomy.md` §10 + ADR §11 ACs 12 + 13.

## Working directory
`/Users/russellteter/Claude Code Projects/c-suite/` (quote — has spaces).

## Scope (yours alone — non-overlapping with Runtime brief)

### 1. JobsStrip live wiring — `apps/renderer/src/components/JobsStrip.tsx` (modify existing)

Today: renders 5 grayed "Pending Ch.10" placeholders from props.
After: subscribes to `home.scheduledJobs` IPC; replaces placeholders with live data.

**Per-job row:**
- Job name + cron summary ("Mondays 6am ET").
- Last run timestamp + status pill (succeeded / failed / caught_up / skipped_auth_expired).
- Degraded-sources chips if any.
- "view memo" link if `outputMemoPath` populated → opens MemoViewer with the memo.
- Click on row body → opens job-status detail modal (or routes to Settings → Scheduler with that job pre-selected — pick one; document choice).

**Toast for catch-up:** subscribe to `scheduler.catchup.summary` IPC. On event: show toast "Caught up N missed jobs since last launch." Auto-dismiss after 5s; click to expand.

**Banner for tripwire flip:** subscribe to `scheduler.tripwire.flipped` IPC. Show top-of-home banner with severity color (yellow/red) + "<tripwire> flipped to <new state>" + click to open the cash_lever memo if invoked.

### 2. Settings → Scheduler view — `apps/renderer/src/screens/SettingsScheduler.tsx` (new)

Per ADR §10.3. Listed 5 jobs:
- Enable/disable toggle (writes to a NEW SQLite `scheduler_settings` table via IPC — Runtime sub-agent owns the migration; you can stub the IPC handler with TODO if Runtime hasn't shipped it).
- Per-job: last 10 runs (consume `scheduler.history` IPC — same stub-with-TODO if not shipped).
- "Reconnect <service>" buttons for any service with auth-expired status (consumes existing per-service auth-status IPC from Ch.8; if not present, stub).

Navigation: Settings → Scheduler is reachable from the existing Settings screen (Ch.0 stub or wherever Settings entry lives). Add a sidebar entry.

### 3. NotificationSettings panel — `apps/renderer/src/screens/NotificationSettings.tsx` (new)

Per ADR §10.4. 3 toggles (one per notification type):
- Tripwire flip — default ON.
- Memo ready — default ON.
- Job failure — default ON.

Persists to SQLite `notification_settings` table via IPC. Same TODO-stub if Runtime hasn't shipped it.

Also: subscribe to `scheduler.notification.permission_denied` IPC. On event: show in-app banner "macOS notifications disabled. Re-enable in System Settings → Notifications → C-Suite."

### 4. App.tsx routing

Add SettingsScheduler + NotificationSettings as Screen variants reachable from Settings menu. Wire navigation.

### 5. Specs — `tests/unit/renderer/`

- `JobsStrip.live.spec.tsx` — given `home.scheduledJobs` fixture: 5 rows render correctly; placeholders replaced; "view memo" link present when `outputMemoPath` set; degraded chips render.
- `JobsStrip.catchup.spec.tsx` — `scheduler.catchup.summary` event triggers toast.
- `JobsStrip.tripwire.spec.tsx` — `scheduler.tripwire.flipped` event renders banner.
- `SettingsScheduler.spec.tsx` — 5 jobs render; toggle calls IPC; last-10-runs renders from fixture.
- `NotificationSettings.spec.tsx` — 3 toggles render + persist via IPC mock; permission-denied banner renders.

≥30 specs.

## Forbidden inferences

- Touching apps/utility/ or shared-types (Runtime scope).
- Inventing new IPC variants (use the 4 Runtime defines).
- Auto-firing job invocations from the renderer (UI only triggers settings changes, not job runs).
- Bypassing existing design tokens.

## What "done" looks like

- All files written + `pnpm --filter @c-suite/renderer typecheck` exit-0 clean.
- All existing tests pass.
- ≥30 new specs.
- WCAG AA + `:focus-visible` on every interactive element.
- Atomic commits — `ch.10 renderer: <what> — <why>`. No Claude attribution.

## Report-back (≤200 words)
- Commits + first-line.
- Components written/modified.
- Typecheck + vitest results.
- IPC variants stubbed with TODO if Runtime hasn't shipped.
