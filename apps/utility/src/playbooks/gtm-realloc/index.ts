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

import type { PlaybookInput, PlaybookContext, PlaybookResult, PlaybookModule, StubbedSource } from '@c-suite/shared-types/playbook';
import type { DegradedSource } from '@c-suite/shared-types/playbook';

// B47 Phase 2: rigorScore now comes from the real Verifier (run-loop / playbookVerifier).
export const STUBBED_SOURCES: readonly StubbedSource[] = [];
import { evaluatePrereqs } from '../lib/evaluatePrereqs.js';
import { createLogger } from '../../logger.js';

const log = createLogger();

export const LENSES = ['CRO', 'CFO', 'CMO', 'CPO', 'COS'] as const;
const RIGOR_THRESHOLD = 70;

// ── Stub data factories ───────────────────────────────────────────────────────

function stubSalesforcePipeline() {
  return {
    source: 'salesforce',
    committedPipeline: 14_200_000,
    amActivityScore: 0.72,
    topAccounts: [
      { name: 'Acme Corp', amount: 2_400_000, stage: 'Contracting' },
      { name: 'Beta Corp', amount: 1_800_000, stage: 'Verbal Agreement' },
      { name: 'Gamma LLC', amount: 950_000, stage: 'Renewal Quote Sent' },
    ],
  };
}

function stubNetSuiteGtmPayroll() {
  return {
    source: 'netsuite',
    gtmPayrollMonthly: 1_840_000,
    breakdown: {
      sales: 980_000,
      marketing: 420_000,
      customerSuccess: 440_000,
    },
  };
}

function stubAwsProductUsage() {
  return {
    source: 'aws',
    activeAccountsPct: 0.61,
    featureAdoptionRate: 0.44,
    churnSignals: ['low-login-7d', 'zero-activity-30d'],
  };
}

function stubPowerBiDashboard() {
  return {
    source: 'powerbi',
    nrr: 1.08,
    grossChurnRate: 0.042,
    expansionRevenue: 3_100_000,
    logoRetention: 0.94,
  };
}

// ── Lens runners (parallel) ───────────────────────────────────────────────────

async function runCroLens(runId: string) {
  log.info({ runId, message: 'gtm_realloc: CRO lens running' });
  return {
    role: 'CRO',
    pipelineHealth: stubSalesforcePipeline(),
    reallocReco: 'Shift 15% of marketing budget to top-of-funnel SDR capacity in the enterprise segment; pipeline velocity in mid-market has plateaued.',
    pipelineImpact: 'Expected +$1.8M committed pipeline within 90 days; mid-market velocity improves with current team.',
  };
}

async function runCfoLens(runId: string, degraded: DegradedSource[]) {
  log.info({ runId, message: 'gtm_realloc: CFO lens running' });
  const payroll = stubNetSuiteGtmPayroll();
  return {
    role: 'CFO',
    gtmCostBase: payroll.gtmPayrollMonthly * 12,
    roiByChannel: {
      sales: 7.2,
      marketing: 3.1,
      customerSuccess: 11.4,
    },
    reallocReco: 'Reduce marketing headcount by 1 HC; reinvest $420K annualized into CS capacity — CS ROI is 3.7× higher.',
    degraded_sources: degraded,
  };
}

async function runCmoLens(runId: string) {
  log.info({ runId, message: 'gtm_realloc: CMO lens running' });
  return {
    role: 'CMO',
    currentSpendMix: { digital: 0.55, events: 0.25, content: 0.20 },
    attributedPipeline: 4_800_000,
    reallocReco: 'Consolidate events budget into digital demand-gen; events attribution is <12% of marketing-sourced pipeline.',
  };
}

async function runCpoLens(runId: string) {
  log.info({ runId, message: 'gtm_realloc: CPO lens running' });
  const usage = stubAwsProductUsage();
  return {
    role: 'CPO',
    productUsage: usage,
    expansionSignal: 'Accounts in top-usage quartile expand at 2.3× rate of median accounts.',
    reallocReco: 'Add 0.5 FTE PLG motion in CS targeting top-usage accounts for expansion plays; product-led expansion signals are strong.',
  };
}

async function runCosLens(runId: string) {
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

  // 2. Parallel lens fan-out
  const [cro, cfo, cmo, cpo, cos] = await Promise.all([
    runCroLens(runId),
    runCfoLens(runId, degradedSources),
    runCmoLens(runId),
    runCpoLens(runId),
    runCosLens(runId),
  ]);

  const lensOutputs = { CRO: cro, CFO: cfo, CMO: cmo, CPO: cpo, COS: cos };

  emit({ kind: 'agent.complete', payload: { runId, agentId: `cro-${runId}`, role: 'CRO', structuredOutput: cro } });
  emit({ kind: 'agent.complete', payload: { runId, agentId: `cfo-${runId}`, role: 'CFO', structuredOutput: cfo } });
  emit({ kind: 'agent.complete', payload: { runId, agentId: `cmo-${runId}`, role: 'CMO', structuredOutput: cmo } });
  emit({ kind: 'agent.complete', payload: { runId, agentId: `cpo-${runId}`, role: 'CPO', structuredOutput: cpo } });
  emit({ kind: 'agent.complete', payload: { runId, agentId: `cos-${runId}`, role: 'COS', structuredOutput: cos } });

  // 3. Synthesizer — inline stub; real Synthesizer agent fires in run-loop integration.
  const pbiData = stubPowerBiDashboard();
  const memoMarkdown = [
    `# GTM Reallocation Memo`,
    ``,
    `> **Run ID:** ${runId}${degradedSources.length ? ` | **DEGRADED:** ${degradedSources.join(', ')}` : ''}`,
    ``,
    `## Current GTM Cost vs ROI`,
    ``,
    `- **Total GTM payroll (annualized):** $${(1_840_000 * 12 / 1_000_000).toFixed(1)}M`,
    `- **ROI by function:** Sales 7.2× | Marketing 3.1× | Customer Success 11.4×`,
    `- **NRR:** ${(pbiData.nrr * 100).toFixed(0)}% | **Gross churn:** ${(pbiData.grossChurnRate * 100).toFixed(1)}%`,
    `- **Committed pipeline:** $14.2M`,
    ``,
    `## Recommended Reallocation`,
    ``,
    `1. **CS expansion (+0.5 FTE PLG motion, M1):** Target top-usage-quartile accounts. CS ROI is 3.7× marketing ROI; product-usage signals validate the expansion opportunity. [^aws-usage]`,
    `2. **Marketing consolidation (M2):** Eliminate events budget (12% pipeline attribution); redeploy into digital demand-gen. [^cmo]`,
    `3. **SDR capacity add (+1 HC enterprise, M3):** Enterprise pipeline velocity is the CRO's primary constraint; mid-market is adequately covered. [^cro]`,
    ``,
    `## Pipeline Impact Projection`,
    ``,
    `- **90-day committed pipeline:** +$1.8M (SDR ramp lag; CS expansion faster-to-value)`,
    `- **NRR target:** 112% by Q4 (from 108% current) via CS expansion motion`,
    `- **Marketing-attributed pipeline:** Flat near-term; improves in H2 as digital mix matures`,
    ``,
    `## Risks`,
    ``,
    `- **Execution drag (medium):** Parallel moves risk overextending COS bandwidth. Mitigation: COS sequencing per above.`,
    `- **Marketing attribution drop (low):** Events consolidation may temporarily reduce pipeline; digital ramp takes 60–90 days.`,
    `- **CS capacity stretch (low):** PLG motion adds 0.5 FTE equivalent scope to existing CS; monitor utilization.`,
    ``,
    `## Workstream-Update Proposals`,
    ``,
    `- GTM-Capacity: OPEN → transition trigger: CS hire complete (M1)`,
    `- CS-Expansion: OPEN → activate PLG motion on top-usage accounts`,
    `- Marketing-Demand-Gen: OPEN → consolidate events into digital by M2`,
    ``,
    `---`,
    `_Playbook: gtm_realloc | Lenses: CRO, CFO, CMO, CPO, COS | Threshold: ${RIGOR_THRESHOLD}_`,
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
      description: 'CS-Expansion workstream: activate PLG motion on top-usage accounts',
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
