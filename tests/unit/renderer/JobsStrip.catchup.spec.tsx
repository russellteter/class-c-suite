// tests/unit/renderer/JobsStrip.catchup.spec.tsx
// Source: tasks/ch10-renderer-brief.md §5
// CatchupToast: scheduler.catchup.summary event triggers toast; auto-dismiss; expand.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import React from 'react';

vi.mock('../../../apps/renderer/src/design/tokens.css', () => ({}));

import { CatchupToast } from '../../../apps/renderer/src/components/CatchupToast.js';
import type { CatchupSummaryPayload } from '../../../apps/renderer/src/components/CatchupToast.js';

afterEach(cleanup);

const PAYLOAD: CatchupSummaryPayload = {
  missedCount: 3,
  jobNames: ['Daily cash snapshot', 'Barclays AR aging monitor', 'Workstream stale check'],
};

describe('CatchupToast — render from prop (ch10-renderer-brief §5)', () => {

  it('renders toast when payload prop is provided', () => {
    render(<CatchupToast payload={PAYLOAD} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('displays correct missed job count in toast text', () => {
    render(<CatchupToast payload={PAYLOAD} />);
    expect(screen.getByText(/caught up 3 missed jobs/i)).toBeInTheDocument();
  });

  it('displays singular "job" for missedCount=1', () => {
    render(<CatchupToast payload={{ missedCount: 1, jobNames: ['Daily cash snapshot'] }} />);
    expect(screen.getByText(/caught up 1 missed job since/i)).toBeInTheDocument();
  });

  it('does not render when payload is null', () => {
    render(<CatchupToast payload={null} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not render when no payload prop given (no IPC in jsdom)', () => {
    render(<CatchupToast />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('has role=alert with aria-live=assertive', () => {
    render(<CatchupToast payload={PAYLOAD} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });

  it('expand button is present and keyboard-accessible', () => {
    render(<CatchupToast payload={PAYLOAD} />);
    const expandBtn = screen.getByRole('button', { name: /caught up 3/i });
    expect(expandBtn).toBeInTheDocument();
  });

  it('clicking expand button shows job names list', () => {
    render(<CatchupToast payload={PAYLOAD} />);
    const expandBtn = screen.getByRole('button', { name: /caught up 3/i });
    fireEvent.click(expandBtn);
    expect(screen.getByText('Daily cash snapshot')).toBeInTheDocument();
    expect(screen.getByText('Barclays AR aging monitor')).toBeInTheDocument();
  });

  it('clicking expand button toggles aria-expanded on expand button', () => {
    render(<CatchupToast payload={PAYLOAD} />);
    const expandBtn = screen.getByRole('button', { name: /caught up 3/i });
    expect(expandBtn).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(expandBtn);
    expect(expandBtn).toHaveAttribute('aria-expanded', 'true');
  });

  it('dismiss button (×) closes the toast', () => {
    render(<CatchupToast payload={PAYLOAD} />);
    const dismissBtn = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissBtn);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('dismiss button is focusable with accessible name', () => {
    render(<CatchupToast payload={PAYLOAD} />);
    const dismissBtn = screen.getByRole('button', { name: /dismiss/i });
    expect(dismissBtn).toHaveAccessibleName(/dismiss/i);
  });

  it('Escape key closes the toast via keyboard', () => {
    render(<CatchupToast payload={PAYLOAD} />);
    const expandBtn = screen.getByRole('button', { name: /caught up 3/i });
    fireEvent.keyDown(expandBtn, { key: 'Escape' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

});

describe('CatchupToast — auto-dismiss timer', () => {

  it('auto-dismisses after 5000ms', () => {
    vi.useFakeTimers();
    render(<CatchupToast payload={PAYLOAD} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('remains visible before 5000ms elapses', () => {
    vi.useFakeTimers();
    render(<CatchupToast payload={PAYLOAD} />);
    act(() => { vi.advanceTimersByTime(4999); });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    vi.useRealTimers();
  });

});
