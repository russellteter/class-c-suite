// apps/renderer/src/screens/RoundTable.tsx
// Source: docs/decisions/0006-ch5-cash-lever-slice.md §4 (round-table screen contract)
//         docs/decisions/0006-ch5-cash-lever-slice.md §8 AC-9
//         docs/architecture/ui.md §round-table honest-signal contract
//
// Honest-signal rule (ADR-0006 §4.3):
//   — (em-dash) is the default for every uncomputed metric.
//   'sources: 0' is ambiguous. 'sources: —' is honest.
//   verified/coverage: —/— and —% until verifier.score fires.

import React, { useCallback, useReducer } from 'react';
import { useRunEvents } from '../ipc/subscriptions.js';
import type { RunIpcEvent } from '../ipc/subscriptions.js';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LensNode {
  role: 'CEO' | 'CFO' | 'CRO' | 'CMO' | 'CPO' | 'COS';
  label: string;
  active: boolean; // lit per playbook
}

interface RoundTableState {
  /** null = display as em-dash (—); NEVER 0 before first tool.post */
  sources: number | null;
  /** null = display as —/— until verifier.score */
  verified: string | null;
  /** null = display as —% until verifier.score */
  coverage: string | null;
  /** Which lens nodes are pulsing (active) */
  pulsingAgents: Set<string>;
  /** Which tool calls are in-flight */
  toolCallsInFlight: Set<string>;
  /** Verifier score (0–100) or null */
  verifierScore: number | null;
  /** Verifier status */
  verifierStatus: 'clean' | 'draft' | null;
}

type RoundTableAction =
  | { type: 'agent.start'; agent: string }
  | { type: 'agent.tool.pre'; callId: string }
  | { type: 'agent.tool.post'; callId: string }
  | { type: 'agent.complete'; agent: string }
  | { type: 'verifier.score'; verifiedCount: number; totalCount: number; coveragePct: number; score: number; status: 'clean' | 'draft' };

function roundTableReducer(state: RoundTableState, action: RoundTableAction): RoundTableState {
  switch (action.type) {
    case 'agent.start':
      return { ...state, pulsingAgents: new Set([...state.pulsingAgents, action.agent]) };

    case 'agent.tool.pre':
      return { ...state, toolCallsInFlight: new Set([...state.toolCallsInFlight, action.callId]) };

    case 'agent.tool.post': {
      const newInFlight = new Set(state.toolCallsInFlight);
      newInFlight.delete(action.callId);
      return {
        ...state,
        // sources increments from null (first tool.post: null → 1, not 0 → 1)
        sources: (state.sources ?? 0) + 1,
        toolCallsInFlight: newInFlight,
      };
    }

    case 'agent.complete': {
      const newPulsing = new Set(state.pulsingAgents);
      newPulsing.delete(action.agent);
      return { ...state, pulsingAgents: newPulsing };
    }

    case 'verifier.score':
      return {
        ...state,
        verified: `${action.verifiedCount}/${action.totalCount}`,
        coverage: `${action.coveragePct}%`,
        verifierScore: action.score,
        verifierStatus: action.status,
      };

    default:
      return state;
  }
}

function initialRoundTableState(): RoundTableState {
  return {
    sources: null,
    verified: null,
    coverage: null,
    pulsingAgents: new Set(),
    toolCallsInFlight: new Set(),
    verifierScore: null,
    verifierStatus: null,
  };
}

// ── Display helpers (honest-signal contract) ──────────────────────────────────

function displaySources(s: RoundTableState): string {
  return s.sources === null ? '—' : String(s.sources);
}

function displayVerified(s: RoundTableState): string {
  return s.verified ?? '—/—';
}

function displayCoverage(s: RoundTableState): string {
  return s.coverage ?? '—%';
}

function verifierInkColor(score: number | null): string {
  if (score === null) return 'var(--gray-500)';
  if (score >= 70) return 'var(--success-ink)'; // clean (teal)
  if (score >= 50) return 'var(--warning-ink)'; // amber
  return 'var(--error-ink)';                     // red
}

// ── Component ─────────────────────────────────────────────────────────────────

interface RoundTableProps {
  runId: string;
  /** Lens roles lit for this playbook (defaults to cash_lever: CFO + COS) */
  activeLenses?: string[];
}

const DEFAULT_CASH_LEVER_LENSES = ['CFO', 'COS'];

const ALL_LENS_NODES: LensNode[] = [
  { role: 'CEO', label: 'CEO',  active: false },
  { role: 'CFO', label: 'CFO',  active: false },
  { role: 'CRO', label: 'CRO',  active: false },
  { role: 'CMO', label: 'CMO',  active: false },
  { role: 'CPO', label: 'CPO',  active: false },
  { role: 'COS', label: 'COS',  active: false },
];

export function RoundTable({ runId, activeLenses = DEFAULT_CASH_LEVER_LENSES }: RoundTableProps): React.ReactElement {
  const [state, dispatch] = useReducer(roundTableReducer, undefined, initialRoundTableState);

  const handleEvent = useCallback((event: RunIpcEvent) => {
    switch (event.type) {
      case 'agent.start':
        dispatch({ type: 'agent.start', agent: event.agent });
        break;
      case 'agent.tool.pre':
        dispatch({ type: 'agent.tool.pre', callId: event.callId });
        break;
      case 'agent.tool.post':
        dispatch({ type: 'agent.tool.post', callId: event.callId });
        break;
      case 'agent.complete':
        dispatch({ type: 'agent.complete', agent: event.agent });
        break;
      case 'verifier.score':
        dispatch({
          type: 'verifier.score',
          verifiedCount: event.verifiedCount,
          totalCount: event.totalCount,
          coveragePct: event.coveragePct,
          score: event.score,
          status: event.status,
        });
        break;
    }
  }, []);

  useRunEvents(runId, handleEvent);

  const lenses = ALL_LENS_NODES.map(n => ({
    ...n,
    active: activeLenses.includes(n.role),
  }));

  const liveCount = state.toolCallsInFlight.size;
  const running = liveCount > 0 || state.pulsingAgents.size > 0;
  const runPhase = state.verifierScore !== null ? 'COMPLETE' : running ? 'RUNNING' : '00:00';
  const sourcesEm = state.sources === null;
  const verifiedEm = state.verified === null;
  const coverageEm = state.coverage === null;

  return (
    <div
      className="cs-roundtable"
      style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--gray-50)', fontFamily: 'var(--font-sans)' }}
      data-testid="round-table"
    >
      {/* Editorial header with gradient underline */}
      <header className="cs-header" style={{ display: 'block', padding: '14px 22px' }}>
        <h1>Cash Lever vs Trough</h1>
        <span className="cs-stamp" style={{ display: 'block', marginTop: '3px' }} data-testid="run-stamp">
          RUN {runId} · {runPhase}
        </span>
      </header>

      {/* Substance ribbon — KPI strip (honest-signal contract AC-9) */}
      <div
        className="cs-kpi-strip"
        style={{ gridTemplateColumns: 'repeat(3, 1fr)', borderRadius: 0, borderLeft: 'none', borderRight: 'none', position: 'relative' }}
        data-testid="substance-ribbon"
      >
        <div className="cs-kpi">
          <span className="lbl">Sources</span>
          <div className={`val${sourcesEm ? ' em' : ''}`} data-testid="ribbon-sources">{displaySources(state)}</div>
        </div>
        <div className="cs-kpi">
          <span className="lbl">Verified</span>
          <div className={`val${verifiedEm ? ' em' : ''}`} data-testid="ribbon-verified">{displayVerified(state)}</div>
        </div>
        <div className="cs-kpi">
          <span className="lbl">Coverage</span>
          <div className={`val${coverageEm ? ' em' : ''}`} data-testid="ribbon-coverage">{displayCoverage(state)}</div>
        </div>
        {liveCount > 0 && (
          <span
            className="cs-pill live cs-pulsing"
            style={{ position: 'absolute', top: '14px', right: '22px' }}
            data-testid="live-tool-badge"
          >
            {liveCount} tool call{liveCount !== 1 ? 's' : ''} live
          </span>
        )}
      </div>

      <div className="cs-rt-body" style={{ flex: 1, padding: '20px 22px', overflow: 'auto' }}>
        {/* Active lenses */}
        <span className="cs-eyebrow">Active Lenses</span>
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '10px' }}
          data-testid="lens-nodes"
        >
          {lenses.map(lens => {
            const isPulsing = state.pulsingAgents.has(lens.role);
            return (
              <div
                key={lens.role}
                className={`cs-node ${lens.active ? 'on' : 'dim'}`}
                data-testid={`lens-node-${lens.role}`}
              >
                <div className={`circle${isPulsing ? ' cs-pulsing' : ''}`}>{lens.role}</div>
                <div className="role">{lens.label}</div>
                {isPulsing && <div className="run">running</div>}
              </div>
            );
          })}
        </div>

        {/* Synthesizer + Verifier downstream nodes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px' }}>
          <div className="cs-node" style={{ textAlign: 'center' }} data-testid="synthesizer-node">
            <div className="t">Synthesizer</div>
            <div className="s">{running ? 'Awaiting lens outputs' : 'Weaving lens outputs into memo'}</div>
          </div>
          <div
            className="cs-node"
            style={{ textAlign: 'center', borderColor: state.verifierStatus === 'clean' ? 'var(--success)' : undefined }}
            data-testid="verifier-node"
          >
            <div className="t" style={{ color: verifierInkColor(state.verifierScore) }}>
              {state.verifierScore !== null ? `Verifier · ${state.verifierScore}/100` : 'Verifier'}
            </div>
            <div className="s">
              {state.verified !== null
                ? `${state.verified} claims verified`
                : 'Pending'}
            </div>
            {state.verifierStatus && (
              <span
                className={`cs-pill ${state.verifierStatus === 'clean' ? 'success' : 'warning'}`}
                style={{ marginTop: '6px' }}
                data-testid="verifier-verdict"
              >
                {state.verifierStatus === 'clean' ? 'Clean' : 'Draft'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
