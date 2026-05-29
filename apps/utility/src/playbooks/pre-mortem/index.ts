// apps/utility/src/playbooks/pre-mortem/index.ts
// Source: docs/decisions/0009-ch7-playbooks-home.md §9 + §3.4
//
// Pre-mortem on Proposed Action.
//   LENSES = [] — adversarial-first; lens fan-out is skipped entirely.
//   Threshold: 70
//   Stamps: ADVERSARIAL_ONLY + CLEAN | DRAFT
//
// Pipeline (ADR-0009 §3.4):
//   1. evaluatePrereqs — always proceeds (no prereqs beyond proposedAction in input)
//   2. Dispatch Red-Team (sequential, first)
//   3. Dispatch Steelman (sequential, after Red-Team)
//   4. Synthesize failure-mode memo
//   5. Verifier runs (grades citation discipline + adversarial-stamp invariant)
//
// Output:
//   - Failure modes (ranked by likelihood × severity)
//   - Early-warning signals (each tied to a tripwire condition, cited)
//   - Mitigation moves (per top-3 failure modes)
//   - Response playbook (if failure manifests, first-72hr actions)
//
// Writebacks: pre-mortem-update proposal (new failure modes appended to pre-mortem corpus)

import type { PlaybookInput, PlaybookContext, PlaybookResult, PlaybookModule, StubbedSource } from '@c-suite/shared-types/playbook';

// B47 Phase 2: rigorScore now comes from the real Verifier (run-loop / playbookVerifier).
export const STUBBED_SOURCES: readonly StubbedSource[] = [];
import { evaluatePrereqs } from '../lib/evaluatePrereqs.js';
import { createLogger } from '../../logger.js';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { modelClientFromEnv } from '../../agents/modelClient.js';

const log = createLogger();

export const LENSES = [] as const;
const RIGOR_THRESHOLD = 70;

// ── U1: real adversarial inference (Option C) ───────────────────────────────────
// pre_mortem is adversarial-ONLY (no six-lens fan-out). Its RedTeam GENERATES failure modes for the
// proposed action and its Steelman defends it — the exact shapes the memo-builder below reads. These
// are NOT the six-lens RedTeam/Steelman (which CHALLENGE lens claims and emit a different schema), so
// pre_mortem has dedicated prompts + local schemas. Prompts load from dist/prompts like
// verifier-runner.ts, but ../../prompts because this file sits one directory deeper (src/playbooks/pre-mortem).
const _dirname = typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));
const REDTEAM_PROMPT_PATH = join(_dirname, '../../prompts/RedTeam.preMortem.prompt.md');
const STEELMAN_PROMPT_PATH = join(_dirname, '../../prompts/Steelman.preMortem.prompt.md');

const FailureModeSchema = z.object({
  id: z.string().regex(/^fm-\d+$/, 'id must match fm-<n>'),
  description: z.string().min(1),
  likelihood: z.enum(['low', 'medium', 'high']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  earlyWarningSignal: z.string().min(1),
  tripwire: z.string().min(1),
});
const PreMortemRedTeamSchema = z.object({
  role: z.literal('RedTeam'),
  proposedAction: z.string(),
  failureModes: z.array(FailureModeSchema).min(3, 'pre_mortem requires 3-5 failure modes').max(5, 'pre_mortem requires 3-5 failure modes')
    .refine((m) => new Set(m.map((x) => x.id)).size === m.length, { message: 'failureMode ids must be unique' }),
});
const PreMortemSteelmanSchema = z.object({
  role: z.literal('Steelman'),
  proposedAction: z.string(),
  defense: z.string().min(1),
  counterToFailureModes: z.record(z.string(), z.string()),
});
type PreMortemRedTeam = z.infer<typeof PreMortemRedTeamSchema>;
type PreMortemSteelman = z.infer<typeof PreMortemSteelmanSchema>;

// LIVE-mode parse failure throws this — NEVER caught into a stub fallback (a silent fallback could
// ship fabricated stub content under a downstream CLEAN stamp — DOCTRINE #1).
class PreMortemOutputContractViolation extends Error {
  readonly code = 'PRE_MORTEM_OUTPUT_CONTRACT_VIOLATION' as const;
  constructor(public readonly role: 'RedTeam' | 'Steelman', public readonly zodError: z.ZodError) {
    super(`pre_mortem ${role} returned malformed output: ${zodError.message}`);
    this.name = 'PreMortemOutputContractViolation';
  }
}

// ── runPlaybook ───────────────────────────────────────────────────────────────

export const runPlaybook: PlaybookModule['runPlaybook'] = async (
  input: PlaybookInput,
  ctx: PlaybookContext,
): Promise<PlaybookResult> => {
  const { runId, emit } = ctx;

  log.info({ runId, message: `pre_mortem: starting — prompt: "${input.prompt.slice(0, 60)}"` });

  // 1. evaluatePrereqs — always proceeds for pre_mortem
  const prereq = evaluatePrereqs('pre_mortem', ctx.deps);
  // prereq will always be { kind: 'proceed' } per Decision 4 table, but handle defensively
  if (prereq.kind === 'block') {
    return {
      memoMarkdown: `# Pre-mortem — Blocked\n\n${prereq.reason}`,
      degradedSources: [],
      lensOutputs: {},
      stamps: ['ADVERSARIAL_ONLY', 'DRAFT'],
      rigorScore: null,
      rigorThreshold: RIGOR_THRESHOLD,
      proposedWritebacks: [],
    };
  }

  const proposedAction = (input.context?.['proposedAction'] as string | undefined) ?? input.prompt;

  // 2 + 3. Red-Team then Steelman (sequential per ADR-0009 §3.4).
  // LIVE: two real RealClaudeClient generations (RedTeam first; Steelman second, fed the proposed
  // action + RedTeam failure modes), each validated to the required shape and FAILED LOUD on a parse
  // miss — never a stub fallback. REPLAY/RECORD: the original structured stubs, run through the same
  // schema (byte-identical pre-U1 behavior; existing unit tests green by construction).
  const isLive = (process.env.STUB_MODE ?? 'replay') === 'live';
  let redTeamOutput: PreMortemRedTeam;
  let steelmanOutput: PreMortemSteelman;

  if (isLive) {
    const client = modelClientFromEnv();
    log.info({ runId, message: 'pre_mortem: dispatching Red-Team (live, sequential)' });
    const rt = await client.invoke(
      { role: 'RedTeam', systemPrompt: readFileSync(REDTEAM_PROMPT_PATH, 'utf8') },
      { question: proposedAction, proposedAction },
    );
    const rtParsed = PreMortemRedTeamSchema.safeParse(rt.structuredOutput);
    if (!rtParsed.success) throw new PreMortemOutputContractViolation('RedTeam', rtParsed.error);
    redTeamOutput = { ...rtParsed.data, proposedAction };  // trust known input over the model's echo

    log.info({ runId, message: 'pre_mortem: dispatching Steelman (live, sequential)' });
    const sm = await client.invoke(
      { role: 'Steelman', systemPrompt: readFileSync(STEELMAN_PROMPT_PATH, 'utf8') },
      { question: proposedAction, proposedAction, failureModes: redTeamOutput.failureModes },
    );
    const smParsed = PreMortemSteelmanSchema.safeParse(sm.structuredOutput);
    if (!smParsed.success) throw new PreMortemOutputContractViolation('Steelman', smParsed.error);
    steelmanOutput = { ...smParsed.data, proposedAction };
  } else {
    log.info({ runId, message: 'pre_mortem: dispatching Red-Team (sequential)' });
    redTeamOutput = PreMortemRedTeamSchema.parse({
      role: 'RedTeam',
      proposedAction,
      failureModes: [
        { id: 'fm-1', description: 'Execution underestimates organizational friction', likelihood: 'high', severity: 'high', earlyWarningSignal: 'Key stakeholders missing from kickoff; approvals delayed >2 weeks', tripwire: 'No written sign-off from CFO + COS within 5 business days' },
        { id: 'fm-2', description: 'Resource commitment exceeds capacity; other priorities slip', likelihood: 'medium', severity: 'high', earlyWarningSignal: 'Two or more workstreams enter YELLOW status within 30 days', tripwire: 'Workstream dashboard shows 3+ YELLOWs simultaneously' },
        { id: 'fm-3', description: 'Market conditions shift before value is realized', likelihood: 'low', severity: 'critical', earlyWarningSignal: 'Competitive signal or macro indicator contradicts core assumption', tripwire: 'CRO flags pipeline velocity drop >20% in weekly review' },
      ],
    });
    log.info({ runId, message: 'pre_mortem: dispatching Steelman (sequential)' });
    steelmanOutput = PreMortemSteelmanSchema.parse({
      role: 'Steelman',
      proposedAction,
      defense: 'The proposed action is well-scoped with clear ownership. The organizational friction risk is mitigated by existing trust relationships and prior successful executions of similar scope. Capacity concerns are addressable through sequencing — the 3 at-risk workstreams have natural pause points in the next 6 weeks.',
      counterToFailureModes: {
        'fm-1': 'Sign-off process is well-understood; 5-day window is achievable given prior cadence.',
        'fm-2': 'Workstream sequencing provides slack; two can be paused without impact.',
        'fm-3': 'Core assumption (market demand) is validated by Q2 Chorus data; short window reduces exposure.',
      },
    });
  }

  // Emit agent complete events for observability
  emit({ kind: 'agent.complete', payload: { runId, agentId: `rt-${runId}`, role: 'RedTeam', structuredOutput: redTeamOutput } });
  emit({ kind: 'agent.complete', payload: { runId, agentId: `sm-${runId}`, role: 'Steelman', structuredOutput: steelmanOutput } });

  // 4. Synthesize failure-mode memo (inline lightweight synthesis, per ADR-0009 §3.4)
  const failureModes = redTeamOutput.failureModes;
  const topThree = failureModes.slice(0, 3);

  const memoMarkdown = [
    `# Pre-mortem: ${proposedAction.slice(0, 80)}`,
    '',
    '> **ADVERSARIAL ONLY** — This is a stress-test memo, not a lens-grounded analysis.',
    '> Red-Team + Steelman primary; no six-lens fan-out.',
    '',
    '## Failure Modes (ranked by likelihood × severity)',
    '',
    ...failureModes.map((fm, i) =>
      [
        `### ${i + 1}. ${fm.description}`,
        `- **Likelihood:** ${fm.likelihood} | **Severity:** ${fm.severity}`,
        `- **Early-warning signal:** ${fm.earlyWarningSignal}`,
        `- **Tripwire:** ${fm.tripwire}`,
        '',
      ].join('\n')
    ),
    '## Steelman Defense',
    '',
    steelmanOutput.defense,
    '',
    '## Mitigation Moves (top 3 failure modes)',
    '',
    ...topThree.map((fm) =>
      [
        `### Against: ${fm.description}`,
        `- Counter-argument: ${steelmanOutput.counterToFailureModes[fm.id as keyof typeof steelmanOutput.counterToFailureModes] ?? 'See Red-Team output.'}`,
        `- Mitigation: Pre-commit to tripwire monitoring: "${fm.tripwire}"`,
        '',
      ].join('\n')
    ),
    '## Response Playbook (if the failure manifests)',
    '',
    '**First 72 hours:**',
    '1. Halt non-essential workstream activity and convene a war-room (COS leads).',
    '2. Diagnose which failure mode fired by checking tripwire conditions above.',
    '3. Assess reversibility and cost of reversal vs. continued execution.',
    '4. Decision gate: proceed with mitigation, pause pending new data, or exit.',
    '',
    '---',
    `_Run ID: ${runId} | Playbook: pre_mortem | Agents: RedTeam, Steelman_`,
  ].join('\n');

  // 5. Verifier runs in run-loop (B47 Phase 2, orchestrator/playbookVerifier.ts):
  //    rigorScore is null here — the real Verifier assigns it, and the CLEAN/DRAFT
  //    ship stamp is recomputed there from the real score. The playbook no longer
  //    fabricates a rigor score.
  return {
    memoMarkdown,
    degradedSources: [],
    lensOutputs: {
      RedTeam: redTeamOutput,
      Steelman: steelmanOutput,
    },
    stamps: ['ADVERSARIAL_ONLY'],
    rigorScore: null,
    rigorThreshold: RIGOR_THRESHOLD,
    proposedWritebacks: [],  // pre-mortem-update proposals authored by Synthesizer in production
  };
};
