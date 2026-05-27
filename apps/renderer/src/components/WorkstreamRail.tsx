// apps/renderer/src/components/WorkstreamRail.tsx
// Source: tasks/ch7-renderer-brief.md §2
// Left-rail workstream mini-view. Status pill as colored dot + ID + phase.
// WCAG AA: aria-label on each row dot; empty state per ADR §11.4.

import React from 'react';
import type { WorkstreamSummary } from './HomeTypes.js';

export interface WorkstreamRailProps {
  workstreams: WorkstreamSummary[];
}

const STATUS_COLOR: Record<WorkstreamSummary['status'], string> = {
  GREEN:  'var(--color-success)',
  YELLOW: 'var(--color-warning)',
  RED:    'var(--color-error)',
};

export function WorkstreamRail({ workstreams }: WorkstreamRailProps): React.ReactElement {
  if (workstreams.length === 0) {
    return (
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '0 var(--space-3)' }}>
        No workstreams yet — run a playbook to create the first one.
      </p>
    );
  }

  return (
    <div role="list" aria-label="Workstreams">
      {workstreams.map((ws) => (
        <div
          key={ws.id}
          role="listitem"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-1) var(--space-2)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: STATUS_COLOR[ws.status],
              flexShrink: 0,
            }}
            aria-label={ws.status}
            role="img"
          />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-2xs)',
              color: 'var(--color-text-secondary)',
              width: '38px',
              flexShrink: 0,
            }}
          >
            {ws.id}
          </span>
          <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-text-muted)' }}>
            {ws.phase}
          </span>
        </div>
      ))}
    </div>
  );
}
