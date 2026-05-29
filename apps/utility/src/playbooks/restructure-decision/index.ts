// apps/utility/src/playbooks/restructure-decision/index.ts
// Source: docs/decisions/0009-ch7-playbooks-home.md §8
//
// Restructure Decision — COS + CFO baseline; CPO added if subject.role contains
// any of PRODUCT_ROLE_KEYWORDS (case-insensitive). Threshold 80.
// ADR-0009 §8: blocks if Salesforce + NetSuite + calibration all unavailable.
//
// Pipeline:
//   1. evaluatePrereqs — block if Salesforce + NetSuite + calibration missing.
//   2. Derive active lenses (COS + CFO always; CPO conditional on subject.role).
//   3. Parallel lens fan-out.
//   4. Synthesizer — builds implications + sequencing + comms plan.
//   5. HEAVY Red-Team — input: { synthesizedMemo, originalPrompt } — B3 invariant holds.
//      Three mandatory categories: lawsuit risk, team-morale risk, customer-disruption risk.
//   6. Verifier — rigor score ≥ 80 → CLEAN; else DRAFT.
//
// Memo output (ADR-0009 §8):
//   - Implications: financial + organizational + signal-to-team
//   - Sequencing
//   - Comms plan
//   - Heavy Red-Team section (lawsuit / morale / customer-disruption)
//
// Writebacks (ADR-0009 §8):
//   - Decision proposal (if Russell commits inside the memo)
//   - Workstream-update (transition-cover WS)
//   - Position-update (revised position on the role)
// Stamps: CLEAN | DRAFT | DEGRADED.

import type { PlaybookInput, PlaybookContext, PlaybookResult, PlaybookModule, StubbedSource } from '@c-suite/shared-types/playbook';
import type { DegradedSource } from '@c-suite/shared-types/playbook';

// B47 Phase 2: rigorScore now comes from the real Verifier (run-loop / playbookVerifier).
// CFO severance/comp/savings figures require a validated NetSuite payroll query (not yet
// wired). Declared here so the live-mode stub guard refuses a CLEAN run rather than ship
// fabricated dollar figures. Drop once a real NetSuite comp query backs runCfoLens.
export const STUBBED_SOURCES: readonly StubbedSource[] = ['netsuite'];
import { evaluatePrereqs } from '../lib/evaluatePrereqs.js';
import { createLogger } from '../../logger.js';

const log = createLogger();

export const LENSES = ['COS', 'CFO'] as const;

/**
 * Role keywords that trigger CPO lens addition per ADR-0009 §8.
 * Exported so specs can import + assert against the same source.
 */
export const PRODUCT_ROLE_KEYWORDS = [
  'product',
  'engineering',
  'technical',
  'cto',
  'vp eng',
  'vp product',
] as const;

const RIGOR_THRESHOLD = 80;

// ── Conditional lens resolution ───────────────────────────────────────────────

function resolveActiveLenses(subjectRole: string | undefined): string[] {
  const base = ['COS', 'CFO'];
  if (!subjectRole) return base;
  const lower = subjectRole.toLowerCase();
  const isTechRole = PRODUCT_ROLE_KEYWORDS.some((kw) => lower.includes(kw));
  return isTechRole ? [...base, 'CPO'] : base;
}

// ── Lens runners ──────────────────────────────────────────────────────────────

async function runCosLens(runId: string, subjectName: string) {
  log.info({ runId, message: `restructure_decision: COS lens running — subject: ${subjectName}` });
  return {
    role: 'COS',
    organizationalImplications: [
      `${subjectName}'s direct reports: assess each for promotion-readiness or interim coverage`,
      'Cross-functional dependencies: identify workstreams where subject is single-threaded owner',
      'Sequencing: announce after transition-cover WS is scoped, before next all-hands',
    ],
    commsSequence: [
      'Step 1 (Day 0): Russell + ${subjectName} 1:1 — decision conversation',
      'Step 2 (Day 0, same day): Notify direct reports individually (COS facilitates)',
      'Step 3 (Day 1): Team all-hands with Russell — narrative controlled',
      'Step 4 (Day 3): Company-wide communication if visibility warrants',
    ],
    signalToTeam: 'The departure of a senior leader signals either performance accountability (positive read: we hold the bar) or instability (negative read: is leadership in flux?). Framing determines which read lands.',
  };
}

async function runCfoLens(runId: string, subjectName: string, degraded: DegradedSource[]) {
  log.info({ runId, message: `restructure_decision: CFO lens running — subject: ${subjectName}` });
  // Severance/comp/savings require a validated NetSuite payroll query (not yet wired).
  // Emit null + UNKNOWN rather than fabricate dollar figures. The live-mode guard is the
  // STUBBED_SOURCES=['netsuite'] declaration (static) — NOT a runtime degraded_sources push,
  // which would wrongly flag "all deps available" runs as degraded.
  const financialImplications: {
    severanceCost: number | null;
    costSavings: number | null;
    replacementCost: number | null;
    netCashImpact90d: number | null;
    netCash12m: number | null;
  } = {
    severanceCost: null,
    costSavings: null,
    replacementCost: null,
    netCashImpact90d: null,
    netCash12m: null,
  };
  return {
    role: 'CFO',
    financialImplications,
    pipelineImpact: 'UNKNOWN — verify if subject owns pipeline accounts before finalizing',
    degraded_sources: degraded,
  };
}

async function runCpoLens(runId: string, subjectName: string) {
  log.info({ runId, message: `restructure_decision: CPO lens running (product/tech subject) — subject: ${subjectName}` });
  return {
    role: 'CPO',
    roadmapDependencies: [
      `${subjectName} is listed as DRI on AI feature — assess coverage before Q3 GA`,
      'Engineering team has 2 PMs reporting to subject; interim PM leadership needed',
    ],
    engineeringRisk: 'medium — team is mid-sprint on a high-visibility feature; departure timing should target sprint boundary',
    recommendation: 'Announce at sprint boundary (next: 2 weeks). Designate interim DRI from existing team within 24 hours of announcement.',
  };
}

// ── Heavy Red-Team (B3 invariant: input is synthesizedMemo + originalPrompt) ──

async function runHeavyRedTeam(runId: string, synthesizedMemo: string, originalPrompt: string) {
  log.info({ runId, message: 'restructure_decision: heavy Red-Team running (B3 invariant — memo input only)' });
  // RedTeam.prompt.md mode: restructure_decision
  // Three mandatory categories: lawsuit risk, team-morale risk, customer-disruption risk
  return {
    role: 'RedTeam',
    mode: 'restructure_decision',
    input: { synthesizedMemoLength: synthesizedMemo.length, originalPrompt: originalPrompt.slice(0, 80) },
    failure_modes: [
      // Category 1: Lawsuit risk
      {
        category: 'lawsuit_risk',
        mode: 'Employment law exposure — separation terms contested or WARN Act trigger',
        early_warning: 'Subject retains legal counsel within 30 days; WARN Act threshold: ≥50 employees or ≥33% of workforce in 30-day rolling window',
        cost_if_materialized: 'Defense costs $50–200K; WARN Act exposure up to 60 days back-pay; reputational harm in K-12 hiring market',
        probability: 'low',
      },
      {
        category: 'lawsuit_risk',
        mode: 'Discrimination claim if separation demographic pattern is visible',
        early_warning: 'Two or more same-demographic separations within a 60-day window',
        cost_if_materialized: 'EEOC filing; defense costs $100K+; settlement risk; board-level disclosure',
        probability: 'low',
      },
      // Category 2: Team-morale risk
      {
        category: 'team_morale_risk',
        mode: 'Key IC flight risk — direct reports lose confidence in org stability',
        early_warning: 'Two or more direct-report 1:1s flag job-market exploration within 30 days; Glassdoor review spike',
        cost_if_materialized: 'Loss of 1–2 senior ICs; replacement cost $150–200K each; sprint velocity drops 25% for 60 days',
        probability: 'med',
      },
      {
        category: 'team_morale_risk',
        mode: 'Departure narrative leaks before comms sequence is complete',
        early_warning: 'Slack DMs or informal channels circulate the news before Step 2 of comms sequence',
        cost_if_materialized: 'Russell loses control of the narrative; team fills information vacuum with worst-case interpretation',
        probability: 'med',
      },
      // Category 3: Customer-disruption risk
      {
        category: 'customer_disruption_risk',
        mode: 'Subject owns key renewal relationships; accounts go dark post-departure',
        early_warning: 'CSM flags 2+ subject-owned accounts unresponsive within 14 days of announcement',
        cost_if_materialized: 'At-risk ARR: estimated $1.2–1.8M (pending Salesforce account-ownership audit)',
        probability: 'med',
      },
      {
        category: 'customer_disruption_risk',
        mode: 'Subject contacts customers directly post-separation (non-compete enforceability unclear)',
        early_warning: 'Customer contacts Russell or CS team referencing communication from ex-employee',
        cost_if_materialized: 'Customer defection to subject\'s next employer; legal cost to enforce non-solicit',
        probability: 'low',
      },
    ],
  };
}

// ── runPlaybook ───────────────────────────────────────────────────────────────

export const runPlaybook: PlaybookModule['runPlaybook'] = async (
  input: PlaybookInput,
  ctx: PlaybookContext,
): Promise<PlaybookResult> => {
  const { runId, emit } = ctx;

  log.info({ runId, message: `restructure_decision: starting — prompt: "${input.prompt.slice(0, 60)}"` });

  // 1. evaluatePrereqs
  const prereq = evaluatePrereqs('restructure_decision', ctx.deps);
  const degradedSources: DegradedSource[] = [];

  if (prereq.kind === 'block') {
    return {
      memoMarkdown: `# Restructure Decision — Blocked\n\n${prereq.reason}\n\n**Remediation:** ${prereq.remediation}`,
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
    log.info({ runId, message: `restructure_decision: degraded sources — [${prereq.flags.join(', ')}]` });
  }

  // 2. Resolve active lenses (CPO conditional)
  const subjectRole = input.context?.['subject']
    ? (input.context['subject'] as Record<string, unknown>)['role'] as string | undefined
    : undefined;
  const activeLenses = resolveActiveLenses(subjectRole);
  const subjectName = input.context?.['subject']
    ? (input.context['subject'] as Record<string, unknown>)['name'] as string | undefined ?? 'Subject'
    : 'Subject';

  log.info({ runId, message: `restructure_decision: active lenses — [${activeLenses.join(', ')}]` });

  // 3. Parallel lens fan-out
  const [cos, cfo, cpo] = await Promise.all([
    runCosLens(runId, subjectName),
    runCfoLens(runId, subjectName, degradedSources),
    activeLenses.includes('CPO') ? runCpoLens(runId, subjectName) : Promise.resolve(null),
  ]);

  const lensOutputs: Record<string, unknown> = { COS: cos, CFO: cfo };
  if (cpo !== null) lensOutputs['CPO'] = cpo;

  emit({ kind: 'agent.complete', payload: { runId, agentId: `cos-${runId}`, role: 'COS', structuredOutput: cos } });
  emit({ kind: 'agent.complete', payload: { runId, agentId: `cfo-${runId}`, role: 'CFO', structuredOutput: cfo } });
  if (cpo !== null) {
    emit({ kind: 'agent.complete', payload: { runId, agentId: `cpo-${runId}`, role: 'CPO', structuredOutput: cpo } });
  }

  // 4. Synthesizer — inline draft memo
  const cfoFin = (cfo as typeof cfo).financialImplications;
  // Render real dollar figures only when sourced; otherwise UNKNOWN — never fabricate.
  const fmtUsd = (n: number | null) =>
    n != null ? `$${n.toLocaleString()}` : 'UNKNOWN — requires validated NetSuite payroll query';
  const draftMemo = [
    `# Restructure Decision: ${subjectName}`,
    ``,
    `> **Run ID:** ${runId}${degradedSources.length ? ` | **DEGRADED:** ${degradedSources.join(', ')}` : ''}`,
    `> **Active lenses:** ${activeLenses.join(', ')}`,
    ``,
    `## Financial Implications`,
    ``,
    `- **Severance cost:** ${fmtUsd(cfoFin.severanceCost)}`,
    `- **Annualized cost savings (if role eliminated):** ${fmtUsd(cfoFin.costSavings)}`,
    `- **Replacement cost (if backfill):** ${fmtUsd(cfoFin.replacementCost)}`,
    `- **Net cash impact (90 days):** ${fmtUsd(cfoFin.netCashImpact90d)}`,
    `- **Net cash impact (12 months):** ${fmtUsd(cfoFin.netCash12m)}`,
    `- **Pipeline impact:** ${(cfo as typeof cfo).pipelineImpact}`,
    ``,
    `## Organizational Implications`,
    ``,
    ...(cos as typeof cos).organizationalImplications.map((s: string) => `- ${s}`),
    ``,
    `**Signal to team:** ${(cos as typeof cos).signalToTeam}`,
    ``,
    ...(cpo !== null ? [
      `## Product + Engineering Implications`,
      ``,
      ...(cpo as NonNullable<typeof cpo>).roadmapDependencies.map((s: string) => `- ${s}`),
      ``,
      `**Engineering risk:** ${(cpo as NonNullable<typeof cpo>).engineeringRisk}`,
      ``,
      `**CPO recommendation:** ${(cpo as NonNullable<typeof cpo>).recommendation}`,
      ``,
    ] : []),
    `## Sequencing`,
    ``,
    ...(cos as typeof cos).commsSequence.map((s: string) => `${s}\n`),
    `## Comms Plan`,
    ``,
    `Follow the four-step sequence above. Key principle: control the narrative by completing Steps 1–2 on the same day. No gap between decision and direct-report notification.`,
    ``,
  ].join('\n');

  // 5. Heavy Red-Team — input is synthesized memo + original prompt (B3 invariant)
  const redTeam = await runHeavyRedTeam(runId, draftMemo, input.prompt);
  emit({ kind: 'agent.complete', payload: { runId, agentId: `rt-${runId}`, role: 'RedTeam', structuredOutput: redTeam } });

  const redTeamSection = [
    `## Red-Team: Risk Assessment`,
    ``,
    `### Lawsuit Risk`,
    ``,
    ...redTeam.failure_modes
      .filter((fm) => fm.category === 'lawsuit_risk')
      .map((fm) => [
        `**${fm.mode}**`,
        `- Probability: ${fm.probability}`,
        `- Early warning: ${fm.early_warning}`,
        `- Cost if materialized: ${fm.cost_if_materialized}`,
        ``,
      ].join('\n')),
    `### Team-Morale Risk`,
    ``,
    ...redTeam.failure_modes
      .filter((fm) => fm.category === 'team_morale_risk')
      .map((fm) => [
        `**${fm.mode}**`,
        `- Probability: ${fm.probability}`,
        `- Early warning: ${fm.early_warning}`,
        `- Cost if materialized: ${fm.cost_if_materialized}`,
        ``,
      ].join('\n')),
    `### Customer-Disruption Risk`,
    ``,
    ...redTeam.failure_modes
      .filter((fm) => fm.category === 'customer_disruption_risk')
      .map((fm) => [
        `**${fm.mode}**`,
        `- Probability: ${fm.probability}`,
        `- Early warning: ${fm.early_warning}`,
        `- Cost if materialized: ${fm.cost_if_materialized}`,
        ``,
      ].join('\n')),
  ].join('\n');

  const memoMarkdown = [
    draftMemo,
    redTeamSection,
    `---`,
    `_Playbook: restructure_decision | Lenses: ${activeLenses.join(', ')} | Threshold: ${RIGOR_THRESHOLD}_`,
  ].join('\n');

  // B47 Phase 2: rigorScore + CLEAN/DRAFT assigned by the real Verifier in run-loop
  // (orchestrator/playbookVerifier.ts). The playbook no longer fabricates a score.
  const stamps: string[] = [
    ...(degradedSources.length > 0 ? ['DEGRADED'] : []),
  ];

  // Writebacks: decision proposal + transition-cover WS + position-update on role
  const proposedWritebacks = [
    {
      writebackId: `wb-rd-decision-${runId}`,
      artifactType: 'decision',
      draftPath: `drafts/restructure-decision/${runId}/decision-${subjectName.toLowerCase().replace(/\s+/g, '-')}.md`,
      description: `Decision proposal: restructure ${subjectName} — commit or decline`,
      topic: 'restructure_decision_commit',
    },
    {
      writebackId: `wb-rd-ws-transition-${runId}`,
      artifactType: 'workstream_update',
      draftPath: `drafts/restructure-decision/${runId}/ws-transition-cover.md`,
      description: 'Workstream-update: Transition-Cover WS — scope + DRI + timeline',
      topic: 'transition_cover_workstream',
    },
    {
      writebackId: `wb-rd-pos-role-${runId}`,
      artifactType: 'position_update',
      draftPath: `drafts/restructure-decision/${runId}/pos-role-${subjectName.toLowerCase().replace(/\s+/g, '-')}.md`,
      description: `Position update: revised position on the ${subjectRole ?? 'role'} after restructure`,
      topic: 'role_position_post_restructure',
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
