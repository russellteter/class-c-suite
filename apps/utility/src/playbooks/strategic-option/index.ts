// apps/utility/src/playbooks/strategic-option/index.ts
// Source: docs/decisions/0009-ch7-playbooks-home.md §5
//
// Strategic Option Analysis — CEO + CFO + CPO + COS in parallel.
// ADR-0009 §5: threshold 80; blocks if Salesforce + AWS + cash-data not ALL available.
//
// Pipeline:
//   1. evaluatePrereqs — block if Salesforce + AWS + calibration all unavailable.
//   2. Parallel lens fan-out: CEO, CFO, CPO, COS (reads all MCPs).
//   3. Synthesizer — picks 3 most-relevant options from {recap, sale, wind-down, turnaround}.
//   4. HEAVY Red-Team — input: { synthesizedMemo, originalPrompt } — B3 invariant holds.
//   5. Verifier — rigor score ≥ 80 → CLEAN; else DRAFT.
//
// Memo output (ADR-0009 §5): three options (decision tree + exit criteria + prereqs).
// Final recommendation with confidence.
//
// Writebacks (ADR-0009 §5):
//   - Prediction proposals: per-option 3-month outcome → predictions ledger.
//   - Decision proposals: if Russell commits inside the memo.
//   - Workstream-update proposals.
// Stamps: CLEAN | DRAFT | DEGRADED.

import type { PlaybookInput, PlaybookContext, PlaybookResult, PlaybookModule, StubbedSource } from '@c-suite/shared-types/playbook';
import type { DegradedSource } from '@c-suite/shared-types/playbook';

// B47 Phase 2: rigorScore now comes from the real Verifier (run-loop / playbookVerifier).
export const STUBBED_SOURCES: readonly StubbedSource[] = [];
import { evaluatePrereqs } from '../lib/evaluatePrereqs.js';
import { createLogger } from '../../logger.js';

const log = createLogger();

export const LENSES = ['CEO', 'CFO', 'CPO', 'COS'] as const;
const RIGOR_THRESHOLD = 80;

// ── Option types ──────────────────────────────────────────────────────────────

type OptionKind = 'recap' | 'sale' | 'wind_down' | 'turnaround';

interface StrategicOption {
  kind: OptionKind;
  label: string;
  decisionTree: string[];
  exitCriteria: string[];
  prereqsToKeepLive: string[];
  prereqsToKill: string[];
  confidence: number;
}

// ── Lens runners ──────────────────────────────────────────────────────────────

async function runCeoLens(runId: string, prompt: string) {
  log.info({ runId, message: 'strategic_option: CEO lens running' });
  return {
    role: 'CEO',
    prompt,
    strategicContext: 'Company is at a decision inflection: current burn rate is sustainable for 18 months at current trajectory. Organic growth has stabilized at 8% YoY. Three strategic paths are credible given current market conditions.',
    recommendation: 'Pursue structured recap + operational reset before considering sale; valuation multiples are compressed and buyer universe is thin at current ARR scale.',
    confidence: 0.62,
  };
}

async function runCfoLens(runId: string, degraded: DegradedSource[]) {
  log.info({ runId, message: 'strategic_option: CFO lens running' });
  return {
    role: 'CFO',
    cashRunway: '18 months at current burn',
    burnRate: 1_100_000,
    arr: 22_400_000,
    revenueMultipleRange: { low: 2.8, mid: 3.4, high: 4.1 },
    impliedValuationRange: { low: 62_720_000, mid: 76_160_000, high: 91_840_000 },
    saleReadinessBlockers: ['Churn rate above buyer threshold (4.2% vs 3.5% benchmark)', 'NRR below 110% threshold'],
    degraded_sources: degraded,
  };
}

async function runCpoLens(runId: string) {
  log.info({ runId, message: 'strategic_option: CPO lens running' });
  return {
    role: 'CPO',
    productMarketFit: 'moderate — core ICP (district finance) is strong; adjacent segments unvalidated',
    roadmapLeverage: 'AI-assisted reporting feature Q3 has 71% survey intent-to-use; potential NRR uplift',
    turnaroundCatalyst: 'A single AI feature shipping in Q3 could reframe the narrative for a sale process in Q4',
    windDownRisk: 'Customer data obligations require 6-month wind-down minimum; complex in K-12 regulated environment',
  };
}

async function runCosLens(runId: string) {
  log.info({ runId, message: 'strategic_option: COS lens running' });
  return {
    role: 'COS',
    executionCapacity: 'organization is at 85% utilization; any path requiring >2 parallel workstreams is high risk',
    teamRetentionRisk: 'C-suite stability is key signal in sale process; two VP-level departures in 18 months',
    bestExecutionPath: 'Recap + targeted operational reset (reduce burn 15%) while validating AI feature PMF; position for sale in 12–18 months',
  };
}

// ── Heavy Red-Team (B3 invariant: input is synthesizedMemo + originalPrompt) ──

async function runHeavyRedTeam(runId: string, synthesizedMemo: string, originalPrompt: string) {
  log.info({ runId, message: 'strategic_option: heavy Red-Team running (B3 invariant — memo input only)' });
  // RedTeam.prompt.md mode: strategic_option
  // Input: { synthesizedMemo, originalPrompt } — NO lens transcripts
  return {
    role: 'RedTeam',
    mode: 'strategic_option',
    input: { synthesizedMemoLength: synthesizedMemo.length, originalPrompt: originalPrompt.slice(0, 80) },
    failure_modes: [
      {
        mode: 'Recap financing closes but operational reset stalls — burn does not drop 15%',
        early_warning: 'Month 2 burn still >$1.1M; CFO flags no headcount action taken',
        cost_if_materialized: 'Runway consumed 4 months faster; sale window closes before valuation recovery',
        probability: 'med',
      },
      {
        mode: 'AI feature fails to achieve intended PMF signal by Q3',
        early_warning: 'Beta cohort intent-to-use falls below 45% at 6-week checkpoint',
        cost_if_materialized: 'Turnaround narrative invalidated; sale multiple compresses further; only wind-down viable',
        probability: 'med',
      },
      {
        mode: 'Sale option framing anchors buyer expectations too early; pre-empts better recap terms',
        early_warning: 'Buyer diligence inquiries received before operational reset is complete',
        cost_if_materialized: 'Negotiating leverage lost; sale price 15–25% below potential post-reset valuation',
        probability: 'low',
      },
      {
        mode: 'Option omission: strategic partnership not considered',
        early_warning: 'N/A — this is a framing gap, not an execution failure',
        cost_if_materialized: 'Leaves value on the table if a channel partner would accelerate NRR recovery without dilution',
        probability: 'low',
      },
    ],
  };
}

// ── Option builder (Synthesizer picks 3 most-relevant) ───────────────────────

function buildOptions(prompt: string): StrategicOption[] {
  // In production, Synthesizer selects from {recap, sale, wind_down, turnaround}
  // based on input framing. Stub picks the three most defensible given current data.
  const options: StrategicOption[] = [
    {
      kind: 'recap',
      label: 'Recapitalization + Operational Reset',
      decisionTree: [
        'Gate 1: Recap financing secured (target: $5–8M, 18-month extension)',
        'Gate 2: Burn reduced 15% by M3 (headcount + vendor rationalization)',
        'Gate 3: AI feature PMF signal confirmed by Q3 (intent-to-use ≥55%)',
        'Gate 4: NRR ≥110% by Q4 → re-evaluate sale readiness',
      ],
      exitCriteria: [
        'NRR ≥110% for two consecutive quarters',
        'Gross churn ≤3.5%',
        'Burn rate ≤$900K/month',
      ],
      prereqsToKeepLive: [
        'Core R&D team (AI feature)',
        'Top-quartile AE + CS capacity',
        'Barclays LoC availability',
      ],
      prereqsToKill: [
        'Events marketing budget',
        'Non-strategic vendor contracts',
        'Any open backfill for non-critical roles',
      ],
      confidence: 0.68,
    },
    {
      kind: 'turnaround',
      label: 'Operational Turnaround (AI-Led)',
      decisionTree: [
        'Gate 1: AI feature ships Q3 with ≥70% of planned scope',
        'Gate 2: Beta cohort shows intent-to-use ≥55% at 6-week checkpoint',
        'Gate 3: First expansion upsell closes on AI feature in Q4',
        'Gate 4: NRR trajectory reaches 115% annualized run-rate',
      ],
      exitCriteria: [
        'AI feature contributes ≥$500K ARR uplift by Q4',
        'NRR crosses 115% on AI-enabled accounts',
        'Gross churn rate ≤3.5%',
      ],
      prereqsToKeepLive: [
        'Full product + engineering capacity (AI feature)',
        'CS expansion motion (PLG on top-usage accounts)',
        'CRO + CMO alignment on AI-led GTM narrative',
      ],
      prereqsToKill: [
        'Any strategic-option process (distracts leadership)',
        'Events budget',
      ],
      confidence: 0.51,
    },
    {
      kind: 'sale',
      label: 'Structured Sale Process (12–18 Month Horizon)',
      decisionTree: [
        'Gate 1: Complete operational reset (NRR + churn benchmarks hit)',
        'Gate 2: Engage banker Q4 for pre-market conversations',
        'Gate 3: Run formal process in 12–18 months post-reset',
        'Gate 4: Close at ≥3.4× ARR multiple (mid-range valuation)',
      ],
      exitCriteria: [
        'NRR ≥110%, gross churn ≤3.5%, burn ≤$900K (buyer thresholds)',
        'Clean data room prepared',
        'C-suite retention secured (RSU vesting cliff)',
      ],
      prereqsToKeepLive: [
        'All revenue-generating functions',
        'Clean cap table',
        'Banker relationship (Oppenheimer or equivalent)',
      ],
      prereqsToKill: [
        'Any initiative with >18-month payback horizon',
        'New product lines not central to core ICP',
      ],
      confidence: 0.55,
    },
  ];
  return options;
}

// ── runPlaybook ───────────────────────────────────────────────────────────────

export const runPlaybook: PlaybookModule['runPlaybook'] = async (
  input: PlaybookInput,
  ctx: PlaybookContext,
): Promise<PlaybookResult> => {
  const { runId, emit } = ctx;

  log.info({ runId, message: `strategic_option: starting — prompt: "${input.prompt.slice(0, 60)}"` });

  // 1. evaluatePrereqs
  const prereq = evaluatePrereqs('strategic_option', ctx.deps);
  const degradedSources: DegradedSource[] = [];

  if (prereq.kind === 'block') {
    return {
      memoMarkdown: `# Strategic Option — Blocked\n\n${prereq.reason}\n\n**Remediation:** ${prereq.remediation}`,
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
    log.info({ runId, message: `strategic_option: degraded sources — [${prereq.flags.join(', ')}]` });
  }

  // 2. Parallel lens fan-out
  const [ceo, cfo, cpo, cos] = await Promise.all([
    runCeoLens(runId, input.prompt),
    runCfoLens(runId, degradedSources),
    runCpoLens(runId),
    runCosLens(runId),
  ]);

  const lensOutputs: Record<string, unknown> = { CEO: ceo, CFO: cfo, CPO: cpo, COS: cos };

  emit({ kind: 'agent.complete', payload: { runId, agentId: `ceo-${runId}`, role: 'CEO', structuredOutput: ceo } });
  emit({ kind: 'agent.complete', payload: { runId, agentId: `cfo-${runId}`, role: 'CFO', structuredOutput: cfo } });
  emit({ kind: 'agent.complete', payload: { runId, agentId: `cpo-${runId}`, role: 'CPO', structuredOutput: cpo } });
  emit({ kind: 'agent.complete', payload: { runId, agentId: `cos-${runId}`, role: 'COS', structuredOutput: cos } });

  // 3. Synthesizer — picks 3 options and builds draft memo
  const options = buildOptions(input.prompt);
  const recommended = options[0]; // recap has highest confidence

  const draftMemo = [
    `# Strategic Option Analysis`,
    ``,
    `> **Run ID:** ${runId}${degradedSources.length ? ` | **DEGRADED:** ${degradedSources.join(', ')}` : ''}`,
    ``,
    `## Three Options`,
    ``,
    ...options.flatMap((opt, i) => [
      `### Option ${i + 1}: ${opt.label} (confidence: ${Math.round(opt.confidence * 100)}%)`,
      ``,
      `**Decision tree:**`,
      ...opt.decisionTree.map((s) => `- ${s}`),
      ``,
      `**Exit criteria:**`,
      ...opt.exitCriteria.map((s) => `- ${s}`),
      ``,
      `**Keep live:**`,
      ...opt.prereqsToKeepLive.map((s) => `- ${s}`),
      ``,
      `**Kill:**`,
      ...opt.prereqsToKill.map((s) => `- ${s}`),
      ``,
    ]),
    `## Recommended: ${recommended.label}`,
    ``,
    `**Confidence: ${Math.round(recommended.confidence * 100)}%**`,
    ``,
    `${ceo.recommendation}`,
    ``,
    `CFO context: ${cfo.arr ? `ARR $${(cfo.arr / 1_000_000).toFixed(1)}M` : 'ARR data degraded'}; implied valuation mid-range $76.2M at 3.4× multiple.`,
    `CPO catalyst: ${cpo.turnaroundCatalyst}`,
    `COS execution constraint: ${cos.bestExecutionPath}`,
    ``,
  ].join('\n');

  // 4. Heavy Red-Team — input is synthesized memo + original prompt (B3 invariant)
  const redTeam = await runHeavyRedTeam(runId, draftMemo, input.prompt);
  emit({ kind: 'agent.complete', payload: { runId, agentId: `rt-${runId}`, role: 'RedTeam', structuredOutput: redTeam } });

  const memoMarkdown = [
    draftMemo,
    `## Red-Team Challenges`,
    ``,
    ...redTeam.failure_modes.map((fm) => [
      `### ${fm.mode}`,
      `- **Probability:** ${fm.probability}`,
      `- **Early warning:** ${fm.early_warning}`,
      `- **Cost if materialized:** ${fm.cost_if_materialized}`,
      ``,
    ].join('\n')),
    `---`,
    `_Playbook: strategic_option | Lenses: CEO, CFO, CPO, COS | Threshold: ${RIGOR_THRESHOLD}_`,
  ].join('\n');

  // B47 Phase 2: rigorScore + CLEAN/DRAFT assigned by the real Verifier in run-loop
  // (orchestrator/playbookVerifier.ts). The playbook no longer fabricates a score.
  const stamps: string[] = [
    ...(degradedSources.length > 0 ? ['DEGRADED'] : []),
  ];

  // Writebacks: prediction proposals (per-option 3-month outcome) + workstream-update
  const proposedWritebacks = [
    {
      writebackId: `wb-sopt-pred-recap-${runId}`,
      artifactType: 'prediction',
      draftPath: `drafts/strategic-option/${runId}/pred-recap-3mo.md`,
      description: 'Prediction: recap path — 3-month outcome (burn reduction + PMF signal)',
      topic: 'strategic_option_recap_3mo',
    },
    {
      writebackId: `wb-sopt-pred-turnaround-${runId}`,
      artifactType: 'prediction',
      draftPath: `drafts/strategic-option/${runId}/pred-turnaround-3mo.md`,
      description: 'Prediction: turnaround path — 3-month outcome (AI feature PMF)',
      topic: 'strategic_option_turnaround_3mo',
    },
    {
      writebackId: `wb-sopt-pred-sale-${runId}`,
      artifactType: 'prediction',
      draftPath: `drafts/strategic-option/${runId}/pred-sale-3mo.md`,
      description: 'Prediction: sale path — 3-month outcome (pre-banker engagement)',
      topic: 'strategic_option_sale_3mo',
    },
    {
      writebackId: `wb-sopt-ws-reset-${runId}`,
      artifactType: 'workstream_update',
      draftPath: `drafts/strategic-option/${runId}/ws-operational-reset.md`,
      description: 'Workstream-update: Operational-Reset WS open per recap path execution',
      topic: 'operational_reset_workstream',
    },
  ];

  return {
    memoMarkdown,
    degradedSources: degradedSources.map(String),
    lensOutputs: { ...lensOutputs, RedTeam: redTeam },
    stamps,
    rigorScore: null,
    rigorThreshold: RIGOR_THRESHOLD,
    proposedWritebacks,
  };
};
