// apps/utility/src/scheduler/catchUp.ts
// Source: docs/decisions/0012-ch10-scheduler-autonomy.md §3.4
// Phase R Decision 7 verbatim: ONE catch-up run per missed schedule, not N.

import type Database from 'better-sqlite3';
import type { IpcMessage } from '@c-suite/shared-types/ipc';
import type { JobId } from '@c-suite/shared-types/scheduled-job';
import { JOB_REGISTRY, ALL_JOB_IDS } from './jobRegistry.js';
import { createLogger } from '../logger.js';

const log = createLogger();

export type EmitIpcFn = (msg: IpcMessage) => void;

interface LastRunRow {
  actually_ran_at: number | null;
}

/**
 * Parse a standard 5-field cron expression and return the most-recent
 * scheduled time before `now` (in ms epoch).
 *
 * Supports only the patterns used by C-Suite jobs:
 *   "0 6 * * 1"   — every Monday at 06:00
 *   "0 7 * * 1"   — every Monday at 07:00
 *   "0 18 * * 0"  — every Sunday at 18:00
 *   "0 20 * * 0"  — every Sunday at 20:00
 *   "0 6 * * *"   — every day at 06:00
 *
 * Returns null if the job has never had a scheduled time before now
 * (e.g. the job was just created today).
 */
export function mostRecentScheduledTime(cronExpr: string, now: Date): Date | null {
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const [minPart, hourPart, , , dowPart] = parts;
  const minute = parseInt(minPart, 10);
  const hour = parseInt(hourPart, 10);

  if (isNaN(minute) || isNaN(hour)) return null;

  // Build candidate dates going back up to 8 days (covers weekly jobs).
  const candidates: Date[] = [];
  for (let daysBack = 0; daysBack <= 8; daysBack++) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() - daysBack);
    candidate.setHours(hour, minute, 0, 0);

    // Filter by day-of-week if specified.
    if (dowPart !== '*') {
      const requiredDow = parseInt(dowPart, 10); // 0=Sun, 1=Mon
      if (candidate.getDay() !== requiredDow) continue;
    }

    if (candidate <= now) {
      candidates.push(candidate);
    }
  }

  if (candidates.length === 0) return null;
  // Return the most recent (candidates[0] is smallest daysBack).
  return candidates[0] ?? null;
}

export interface CatchUpEntry {
  jobId: JobId;
  missedScheduledFor: Date;
}

/**
 * runCatchUp — called once at scheduler init.
 *
 * For each job: if the last actuallyRanAt is before the most-recent scheduled time,
 * enqueue exactly ONE catch-up run and write a 'caught_up' row in scheduled_jobs.
 *
 * Decision 7: does NOT enqueue N runs even if N schedules were missed.
 */
export async function runCatchUp(
  db: Database.Database,
  emitIpc: EmitIpcFn,
  runJobFn: (jobId: JobId, scheduledFor: Date, status: 'caught_up') => Promise<void>,
  now = new Date(),
): Promise<CatchUpEntry[]> {
  const caughtUp: CatchUpEntry[] = [];

  for (const jobId of ALL_JOB_IDS) {
    const def = JOB_REGISTRY[jobId];
    const mostRecent = mostRecentScheduledTime(def.cronExpression, now);
    if (!mostRecent) continue;

    // Query last actuallyRanAt for this job.
    const row = db.prepare(
      `SELECT actually_ran_at FROM scheduled_jobs
       WHERE job_id = ? AND actually_ran_at IS NOT NULL
       ORDER BY actually_ran_at DESC LIMIT 1`
    ).get(jobId) as LastRunRow | undefined;

    const lastRanAt = row?.actually_ran_at ?? null;

    // If never run, or last run is before the most recent scheduled time → catch up.
    if (lastRanAt === null || lastRanAt < mostRecent.getTime()) {
      log.info({
        message: 'catch-up enqueued (ONE run)',
        jobId,
        missedScheduledFor: mostRecent.toISOString(),
        lastRanAt: lastRanAt ? new Date(lastRanAt).toISOString() : 'never',
      });

      caughtUp.push({ jobId, missedScheduledFor: mostRecent });

      // Run the catch-up job asynchronously (fire-and-forget; caller awaits returned array).
      runJobFn(jobId, mostRecent, 'caught_up').catch((err: unknown) => {
        log.error({ message: 'catch-up run failed', jobId, err: String(err) });
      });
    }
  }

  // Emit IPC summary so renderer can show "Caught up N missed jobs" toast.
  if (caughtUp.length > 0) {
    emitIpc({
      kind: 'scheduler.catchup.summary',
      payload: {
        caughtUp: caughtUp.map(e => ({
          jobId: e.jobId,
          missedScheduledFor: e.missedScheduledFor.getTime(),
        })),
      },
    });
  }

  return caughtUp;
}
