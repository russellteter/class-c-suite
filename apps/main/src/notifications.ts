// apps/main/src/notifications.ts
// Source: docs/decisions/0012-ch10-scheduler-autonomy.md §3.6
// Main-process side of the notification IPC handler.
// Utility process emits 'main.show-notification' → main fires Electron Notification.

import { Notification, BrowserWindow } from 'electron';
import type { WebContents } from 'electron';
import { createLogger } from './logger.js';

const log = createLogger('main');

export type ClickAction = 'home' | 'memo' | 'job-status' | 'settings-scheduler';

export interface ShowNotificationPayload {
  type: 'tripwire-flip' | 'memo-ready' | 'job-failure';
  title: string;
  body: string;
  clickAction: ClickAction;
  clickPayload?: string;
}

let permissionGranted: boolean | null = null;

/**
 * Check (and cache) whether Electron notifications are permitted on this machine.
 * On macOS, Electron's Notification API fires the macOS permission prompt automatically
 * on first use. We surface denial via IPC to the renderer.
 */
export function isNotificationSupported(): boolean {
  return Notification.isSupported();
}

/**
 * fireNotification — called from main when it receives 'main.show-notification' IPC.
 * Fires a native macOS notification. On click: shows the C-Suite window + navigates.
 */
export function fireNotification(
  payload: ShowNotificationPayload,
  rendererContents: WebContents | null,
  emitRendererMsg: (kind: string, data: unknown) => void,
): void {
  if (!Notification.isSupported()) {
    log.warn({ message: 'notifications not supported on this platform' });
    return;
  }

  // If we have previously determined permission is denied, fall back immediately.
  if (permissionGranted === false) {
    emitRendererMsg('scheduler.notification.permission_denied', {});
    return;
  }

  try {
    const notification = new Notification({
      title: payload.title,
      body: payload.body,
      silent: false,
    });

    notification.on('click', () => {
      log.info({ message: 'notification clicked', clickAction: payload.clickAction });

      // Show the window.
      const allWindows = BrowserWindow.getAllWindows();
      const win = allWindows[0] ?? null;
      if (win) {
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
      }

      // Navigate the renderer to the relevant surface.
      if (rendererContents && !rendererContents.isDestroyed()) {
        rendererContents.send('ipc:navigate', {
          action: payload.clickAction,
          payload: payload.clickPayload,
        });
      }
    });

    notification.on('failed', (_event, error) => {
      log.error({ message: 'notification failed', error });
      // Treat as permission denied for future calls.
      permissionGranted = false;
      emitRendererMsg('scheduler.notification.permission_denied', {});
    });

    notification.show();
    permissionGranted = true;
    log.info({ message: 'notification shown', type: payload.type, title: payload.title });
  } catch (err) {
    log.error({ message: 'notification error', err: String(err) });
    permissionGranted = false;
    emitRendererMsg('scheduler.notification.permission_denied', {});
  }
}
