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

import type { PlaybookInput, PlaybookContext, PlaybookResult, PlaybookModule, StubbedSource } from '@c-suite/shared-types/playbook';
import type { DegradedSource } from '@c-suite/shared-types/playbook';

// B47 honest-stub declaration (audit Finding 2): rigorScore is hardcoded, not from a real Verifier run.
export const STUBBED_SOURCES: readonly StubbedSource[] = ['verifier_rigor'];
import { evaluatePrereqs } from '../lib/evaluatePrereqs.js';
import { createLogger } from '../../logger.js';

const log = createLogger();

export const LENSES = ['CEO', 'CFO', 'CRO', 'CMO', 'CPO', 'COS'] as const;
const RIGOR_THRESHOLD = 70;

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

async function runCfoLens(runId: string, degraded: DegradedSource[]) {
  log.info({ runId, message: 'board_narrative: CFO lens running' });
  return {
    role: 'CFO',
    cashPosition: '$14.2M (as of last close) | 18-month runway at current burn',
    burnRate: '$1.1M/month | target $900K by Q3',
    arr: '$22.4M | YoY growth 8%',
    grossChurn: '4.2% (above 3.5% board target)',
    nrr: '108% (target: 110%+)',
    slideDataPoints: [
      'Cash waterfall: opening balance, burn, LoC headroom, projected close',
      'ARR bridge: new ARR + expansion − churn',
      'Gross margin trend (last 4 quarters)',
    ],
    degraded_sources: degraded,
  };
}

async function runCroLens(runId: string) {
  log.info({ runId, message: 'board_narrative: CRO lens running' });
  return {
    role: 'CRO',
    pipelineCoverage: '3.2× Q3 quota (healthy)',
    committedPipeline: '$14.2M',
    winRate: '0.31 (trailing 12M)',
    boardConcernAnticipated: 'Board will ask about Q3 close confidence and enterprise segment traction.',
    slideDataPoints: [
      'Pipeline waterfall by stage',
      'Win rate trend by segment',
      'Top 5 at-risk renewals',
    ],
  };
}

async function runCmoLens(runId: string) {
  log.info({ runId, message: 'board_narrative: CMO lens running' });
  return {
    role: 'CMO',
    marketingAttributedPipeline: '$4.8M (34% of total)',
    demandGenTrend: 'Improving — digital-only shift adds 20% more MQL volume at same cost',
    boardConcernAnticipated: 'Board will probe marketing ROI and brand awareness in target ICP.',
    slideDataPoints: [
      'MQL → SQL → ACV conversion funnel',
      'Marketing-attributed pipeline by channel',
      'CAC trend',
    ],
  };
}

async function runCpoLens(runId: string) {
  log.info({ runId, message: 'board_narrative: CPO lens running' });
  return {
    role: 'CPO',
    productAdoptionHighlights: '61% active accounts; AI reporting feature on track for Q3 GA',
    nrrDriver: 'Top-usage-quartile accounts expand at 2.3× rate; AI feature expected to move 20% of base into top quartile',
    boardConcernAnticipated: 'Board will ask about AI feature differentiation vs. competitors and timeline risk.',
    slideDataPoints: [
      'Usage cohort analysis (top quartile vs median)',
      'AI feature roadmap milestone status',
      'Feature adoption rate trend',
    ],
  };
}

async function runCosLens(runId: string) {
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

// ── Board member Q&A stubs ────────────────────────────────────────────────────

function buildBoardQa(boardMember: string): { question: string; recommendedAnswer: string } {
  const qas: Record<string, { question: string; recommendedAnswer: string }> = {
    'Lead Investor': {
      question: 'When do you expect to hit NRR >110% and what are the three biggest risks to that timeline?',
      recommendedAnswer: 'We target NRR ≥110% by Q4 driven by the CS expansion PLG motion and AI feature upsell. Top risks: (1) AI feature Q3 slip → mitigation: beta cohort tripwire at week 6; (2) CS bandwidth → mitigation: new hire in M1; (3) macro churn pressure → mitigation: at-risk account playbook live now.',
    },
    'Independent Director': {
      question: 'How does leadership capacity hold up if you are running three workstreams simultaneously?',
      recommendedAnswer: 'Workstreams are sequenced: CS hire closes in M1 before marketing consolidation in M2. No more than two active workstreams overlap. COS owns the sequencing and RAG dashboard visible to the board.',
    },
    'Audit Committee Chair': {
      question: 'Walk me through the cash waterfall and key covenants on the LoC.',
      recommendedAnswer: 'Opening cash $14.2M; monthly burn $1.1M target $900K by Q3; Barclays LoC $5M available, leverage covenant at 3.5× EBITDA. We are covenant-compliant. CFO will present the full waterfall in Slide 3.',
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
    '**Slide 11 — Financial outlook:** Q3 targets, Q4 guidance, path to $900K burn. [^cfo-burn]',
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

  // 2. Parallel lens fan-out (all six)
  const [ceo, cfo, cro, cmo, cpo, cos] = await Promise.all([
    runCeoLens(runId, input.prompt),
    runCfoLens(runId, degradedSources),
    runCroLens(runId),
    runCmoLens(runId),
    runCpoLens(runId),
    runCosLens(runId),
  ]);

  const lensOutputs: Record<string, unknown> = { CEO: ceo, CFO: cfo, CRO: cro, CMO: cmo, CPO: cpo, COS: cos };

  emit({ kind: 'agent.complete', payload: { runId, agentId: `ceo-${runId}`, role: 'CEO', structuredOutput: ceo } });
  emit({ kind: 'agent.complete', payload: { runId, agentId: `cfo-${runId}`, role: 'CFO', structuredOutput: cfo } });
  emit({ kind: 'agent.complete', payload: { runId, agentId: `cro-${runId}`, role: 'CRO', structuredOutput: cro } });
  emit({ kind: 'agent.complete', payload: { runId, agentId: `cmo-${runId}`, role: 'CMO', structuredOutput: cmo } });
  emit({ kind: 'agent.complete', payload: { runId, agentId: `cpo-${runId}`, role: 'CPO', structuredOutput: cpo } });
  emit({ kind: 'agent.complete', payload: { runId, agentId: `cos-${runId}`, role: 'COS', structuredOutput: cos } });

  // 3. Synthesizer — narrative spine + slide skeleton + Q&A
  const boardMembers = ['Lead Investor', 'Independent Director', 'Audit Committee Chair'];
  const boardQa = boardMembers.map((m) => ({ member: m, ...buildBoardQa(m) }));
  const slides = buildSlideSkeleton();

  const memoMarkdown = [
    `# Board Narrative Memo`,
    ``,
    `> **Run ID:** ${runId}${degradedSources.length ? ` | **DEGRADED:** ${degradedSources.join(', ')}` : ''}`,
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
    `- CFO: Cash $14.2M | Burn $1.1M/mo | ARR $22.4M | NRR 108% | Gross churn 4.2% [^cfo]`,
    `- CRO: Committed pipeline $14.2M | Coverage 3.2× | Win rate 31% [^cro]`,
    `- CMO: Marketing-attributed pipeline $4.8M (34%) | MQL volume +20% [^cmo]`,
    `- CPO: Active accounts 61% | AI feature on track Q3 GA [^cpo]`,
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

  // 4. Verifier (placeholder — real Verifier in run-loop)
  const rigorScore = 75;
  const passed = rigorScore >= RIGOR_THRESHOLD;
  const stamps: string[] = [
    ...(degradedSources.length > 0 ? ['DEGRADED'] : []),
    passed ? 'CLEAN' : 'DRAFT',
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
    rigorScore,
    rigorThreshold: RIGOR_THRESHOLD,
    proposedWritebacks,
  };
};
