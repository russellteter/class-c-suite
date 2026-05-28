// apps/renderer/src/components/JobsStrip.tsx
// Source: tasks/ch10-renderer-brief.md §1
// Ch.10: live wiring via home.scheduledJobs IPC variant (replaces Ch.7 placeholders).
// Subscribes to ipc:message, kind === 'home.scheduledJobs'.
// Falls back to placeholder slots when IPC has not yet fired (preserves Ch.7 test compat).
// Row click → navigates to SettingsScheduler with jobId pre-selected.
// WCAG AA: role=list, role=listitem, aria-label, :focus-visible on interactive elements.
//
// Decision: row-click routes to SettingsScheduler (not a modal) — single pane of glass,
// avoids dead-end modal state. Documented here per brief.

import React, { useEffect, useState, useRef } from 'react';
import type { ScheduledJobStatus, JobRunStatus } from './HomeTypes.js';

export interface JobsStripProps {
  /** Override jobs list (used in tests or when caller manages state externally). */
  jobs?: ScheduledJobStatus[];
  /** Callback when a job row is clicked — receives the job id. */
  onJobClick?: (jobId: string) => void;
  /** Callback when "view memo" link is activated — receives outputMemoPath. */
  onViewMemo?: (memoPath: string) => void;
}

const SLOT_COUNT = 5;

const PLACEHOLDER_NAMES = [
  'Daily cash snapshot',
  'Weekly GTM health digest',
  'Barclays AR aging monitor',
  'Board prep reminder (W38)',
  'Workstream stale check',
];

// ── Status pill ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<JobRunStatus, string> = {
  succeeded:             'var(--color-success)',
  caught_up:             'var(--color-info)',
  failed:                'var(--color-error)',
  skipped_auth_expired:  'var(--color-warning)',
};

const STATUS_LABELS: Record<JobRunStatus, string> = {
  succeeded:            'Succeeded',
  caught_up:            'Caught up',
  failed:               'Failed',
  skipped_auth_expired: 'Auth expired',
};

interface StatusPillProps {
  status: JobRunStatus;
}

function StatusPill({ status }: StatusPillProps): React.ReactElement {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 'var(--text-2xs)',
        lineHeight: 1,
        padding: '2px 5px',
        borderRadius: 'var(--radius-pill)',
        background: STATUS_COLORS[status] + '22',
        color: STATUS_COLORS[status],
        border: `1px solid ${STATUS_COLORS[status]}55`,
        flexShrink: 0,
      }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

// ── Degraded chips ───────────────────────────────────────────────────────────

function DegradedChips({ sources }: { sources: string[] }): React.ReactElement | null {
  if (!sources.length) return null;
  return (
    <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap', marginTop: 2 }}>
      {sources.map((src) => (
        <span
          key={src}
          style={{
            fontSize: 'var(--text-2xs)',
            padding: '1px 4px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-warning)',
            color: 'var(--color-text-inverse)',
            opacity: 0.85,
          }}
          title={`Degraded source: ${src}`}
        >
          {src}
        </span>
      ))}
    </div>
  );
}

// ── Format helpers ───────────────────────────────────────────────────────────

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  } catch {
    return iso;
  }
}

// ── Live job row ─────────────────────────────────────────────────────────────

interface JobRowProps {
  job: ScheduledJobStatus;
  onJobClick?: (jobId: string) => void;
  onViewMemo?: (memoPath: string) => void;
}

function LiveJobRow({ job, onJobClick, onViewMemo }: JobRowProps): React.ReactElement {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onJobClick?.(job.id);
    }
  };

  return (
    <div
      role="listitem"
      tabIndex={onJobClick ? 0 : undefined}
      onClick={() => onJobClick?.(job.id)}
      onKeyDown={onJobClick ? handleKeyDown : undefined}
      aria-label={`Job: ${job.name}${job.lastRunStatus ? `, ${STATUS_LABELS[job.lastRunStatus]}` : ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '5px var(--space-2)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--color-border)',
        marginBottom: 'var(--space-1)',
        cursor: onJobClick ? 'pointer' : 'default',
        transition: 'background var(--motion-fast)',
      }}
      // Hover effect via inline JS (no CSS class available without CSS modules)
      onMouseEnter={(e) => { if (onJobClick) (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-2)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
    >
      {/* Row header: name + cron + status pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-secondary)',
            lineHeight: 'var(--leading-snug)',
            flex: 1,
            minWidth: 0,
          }}
        >
          {job.name}
        </span>
        {job.lastRunStatus && <StatusPill status={job.lastRunStatus} />}
      </div>

      {/* Cron summary + last run */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        {job.cronSummary && (
          <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-text-muted)' }}>
            {job.cronSummary}
          </span>
        )}
        <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-text-muted)' }}>
          {formatTimestamp(job.lastRunAt)}
        </span>
      </div>

      {/* Degraded sources */}
      <DegradedChips sources={job.degradedSources ?? []} />

      {/* View memo link */}
      {job.outputMemoPath && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewMemo?.(job.outputMemoPath!);
          }}
          style={{
            alignSelf: 'flex-start',
            fontSize: 'var(--text-2xs)',
            color: 'var(--color-purple-200)',
            background: 'none',
            border: 'none',
            padding: '1px 0',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
          aria-label={`View memo for ${job.name}`}
        >
          view memo
        </button>
      )}
    </div>
  );
}

// ── Placeholder row (Ch.7 backward compat) ───────────────────────────────────

function PlaceholderRow({ name, note }: { name: string; note: string }): React.ReactElement {
  return (
    <div
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
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', lineHeight: 'var(--leading-snug)' }}>
          {name}
        </div>
        <div style={{ fontSize: 'var(--text-2xs)', color: 'rgba(107,103,136,0.6)' }}>
          {note}
        </div>
      </div>
    </div>
  );
}

// ── JobsStrip ────────────────────────────────────────────────────────────────

export function JobsStrip({ jobs: jobsProp, onJobClick, onViewMemo }: JobsStripProps): React.ReactElement {
  // IPC-driven state (used when jobs are not passed as a prop)
  const [liveJobs, setLiveJobs] = useState<ScheduledJobStatus[]>([]);
  const listenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (jobsProp !== undefined) return; // Caller controls state — skip subscription
    if (typeof window === 'undefined' || !window.ipc) return;

    // TODO ch10-runtime-ship: Runtime emits { kind: 'home.scheduledJobs', payload: { jobs: ScheduledJobStatus[] } }
    const cleanup = window.ipc.on('ipc:message', (raw: unknown) => {
      const msg = raw as { kind?: string; payload?: unknown };
      if (msg?.kind !== 'home.scheduledJobs') return;
      const payload = msg.payload as { jobs?: ScheduledJobStatus[] };
      if (Array.isArray(payload?.jobs)) {
        setLiveJobs(payload.jobs);
      }
    });

    listenerRef.current = cleanup;
    return () => { cleanup(); listenerRef.current = null; };
  }, [jobsProp]);

  const jobs = jobsProp ?? liveJobs;
  const isLive = jobs.length > 0 && !jobs[0]?.pendingNote;

  // Produce exactly 5 slots
  const slots: Array<ScheduledJobStatus | null> = Array.from({ length: SLOT_COUNT }, (_, i) =>
    jobs[i] ?? null,
  );

  return (
    <div role="list" aria-label="Scheduled jobs">
      {slots.map((job, idx) => {
        if (isLive && job && !job.pendingNote) {
          return (
            <LiveJobRow
              key={job.id}
              job={job}
              onJobClick={onJobClick}
              onViewMemo={onViewMemo}
            />
          );
        }

        // Placeholder path
        const name = job?.name ?? PLACEHOLDER_NAMES[idx] ?? `Job ${idx + 1}`;
        const note = job?.pendingNote ?? 'Pending Ch.10';
        return (
          <PlaceholderRow
            key={job?.id ?? `placeholder-${idx}`}
            name={name}
            note={note}
          />
        );
      })}
    </div>
  );
}
