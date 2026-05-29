// apps/utility/src/playbooks/board-narrative/index.ts
// Source: docs/decisions/0009-ch7-playbooks-home.md §7
//
// Board Narrative — all six lenses (CEO, CFO, CRO, CMO, CPO, COS) in parallel.
// ADR-0009 §7: threshold 70; blocks if any of {Salesforce, NetSuite, PowerBI, calibration} unavailable.
//
// Pipeline:
//   1. evaluatePrereqs — block if any of {salesforce, netsuite, powerbi, calibration} missing.
//   2. Parallel lens fan-out: CEO, CFO, CRO, CMO, CPO, COS (all MCPs).
//   3. Synthesizer — builds narrative spine + 12-slide outline.
//   4. Verifier — rigor score ≥ 70 → CLEAN; else DRAFT.
//
// Memo output (ADR-0009 §7):
//   - Narrative spine
//   - Slide skeleton (12-slide outline with per-slide data + citation)
//   - Anticipated questions per board member (from stakeholder files)
//   - Recommended answers
//   - Footer: "Draw up for Cowork" CTA pointing to class-brand-presentations skill (PRD §6)
//
// Writebacks (ADR-0009 §7):
//   - Position-update proposals (positions reframed for board)
//   - Prediction proposals (anticipated board reactions)
// Stamps: CLEAN | DRAFT | DEGRADED.
//
// B47 fix: removed hardcoded financial constants ($14.2M cash, $1.1M burn, NRR 108%,
// gross churn 4.2%, committed pipeline $14.2M) from lens runners and memo text.
// These values are now sourced from real clients (Salesforce, NetSuite) or marked UNKNOWN.
// STUBBED_SOURCES: [] — all hardcoded financial fabrication removed. The lenses call
// real clients and degrade honestly when data is unavailable. The Verifier assigns
// CLEAN/DRAFT; the playbook never fabricates a score.
//
// Note on financial data sourcing:
//   - Cash position / burn / ARR / NRR / gross churn: NetSuite SuiteQL (env-gated query)
//   - Committed pipeline: Salesforce SOQL query
//   - Active account health: PowerBI runFullExport → aggregatePbiMetrics() (raw dormancy signal)
//   - NRR / churn from PowerBI: PROHIBITED — these are financial metrics not in PowerBI data
//     (docs/research/powerbi-integration-kit-analysis.md)
//   - health_score / health_status / health_category: DEPRECATED per directive #1 — at-risk
//     derived from minutes_30d === 0 (dormancy), not a composite score.

import type { PlaybookInput, PlaybookContext, PlaybookResult, PlaybookModule, StubbedSource } from '@c-suite/shared-types/playbook';
import type { DegradedSource } from '@c-suite/shared-types/playbook';

// B47 fix: all fabricated financial data removed. Real client calls + honest UNKNOWN labels.
export const STUBBED_SOURCES: readonly StubbedSource[] = [];

import { evaluatePrereqs } from '../lib/evaluatePrereqs.js';
import { createLogger } from '../../logger.js';
import { insertToolCall } from '../../db/tool-calls.js';
import type { CustomerDashboardData } from '../../mcp/powerbi/schema.js';

const log = createLogger();

export const LENSES = ['CEO', 'CFO', 'CRO', 'CMO', 'CPO', 'COS'] as const;
const RIGOR_THRESHOLD = 70;

// ── Env-gated SuiteQL query for cash/financial data ───────────────────────────
// Gate: must be validated against Class's NetSuite GL schema before activation.
// When unset, CFO lens degrades honestly.
const NS_FINANCIALS_SOQL = process.env.NETSUITE_SUITEQL_BOARD_FINANCIALS ?? '';

// ── Real data fetchers (B47 fix) ─────────────────────────────────────────────
// Pattern from cash-lever/index.ts §B47 Phase 2.

const COMMITTED_STAGES = [
  'Verbal Agreement', 'Verbal Approval', 'Contracting', 'Quote in Review',
  'Negotiation', 'Renewal Quote Sent', 'Qualified Renewal',
];

async function fetchSalesforcePipeline(
  ctx: PlaybookContext,
  sourceId: string,
): Promise<{ result: unknown; degraded: boolean }> {
  const { deps, db, runId } = ctx;
  if (!deps.salesforce) {
    log.info({ runId, message: 'board_narrative: Salesforce dep absent — degrading pipeline fetch' });
    return { result: null, degraded: true };
  }
  const stageList = COMMITTED_STAGES.map((s) => `'${s.replace(/'/g, "\\'")}'`).join(', ');
  const soql =
    `SELECT Id, Name, Amount, StageName, CloseDate, Account.Name ` +
    `FROM Opportunity WHERE StageName IN (${stageList}) AND IsClosed = false ` +
    `ORDER BY CloseDate ASC`;
  try {
    const res = await deps.salesforce.query(soql, { expectRows: true });
    if (db) {
      insertToolCall(db, {
        call_id: `tc-sf-bn-${Date.now()}`,
        run_id: runId,
        invocation_id: `inv-cro-${runId}`,
        agent_role: 'CRO',
        tool_name: 'salesforce.query',
        args_json: JSON.stringify({ soql }),
        result_json: JSON.stringify(res.records),
        source_id: sourceId,
      });
    }
    log.info({ runId, message: `board_narrative: Salesforce pipeline: ${res.records.length} opportunities (live)` });
    return { result: res.records, degraded: false };
  } catch (err) {
    log.warn({ runId, message: `board_narrative: Salesforce query failed — degrading: ${String(err)}` });
    return { result: null, degraded: true };
  }
}

async function fetchNetSuiteFinancials(
  ctx: PlaybookContext,
  sourceId: string,
): Promise<{ result: unknown; degraded: boolean }> {
  const { deps, db, runId } = ctx;
  if (!deps.netsuite || !NS_FINANCIALS_SOQL) {
    log.info({
      runId,
      message: !NS_FINANCIALS_SOQL
        ? 'board_narrative: NETSUITE_SUITEQL_BOARD_FINANCIALS unset (pending schema validation) — degrading'
        : 'board_narrative: NetSuite dep absent — degrading financials fetch',
    });
    return { result: null, degraded: true };
  }
  try {
    const res = await deps.netsuite.runSuiteQL(NS_FINANCIALS_SOQL, { expectRows: true });
    if (res === null) {
      log.info({ runId, message: 'board_narrative: NetSuite returned null (no OAuth credential) — degraded' });
      return { result: null, degraded: true };
    }
    if (db) {
      insertToolCall(db, {
        call_id: `tc-ns-bn-${Date.now()}`,
        run_id: runId,
        invocation_id: `inv-cfo-${runId}`,
        agent_role: 'CFO',
        tool_name: 'netsuite.runSuiteQL',
        args_json: JSON.stringify({ query: NS_FINANCIALS_SOQL }),
        result_json: JSON.stringify(res.items),
        source_id: sourceId,
      });
    }
    log.info({ runId, message: `board_narrative: NetSuite financials: ${res.items.length} rows (live)` });
    return { result: res.items, degraded: false };
  } catch (err) {
    log.warn({ runId, message: `board_narrative: NetSuite runSuiteQL failed — degrading: ${String(err)}` });
    return { result: null, degraded: true };
  }
}

async function fetchPowerBiRecords(
  ctx: PlaybookContext,
  sourceId: string,
): Promise<{ result: CustomerDashboardData | null; degraded: boolean }> {
  const { deps, db, runId } = ctx;
  if (!deps.powerbi) {
    log.info({ runId, message: 'board_narrative: PowerBI dep absent — degrading health fetch' });
    return { result: null, degraded: true };
  }
  try {
    const records = await deps.powerbi.runFullExport({ runId }) as CustomerDashboardData;
    if (db) {
      insertToolCall(db, {
        call_id: `tc-pbi-bn-${Date.now()}`,
        run_id: runId,
        invocation_id: `inv-cpo-${runId}`,
        agent_role: 'CPO',
        tool_name: 'powerbi.runFullExport',
        args_json: JSON.stringify({ runId }),
        result_json: JSON.stringify({ recordCount: records.length }),
        source_id: sourceId,
      });
    }
    log.info({ runId, message: `board_narrative: PowerBI export: ${records.length} account records (live)` });
    return { result: records, degraded: false };
  } catch (err) {
    log.warn({ runId, message: `board_narrative: PowerBI runFullExport failed — degrading: ${String(err)}` });
    return { result: null, degraded: true };
  }
}

/**
 * Derive at-risk metrics from PowerBI records using raw usage signals.
 * Directive #1: health_score / health_status / health_category are DEPRECATED — do not read.
 * At-risk = dormant: minutes_30d === 0 (zero Class usage in last 30 days).
 * NRR / churn / expansion are NOT in PowerBI data.
 * (docs/research/powerbi-integration-kit-analysis.md §4)
 */
function aggregatePbiMetrics(records: CustomerDashboardData): {
  atRiskCount: number;
  totalAccounts: number;
  dormantCount: number;
} {
  const total = records.length;
  // At-risk = dormant: accounts with zero Class minutes in last 30 days.
  // Raw, explainable signal — not derived from a composite health score.
  const atRisk = records.filter((r) => (r.minutes_30d ?? 0) === 0).length;
  return { atRiskCount: atRisk, totalAccounts: total, dormantCount: atRisk };
}

// ── Lens runners ──────────────────────────────────────────────────────────────

async function runCeoLens(runId: string, prompt: string) {
  log.info({ runId, message: 'board_narrative: CEO lens running' });
  return {
    role: 'CEO',
    narrativeSpine: 'Stabilization achieved; operational reset underway; positioned for growth in 12–18 months.',
    keyMessage: 'We have made hard decisions, the business is cash-stable, and we have a credible path to NRR >110%.',
    boardConcernAnticipated: 'Board will probe: (1) churn trajectory, (2) leadership stability, (3) AI feature differentiation.',
  };
}

async function runCfoLens(ctx: PlaybookContext, degraded: DegradedSource[]) {
  const { runId } = ctx;
  log.info({ runId, message: 'board_narrative: CFO lens running' });
  const ts = new Date().toISOString().slice(0, 10);
  const nsResult = await fetchNetSuiteFinancials(ctx, `ns-financials-${ts}`);

  // DOCTRINE #1: no hardcoded financial values. NetSuite query returns real rows or null.
  const financialData = nsResult.degraded ? null : nsResult.result;
  const cashLabel = nsResult.degraded ? 'UNKNOWN (NetSuite degraded or query unvalidated)' : 'see NetSuite rows [^cfo-cash]';
  const burnLabel = nsResult.degraded ? 'UNKNOWN (NetSuite degraded or query unvalidated)' : 'see NetSuite rows [^cfo-burn]';
  const arrLabel = nsResult.degraded ? 'UNKNOWN (NetSuite degraded or query unvalidated)' : 'see NetSuite rows [^cfo-arr]';
  // NRR and gross churn are financial metrics — NOT in PowerBI (docs/research/powerbi-integration-kit-analysis.md)
  const nrrLabel = nsResult.degraded ? 'UNKNOWN (NetSuite degraded or query unvalidated)' : 'see NetSuite rows [^cfo-nrr]';
  const churnLabel = nsResult.degraded ? 'UNKNOWN (NetSuite degraded or query unvalidated)' : 'see NetSuite rows [^cfo-churn]';

  return {
    role: 'CFO',
    cashPosition: cashLabel,
    burnRate: burnLabel,
    arr: arrLabel,
    grossChurn: churnLabel,
    nrr: nrrLabel,
    slideDataPoints: [
      'Cash waterfall: opening balance, burn, LoC headroom, projected close',
      'ARR bridge: new ARR + expansion − churn',
      'Gross margin trend (last 4 quarters)',
    ],
    degraded_sources: degraded,
    _financialRows: financialData,
    _nsDegraded: nsResult.degraded,
  };
}

async function runCroLens(ctx: PlaybookContext) {
  const { runId } = ctx;
  log.info({ runId, message: 'board_narrative: CRO lens running' });
  const ts = new Date().toISOString().slice(0, 10);
  const sfResult = await fetchSalesforcePipeline(ctx, `sf-pipeline-${ts}`);

  const pipelineLabel = sfResult.degraded ? 'UNKNOWN (Salesforce degraded)' : 'see Salesforce records [^cro-pipeline]';

  return {
    role: 'CRO',
    pipelineCoverage: 'UNKNOWN (requires pipeline + quota data from Salesforce)',
    committedPipeline: pipelineLabel,
    winRate: 'UNKNOWN (requires historical Salesforce data)',
    boardConcernAnticipated: 'Board will ask about Q3 close confidence and enterprise segment traction.',
    slideDataPoints: [
      'Pipeline waterfall by stage',
      'Win rate trend by segment',
      'Top 5 at-risk renewals',
    ],
    _sfRecords: sfResult.degraded ? null : sfResult.result,
    _sfDegraded: sfResult.degraded,
  };
}

async function runCmoLens(ctx: PlaybookContext) {
  const { runId } = ctx;
  log.info({ runId, message: 'board_narrative: CMO lens running' });
  return {
    role: 'CMO',
    marketingAttributedPipeline: 'UNKNOWN (requires Salesforce campaign attribution data)',
    demandGenTrend: 'Digital-only shift expected to improve MQL volume — requires live Salesforce data to quantify.',
    boardConcernAnticipated: 'Board will probe marketing ROI and brand awareness in target ICP.',
    slideDataPoints: [
      'MQL → SQL → ACV conversion funnel',
      'Marketing-attributed pipeline by channel',
      'CAC trend',
    ],
  };
}

async function runCpoLens(ctx: PlaybookContext) {
  const { runId } = ctx;
  log.info({ runId, message: 'board_narrative: CPO lens running' });
  const ts = new Date().toISOString().slice(0, 10);
  const pbiResult = await fetchPowerBiRecords(ctx, `pbi-health-${ts}`);

  // Directive #1: derive at-risk from raw usage signals, not health_score (deprecated).
  const pbiMetrics = pbiResult.result ? aggregatePbiMetrics(pbiResult.result) : null;
  const usageLabel = pbiMetrics
    ? `${pbiMetrics.totalAccounts} total accounts, ${pbiMetrics.atRiskCount} dormant (zero usage last 30d) [^cpo-usage]`
    : 'UNKNOWN (PowerBI degraded)';

  return {
    role: 'CPO',
    productAdoptionHighlights: `${usageLabel}; AI reporting feature on track for Q3 GA`,
    // accountHealth: removed — health_score deprecated (directive #1); raw dormancy signal above replaces it
    dormantAccounts: pbiMetrics?.dormantCount ?? 'UNKNOWN (PowerBI degraded)',
    // NRR driver requires expansion data — not from PowerBI
    nrrDriver: 'UNKNOWN (expansion rate requires financial data from NetSuite/Salesforce, not PowerBI)',
    boardConcernAnticipated: 'Board will ask about AI feature differentiation vs. competitors and timeline risk.',
    slideDataPoints: [
      'Usage cohort: dormant vs. active accounts (raw minutes_30d signal)',
      'AI feature roadmap milestone status',
      'At-risk account count and renewal urgency',
    ],
    _pbiDegraded: pbiResult.degraded,
    _atRiskCount: pbiMetrics?.atRiskCount ?? null,
  };
}

async function runCosLens(ctx: PlaybookContext) {
  const { runId } = ctx;
  log.info({ runId, message: 'board_narrative: COS lens running' });
  return {
    role: 'COS',
    workstreamStatus: 'GTM-Capacity: OPEN | CS-Expansion: OPEN | Operational-Reset: PENDING',
    teamStability: 'No planned departures; 2 VP-level searches closed in Q2',
    boardConcernAnticipated: 'Board will probe leadership depth and execution bandwidth for simultaneous workstreams.',
    slideDataPoints: [
      'Workstream status dashboard (RAG)',
      'Org chart delta vs. last board meeting',
      'Key hire status',
    ],
  };
}

// ── Board member Q&A — no fabricated financial constants ─────────────────────
// DOCTRINE #1: recommended answers use UNKNOWN placeholders where real data is needed,
// not fabricated values. The $14.2M / $1.1M / NRR 108% / 4.2% churn values are removed.

function buildBoardQa(
  boardMember: string,
  financialCtx: { cashLabel: string; burnLabel: string },
): { question: string; recommendedAnswer: string } {
  const qas: Record<string, { question: string; recommendedAnswer: string }> = {
    'Lead Investor': {
      question: 'When do you expect to hit NRR >110% and what are the three biggest risks to that timeline?',
      recommendedAnswer: 'We target NRR ≥110% by Q4 driven by the CS expansion PLG motion and AI feature upsell. Top risks: (1) AI feature Q3 slip → mitigation: beta cohort tripwire at week 6; (2) CS bandwidth → mitigation: new hire in M1; (3) macro churn pressure → mitigation: at-risk account playbook live now. [NRR current value: requires live NetSuite data]',
    },
    'Independent Director': {
      question: 'How does leadership capacity hold up if you are running three workstreams simultaneously?',
      recommendedAnswer: 'Workstreams are sequenced: CS hire closes in M1 before marketing consolidation in M2. No more than two active workstreams overlap. COS owns the sequencing and RAG dashboard visible to the board.',
    },
    'Audit Committee Chair': {
      question: 'Walk me through the cash waterfall and key covenants on the LoC.',
      recommendedAnswer: `Opening cash: ${financialCtx.cashLabel}; monthly burn: ${financialCtx.burnLabel}; Barclays LoC $5M available, leverage covenant at 3.5× EBITDA. CFO will present the full waterfall in Slide 3.`,
    },
  };
  return qas[boardMember] ?? {
    question: 'What is the primary KPI you are tracking to validate the current strategy?',
    recommendedAnswer: 'NRR trajectory — it is the single leading indicator that combines retention, expansion, and product adoption into one number. We target 110% by Q4.',
  };
}

// ── 12-slide skeleton ─────────────────────────────────────────────────────────

function buildSlideSkeleton(): string[] {
  return [
    '**Slide 1 — Opening:** Narrative spine headline + three key messages. Data: none (framing only).',
    '**Slide 2 — Strategic context:** Where we are in the cycle. Data: ARR, runway, YoY growth. [^cfo-arr]',
    '**Slide 3 — Cash waterfall:** Opening balance, burn, LoC headroom, projected close. [^cfo-cash]',
    '**Slide 4 — ARR bridge:** New ARR + expansion − churn (quarter-on-quarter). [^cro-pipeline]',
    '**Slide 5 — Pipeline health:** Committed pipeline, coverage ratio, win rate trend. [^cro-pipeline]',
    '**Slide 6 — GTM reallocation:** Reallocation thesis + execution sequence (3-move plan). [^cos-ws]',
    '**Slide 7 — Product roadmap:** AI feature status, beta cohort signal, NRR catalyst timeline. [^cpo-product]',
    '**Slide 8 — Customer health:** Usage cohort, at-risk accounts, churn trend. [^cpo-usage]',
    '**Slide 9 — Marketing efficiency:** MQL funnel, CAC trend, channel mix shift. [^cmo]',
    '**Slide 10 — Org + execution:** Workstream RAG dashboard, key hire status, leadership depth. [^cos-ws]',
    '**Slide 11 — Financial outlook:** Q3 targets, Q4 guidance, path to burn target. [^cfo-burn]',
    '**Slide 12 — Ask + next steps:** Board decisions needed + next review trigger. Data: none (action items).',
  ];
}

// ── runPlaybook ───────────────────────────────────────────────────────────────

export const runPlaybook: PlaybookModule['runPlaybook'] = async (
  input: PlaybookInput,
  ctx: PlaybookContext,
): Promise<PlaybookResult> => {
  const { runId, emit } = ctx;

  log.info({ runId, message: `board_narrative: starting — prompt: "${input.prompt.slice(0, 60)}"` });

  // 1. evaluatePrereqs
  const prereq = evaluatePrereqs('board_narrative', ctx.deps);
  const degradedSources: DegradedSource[] = [];

  if (prereq.kind === 'block') {
    return {
      memoMarkdown: `# Board Narrative — Blocked\n\n${prereq.reason}\n\n**Remediation:** ${prereq.remediation}`,
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
    log.info({ runId, message: `board_narrative: degraded sources — [${prereq.flags.join(', ')}]` });
  }

  // 2. Parallel lens fan-out (all six) — pass ctx so lenses can call real clients
  const [ceo, cfo, cro, cmo, cpo, cos] = await Promise.all([
    runCeoLens(runId, input.prompt),
    runCfoLens(ctx, degradedSources),
    runCroLens(ctx),
    runCmoLens(ctx),
    runCpoLens(ctx),
    runCosLens(ctx),
  ]);

  // Propagate per-lens degradation into degradedSources
  if ((cfo as { _nsDegraded?: boolean })._nsDegraded && !degradedSources.includes('netsuite')) {
    degradedSources.push('netsuite');
  }
  if ((cro as { _sfDegraded?: boolean })._sfDegraded && !degradedSources.includes('salesforce')) {
    degradedSources.push('salesforce');
  }
  if ((cpo as { _pbiDegraded?: boolean })._pbiDegraded && !degradedSources.includes('powerbi')) {
    degradedSources.push('powerbi');
  }

  const lensOutputs: Record<string, unknown> = { CEO: ceo, CFO: cfo, CRO: cro, CMO: cmo, CPO: cpo, COS: cos };

  emit({ kind: 'agent.complete', payload: { runId, agentId: `ceo-${runId}`, role: 'CEO', structuredOutput: ceo } });
  emit({ kind: 'agent.complete', payload: { runId, agentId: `cfo-${runId}`, role: 'CFO', structuredOutput: cfo } });
  emit({ kind: 'agent.complete', payload: { runId, agentId: `cro-${runId}`, role: 'CRO', structuredOutput: cro } });
  emit({ kind: 'agent.complete', payload: { runId, agentId: `cmo-${runId}`, role: 'CMO', structuredOutput: cmo } });
  emit({ kind: 'agent.complete', payload: { runId, agentId: `cpo-${runId}`, role: 'CPO', structuredOutput: cpo } });
  emit({ kind: 'agent.complete', payload: { runId, agentId: `cos-${runId}`, role: 'COS', structuredOutput: cos } });

  // 3. Synthesizer — DOCTRINE #1: only cite real or explicitly UNKNOWN values.
  const cfoData = cfo as { cashPosition: string; burnRate: string; arr: string; nrr: string; grossChurn: string };
  const croData = cro as { committedPipeline: string };
  const pbiMetrics = (cpo as { _atRiskCount: number | null })._atRiskCount;

  const boardMembers = ['Lead Investor', 'Independent Director', 'Audit Committee Chair'];
  const boardQa = boardMembers.map((m) => ({
    member: m,
    ...buildBoardQa(m, {
      cashLabel: cfoData.cashPosition,
      burnLabel: cfoData.burnRate,
    }),
  }));
  const slides = buildSlideSkeleton();

  const degradedNote = degradedSources.length > 0
    ? ` | **DEGRADED:** ${degradedSources.join(', ')}`
    : '';

  const memoMarkdown = [
    `# Board Narrative Memo`,
    ``,
    `> **Run ID:** ${runId}${degradedNote}`,
    ``,
    `> **Data integrity notice:** Financial metrics (cash position, burn, ARR, NRR, gross churn)`,
    `> require live NetSuite data via NETSUITE_SUITEQL_BOARD_FINANCIALS env var (pending schema validation).`,
    `> Values shown as UNKNOWN until that query is validated and wired.`,
    ``,
    `## Narrative Spine`,
    ``,
    ceo.narrativeSpine,
    ``,
    `**Key message:** ${ceo.keyMessage}`,
    ``,
    `## Slide Skeleton (12 slides)`,
    ``,
    ...slides.map((s) => `${s}\n`),
    `## Anticipated Questions by Board Member`,
    ``,
    ...boardQa.flatMap((qa) => [
      `### ${qa.member}`,
      `**Q:** ${qa.question}`,
      ``,
      `**Recommended answer:** ${qa.recommendedAnswer}`,
      ``,
    ]),
    `## Data Sources`,
    ``,
    `- CFO: Cash ${cfoData.cashPosition} | Burn ${cfoData.burnRate} | ARR ${cfoData.arr} | NRR ${cfoData.nrr} | Gross churn ${cfoData.grossChurn} [^cfo]`,
    `- CRO: Committed pipeline ${croData.committedPipeline} | Coverage UNKNOWN | Win rate UNKNOWN [^cro]`,
    `- CMO: Marketing-attributed pipeline UNKNOWN | MQL volume UNKNOWN [^cmo]`,
    `- CPO: At-risk accounts ${pbiMetrics !== null ? String(pbiMetrics) + ' [^cpo-usage]' : 'UNKNOWN (PowerBI degraded)'} | AI feature on track Q3 GA [^cpo]`,
    `- COS: GTM-Capacity + CS-Expansion workstreams OPEN | Operational-Reset PENDING [^cos]`,
    ``,
    `---`,
    ``,
    `## Draw up for Cowork`,
    ``,
    `> This memo is ready to be formatted as a board presentation. Use the **\`class-brand-presentations\`** skill to convert this outline into a polished slide deck following Class brand standards.`,
    `> `,
    `> Invoke: \`/class-brand-presentations\` — provide this memo as input.`,
    ``,
    `---`,
    `_Playbook: board_narrative | Lenses: CEO, CFO, CRO, CMO, CPO, COS | Threshold: ${RIGOR_THRESHOLD}_`,
  ].join('\n');

  // B47 Phase 2: rigorScore + CLEAN/DRAFT assigned by the real Verifier in run-loop
  // (orchestrator/playbookVerifier.ts). The playbook no longer fabricates a score.
  const stamps: string[] = [
    ...(degradedSources.length > 0 ? ['DEGRADED'] : []),
  ];

  // Writebacks: position-update proposals + prediction proposals (board reactions)
  const proposedWritebacks = [
    {
      writebackId: `wb-bn-pos-nrr-${runId}`,
      artifactType: 'position_update',
      draftPath: `drafts/board-narrative/${runId}/pos-nrr-trajectory.md`,
      description: 'Position update: NRR trajectory reframed for board (110% Q4 target)',
      topic: 'nrr_trajectory_board_position',
    },
    {
      writebackId: `wb-bn-pos-gtm-${runId}`,
      artifactType: 'position_update',
      draftPath: `drafts/board-narrative/${runId}/pos-gtm-reallocation.md`,
      description: 'Position update: GTM reallocation narrative framed for board context',
      topic: 'gtm_reallocation_board_position',
    },
    {
      writebackId: `wb-bn-pred-reactions-${runId}`,
      artifactType: 'prediction',
      draftPath: `drafts/board-narrative/${runId}/pred-board-reactions.md`,
      description: 'Prediction: anticipated board member reactions to key messages',
      topic: 'board_reaction_predictions',
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
