// apps/main/src/main.ts
// Source: docs/decisions/0002-ch1-process-architecture.md §1
// Electron main process: app lifecycle, tray, window, DB, IPC, supervisor.

import { app, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import { openDatabase } from './db/open.js';
import { runMigrations } from './db/migrate.js';
import { createRendererWindow } from './window.js';
import { registerIpcHandlers } from './ipc/handlers.js';
import { startSupervision, type SupervisionState } from './supervisor.js';
import { createLogger } from './logger.js';

const log = createLogger('main');

// Single-instance lock — quit if another instance is already running.
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

app.whenReady().then(() => {
  log.info({ message: 'app ready' });

  // Open DB and run migrations (main holds the single handle).
  const db = openDatabase();
  runMigrations(db);
  log.info({ message: 'database open + migrations applied' });

  // Register IPC handlers before creating the window.
  registerIpcHandlers(db);

  // Create renderer window.
  const win = createRendererWindow();

  // Load renderer entry point (dev: index.html in apps/renderer; packaged: dist).
  const rendererEntry = app.isPackaged
    ? path.join(__dirname, '..', '..', 'renderer', 'index.html')
    : path.join(__dirname, '..', '..', '..', 'renderer', 'index.html');
  win.loadFile(rendererEntry).catch((err) => {
    log.error({ message: 'failed to load renderer', err: String(err) });
  });

  // System tray — minimal for Ch.1 (Ch.5 adds full menu).
  const iconPath = path.join(__dirname, '..', 'assets', 'tray-icon.png');
  let tray: Tray | null = null;
  try {
    tray = new Tray(nativeImage.createFromPath(iconPath));
    tray.setToolTip('C-Suite');
    const menu = Menu.buildFromTemplate([
      { label: 'Show', click: () => win.show() },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ]);
    tray.setContextMenu(menu);
  } catch {
    // Icon file may not exist in Ch.1 — tray is optional until Ch.5 ships assets.
    log.info({ message: 'tray icon not found — skipping tray (Ch.5 ships assets)' });
  }

  // Start utility process supervision AFTER app.whenReady().
  const state: SupervisionState = { restarts: [], proc: null, port: null };
  startSupervision(state, db, win.webContents);

  // 5-hour token-budget window reset timer — fires in main, proxied to scheduler.
  const WINDOW_MS = 5 * 60 * 60 * 1000;
  const armWindowReset = () => {
    setTimeout(() => {
      if (state.port) {
        state.port.postMessage({ kind: 'scheduler:reset' });
      }
      armWindowReset();
    }, WINDOW_MS);
  };
  armWindowReset();

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    win.show();
  });

  app.on('before-quit', () => {
    log.info({ message: 'app quitting — stopping supervisor' });
    if (state.proc) {
      state.proc.kill();
    }
    db.close();
    tray?.destroy();
  });
});
