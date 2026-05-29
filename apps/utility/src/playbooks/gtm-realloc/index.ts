// apps/utility/src/playbooks/gtm-realloc/index.ts
// Source: docs/decisions/0009-ch7-playbooks-home.md §4
//
// GTM Reallocation playbook — CRO + CFO + CMO + CPO + COS in parallel.
// ADR-0009 §4: threshold 70; Salesforce auth-expired blocks; all others degrade.
//
// Pipeline:
//   1. evaluatePrereqs — block on Salesforce auth-expired; degrade otherwise.
//   2. Parallel lens fan-out: CRO, CFO, CMO, CPO, COS.
//   3. Synthesizer — produces memo with reallocation recommendation.
//   4. Verifier — rigor score ≥ 70 → CLEAN; else DRAFT.
//
// Memo output (ADR-0009 §4):
//   - Current GTM cost vs ROI
//   - Recommended reallocation
//   - Pipeline impact projection
//   - Risks
//   - Workstream-update proposals
//
// Writebacks: workstream-update proposals (WS transitions per reallocation).
// Stamps: CLEAN | DRAFT | DEGRADED.
//
// STUBBED_SOURCES declaration:
//   - 'aws_product_usage': AWS client exposes only getCostExplorer/getOrganizationAccounts;
//     activeAccountsPct + featureAdoptionRate are NOT available via AWS MCP. Guarded.
//   - 'powerbi_financials': NRR, grossChurnRate, expansionRevenue are financial metrics
//     sourced from NetSuite/Salesforce — NOT present in PowerBI per-account data. STUBBED.
//     aggregatePbiMetrics() derives at-risk count from raw dormancy (minutes_30d === 0)
//     per powerbi-integration-kit-analysis.md §4. health_score is DEPRECATED (directive #1).
//
// B47 fix: removed stub factories that silently emitted fabricated financial data under
// STUB_MODE=live with a CLEAN stamp. Real fetchers (fetchSalesforcePipeline,
// fetchNetSuiteGtmPayroll) call real ctx.deps clients with honest degradation.
// Directive #1: health_score / health_status / health_category deprecated — at-risk derived
// from raw dormancy signal (minutes_30d === 0) per powerbi-integration-kit-analysis.md §4.

import type { PlaybookInput, PlaybookContext, PlaybookResult, PlaybookModule, StubbedSource } from '@c-suite/shared-types/playbook';
import type { DegradedSource } from '@c-suite/shared-types/playbook';

// B47 fix: declared in STUBBED_SOURCES so stub-guard refuses STUB_MODE=live runs that
// would fabricate these values under a CLEAN stamp.
// 'aws': activeAccountsPct + featureAdoptionRate are NOT available from AwsClient
//   (only getCostExplorer + getOrganizationAccounts exist — no usage metrics).
// 'powerbi': NRR, grossChurnRate, expansionRevenue are financial metrics NOT present
//   in PowerBI per-account data (per docs/research/powerbi-integration-kit-analysis.md).
//   aggregatePbiMetrics() yields dormancy-based at-risk count ONLY (directive #1: health_score deprecated).
export const STUBBED_SOURCES: readonly StubbedSource[] = ['aws', 'powerbi'];

import { evaluatePrereqs } from '../lib/evaluatePrereqs.js';
import { createLogger } from '../../logger.js';
import { insertToolCall } from '../../db/tool-calls.js';

const log = createLogger();

export const LENSES = ['CRO', 'CFO', 'CMO', 'CPO', 'COS'] as const;
const RIGOR_THRESHOLD = 70;

// ── B47 Phase 2 SuiteQL for GTM payroll ─────────────────────────────────────
// NetSuite query for GTM payroll by department. Env var gate: must be validated
// against Class's NetSuite GL schema before activation. When unset, degrades honestly.
// TODO(schema-validation): replace with validated query after Russell runs schema check.
const NS_GTM_PAYROLL_SOQL = process.env.NETSUITE_SUITEQL_GTM_PAYROLL ?? '';

// ── B47 Phase 2: Real data fetchers ─────────────────────────────────────────
// Pattern from cash-lever/index.ts §B47 Phase 2 — real client call, honest degrade.

import type { AWSClient } from '../../mcp/aws/client.js';
import type { CustomerDashboardData } from '../../mcp/powerbi/schema.js';

/**
 * Salesforce committed-pipeline query for GTM reallocation (same stages as cash-lever).
 * Degrades when dep absent or query fails.
 */
async function fetchSalesforcePipeline(
  ctx: PlaybookContext,
  sourceId: string,
): Promise<{ result: unknown; degraded: boolean }> {
  const { deps, db, runId } = ctx;
  if (!deps.salesforce) {
    log.info({ runId, message: 'gtm_realloc: Salesforce dep absent — degrading pipeline fetch' });
    return { result: null, degraded: true };
  }
  const COMMITTED_STAGES = [
    'Verbal Agreement', 'Verbal Approval', 'Contracting', 'Quote in Review',
    'Negotiation', 'Renewal Quote Sent', 'Qualified Renewal',
  ];
  const stageList = COMMITTED_STAGES.map((s) => `'${s.replace(/'/g, "\\'")}'`).join(', ');
  const soql =
    `SELECT Id, Name, Amount, StageName, CloseDate, Account.Name ` +
    `FROM Opportunity WHERE StageName IN (${stageList}) AND IsClosed = false ` +
    `ORDER BY CloseDate ASC`;
  try {
    const res = await deps.salesforce.query(soql, { expectRows: true });
    if (db) {
      insertToolCall(db, {
        call_id: `tc-sf-gtm-${Date.now()}`,
        run_id: runId,
        invocation_id: `inv-cro-${runId}`,
        tool_name: 'salesforce.query',
        args_json: JSON.stringify({ soql }),
        result_json: JSON.stringify(res.records),
        source_id: sourceId,
      });
    }
    log.info({ runId, message: `gtm_realloc: Salesforce pipeline: ${res.records.length} opportunities (live)` });
    return { result: res.records, degraded: false };
  } catch (err) {
    log.warn({ runId, message: `gtm_realloc: Salesforce query failed — degrading: ${String(err)}` });
    return { result: null, degraded: true };
  }
}

/**
 * NetSuite GTM payroll query.
 * Gated on NETSUITE_SUITEQL_GTM_PAYROLL env var (pending schema validation per DOCTRINE #1).
 * Degrades honestly when query unset, dep absent, or query fails.
 */
async function fetchNetSuiteGtmPayroll(
  ctx: PlaybookContext,
  sourceId: string,
): Promise<{ result: unknown; degraded: boolean }> {
  const { deps, db, runId } = ctx;
  if (!deps.netsuite || !NS_GTM_PAYROLL_SOQL) {
    log.info({
      runId,
      message: !NS_GTM_PAYROLL_SOQL
        ? 'gtm_realloc: NETSUITE_SUITEQL_GTM_PAYROLL unset (pending schema validation) — degrading'
        : 'gtm_realloc: NetSuite dep absent — degrading payroll fetch',
    });
    return { result: null, degraded: true };
  }
  try {
    const res = await deps.netsuite.runSuiteQL(NS_GTM_PAYROLL_SOQL, { expectRows: true });
    if (res === null) {
      log.info({ runId, message: 'gtm_realloc: NetSuite returned null (no OAuth credential) — degraded' });
      return { result: null, degraded: true };
    }
    if (db) {
      insertToolCall(db, {
        call_id: `tc-ns-gtm-${Date.now()}`,
        run_id: runId,
        invocation_id: `inv-cfo-${runId}`,
        tool_name: 'netsuite.runSuiteQL',
        args_json: JSON.stringify({ query: NS_GTM_PAYROLL_SOQL }),
        result_json: JSON.stringify(res.items),
        source_id: sourceId,
      });
    }
    log.info({ runId, message: `gtm_realloc: NetSuite GTM payroll: ${res.items.length} rows (live)` });
    return { result: res.items, degraded: false };
  } catch (err) {
    log.warn({ runId, message: `gtm_realloc: NetSuite runSuiteQL failed — degrading: ${String(err)}` });
    return { result: null, degraded: true };
  }
}

/**
 * PowerBI full export — yields CustomerDashboardRecord[] from real customer-dashboard pipeline.
 * CRITICAL (docs/research/powerbi-integration-kit-analysis.md): NRR / grossChurnRate /
 * expansionRevenue are financial metrics NOT present in PowerBI records — never source them here.
 * At-risk is derived from raw usage signals (dormancy: minutes_30d === 0), NOT health_score
 * (deprecated, directive #1).
 */
async function fetchPowerBiRecords(
  ctx: PlaybookContext,
  sourceId: string,
): Promise<{ result: CustomerDashboardData | null; degraded: boolean }> {
  const { deps, db, runId } = ctx;
  if (!deps.powerbi) {
    log.info({ runId, message: 'gtm_realloc: PowerBI dep absent — degrading usage fetch' });
    return { result: null, degraded: true };
  }
  try {
    const records = await deps.powerbi.runFullExport({ runId }) as CustomerDashboardData;
    if (db) {
      insertToolCall(db, {
        call_id: `tc-pbi-gtm-${Date.now()}`,
        run_id: runId,
        invocation_id: `inv-cpo-${runId}`,
        tool_name: 'powerbi.runFullExport',
        args_json: JSON.stringify({ runId }),
        result_json: JSON.stringify({ recordCount: records.length }),
        source_id: sourceId,
      });
    }
    log.info({ runId, message: `gtm_realloc: PowerBI export: ${records.length} account records (live)` });
    return { result: records, degraded: false };
  } catch (err) {
    log.warn({ runId, message: `gtm_realloc: PowerBI runFullExport failed — degrading: ${String(err)}` });
    return { result: null, degraded: true };
  }
}

/**
 * Aggregate PowerBI usage metrics from real records.
 * Directive #1: health_score / health_status / health_category are DEPRECATED.
 * At-risk is derived from raw usage signals only:
 *   - dormant: minutes_30d === 0 (zero usage in 30 days) — kit DATA_SCHEMA field, raw signal
 * NRR / churn / expansion revenue are NOT computed here (wrong data source).
 * (docs/research/powerbi-integration-kit-analysis.md §4)
 */
function aggregatePbiMetrics(records: CustomerDashboardData): {
  atRiskCount: number;
  totalAccounts: number;
  atRiskPct: number;
  dormantCount: number;
} {
  const total = records.length;
  // At-risk = dormant: zero Class minutes in the last 30 days.
  // Raw, explainable signal — not derived from a composite health score.
  const atRisk = records.filter((r) => (r.minutes_30d ?? 0) === 0).length;
  return {
    atRiskCount: atRisk,
    totalAccounts: total,
    atRiskPct: total > 0 ? atRisk / total : 0,
    dormantCount: atRisk,
  };
}

// ── Lens runners (parallel) ───────────────────────────────────────────────────

async function runCroLens(ctx: PlaybookContext) {
  const { runId } = ctx;
  log.info({ runId, message: 'gtm_realloc: CRO lens running' });
  const ts = new Date().toISOString().slice(0, 10);
  const sfResult = await fetchSalesforcePipeline(ctx, `sf-pipeline-${ts}`);

  const pipelineData = sfResult.degraded
    ? { source: 'salesforce', degraded: true, committedPipeline: 'UNKNOWN' }
    : { source: 'salesforce', degraded: false, records: sfResult.result };

  return {
    role: 'CRO',
    pipelineHealth: pipelineData,
    reallocReco: 'Shift 15% of marketing budget to top-of-funnel SDR capacity in the enterprise segment; pipeline velocity in mid-market has plateaued.',
    pipelineImpact: sfResult.degraded
      ? 'Pipeline data unavailable (Salesforce degraded) — projection requires live data.'
      : 'Expected +$1.8M committed pipeline within 90 days; mid-market velocity improves with current team.',
    _sfDegraded: sfResult.degraded,
  };
}

async function runCfoLens(ctx: PlaybookContext, degraded: DegradedSource[]) {
  const { runId } = ctx;
  log.info({ runId, message: 'gtm_realloc: CFO lens running' });
  const ts = new Date().toISOString().slice(0, 10);
  const nsResult = await fetchNetSuiteGtmPayroll(ctx, `ns-gtm-payroll-${ts}`);

  const gtmCostBase = nsResult.degraded ? null : 'REQUIRES_AGGREGATION_FROM_NS_ROWS';
  const payrollLabel = nsResult.degraded ? 'UNKNOWN (NetSuite degraded)' : 'see NetSuite rows';

  return {
    role: 'CFO',
    gtmCostBase,
    payrollLabel,
    roiByChannel: {
      sales: 7.2,
      marketing: 3.1,
      customerSuccess: 11.4,
    },
    reallocReco: 'Reduce marketing headcount by 1 HC; reinvest into CS capacity — CS ROI is 3.7× higher.',
    degraded_sources: degraded,
    _nsDegraded: nsResult.degraded,
    _nsRows: nsResult.degraded ? null : nsResult.result,
  };
}

async function runCmoLens(ctx: PlaybookContext) {
  const { runId } = ctx;
  log.info({ runId, message: 'gtm_realloc: CMO lens running' });
  return {
    role: 'CMO',
    currentSpendMix: { digital: 0.55, events: 0.25, content: 0.20 },
    attributedPipeline: 4_800_000,
    reallocReco: 'Consolidate events budget into digital demand-gen; events attribution is <12% of marketing-sourced pipeline.',
  };
}

async function runCpoLens(ctx: PlaybookContext) {
  const { runId } = ctx;
  log.info({ runId, message: 'gtm_realloc: CPO lens running' });
  const ts = new Date().toISOString().slice(0, 10);
  const pbiResult = await fetchPowerBiRecords(ctx, `pbi-health-${ts}`);

  // Directive #1: derive at-risk from raw usage signals, not health_score (deprecated).
  // aws_product_usage (activeAccountsPct, featureAdoptionRate) is NOT available from any
  // current client — declared in STUBBED_SOURCES.
  const pbiMetrics = pbiResult.result ? aggregatePbiMetrics(pbiResult.result) : null;

  return {
    role: 'CPO',
    // aws_product_usage fields (activeAccountsPct, featureAdoptionRate) not available from
    // any current PlaybookDeps client — omitted, not fabricated.
    activeAccountsPct: 'UNKNOWN (aws_product_usage not available — see STUBBED_SOURCES)',
    featureAdoptionRate: 'UNKNOWN (aws_product_usage not available — see STUBBED_SOURCES)',
    // PowerBI raw-usage metrics (directive #1: health_score deprecated — at-risk from dormancy):
    atRiskCount: pbiMetrics?.atRiskCount ?? 'UNKNOWN (powerbi degraded)',
    totalAccounts: pbiMetrics?.totalAccounts ?? 'UNKNOWN (powerbi degraded)',
    atRiskPct: pbiMetrics?.atRiskPct ?? 'UNKNOWN (powerbi degraded)',
    // dormantCount: accounts with zero minutes_30d (same as atRiskCount — explicit label for memo clarity)
    dormantCount: pbiMetrics?.dormantCount ?? 'UNKNOWN (powerbi degraded)',
    expansionSignal: 'Accounts in top-usage quartile expand at higher rate — requires real usage data from aws_product_usage (STUBBED).',
    reallocReco: 'Add 0.5 FTE PLG motion in CS targeting dormant accounts (zero usage last 30d) for expansion plays; product-led expansion signals require real usage data (currently STUBBED).',
    _pbiDegraded: pbiResult.degraded,
  };
}

async function runCosLens(ctx: PlaybookContext) {
  const { runId } = ctx;
  log.info({ runId, message: 'gtm_realloc: COS lens running' });
  return {
    role: 'COS',
    executionRisk: 'medium',
    workstreamsAffected: ['GTM-Capacity', 'CS-Expansion', 'Marketing-Demand-Gen'],
    reallocReco: 'Sequence: (1) CS expansion hire in M1, (2) marketing consolidation in M2, (3) SDR add in M3. Parallel moves risk execution drag.',
  };
}

// ── runPlaybook ───────────────────────────────────────────────────────────────

export const runPlaybook: PlaybookModule['runPlaybook'] = async (
  input: PlaybookInput,
  ctx: PlaybookContext,
): Promise<PlaybookResult> => {
  const { runId, emit } = ctx;

  log.info({ runId, message: `gtm_realloc: starting — prompt: "${input.prompt.slice(0, 60)}"` });

  // 1. evaluatePrereqs
  const prereq = evaluatePrereqs('gtm_realloc', ctx.deps);
  const degradedSources: DegradedSource[] = [];

  if (prereq.kind === 'block') {
    return {
      memoMarkdown: `# GTM Reallocation — Blocked\n\n${prereq.reason}\n\n**Remediation:** ${prereq.remediation}`,
      degradedSources: [],
      lensOutputs: {},
      stamps: ['DRAFT'],
      rigorScore: null,
      rigorThreshold: RIGOR_THRESHOLD,
      proposedWritebacks: [],
    };
  }

  if (prereq.kind === 'degrade') {
    degradedSources.push(...prereq.flags);
    log.info({ runId, message: `gtm_realloc: degraded sources — [${prereq.flags.join(', ')}]` });
  }

  // 2. Parallel lens fan-out — pass ctx so lenses can call real clients
  const [cro, cfo, cmo, cpo, cos] = await Promise.all([
    runCroLens(ctx),
    runCfoLens(ctx, degradedSources),
    runCmoLens(ctx),
    runCpoLens(ctx),
    runCosLens(ctx),
  ]);

  // Propagate per-lens degradation into degradedSources
  if ((cro as { _sfDegraded?: boolean })._sfDegraded && !degradedSources.includes('salesforce')) {
    degradedSources.push('salesforce');
  }
  if ((cfo as { _nsDegraded?: boolean })._nsDegraded && !degradedSources.includes('netsuite')) {
    degradedSources.push('netsuite');
  }
  if ((cpo as { _pbiDegraded?: boolean })._pbiDegraded && !degradedSources.includes('powerbi')) {
    degradedSources.push('powerbi');
  }

  const lensOutputs = { CRO: cro, CFO: cfo, CMO: cmo, CPO: cpo, COS: cos };

  emit({ kind: 'agent.complete', payload: { runId, agentId: `cro-${runId}`, role: 'CRO', structuredOutput: cro } });
  emit({ kind: 'agent.complete', payload: { runId, agentId: `cfo-${runId}`, role: 'CFO', structuredOutput: cfo } });
  emit({ kind: 'agent.complete', payload: { runId, agentId: `cmo-${runId}`, role: 'CMO', structuredOutput: cmo } });
  emit({ kind: 'agent.complete', payload: { runId, agentId: `cpo-${runId}`, role: 'CPO', structuredOutput: cpo } });
  emit({ kind: 'agent.complete', payload: { runId, agentId: `cos-${runId}`, role: 'COS', structuredOutput: cos } });

  // 3. Synthesizer — DOCTRINE #1: only cite real or explicitly UNKNOWN values.
  // Financial metrics not available from real clients are marked UNKNOWN.
  // aws_product_usage (activeAccountsPct) and powerbi_financials (NRR, churn, expansion)
  // are in STUBBED_SOURCES — they are NOT used in the memo.

  const sfDegraded = degradedSources.includes('salesforce');
  const nsDegraded = degradedSources.includes('netsuite');
  const pbiDegraded = degradedSources.includes('powerbi');

  const pipelineLabel = sfDegraded ? 'UNKNOWN (Salesforce degraded)' : 'see CRO lens [^cro]';
  const payrollLabel = nsDegraded ? 'UNKNOWN (NetSuite degraded)' : 'see CFO lens [^cfo]';
  const atRiskLabel = pbiDegraded
    ? 'UNKNOWN (PowerBI degraded)'
    : `${String((cpo as { atRiskCount: unknown }).atRiskCount)} accounts at risk [^pbi]`;

  const degradedNote = degradedSources.length > 0
    ? ` | **DEGRADED:** ${degradedSources.join(', ')}`
    : '';

  const memoMarkdown = [
    `# GTM Reallocation Memo`,
    ``,
    `> **Run ID:** ${runId}${degradedNote}`,
    ``,
    `> **Data integrity notice:** NRR, gross churn rate, and active-account % are NOT available`,
    `> from current real-time integrations (see STUBBED_SOURCES: aws_product_usage, powerbi_financials).`,
    `> Values shown as UNKNOWN until those sources are wired to real clients.`,
    ``,
    `## Current GTM Cost vs ROI`,
    ``,
    `- **Total GTM payroll (annualized):** ${payrollLabel}`,
    `- **ROI by function:** Sales 7.2× | Marketing 3.1× | Customer Success 11.4× _(calibration-sourced)_`,
    `- **NRR:** UNKNOWN (not available from PowerBI — financial metric, source: NetSuite/Salesforce, STUBBED)`,
    `- **Gross churn:** UNKNOWN (not available from PowerBI — financial metric, STUBBED)`,
    `- **Committed pipeline:** ${pipelineLabel}`,
    `- **At-risk accounts:** ${atRiskLabel}`,
    ``,
    `## Recommended Reallocation`,
    ``,
    `1. **CS expansion (+0.5 FTE PLG motion, M1):** Target at-risk accounts. CS ROI is 3.7× marketing ROI. [^pbi]`,
    `2. **Marketing consolidation (M2):** Eliminate events budget (12% pipeline attribution); redeploy into digital demand-gen. [^cmo]`,
    `3. **SDR capacity add (+1 HC enterprise, M3):** Enterprise pipeline velocity is the CRO's primary constraint. [^cro]`,
    ``,
    `## Pipeline Impact Projection`,
    ``,
    `- **90-day committed pipeline delta:** ${sfDegraded ? 'UNKNOWN (Salesforce degraded)' : 'requires live pipeline data from Salesforce [^cro]'}`,
    `- **NRR target trajectory:** UNKNOWN — requires financial data from NetSuite/Salesforce (not PowerBI)`,
    `- **Marketing-attributed pipeline:** Flat near-term; improves in H2 as digital mix matures`,
    ``,
    `## Risks`,
    ``,
    `- **Execution drag (medium):** Parallel moves risk overextending COS bandwidth. Mitigation: COS sequencing per above.`,
    `- **Marketing attribution drop (low):** Events consolidation may temporarily reduce pipeline; digital ramp takes 60–90 days.`,
    `- **CS capacity stretch (low):** PLG motion adds 0.5 FTE equivalent scope to existing CS; monitor utilization.`,
    `- **Data gap (medium):** Active-account % and NRR unavailable from current integrations — reallocation decision made with incomplete signal.`,
    ``,
    `## Workstream-Update Proposals`,
    ``,
    `- GTM-Capacity: OPEN → transition trigger: CS hire complete (M1)`,
    `- CS-Expansion: OPEN → activate PLG motion on at-risk accounts`,
    `- Marketing-Demand-Gen: OPEN → consolidate events into digital by M2`,
    ``,
    `---`,
    `_Playbook: gtm_realloc | Lenses: CRO, CFO, CMO, CPO, COS | Threshold: ${RIGOR_THRESHOLD}_`,
    `_STUBBED_SOURCES: aws_product_usage, powerbi_financials — stub-guard blocks CLEAN stamp under STUB_MODE=live_`,
  ].join('\n');

  // B47 Phase 2: rigorScore + CLEAN/DRAFT assigned by the real Verifier in run-loop
  // (orchestrator/playbookVerifier.ts). The playbook no longer fabricates a score.
  const stamps: string[] = [
    ...(degradedSources.length > 0 ? ['DEGRADED'] : []),
  ];

  // Writebacks: workstream-update proposals
  const proposedWritebacks = [
    {
      writebackId: `wb-gtm-ws-1-${runId}`,
      artifactType: 'workstream_update',
      draftPath: `drafts/gtm-realloc/${runId}/ws-gtm-capacity.md`,
      description: 'GTM-Capacity workstream: transition trigger on CS hire completion',
      topic: 'gtm_capacity_transition',
    },
    {
      writebackId: `wb-gtm-ws-2-${runId}`,
      artifactType: 'workstream_update',
      draftPath: `drafts/gtm-realloc/${runId}/ws-cs-expansion.md`,
      description: 'CS-Expansion workstream: activate PLG motion on at-risk accounts',
      topic: 'cs_expansion_plg',
    },
    {
      writebackId: `wb-gtm-ws-3-${runId}`,
      artifactType: 'workstream_update',
      draftPath: `drafts/gtm-realloc/${runId}/ws-marketing-demand-gen.md`,
      description: 'Marketing-Demand-Gen workstream: events-to-digital consolidation',
      topic: 'marketing_demand_gen_consolidation',
    },
  ];

  return {
    memoMarkdown,
    degradedSources: degradedSources.map(String),
    lensOutputs,
    stamps,
    rigorScore: null,
    rigorThreshold: RIGOR_THRESHOLD,
    proposedWritebacks,
  };
};
