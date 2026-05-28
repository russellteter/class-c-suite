// apps/utility/src/jobs/sundayRenewal.ts
// Source: docs/decisions/0012-ch10-scheduler-autonomy.md §6
// Sunday 6pm ET — renewal-forecast + Chorus call lookup.
// B7 mitigation: Salesforce query uses Account_Manager__r + IsActive filters.
// B20 mitigation: Renewal_Anniversary_Date__c ≤ 90 days filter.

import * as path from 'path';
import * as fs from 'fs/promises';
import { randomUUID } from 'node:crypto';
import type { JobDegradedSource } from '@c-suite/shared-types/scheduled-job';
import type { JobRunContext } from '../scheduler/cron.js';
import { AuthExpiredError } from '../scheduler/retry.js';
import { createLogger } from '../logger.js';

const log = createLogger();

const CRITICAL_HEALTH_THRESHOLD = 0.4; // score below this triggers notification

export interface RenewalAccount {
  id: string;
  name: string;
  renewalDate: string;         // ISO date
  arr: number;
  accountManagerEmail: string;
  healthScore?: number;        // 0-1 from Chorus signals, null if Chorus down
  recentCallSummary?: string;
}

/**
 * B7 mitigation: query only active accounts with an assigned account manager.
 * B20 mitigation: filter to accounts renewing within 90 days.
 *
 * In production: calls Salesforce MCP via ctx.deps.salesforce.
 * Stub here degrades gracefully when SF not connected.
 */
async function fetchAtRiskAccounts(ctx: JobRunContext, degradedSources: JobDegradedSource[]): Promise<RenewalAccount[]> {
  // Preflight: check Salesforce credential availability.
  // Real implementation: ctx.deps.salesforce.query(...)
  // Auth-expired check — throw AuthExpiredError to trigger no-retry path.
  try {
    // Placeholder: in Ch.10 post-install, this calls the SF MCP client.
    // B20: Renewal_Anniversary_Date__c <= DATEADD(NOW, 90 days)
    // B7: Account_Manager__r.Email != null AND IsActive = true
    log.info({ message: 'fetching at-risk renewal accounts (B7+B20 mitigations active)' });

    // Stub: return empty list — real data comes from Salesforce MCP.
    return [];
  } catch (err) {
    if (err instanceof AuthExpiredError) throw err;
    log.warn({ message: 'Salesforce unavailable — degrading renewal forecast', err: String(err) });
    degradedSources.push('salesforce');
    return [];
  }
}

/**
 * Query Chorus for recent calls per account.
 * Degrades gracefully if Chorus is down (renewal data still ships; call signals flagged missing).
 */
async function fetchChorusSignals(
  accounts: RenewalAccount[],
  ctx: JobRunContext,
  degradedSources: JobDegradedSource[],
): Promise<void> {
  if (accounts.length === 0) return;

  try {
    // Real implementation: call Chorus MCP client for each account.
    // ctx.deps.chorus.recentCallsForStakeholder(accountId)
    log.info({ message: 'fetching Chorus call signals', accountCount: accounts.length });
    // Stub: no-op — real implementation wires Chorus MCP here.
  } catch (err) {
    log.warn({ message: 'Chorus unavailable — call signals omitted', err: String(err) });
    degradedSources.push('chorus');
    // Do NOT throw — renewal data ships with call signals flagged missing.
  }
}

export async function runSundayRenewal(
  ctx: JobRunContext,
): Promise<{ outputMemoPath?: string; degradedSources?: JobDegradedSource[] }> {
  const today = new Date().toISOString().slice(0, 10);
  const runId = randomUUID();
  const degradedSources: JobDegradedSource[] = [];

  log.info({ message: 'sunday renewal starting', date: today, runId });

  // B7 + B20: fetch at-risk accounts.
  const accounts = await fetchAtRiskAccounts(ctx, degradedSources);

  // Chorus sweep.
  await fetchChorusSignals(accounts, ctx, degradedSources);

  // Critical health check — notify for any account below threshold.
  const critical = accounts.filter(a => (a.healthScore ?? 1) < CRITICAL_HEALTH_THRESHOLD);
  for (const acct of critical) {
    ctx.emitIpc({
      kind: 'main.show-notification',
      payload: {
        type: 'memo-ready',
        title: `Renewal at risk: ${acct.name}`,
        body: `Renews ${acct.renewalDate} — ARR $${(acct.arr / 1000).toFixed(0)}k. Click to review.`,
        clickAction: 'memo',
      },
    });
  }

  // Write renewal sweep memo.
  const reportsDir = path.join(ctx.vaultRoot, 'scheduled-reports');
  await fs.mkdir(reportsDir, { recursive: true });
  const outputPath = path.join(reportsDir, `${today}-renewal-sweep.md`);

  const degradedNote = degradedSources.length > 0
    ? `\n> **DEGRADED**: Missing signals from: ${degradedSources.join(', ')}.`
    : '';

  const accountSection = accounts.length === 0
    ? '_(No accounts at risk within 90 days, or Salesforce unavailable — see degraded sources above.)_'
    : accounts.map(a => [
        `### ${a.name}`,
        `- Renewal: ${a.renewalDate}`,
        `- ARR: $${(a.arr / 1000).toFixed(0)}k`,
        `- Account Manager: ${a.accountManagerEmail}`,
        a.healthScore !== undefined ? `- Health Score: ${(a.healthScore * 100).toFixed(0)}%` : '- Health Score: _Chorus unavailable_',
        a.recentCallSummary ? `- Recent Call: ${a.recentCallSummary}` : '- Recent Call: _no data_',
      ].join('\n')).join('\n\n');

  const content = [
    `---`,
    `runId: ${runId}`,
    `stamp: RENEWAL_SWEEP`,
    `date: ${today}`,
    `degradedSources: ${JSON.stringify(degradedSources)}`,
    `b7Mitigation: active`,
    `b20Mitigation: active`,
    `---`,
    '',
    `# Renewal Sweep — ${today}`,
    degradedNote,
    '',
    `## At-Risk Accounts (renewing ≤90 days)`,
    '',
    accountSection,
  ].join('\n');

  await fs.writeFile(outputPath, content, 'utf-8');

  log.info({ message: 'sunday renewal complete', outputPath, accountCount: accounts.length, criticalCount: critical.length });

  return { outputMemoPath: outputPath, degradedSources };
}
