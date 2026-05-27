// apps/main/src/index.ts
// Electron main process entry point. Bootstraps main.ts which owns the lifecycle
// (app.whenReady, DB + migrations, IPC, BrowserWindow, tray, utility supervisor,
// vault watcher). Side-effect import is intentional — main.ts registers handlers
// at module load.
import './main.js';
