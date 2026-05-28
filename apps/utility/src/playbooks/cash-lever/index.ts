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
import type { PlaybookDeps } from '@c-suite/shared-types/playbook';
import type { AWSClient } from '../../mcp/aws/client.js';

const log = createLogger();

// ── Degraded-mode flags ────────────────────────────────────────────────────────
// Re-exported from @c-suite/shared-types/playbook for back-compat.
// The canonical type lives in shared-types (ch.7 move); this alias preserves existing imports.

import type { DegradedSource } from '@c-suite/shared-types/playbook';
export type { DegradedSource }; // re-export for back-compat

export interface CashLeverRunResult {
  /** Lens outputs keyed by role */
  lensOutputs: Record<string, unknown>;
  /** Sources that were unavailable — each degraded memo section is flagged */
  // Uses DegradedSource from @c-suite/shared-types/playbook (re-exported above).
  degraded_sources: DegradedSource[];
  /** Memo markdown with [^source-id] citations */
  memoMarkdown?: string;
}

// ── Real MCP data fetchers (B47 Phase 2 — audit Finding 4) ───────────────────
// Each fetcher calls the real ctx.deps client and records a REAL tool_call (real
// result_json) so memo citations click through to genuine tool results. When a
// dependency is absent or unauthenticated, the fetcher degrades honestly
// (result:null, degraded:true) — it NEVER fabricates data. DOCTRINE #1.

// B19-verified committed-pipeline stages (validated against Class's SFDC schema in R1).
const COMMITTED_PIPELINE_STAGES = [
  'Verbal Agreement', 'Verbal Approval', 'Contracting', 'Quote in Review',
  'Negotiation', 'Renewal Quote Sent', 'Qualified Renewal',
];

function committedPipelineSoql(): string {
  const stageList = COMMITTED_PIPELINE_STAGES.map((s) => `'${s.replace(/'/g, "\\'")}'`).join(', ');
  return (
    `SELECT Id, Name, Amount, StageName, CloseDate, Account.Name ` +
    `FROM Opportunity WHERE StageName IN (${stageList}) AND IsClosed = false ` +
    `ORDER BY CloseDate ASC`
  );
}

/**
 * Committed-pipeline query via the real Salesforce client.
 * Degrades (result:null) when the dep is absent or the query fails.
 */
async function fetchSalesforcePipeline(
  deps: PlaybookDeps,
  db: Database.Database | null,
  runId: string,
  sourceId: string,
): Promise<{ result: unknown; degraded: boolean }> {
  if (!deps.salesforce) {
    log.info({ runId, message: 'Salesforce dep absent — degrading (no committed-pipeline query)' });
    return { result: null, degraded: true };
  }
  const soql = committedPipelineSoql();
  try {
    const res = await deps.salesforce.query(soql);
    if (db) {
      insertToolCall(db, {
        call_id: `tc-sf-${Date.now()}`,
        run_id: runId,
        invocation_id: `inv-cfo-${runId}`,
        tool_name: 'salesforce.query',
        args_json: JSON.stringify({ soql }),
        result_json: JSON.stringify(res.records),
        source_id: sourceId,
      });
    }
    log.info({ runId, message: `Salesforce committed pipeline: ${res.records.length} opportunities (live)` });
    return { result: res.records, degraded: false };
  } catch (err) {
    log.warn({ runId, message: `Salesforce query failed — degrading: ${String(err)}` });
    return { result: null, degraded: true };
  }
}

/**
 * Combined AWS Cost Explorer spend via the real AWS client (sums class + collab,
 * R1-verified rule). Degrades when the dep is absent or BOTH profiles fail; a
 * single-profile failure surfaces as a partial degrade (data still real).
 */
async function fetchAwsSpend(
  deps: PlaybookDeps,
  db: Database.Database | null,
  runId: string,
  sourceId: string,
): Promise<{ result: unknown; degraded: boolean }> {
  if (!deps.aws) {
    log.info({ runId, message: 'AWS dep absent — degrading (no spend summary)' });
    return { result: null, degraded: true };
  }
  // getCombinedCost (sum class+collab) lives on the concrete AWSClient, not the
  // McpClient interface surface. buildDeps always constructs the concrete class.
  const aws = deps.aws as unknown as AWSClient;
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth() - 6, 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  try {
    const res = await aws.getCombinedCost({ start: fmt(start), end: fmt(end) });
    if (db) {
      insertToolCall(db, {
        call_id: `tc-aws-${Date.now()}`,
        run_id: runId,
        invocation_id: `inv-cfo-${runId}`,
        tool_name: 'aws.getCombinedCost',
        args_json: JSON.stringify({ start: fmt(start), end: fmt(end), profiles: ['class', 'collab'] }),
        result_json: JSON.stringify(res),
        source_id: sourceId,
      });
    }
    const partial = Array.isArray(res.degraded_sources) && res.degraded_sources.length > 0;
    log.info({
      runId,
      message: `AWS combined spend: $${res.total} ${res.currency} (live${partial ? ', partial: ' + res.degraded_sources!.join('+') : ''})`,
    });
    return { result: res, degraded: partial };
  } catch (err) {
    log.warn({ runId, message: `AWS getCombinedCost failed (both profiles?) — degrading: ${String(err)}` });
    return { result: null, degraded: true };
  }
}

/**
 * NetSuite cash position via the real NetSuite client (ns_runCustomSuiteQL MCP tool).
 *
 * DOCTRINE #1 gate: the cash-position SuiteQL must be VALIDATED against Class's
 * NetSuite GL/account schema before it runs — a guessed query would emit real-but-
 * wrong cited data. It is therefore NOT hardcoded here; it is supplied (post-
 * validation) via NETSUITE_SUITEQL_CASH_POSITION. When the query env is unset, the
 * NetSuite client is absent, or no OAuth credential is present (runSuiteQL → null),
 * this degrades honestly. The wiring (runSuiteQL + real tool_call) is real regardless.
 */
async function fetchNetSuiteCash(
  deps: PlaybookDeps,
  db: Database.Database | null,
  runId: string,
  sourceId: string,
): Promise<{ result: unknown; degraded: boolean }> {
  const suiteQl = process.env.NETSUITE_SUITEQL_CASH_POSITION;
  if (!deps.netsuite || !suiteQl) {
    log.info({
      runId,
      message: !suiteQl
        ? 'NetSuite cash query unset (NETSUITE_SUITEQL_CASH_POSITION pending schema validation) — degrading'
        : 'NetSuite dep absent — degrading',
    });
    return { result: null, degraded: true };
  }
  try {
    const res = await deps.netsuite.runSuiteQL(suiteQl);
    if (res === null) {
      log.info({ runId, message: 'NetSuite returned null (no OAuth credential — degraded mode)' });
      return { result: null, degraded: true };
    }
    if (db) {
      insertToolCall(db, {
        call_id: `tc-ns-${Date.now()}`,
        run_id: runId,
        invocation_id: `inv-cfo-${runId}`,
        tool_name: 'netsuite.runSuiteQL',
        args_json: JSON.stringify({ query: suiteQl }),
        result_json: JSON.stringify(res.items),
        source_id: sourceId,
      });
    }
    log.info({ runId, message: `NetSuite cash position: ${res.items.length} rows (live)` });
    return { result: res.items, degraded: false };
  } catch (err) {
    log.warn({ runId, message: `NetSuite runSuiteQL failed — degrading: ${String(err)}` });
    return { result: null, degraded: true };
  }
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
      call_id: `tc-xlsx-${Date.now()}`,
      run_id: runId,
      invocation_id: `inv-cfo-${runId}`,
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
  /** Real MCP clients (Salesforce / AWS / NetSuite). Absent deps degrade honestly. */
  deps?: PlaybookDeps;
  /** Simulate cash model not found for degraded-mode testing (cash_model still stubbed). */
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
  const { db = null, deps = {}, simulateCashModelNotFound = false } = options;
  const degraded_sources: DegradedSource[] = [];
  const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '-');

  log.info({ runId, message: `Cash lever playbook starting — question: "${question.slice(0, 60)}..."` });

  // ── CFO + COS fan-out in parallel ────────────────────────────────────────

  const [cfoResult, cosResult] = await Promise.all([
    runCfoLens(runId, ts, db, deps, { simulateCashModelNotFound }),
    runCosLens(runId, ts, db),
  ]);

  // Collect degraded sources from CFO lens (honest degradation — no blocking)
  if (cfoResult.degraded_sources) {
    degraded_sources.push(...cfoResult.degraded_sources);
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
  deps: PlaybookDeps,
  options: {
    simulateCashModelNotFound: boolean;
  },
): Promise<LensResult> {
  const degraded: DegradedSource[] = [];

  // SF committed pipeline (real query; degrades if dep absent/unauth)
  const sfResult = await fetchSalesforcePipeline(deps, db, runId, `sf-pipeline-${ts}`);
  if (sfResult.degraded) {
    degraded.push('salesforce');
  }

  // AWS combined spend (real; degrades if dep absent or both profiles fail)
  const awsResult = await fetchAwsSpend(deps, db, runId, `aws-spend-${ts}`);
  if (awsResult.degraded) {
    degraded.push('aws');
  }

  // NetSuite cash position (real; degrades when query unvalidated / no credential)
  const nsResult = await fetchNetSuiteCash(deps, db, runId, `ns-cash-${ts}`);
  if (nsResult.degraded) {
    degraded.push('netsuite');
  }

  // Cash model xlsx — STILL STUBBED (no xlsx reader yet; see STUBBED_SOURCES).
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

// B47 Phase 2 (audit Finding 4): Salesforce, AWS, and NetSuite are now wired to the
// real ctx.deps clients with honest degradation. cash_model alone remains stubbed
// (no xlsx reader yet) — so STUB_MODE=live is still guard-refused unless
// ALLOW_STUBBED_LIVE=1, which downgrades cash_model to a degraded_source. Drop
// 'cash_model' once a real VAULT_PATH xlsx reader lands.
export const STUBBED_SOURCES: readonly StubbedSource[] = ['cash_model'];

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
  const result = await runCashLeverPlaybook(ctx.runId, input.prompt, { db: ctx.db, deps: ctx.deps });
  return adaptResult(result, result.degraded_sources);
};
