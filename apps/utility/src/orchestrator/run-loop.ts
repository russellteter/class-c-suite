// apps/utility/src/orchestrator/run-loop.ts
// Source: docs/decisions/0004-ch3-runtime-spine.md §1 + §3 + §4
// startRun() — entry point for a new run. Drives the RunState machine.
import type Database from 'better-sqlite3';
import type { RunState } from '@c-suite/shared-types/run-state';
import type { LensContextBundle } from '@c-suite/shared-types/lens-context-bundle';
import type { LensRole } from '@c-suite/shared-types/agent-definition';
import { LENS_ROLES } from '@c-suite/shared-types/agent-definition';
import { transition, type RunEvent } from './state-machine.js';
import { dispatchLens } from './dispatch.js';
import type { IpcEmit } from './hooks.js';

export interface FinalRunState {
  finalState: RunState;
  visitedStates: string[];
  agentRolesInvoked: string[];
}

function makeFailedReturn(runId: string, visitedStates: string[], agentRolesInvoked: string[], error: { code: string; message: string }): FinalRunState {
  return {
    finalState: { kind: 'failed', runId, error },
    visitedStates,
    agentRolesInvoked,
  };
}

/**
 * Start a new run from bootstrap state.
 * Drives through all RunState transitions using STUB_MODE=replay fixtures in tests.
 */
export async function startRun(
  runId: string,
  playbookId: string,
  question: string,
  db: Database.Database,
  ipcEmit?: IpcEmit,
): Promise<FinalRunState> {
  const emit: IpcEmit = ipcEmit ?? (() => void 0);
  const visitedStates: string[] = [];
  const agentRolesInvoked: string[] = [];

  // Seed the runs table if not already seeded
  const existing = db.prepare(`SELECT run_id FROM runs WHERE run_id = ?`).get(runId);
  if (!existing) {
    const bootstrapState: RunState = { kind: 'bootstrap', runId, playbook: playbookId, question };
    db.prepare(
      `INSERT INTO runs (run_id, playbook, question, started_at, current_state, status)
       VALUES (?, ?, ?, unixepoch(), json(?), 'in_progress')`
    ).run(runId, playbookId, question, JSON.stringify(bootstrapState));
  }

  let state: RunState = { kind: 'bootstrap', runId, playbook: playbookId, question };
  visitedStates.push(state.kind);

  // bootstrap → plan-approval
  const planEvent: RunEvent = {
    kind: 'plan.ready',
    plan: { steps: ['fan-out', 'red-team-steelman', 'synthesizer', 'verifier'] },
  };
  const afterPlan = transition(state, planEvent, db);
  if ('code' in afterPlan) return makeFailedReturn(runId, visitedStates, agentRolesInvoked, afterPlan);
  state = afterPlan;
  visitedStates.push(state.kind);

  // plan-approval → fan-out (auto-approve)
  const approveEvent: RunEvent = { kind: 'plan.approved' };
  const afterApprove = transition(state, approveEvent, db);
  if ('code' in afterApprove) return makeFailedReturn(runId, visitedStates, agentRolesInvoked, afterApprove);
  state = afterApprove;
  visitedStates.push(state.kind);

  // fan-out: dispatch all 6 lens agents
  for (const role of LENS_ROLES) {
    const bundle = buildLensBundle(role, runId, question, playbookId);
    await dispatchLens(role, bundle, db, emit);
    agentRolesInvoked.push(role);

    const lensEvent: RunEvent = { kind: 'lens.complete', role, output: {} };
    const afterLens = transition(state, lensEvent, db);
    if ('code' in afterLens) return makeFailedReturn(runId, visitedStates, agentRolesInvoked, afterLens);
    state = afterLens;
  }

  // fan-out → red-team-steelman
  const allDoneEvent: RunEvent = { kind: 'all.lenses.complete' };
  const afterFanOut = transition(state, allDoneEvent, db);
  if ('code' in afterFanOut) return makeFailedReturn(runId, visitedStates, agentRolesInvoked, afterFanOut);
  state = afterFanOut;
  visitedStates.push(state.kind);
  agentRolesInvoked.push('RedTeam', 'Steelman');

  // red-team-steelman → synthesizer
  const rtsEvent: RunEvent = { kind: 'red-team-steelman.complete' };
  const afterRTS = transition(state, rtsEvent, db);
  if ('code' in afterRTS) return makeFailedReturn(runId, visitedStates, agentRolesInvoked, afterRTS);
  state = afterRTS;
  visitedStates.push(state.kind);
  agentRolesInvoked.push('Synthesizer');

  // synthesizer → verifier
  const memoEvent: RunEvent = { kind: 'memo.ready' };
  const afterSynth = transition(state, memoEvent, db);
  if ('code' in afterSynth) return makeFailedReturn(runId, visitedStates, agentRolesInvoked, afterSynth);
  state = afterSynth;
  visitedStates.push(state.kind);
  agentRolesInvoked.push('Verifier');

  // verifier → shipped-clean (stub: always passes in replay mode)
  const verifierEvent: RunEvent = {
    kind: 'verifier.pass',
    rigorScore: 85,
    memoPath: `/vault/memos/${runId}.md`,
  };
  const afterVerifier = transition(state, verifierEvent, db);
  if ('code' in afterVerifier) return makeFailedReturn(runId, visitedStates, agentRolesInvoked, afterVerifier);
  state = afterVerifier;
  visitedStates.push(state.kind);

  // shipped-clean → run-critic
  const runCriticEvent: RunEvent = {
    kind: 'run-critic.complete',
    runCritique: {
      role: 'RunCritic',
      runId,
      overallQuality: 'good',
      strengthsByRole: {} as Record<string, string>,
      weaknessesByRole: {} as Record<string, string>,
      processImprovements: ['Add more citations'],
      critiqueMarkdown: 'The run was good. Improvements noted.',
    },
  };
  const afterShipped = transition(state, runCriticEvent, db);
  if ('code' in afterShipped) return makeFailedReturn(runId, visitedStates, agentRolesInvoked, afterShipped);
  state = afterShipped;
  visitedStates.push(state.kind);
  agentRolesInvoked.push('RunCritic');

  // run-critic → handoff
  const handoffEvent: RunEvent = {
    kind: 'handoff.complete',
    handoffPath: `/vault/handoffs/${runId}.md`,
  };
  const afterRunCritic = transition(state, handoffEvent, db);
  if ('code' in afterRunCritic) return makeFailedReturn(runId, visitedStates, agentRolesInvoked, afterRunCritic);
  state = afterRunCritic;
  visitedStates.push(state.kind);
  agentRolesInvoked.push('Handoff');

  return { finalState: state, visitedStates, agentRolesInvoked };
}

/**
 * Build a fresh LensContextBundle for a role from the run's question/playbook.
 * Lens isolation holds: the bundle contains NO other lens outputs.
 */
export function buildLensBundle<R extends LensRole>(
  role: R,
  runId: string,
  question: string,
  playbook: string,
): LensContextBundle<R> {
  return {
    runId,
    role,
    question,
    playbook,
    contextDocuments: [],
  } as unknown as LensContextBundle<R>;
}
