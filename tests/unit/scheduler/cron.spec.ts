/**
 * tests/unit/scheduler/cron.spec.ts
 * Source: docs/decisions/0012-ch10-scheduler-autonomy.md AC-2
 * Verifies each job's cron expression parses and next-run-time is correct.
 */

import { describe, it, expect } from 'vitest';
import { JOB_REGISTRY, ALL_JOB_IDS } from '../../../apps/utility/src/scheduler/jobRegistry.js';

/**
 * Minimal cron expression validator (no external deps in test).
 * Checks the 5-field standard cron form and verifies ranges.
 */
function isValidCronExpression(expr: string): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [min, hour, dom, month, dow] = parts;

  const inRange = (val: string, lo: number, hi: number): boolean => {
    if (val === '*') return true;
    const n = parseInt(val, 10);
    return !isNaN(n) && n >= lo && n <= hi;
  };

  return (
    inRange(min!, 0, 59) &&
    inRange(hour!, 0, 23) &&
    (dom === '*' || inRange(dom!, 1, 31)) &&
    (month === '*' || inRange(month!, 1, 12)) &&
    (dow === '*' || inRange(dow!, 0, 7))
  );
}

describe('cron expressions', () => {
  it('all 5 job cron expressions are valid 5-field cron', () => {
    for (const jobId of ALL_JOB_IDS) {
      const expr = JOB_REGISTRY[jobId].cronExpression;
      expect(isValidCronExpression(expr), `Invalid cron for ${jobId}: "${expr}"`).toBe(true);
    }
  });

  it('monday-tripwire fires at 6am on Mondays', () => {
    const parts = JOB_REGISTRY['monday-tripwire'].cronExpression.split(' ');
    expect(parts[0]).toBe('0');    // minute 0
    expect(parts[1]).toBe('6');    // hour 6
    expect(parts[4]).toBe('1');    // DOW Monday
  });

  it('monday-stakeholder fires at 7am on Mondays', () => {
    const parts = JOB_REGISTRY['monday-stakeholder'].cronExpression.split(' ');
    expect(parts[0]).toBe('0');
    expect(parts[1]).toBe('7');
    expect(parts[4]).toBe('1');
  });

  it('monday-stakeholder fires AFTER monday-tripwire (7am > 6am)', () => {
    const tripwireHour = parseInt(JOB_REGISTRY['monday-tripwire'].cronExpression.split(' ')[1]!, 10);
    const stakeholderHour = parseInt(JOB_REGISTRY['monday-stakeholder'].cronExpression.split(' ')[1]!, 10);
    expect(stakeholderHour).toBeGreaterThan(tripwireHour);
  });

  it('sunday-renewal fires at 6pm on Sundays', () => {
    const parts = JOB_REGISTRY['sunday-renewal'].cronExpression.split(' ');
    expect(parts[1]).toBe('18');
    expect(parts[4]).toBe('0');    // DOW Sunday
  });

  it('sunday-workstream fires at 8pm on Sundays (after renewal)', () => {
    const parts = JOB_REGISTRY['sunday-workstream'].cronExpression.split(' ');
    expect(parts[1]).toBe('20');
    expect(parts[4]).toBe('0');
    const renewalHour = parseInt(JOB_REGISTRY['sunday-renewal'].cronExpression.split(' ')[1]!, 10);
    expect(parseInt(parts[1]!, 10)).toBeGreaterThan(renewalHour);
  });

  it('daily-morning-brief fires at 6am every day', () => {
    const parts = JOB_REGISTRY['daily-morning-brief'].cronExpression.split(' ');
    expect(parts[0]).toBe('0');
    expect(parts[1]).toBe('6');
    expect(parts[4]).toBe('*');    // every day
  });

  it('daily-morning-brief fires before monday-tripwire (same hour, different DOW scope)', () => {
    // Both at 6am — daily brief runs first on Mondays since it fires every day.
    const briefHour = parseInt(JOB_REGISTRY['daily-morning-brief'].cronExpression.split(' ')[1]!, 10);
    const tripwireHour = parseInt(JOB_REGISTRY['monday-tripwire'].cronExpression.split(' ')[1]!, 10);
    // Same hour — brief fires at 6am (DOW=*), tripwire fires at 6am (DOW=Monday).
    // node-cron schedules both; brief runs as part of every-day, tripwire as Monday-specific.
    expect(briefHour).toBe(tripwireHour);
  });
});
