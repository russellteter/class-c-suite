// apps/renderer/src/components/CatchupToast.tsx
// Source: tasks/ch10-renderer-brief.md §1 — "Toast for catch-up"
// Subscribes to scheduler.catchup.summary IPC event.
// Displays toast: "Caught up N missed jobs since last launch."
// Auto-dismisses after 5s; click to expand detail.
// WCAG AA: role=alert, aria-live=assertive, :focus-visible.
// TODO ch10-runtime-ship: Runtime emits { kind: 'scheduler.catchup.summary', payload: { missedCount: number, jobNames: string[] } }

import React, { useEffect, useState, useCallback, useRef } from 'react';

export interface CatchupSummaryPayload {
  missedCount: number;
  jobNames: string[];
}

interface CatchupToastProps {
  /** Inject event payload directly (used in tests). */
  payload?: CatchupSummaryPayload | null;
}

export function CatchupToast({ payload: payloadProp }: CatchupToastProps = {}): React.ReactElement | null {
  const [payload, setPayload] = useState<CatchupSummaryPayload | null>(payloadProp ?? null);
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // IPC subscription
  useEffect(() => {
    if (payloadProp !== undefined) return;
    if (typeof window === 'undefined' || !window.ipc) return;

    // TODO ch10-runtime-ship: Runtime emits scheduler.catchup.summary on app launch when missed jobs exist
    const cleanup = window.ipc.on('ipc:message', (raw: unknown) => {
      const msg = raw as { kind?: string; payload?: unknown };
      if (msg?.kind !== 'scheduler.catchup.summary') return;
      const p = msg.payload as CatchupSummaryPayload;
      if (p && typeof p.missedCount === 'number') {
        setPayload(p);
        setVisible(true);
        setExpanded(false);
      }
    });

    return cleanup;
  }, [payloadProp]);

  // Show when prop changes (test mode)
  useEffect(() => {
    if (payloadProp) {
      setPayload(payloadProp);
      setVisible(true);
      setExpanded(false);
    }
  }, [payloadProp]);

  // Auto-dismiss after 5s
  useEffect(() => {
    if (!visible) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 5000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [visible, payload]);

  const handleClick = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setExpanded((e) => !e);
    setVisible(true);
  }, []);

  const handleDismiss = useCallback(() => setVisible(false), []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setVisible(false);
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); }
  }, [handleClick]);

  if (!visible || !payload) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      style={{
        position: 'fixed',
        bottom: 'var(--space-6)',
        right: 'var(--space-6)',
        zIndex: 'var(--z-toast)',
        maxWidth: 320,
        background: 'var(--color-navy-700)',
        border: '1px solid var(--color-border-strong)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        padding: 'var(--space-3) var(--space-4)',
        color: 'var(--color-text-primary)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
        <button
          type="button"
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            textAlign: 'left',
            color: 'inherit',
          }}
          aria-expanded={expanded}
          aria-label={`Caught up ${payload.missedCount} missed job${payload.missedCount !== 1 ? 's' : ''}. Click to expand.`}
        >
          <span style={{ fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-snug)' }}>
            Caught up {payload.missedCount} missed job{payload.missedCount !== 1 ? 's' : ''} since last launch.
          </span>
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss notification"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-muted)',
            fontSize: 'var(--text-sm)',
            lineHeight: 1,
            padding: '2px 4px',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          ×
        </button>
      </div>

      {expanded && payload.jobNames.length > 0 && (
        <ul
          style={{
            margin: 'var(--space-2) 0 0',
            padding: '0 0 0 var(--space-4)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-secondary)',
            lineHeight: 'var(--leading-relaxed)',
          }}
          aria-label="Caught up jobs"
        >
          {payload.jobNames.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
