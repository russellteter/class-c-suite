// apps/utility/src/scheduler/jobRegistry.ts
// Source: docs/decisions/0012-ch10-scheduler-autonomy.md §3.2
// Single source of truth for the 5 scheduled jobs.

import type { JobDefinition, JobId } from '@c-suite/shared-types/scheduled-job';
import { DEFAULT_RETRY_POLICY } from '@c-suite/shared-types/scheduled-job';

export const JOB_REGISTRY: Record<JobId, JobDefinition> = {
  'monday-tripwire': {
    id: 'monday-tripwire',
    cronExpression: '0 6 * * 1',        // 6am ET Monday
    description: 'Financial tripwire scan + weekly cash forecast',
    customRunner: 'tripwire',
    notifyOnSuccess: false,
    notifyOnFailure: true,
    retryPolicy: DEFAULT_RETRY_POLICY,
  },

  'monday-stakeholder': {
    id: 'monday-stakeholder',
    cronExpression: '0 7 * * 1',        // 7am ET Monday
    description: 'Stakeholder activity refresh (sequential per-stakeholder)',
    invokePlaybook: 'stakeholder_1_1',
    customRunner: 'stakeholder-foreach', // foreach over stakeholder files
    notifyOnSuccess: false,
    notifyOnFailure: true,
    retryPolicy: DEFAULT_RETRY_POLICY,
  },

  'sunday-renewal': {
    id: 'sunday-renewal',
    cronExpression: '0 18 * * 0',       // 6pm ET Sunday
    description: 'Renewal forecast + Chorus call sweep (B7 + B20 mitigations)',
    customRunner: 'renewal-sweep',
    notifyOnSuccess: false,
    notifyOnFailure: true,
    retryPolicy: DEFAULT_RETRY_POLICY,
  },

  'sunday-workstream': {
    id: 'sunday-workstream',
    cronExpression: '0 20 * * 0',       // 8pm ET Sunday
    description: 'Workstream dashboard regen + memory consolidation',
    customRunner: 'workstream-regen',
    notifyOnSuccess: false,
    notifyOnFailure: true,
    retryPolicy: DEFAULT_RETRY_POLICY,
  },

  'daily-morning-brief': {
    id: 'daily-morning-brief',
    cronExpression: '0 6 * * *',        // 6am ET every day
    description: 'Six-lens compact read (quick_read playbook)',
    invokePlaybook: 'quick_read',
    notifyOnSuccess: true,
    notifyOnFailure: true,
    retryPolicy: DEFAULT_RETRY_POLICY,
  },
};

export const ALL_JOB_IDS = Object.keys(JOB_REGISTRY) as JobId[];
