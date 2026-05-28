// apps/renderer/src/screens/SettingsScheduler.tsx
// Source: tasks/ch10-renderer-brief.md §2, ADR §10.3
// Settings → Scheduler view. Lists 5 known jobs with:
//   - Enable/disable toggle (writes to scheduler_settings via IPC)
//   - Last 10 run history (reads from scheduler.history IPC)
//   - "Reconnect <service>" button when auth is expired
// Navigation: reachable from Settings sidebar or from JobsStrip row click (jobId query param).
// WCAG AA: labeled fieldset, :focus-visible, aria-pressed on toggles, role=table for history.
// TODO ch10-runtime-ship: scheduler.settings.get / scheduler.settings.set / scheduler.history.get IPC channels

import React, { useEffect, useState, useCallback } from 'react';
import '../design/tokens.css';
import type { JobRunStatus } from '../components/HomeTypes.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface JobSetting {
  jobId: string;
  name: string;
  cronSummary: string;
  enabled: boolean;
  /** Populated when most recent run returned skipped_auth_expired. */
  authExpiredService?: string;
}

export interface JobHistoryEntry {
  runAt: string;
  status: JobRunStatus;
  durationMs?: number;
}

// ── Known jobs catalogue (renderer-local; Runtime owns authoritative list) ───

const KNOWN_JOBS: Omit<JobSetting, 'enabled'>[] = [
  { jobId: 'daily_cash_snapshot',      name: 'Daily cash snapshot',       cronSummary: 'Daily 6am ET' },
  { jobId: 'weekly_gtm_health',        name: 'Weekly GTM health digest',  cronSummary: 'Mondays 7am ET' },
  { jobId: 'barclays_ar_aging',        name: 'Barclays AR aging monitor', cronSummary: 'Daily 8am ET' },
  { jobId: 'board_prep_reminder',      name: 'Board prep reminder',       cronSummary: 'Thursdays 9am ET' },
  { jobId: 'workstream_stale_check',   name: 'Workstream stale check',    cronSummary: 'Daily 8:30am ET' },
];

// ── IPC stubs ──────────────────────────────────────────────────────────────

async function fetchJobSettings(): Promise<Record<string, boolean>> {
  // TODO ch10-runtime-ship: implement scheduler.settings.get IPC channel
  if (typeof window === 'undefined' || !window.ipc) return {};
  try {
    const result = await window.ipc.invoke('scheduler.settings.get');
    return (result as Record<string, boolean>) ?? {};
  } catch {
    return {};
  }
}

async function setJobEnabled(jobId: string, enabled: boolean): Promise<void> {
  // TODO ch10-runtime-ship: implement scheduler.settings.set IPC channel
  if (typeof window === 'undefined' || !window.ipc) return;
  await window.ipc.invoke('scheduler.settings.set', { jobId, enabled }).catch(() => {});
}

async function fetchJobHistory(jobId: string): Promise<JobHistoryEntry[]> {
  // TODO ch10-runtime-ship: implement scheduler.history.get IPC channel (returns last 10 runs)
  if (typeof window === 'undefined' || !window.ipc) return [];
  try {
    const result = await window.ipc.invoke('scheduler.history.get', { jobId, limit: 10 });
    return (result as JobHistoryEntry[]) ?? [];
  } catch {
    return [];
  }
}

// ── ToggleSwitch ────────────────────────────────────────────────────────────

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  id: string;
}

function ToggleSwitch({ checked, onChange, label, id }: ToggleSwitchProps): React.ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        style={{
          width: 36,
          height: 20,
          borderRadius: 'var(--radius-pill)',
          border: 'none',
          cursor: 'pointer',
          background: checked ? 'var(--color-success)' : 'var(--color-surface-3)',
          position: 'relative',
          transition: 'background var(--motion-fast)',
          flexShrink: 0,
          padding: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 18 : 2,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: 'var(--color-text-primary)',
            transition: 'left var(--motion-fast)',
          }}
          aria-hidden="true"
        />
      </button>
      <label htmlFor={id} style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
        {label}
      </label>
    </div>
  );
}

// ── RunHistory table ────────────────────────────────────────────────────────

const STATUS_COLOR: Record<JobRunStatus, string> = {
  succeeded:            'var(--color-success)',
  caught_up:            'var(--color-info)',
  failed:               'var(--color-error)',
  skipped_auth_expired: 'var(--color-warning)',
};

function RunHistoryTable({ history }: { history: JobHistoryEntry[] }): React.ReactElement {
  if (!history.length) {
    return <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>No run history yet.</p>;
  }

  return (
    <table
      style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}
      aria-label="Last 10 run history"
    >
      <thead>
        <tr>
          <th scope="col" style={{ textAlign: 'left', padding: '2px var(--space-2)', color: 'var(--color-text-muted)', fontWeight: 500 }}>Time</th>
          <th scope="col" style={{ textAlign: 'left', padding: '2px var(--space-2)', color: 'var(--color-text-muted)', fontWeight: 500 }}>Status</th>
          <th scope="col" style={{ textAlign: 'right', padding: '2px var(--space-2)', color: 'var(--color-text-muted)', fontWeight: 500 }}>Duration</th>
        </tr>
      </thead>
      <tbody>
        {history.map((entry, i) => (
          <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
            <td style={{ padding: '3px var(--space-2)' }}>
              {new Date(entry.runAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
            </td>
            <td style={{ padding: '3px var(--space-2)', color: STATUS_COLOR[entry.status] }}>
              {entry.status.replace(/_/g, ' ')}
            </td>
            <td style={{ padding: '3px var(--space-2)', textAlign: 'right' }}>
              {entry.durationMs != null ? `${(entry.durationMs / 1000).toFixed(1)}s` : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── JobSettingRow ────────────────────────────────────────────────────────────

interface JobSettingRowProps {
  job: JobSetting;
  selectedJobId: string | null;
  onToggle: (jobId: string, enabled: boolean) => void;
  onSelect: (jobId: string | null) => void;
  history: JobHistoryEntry[];
}

function JobSettingRow({ job, selectedJobId, onToggle, onSelect, history }: JobSettingRowProps): React.ReactElement {
  const isSelected = selectedJobId === job.jobId;

  const handleHeaderKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(isSelected ? null : job.jobId);
    }
  };

  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--space-3)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--color-surface-1)',
          cursor: 'pointer',
        }}
        role="button"
        tabIndex={0}
        aria-expanded={isSelected}
        aria-label={`${job.name} settings — ${isSelected ? 'collapse' : 'expand'}`}
        onClick={() => onSelect(isSelected ? null : job.jobId)}
        onKeyDown={handleHeaderKeyDown}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', fontWeight: 500 }}>{job.name}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{job.cronSummary}</div>
        </div>

        <ToggleSwitch
          id={`toggle-${job.jobId}`}
          checked={job.enabled}
          onChange={(v) => onToggle(job.jobId, v)}
          label={job.enabled ? 'Enabled' : 'Disabled'}
        />
      </div>

      {isSelected && (
        <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--color-surface-2)' }}>
          {job.authExpiredService && (
            <div style={{ marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)' }}>
                {job.authExpiredService} auth expired
              </span>
              <button
                type="button"
                style={{
                  fontSize: 'var(--text-xs)',
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-warning)',
                  background: 'none',
                  color: 'var(--color-warning)',
                  cursor: 'pointer',
                }}
                aria-label={`Reconnect ${job.authExpiredService}`}
                onClick={() => {
                  // TODO ch10-runtime-ship: invoke per-service auth reconnect IPC from Ch.8
                  if (typeof window !== 'undefined' && window.ipc) {
                    window.ipc.send({ kind: 'auth.reconnect', payload: { service: job.authExpiredService } }).catch?.(() => {});
                  }
                }}
              >
                Reconnect {job.authExpiredService}
              </button>
            </div>
          )}
          <RunHistoryTable history={history} />
        </div>
      )}
    </div>
  );
}

// ── SettingsScheduler screen ──────────────────────────────────────────────────

export interface SettingsSchedulerProps {
  /** Pre-select a specific job on mount (e.g. from JobsStrip row click). */
  selectedJobId?: string | null;
  onBack?: () => void;
  /** Injected job settings (for tests). */
  jobSettings?: JobSetting[];
  /** Injected history per jobId (for tests). */
  jobHistoryMap?: Record<string, JobHistoryEntry[]>;
}

export function SettingsScheduler({
  selectedJobId: initialJobId,
  onBack,
  jobSettings: jobSettingsProp,
  jobHistoryMap: jobHistoryMapProp,
}: SettingsSchedulerProps): React.ReactElement {
  const [jobs, setJobs] = useState<JobSetting[]>(() =>
    jobSettingsProp ?? KNOWN_JOBS.map((j) => ({ ...j, enabled: true }))
  );
  const [selectedJobId, setSelectedJobId] = useState<string | null>(initialJobId ?? null);
  const [historyMap, setHistoryMap] = useState<Record<string, JobHistoryEntry[]>>(jobHistoryMapProp ?? {});

  // Load settings from IPC on mount
  useEffect(() => {
    if (jobSettingsProp) return;
    fetchJobSettings().then((enabledMap) => {
      setJobs((prev) => prev.map((j) => ({
        ...j,
        enabled: enabledMap[j.jobId] ?? j.enabled,
      })));
    });
  }, [jobSettingsProp]);

  // Load history when a job row is expanded
  useEffect(() => {
    if (!selectedJobId || jobHistoryMapProp) return;
    if (historyMap[selectedJobId]) return; // Already loaded
    fetchJobHistory(selectedJobId).then((entries) => {
      setHistoryMap((prev) => ({ ...prev, [selectedJobId]: entries }));
    });
  }, [selectedJobId, historyMap, jobHistoryMapProp]);

  const handleToggle = useCallback(async (jobId: string, enabled: boolean) => {
    setJobs((prev) => prev.map((j) => j.jobId === jobId ? { ...j, enabled } : j));
    await setJobEnabled(jobId, enabled);
  }, []);

  return (
    <main
      aria-label="Settings: Scheduler"
      style={{
        padding: 'var(--space-6)',
        maxWidth: 640,
        margin: '0 auto',
        color: 'var(--color-text-primary)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              fontSize: 'var(--text-sm)',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
            }}
            aria-label="Back to Settings"
          >
            ← Back
          </button>
        )}
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, margin: 0 }}>Scheduler</h1>
      </div>

      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-5)' }}>
        Manage which scheduled jobs run and review their history.
      </p>

      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend style={{
          fontSize: 'var(--text-xs)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--color-text-muted)',
          marginBottom: 'var(--space-3)',
        }}>
          Jobs
        </legend>

        {jobs.map((job) => (
          <JobSettingRow
            key={job.jobId}
            job={job}
            selectedJobId={selectedJobId}
            onToggle={handleToggle}
            onSelect={setSelectedJobId}
            history={historyMap[job.jobId] ?? []}
          />
        ))}
      </fieldset>
    </main>
  );
}
