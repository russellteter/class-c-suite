// packages/vault-watcher/src/watcher.ts
// Source: docs/decisions/0003-ch2-safewrite.md §5
// chokidar-based vault file watcher.
// API contract pinned by tests/unit/vaultwatcher.spec.ts (Test dispatch, DOCTRINE law #7).

import chokidar from 'chokidar';
import * as fs from 'fs/promises';
import { zoneFor } from '@c-suite/shared-types/parseArtifact';
import type { IpcMessage } from '@c-suite/shared-types/ipc';

// ---------------------------------------------------------------------------
// Exported constants (AC-10b contract)
// ---------------------------------------------------------------------------

/** chokidar ignored patterns — exported for test assertion (AC-10b). */
export const WATCHER_IGNORED_PATTERNS: string[] = [
  '**/.git/**',
  '**/.DS_Store',
  '**/*.tmp-*',       // SafeWrite temp files — mid-write
  '**/*.proposed-*',  // SafeWrite sidecar conflict files
];

/** Debounce window in ms — 1s per ADR §5.2 spec. Exported for test assertion. */
export const DEBOUNCE_MS = 1000;

// ---------------------------------------------------------------------------
// WatcherHandle type (exported for test usage)
// ---------------------------------------------------------------------------

export interface WatcherHandle {
  /** Stop watching and release all resources. */
  close(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Per-file debounce map
// ---------------------------------------------------------------------------

type ChangeType = 'add' | 'change' | 'unlink';

// ---------------------------------------------------------------------------
// createVaultWatcher
// ---------------------------------------------------------------------------

/** Start a chokidar vault watcher that emits IpcMessage<'vault.changed'> events.
 *
 *  @param vaultPath - Absolute path to the vault root to watch.
 *  @param ipcSend   - IPC emitter. Receives vault.changed messages.
 *  @returns WatcherHandle with close() to stop watching.
 *
 *  Source: ADR §5.1 + §5.2.
 */
export function createVaultWatcher(
  vaultPath: string,
  ipcSend: (msg: IpcMessage) => void,
): WatcherHandle {
  const debounceMap = new Map<string, ReturnType<typeof setTimeout>>();

  function handleChange(absPath: string, eventType: ChangeType): void {
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

        // Only emit for recognized vault zones. zoneFor returns null for unrecognized paths.
        const zone = zoneFor(absPath);
        if (!zone) return;

        try {
          await fs.readFile(absPath, 'utf8');
          ipcSend({
            kind: 'vault.changed',
            payload: {
              path: absPath,
              changeType: eventType === 'add' ? 'added' : 'modified',
            },
          });
        } catch {
          // File disappeared between event and handler — skip.
        }
      }, DEBOUNCE_MS)
    );
  }

  const watcher = chokidar.watch(vaultPath, {
    ignored: WATCHER_IGNORED_PATTERNS,
    persistent: true,
    ignoreInitial: true,
    // awaitWriteFinish disabled: the 500ms stability threshold pushes total
    // latency (500ms + 1000ms debounce) past the test budget (DEBOUNCE_MS+200ms).
    // Debounce alone is sufficient to deduplicate rapid writes.
    atomic: true,
    usePolling: false,
    depth: 5,
  });

  watcher
    .on('add', (p) => handleChange(p, 'add'))
    .on('change', (p) => handleChange(p, 'change'))
    .on('unlink', (p) => handleChange(p, 'unlink'));

  return {
    close: () => watcher.close(),
  };
}
