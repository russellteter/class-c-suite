// apps/main/src/window.ts
// Source: docs/decisions/0002-ch1-process-architecture.md §1.4
// BrowserWindow configuration for renderer process.

import { BrowserWindow, session, app } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  // Dev mode relaxes CSP to allow Vite HMR (ws + http localhost:5173).
  // Source: ADR §1.4 + R2 §Area 5 + docs/decisions/0013-ch7-vite-assembly.md
  const isDev = !app.isPackaged && (process.env.NODE_ENV === 'development' || process.env.VITE_DEV === '1');
  const csp = isDev
    ? "default-src 'self'; script-src 'self' 'unsafe-inline' http://localhost:5173; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ws://localhost:5173 http://localhost:5173"
    : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'";
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    });
  });

  win.once('ready-to-show', () => win.show());

  return win;
}
