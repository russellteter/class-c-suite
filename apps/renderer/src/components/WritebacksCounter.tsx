// apps/renderer/src/components/WritebacksCounter.tsx
// Source: tasks/ch7-renderer-brief.md §2
// Left-rail card: writeback count + click → WritebackPane navigation.
// WCAG AA: role=button, aria-label, :focus-visible via tokens.css.

import React from 'react';

export interface WritebacksCounterProps {
  count: number;
  onClick: () => void;
}

export function WritebacksCounter({ count, onClick }: WritebacksCounterProps): React.ReactElement {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${count} writeback${count !== 1 ? 's' : ''} awaiting review — open writebacks pane`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: '7px var(--space-2)',
        background: 'rgba(201,161,75,0.08)',
        border: '1px solid rgba(201,161,75,0.2)',
        borderRadius: 'var(--radius-base)',
        cursor: 'pointer',
        transition: 'background var(--motion-fast)',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(201,161,75,0.14)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(201,161,75,0.08)'; }}
    >
      <span
        style={{
          fontSize: 'var(--text-xl)',
          fontWeight: 700,
          color: 'var(--color-gold-500)',
          lineHeight: 1,
          minWidth: '24px',
          textAlign: 'center',
        }}
        aria-hidden="true"
      >
        {count}
      </span>
      <div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
          awaiting review
        </div>
        <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-text-muted)' }}>
          from last run
        </div>
      </div>
    </div>
  );
}
