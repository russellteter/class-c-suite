// apps/renderer/src/components/IterationCapSurface.tsx
// Source: ch6-renderer-brief.md §Shared components + conversation-pane-A.html
// The 3-button surface shown when iteration_count >= 3.
// Used by ConversationPane. Choice values match ADR §3.3 writeback.iteration.cap_reached payload.

import React from 'react';

export type CapChoice = 'commit' | 'reject' | 'escalate-full-rerun';

interface IterationCapSurfaceProps {
  writebackId: string;
  onChoose: (choice: CapChoice) => void;
  disabled?: boolean;
}

const CHOICES: { value: CapChoice; label: string; description: string; variant: 'primary' | 'danger' | 'neutral' }[] = [
  {
    value: 'commit',
    label: 'Commit as-is',
    description: 'Accept the latest draft without further iteration',
    variant: 'primary',
  },
  {
    value: 'reject',
    label: 'Reject',
    description: 'Archive this write-back and keep the current artifact',
    variant: 'danger',
  },
  {
    value: 'escalate-full-rerun',
    label: 'Full rerun',
    description: 'Discard this draft and trigger a fresh synthesis pass',
    variant: 'neutral',
  },
];

const variantStyles: Record<'primary' | 'danger' | 'neutral', React.CSSProperties> = {
  primary: {
    background: 'var(--color-purple-500)',
    color: 'var(--color-text-primary)',
    border: '1px solid var(--color-purple-400)',
  },
  danger: {
    background: 'rgba(197, 72, 72, 0.18)',
    color: 'var(--color-error)',
    border: '1px solid rgba(197, 72, 72, 0.4)',
  },
  neutral: {
    background: 'var(--color-surface-2)',
    color: 'var(--color-text-secondary)',
    border: '1px solid var(--color-border)',
  },
};

export function IterationCapSurface({ writebackId, onChoose, disabled }: IterationCapSurfaceProps): React.ReactElement {
  return (
    <div
      style={{
        background: 'rgba(201, 161, 75, 0.06)',
        border: '1px solid rgba(201, 161, 75, 0.25)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-4)',
        marginTop: 'var(--space-3)',
      }}
      role="region"
      aria-label="Iteration limit reached — choose next action"
    >
      <p style={{
        fontSize: 'var(--text-xs)',
        color: 'var(--color-gold-500)',
        marginBottom: 'var(--space-3)',
        lineHeight: 'var(--leading-normal)',
      }}>
        3-round limit reached for <code style={{ fontFamily: 'monospace' }}>{writebackId}</code>.
        Choose how to resolve:
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        {CHOICES.map(({ value, label, description, variant }) => (
          <button
            key={value}
            onClick={() => onChoose(value)}
            disabled={disabled}
            title={description}
            aria-label={`${label}: ${description}`}
            style={{
              ...variantStyles[variant],
              padding: 'var(--space-1) var(--space-3)',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              borderRadius: 'var(--radius-base)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1,
              transition: 'opacity var(--motion-fast)',
              outline: 'none',
            }}
            onFocus={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 2px var(--color-purple-500)';
            }}
            onBlur={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
