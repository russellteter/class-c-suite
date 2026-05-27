// apps/utility/src/mcp/salesforce/typed-queries.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §4
//
// BLOCKER mitigations encoded in every query:
//   B7:  Account_Manager__r + IsActive = TRUE (never the legacy ownership field)
//   B19: R1-verified stage labels from committed-pipeline.ts (never S4/S5/Commit/BestCase)
//   B20: Renewal_Anniversary_Date__c (never the legacy renewal-date field)
//
// Stage constants come from apps/utility/src/playbooks/lib/committed-pipeline.ts
// (R1 live-verified on 2026-05-27 against classedu.my.salesforce.com).

import {
  NEW_BIZ_COMMITTED_STAGES,
  RENEWAL_COMMITTED_STAGES,
} from '../../playbooks/lib/committed-pipeline.js';

// ── Injection guard ───────────────────────────────────────────────────────────
// All user-supplied string parameters pass through this before interpolation.
// Prevents SOQL injection via stage name, ORDER BY, LIMIT, subquery vectors.

const SAFE_STRING_PATTERN = /^[A-Za-z0-9 _\-\.@]+$/;

export function escapeSoqlString(value: string): string {
  // Reject any value containing SOQL-special characters used for injection.
  if (!SAFE_STRING_PATTERN.test(value)) {
    throw new Error(
      `SOQL injection guard: value contains disallowed characters: ${JSON.stringify(value)}`
    );
  }
  // Escape single quotes (belt-and-suspenders).
  return value.replace(/'/g, "\\'");
}

/**
 * Validate a numeric parameter used in LIMIT/OFFSET/months.
 * Throws if the value is not a safe positive integer.
 */
export function assertSafeInt(value: number, paramName: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 1_000_000) {
    throw new Error(
      `SOQL injection guard: '${paramName}' must be a non-negative integer ≤1,000,000 (got ${value})`
    );
  }
  return value;
}

// ── Stage label inline builders ───────────────────────────────────────────────

function stageList(stages: readonly string[]): string {
  return stages.map(s => `'${escapeSoqlString(s)}'`).join(', ');
}

// ── 1. committedPipelineQuery ─────────────────────────────────────────────────
// B19: Uses R1-verified stage labels only.
// Two variants separated by pipelineType — never unioned (audit requirement).
// Caller determines which subset to use based on Day-Zero form answer.

export interface CommittedPipelineArgs {
  pipelineType: 'new_business' | 'renewal';
  asOfDate?: Date;
  limit?: number;
}

export function committedPipelineQuery(args: CommittedPipelineArgs): string {
  const { pipelineType, limit = 500 } = args;
  const safeLimit = assertSafeInt(limit, 'limit');

  // B19: pick the correct live-verified stage set.
  const stages = pipelineType === 'new_business'
    ? NEW_BIZ_COMMITTED_STAGES
    : RENEWAL_COMMITTED_STAGES;

  const typeFilter = pipelineType === 'new_business'
    ? "Type = 'New Business'"
    : "Type = 'Renewal'";

  // New-biz adds Stage_2_Bump_Date__c IS NOT NULL (R1-verified discriminator).
  const bumpFilter = pipelineType === 'new_business'
    ? 'AND Stage_2_Bump_Date__c != null '
    : '';

  const asOfClause = args.asOfDate
    ? `AND CloseDate <= ${args.asOfDate.toISOString().split('T')[0]} `
    : '';

  return (
    'SELECT Id, Name, Amount, StageName, CloseDate, Type, ' +
    'Account.Name, Account.Id, ' +
    'Account_Manager__r.Name, Account_Manager__r.IsActive ' +
    'FROM Opportunity ' +
    `WHERE ${typeFilter} ` +
    `AND StageName IN (${stageList(stages)}) ` +
    `${bumpFilter}` +
    'AND IsClosed = false ' +
    `${asOfClause}` +
    `ORDER BY Amount DESC NULLS LAST LIMIT ${safeLimit}`
  );
}

// ── 2. accountAMHealthQuery ───────────────────────────────────────────────────
// B7: always Account_Manager__r + IsActive = TRUE (never the legacy ownership field per B7).

export interface AccountAMHealthArgs {
  accountId: string;
}

export function accountAMHealthQuery(args: AccountAMHealthArgs): string {
  const safeId = escapeSoqlString(args.accountId);
  return (
    'SELECT Id, Name, ' +
    'Account_Manager__r.Id, Account_Manager__r.Name, Account_Manager__r.IsActive, ' +
    'Account_Manager__r.Email, ' +
    'CustomerPriority__c, NumberOfEmployees, AnnualRevenue, ' +
    'Renewal_Anniversary_Date__c ' +
    'FROM Account ' +
    `WHERE Id = '${safeId}' ` +
    'AND Account_Manager__r.IsActive = TRUE ' +
    'LIMIT 1'
  );
}

// ── 3. renewalForecastQuery ───────────────────────────────────────────────────
// B20: always Renewal_Anniversary_Date__c (never the legacy renewal-date field per B20).

export interface RenewalForecastArgs {
  months: number;
}

export function renewalForecastQuery(args: RenewalForecastArgs): string {
  const safeMonths = assertSafeInt(args.months, 'months');
  // Compute the end date: today + N months (ISO date string, no injection risk).
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + safeMonths);
  const endDateStr = endDate.toISOString().split('T')[0];

  const today = new Date().toISOString().split('T')[0];

  return (
    'SELECT Id, Name, Amount, StageName, Type, ' +
    'Account.Id, Account.Name, Account.Renewal_Anniversary_Date__c, ' +
    'Account_Manager__r.Name, Account_Manager__r.IsActive, ' +
    'CloseDate ' +
    'FROM Opportunity ' +
    `WHERE Account.Renewal_Anniversary_Date__c >= ${today} ` +
    `AND Account.Renewal_Anniversary_Date__c <= ${endDateStr} ` +
    'AND IsClosed = false ' +
    `ORDER BY Account.Renewal_Anniversary_Date__c ASC LIMIT 500`
  );
}

// ── 4. topAccountsByAMQuery ───────────────────────────────────────────────────
// Used by gtm_realloc playbook (stubSalesforcePipeline → topAccounts).
// B7: Account_Manager__r + IsActive.

export interface TopAccountsByAMArgs {
  amId?: string;
  limit?: number;
}

export function topAccountsByAMQuery(args: TopAccountsByAMArgs = {}): string {
  const safeLimit = assertSafeInt(args.limit ?? 25, 'limit');
  const amFilter = args.amId
    ? `AND Account_Manager__r.Id = '${escapeSoqlString(args.amId)}' `
    : '';

  return (
    'SELECT Id, Name, AnnualRevenue, CustomerPriority__c, ' +
    'Account_Manager__r.Id, Account_Manager__r.Name, Account_Manager__r.IsActive, ' +
    'Renewal_Anniversary_Date__c ' +
    'FROM Account ' +
    'WHERE Account_Manager__r.IsActive = TRUE ' +
    `${amFilter}` +
    `ORDER BY AnnualRevenue DESC NULLS LAST LIMIT ${safeLimit}`
  );
}

// ── 5. openOpportunityByAccountQuery ─────────────────────────────────────────
// Used by stakeholder_1_1 + board_narrative (deal-context enrichment).
// B7 + B19 compliant.

export interface OpenOpportunityByAccountArgs {
  accountId: string;
}

export function openOpportunityByAccountQuery(args: OpenOpportunityByAccountArgs): string {
  const safeId = escapeSoqlString(args.accountId);
  return (
    'SELECT Id, Name, Amount, StageName, Type, CloseDate, ' +
    'Account_Manager__r.Name, Account_Manager__r.IsActive ' +
    'FROM Opportunity ' +
    `WHERE AccountId = '${safeId}' ` +
    'AND IsClosed = false ' +
    'ORDER BY Amount DESC NULLS LAST LIMIT 50'
  );
}

// ── 6. recentlyClosedWonQuery ─────────────────────────────────────────────────
// Used by board_narrative (win-rate + trend).

export interface RecentlyClosedWonArgs {
  since: Date;
  limit?: number;
}

export function recentlyClosedWonQuery(args: RecentlyClosedWonArgs): string {
  const safeLimit = assertSafeInt(args.limit ?? 200, 'limit');
  const sinceDateStr = args.since.toISOString().split('T')[0];
  return (
    'SELECT Id, Name, Amount, StageName, Type, CloseDate, ' +
    'Account.Name, Account_Manager__r.Name ' +
    'FROM Opportunity ' +
    `WHERE StageName = 'Closed Won' ` +
    `AND CloseDate >= ${sinceDateStr} ` +
    `ORDER BY CloseDate DESC LIMIT ${safeLimit}`
  );
}
