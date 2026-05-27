// apps/renderer/src/components/JobsStrip.tsx
// Source: tasks/ch7-renderer-brief.md §2
// Right-column scheduled jobs strip. Always renders 5 slots.
// Empty slots show grayed "Pending Ch.10" placeholders per brief.
// WCAG AA: role=list, aria-label.

import React from 'react';
import type { ScheduledJobStatus } from './HomeTypes.js';

export interface JobsStripProps {
  jobs: ScheduledJobStatus[];
}

const SLOT_COUNT = 5;

// Default placeholder slot names when jobs array is empty
const PLACEHOLDER_NAMES = [
  'Daily cash snapshot',
  'Weekly GTM health digest',
  'Barclays AR aging monitor',
  'Board prep reminder (W38)',
  'Workstream stale check',
];

export function JobsStrip({ jobs }: JobsStripProps): React.ReactElement {
  // Fill to exactly 5 slots
  const slots: Array<ScheduledJobStatus | null> = Array.from({ length: SLOT_COUNT }, (_, i) =>
    jobs[i] ?? null,
  );

  return (
    <div role="list" aria-label="Scheduled jobs">
      {slots.map((job, idx) => {
        const name = job?.name ?? PLACEHOLDER_NAMES[idx] ?? `Job ${idx + 1}`;
        const isPending = !job || !!job.pendingNote;
        const note = job?.pendingNote ?? 'Pending Ch.10';

        return (
          <div
            key={job?.id ?? `placeholder-${idx}`}
            role="listitem"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: '5px var(--space-2)',
              borderRadius: 'var(--radius-sm)',
              border: '1px dashed rgba(255,255,255,0.08)',
              marginBottom: 'var(--space-1)',
            }}
          >
            <span
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: 'var(--color-text-muted)',
                flexShrink: 0,
              }}
              aria-hidden="true"
            />
            <div>
              <div
                style={{
                  fontSize: 'var(--text-xs)',
                  color: isPending ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
                  lineHeight: 'var(--leading-snug)',
                }}
              >
                {name}
              </div>
              {isPending && (
                <div style={{ fontSize: 'var(--text-2xs)', color: 'rgba(107,103,136,0.6)' }}>
                  {note}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
