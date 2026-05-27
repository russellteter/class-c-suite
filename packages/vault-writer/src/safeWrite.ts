// packages/vault-writer/src/safeWrite.ts
// Source: docs/decisions/0003-ch2-safewrite.md §1-4
// SafeWrite production primitive: atomic-rename-based vault write with
// per-path Promise serialization and SHA-256 hash-check conflict detection.
//
// API contract pinned by tests/unit/safewrite.spec.ts (Test dispatch, DOCTRINE law #7).

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { simpleGit } from 'simple-git';
import type { ArtifactZone } from '@c-suite/shared-types/vault-schemas';
import type { IpcMessage } from '@c-suite/shared-types/ipc';

// ---------------------------------------------------------------------------
// B39: vault.commit.failed surfacing
// Source: docs/reviews/ultrareview-2026-05-27.md "Critical Fix 5"
// ---------------------------------------------------------------------------

/**
 * Minimal logger surface SafeWrite uses to record a non-fatal commit failure.
 * Compatible with pino (apps/utility/src/logger.ts) and console fallbacks.
 */
export interface SafeWriteLogger {
  error: (obj: Record<string, unknown>, msg?: string) => void;
}

/**
 * Minimal SQLite surface for recording vault_commit_failures rows.
 * Accepts either a better-sqlite3 Database instance or a duck-typed object
 * exposing prepare().run(...).
 */
export interface SafeWriteDb {
  prepare(sql: string): { run(...params: unknown[]): unknown };
}

export type SafeWriteEmitIpc = (msg: IpcMessage) => void;

// ---------------------------------------------------------------------------
// B22: VaultNotInitializedError
// Source: ADR §4.4
// ---------------------------------------------------------------------------

export class VaultNotInitializedError extends Error {
  constructor(vaultPath: string) {
    super(
      `Vault at ${vaultPath} has no commits. Run scripts/vault-bootstrap.sh before starting C-Suite.`
    );
    this.name = 'VaultNotInitializedError';
  }
}

// ---------------------------------------------------------------------------
// Zone policy — determines hashCheck behavior
// Source: ADR §2 + test AC-3 (position=hashCheck, memo/prediction/handoff=no hashCheck)
// ---------------------------------------------------------------------------

/** Zones where concurrent writes are possible — always hash-check.
 *  Source: ADR §2.1 shared-zone table (8 shared / 3 agent-exclusive).
 */
const HASH_CHECK_ZONES = new Set<ArtifactZone>([
  'position',
  'decision',
  'workstream',
  'stakeholder_person',
  'stakeholder_account',
  'pre-mortem',
  'tripwire',
  'competitor',
]);

function shouldHashCheck(zone: ArtifactZone): boolean {
  return HASH_CHECK_ZONES.has(zone);
}

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
// Vault root discovery + assertion
// ---------------------------------------------------------------------------

/** Walk up from filePath to find the git root (directory containing .git).
 *  Throws VaultNotInitializedError if no .git found or vault has 0 commits.
 */
async function assertVaultInitialized(filePath: string): Promise<string> {
  const git = simpleGit(path.dirname(filePath));
  let vaultRoot: string;
  try {
    vaultRoot = await git.revparse(['--show-toplevel']);
    vaultRoot = vaultRoot.trim();
  } catch {
    throw new VaultNotInitializedError(path.dirname(filePath));
  }

  try {
    const logResult = await git.log(['--oneline', '-1']);
    if (!logResult.latest) {
      throw new VaultNotInitializedError(vaultRoot);
    }
  } catch (err) {
    if (err instanceof VaultNotInitializedError) throw err;
    throw new VaultNotInitializedError(vaultRoot);
  }

  return vaultRoot;
}

// ---------------------------------------------------------------------------
// API types (pinned by safewrite.spec.ts)
// ---------------------------------------------------------------------------

export interface SafeWriteOpts {
  /** Agent identifier for git commit message. */
  agent: string;
  /** Run ID for git commit message. */
  runId: string;
  /** Playbook name for git commit message. */
  playbook: string;
  /** Whether to commit to vault git after write. */
  commitVault: boolean;
  /** ArtifactZone — determines hash-check policy. */
  zone: ArtifactZone;
  /** B39: optional logger for git-commit failure (defaults to console.error). */
  logger?: SafeWriteLogger;
  /** B39: optional IPC emitter for vault.commit.failed event. */
  emitIpc?: SafeWriteEmitIpc;
  /** B39: optional SQLite db for vault_commit_failures audit row. */
  db?: SafeWriteDb;
}

export type SafeWriteResult =
  | { result: 'ok'; sha: string; commitSha?: string }
  | { result: 'conflict'; sidecarPath: string; preHash: string; reReadHash: string };

// ---------------------------------------------------------------------------
// Core SafeWrite algorithm
// ---------------------------------------------------------------------------

/** Write content to absPath atomically via temp-file + rename.
 *
 *  Algorithm:
 *  1. assertVaultInitialized: walk up to find git root; throw VaultNotInitializedError if 0 commits.
 *  2. Per-path lock: serialize concurrent writes to same path.
 *  3. If zone is in HASH_CHECK_ZONES: pre-read + hash current content.
 *  4. Write temp file.
 *  5. If hashCheck: re-read + hash temp file.
 *  6. If preHash !== reReadHash: sidecar conflict.
 *  7. Else: atomic rename temp → target.
 *  8. If commitVault: stage + commit.
 *  9. Return result.
 */
export async function safeWrite(
  filePath: string,
  content: string,
  opts: SafeWriteOpts,
): Promise<SafeWriteResult> {
  const { agent, runId, playbook, commitVault, zone, logger, emitIpc, db } = opts;

  // 1. Assert vault is initialized (throws VaultNotInitializedError if not).
  const vaultRoot = await assertVaultInitialized(filePath);
  const hashCheck = shouldHashCheck(zone);

  return withPathLock(filePath, async () => {
    // 3. Pre-read hash (only if hashCheck).
    let preHash: string | null = null;
    if (hashCheck) {
      try {
        const existing = await fs.readFile(filePath, 'utf8');
        preHash = sha256(existing);
      } catch {
        // File does not yet exist — no conflict possible on first write.
        preHash = null;
      }
    }

    // 4. Write temp file alongside target.
    const tempPath = `${filePath}.tmp-${crypto.randomUUID()}`;
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(tempPath, content, 'utf8');

    // 5. Re-read hash (hash what was actually written to temp).
    let reReadHash: string | null = null;
    if (hashCheck && preHash !== null) {
      const reReadContent = await fs.readFile(filePath, 'utf8');
      reReadHash = sha256(reReadContent);
    }

    // 6. Conflict check: compare preHash vs re-read of THE TARGET (not temp).
    if (hashCheck && preHash !== null && reReadHash !== null && preHash !== reReadHash) {
      // Conflict: rename temp to sidecar.
      const sidecarPath = filePath.replace(/\.md$/, '') + `.proposed-${isoStamp()}.md`;
      await fs.rename(tempPath, sidecarPath);

      return {
        result: 'conflict' as const,
        sidecarPath,
        preHash,
        reReadHash,
      };
    }

    // 7. No conflict: atomic rename temp → target.
    await fs.rename(tempPath, filePath);

    // Compute sha256 of written content (content hash, not git sha).
    const writtenSha = sha256(content);

    // 8. Git commit.
    let commitSha: string | undefined;
    if (commitVault) {
      try {
        const git = simpleGit(vaultRoot);
        // AC-6 realpath fix: macOS /var is a symlink to /private/var.
        // os.tmpdir() returns /var/... but git revparse returns /private/var/...
        // Resolve the real path so path.relative produces a clean relative path.
        const realFilePath = await fs.realpath(filePath).catch(() => filePath);
        const realVaultRoot = await fs.realpath(vaultRoot).catch(() => vaultRoot);
        const relPath = path.relative(realVaultRoot, realFilePath).split(path.sep).join('/');
        await git.add(filePath);
        const msg = `c-suite: ${agent} wrote ${relPath} during ${playbook} run ${runId}`;
        const result = await git.commit(msg, [filePath]);
        commitSha = result.commit;
      } catch (err) {
        // B39: write succeeded; commit failed. Non-fatal but VISIBLE.
        // Source: docs/reviews/ultrareview-2026-05-27.md "Critical Fix 5"
        const errorMessage = err instanceof Error ? err.message : String(err);

        // (1) Log.
        const log: SafeWriteLogger = logger ?? {
          error: (obj, msg) => {
            // eslint-disable-next-line no-console
            console.error(JSON.stringify({ ...obj, message: msg ?? 'vault.commit.failed' }));
          },
        };
        log.error(
          { component: 'safeWrite', runId, path: filePath, agent, playbook, err: errorMessage },
          'vault git commit failed (non-fatal)',
        );

        // (2) IPC event.
        try {
          emitIpc?.({
            kind: 'vault.commit.failed',
            payload: { path: filePath, error: errorMessage, runId },
          });
        } catch {
          // emitIpc may itself fail (e.g., closed MessagePort). Never re-throw.
        }

        // (3) SQLite audit row for future retry.
        if (db) {
          try {
            db.prepare(
              `INSERT INTO vault_commit_failures (run_id, path, agent, playbook, error)
               VALUES (?, ?, ?, ?, ?)`,
            ).run(runId, filePath, agent, playbook, errorMessage);
          } catch {
            // Schema missing or db closed — log was already emitted; do not throw.
          }
        }
      }
    }

    return { result: 'ok' as const, sha: writtenSha, commitSha };
  });
}
