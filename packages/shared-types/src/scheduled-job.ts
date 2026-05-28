// packages/shared-types/src/scheduled-job.ts
// Source: docs/decisions/0012-ch10-scheduler-autonomy.md §3.1
// Shared types for the scheduled-jobs subsystem.

import { z } from 'zod';

// ---- Job identifiers ----

export const JobIdSchema = z.enum([
  'monday-tripwire',
  'monday-stakeholder',
  'sunday-renewal',
  'sunday-workstream',
  'daily-morning-brief',
]);

export type JobId = z.infer<typeof JobIdSchema>;

// ---- Retry policy (ADR §3.5 / Phase R Decision 5 — verbatim) ----

export interface RetryPolicy {
  networkTimeout: { maxRetries: 3; backoffMs: [30_000, 120_000, 600_000] };
  authExpired: 'no_retry_reconnect_prompt';
  mcpDown: { maxRetries: 3; backoffMs: [60_000, 300_000, 1_800_000] };
  vaultUnreachable: { maxRetries: 3; backoffSeconds: 10 };
  vaultGitCommitFail: 'no_retry_queue_5m_retries';
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  networkTimeout: { maxRetries: 3, backoffMs: [30_000, 120_000, 600_000] },
  authExpired: 'no_retry_reconnect_prompt',
  mcpDown: { maxRetries: 3, backoffMs: [60_000, 300_000, 1_800_000] },
  vaultUnreachable: { maxRetries: 3, backoffSeconds: 10 },
  vaultGitCommitFail: 'no_retry_queue_5m_retries',
};

// ---- Job definition ----

export type PlaybookId =
  | 'cash_lever'
  | 'stakeholder_1_1'
  | 'quick_read'
  | 'pre_mortem'
  | 'gtm_realloc'
  | 'strategic_option'
  | 'board_narrative'
  | 'restructure_decision'
  | 'open_qa';

export type CustomRunner =
  | 'tripwire'
  | 'stakeholder-foreach'
  | 'renewal-sweep'
  | 'workstream-regen'
  | 'memory-consolidation';

export interface JobDefinition {
  id: JobId;
  cronExpression: string;
  description: string;
  invokePlaybook?: PlaybookId;
  customRunner?: CustomRunner;
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
  retryPolicy: RetryPolicy;
}

// ---- Degraded source ----

export type DegradedSource =
  | 'salesforce'
  | 'netsuite'
  | 'aws'
  | 'gmail'
  | 'chorus'
  | 'powerbi'
  | 'vault';

// ---- Job run record ----

export type JobRunStatus =
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'caught_up'
  | 'skipped_auth_expired';

export interface JobRunRecord {
  jobId: JobId;
  scheduledFor: Date;
  actuallyRanAt: Date | null;
  status: JobRunStatus;
  degradedSources: DegradedSource[];
  outputMemoPath?: string;
  failureReason?: string;
  runId?: string;
  durationMs?: number;
}

// ---- Job summary (for home-screen IPC) ----

export interface JobSummary {
  jobId: JobId;
  description: string;
  cronExpression: string;
  lastStatus: JobRunStatus | null;
  lastRanAt: number | null;     // epoch ms
  outputMemoPath?: string;
  degradedSources: DegradedSource[];
}

// ---- Zod schemas for wire-crossing (IPC) ----

export const JobSummarySchema = z.object({
  jobId: JobIdSchema,
  description: z.string(),
  cronExpression: z.string(),
  lastStatus: z.enum(['pending', 'running', 'succeeded', 'failed', 'caught_up', 'skipped_auth_expired']).nullable(),
  lastRanAt: z.number().nullable(),
  outputMemoPath: z.string().optional(),
  degradedSources: z.array(z.string()),
});

export const CatchUpEntrySchema = z.object({
  jobId: JobIdSchema,
  missedScheduledFor: z.number(),    // epoch ms
});

export const TripwireStateSchema = z.enum(['GREEN', 'YELLOW', 'RED', 'BREACH']);
export type TripwireState = z.infer<typeof TripwireStateSchema>;

export const TripwireFlipSchema = z.object({
  tripwireId: z.string(),
  oldState: TripwireStateSchema,
  newState: TripwireStateSchema,
});
