/**
 * tests/unit/scheduler/jobRegistry.spec.ts
 * Source: docs/decisions/0012-ch10-scheduler-autonomy.md AC-1
 * Verifies 5 jobs registered with correct ID/cron/runner.
 */

import { describe, it, expect } from 'vitest';
import { JOB_REGISTRY, ALL_JOB_IDS } from '../../../apps/utility/src/scheduler/jobRegistry.js';

describe('jobRegistry', () => {
  it('registers exactly 5 jobs', () => {
    expect(ALL_JOB_IDS).toHaveLength(5);
  });

  it('contains all required job IDs', () => {
    const ids = new Set(ALL_JOB_IDS);
    expect(ids.has('monday-tripwire')).toBe(true);
    expect(ids.has('monday-stakeholder')).toBe(true);
    expect(ids.has('sunday-renewal')).toBe(true);
    expect(ids.has('sunday-workstream')).toBe(true);
    expect(ids.has('daily-morning-brief')).toBe(true);
  });

  it('monday-tripwire has cron 0 6 * * 1 (6am ET Monday)', () => {
    expect(JOB_REGISTRY['monday-tripwire'].cronExpression).toBe('0 6 * * 1');
  });

  it('monday-stakeholder has cron 0 7 * * 1 (7am ET Monday)', () => {
    expect(JOB_REGISTRY['monday-stakeholder'].cronExpression).toBe('0 7 * * 1');
  });

  it('sunday-renewal has cron 0 18 * * 0 (6pm ET Sunday)', () => {
    expect(JOB_REGISTRY['sunday-renewal'].cronExpression).toBe('0 18 * * 0');
  });

  it('sunday-workstream has cron 0 20 * * 0 (8pm ET Sunday)', () => {
    expect(JOB_REGISTRY['sunday-workstream'].cronExpression).toBe('0 20 * * 0');
  });

  it('daily-morning-brief has cron 0 6 * * * (6am ET every day)', () => {
    expect(JOB_REGISTRY['daily-morning-brief'].cronExpression).toBe('0 6 * * *');
  });

  it('each job has a retry policy with all required keys', () => {
    for (const jobId of ALL_JOB_IDS) {
      const policy = JOB_REGISTRY[jobId].retryPolicy;
      expect(policy.networkTimeout.maxRetries).toBe(3);
      expect(policy.networkTimeout.backoffMs).toEqual([30_000, 120_000, 600_000]);
      expect(policy.authExpired).toBe('no_retry_reconnect_prompt');
      expect(policy.mcpDown.maxRetries).toBe(3);
      expect(policy.mcpDown.backoffMs).toEqual([60_000, 300_000, 1_800_000]);
      expect(policy.vaultUnreachable.maxRetries).toBe(3);
      expect(policy.vaultUnreachable.backoffSeconds).toBe(10);
      expect(policy.vaultGitCommitFail).toBe('no_retry_queue_5m_retries');
    }
  });

  it('monday-tripwire has customRunner: tripwire', () => {
    expect(JOB_REGISTRY['monday-tripwire'].customRunner).toBe('tripwire');
  });

  it('monday-stakeholder has customRunner: stakeholder-foreach', () => {
    expect(JOB_REGISTRY['monday-stakeholder'].customRunner).toBe('stakeholder-foreach');
  });

  it('daily-morning-brief has invokePlaybook: quick_read', () => {
    expect(JOB_REGISTRY['daily-morning-brief'].invokePlaybook).toBe('quick_read');
  });

  it('each job definition has required fields', () => {
    for (const jobId of ALL_JOB_IDS) {
      const def = JOB_REGISTRY[jobId];
      expect(def.id).toBe(jobId);
      expect(typeof def.cronExpression).toBe('string');
      expect(typeof def.description).toBe('string');
      expect(typeof def.notifyOnSuccess).toBe('boolean');
      expect(typeof def.notifyOnFailure).toBe('boolean');
    }
  });
});
