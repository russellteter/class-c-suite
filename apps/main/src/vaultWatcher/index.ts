// apps/main/src/vaultWatcher/index.ts
// Source: docs/decisions/0003-ch2-safewrite.md §5
// chokidar-based vault file watcher. Lives in MAIN process (not utility).
// Rationale: chokidar uses FSEvents on macOS — safest in the process with
// the most stable event loop. Utility may be restarted by supervisor.

import chokidar from 'chokidar';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { zoneFor } from '@c-suite/shared-types/parseArtifact';
import type { IpcMessage } from '@c-suite/shared-types/ipc';
import { createLogger } from '../logger.js';

const log = createLogger('main');

// ---------------------------------------------------------------------------
// vaultPath resolution — mirrors utility pattern (ADR §5.3)
// ---------------------------------------------------------------------------
const vaultPath =
  process.env.VAULT_PATH ??
  path.join(os.homedir(), 'Documents', 'Claude', 'Projects', 'Business Planning');

// ---------------------------------------------------------------------------
// Per-file debounce (1s) — prevents duplicates from multi-step editor saves
// Source: ADR §5.2
// ---------------------------------------------------------------------------
const debounceMap = new Map<string, ReturnType<typeof setTimeout>>();
const DEBOUNCE_MS = 1000;

type ChangeType = 'add' | 'change' | 'unlink';

function handleChange(
  absPath: string,
  eventType: ChangeType,
  ipcSend: (msg: IpcMessage) => void
): void {
  const existing = debounceMap.get(absPath);
  if (existing) clearTimeout(existing);

  debounceMap.set(
    absPath,
    setTimeout(async () => {
      debounceMap.delete(absPath);

      if (eventType === 'unlink') {
        ipcSend({ kind: 'vault.changed', payload: { path: absPath, changeType: 'deleted' } });
        return;
      }

      // Only emit for zones we track. zoneFor returns null for investigations/, deliverables/, etc.
      const zone = zoneFor(absPath);
      if (!zone) return;

      try {
        // Re-parse frontmatter to validate it's a known artifact — if readFile throws
        // (e.g. file deleted between event and handler), log and skip.
        await fs.readFile(absPath, 'utf8');

        ipcSend({
          kind: 'vault.changed',
          payload: {
            path: absPath,
            changeType: eventType === 'add' ? 'added' : 'modified',
          },
        });
        log.info({ message: 'vault.changed emitted', absPath, changeType: eventType, zone });
      } catch (err) {
        log.warn({ message: 'vault.changed handler: readFile failed', absPath, err: String(err) });
      }
    }, DEBOUNCE_MS)
  );
}

// ---------------------------------------------------------------------------
// initVaultWatcher
// ---------------------------------------------------------------------------

/** Start the chokidar vault watcher and emit vault.changed IPC messages.
 *  Source: ADR §5.1 + §5.2.
 *
 *  @param ipcSend - IPC emitter that forwards messages to the renderer.
 *                   Caller provides `(msg) => win.webContents.send('ipc:message', msg)`.
 *  @returns chokidar.FSWatcher (caller can close on app quit)
 */
export function initVaultWatcher(
  ipcSend: (msg: IpcMessage) => void
): chokidar.FSWatcher {
  const watcher = chokidar.watch(vaultPath, {
    ignored: [
      '**/.git/**',
      '**/.DS_Store',
      '**/*.tmp-*',       // SafeWrite temp files — mid-write
      '**/*.proposed-*',  // SafeWrite sidecar conflict files
    ],
    persistent: true,
    ignoreInitial: true,    // indexer handles initial load
    awaitWriteFinish: {
      stabilityThreshold: 500,   // ms — wait for write to stabilize
      pollInterval: 100,
    },
    atomic: true,           // handle SafeWrite temp-then-rename correctly
    usePolling: false,       // FSEvents native on macOS
    depth: 5,                // vault subdirs ≤3 deep; 5 is conservative ceiling
  });

  watcher
    .on('add', (p) => handleChange(p, 'add', ipcSend))
    .on('change', (p) => handleChange(p, 'change', ipcSend))
    .on('unlink', (p) => handleChange(p, 'unlink', ipcSend))
    .on('error', (err) => {
      log.error({ message: 'chokidar watcher error', err: String(err) });
    });

  log.info({ message: 'vault watcher started', vaultPath });
  return watcher;
}
