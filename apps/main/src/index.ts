// apps/main/src/index.ts
// Electron main process entry point. Bootstraps main.ts which owns the lifecycle
// (app.whenReady, DB + migrations, IPC, BrowserWindow, tray, utility supervisor,
// vault watcher). Side-effect import is intentional — main.ts registers handlers
// at module load.
// loadEnv MUST come first: it populates process.env from apps/main/.env.local before
// main.ts (and the forked utility) read CLAUDE_CODE_OAUTH_TOKEN / connector vars.
import './loadEnv.js';
import './main.js';
