// apps/renderer/src/components/TripwireBanner.tsx
// Source: tasks/ch10-renderer-brief.md §1 — "Banner for tripwire flip"
// Subscribes to scheduler.tripwire.flipped IPC event.
// Renders top-of-home banner: severity color (yellow/red) + "<tripwire> flipped to <new state>".
// Click to open cash_lever memo if outputMemoPath is populated.
// WCAG AA: role=alert, aria-live=assertive, :focus-visible, dismiss button.
// TODO ch10-runtime-ship: Runtime emits { kind: 'scheduler.tripwire.flipped', payload: TripwireFlippedPayload }

import React, { useEffect, useState, useCallback } from 'react';

export type TripwireSeverity = 'warning' | 'critical';

export interface TripwireFlippedPayload {
  tripwire: string;
  newState: string;
  severity: TripwireSeverity;
  outputMemoPath?: string;
}

interface TripwireBannerProps {
  /** Inject payload directly (used in tests). */
  payload?: TripwireFlippedPayload | null;
  /** Callback to open memo viewer with the given path. */
  onOpenMemo?: (memoPath: string) => void;
}

const SEVERITY_COLORS: Record<TripwireSeverity, string> = {
  warning:  'var(--color-warning)',
  critical: 'var(--color-error)',
};

const SEVERITY_BG: Record<TripwireSeverity, string> = {
  warning:  'rgba(233,168,64,0.12)',
  critical: 'rgba(255,92,92,0.12)',
};

export function TripwireBanner({ payload: payloadProp, onOpenMemo }: TripwireBannerProps = {}): React.ReactElement | null {
  const [payload, setPayload] = useState<TripwireFlippedPayload | null>(payloadProp ?? null);
  const [dismissed, setDismissed] = useState(false);

  // IPC subscription
  useEffect(() => {
    if (payloadProp !== undefined) return;
    if (typeof window === 'undefined' || !window.ipc) return;

    // TODO ch10-runtime-ship: Runtime emits scheduler.tripwire.flipped when a tripwire transitions state
    const cleanup = window.ipc.on('ipc:message', (raw: unknown) => {
      const msg = raw as { kind?: string; payload?: unknown };
      if (msg?.kind !== 'scheduler.tripwire.flipped') return;
      const p = msg.payload as TripwireFlippedPayload;
      if (p && typeof p.tripwire === 'string') {
        setPayload(p);
        setDismissed(false);
      }
    });

    return cleanup;
  }, [payloadProp]);

  // React to prop changes (test mode)
  useEffect(() => {
    if (payloadProp) {
      setPayload(payloadProp);
      setDismissed(false);
    }
  }, [payloadProp]);

  const handleDismiss = useCallback(() => setDismissed(true), []);

  const handleMemoClick = useCallback(() => {
    if (payload?.outputMemoPath) onOpenMemo?.(payload.outputMemoPath);
  }, [payload, onOpenMemo]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setDismissed(true);
  }, []);

  if (!payload || dismissed) return null;

  const { tripwire, newState, severity, outputMemoPath } = payload;
  const borderColor = SEVERITY_COLORS[severity];
  const bg = SEVERITY_BG[severity];

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      data-testid="tripwire-banner"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-2) var(--space-4)',
        background: bg,
        borderBottom: `2px solid ${borderColor}`,
        color: 'var(--color-text-primary)',
      }}
      onKeyDown={handleKeyDown}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: borderColor,
          flexShrink: 0,
        }}
        aria-hidden="true"
      />

      <span style={{ fontSize: 'var(--text-sm)', flex: 1 }}>
        <strong>{tripwire}</strong> flipped to <strong>{newState}</strong>
      </span>

      {outputMemoPath && (
        <button
          type="button"
          onClick={handleMemoClick}
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-purple-200)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 4px',
            borderRadius: 'var(--radius-sm)',
            textDecoration: 'underline',
          }}
          aria-label={`Open memo for ${tripwire} tripwire`}
        >
          view memo
        </button>
      )}

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss tripwire banner"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-muted)',
          fontSize: 'var(--text-base)',
          lineHeight: 1,
          padding: '2px 4px',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        ×
      </button>
    </div>
  );
}
