// apps/utility/src/notifications/macNotify.ts
// Source: docs/decisions/0012-ch10-scheduler-autonomy.md §3.6
// Native macOS notifications via Electron's Notification API.
// Utility process does NOT have direct access to Electron Notification —
// it posts IPC to main, and main fires the notification.

import type { IpcMessage } from '@c-suite/shared-types/ipc';
import type { JobId } from '@c-suite/shared-types/scheduled-job';
import type { TripwireState } from '@c-suite/shared-types/scheduled-job';
import { createLogger } from '../logger.js';

const log = createLogger();

export type EmitIpcFn = (msg: IpcMessage) => void;

export type NotificationType = 'tripwire-flip' | 'memo-ready' | 'job-failure';
export type ClickAction = 'home' | 'memo' | 'job-status' | 'settings-scheduler';

/**
 * notifyTripwireFlip — fired by monday-tripwire job when a covenant crosses a threshold.
 * Also emits scheduler.tripwire.flipped for the renderer banner.
 */
export function notifyTripwireFlip(
  emitIpc: EmitIpcFn,
  tripwireId: string,
  oldState: TripwireState,
  newState: TripwireState,
): void {
  log.info({ message: 'tripwire flipped', tripwireId, oldState, newState });

  // Emit IPC for renderer banner.
  emitIpc({
    kind: 'scheduler.tripwire.flipped',
    payload: { tripwireId, oldState, newState },
  });

  // Request native notification via main process.
  emitIpc({
    kind: 'main.show-notification',
    payload: {
      type: 'tripwire-flip',
      title: `Tripwire flipped: ${tripwireId}`,
      body: `Status: ${newState}. Click to view.`,
      clickAction: 'home',
    },
  });
}

/**
 * notifyMemoReady — fired after any scheduled job produces a memo.
 */
export function notifyMemoReady(
  emitIpc: EmitIpcFn,
  jobId: JobId,
  memoPath: string,
  headline?: string,
): void {
  log.info({ message: 'memo ready notification', jobId, memoPath });

  emitIpc({
    kind: 'main.show-notification',
    payload: {
      type: 'memo-ready',
      title: `C-Suite: ${jobId} memo ready`,
      body: headline ?? 'Your scheduled report is ready. Click to view.',
      clickAction: 'memo',
      clickPayload: memoPath,
    },
  });
}

/**
 * notifyJobFailure — fired after max retries exhausted or 3 consecutive failures.
 */
export function notifyJobFailure(
  emitIpc: EmitIpcFn,
  jobId: JobId,
  failureReason: string,
): void {
  log.error({ message: 'job failure notification', jobId, failureReason });

  emitIpc({
    kind: 'main.show-notification',
    payload: {
      type: 'job-failure',
      title: `C-Suite: ${jobId} failed`,
      body: `${failureReason}. Click for details.`,
      clickAction: 'job-status',
      clickPayload: jobId,
    },
  });
}

/**
 * notifyPermissionDenied — fired when Notification.requestPermission() is denied.
 * Renderer falls back to in-app banner.
 */
export function notifyPermissionDenied(emitIpc: EmitIpcFn): void {
  log.warn({ message: 'notification permission denied — emitting in-app fallback' });

  emitIpc({
    kind: 'scheduler.notification.permission_denied',
    payload: {},
  });
}
