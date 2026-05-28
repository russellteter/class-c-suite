// tests/unit/renderer/NotificationSettings.spec.tsx
// Source: tasks/ch10-renderer-brief.md §5
// 3 toggles render + persist via IPC mock; permission-denied banner renders.

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';

vi.mock('../../../apps/renderer/src/design/tokens.css', () => ({}));

import { NotificationSettings } from '../../../apps/renderer/src/screens/NotificationSettings.js';
import type { NotificationSettingsState } from '../../../apps/renderer/src/screens/NotificationSettings.js';

afterEach(cleanup);

describe('NotificationSettings — 3 toggles (ch10-renderer-brief §5)', () => {

  it('renders heading "Notifications"', () => {
    render(<NotificationSettings />);
    expect(screen.getByRole('heading', { name: /notifications/i })).toBeInTheDocument();
  });

  it('renders exactly 3 toggle switches', () => {
    render(<NotificationSettings />);
    expect(screen.getAllByRole('switch')).toHaveLength(3);
  });

  it('all 3 toggles default to ON (aria-checked=true)', () => {
    render(<NotificationSettings />);
    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(3);
    for (const sw of switches) {
      expect(sw.getAttribute('aria-checked')).toBe('true');
    }
  });

  it('renders "Tripwire flip" toggle label', () => {
    render(<NotificationSettings />);
    expect(screen.getByText('Tripwire flip')).toBeInTheDocument();
  });

  it('renders "Memo ready" toggle label', () => {
    render(<NotificationSettings />);
    expect(screen.getByText('Memo ready')).toBeInTheDocument();
  });

  it('renders "Job failure" toggle label', () => {
    render(<NotificationSettings />);
    expect(screen.getByText('Job failure')).toBeInTheDocument();
  });

  it('has accessible main landmark with aria-label', () => {
    render(<NotificationSettings />);
    expect(screen.getByRole('main', { name: /settings.*notifications/i })).toBeInTheDocument();
  });

  it('has fieldset with legend "Notification types"', () => {
    render(<NotificationSettings />);
    expect(screen.getByRole('group', { name: /notification types/i })).toBeInTheDocument();
  });

  it('back button is present when onBack prop is supplied', () => {
    render(<NotificationSettings onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
  });

  it('clicking back button calls onBack', () => {
    const onBack = vi.fn();
    render(<NotificationSettings onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('initialSettings prop can pre-set tripwireFlip to false', () => {
    render(<NotificationSettings initialSettings={{ tripwireFlip: false }} />);
    const switches = screen.getAllByRole('switch');
    // tripwireFlip is first toggle — should be off
    const tripwireSwitch = screen.getByRole('switch', { name: /tripwire flip: off/i });
    expect(tripwireSwitch.getAttribute('aria-checked')).toBe('false');
  });

  it('clicking a toggle flips its aria-checked state', () => {
    render(<NotificationSettings />);
    const switches = screen.getAllByRole('switch');
    const first = switches[0]!;
    expect(first.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(first);
    expect(first.getAttribute('aria-checked')).toBe('false');
  });

});

describe('NotificationSettings — IPC persistence (ch10-renderer-brief §5)', () => {

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
    Object.defineProperty(window, 'ipc', { value: undefined, writable: true, configurable: true });
  });

  it('clicking a toggle calls window.ipc.invoke with notification.settings.set', async () => {
    render(<NotificationSettings initialSettings={{}} />);
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]!); // flip tripwireFlip from true → false
    await vi.waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        'notification.settings.set',
        expect.objectContaining({ tripwireFlip: false }),
      );
    });
  });

  it('persist call includes all 3 fields', async () => {
    render(<NotificationSettings initialSettings={{}} />);
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[1]!); // flip memoReady
    await vi.waitFor(() => {
      const call = mockInvoke.mock.calls.find((c) => c[0] === 'notification.settings.set');
      expect(call).toBeDefined();
      const payload = call![1] as NotificationSettingsState;
      expect(payload).toHaveProperty('tripwireFlip');
      expect(payload).toHaveProperty('memoReady');
      expect(payload).toHaveProperty('jobFailure');
    });
  });

});

describe('NotificationSettings — permission denied banner (ch10-renderer-brief §5)', () => {

  it('shows permission-denied banner when permissionDenied=true', () => {
    render(<NotificationSettings permissionDenied={true} />);
    expect(screen.getByTestId('permission-denied-banner')).toBeInTheDocument();
  });

  it('banner contains correct message text', () => {
    render(<NotificationSettings permissionDenied={true} />);
    expect(screen.getByText(/macos notifications disabled/i)).toBeInTheDocument();
    expect(screen.getByText(/system settings.*notifications.*c-suite/i)).toBeInTheDocument();
  });

  it('banner has role=alert', () => {
    render(<NotificationSettings permissionDenied={true} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('does not show banner when permissionDenied is false (default)', () => {
    render(<NotificationSettings />);
    expect(screen.queryByTestId('permission-denied-banner')).not.toBeInTheDocument();
  });

  it('dismiss button on banner closes it', () => {
    render(<NotificationSettings permissionDenied={true} />);
    const dismissBtn = screen.getByRole('button', { name: /dismiss notification permission/i });
    fireEvent.click(dismissBtn);
    expect(screen.queryByTestId('permission-denied-banner')).not.toBeInTheDocument();
  });

  it('dismiss button has accessible name', () => {
    render(<NotificationSettings permissionDenied={true} />);
    expect(screen.getByRole('button', { name: /dismiss notification permission/i })).toBeInTheDocument();
  });

});
