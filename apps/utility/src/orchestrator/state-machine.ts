// apps/utility/src/orchestrator/state-machine.ts
// Source: docs/decisions/0004-ch3-runtime-spine.md §1.3–§1.5
// Pure transition function + SQLite persistence.
import type Database from 'better-sqlite3';
import type { RunState, RunFailedError } from '@c-suite/shared-types/run-state';
import type { AgentRole } from '@c-suite/shared-types/agent-definition';
import type { RunCritiqueOutput } from '@c-suite/shared-types/run-critique';
import type { IpcMessage } from '@c-suite/shared-types/ipc';

/**
 * B38: N=3 iteration cap on review → write-back-proposed transitions.
 * Source: docs/research/phase-r-decisions.md §3 (Iterative feedback N=3 hard cap)
 *         docs/reviews/ultrareview-2026-05-27.md "Critical Fix 4"
 *
 * Semantics: `iteration` counts review.iterate events fired so far.
 *   - 0: no iterations yet (fresh draft from shipped-clean)
 *   - 1..3: legal review.iterate transitions
 *   - 4: would-be 4th iteration — rejected with IterationCapReached
 */
export const MAX_REVIEW_ITERATIONS = 3;

export class IterationCapReached extends Error {
  constructor(public readonly runId: string, public readonly writebackId: string) {
    super(
      `Review iteration cap reached (N=${MAX_REVIEW_ITERATIONS}). Commit, reject, or restart the run.`,
    );
    this.name = 'IterationCapReached';
  }
}

export type EmitIpc = (msg: IpcMessage) => void;

// --- RunEvent union ---

export type RunEvent =
  | { kind: 'plan.ready'; plan: { steps: string[]; autoApproveAfterMs?: number | null } }
  | { kind: 'plan.approved' }
  | { kind: 'plan.rejected'; reason: string }
  | { kind: 'lens.complete'; role: string; output: unknown }
  | { kind: 'all.lenses.complete' }
  | { kind: 'red-team-steelman.complete' }
  | { kind: 'memo.ready' }
  | { kind: 'verifier.pass'; rigorScore: number; memoPath: string }
  | { kind: 'verifier.fail'; failureReasons: string[]; memoPath: string }
  | { kind: 'writeback.proposed'; drafts: unknown[] }
  | { kind: 'writeback.sent'; writebackId: string }
  | { kind: 'review.accepted' }
  | { kind: 'review.iterate' }
  | { kind: 'committed' }
  | { kind: 'run-critic.complete'; runCritique: RunCritiqueOutput }
  | { kind: 'handoff.complete'; handoffPath: string }
  | { kind: 'error'; code: string; message: string };

// Legal transition table per ADR §1.4
const LEGAL_TRANSITIONS: Record<string, string[]> = {
  'bootstrap':           ['plan-approval'],
  'plan-approval':       ['fan-out', 'failed'],
  'fan-out':             ['fan-out', 'red-team-steelman'],
  'red-team-steelman':   ['synthesizer'],
  'synthesizer':         ['verifier'],
  'verifier':            ['shipped-clean', 'shipped-draft'],
  'shipped-clean':       ['write-back-proposed', 'run-critic'],
  'shipped-draft':       ['run-critic'],
  'write-back-proposed': ['review'],
  'review':              ['committed', 'write-back-proposed', 'failed'],
  'committed':           ['run-critic'],
  'run-critic':          ['handoff'],
  'handoff':             [],  // terminal
  'failed':              [],  // terminal
};

function isLegalTransition(fromKind: string, toKind: string): boolean {
  return LEGAL_TRANSITIONS[fromKind]?.includes(toKind) ?? false;
}

function makeFailedError(code: string, message: string): RunFailedError {
  return { code, message };
}

/**
 * Pure transition function — no side effects beyond the db parameter.
 * Returns new RunState, or RunFailedError for illegal transitions.
 * Persists both writes atomically in a single SQLite transaction (ADR §1.5).
 */
export function transition(
  state: RunState,
  event: RunEvent,
  db: Database.Database,
  emitIpc?: EmitIpc,
): RunState | RunFailedError {
  const fromKind = state.kind;
  let nextState: RunState | RunFailedError | null = null;

  // Compute next state from current state + event
  switch (state.kind) {
    case 'bootstrap':
      if (event.kind === 'plan.ready') {
        nextState = {
          kind: 'plan-approval',
          runId: state.runId,
          plan: {
            steps: event.plan.steps,
            autoApproveAfterMs: event.plan.autoApproveAfterMs ?? null,
          },
        };
      }
      break;

    case 'plan-approval':
      if (event.kind === 'plan.approved') {
        nextState = {
          kind: 'fan-out',
          runId: state.runId,
          lensesInFlight: ['CEO', 'CFO', 'CRO', 'CMO', 'CPO', 'COS'],
          lensesComplete: [],
        };
      } else if (event.kind === 'plan.rejected') {
        nextState = {
          kind: 'failed',
          runId: state.runId,
          error: makeFailedError('PLAN_REJECTED', event.reason),
        };
      } else if (event.kind === 'error') {
        nextState = {
          kind: 'failed',
          runId: state.runId,
          error: makeFailedError(event.code, event.message),
        };
      }
      break;

    case 'fan-out':
      if (event.kind === 'lens.complete') {
        const newInFlight = state.lensesInFlight.filter(r => r !== event.role) as AgentRole[];
        const newComplete = [...state.lensesComplete, event.role as AgentRole];
        nextState = {
          kind: 'fan-out',
          runId: state.runId,
          lensesInFlight: newInFlight,
          lensesComplete: newComplete,
        } as RunState;
      } else if (event.kind === 'all.lenses.complete') {
        nextState = {
          kind: 'red-team-steelman',
          runId: state.runId,
          lensOutputs: [],
        };
      }
      break;

    case 'red-team-steelman':
      if (event.kind === 'red-team-steelman.complete') {
        nextState = {
          kind: 'synthesizer',
          runId: state.runId,
          redTeam: {
            role: 'RedTeam',
            runId: state.runId,
            challenges: [{ targetRole: 'CEO', claim: '', counterargument: '', severity: 'low' }],
            overallRisk: 'low',
            citations: [],
          },
          steelman: {
            role: 'Steelman',
            runId: state.runId,
            steelmen: [{ targetRole: 'CEO', bestCaseArgument: '', evidenceSupport: [] }],
            citations: [],
          },
          lensOutputs: state.lensOutputs,
        };
      }
      break;

    case 'synthesizer':
      if (event.kind === 'memo.ready') {
        nextState = {
          kind: 'verifier',
          runId: state.runId,
          memo: {
            runId: state.runId,
            memoMarkdown: '',
            executiveSummary: '',
            keyDecisions: [],
            citations: [],
            positionMetadata: [],
          },
          verifierInput: {
            runId: state.runId,
            memoMarkdown: '',
            lensOutputs: [] as never,
            toolCallAuditTrail: [],
            positionMetadata: [] as never,
            redTeamOutput: state.redTeam,
            steelmanOutput: state.steelman,
            runPlaybook: '',
            runQuestion: '',
            assembledAt: Math.floor(Date.now() / 1000),
          },
        };
      }
      break;

    case 'verifier':
      if (event.kind === 'verifier.pass') {
        nextState = {
          kind: 'shipped-clean',
          runId: state.runId,
          memoPath: event.memoPath,
          rigorScore: event.rigorScore,
        };
      } else if (event.kind === 'verifier.fail') {
        nextState = {
          kind: 'shipped-draft',
          runId: state.runId,
          memoPath: event.memoPath,
          failureReasons: event.failureReasons,
        };
      }
      break;

    case 'shipped-clean':
      if (event.kind === 'writeback.proposed') {
        // B38: initial entry — zero review iterations have fired.
        nextState = { kind: 'write-back-proposed', runId: state.runId, drafts: [], iteration: 0 };
      } else if (event.kind === 'run-critic.complete') {
        nextState = {
          kind: 'run-critic',
          runId: state.runId,
          runCritique: event.runCritique,
        };
      }
      break;

    case 'shipped-draft':
      if (event.kind === 'run-critic.complete') {
        nextState = {
          kind: 'run-critic',
          runId: state.runId,
          runCritique: event.runCritique,
        };
      }
      break;

    case 'write-back-proposed':
      if (event.kind === 'writeback.sent') {
        // B38: carry iteration count forward (count of review.iterate events so far).
        nextState = {
          kind: 'review',
          runId: state.runId,
          writebackId: event.writebackId,
          iteration: state.iteration,
        };
      }
      break;

    case 'review':
      if (event.kind === 'review.accepted') {
        nextState = { kind: 'committed', runId: state.runId };
      } else if (event.kind === 'review.iterate') {
        const nextIteration = state.iteration + 1;
        if (nextIteration > MAX_REVIEW_ITERATIONS) {
          // B38: cap reached. Emit IPC for UI, transition to failed.
          emitIpc?.({
            kind: 'run.iteration.cap_reached',
            payload: {
              runId: state.runId,
              writebackId: state.writebackId,
              maxIterations: MAX_REVIEW_ITERATIONS,
            },
          });
          nextState = {
            kind: 'failed',
            runId: state.runId,
            error: makeFailedError(
              'ITERATION_CAP_REACHED',
              `Review iteration cap reached (N=${MAX_REVIEW_ITERATIONS}); commit or restart`,
            ),
          };
        } else {
          nextState = {
            kind: 'write-back-proposed',
            runId: state.runId,
            drafts: [],
            iteration: nextIteration,
          };
        }
      }
      break;

    case 'committed':
      if (event.kind === 'run-critic.complete') {
        nextState = {
          kind: 'run-critic',
          runId: state.runId,
          runCritique: event.runCritique,
        };
      }
      break;

    case 'run-critic':
      if (event.kind === 'handoff.complete') {
        nextState = {
          kind: 'handoff',
          runId: state.runId,
          handoffPath: event.handoffPath,
        };
      }
      break;

    case 'handoff':
    case 'failed':
      // Terminal states — no transitions allowed
      break;
  }

  // Any state can transition to 'failed' via error event
  if (!nextState && event.kind === 'error') {
    nextState = {
      kind: 'failed',
      runId: state.runId,
      error: makeFailedError(event.code, event.message),
    };
  }

  if (!nextState) {
    // Illegal transition — return RunFailedError
    return makeFailedError(
      'ILLEGAL_TRANSITION',
      `Illegal transition from '${fromKind}' via event '${event.kind}'`,
    );
  }

  // Validate the to-kind is legal from the from-kind (belt-and-suspenders)
  // If nextState is a RunFailedError (has 'code'), persist nothing and return it
  if ('code' in nextState) {
    return nextState;
  }

  const runState = nextState as RunState;
  const toKind = runState.kind;

  if (!isLegalTransition(fromKind, toKind)) {
    return makeFailedError(
      'ILLEGAL_TRANSITION',
      `Transition ${fromKind} → ${toKind} is not in the legal transitions table`,
    );
  }

  // Atomically persist: UPDATE runs + INSERT state_transitions (ADR §1.5)
  const stateJson = JSON.stringify(runState);
  const eventJson = JSON.stringify(event);
  const runId = state.runId;

  const persist = db.transaction(() => {
    // updated_at column may not exist in all test schemas — use UPDATE without it first,
    // and silently succeed whether or not the column exists.
    try {
      db.prepare(
        `UPDATE runs SET current_state = json(?), updated_at = unixepoch() WHERE run_id = ?`
      ).run(stateJson, runId);
    } catch {
      // updated_at column absent in some test schemas — fall back
      db.prepare(
        `UPDATE runs SET current_state = json(?) WHERE run_id = ?`
      ).run(stateJson, runId);
    }

    db.prepare(
      `INSERT INTO state_transitions (run_id, from_kind, to_kind, event_json, ts)
       VALUES (?, ?, ?, json(?), unixepoch())`
    ).run(runId, fromKind, toKind, eventJson);
  });

  persist();

  return runState;
}
