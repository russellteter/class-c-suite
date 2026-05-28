// apps/main/src/main.ts
// Source: docs/decisions/0002-ch1-process-architecture.md §1
// Electron main process: app lifecycle, tray, window, DB, IPC, supervisor.

import { app, Tray, Menu, nativeImage, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { fileURLToPath } from 'node:url';
import { fireNotification } from './notifications.js';
import type { ShowNotificationPayload } from './notifications.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --scheduler-only flag: start utility + scheduler but NO renderer window.
// Lock file lets the normal launch detect the running instance.
const SCHEDULER_ONLY = process.argv.includes('--scheduler-only');
const LOCK_FILE = path.join(os.homedir(), 'Library', 'Application Support', 'c-suite', '.scheduler.lock');

import { openDatabase } from './db/open.js';
import { runMigrations } from './db/migrate.js';
import { createRendererWindow } from './window.js';
import { registerIpcHandlers } from './ipc/handlers.js';
import { startSupervision, type SupervisionState } from './supervisor.js';
import { initVaultWatcher } from './vaultWatcher/index.js';
import { createLogger } from './logger.js';

const log = createLogger('main');

// Single-instance lock — quit if another instance is already running.
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

app.whenReady().then(() => {
  log.info({ message: 'app ready', schedulerOnly: SCHEDULER_ONLY });

  // Open DB and run migrations (main holds the single handle).
  const db = openDatabase();
  runMigrations(db);
  log.info({ message: 'database open + migrations applied' });

  // Register IPC handlers before creating the window.
  registerIpcHandlers(db);

  // --scheduler-only: write lock file; skip renderer window.
  if (SCHEDULER_ONLY) {
    const lockDir = path.dirname(LOCK_FILE);
    if (!fs.existsSync(lockDir)) fs.mkdirSync(lockDir, { recursive: true });
    fs.writeFileSync(LOCK_FILE, String(process.pid), 'utf-8');
    log.info({ message: '--scheduler-only mode: skipping renderer window', lockFile: LOCK_FILE });

    // Start supervision (utility process + scheduler) without a renderer window.
    const state: import('./supervisor.js').SupervisionState = { restarts: [], proc: null, port: null };
    startSupervision(state, db, null as never);

    // Register notification IPC handler (utility → main).
    ipcMain.on('ipc:message', (_event, raw) => {
      if (raw && typeof raw === 'object' && (raw as { kind?: string }).kind === 'main.show-notification') {
        fireNotification(
          (raw as { payload: ShowNotificationPayload }).payload,
          null,
          () => { /* no renderer in scheduler-only mode */ },
        );
      }
    });

    app.on('before-quit', () => {
      if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
      if (state.proc) state.proc.kill();
      db.close();
    });

    return;  // Skip the rest of the normal startup.
  }

  // Normal mode: create renderer window.
  const win = createRendererWindow();

  // Load renderer entry point.
  // dev: __dirname = apps/main/dist → 2 levels up = apps/ → apps/renderer/index.html
  // packaged: renderer assets ship under main's resources dir
  const rendererEntry = app.isPackaged
    ? path.join(__dirname, '..', 'renderer', 'index.html')
    : path.join(__dirname, '..', '..', 'renderer', 'index.html');
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

  // Notification IPC: utility → main → native macOS notification.
  ipcMain.on('ipc:message', (_event, raw) => {
    if (raw && typeof raw === 'object' && (raw as { kind?: string }).kind === 'main.show-notification') {
      fireNotification(
        (raw as { payload: ShowNotificationPayload }).payload,
        win.webContents,
        (kind, data) => win.webContents.send('ipc:message', { kind, payload: data }),
      );
    }
  });

  // Start vault file watcher (chokidar, MAIN process).
  // Emits vault.changed IPC messages to renderer via win.webContents.
  const vaultWatcher = initVaultWatcher(
    (msg) => win.webContents.send('ipc:message', msg)
  );

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
    vaultWatcher.close().catch(() => {});
    db.close();
    tray?.destroy();
  });
});
