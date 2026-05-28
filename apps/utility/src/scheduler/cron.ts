// apps/utility/src/scheduler/cron.ts
// Source: docs/decisions/0012-ch10-scheduler-autonomy.md §3.3
// node-cron v4 driver. Uses timezone: 'America/New_York' for all jobs.

import cron from 'node-cron';
import type Database from 'better-sqlite3';
import type { IpcMessage } from '@c-suite/shared-types/ipc';
import type { JobId, JobSummary, DegradedSource } from '@c-suite/shared-types/scheduled-job';
import { JOB_REGISTRY, ALL_JOB_IDS } from './jobRegistry.js';
import { runCatchUp } from './catchUp.js';
import { executeWithRetry } from './retry.js';
import { runMondayTripwire } from '../jobs/mondayTripwire.js';
import { runMondayStakeholder } from '../jobs/mondayStakeholder.js';
import { runSundayRenewal } from '../jobs/sundayRenewal.js';
import { runSundayWorkstream } from '../jobs/sundayWorkstream.js';
import { runDailyMorningBrief } from '../jobs/dailyMorningBrief.js';
import { createLogger } from '../logger.js';

const log = createLogger('cron');

export type EmitIpcFn = (msg: IpcMessage) => void;

// Tracks consecutive failure counts per job (resets on success).
const consecutiveFailures = new Map<JobId, number>();

export interface JobRunContext {
  db: Database.Database;
  emitIpc: EmitIpcFn;
  vaultRoot: string;
}

/**
 * Map each job ID to its runner function.
 */
function getRunner(jobId: JobId): (ctx: JobRunContext) => Promise<{ outputMemoPath?: string; degradedSources?: DegradedSource[] }> {
  switch (jobId) {
    case 'monday-tripwire':    return runMondayTripwire;
    case 'monday-stakeholder': return runMondayStakeholder;
    case 'sunday-renewal':     return runSundayRenewal;
    case 'sunday-workstream':  return runSundayWorkstream;
    case 'daily-morning-brief': return runDailyMorningBrief;
  }
}

/**
 * Write a job run record to scheduled_jobs SQLite table.
 */
function insertJobRun(
  db: Database.Database,
  jobId: JobId,
  scheduledFor: Date,
  actuallyRanAt: Date | null,
  status: string,
  degradedSources: DegradedSource[],
  opts: { outputMemoPath?: string; failureReason?: string; runId?: string; durationMs?: number } = {},
): void {
  db.prepare(`
    INSERT INTO scheduled_jobs
      (job_id, scheduled_for, actually_ran_at, status, degraded_sources, output_memo_path, failure_reason, run_id, duration_ms, created_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    jobId,
    scheduledFor.getTime(),
    actuallyRanAt ? actuallyRanAt.getTime() : null,
    status,
    JSON.stringify(degradedSources),
    opts.outputMemoPath ?? null,
    opts.failureReason ?? null,
    opts.runId ?? null,
    opts.durationMs ?? null,
    Date.now(),
  );
}

/**
 * Emit the home.scheduledJobs IPC with current summaries for all 5 jobs.
 */
function emitJobSummaries(db: Database.Database, emitIpc: EmitIpcFn): void {
  const jobs: JobSummary[] = ALL_JOB_IDS.map(jobId => {
    const def = JOB_REGISTRY[jobId];
    const row = db.prepare(
      `SELECT status, actually_ran_at, output_memo_path, degraded_sources
       FROM scheduled_jobs
       WHERE job_id = ? AND actually_ran_at IS NOT NULL
       ORDER BY actually_ran_at DESC LIMIT 1`
    ).get(jobId) as {
      status: string;
      actually_ran_at: number | null;
      output_memo_path: string | null;
      degraded_sources: string | null;
    } | undefined;

    return {
      jobId,
      description: def.description,
      cronExpression: def.cronExpression,
      lastStatus: (row?.status ?? null) as JobSummary['lastStatus'],
      lastRanAt: row?.actually_ran_at ?? null,
      outputMemoPath: row?.output_memo_path ?? undefined,
      degradedSources: row?.degraded_sources ? (JSON.parse(row.degraded_sources) as DegradedSource[]) : [],
    };
  });

  emitIpc({
    kind: 'home.scheduledJobs',
    payload: { jobs },
  });
}

/**
 * Run a single job: write pending row, execute with retry, update DB, push summaries.
 */
export async function runJob(
  jobId: JobId,
  scheduledFor: Date,
  ctx: JobRunContext,
  status: 'scheduled' | 'caught_up' = 'scheduled',
): Promise<void> {
  const def = JOB_REGISTRY[jobId];
  const ranAt = new Date();
  const startMs = Date.now();

  log.info({ message: 'job starting', jobId, scheduledFor: scheduledFor.toISOString(), status });

  ctx.emitIpc({ kind: 'job.started', payload: { jobName: jobId as never, jobId, firedAt: ranAt.getTime() } });

  const runner = getRunner(jobId);
  const consecutiveBefore = consecutiveFailures.get(jobId) ?? 0;

  let outputMemoPath: string | undefined;
  let degradedSources: DegradedSource[] = [];

  const result = await executeWithRetry(
    def,
    async () => {
      const out = await runner(ctx);
      outputMemoPath = out.outputMemoPath;
      degradedSources = out.degradedSources ?? [];
    },
    ctx.emitIpc,
    consecutiveBefore,
  );

  const durationMs = Date.now() - startMs;
  const finalStatus = result.status === 'succeeded'
    ? (status === 'caught_up' ? 'caught_up' : 'succeeded')
    : result.status;

  // Update consecutive failure counter.
  if (result.succeeded) {
    consecutiveFailures.set(jobId, 0);
  } else {
    consecutiveFailures.set(jobId, (result.consecutiveFailures ?? consecutiveBefore + 1));
  }

  insertJobRun(ctx.db, jobId, scheduledFor, ranAt, finalStatus, degradedSources, {
    outputMemoPath,
    failureReason: result.failureReason,
    durationMs,
  });

  if (result.succeeded) {
    ctx.emitIpc({
      kind: 'job.finished',
      payload: { jobName: jobId as never, jobId, firedAt: ranAt.getTime(), finishedAt: Date.now(), status: 'success' },
    });

    // Notify on success if job requests it.
    if (def.notifyOnSuccess && outputMemoPath) {
      ctx.emitIpc({
        kind: 'main.show-notification',
        payload: {
          type: 'memo-ready',
          title: `C-Suite: ${jobId} memo ready`,
          body: 'Click to view your scheduled report.',
          clickAction: 'memo',
          clickPayload: outputMemoPath,
        },
      });
    }
  } else {
    ctx.emitIpc({
      kind: 'job.failed',
      payload: {
        jobName: jobId as never,
        jobId,
        firedAt: ranAt.getTime(),
        finishedAt: Date.now(),
        status: 'failed',
        errorMessage: result.failureReason,
      },
    });
  }

  emitJobSummaries(ctx.db, ctx.emitIpc);
}

/**
 * initCronScheduler — registers all 5 jobs with node-cron and runs catch-up.
 * Called from scheduler init after DB is ready.
 */
export function initCronScheduler(ctx: JobRunContext): void {
  const now = new Date();

  log.info({ message: 'initializing cron scheduler', jobCount: ALL_JOB_IDS.length });

  // Register each job with node-cron.
  for (const jobId of ALL_JOB_IDS) {
    const def = JOB_REGISTRY[jobId];
    cron.schedule(
      def.cronExpression,
      async () => {
        const scheduledFor = new Date();
        await runJob(jobId, scheduledFor, ctx, 'scheduled');
      },
      {
        timezone: 'America/New_York',
        noOverlap: true,
      },
    );
    log.info({ message: 'cron registered', jobId, cron: def.cronExpression });
  }

  // Run catch-up for any missed jobs.
  runCatchUp(
    ctx.db,
    ctx.emitIpc,
    async (jobId: JobId, scheduledFor: Date, _status: 'caught_up') => {
      await runJob(jobId, scheduledFor, ctx, 'caught_up');
    },
    now,
  ).catch((err: unknown) => {
    log.error({ message: 'catch-up failed', err: String(err) });
  });

  // Push initial job summaries to home screen.
  emitJobSummaries(ctx.db, ctx.emitIpc);
}
