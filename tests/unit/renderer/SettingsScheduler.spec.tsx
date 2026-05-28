// tests/unit/renderer/SettingsScheduler.spec.tsx
// Source: tasks/ch10-renderer-brief.md §5
// SettingsScheduler: 5 jobs render; toggle calls IPC; last-10-runs renders from fixture.

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import React from 'react';

vi.mock('../../../apps/renderer/src/design/tokens.css', () => ({}));

import { SettingsScheduler } from '../../../apps/renderer/src/screens/SettingsScheduler.js';
import type { JobSetting, JobHistoryEntry } from '../../../apps/renderer/src/screens/SettingsScheduler.js';

afterEach(cleanup);

const FIXTURE_JOBS: JobSetting[] = [
  { jobId: 'daily_cash_snapshot',    name: 'Daily cash snapshot',       cronSummary: 'Daily 6am ET',      enabled: true },
  { jobId: 'weekly_gtm_health',      name: 'Weekly GTM health digest',  cronSummary: 'Mondays 7am ET',    enabled: true },
  { jobId: 'barclays_ar_aging',      name: 'Barclays AR aging monitor', cronSummary: 'Daily 8am ET',      enabled: false },
  { jobId: 'board_prep_reminder',    name: 'Board prep reminder',       cronSummary: 'Thursdays 9am ET',  enabled: true, authExpiredService: 'netsuite' },
  { jobId: 'workstream_stale_check', name: 'Workstream stale check',    cronSummary: 'Daily 8:30am ET',   enabled: true },
];

const HISTORY_FIXTURE: JobHistoryEntry[] = [
  { runAt: '2026-05-27T06:00:00Z', status: 'succeeded',  durationMs: 4500 },
  { runAt: '2026-05-26T06:00:00Z', status: 'failed',     durationMs: 1200 },
  { runAt: '2026-05-25T06:00:00Z', status: 'caught_up',  durationMs: 3200 },
  { runAt: '2026-05-24T06:00:00Z', status: 'succeeded',  durationMs: 5100 },
];

const HISTORY_MAP: Record<string, JobHistoryEntry[]> = {
  daily_cash_snapshot: HISTORY_FIXTURE,
};

describe('SettingsScheduler — job listing (ch10-renderer-brief §5)', () => {

  it('renders heading "Scheduler"', () => {
    render(<SettingsScheduler jobSettings={FIXTURE_JOBS} />);
    expect(screen.getByRole('heading', { name: /scheduler/i })).toBeInTheDocument();
  });

  it('renders all 5 job names', () => {
    render(<SettingsScheduler jobSettings={FIXTURE_JOBS} />);
    for (const job of FIXTURE_JOBS) {
      expect(screen.getByText(job.name)).toBeInTheDocument();
    }
  });

  it('renders cron summary for each job', () => {
    render(<SettingsScheduler jobSettings={FIXTURE_JOBS} />);
    expect(screen.getByText('Daily 6am ET')).toBeInTheDocument();
    expect(screen.getByText('Mondays 7am ET')).toBeInTheDocument();
  });

  it('renders 5 toggle switches (one per job)', () => {
    render(<SettingsScheduler jobSettings={FIXTURE_JOBS} />);
    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(5);
  });

  it('toggle for disabled job (barclays) shows aria-checked=false', () => {
    render(<SettingsScheduler jobSettings={FIXTURE_JOBS} />);
    const barclaysToggle = screen.getByRole('switch', { name: /disabled/i });
    // Only the disabled (barclays) switch should have aria-checked=false
    const falseToggles = screen.getAllByRole('switch').filter((s) => s.getAttribute('aria-checked') === 'false');
    expect(falseToggles).toHaveLength(1);
  });

  it('has accessible main landmark with aria-label', () => {
    render(<SettingsScheduler jobSettings={FIXTURE_JOBS} />);
    expect(screen.getByRole('main', { name: /settings.*scheduler/i })).toBeInTheDocument();
  });

  it('renders fieldset with legend "Jobs"', () => {
    render(<SettingsScheduler jobSettings={FIXTURE_JOBS} />);
    expect(screen.getByRole('group', { name: /jobs/i })).toBeInTheDocument();
  });

  it('back button is present when onBack prop is supplied', () => {
    render(<SettingsScheduler jobSettings={FIXTURE_JOBS} onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
  });

  it('clicking back button calls onBack', () => {
    const onBack = vi.fn();
    render(<SettingsScheduler jobSettings={FIXTURE_JOBS} onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });

});

describe('SettingsScheduler — toggle IPC (ch10-renderer-brief §5)', () => {

  let mockInvoke: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockInvoke = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, 'ipc', {
      value: {
        send: vi.fn(),
        on: vi.fn(() => () => {}),
        invoke: mockInvoke,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
    // Reset window.ipc
    Object.defineProperty(window, 'ipc', { value: undefined, writable: true, configurable: true });
  });

  it('clicking toggle calls window.ipc.invoke with scheduler.settings.set', async () => {
    render(<SettingsScheduler jobSettings={FIXTURE_JOBS} />);
    const switches = screen.getAllByRole('switch');
    // Click the first toggle (daily_cash_snapshot, currently enabled → disable)
    fireEvent.click(switches[0]!);
    // Wait for async invoke
    await vi.waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('scheduler.settings.set', {
        jobId: 'daily_cash_snapshot',
        enabled: false,
      });
    });
  });

  it('toggle updates aria-checked state optimistically', () => {
    render(<SettingsScheduler jobSettings={FIXTURE_JOBS} />);
    const switches = screen.getAllByRole('switch');
    const firstSwitch = switches[0]!;
    expect(firstSwitch.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(firstSwitch);
    expect(firstSwitch.getAttribute('aria-checked')).toBe('false');
  });

});

describe('SettingsScheduler — run history (ch10-renderer-brief §5)', () => {

  it('shows "No run history yet" when history map is empty', () => {
    render(<SettingsScheduler jobSettings={FIXTURE_JOBS} selectedJobId="daily_cash_snapshot" jobHistoryMap={{}} />);
    expect(screen.getByText(/no run history yet/i)).toBeInTheDocument();
  });

  it('renders history table when history entries are provided', () => {
    render(<SettingsScheduler jobSettings={FIXTURE_JOBS} selectedJobId="daily_cash_snapshot" jobHistoryMap={HISTORY_MAP} />);
    expect(screen.getByRole('table', { name: /last 10 run history/i })).toBeInTheDocument();
  });

  it('renders correct number of history rows', () => {
    render(<SettingsScheduler jobSettings={FIXTURE_JOBS} selectedJobId="daily_cash_snapshot" jobHistoryMap={HISTORY_MAP} />);
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    // 1 header row + 4 data rows
    expect(rows).toHaveLength(5);
  });

  it('history table shows "succeeded" status text', () => {
    render(<SettingsScheduler jobSettings={FIXTURE_JOBS} selectedJobId="daily_cash_snapshot" jobHistoryMap={HISTORY_MAP} />);
    expect(screen.getByText('succeeded')).toBeInTheDocument();
  });

  it('history table shows duration in seconds format', () => {
    render(<SettingsScheduler jobSettings={FIXTURE_JOBS} selectedJobId="daily_cash_snapshot" jobHistoryMap={HISTORY_MAP} />);
    expect(screen.getByText('4.5s')).toBeInTheDocument();
  });

});

describe('SettingsScheduler — auth-expired reconnect button (ch10-renderer-brief §5)', () => {

  it('shows "Reconnect netsuite" button for job with authExpiredService', () => {
    // Expand the board_prep_reminder job row
    render(<SettingsScheduler jobSettings={FIXTURE_JOBS} selectedJobId="board_prep_reminder" jobHistoryMap={{}} />);
    expect(screen.getByRole('button', { name: /reconnect netsuite/i })).toBeInTheDocument();
  });

  it('auth expired label is visible in expanded row', () => {
    render(<SettingsScheduler jobSettings={FIXTURE_JOBS} selectedJobId="board_prep_reminder" jobHistoryMap={{}} />);
    expect(screen.getByText(/netsuite auth expired/i)).toBeInTheDocument();
  });

});
