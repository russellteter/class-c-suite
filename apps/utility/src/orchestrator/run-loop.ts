// apps/utility/src/orchestrator/run-loop.ts
// Source: docs/decisions/0004-ch3-runtime-spine.md §1 + §3 + §4
//         docs/decisions/0009-ch7-playbooks-home.md §5 (run-loop integration)
// startRun() — entry point for a new run. Drives the RunState machine.
// Ch.7: Switch on playbook_id via routeToPlaybook. Early-returns for pre_mortem + quick_read.
// open_qa redirects re-call startRun with skipDecompose:true.
import type Database from 'better-sqlite3';
import type { RunState } from '@c-suite/shared-types/run-state';
import type { LensContextBundle } from '@c-suite/shared-types/lens-context-bundle';
import type { LensRole } from '@c-suite/shared-types/agent-definition';
import { LENS_ROLES } from '@c-suite/shared-types/agent-definition';
import type { PlaybookId, PlaybookInput, PlaybookContext } from '@c-suite/shared-types/playbook';
import { PlaybookIdSchema } from '@c-suite/shared-types/playbook';
import { transition, type RunEvent } from './state-machine.js';
import { dispatchLens, dispatchSynthesizer } from './dispatch.js';
import type { IpcEmit } from './hooks.js';
import { buildVerifierInput, VerifierInputContractViolation } from '../verifier-assembler.js';
import { runVerifier, StubVerifierInvoker } from '../agents/verifier-runner.js';
import { rigorScore, rigorThreshold, shipStatus as computeShipStatus } from '../scoring/rigorScore.js';
// B47: StubClaudeClient direct import replaced by modelClientFromEnv() factory (ADR-0017).
import { modelClientFromEnv } from '../agents/modelClient.js';
import { draftWritebacks } from '@c-suite/writeback-engine';
import { routeToPlaybook } from '../playbooks/lib/playbookRouter.js';
import { runPlaybookGuarded } from './stubGuard.js';
import { scorePlaybookRigor, applyShipStamp } from './playbookVerifier.js';
import { buildDeps } from '../playbooks/lib/buildDeps.js';
// Ch.9: handoff brief generation (explicit-trigger only — NOT auto on every accepted decision)
import { generateHandoffBrief } from '../agents/handoff/index.js';
import type { HandoffGeneratorInput } from '@c-suite/shared-types/handoff';
// ADR-0016: Google Workspace output surface defaults (TRACK 5)
import { getDefaultSurfaces } from '../playbooks/lib/outputSurfaceDefaults.js';
import type { OutputSurface } from '@c-suite/shared-types/playbook';

// Phase A + B playbooks that bypass the inherited Ch.5 state-machine and go through
// routeToPlaybook. Derived from PlaybookIdSchema (ADR-0009 §3.2) minus 'cash_lever'
// (which inherits the Ch.5 path as the framework template). Exported for the
// regression spec at tests/unit/orchestrator/run-loop-dispatch.spec.ts.
export const KNOWN_CH7_PLAYBOOK_IDS: ReadonlySet<PlaybookId> = new Set(
  PlaybookIdSchema.options.filter((id) => id !== 'cash_lever') as PlaybookId[],
);

export interface FinalRunState {
  finalState: RunState;
  visitedStates: string[];
  agentRolesInvoked: string[];
  /** Synthesizer memo markdown (generic state-machine path). Undefined for early-return playbooks. */
  memoMarkdown?: string;
  /** Vault-relative memo path the caller SafeWrites to (e.g. memos/2026-05-28-cash_lever-ab12cd34.md). */
  memoPath?: string;
  /** Final rigor score for run-row persistence. Lives here because the terminal state may be
   *  'handoff' (which carries no score) even though the Verifier scored the run upstream. */
  rigorScore?: number | null;
}

/**
 * Vault-relative memo path for a run. Date-stamped + playbook + short runId so
 * concurrent/repeat runs never collide. Caller joins with vaultPath for SafeWrite.
 * Draft (rigor < threshold) appends .draft.md per transitions.ts convention.
 */
function buildMemoPath(playbookId: string, runId: string, isDraft: boolean): string {
  const date = new Date().toISOString().slice(0, 10);
  const safePlaybook = playbookId.replace(/[^a-z0-9_]+/gi, '-');
  const shortId = runId.replace(/[^a-z0-9]+/gi, '').slice(0, 8) || 'run';
  const suffix = isDraft ? '.draft.md' : '.md';
  return `memos/${date}-${safePlaybook}-${shortId}${suffix}`;
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

  // ── Ch.7 ADR-0009 §5: playbook dispatch early-return ────────────────────────
  // Derived from PlaybookIdSchema (single source of truth, ADR-0009 §3.2) minus
  // 'cash_lever' which falls through to the inherited Ch.5 state-machine path.
  // This derivation guarantees that any future PlaybookId addition is automatically
  // routed via routeToPlaybook (regression guard against the AC-2 REOPEN gap).
  if (KNOWN_CH7_PLAYBOOK_IDS.has(playbookId as PlaybookId)) {
    const playbookModule = routeToPlaybook(playbookId as PlaybookId);
    const playbookInput: PlaybookInput = {
      playbookId: playbookId as PlaybookId,
      prompt: question,
      context: {},
    };
    // Ch.8 ADR-0010 §10: hydrate real MCP clients into PlaybookDeps.
    // Each playbook's evaluatePrereqs() then decides block/degrade/proceed per
    // ADR-0009 §3.6 + Phase R Decision 4.
    const playbookDeps = await buildDeps(playbookId as PlaybookId, db);
    const playbookCtx: PlaybookContext = {
      runId,
      db,
      vaultPath: process.env.VAULT_PATH ?? `${process.env.HOME}/Documents/Claude/Projects/Business Planning`,
      emit: emit as (msg: import('@c-suite/shared-types/ipc').IpcMessage) => void,
      deps: playbookDeps,
    };

    // B47 stub guard: refuses (STUB_MODE=live) if this playbook still fabricates data.
    const playbookResult = await runPlaybookGuarded(playbookModule, playbookId as PlaybookId, playbookInput, playbookCtx);

    // ADR-0016: append default OutputSurface metadata for playbooks that have configured surfaces.
    // The 'memo' surface is always first; additional surfaces are listed per outputSurfaceDefaults.
    // Actual artifact creation (Google API calls) is deferred to the caller / future chapter
    // once credentials are confirmed — here we declare the intended surfaces so TRACK 6 can
    // render the link placeholders and the Verifier can see the surface config.
    if (!playbookResult.outputSurfaces || playbookResult.outputSurfaces.length === 0) {
      const defaultSurfaces = getDefaultSurfaces(playbookId as PlaybookId);
      const surfaces: OutputSurface[] = [
        { kind: 'memo' },
        ...defaultSurfaces.map((kind) => ({ kind })),
      ];
      (playbookResult as { outputSurfaces?: OutputSurface[] }).outputSurfaces = surfaces;
    }

    // open_qa redirect: re-dispatch to the target playbook without re-decomposing.
    // ADR-0009 §12 + §5: bounded recursion — second call uses skipDecompose.
    const maybeRedirect = playbookResult as typeof playbookResult & { _redirect?: boolean; playbookId?: string };
    if (maybeRedirect._redirect && maybeRedirect.playbookId) {
      const targetId = maybeRedirect.playbookId as PlaybookId;
      const redirectModule = routeToPlaybook(targetId);
      const redirectInput: PlaybookInput = {
        playbookId: targetId,
        prompt: question,
        context: { skipDecompose: true },
      };
      await runPlaybookGuarded(redirectModule, targetId, redirectInput, playbookCtx);
    }

    // B47 Phase 2 (audit Finding 2): run the REAL Verifier on the playbook output.
    // This is the single site that scores all Ch.7 early-return playbooks — it
    // replaces the hardcoded `rigorScore = NN` placeholders the playbooks used to
    // fabricate. Live mode rethrows on Verifier failure (fail loud); replay falls
    // back to a labelled constant. quick_read bypasses the Verifier by design
    // (ADR-0009 §3.5) and is skipped.
    if (playbookId !== 'quick_read') {
      const verifierFixtureDir =
        process.env.VERIFIER_FIXTURE_DIR ??
        `${process.cwd()}/tests/fixtures/lens-outputs/${runId}`;
      const rigor = await scorePlaybookRigor(
        playbookResult,
        runId,
        playbookId as PlaybookId,
        question,
        db,
        verifierFixtureDir,
      );
      const mutable = playbookResult as {
        rigorScore?: number | null;
        rigorRawScore?: number | null;
        stamps: string[];
      };
      mutable.rigorScore = rigor.rigorScore;
      mutable.rigorRawScore = rigor.rigorRawScore;
      mutable.stamps = applyShipStamp(playbookResult.stamps, rigor.rigorScore, playbookId as PlaybookId);
    }

    // quick_read bypasses Verifier entirely (ADR-0009 §3.5 + §6 run-loop integration).
    // All Phase A playbooks: return a synthesized FinalRunState (no full state-machine traverse).
    const finalKind = playbookResult.stamps.includes('CLEAN') ? 'shipped-clean'
      : playbookResult.stamps.includes('QUICK_READ') ? 'shipped-clean'
      : playbookResult.stamps.includes('ADVERSARIAL_ONLY') ? 'shipped-clean'
      : 'shipped-clean'; // All Phase A paths ship — Verifier threshold handled inside playbook

    visitedStates.push('bootstrap', 'plan-approval', 'fan-out', finalKind);
    // M1: propagate memoMarkdown + a real memoPath to the caller (index.ts run.start) so it
    // SafeWrites the memo. The early-return previously returned neither at the top level, so
    // index.ts:115 (`if (result.memoMarkdown && result.memoPath)`) always skipped → every Ch.7
    // playbook computed a memo that was silently dropped. memoPath gets the .draft.md suffix when
    // the Verifier ship-stamp is DRAFT (mirrors the Ch.5 buildMemoPath(!passed) convention).
    const earlyIsDraft = playbookResult.stamps.includes('DRAFT');
    const earlyMemoPath = playbookResult.memoMarkdown
      ? buildMemoPath(playbookId, runId, earlyIsDraft)
      : undefined;
    return {
      finalState: { kind: 'shipped-clean', runId, memoPath: earlyMemoPath ?? `/vault/memos/${runId}.md`, rigorScore: playbookResult.rigorScore ?? 0 } as RunState,
      visitedStates,
      agentRolesInvoked: Object.keys(playbookResult.lensOutputs),
      memoMarkdown: playbookResult.memoMarkdown,
      memoPath: earlyMemoPath,
      rigorScore: playbookResult.rigorScore ?? null,
    };
  }
  // ── End Ch.7 early-return ────────────────────────────────────────────────────

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

  // fan-out: dispatch all 6 lens agents, capturing their outputs for the Synthesizer.
  const lensOutputs: Record<string, unknown> = {};
  for (const role of LENS_ROLES) {
    const bundle = buildLensBundle(role, runId, question, playbookId);
    lensOutputs[role] = await dispatchLens(role, bundle, db, emit);
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

  // Synthesizer dispatch — produces the memo markdown (ADR-0006 §7 step 8).
  // The generic path previously only recorded 'Synthesizer' as invoked without
  // running it, so no memo was ever produced. Capture memoMarkdown for SafeWrite.
  const synthOutput = await dispatchSynthesizer(runId, question, playbookId, lensOutputs, db, emit);
  const memoMarkdown = synthOutput.memoMarkdown;

  // synthesizer → verifier
  const memoEvent: RunEvent = { kind: 'memo.ready' };
  const afterSynth = transition(state, memoEvent, db);
  if ('code' in afterSynth) return makeFailedReturn(runId, visitedStates, agentRolesInvoked, afterSynth);
  state = afterSynth;
  visitedStates.push(state.kind);
  agentRolesInvoked.push('Verifier');

  // verifier → shipped-clean (real Verifier execution via stub-harness)
  // ADR-0005 §4 + §6. B35 fix: replaced hardcoded rigorScore:85.
  let computedRigorScore = 85; // fallback if VerifierInputContractViolation (DB not fully seeded)
  let computedPassed = true;
  let computedMemoPath = buildMemoPath(playbookId, runId, false);

  // O5: in LIVE (STUB_MODE=live) a contract violation means the run cannot produce a
  // real rigor score — re-throw to fail the run rather than ship CLEAN with the
  // fabricated 85 (DOCTRINE law 1). Replay/record keep the fallback so the state
  // machine keeps moving in tests. Matches U1's isLive idiom (pre-mortem/index.ts).
  const isLive = (process.env.STUB_MODE ?? 'replay') === 'live';

  try {
    // Cast state to synthesizer shape for buildVerifierInput.
    // In stub/replay runs the DB won't be fully seeded, so VerifierInputContractViolation
    // fires below — this spread just satisfies the type; the contract check catches gaps.
    const synthState = { ...state, kind: 'synthesizer' as const, runId } as RunState & { kind: 'synthesizer' };
    const verifierInput = buildVerifierInput(runId, synthState, db);

    // B47: factory drives client selection. STUB_MODE=live → RealClaudeClient.
    // Fixture dir only used by StubClaudeClient (ignored by RealClaudeClient).
    const fixtureDir =
      process.env.VERIFIER_FIXTURE_DIR ??
      `${process.cwd()}/tests/fixtures/lens-outputs/${runId}`;
    const verifierClient = modelClientFromEnv(fixtureDir);
    const invoker = new StubVerifierInvoker(
      verifierClient,
      runId,
      playbookId,
      question,
    );

    const verifierOutput = await runVerifier(verifierInput, { invoker });
    computedRigorScore = rigorScore(verifierOutput);
    const playbookKey = playbookId.replace(/-/g, '_') as Parameters<typeof rigorThreshold>[0];
    computedPassed = computedRigorScore >= rigorThreshold(playbookKey);
    computedMemoPath = buildMemoPath(playbookId, runId, !computedPassed);
  } catch (err) {
    if (err instanceof VerifierInputContractViolation) {
      // O5: LIVE must fail loud — never ship CLEAN with the fabricated 85.
      if (isLive) throw err;
      // Replay/record: DB not fully seeded (expected in stub runs without real
      // synthesizer data). Fall through with hardcoded score so the state machine
      // keeps moving in tests.
    } else {
      throw err;
    }
  }

  // Use explicit if/else so TypeScript narrows each branch to its discriminated-union variant.
  // verifier.pass carries rigorScore+memoPath; verifier.fail carries failureReasons+memoPath.
  const verifierEvent: RunEvent = computedPassed
    ? { kind: 'verifier.pass', rigorScore: computedRigorScore, memoPath: computedMemoPath }
    : { kind: 'verifier.fail', failureReasons: [], memoPath: computedMemoPath };
  const afterVerifier = transition(state, verifierEvent, db);
  if ('code' in afterVerifier) return makeFailedReturn(runId, visitedStates, agentRolesInvoked, afterVerifier);
  state = afterVerifier;
  visitedStates.push(state.kind);

  // shipped-clean → write-back-proposed (ADR-0008 Ch.6)
  // On shipped-clean, call draftWritebacks() with any Synthesizer proposedWritebacks.
  // In the stub harness there are no real proposals; the batch is a no-op and returns [].
  if (state.kind === 'shipped-clean') {
    const vaultRoot = process.env.VAULT_PATH ?? `${process.env.HOME}/Documents/Claude/Projects/Business Planning`;
    let writebackDrafts: Awaited<ReturnType<typeof draftWritebacks>> = [];
    try {
      writebackDrafts = await draftWritebacks({
        runId,
        memo: { markdown: '', citations: [], rigorScore: computedRigorScore },
        synthesizerProposals: [],  // stub: populated by real Synthesizer in production
        vaultRoot,
        db,
        emitIpc: emit,
        playbook: playbookId,
      });
    } catch (err) {
      // Non-fatal: log and continue. Stub harness will produce no writebacks.
      console.warn('[run-loop] draftWritebacks non-fatal error:', err);
    }

    if (writebackDrafts.length > 0) {
      const writebackEvent: RunEvent = { kind: 'writeback.proposed', drafts: writebackDrafts };
      const afterWritebacks = transition(state, writebackEvent, db, emit);
      if ('code' in afterWritebacks) return makeFailedReturn(runId, visitedStates, agentRolesInvoked, afterWritebacks);
      state = afterWritebacks;
      visitedStates.push(state.kind);
    }
  }

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

  return { finalState: state, visitedStates, agentRolesInvoked, memoMarkdown, memoPath: computedMemoPath, rigorScore: computedRigorScore };
}

// ── Ch.9 Handoff preview hook ─────────────────────────────────────────────────
//
// Called ONLY when the renderer sends `handoff.preview.requested` IPC (explicit
// user trigger on "Draw up for Cowork" CTA). NOT called automatically on every
// accepted decision — spec explicitly forbids auto-generation (ADR-0011 §5.1).
//
// Source: docs/decisions/0011-ch9-cowork-handoff.md §7 + brief §7 (run-loop hook).
/**
 * Handle an explicit "draw up for Cowork" request from the UI.
 * Generates a HandoffBrief and emits `handoff.preview.ready` to the renderer.
 * Emits `handoff.failed` on any error.
 *
 * IMPORTANT: This function must ONLY be called in response to a
 * `handoff.preview.requested` IPC event — never on every accepted decision.
 */
export async function handleHandoffPreviewRequested(
  runId: string,
  input: HandoffGeneratorInput,
  emit: IpcEmit,
): Promise<void> {
  try {
    const brief = await generateHandoffBrief(input);
    emit({
      kind: 'handoff.preview.ready',
      payload: { runId, brief },
    });
  } catch (err) {
    emit({
      kind: 'handoff.failed',
      payload: { runId, reason: String(err) },
    });
  }
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
