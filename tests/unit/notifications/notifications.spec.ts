/**
 * tests/unit/notifications/notifications.spec.ts
 * Source: docs/decisions/0012-ch10-scheduler-autonomy.md AC-11
 * Verifies 3 notification types emit on correct triggers; click action correct.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IpcMessage } from '@c-suite/shared-types/ipc';
import {
  notifyTripwireFlip,
  notifyMemoReady,
  notifyJobFailure,
  notifyPermissionDenied,
} from '../../../apps/utility/src/notifications/macNotify.js';

describe('macNotify', () => {
  let emitIpc: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    emitIpc = vi.fn();
  });

  describe('notifyTripwireFlip', () => {
    it('emits scheduler.tripwire.flipped IPC', () => {
      notifyTripwireFlip(emitIpc, 'cash-runway-weeks', 'GREEN', 'YELLOW');

      const flipped = (emitIpc.mock.calls as [IpcMessage][])
        .find(([msg]) => msg.kind === 'scheduler.tripwire.flipped');
      expect(flipped).toBeDefined();
      const payload = flipped![0].payload as { tripwireId: string; oldState: string; newState: string };
      expect(payload.tripwireId).toBe('cash-runway-weeks');
      expect(payload.oldState).toBe('GREEN');
      expect(payload.newState).toBe('YELLOW');
    });

    it('emits main.show-notification with type tripwire-flip', () => {
      notifyTripwireFlip(emitIpc, 'arr-churn-pct', 'YELLOW', 'RED');

      const notif = (emitIpc.mock.calls as [IpcMessage][])
        .find(([msg]) => msg.kind === 'main.show-notification');
      expect(notif).toBeDefined();
      const n = notif![0] as Extract<IpcMessage, { kind: 'main.show-notification' }>;
      expect(n.payload.type).toBe('tripwire-flip');
      expect(n.payload.title).toContain('arr-churn-pct');
      expect(n.payload.body).toContain('RED');
    });

    it('click action for tripwire-flip is "home"', () => {
      notifyTripwireFlip(emitIpc, 'cash-runway-weeks', 'GREEN', 'YELLOW');

      const notif = (emitIpc.mock.calls as [IpcMessage][])
        .find(([msg]) => msg.kind === 'main.show-notification');
      const n = notif![0] as Extract<IpcMessage, { kind: 'main.show-notification' }>;
      expect(n.payload.clickAction).toBe('home');
    });
  });

  describe('notifyMemoReady', () => {
    it('emits main.show-notification with type memo-ready', () => {
      notifyMemoReady(emitIpc, 'daily-morning-brief', '/vault/memos/2026-05-27.md');

      const notif = (emitIpc.mock.calls as [IpcMessage][])
        .find(([msg]) => msg.kind === 'main.show-notification');
      expect(notif).toBeDefined();
      const n = notif![0] as Extract<IpcMessage, { kind: 'main.show-notification' }>;
      expect(n.payload.type).toBe('memo-ready');
      expect(n.payload.title).toContain('daily-morning-brief');
    });

    it('click action for memo-ready is "memo"', () => {
      const memoPath = '/vault/memos/2026-05-27.md';
      notifyMemoReady(emitIpc, 'daily-morning-brief', memoPath);

      const notif = (emitIpc.mock.calls as [IpcMessage][])
        .find(([msg]) => msg.kind === 'main.show-notification');
      const n = notif![0] as Extract<IpcMessage, { kind: 'main.show-notification' }>;
      expect(n.payload.clickAction).toBe('memo');
      expect(n.payload.clickPayload).toBe(memoPath);
    });

    it('includes optional headline in body', () => {
      notifyMemoReady(emitIpc, 'monday-tripwire', '/path/memo.md', 'Cash runway stable at 24 weeks.');

      const notif = (emitIpc.mock.calls as [IpcMessage][])
        .find(([msg]) => msg.kind === 'main.show-notification');
      const n = notif![0] as Extract<IpcMessage, { kind: 'main.show-notification' }>;
      expect(n.payload.body).toContain('Cash runway stable');
    });
  });

  describe('notifyJobFailure', () => {
    it('emits main.show-notification with type job-failure', () => {
      notifyJobFailure(emitIpc, 'sunday-renewal', 'Salesforce auth expired');

      const notif = (emitIpc.mock.calls as [IpcMessage][])
        .find(([msg]) => msg.kind === 'main.show-notification');
      expect(notif).toBeDefined();
      const n = notif![0] as Extract<IpcMessage, { kind: 'main.show-notification' }>;
      expect(n.payload.type).toBe('job-failure');
      expect(n.payload.title).toContain('sunday-renewal');
      expect(n.payload.body).toContain('Salesforce auth expired');
    });

    it('click action for job-failure is "job-status"', () => {
      notifyJobFailure(emitIpc, 'monday-stakeholder', 'Network timeout');

      const notif = (emitIpc.mock.calls as [IpcMessage][])
        .find(([msg]) => msg.kind === 'main.show-notification');
      const n = notif![0] as Extract<IpcMessage, { kind: 'main.show-notification' }>;
      expect(n.payload.clickAction).toBe('job-status');
      expect(n.payload.clickPayload).toBe('monday-stakeholder');
    });
  });

  describe('notifyPermissionDenied', () => {
    it('emits scheduler.notification.permission_denied IPC', () => {
      notifyPermissionDenied(emitIpc);

      const denied = (emitIpc.mock.calls as [IpcMessage][])
        .find(([msg]) => msg.kind === 'scheduler.notification.permission_denied');
      expect(denied).toBeDefined();
    });

    it('does NOT emit main.show-notification (no notification if denied)', () => {
      notifyPermissionDenied(emitIpc);

      const notif = (emitIpc.mock.calls as [IpcMessage][])
        .filter(([msg]) => msg.kind === 'main.show-notification');
      expect(notif.length).toBe(0);
    });
  });

  describe('IPC variant validation', () => {
    it('main.show-notification validates as IpcMessage', async () => {
      const { validateIpc } = await import('@c-suite/shared-types/ipc');

      expect(() => validateIpc({
        kind: 'main.show-notification',
        payload: {
          type: 'tripwire-flip',
          title: 'Test',
          body: 'Test body',
          clickAction: 'home',
        },
      })).not.toThrow();
    });

    it('scheduler.catchup.summary validates as IpcMessage', async () => {
      const { validateIpc } = await import('@c-suite/shared-types/ipc');

      expect(() => validateIpc({
        kind: 'scheduler.catchup.summary',
        payload: {
          caughtUp: [{ jobId: 'daily-morning-brief', missedScheduledFor: Date.now() }],
        },
      })).not.toThrow();
    });

    it('scheduler.tripwire.flipped validates as IpcMessage', async () => {
      const { validateIpc } = await import('@c-suite/shared-types/ipc');

      expect(() => validateIpc({
        kind: 'scheduler.tripwire.flipped',
        payload: { tripwireId: 'cash-runway-weeks', oldState: 'GREEN', newState: 'YELLOW' },
      })).not.toThrow();
    });

    it('scheduler.notification.permission_denied validates as IpcMessage', async () => {
      const { validateIpc } = await import('@c-suite/shared-types/ipc');

      expect(() => validateIpc({
        kind: 'scheduler.notification.permission_denied',
        payload: {},
      })).not.toThrow();
    });

    it('home.scheduledJobs validates as IpcMessage', async () => {
      const { validateIpc } = await import('@c-suite/shared-types/ipc');

      expect(() => validateIpc({
        kind: 'home.scheduledJobs',
        payload: { jobs: [] },
      })).not.toThrow();
    });
  });
});
