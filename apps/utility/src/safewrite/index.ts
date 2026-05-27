// apps/utility/src/safewrite/index.ts
// Source: docs/decisions/0003-ch2-safewrite.md §1-4
// SafeWrite production primitive: atomic-rename-based vault write with
// per-path Promise serialization and SHA-256 hash-check conflict detection.

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { zoneFor } from '@c-suite/shared-types/parseArtifact';
import { getZonePolicy } from './zonePolicy.js';
import { assertVaultInitialized, commitToVault, VaultNotInitializedError } from './git.js';
import type { IpcMessage } from '@c-suite/shared-types/ipc';
import { createLogger } from '../logger.js';

const log = createLogger();

// ---------------------------------------------------------------------------
// vaultPath resolution
// Source: ADR §5.3 + Ch.1 pattern for SQLite path.
// ---------------------------------------------------------------------------
const vaultPath =
  process.env.VAULT_PATH ??
  path.join(os.homedir(), 'Documents', 'Claude', 'Projects', 'Business Planning');

// ---------------------------------------------------------------------------
// Per-path write lock (Promise serializer)
// Source: ADR §1.3 — VERBATIM
// ---------------------------------------------------------------------------
const writeQueue = new Map<string, Promise<void>>();

function withPathLock<T>(absPath: string, fn: () => Promise<T>): Promise<T> {
  const prev = writeQueue.get(absPath) ?? Promise.resolve();
  let resolve!: () => void;
  const next = new Promise<void>(r => { resolve = r; });
  writeQueue.set(absPath, next);
  return prev.catch(() => {}).then(fn).finally(resolve);
}

// ---------------------------------------------------------------------------
// isoStamp — sidecar filename timestamp
// Source: ADR §3.1 — VERBATIM
// ---------------------------------------------------------------------------
function isoStamp(): string {
  const d = new Date();
  const YYYY = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const DD = String(d.getDate()).padStart(2, '0');
  const HH = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const SS = String(d.getSeconds()).padStart(2, '0');
  const mmm = String(d.getMilliseconds()).padStart(3, '0');
  return `${YYYY}-${MM}-${DD}T${HH}${mm}${SS}-${mmm}`;
}

// ---------------------------------------------------------------------------
// SHA-256 hash helper
// ---------------------------------------------------------------------------
function sha256(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

// ---------------------------------------------------------------------------
// SafeWrite result types
// ---------------------------------------------------------------------------
export type SafeWriteResult =
  | { ok: true; sha: string }
  | { ok: false; conflict: true; sidecarPath: string };

export interface SafeWriteArgs {
  /** Absolute path to the target vault file. */
  absPath: string;
  /** UTF-8 content to write. */
  content: string;
  /** Agent identifier for git commit message. */
  agent: string;
  /** Playbook name for git commit message. */
  playbook: string;
  /** Run ID for git commit message. */
  runId: string;
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
let emitFn: ((msg: IpcMessage) => void) | null = null;

/** Initialize SafeWrite. Must be called once at startup.
 *  On VaultNotInitializedError: emits vault.init.error IPC then re-throws.
 *  The utility uncaughtException handler → process.exit(1) → supervisor restart.
 *  Source: ADR §4.4 + G-1.
 */
export async function initSafeWrite(opts: {
  emit: (msg: IpcMessage) => void;
}): Promise<void> {
  emitFn = opts.emit;
  try {
    await assertVaultInitialized(vaultPath);
  } catch (err) {
    if (err instanceof VaultNotInitializedError) {
      emitFn({
        kind: 'vault.init.error',
        payload: {
          message: (err as Error).message,
          vaultPath,
        },
      });
    }
    throw err;
  }
  log.info({ message: 'SafeWrite initialized', vaultPath });
}

// ---------------------------------------------------------------------------
// Core SafeWrite algorithm
// Source: ADR §1 algorithm + §2 zone policy + §3 git + §4 conflict handling
// ---------------------------------------------------------------------------

/** Write content to absPath atomically via temp-file + rename.
 *
 *  Algorithm:
 *  1. Preflight: absPath must be inside vaultPath.
 *  2. Per-path lock: serialize concurrent writes to same path.
 *  3. Zone policy: look up hashCheck + commitVault from ArtifactZone.
 *  4. Pre-read: if hashCheck, read current content and hash it.
 *  5. Write temp: write content to <absPath>.tmp-<uuid>.
 *  6. Re-read hash: if hashCheck, hash the temp file as written.
 *  7. Compare hashes: if preHash !== reReadHash → conflict → sidecar.
 *     else → atomic rename temp → absPath.
 *  8. Git commit: if commitVault, commit via simple-git.
 *  9. Return result.
 */
export async function safeWrite(args: SafeWriteArgs): Promise<SafeWriteResult> {
  const { absPath, content, agent, playbook, runId } = args;

  // 1. Preflight: absPath must be inside vaultPath.
  const rel = path.relative(vaultPath, absPath);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`SafeWrite: absPath ${absPath} is outside vaultPath ${vaultPath}`);
  }

  return withPathLock(absPath, async () => {
    // 3. Zone policy
    const zone = zoneFor(absPath);
    const policy = zone ? getZonePolicy(zone) : { hashCheck: false, commitVault: false };

    // 4. Pre-read hash (only if hashCheck)
    let preHash: string | null = null;
    if (policy.hashCheck) {
      try {
        const existing = await fs.readFile(absPath, 'utf8');
        preHash = sha256(existing);
      } catch {
        // File does not yet exist — no conflict possible on first write.
        preHash = null;
      }
    }

    // 5. Write temp file alongside target
    const tempPath = `${absPath}.tmp-${crypto.randomUUID()}`;
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    await fs.writeFile(tempPath, content, 'utf8');

    // 6. Re-read hash: re-read the TARGET (not temp) to detect external modification.
    // Source: ADR §1.2 step 5 — "re-read + hash the target file".
    // Bug fixed: was reading tempPath (always matched content) instead of absPath.
    let reReadHash: string | null = null;
    if (policy.hashCheck && preHash !== null) {
      const reReadContent = await fs.readFile(absPath, 'utf8');
      reReadHash = sha256(reReadContent);
    }

    // 7. Conflict check
    if (policy.hashCheck && preHash !== null && reReadHash !== null && preHash !== reReadHash) {
      // Conflict: rename temp to sidecar, preserve original.
      const sidecarPath = absPath.replace(/\.md$/, '') + `.proposed-${isoStamp()}.md`;
      await fs.rename(tempPath, sidecarPath);

      log.warn({ message: 'safewrite conflict', absPath, sidecarPath, preHash, reReadHash });

      if (emitFn) {
        emitFn({
          kind: 'safewrite.conflict',
          payload: { path: absPath, sidecarPath },
        });
      }

      return { ok: false, conflict: true, sidecarPath };
    }

    // No conflict: atomic rename temp → target.
    await fs.rename(tempPath, absPath);
    log.info({ message: 'safewrite written', absPath, zone });

    // 8. Git commit
    let sha = '';
    if (policy.commitVault) {
      try {
        sha = await commitToVault({ vaultPath, absPath, agent, playbook, runId });
      } catch (err) {
        log.error({ message: 'safewrite git commit failed', absPath, err: String(err) });
        // Non-fatal: write succeeded; git commit failure is logged but not surfaced.
      }
    }

    return { ok: true, sha };
  });
}
