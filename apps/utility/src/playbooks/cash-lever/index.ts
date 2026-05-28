// apps/utility/src/playbooks/cash-lever/index.ts
// Source: docs/decisions/0006-ch5-cash-lever-slice.md §1 + §7
// Cash lever playbook orchestration — wires RunState machine for the cash lever flow.
//
// ADR-0006 §1.2: CFO + COS lenses fire in parallel.
// ADR-0006 §1.3: 4 MCP calls (SF, AWS, NS, cash_model_xlsx) per lens.
// ADR-0006 §1.4: Degraded-mode matrix — AWS SSO expired degrades; others block.
//
// UNKNOWN (ADR-0006 §9):
//   B32: AWS account count + exact profile structure unknown until Russell runs
//        `aws sso login && aws organizations list-accounts`.
//   B1:  NetSuite TBA tokens required for standalone Electron app — B1 blocks AC4 live test.
//   Cash model xlsx path: confirmed at runtime via first-run prompt or VAULT_PATH env.
//   Lever row schema: inspected at first run; merged-cell handling in readXlsxLeverRows().

import { createLogger } from '../../logger.js';
import { insertToolCall } from '../../db/tool-calls.js';
import type Database from 'better-sqlite3';

const log = createLogger();

// ── Degraded-mode flags ────────────────────────────────────────────────────────
// Re-exported from @c-suite/shared-types/playbook for back-compat.
// The canonical type lives in shared-types (ch.7 move); this alias preserves existing imports.

import type { DegradedSource as _DegradedSource } from '@c-suite/shared-types/playbook';
export type { DegradedSource } from '@c-suite/shared-types/playbook';
// Local alias so the rest of this file can use DegradedSource without re-importing.
type DegradedSource = _DegradedSource;

export interface CashLeverRunResult {
  /** Lens outputs keyed by role */
  lensOutputs: Record<string, unknown>;
  /** Sources that were unavailable — each degraded memo section is flagged */
  // Uses DegradedSource from @c-suite/shared-types/playbook (re-exported above).
  degraded_sources: DegradedSource[];
  /** Memo markdown with [^source-id] citations */
  memoMarkdown?: string;
}

// ── Stub MCP calls (Ch.5 — Ch.8 ships real MCP integration) ──────────────────

/**
 * Salesforce committed pipeline query stub.
 * ADR-0006 §1.3: stage labels R1-verified (B19 fix).
 * Source: docs/decisions/0006-ch5-cash-lever-slice.md §1.3
 *
 * UNKNOWN (B19 resolved in R1): stage labels patched to verified values.
 */
async function stubSalesforceQuery(
  db: Database.Database | null,
  runId: string,
  sourceId: string,
): Promise<unknown> {
  const result = [
    { id: 'opp-001', name: 'Acme Renewal', amount: 1_200_000, stageName: 'Contracting',   closeDate: '2026-07-15', accountName: 'Acme Corp' },
    { id: 'opp-002', name: 'Beta Corp New', amount: 850_000, stageName: 'Verbal Agreement', closeDate: '2026-06-30', accountName: 'Beta Corp' },
    { id: 'opp-003', name: 'Gamma SaaS',   amount: 675_000,  stageName: 'Renewal Quote Sent', closeDate: '2026-07-01', accountName: 'Gamma LLC' },
  ];

  if (db) {
    insertToolCall(db, {
      tool_call_id: `tc-sf-${Date.now()}`,
      run_id: runId,
      agent_invocation_id: `inv-cfo-${runId}`,
      tool_name: 'salesforce.committedPipelineQuery',
      args_json: JSON.stringify({
        stagesIn: ['Verbal Agreement', 'Verbal Approval', 'Contracting', 'Quote in Review', 'Negotiation', 'Renewal Quote Sent', 'Qualified Renewal'],
        activeAm: true,
      }),
      result_json: JSON.stringify(result),
      source_id: sourceId,
    });
  }

  log.info({ runId, message: `SF pipeline stub: ${result.length} opportunities` });
  return result;
}

/**
 * AWS Cost Explorer spend summary stub.
 * ADR-0006 §1.3 + UNKNOWN (B32): profile structure unknown; stub uses ['class', 'collab'].
 * ADR-0006 §1.4: AWS SSO expired → degrade (not block); flag degraded: aws in output.
 */
async function stubAwsSpendQuery(
  db: Database.Database | null,
  runId: string,
  sourceId: string,
  options: { simulateExpired?: boolean } = {},
): Promise<{ result: unknown; degraded: boolean }> {
  if (options.simulateExpired) {
    log.info({ runId, message: 'AWS SSO expired — degrading (not blocking); flag aws in degraded_sources' });
    return { result: null, degraded: true };
  }

  const result = [
    { month: '2026-01', service: 'EC2',         totalCost: 42_800, currency: 'USD' },
    { month: '2026-01', service: 'RDS',         totalCost: 18_300, currency: 'USD' },
    { month: '2026-02', service: 'EC2',         totalCost: 44_100, currency: 'USD' },
    { month: '2026-02', service: 'RDS',         totalCost: 18_800, currency: 'USD' },
    { month: '2026-03', service: 'EC2',         totalCost: 45_200, currency: 'USD' },
    { month: '2026-03', service: 'CloudFront',  totalCost: 9_400,  currency: 'USD' },
  ];

  if (db) {
    insertToolCall(db, {
      tool_call_id: `tc-aws-${Date.now()}`,
      run_id: runId,
      agent_invocation_id: `inv-cfo-${runId}`,
      tool_name: 'aws.spendSummary',
      args_json: JSON.stringify({ months: 6, profiles: ['class', 'collab'] }),
      result_json: JSON.stringify(result),
      source_id: sourceId,
    });
  }

  log.info({ runId, message: `AWS spend stub: ${result.length} monthly records` });
  return { result, degraded: false };
}

/**
 * NetSuite cash position query stub.
 * ADR-0006 §1.3 + R1 verified: SuiteQL works; $-6.5M to +$21.7M range.
 * UNKNOWN (B1): TBA tokens required for standalone Electron app.
 * Blocking if unreachable (ADR-0006 §1.4).
 */
async function stubNetSuiteQuery(
  db: Database.Database | null,
  runId: string,
  sourceId: string,
  options: { simulateUnreachable?: boolean } = {},
): Promise<{ result: unknown; blocked: boolean }> {
  if (options.simulateUnreachable) {
    log.error({ runId, message: 'NetSuite unreachable — blocking run (ADR-0006 §1.4)' });
    return { result: null, blocked: true };
  }

  const result = [
    { month: '2025-06', netAmount: -6_500_000, acctType: 'Bank', acctNumber: '1000' },
    { month: '2025-07', netAmount: 8_200_000,  acctType: 'Bank', acctNumber: '1000' },
    { month: '2025-08', netAmount: 4_100_000,  acctType: 'Bank', acctNumber: '1000' },
    { month: '2025-09', netAmount: 21_700_000, acctType: 'Bank', acctNumber: '1000' },
    { month: '2025-10', netAmount: 12_400_000, acctType: 'Bank', acctNumber: '1000' },
    { month: '2025-11', netAmount: 9_800_000,  acctType: 'Bank', acctNumber: '1000' },
    { month: '2025-12', netAmount: 14_200_000, acctType: 'Bank', acctNumber: '1000' },
    { month: '2026-01', netAmount: 11_600_000, acctType: 'Bank', acctNumber: '1000' },
    { month: '2026-02', netAmount: 8_900_000,  acctType: 'Bank', acctNumber: '1000' },
    { month: '2026-03', netAmount: 13_300_000, acctType: 'Bank', acctNumber: '1000' },
    { month: '2026-04', netAmount: 10_700_000, acctType: 'Bank', acctNumber: '1000' },
    { month: '2026-05', netAmount: 14_200_000, acctType: 'Bank', acctNumber: '1000' },
  ];

  if (db) {
    insertToolCall(db, {
      tool_call_id: `tc-ns-${Date.now()}`,
      run_id: runId,
      agent_invocation_id: `inv-cfo-${runId}`,
      tool_name: 'netsuite.cashPositionQuery',
      args_json: JSON.stringify({}),
      result_json: JSON.stringify(result),
      source_id: sourceId,
    });
  }

  log.info({ runId, message: `NetSuite cash stub: ${result.length} months` });
  return { result, blocked: false };
}

/**
 * Cash model xlsx lever rows stub.
 * UNKNOWN (ADR-0006 §9): exact vault path + lever row schema unknown until runtime.
 * Merged-cell handling: xlsx npm package with cellMerges detection (Ch.8 full impl).
 * Degrades if not found (ADR-0006 §1.4).
 */
async function stubCashModelQuery(
  db: Database.Database | null,
  runId: string,
  sourceId: string,
  options: { simulateNotFound?: boolean } = {},
): Promise<{ result: unknown; degraded: boolean }> {
  if (options.simulateNotFound) {
    log.info({ runId, message: 'Cash model xlsx not found — degrading (CFO runs without lever-row quantification)' });
    return { result: null, degraded: true };
  }

  // UNKNOWN: exact lever-row schema TBD pending xlsx inspection at Ch.5 runtime
  // (ADR-0006 §9 — surfaced to Russell via AC5)
  const result = [
    { leverName: 'LoC Draw',           currentValue: 0,       adjustedValue: 5_000_000, cashImpact: 5_000_000,  notes: 'Barclays facility — 30-day draw capacity' },
    { leverName: 'AWS Spend Deferral', currentValue: 245_000, adjustedValue: 0,         cashImpact: 245_000,    notes: 'Monthly AWS spend deferrable 45 days' },
    { leverName: 'Collections Accel',  currentValue: 0,       adjustedValue: 1_800_000, cashImpact: 1_800_000,  notes: 'Early collection incentive on AR >60d' },
    { leverName: 'Capex Defer',        currentValue: 380_000, adjustedValue: 0,         cashImpact: 380_000,    notes: 'Hardware refresh deferrals Q3' },
    { leverName: 'Payroll Timing',     currentValue: 0,       adjustedValue: 620_000,   cashImpact: 620_000,    notes: 'Semi-monthly → monthly payroll shift' },
  ];

  if (db) {
    insertToolCall(db, {
      tool_call_id: `tc-xlsx-${Date.now()}`,
      run_id: runId,
      agent_invocation_id: `inv-cfo-${runId}`,
      tool_name: 'cashModel.readXlsxLeverRows',
      args_json: JSON.stringify({ vaultPath: 'UNKNOWN — pending Russell confirmation (ADR-0006 §9)' }),
      result_json: JSON.stringify(result),
      source_id: sourceId,
    });
  }

  log.info({ runId, message: `Cash model stub: ${result.length} lever rows` });
  return { result, degraded: false };
}

// ── Cash lever orchestration ───────────────────────────────────────────────────

export interface CashLeverOptions {
  /** SQLite database handle for tool_call persistence */
  db?: Database.Database;
  /** Simulate AWS SSO expired for degraded-mode testing */
  simulateAwsExpired?: boolean;
  /** Simulate NetSuite unreachable for blocker testing */
  simulateNsUnreachable?: boolean;
  /** Simulate cash model not found for degraded-mode testing */
  simulateCashModelNotFound?: boolean;
}

/**
 * Orchestrate the cash lever playbook.
 * ADR-0006 §7: Steps 5-9 (fan-out → lens outputs).
 *
 * CFO + COS lenses fire in parallel. Each lens fires its MCP calls
 * and inserts rows into tool_calls with source_id for memo citations.
 *
 * @param runId     Run ID for SQLite persistence
 * @param question  User's cash lever question
 * @param options   Override flags for degraded-mode testing
 */
export async function runCashLeverPlaybook(
  runId: string,
  question: string,
  options: CashLeverOptions = {},
): Promise<CashLeverRunResult> {
  const { db = null, simulateAwsExpired = false, simulateNsUnreachable = false, simulateCashModelNotFound = false } = options;
  const degraded_sources: DegradedSource[] = [];
  const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '-');

  log.info({ runId, message: `Cash lever playbook starting — question: "${question.slice(0, 60)}..."` });

  // ── CFO + COS fan-out in parallel ────────────────────────────────────────

  const [cfoResult, cosResult] = await Promise.all([
    runCfoLens(runId, ts, db, { simulateAwsExpired, simulateNsUnreachable, simulateCashModelNotFound }),
    runCosLens(runId, ts, db),
  ]);

  // Collect degraded sources from CFO lens
  if (cfoResult.degraded_sources) {
    degraded_sources.push(...cfoResult.degraded_sources);
  }

  // Check for blocking condition (NetSuite unreachable)
  if (cfoResult.blocked) {
    throw new Error('NetSuite unreachable — cash lever playbook blocked (ADR-0006 §1.4)');
  }

  log.info({ runId, message: `Cash lever lenses complete — degraded: [${degraded_sources.join(', ')}]` });

  return {
    lensOutputs: {
      CFO: cfoResult.output,
      COS: cosResult.output,
    },
    degraded_sources,
  };
}

// ── Individual lens runners ────────────────────────────────────────────────────

interface LensResult {
  output: unknown;
  degraded_sources?: DegradedSource[];
  blocked?: boolean;
}

async function runCfoLens(
  runId: string,
  ts: string,
  db: Database.Database | null,
  options: {
    simulateAwsExpired: boolean;
    simulateNsUnreachable: boolean;
    simulateCashModelNotFound: boolean;
  },
): Promise<LensResult> {
  const degraded: DegradedSource[] = [];

  // SF pipeline (required — blocks if auth expired per ADR-0006 §1.4)
  const sfResult = await stubSalesforceQuery(db, runId, `sf-pipeline-${ts}`);

  // AWS spend (degrades if SSO expired)
  const awsResult = await stubAwsSpendQuery(db, runId, `aws-spend-${ts}`, {
    simulateExpired: options.simulateAwsExpired,
  });
  if (awsResult.degraded) {
    degraded.push('aws');
  }

  // NetSuite cash (blocks if unreachable)
  const nsResult = await stubNetSuiteQuery(db, runId, `ns-cash-${ts}`, {
    simulateUnreachable: options.simulateNsUnreachable,
  });
  if (nsResult.blocked) {
    return { output: null, blocked: true };
  }

  // Cash model xlsx (degrades if not found)
  const xlsxResult = await stubCashModelQuery(db, runId, `cash-model-${ts}`, {
    simulateNotFound: options.simulateCashModelNotFound,
  });
  if (xlsxResult.degraded) {
    degraded.push('cash_model');
  }

  return {
    output: {
      role: 'CFO',
      sfPipeline: sfResult,
      awsSpend: awsResult.result,
      cashPosition: nsResult.result,
      leverRows: xlsxResult.result,
      degraded_sources: degraded,
    },
    degraded_sources: degraded,
  };
}

async function runCosLens(
  runId: string,
  ts: string,
  db: Database.Database | null,
): Promise<LensResult> {
  // COS lens: operational risk + execution feasibility
  // Stub: returns structured assessment of AWS spend deferral feasibility
  const result = {
    role: 'COS',
    operationalRisk: 'low',
    executionFeasibility: {
      awsSpendDeferral: {
        feasible: true,
        duration: '45 days',
        risk: 'Low — no SLA impact within 45-day deferral window',
      },
      locDraw: {
        feasible: true,
        leadTime: '5 business days',
        covenantImpact: 'Monitor — draw increases leverage ratio',
      },
    },
  };

  log.info({ runId, message: 'COS lens complete — operational risk assessed' });
  return { output: result };
}

// ── ADR-0009 §3 adapter shim ──────────────────────────────────────────────────
// Re-exports runCashLeverPlaybook under the unified PlaybookModule.runPlaybook signature.
// Does NOT rewrite cash-lever internals (forbidden per ADR-0009 §3 scope).
// Phase B will pattern-match against this adapter.

import type { PlaybookInput, PlaybookContext, PlaybookResult, PlaybookModule, StubbedSource } from '@c-suite/shared-types/playbook';

// B47 honest-stub declaration (audit Finding 4). cash-lever fabricates all four
// data sources via stub*Query helpers below; STUB_MODE=live is refused by the guard
// until these are wired to ctx.deps. Drop entries as each becomes real.
export const STUBBED_SOURCES: readonly StubbedSource[] = ['salesforce', 'aws', 'netsuite', 'cash_model'];

function adaptResult(r: CashLeverRunResult, degradedSources: DegradedSource[]): PlaybookResult {
  const stamps: string[] = degradedSources.length > 0 ? ['DEGRADED'] : ['CLEAN'];
  return {
    memoMarkdown: r.memoMarkdown ?? '',
    degradedSources: r.degraded_sources.map(String),
    lensOutputs: r.lensOutputs,
    stamps,
    rigorScore: null,       // cash-lever pre-dates Verifier integration; null until Ch.8
    rigorThreshold: 70,
    proposedWritebacks: [],
  };
}

export const runPlaybook: PlaybookModule['runPlaybook'] = async (
  input: PlaybookInput,
  ctx: PlaybookContext,
): Promise<PlaybookResult> => {
  const result = await runCashLeverPlaybook(ctx.runId, input.prompt, { db: ctx.db });
  return adaptResult(result, result.degraded_sources);
};
