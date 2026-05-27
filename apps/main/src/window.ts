// apps/main/src/window.ts
// Source: docs/decisions/0002-ch1-process-architecture.md §1.4
// BrowserWindow configuration for renderer process.

import { BrowserWindow, session } from 'electron';
import * as path from 'path';

export function createRendererWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,            // shown after 'ready-to-show' event to avoid flash
    webPreferences: {
      contextIsolation: true,         // LOCKED — no override permitted
      nodeIntegration: false,         // LOCKED — no override permitted
      sandbox: true,                  // LOCKED — no override permitted
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // CSP header — no 'unsafe-eval'; React 18 modern JSX transform does not require it.
  // Source: ADR §1.4 + R2 §Area 5
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'",
        ],
      },
    });
  });

  win.once('ready-to-show', () => win.show());

  return win;
}
