# Ch.10 Final Audit/QA Brief

You are the **independent** Audit/QA sub-agent for Ch.10 close. Both sub-agents (Runtime + Renderer) shipped. Contract: `docs/decisions/0012-ch10-scheduler-autonomy.md` §11 (16 ACs).

**This is the last audit before Phase 2 COMPLETE emission.** After this verdict closes, /goal stops at the Ch.11 hard gate.

## Working directory
`/Users/russellteter/Claude Code Projects/c-suite/` (quote — has spaces).

## Ch.10 surface

### Runtime sub-agent (commits in `apps/utility/src/scheduler/` + `apps/utility/src/jobs/` + `apps/utility/src/notifications/` + `apps/main/src/notifications.ts` + `apps/main/build/launch-agent.plist.template` + scripts)
- `packages/shared-types/src/scheduled-job.ts` — JobId / JobDefinition / RetryPolicy / JobRunRecord / JobSummary / TripwireState.
- `packages/shared-types/src/ipc.ts` — 5 new variants (home.scheduledJobs, scheduler.catchup.summary, scheduler.tripwire.flipped, scheduler.notification.permission_denied, main.show-notification).
- `db/migrations/007_scheduled_jobs.sql`.
- `apps/utility/src/scheduler/{jobRegistry,cron,catchUp,retry}.ts`.
- `apps/utility/src/jobs/{mondayTripwire,mondayStakeholder,sundayRenewal,sundayWorkstream,dailyMorningBrief}.ts`.
- `apps/utility/src/notifications/macNotify.ts`.
- `apps/main/src/notifications.ts` + `apps/main/src/main.ts` (added `--scheduler-only` mode + lock file).
- `apps/main/build/launch-agent.plist.template` + `scripts/install-launchagent.sh` + `scripts/uninstall-launchagent.sh`.
- 93 specs in `tests/unit/scheduler/` + `tests/unit/jobs/` + `tests/unit/notifications/`.

### Renderer sub-agent (commit `cc9db73` + Runtime co-commit `a95533d`)
- `apps/renderer/src/components/JobsStrip.tsx` — modified for live IPC subscription.
- `apps/renderer/src/components/{CatchupToast,TripwireBanner}.tsx` — new.
- `apps/renderer/src/screens/{SettingsScheduler,NotificationSettings}.tsx` — new.
- `apps/renderer/src/screens/Home.tsx` — mounted CatchupToast + TripwireBanner + sidebar buttons.
- `apps/renderer/src/components/HomeTypes.ts` — ScheduledJobStatus extended.
- `apps/renderer/src/App.tsx` — settings-scheduler + settings-notifications Screen variants.
- 86 specs in `tests/unit/renderer/{JobsStrip.live,JobsStrip.catchup,JobsStrip.tripwire,SettingsScheduler,NotificationSettings}.spec.tsx`.

## ADR-0012 §11 ACs (16 total)

Verify each PASS / CONCERN / REOPEN with file_path:line + spec name:

- **AC-1**: 5 jobs registered in `JOB_REGISTRY` matching §3.2 cron expressions.
- **AC-2**: node-cron driver fires each job at scheduled time (verified via fast-forward time mock in test).
- **AC-3**: Catch-up enqueues exactly ONE run per missed schedule (Mac-off-for-2-weeks simulation).
- **AC-4**: Retry policy per Decision 5 verbatim.
- **AC-5**: `monday-tripwire` detects covenant state transitions + emits native notification + invokes `cash_lever` playbook on flip.
- **AC-6**: `monday-stakeholder` skips stakeholders updated <7 days ago.
- **AC-7**: `sunday-renewal` uses B7 (`Account_Manager__r` + `IsActive`) + B20 (`Renewal_Anniversary_Date__c`).
- **AC-8**: `sunday-workstream` regenerates `workstream_amounts_mirror` + memory-consolidation prunes old rows per TTLs.
- **AC-9**: `daily-morning-brief` invokes `quick_read` playbook; QUICK_READ stamp present.
- **AC-10**: LaunchAgent plist + install/uninstall scripts ship; idempotent.
- **AC-11**: Native macOS notifications fire for 3 triggers (tripwire-flip / memo-ready / job-failure).
- **AC-12**: Home `JobsStrip` consumes `home.scheduledJobs` IPC; replaces "Pending Ch.10" placeholders.
- **AC-13**: Settings → Scheduler view + NotificationSettings panel ship.
- **AC-14**: `scheduled_jobs` SQLite table populates; queryable.
- **AC-15**: B32 — AWS SSO mid-job expiry handled.
- **AC-16**: `pnpm vitest run` exit-0 clean for new specs.

## Critical spot-checks

1. **Catch-up ONE-per-missed** (AC-3). Read `apps/utility/src/scheduler/catchUp.ts`. Verify the 2-week simulation only enqueues ONE daily-morning-brief run, not 14. This is the most easily-missed Phase R Decision 7 rule.
2. **KeepAlive.SuccessfulExit: false** (AC-10). Read `apps/main/build/launch-agent.plist.template`. Verify `<key>SuccessfulExit</key><false/>` — user force-quit must NOT trigger auto-restart per Decision 7.
3. **Retry policy verbatim** (AC-4). Read `apps/utility/src/scheduler/retry.ts`. Verify:
   - networkTimeout: 3 retries with backoff [30s, 2m, 10m].
   - authExpired: NO retry + reconnect notification.
   - mcpDown: 3 retries with backoff [1m, 5m, 30m].
   - vaultUnreachable: 3 retries, 10s spacing, HALT after.
4. **B7 + B20 in sunday-renewal** (AC-7). Read `apps/utility/src/jobs/sundayRenewal.ts`. grep for `Account_Manager__r` + `IsActive` + `Renewal_Anniversary_Date__c`. Forbidden: `Owner.Name`, `Renewal_Date__c`.
5. **5 IPC variant integration end-to-end** — Renderer's `JobsStrip` subscribes to `home.scheduledJobs`; Runtime's scheduler emits it. Verify the wire works (variant defined in shared-types, emitted from a known Runtime path, consumed by Renderer).
6. **Cron timezone** — verify `timezone: 'America/New_York'` in `apps/utility/src/scheduler/cron.ts` per ADR §3.3.

## Audit method

1. **Read every Ch.10 file.** Cite line numbers.
2. **Run `pnpm vitest run`.** Confirm 179 new Ch.10 specs (93 Runtime + 86 Renderer) all pass. Capture total pass/fail vs baseline.
3. **Run `pnpm -r typecheck`.** Exit-0 expected.
4. **Run wire-up greps from "Critical spot-checks".**

## What you don't do

- Write code. REOPEN with file_path:line if you find a bug.
- Audit beyond Ch.10.
- Block on the Russell-action items list from prior chapters (Apple credentials removed per ROADMAP amendment; Salesforce/Gmail/Chorus/NetSuite/AWS/PowerBI/Day-Zero are pre-conditions).

## Verdict format

Output `docs/reviews/ch10-final-audit-qa-report.md`:

```markdown
# Ch.10 Final — Audit/QA Report

**Date:** <ISO>
**Auditor:** EvidenceQA sub-agent (independent)
**Scope:** Full Ch.10 — scheduler infra + 5 jobs + LaunchAgent + native notifications + JobsStrip live + SettingsScheduler + NotificationSettings + 179 new specs
**Verdict:** PASS | CONCERN-CLOSE | REOPEN
**Phase 2 close gate:** this verdict gates Phase 2 COMPLETE emission.

## Summary
<one paragraph>

## AC-by-AC verdict
| AC | Verdict | Evidence |
|---|---|---|
...

## Issues found
1. <issue with file_path:line + impact + recommended fix>

## Spot-checks summary
- Typecheck: <result>
- Vitest: <result>
- Catch-up ONE-per-missed (AC-3): <result>
- KeepAlive.SuccessfulExit:false (AC-10): <result>
- Retry policy verbatim (AC-4): <result>
- B7+B20 in sundayRenewal (AC-7): <result>
- IPC end-to-end (AC-12): <result>
- Cron timezone: <result>

## Phase 2 close recommendation
<emit Phase 2 COMPLETE / hold-until-fix / REOPEN>
```

Commit with `ch.10 audit: final report — <verdict>`. No Claude attribution.

## Report-back (≤200 words)
- Verdict + AC count.
- Top 3-5 issues.
- Phase 2 close recommendation.
