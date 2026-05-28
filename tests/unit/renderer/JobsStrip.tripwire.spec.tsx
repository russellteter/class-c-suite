// tests/unit/renderer/JobsStrip.tripwire.spec.tsx
// Source: tasks/ch10-renderer-brief.md §5
// TripwireBanner: scheduler.tripwire.flipped event renders banner with severity colors.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';

vi.mock('../../../apps/renderer/src/design/tokens.css', () => ({}));

import { TripwireBanner } from '../../../apps/renderer/src/components/TripwireBanner.js';
import type { TripwireFlippedPayload } from '../../../apps/renderer/src/components/TripwireBanner.js';

afterEach(cleanup);

const WARNING_PAYLOAD: TripwireFlippedPayload = {
  tripwire: 'Cash runway',
  newState: 'BELOW_60_DAYS',
  severity: 'warning',
};

const CRITICAL_PAYLOAD: TripwireFlippedPayload = {
  tripwire: 'AR aging',
  newState: 'CRITICAL',
  severity: 'critical',
  outputMemoPath: '/vault/memos/ar-aging-critical.md',
};

describe('TripwireBanner — render from prop (ch10-renderer-brief §5)', () => {

  it('renders banner when payload prop is provided', () => {
    render(<TripwireBanner payload={WARNING_PAYLOAD} />);
    expect(screen.getByTestId('tripwire-banner')).toBeInTheDocument();
  });

  it('does not render when payload is null', () => {
    render(<TripwireBanner payload={null} />);
    expect(screen.queryByTestId('tripwire-banner')).not.toBeInTheDocument();
  });

  it('does not render with no payload in jsdom (no IPC)', () => {
    render(<TripwireBanner />);
    expect(screen.queryByTestId('tripwire-banner')).not.toBeInTheDocument();
  });

  it('displays tripwire name in banner text', () => {
    render(<TripwireBanner payload={WARNING_PAYLOAD} />);
    expect(screen.getByText('Cash runway')).toBeInTheDocument();
  });

  it('displays new state in banner text', () => {
    render(<TripwireBanner payload={WARNING_PAYLOAD} />);
    expect(screen.getByText('BELOW_60_DAYS')).toBeInTheDocument();
  });

  it('has role=alert with aria-live=assertive', () => {
    render(<TripwireBanner payload={WARNING_PAYLOAD} />);
    const banner = screen.getByRole('alert');
    expect(banner).toHaveAttribute('aria-live', 'assertive');
  });

  it('dismiss button is present and keyboard-accessible', () => {
    render(<TripwireBanner payload={WARNING_PAYLOAD} />);
    expect(screen.getByRole('button', { name: /dismiss tripwire/i })).toBeInTheDocument();
  });

  it('clicking dismiss closes the banner', () => {
    render(<TripwireBanner payload={WARNING_PAYLOAD} />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByTestId('tripwire-banner')).not.toBeInTheDocument();
  });

  it('shows "view memo" button when outputMemoPath is set', () => {
    render(<TripwireBanner payload={CRITICAL_PAYLOAD} />);
    expect(screen.getByRole('button', { name: /open memo for ar aging/i })).toBeInTheDocument();
  });

  it('does not show "view memo" button when outputMemoPath is absent', () => {
    render(<TripwireBanner payload={WARNING_PAYLOAD} />);
    expect(screen.queryByRole('button', { name: /open memo/i })).not.toBeInTheDocument();
  });

  it('"view memo" button calls onOpenMemo with correct path', () => {
    const onOpenMemo = vi.fn();
    render(<TripwireBanner payload={CRITICAL_PAYLOAD} onOpenMemo={onOpenMemo} />);
    fireEvent.click(screen.getByRole('button', { name: /open memo/i }));
    expect(onOpenMemo).toHaveBeenCalledWith('/vault/memos/ar-aging-critical.md');
  });

  it('critical severity renders banner (not crashing on severity variant)', () => {
    render(<TripwireBanner payload={CRITICAL_PAYLOAD} />);
    expect(screen.getByTestId('tripwire-banner')).toBeInTheDocument();
    expect(screen.getByText('AR aging')).toBeInTheDocument();
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
  });

  it('warning severity renders banner with correct text', () => {
    render(<TripwireBanner payload={WARNING_PAYLOAD} />);
    expect(screen.getByText('BELOW_60_DAYS')).toBeInTheDocument();
  });

  it('Escape keydown on banner closes it', () => {
    render(<TripwireBanner payload={WARNING_PAYLOAD} />);
    const banner = screen.getByTestId('tripwire-banner');
    fireEvent.keyDown(banner, { key: 'Escape' });
    expect(screen.queryByTestId('tripwire-banner')).not.toBeInTheDocument();
  });

});
