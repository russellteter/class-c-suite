// tests/unit/renderer/JobsStrip.live.spec.tsx
// Source: tasks/ch10-renderer-brief.md §5
// Ch.10 live-wiring specs for JobsStrip.
// Tests: 5 rows render; placeholders replaced; "view memo" link; degraded chips; accessibility.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';

vi.mock('../../../apps/renderer/src/design/tokens.css', () => ({}));

import { JobsStrip } from '../../../apps/renderer/src/components/JobsStrip.js';
import type { ScheduledJobStatus } from '../../../apps/renderer/src/components/HomeTypes.js';

afterEach(cleanup);

const LIVE_JOBS: ScheduledJobStatus[] = [
  {
    id: 'job-001',
    name: 'Daily cash snapshot',
    cronSummary: 'Daily 6am ET',
    lastRunAt: '2026-05-27T06:00:00Z',
    lastRunStatus: 'succeeded',
    degradedSources: [],
  },
  {
    id: 'job-002',
    name: 'Weekly GTM health digest',
    cronSummary: 'Mondays 7am ET',
    lastRunAt: '2026-05-26T07:00:00Z',
    lastRunStatus: 'failed',
    degradedSources: ['salesforce'],
  },
  {
    id: 'job-003',
    name: 'Barclays AR aging monitor',
    cronSummary: 'Daily 8am ET',
    lastRunAt: '2026-05-27T08:00:00Z',
    lastRunStatus: 'caught_up',
    degradedSources: [],
    outputMemoPath: '/vault/memos/barclays-ar-2026-05-27.md',
  },
  {
    id: 'job-004',
    name: 'Board prep reminder',
    cronSummary: 'Thursdays 9am ET',
    lastRunAt: '2026-05-22T09:00:00Z',
    lastRunStatus: 'skipped_auth_expired',
    degradedSources: [],
    authExpiredService: 'netsuite',
  },
  {
    id: 'job-005',
    name: 'Workstream stale check',
    cronSummary: 'Daily 8:30am ET',
    lastRunAt: '2026-05-27T08:30:00Z',
    lastRunStatus: 'succeeded',
    degradedSources: ['chorus', 'powerbi'],
  },
];

describe('JobsStrip — live data rendering (ch10-renderer-brief §5)', () => {

  it('renders exactly 5 listitem rows from live jobs fixture', () => {
    render(<JobsStrip jobs={LIVE_JOBS} />);
    const list = screen.getByRole('list', { name: /scheduled jobs/i });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(5);
  });

  it('renders each job name in its row', () => {
    render(<JobsStrip jobs={LIVE_JOBS} />);
    for (const job of LIVE_JOBS) {
      expect(screen.getByText(job.name)).toBeInTheDocument();
    }
  });

  it('renders cron summary for each live job', () => {
    render(<JobsStrip jobs={LIVE_JOBS} />);
    expect(screen.getByText('Daily 6am ET')).toBeInTheDocument();
    expect(screen.getByText('Mondays 7am ET')).toBeInTheDocument();
  });

  it('shows "view memo" button only for job with outputMemoPath', () => {
    render(<JobsStrip jobs={LIVE_JOBS} />);
    const memoButtons = screen.getAllByRole('button', { name: /view memo/i });
    expect(memoButtons).toHaveLength(1);
    expect(memoButtons[0]).toHaveAccessibleName(/barclays ar/i);
  });

  it('"view memo" button calls onViewMemo with the correct path', () => {
    const onViewMemo = vi.fn();
    render(<JobsStrip jobs={LIVE_JOBS} onViewMemo={onViewMemo} />);
    const memoBtn = screen.getByRole('button', { name: /view memo for barclays/i });
    fireEvent.click(memoBtn);
    expect(onViewMemo).toHaveBeenCalledWith('/vault/memos/barclays-ar-2026-05-27.md');
  });

  it('clicking "view memo" does not trigger the row onJobClick', () => {
    const onJobClick = vi.fn();
    const onViewMemo = vi.fn();
    render(<JobsStrip jobs={LIVE_JOBS} onJobClick={onJobClick} onViewMemo={onViewMemo} />);
    const memoBtn = screen.getByRole('button', { name: /view memo/i });
    fireEvent.click(memoBtn);
    expect(onJobClick).not.toHaveBeenCalled();
    expect(onViewMemo).toHaveBeenCalledOnce();
  });

  it('renders degraded source chips for job-002 (salesforce)', () => {
    render(<JobsStrip jobs={LIVE_JOBS} />);
    expect(screen.getByText('salesforce')).toBeInTheDocument();
  });

  it('renders multiple degraded source chips for job-005 (chorus, powerbi)', () => {
    render(<JobsStrip jobs={LIVE_JOBS} />);
    expect(screen.getByText('chorus')).toBeInTheDocument();
    expect(screen.getByText('powerbi')).toBeInTheDocument();
  });

  it('does not render degraded chips for jobs with empty degradedSources', () => {
    // Only jobs with degradedSources entries should show chips.
    // LIVE_JOBS has 3 jobs without chips (job-001, job-003, job-004).
    // The chips that DO appear come from job-002 (salesforce) and job-005 (chorus, powerbi).
    render(<JobsStrip jobs={LIVE_JOBS} />);
    // Total chips should be exactly 3 (salesforce + chorus + powerbi)
    const chips = document.querySelectorAll('[title^="Degraded source:"]');
    expect(chips).toHaveLength(3);
  });

  it('row with outputMemoPath does not show degraded chips (job-003)', () => {
    render(<JobsStrip jobs={[LIVE_JOBS[2]!]} />);
    // job-003 has empty degradedSources — no chips rendered
    expect(screen.queryByTitle(/degraded source/i)).not.toBeInTheDocument();
  });

  it('no "Pending Ch.10" placeholder text when jobs have no pendingNote', () => {
    render(<JobsStrip jobs={LIVE_JOBS} />);
    expect(screen.queryByText(/pending ch\.10/i)).not.toBeInTheDocument();
  });

  it('list has role=list with aria-label "Scheduled jobs"', () => {
    render(<JobsStrip jobs={LIVE_JOBS} />);
    expect(screen.getByRole('list', { name: /scheduled jobs/i })).toBeInTheDocument();
  });

  it('live rows are focusable (tabIndex=0) when onJobClick is provided', () => {
    render(<JobsStrip jobs={LIVE_JOBS} onJobClick={vi.fn()} />);
    const rows = screen.getAllByRole('listitem');
    // All rows should have tabIndex=0 when onJobClick is set
    expect(rows[0]).toHaveAttribute('tabindex', '0');
  });

  it('clicking a live row calls onJobClick with the job id', () => {
    const onJobClick = vi.fn();
    render(<JobsStrip jobs={LIVE_JOBS} onJobClick={onJobClick} />);
    const rows = screen.getAllByRole('listitem');
    fireEvent.click(rows[0]!);
    expect(onJobClick).toHaveBeenCalledWith('job-001');
  });

  it('Enter key on a live row calls onJobClick', () => {
    const onJobClick = vi.fn();
    render(<JobsStrip jobs={LIVE_JOBS} onJobClick={onJobClick} />);
    const rows = screen.getAllByRole('listitem');
    fireEvent.keyDown(rows[0]!, { key: 'Enter' });
    expect(onJobClick).toHaveBeenCalledWith('job-001');
  });

  it('Space key on a live row calls onJobClick', () => {
    const onJobClick = vi.fn();
    render(<JobsStrip jobs={LIVE_JOBS} onJobClick={onJobClick} />);
    const rows = screen.getAllByRole('listitem');
    fireEvent.keyDown(rows[0]!, { key: ' ' });
    expect(onJobClick).toHaveBeenCalledWith('job-001');
  });

});

describe('JobsStrip — placeholder fallback (backward-compat with Ch.7)', () => {

  it('renders "Pending Ch.10" when jobs array is empty', () => {
    render(<JobsStrip jobs={[]} />);
    expect(screen.getAllByText(/pending ch\.10/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders exactly 5 placeholder listitem rows when empty', () => {
    render(<JobsStrip jobs={[]} />);
    const list = screen.getByRole('list', { name: /scheduled jobs/i });
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);
  });

  it('renders placeholder names from default catalogue', () => {
    render(<JobsStrip jobs={[]} />);
    expect(screen.getByText('Daily cash snapshot')).toBeInTheDocument();
  });

  it('renders "Pending Ch.10" for jobs with pendingNote set', () => {
    const pendingJobs: ScheduledJobStatus[] = [{ id: 'p1', name: 'My Job', pendingNote: 'Pending Ch.10' }];
    render(<JobsStrip jobs={pendingJobs} />);
    // Renders at least one "Pending Ch.10" (the one job + any unfilled slots)
    expect(screen.getAllByText(/pending ch\.10/i).length).toBeGreaterThanOrEqual(1);
  });

});
