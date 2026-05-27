// apps/renderer/src/screens/PlanApproval.tsx
// Source: docs/decisions/0006-ch5-cash-lever-slice.md §3 (plan-approval screen contract)
//         docs/decisions/0006-ch5-cash-lever-slice.md §8 AC-3, AC-10
//         docs/decisions/0009-ch7-playbooks-home.md §12.4 (Open Q&A countdown)
//         docs/research/phase-r-decisions.md Decision 6 (per-playbook countdown table)
// Renders RunPlan for user approval before MCP fan-out.

import React, { useState, useEffect, useRef } from 'react';
import { sendIpc } from '../ipc-client.js';

// Per-playbook auto-approve countdown (seconds). null = universal manual approval.
// Source: phase-r-decisions.md Decision 6 + ADR-0009 §12.4 for open_qa.
const COUNTDOWN_SECONDS: Record<string, number | null> = {
  strategic_option: null,        // high-stakes; manual
  restructure_decision: null,    // highest-stakes; manual
  board_narrative: null,         // external-facing; manual
  cash_lever: null,              // high-stakes (cash); manual
  gtm_realloc: 30,               // 30s countdown
  pre_mortem: 30,                // 30s countdown
  stakeholder_1_1: 5,            // pre-meeting; 5s
  quick_read: 0,                 // inline (no plan screen normally); 0s if shown
  open_qa: 10,                   // 10s countdown
};

// Ch5RunPlan inlined here to avoid cross-package import from renderer.
// Source: apps/utility/src/orchestrator/run-plan-builder.ts
export interface DegradationWarning {
  source: 'aws' | 'netsuite' | 'salesforce' | 'cash_model';
  severity: 'block' | 'degrade';
  message: string;
}

export interface Ch5RunPlan {
  playbook: string;
  question: string;
  lenses: string[];
  mcps: string[];
  tokenEstimate: number;
  memoPath: string;
  stamp?: 'AD-HOC';
  degradations: DegradationWarning[];
}

// ── Component ─────────────────────────────────────────────────────────────────

interface PlanApprovalProps {
  plan: Ch5RunPlan;
  onApprove?: () => void;
  onEdit?: (question: string) => void;
  onCancel?: () => void;
}

export function PlanApproval({ plan, onApprove, onEdit, onCancel }: PlanApprovalProps): React.ReactElement {
  const [editMode, setEditMode] = useState(false);
  const [editedQuestion, setEditedQuestion] = useState(plan.question);
  const initialCountdown = COUNTDOWN_SECONDS[plan.playbook] ?? null;
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(initialCountdown);
  const [paused, setPaused] = useState(false);
  const approvedRef = useRef(false);

  // Auto-approve countdown (Phase R Decision 6 + ADR-0009 §12.4).
  // Pauses on edit, cancellation, or any blocking-degradation guard.
  useEffect(() => {
    if (secondsRemaining === null) return;
    if (paused || editMode || approvedRef.current) return;
    if (plan.degradations?.some(d => d.severity === 'block')) return;
    if (secondsRemaining <= 0) {
      approvedRef.current = true;
      handleApprove();
      return;
    }
    const t = setTimeout(() => setSecondsRemaining(s => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsRemaining, paused, editMode, plan.degradations]);

  function handleApprove() {
    // AC-10: No MCP calls fire before run.plan.approved IPC is received.
    sendIpc({ kind: 'run.plan.approved', payload: { runId: crypto.randomUUID(), plan } } as never);
    onApprove?.();
  }

  function handleEdit() {
    setEditMode(true);
    setPaused(true);
  }

  function handleEditConfirm(e: React.FormEvent) {
    e.preventDefault();
    setEditMode(false);
    onEdit?.(editedQuestion.trim());
  }

  function handleCancel() {
    // AC-10: Cancel aborts cleanly — no MCP calls, RunState → idle.
    sendIpc({ kind: 'run.cancelled', payload: {} } as never);
    onCancel?.();
  }

  const memoFilename = plan.memoPath.split('/').pop() ?? plan.memoPath;

  return (
    <div style={{ fontFamily: 'var(--font-sans)', padding: '24px', minHeight: '100vh', background: 'var(--bg-surface)' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800, color: 'var(--navy)', marginBottom: '8px' }}>
            Review Run Plan
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
            Approve to start the C-Suite session, or edit your question.
          </p>
        </div>

        {/* Question */}
        <div className="glass-card" style={{ marginBottom: '16px' }} data-testid="plan-question">
          <div style={{ fontWeight: 700, fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
            Question
          </div>
          {editMode ? (
            <form onSubmit={handleEditConfirm} style={{ display: 'flex', gap: '8px' }}>
              <input
                className="glass-input"
                style={{ flex: 1 }}
                value={editedQuestion}
                onChange={e => setEditedQuestion(e.target.value)}
                autoFocus
                data-testid="plan-question-edit-input"
              />
              <button type="submit" className="glass-btn-primary" data-testid="plan-question-edit-confirm">
                Update
              </button>
            </form>
          ) : (
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--navy)', margin: 0, lineHeight: 1.5 }}>
              {plan.question}
            </p>
          )}
        </div>

        {/* Lenses + MCPs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div className="glass-card" data-testid="plan-lenses">
            <div style={{ fontWeight: 700, fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
              C-Suite Lenses
            </div>
            {plan.lenses.map(lens => (
              <div key={lens} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--purple)', display: 'inline-block' }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--navy)' }}>{lens}</span>
              </div>
            ))}
          </div>

          <div className="glass-card" data-testid="plan-mcps">
            <div style={{ fontWeight: 700, fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
              Data Sources (MCPs)
            </div>
            {plan.mcps.map(mcp => (
              <div key={mcp} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--gold)', display: 'inline-block' }} />
                <span style={{ fontSize: '12px', color: 'var(--navy)', fontFamily: 'var(--font-mono)' }}>{mcp}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Token estimate + memo path */}
        <div className="glass-card" style={{ marginBottom: '24px' }} data-testid="plan-meta">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                Token Estimate
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)', fontFamily: 'var(--font-mono)' }}>
                ~{plan.tokenEstimate.toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                Memo Output
              </div>
              <div style={{ fontSize: '12px', color: 'var(--navy)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                {memoFilename}
              </div>
            </div>
          </div>
        </div>

        {/* Degradation warnings (AC-10) */}
        {plan.degradations && plan.degradations.length > 0 && (
          <div style={{ marginBottom: '24px' }} data-testid="plan-degradations">
            {plan.degradations.map((d, i) => (
              <div
                key={i}
                className={d.severity === 'block' ? 'glass-badge--error' : 'glass-badge--warning'}
                style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: '8px', fontSize: '13px' }}
              >
                <strong>{d.source.toUpperCase()} {d.severity === 'block' ? '(BLOCKED)' : '(DEGRADED)'}:</strong>{' '}
                {d.message}
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '12px' }} data-testid="plan-actions">
          <button
            className="glass-btn-primary"
            onClick={handleApprove}
            disabled={plan.degradations?.some(d => d.severity === 'block')}
            data-testid="plan-approve-btn"
            style={{ flex: 1 }}
            aria-label={
              secondsRemaining !== null && !paused
                ? `Approve and run (auto-approves in ${secondsRemaining}s — click to pause)`
                : 'Approve and run'
            }
          >
            Approve &amp; Run
            {secondsRemaining !== null && !paused && secondsRemaining > 0 && (
              <span
                data-testid="plan-countdown"
                style={{ marginLeft: '8px', fontFamily: 'var(--font-mono)', fontSize: '12px', opacity: 0.8 }}
              >
                ({secondsRemaining}s)
              </span>
            )}
          </button>
          {secondsRemaining !== null && !paused && secondsRemaining > 0 && (
            <button
              className="glass-btn-secondary"
              onClick={() => setPaused(true)}
              data-testid="plan-pause-countdown-btn"
              aria-label="Pause auto-approve countdown"
            >
              Pause
            </button>
          )}
          <button
            className="glass-btn-secondary"
            onClick={handleEdit}
            data-testid="plan-edit-btn"
          >
            Edit Question
          </button>
          <button
            className="glass-btn-secondary"
            onClick={handleCancel}
            data-testid="plan-cancel-btn"
            style={{ color: 'var(--error)', borderColor: 'rgba(220,38,38,0.2)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
