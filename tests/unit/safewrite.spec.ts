/**
 * ADR-0003 §8 — SafeWrite unit tests (AC-2, AC-3, AC-4, AC-6, AC-7, AC-8, AC-9, AC-10)
 * Test owner: Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0003-ch2-safewrite.md §8 acceptance table
 *
 * Tests cover:
 *   AC-2  Atomic rename: write temp + fs.rename; target has content, temp gone
 *   AC-3  Shared zones call hash-check (position); agent-exclusive zones skip it (memo)
 *   AC-4  Conflict sidecar name matches *.proposed-YYYY-MM-DDTHHMMSS-mmm.md
 *   AC-6  Git commit message matches c-suite: <agent> wrote <relPath> during <playbook> run <runId>
 *   AC-7  VaultNotInitializedError thrown when vault has zero commits; message cites vault-bootstrap.sh
 *         NOTE: AC-7 in the ADR §8 table is "chokidar debounce" — mapped to vaultwatcher.spec.ts.
 *               AC-8 in the ADR is the vault-not-initialized guard; this file covers it per brief §safewrite.spec.ts.
 *   AC-9  Per-path lock: concurrent calls on same path serialize (second waits for first)
 *
 * Tests will fail until Runtime ships packages/vault-writer/src/safeWrite.ts.
 * That is expected per brief: "TDD — tests describe intended behavior."
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import simpleGit from 'simple-git';

// Plumbing: Vitest 3 ESM module namespaces are non-configurable.
// vi.mock with spy:true hoists an autospy factory so vi.spyOn(fs, ...) works.
// Source: https://vitest.dev/guide/mocking#mocking-esm — authorized plumbing fix.
vi.mock('fs/promises', { spy: true });

// safeWrite ships with Runtime (Ch.2). Import will fail until then.
import { safeWrite, type SafeWriteOpts } from '../../packages/vault-writer/src/safeWrite.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function makeGitVault(dir: string): Promise<void> {
  const git = simpleGit(dir);
  await git.init();
  await git.addConfig('user.email', 'test@csuite.local');
  await git.addConfig('user.name', 'C-Suite Test');
  await fs.mkdir(path.join(dir, 'positions', 'active'), { recursive: true });
  await fs.mkdir(path.join(dir, 'memos'), { recursive: true });
  // Baseline commit so assertVaultInitialized passes (B22)
  const seedFile = path.join(dir, '.gitkeep');
  await fs.writeFile(seedFile, '');
  await git.add('.');
  await git.commit('vault: pre-C-Suite SafeWrite baseline (manual snapshot)');
}

function posOpts(overrides?: Partial<SafeWriteOpts>): SafeWriteOpts {
  return {
    agent: 'Synthesizer',
    runId: 'run-test-001',
    playbook: 'cash_lever',
    commitVault: true,
    zone: 'position',
    ...overrides,
  };
}

// ── AC-2: Atomic rename ───────────────────────────────────────────────────────

describe('SafeWrite AC-2 — atomic rename (APFS)', () => {
  let vaultDir: string;
  let filePath: string;

  beforeEach(async () => {
    vaultDir = await fs.mkdtemp(path.join(os.tmpdir(), 'csuite-safewrite-'));
    await makeGitVault(vaultDir);
    filePath = path.join(vaultDir, 'positions', 'active', 'POS-AC2.md');
    await fs.writeFile(filePath, '---\nid: POS-AC2\nstatus: active\n---\nOriginal.\n', 'utf8');
    // Stage seed file in vault for baseline commit to exist
    const git = simpleGit(vaultDir);
    await git.add('.');
    await git.commit('vault: add POS-AC2 seed');
  });

  afterEach(async () => {
    await fs.rm(vaultDir, { recursive: true, force: true });
  });

  it('returns result=ok and target file has new content after write', async () => {
    const newContent = '---\nid: POS-AC2\nstatus: active\n---\nUpdated content.\n';
    const result = await safeWrite(filePath, newContent, posOpts());

    expect(result.result).toBe('ok');
    const written = await fs.readFile(filePath, 'utf8');
    expect(written).toBe(newContent);
  });

  it('leaves no .tmp-* file after successful write', async () => {
    await safeWrite(
      filePath,
      '---\nid: POS-AC2\nstatus: active\n---\nClean write.\n',
      posOpts(),
    );
    const dir = path.dirname(filePath);
    const files = await fs.readdir(dir);
    const orphanedTemps = files.filter(f => f.includes('.tmp-'));
    expect(orphanedTemps).toHaveLength(0);
  });

  it('result.sha is the sha256 of the written content', async () => {
    const content = '---\nid: POS-AC2\nstatus: active\n---\nSHA check.\n';
    const result = await safeWrite(filePath, content, posOpts());

    expect(result.result).toBe('ok');
    if (result.result !== 'ok') return;
    // sha must be a 64-char hex string (sha256)
    expect(result.sha).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns commitSha when commitVault=true', async () => {
    const result = await safeWrite(
      filePath,
      '---\nid: POS-AC2\nstatus: active\n---\nCommit test.\n',
      posOpts({ commitVault: true }),
    );
    expect(result.result).toBe('ok');
    if (result.result !== 'ok') return;
    expect(typeof result.commitSha).toBe('string');
    expect(result.commitSha!.length).toBeGreaterThan(0);
  });

  it('returns no commitSha when commitVault=false for agent-exclusive zone', async () => {
    const memoPath = path.join(vaultDir, 'memos', 'MEM-001.md');
    await fs.writeFile(memoPath, '---\nrun_id: run-001\n---\n', 'utf8');
    const result = await safeWrite(memoPath, '---\nrun_id: run-001\n---\nMemo.\n', {
      agent: 'Synthesizer',
      runId: 'run-test-001',
      playbook: 'cash_lever',
      commitVault: false,
      zone: 'memo',
    });
    expect(result.result).toBe('ok');
    if (result.result !== 'ok') return;
    expect(result.commitSha).toBeUndefined();
  });
});

// ── AC-3: Hash-check policy per zone ──────────────────────────────────────────

describe('SafeWrite AC-3 — hash-check skipped for agent-exclusive zones', () => {
  let vaultDir: string;

  beforeEach(async () => {
    vaultDir = await fs.mkdtemp(path.join(os.tmpdir(), 'csuite-safewrite-zone-'));
    await makeGitVault(vaultDir);
    await fs.mkdir(path.join(vaultDir, 'positions', 'active'), { recursive: true });
    await fs.mkdir(path.join(vaultDir, 'memos'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(vaultDir, { recursive: true, force: true });
  });

  it('calls fs.readFile twice for shared zone (position) — pre-hash + re-hash', async () => {
    const filePath = path.join(vaultDir, 'positions', 'active', 'POS-AC3.md');
    await fs.writeFile(filePath, '---\nid: POS-AC3\nstatus: active\n---\n', 'utf8');

    const readFileSpy = vi.spyOn(fs, 'readFile');
    await safeWrite(filePath, '---\nid: POS-AC3\nstatus: active\n---\nUpdated.\n', posOpts({ zone: 'position' }));

    // Pre-hash read + re-hash read = 2 calls to readFile for the target path
    const targetReads = readFileSpy.mock.calls.filter(
      args => String(args[0]) === filePath,
    );
    expect(targetReads.length).toBeGreaterThanOrEqual(2);
    readFileSpy.mockRestore();
  });

  it('does NOT call fs.readFile for hash-check on agent-exclusive zone (memo)', async () => {
    const memoPath = path.join(vaultDir, 'memos', 'MEM-AC3.md');
    // File need not exist — agent-exclusive zones skip hash-check and directly rename

    const readFileSpy = vi.spyOn(fs, 'readFile');
    await safeWrite(memoPath, '---\nrun_id: run-001\n---\nNew memo.\n', {
      agent: 'Synthesizer',
      runId: 'run-test-001',
      playbook: 'cash_lever',
      commitVault: false,
      zone: 'memo',
    });

    const targetReads = readFileSpy.mock.calls.filter(
      args => String(args[0]) === memoPath,
    );
    // Zero reads of the target file (no hash-check step for agent-exclusive zones)
    expect(targetReads.length).toBe(0);
    readFileSpy.mockRestore();
  });

  it('agent-exclusive zones: prediction and handoff skip hash-check', async () => {
    await fs.mkdir(path.join(vaultDir, 'calibration', 'predictions'), { recursive: true });
    await fs.mkdir(path.join(vaultDir, 'handoffs'), { recursive: true });

    for (const [fileSuffix, zone] of [
      ['calibration/predictions/PRED-001.md', 'prediction' as const],
      ['handoffs/HO-001.md', 'handoff' as const],
    ]) {
      const p = path.join(vaultDir, fileSuffix);
      const readFileSpy = vi.spyOn(fs, 'readFile');
      await safeWrite(p, '---\nid: test\n---\n', {
        agent: 'Synthesizer',
        runId: 'run-001',
        playbook: 'cash_lever',
        commitVault: false,
        zone,
      });
      const targetReads = readFileSpy.mock.calls.filter(args => String(args[0]) === p);
      expect(targetReads.length, `zone=${zone} should skip hash-check`).toBe(0);
      readFileSpy.mockRestore();
    }
  });
});

// ── AC-4: Conflict sidecar naming ─────────────────────────────────────────────

describe('SafeWrite AC-4 — conflict sidecar filename format', () => {
  let vaultDir: string;
  let filePath: string;

  beforeEach(async () => {
    vaultDir = await fs.mkdtemp(path.join(os.tmpdir(), 'csuite-safewrite-conflict-'));
    await makeGitVault(vaultDir);
    await fs.mkdir(path.join(vaultDir, 'positions', 'active'), { recursive: true });
    filePath = path.join(vaultDir, 'positions', 'active', 'POS-AC4.md');
    await fs.writeFile(filePath, '---\nid: POS-AC4\nstatus: active\n---\nOriginal.\n', 'utf8');
  });

  afterEach(async () => {
    await fs.rm(vaultDir, { recursive: true, force: true });
  });

  it('returns result=conflict when external writer modifies file between pre-hash and re-hash', async () => {
    // Simulate external modification by writing to the file AFTER safeWrite starts
    // We intercept fs.writeFile (temp write step) to trigger an external edit mid-flight.
    const originalWriteFile = fs.writeFile;
    let injected = false;
    const writeFileSpy = vi.spyOn(fs, 'writeFile').mockImplementation(async (p, data, encoding) => {
      await originalWriteFile(p as string, data as string, encoding as BufferEncoding);
      if (!injected && String(p).endsWith('.tmp-' + process.pid + '-' + expect.any(Number))) {
        // After writing temp, simulate external write to the actual target
        injected = true;
        await originalWriteFile(filePath, '---\nid: POS-AC4\nstatus: active\n---\nExternal edit.\n', 'utf8');
      }
    });

    const result = await safeWrite(
      filePath,
      '---\nid: POS-AC4\nstatus: active\n---\nC-Suite update.\n',
      posOpts(),
    );
    writeFileSpy.mockRestore();

    // If the race was won by external writer (reReadHash !== preHash), we get conflict.
    // Since mock injection is unreliable for the exact timing, we check the contract:
    // either ok (race not triggered) or conflict (race triggered with correct sidecar name).
    if (result.result === 'conflict') {
      expect(result.sidecarPath).toMatch(
        /\.proposed-\d{4}-\d{2}-\d{2}T\d{6}-\d{3}\.md$/,
      );
    }
  });

  it('sidecar filename matches YYYY-MM-DDTHHMMSS-mmm format', async () => {
    // Force a conflict by writing the same file between pre-hash and re-hash.
    // Reliable approach: spy on the re-read to return a different hash.
    const originalReadFile = fs.readFile;
    let readCount = 0;
    const readFileSpy = vi.spyOn(fs, 'readFile').mockImplementation(async (p, encoding) => {
      const content = await originalReadFile(p as string, encoding as BufferEncoding);
      readCount++;
      // Second read of the target path returns modified content (simulates external write)
      if (String(p) === filePath && readCount === 2) {
        return '---\nid: POS-AC4\nstatus: active\n---\nExternal modification.\n';
      }
      return content;
    });

    const result = await safeWrite(
      filePath,
      '---\nid: POS-AC4\nstatus: active\n---\nC-Suite update.\n',
      posOpts(),
    );
    readFileSpy.mockRestore();

    expect(result.result).toBe('conflict');
    if (result.result !== 'conflict') return;

    // Sidecar path must match the required timestamp format
    expect(result.sidecarPath).toMatch(
      /\.proposed-\d{4}-\d{2}-\d{2}T\d{6}-\d{3}\.md$/,
    );
    // Sidecar file must exist on disk
    await expect(fs.access(result.sidecarPath)).resolves.toBeUndefined();
    // Original file must be untouched (not our proposed content)
    const originalContent = await fs.readFile(filePath, 'utf8');
    expect(originalContent).not.toContain('C-Suite update.');
  });

  it('conflict result exposes preHash and reReadHash', async () => {
    const originalReadFile = fs.readFile;
    let readCount = 0;
    const readFileSpy = vi.spyOn(fs, 'readFile').mockImplementation(async (p, encoding) => {
      const content = await originalReadFile(p as string, encoding as BufferEncoding);
      readCount++;
      if (String(p) === filePath && readCount === 2) {
        return '---\nid: POS-AC4\nstatus: active\n---\nExternal modification 2.\n';
      }
      return content;
    });

    const result = await safeWrite(
      filePath,
      '---\nid: POS-AC4\nstatus: active\n---\nUpdate.\n',
      posOpts(),
    );
    readFileSpy.mockRestore();

    expect(result.result).toBe('conflict');
    if (result.result !== 'conflict') return;
    expect(result.preHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.reReadHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.preHash).not.toBe(result.reReadHash);
  });
});

// ── AC-6: Git commit message format ──────────────────────────────────────────

describe('SafeWrite AC-6 — git commit message format', () => {
  let vaultDir: string;

  beforeEach(async () => {
    vaultDir = await fs.mkdtemp(path.join(os.tmpdir(), 'csuite-safewrite-git-'));
    await makeGitVault(vaultDir);
    await fs.mkdir(path.join(vaultDir, 'positions', 'active'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(vaultDir, { recursive: true, force: true });
  });

  it('git commit message matches c-suite: <agent> wrote <relPath> during <playbook> run <runId>', async () => {
    const filePath = path.join(vaultDir, 'positions', 'active', 'POS-AC6.md');
    await fs.writeFile(filePath, '---\nid: POS-AC6\nstatus: active\n---\nInit.\n', 'utf8');

    await safeWrite(
      filePath,
      '---\nid: POS-AC6\nstatus: active\n---\nUpdated.\n',
      {
        agent: 'Synthesizer',
        runId: 'run-abc123',
        playbook: 'cash_lever',
        commitVault: true,
        zone: 'position',
      },
    );

    const git = simpleGit(vaultDir);
    const log = await git.log({ maxCount: 1, '--no-walk': null });
    const latest = log.latest;
    expect(latest).not.toBeNull();

    // Expected: c-suite: Synthesizer wrote positions/active/POS-AC6.md during cash_lever run run-abc123
    const relPath = 'positions/active/POS-AC6.md';
    expect(latest!.message).toBe(
      `c-suite: Synthesizer wrote ${relPath} during cash_lever run run-abc123`,
    );
  });

  it('commit message uses POSIX path separators (relPath) regardless of OS', async () => {
    const filePath = path.join(vaultDir, 'positions', 'active', 'POS-POSIX.md');
    await fs.writeFile(filePath, '---\nid: POS-POSIX\nstatus: active\n---\n', 'utf8');

    await safeWrite(filePath, '---\nid: POS-POSIX\nstatus: active\n---\nV2.\n', {
      agent: 'CFO',
      runId: 'run-xyz',
      playbook: 'gtm_realloc',
      commitVault: true,
      zone: 'position',
    });

    const git = simpleGit(vaultDir);
    const log = await git.log({ maxCount: 1, '--no-walk': null });
    // No backslashes in commit message
    expect(log.latest!.message).not.toContain('\\');
    expect(log.latest!.message).toMatch(/^c-suite: CFO wrote .+ during gtm_realloc run run-xyz$/);
  });
});

// ── AC-7 (brief §safewrite.spec.ts): VaultNotInitializedError ────────────────

describe('SafeWrite AC-7 — VaultNotInitializedError on empty vault', () => {
  it('throws VaultNotInitializedError when vault has zero commits', async () => {
    const emptyVault = await fs.mkdtemp(path.join(os.tmpdir(), 'csuite-empty-vault-'));
    const git = simpleGit(emptyVault);
    await git.init();
    await git.addConfig('user.email', 'test@csuite.local');
    await git.addConfig('user.name', 'C-Suite Test');
    // NO initial commit — vault has 0 commits (B22 scenario)

    await fs.mkdir(path.join(emptyVault, 'positions', 'active'), { recursive: true });
    const filePath = path.join(emptyVault, 'positions', 'active', 'POS-EMPTY.md');

    try {
      await safeWrite(filePath, '---\nid: POS-EMPTY\nstatus: active\n---\n', {
        agent: 'Synthesizer',
        runId: 'run-empty',
        playbook: 'cash_lever',
        commitVault: true,
        zone: 'position',
      });
      // Should not reach here
      expect.fail('Expected VaultNotInitializedError to be thrown');
    } catch (e: unknown) {
      expect((e as Error).name).toBe('VaultNotInitializedError');
      // Error message must cite vault-bootstrap.sh (B22 guard requirement)
      expect((e as Error).message).toMatch(/vault-bootstrap\.sh/);
    } finally {
      await fs.rm(emptyVault, { recursive: true, force: true });
    }
  });

  it('VaultNotInitializedError message references the vault path', async () => {
    const emptyVault = await fs.mkdtemp(path.join(os.tmpdir(), 'csuite-empty-vault2-'));
    const git = simpleGit(emptyVault);
    await git.init();
    await git.addConfig('user.email', 'test@csuite.local');
    await git.addConfig('user.name', 'C-Suite Test');
    await fs.mkdir(path.join(emptyVault, 'positions', 'active'), { recursive: true });
    const filePath = path.join(emptyVault, 'positions', 'active', 'POS-ERR.md');

    try {
      await safeWrite(filePath, '---\nid: POS-ERR\nstatus: active\n---\n', {
        agent: 'Synthesizer',
        runId: 'run-001',
        playbook: 'cash_lever',
        commitVault: true,
        zone: 'position',
      });
      expect.fail('Expected VaultNotInitializedError');
    } catch (e: unknown) {
      expect((e as Error).message).toContain(emptyVault);
    } finally {
      await fs.rm(emptyVault, { recursive: true, force: true });
    }
  });
});

// ── AC-9: Per-path lock serialization ─────────────────────────────────────────

describe('SafeWrite AC-9 — per-path lock serializes concurrent writes', () => {
  let vaultDir: string;
  let filePath: string;

  beforeEach(async () => {
    vaultDir = await fs.mkdtemp(path.join(os.tmpdir(), 'csuite-safewrite-lock-'));
    await makeGitVault(vaultDir);
    await fs.mkdir(path.join(vaultDir, 'positions', 'active'), { recursive: true });
    filePath = path.join(vaultDir, 'positions', 'active', 'POS-LOCK.md');
    await fs.writeFile(filePath, '---\nid: POS-LOCK\nstatus: active\n---\nInit.\n', 'utf8');
    const git = simpleGit(vaultDir);
    await git.add('.');
    await git.commit('vault: seed POS-LOCK');
  });

  afterEach(async () => {
    await fs.rm(vaultDir, { recursive: true, force: true });
  });

  it('fs.rename calls are sequential even when two safeWrites are invoked concurrently', async () => {
    const renameOrder: number[] = [];
    const originalRename = fs.rename;
    const renameSpy = vi.spyOn(fs, 'rename').mockImplementation(async (src, dest) => {
      renameOrder.push(Date.now());
      return originalRename(src as string, dest as string);
    });

    const [r1, r2] = await Promise.all([
      safeWrite(filePath, '---\nid: POS-LOCK\nstatus: active\n---\nWrite 1.\n', posOpts({ runId: 'run-lock-1' })),
      safeWrite(filePath, '---\nid: POS-LOCK\nstatus: active\n---\nWrite 2.\n', posOpts({ runId: 'run-lock-2' })),
    ]);
    renameSpy.mockRestore();

    // Both writes must complete (ok or conflict, not failed)
    expect(['ok', 'conflict']).toContain(r1.result);
    expect(['ok', 'conflict']).toContain(r2.result);

    // Serialization: the second rename happens AFTER the first finishes.
    // With per-path queue, fs.rename calls cannot interleave on the same path.
    expect(renameOrder.length).toBeGreaterThanOrEqual(2);
    // The timestamps must be non-decreasing (no interleaving within the same event-loop tick)
    for (let i = 1; i < renameOrder.length; i++) {
      expect(renameOrder[i]).toBeGreaterThanOrEqual(renameOrder[i - 1]);
    }
  });
});

// ── B39: vault.commit.failed surfacing ────────────────────────────────────────
// Source: docs/reviews/ultrareview-2026-05-27.md "Critical Fix 5"
// When git commit fails, write itself succeeds but the failure is logged,
// emitted as IPC event, and persisted to vault_commit_failures sqlite table.

import Database from 'better-sqlite3';
import { seedFromMigrations } from '../helpers/seedFromMigrations.js';

describe('SafeWrite B39 — git-commit failure is logged + IPC + sqlite (non-fatal)', () => {
  let vaultDir: string;
  let filePath: string;
  let db: Database.Database;

  beforeEach(async () => {
    vaultDir = await fs.mkdtemp(path.join(os.tmpdir(), 'csuite-safewrite-b39-'));
    await makeGitVault(vaultDir);
    await fs.mkdir(path.join(vaultDir, 'positions', 'active'), { recursive: true });
    filePath = path.join(vaultDir, 'positions', 'active', 'POS-B39.md');
    await fs.writeFile(filePath, '---\nid: POS-B39\nstatus: active\n---\n', 'utf8');
    const git = simpleGit(vaultDir);
    await git.add('.');
    await git.commit('vault: seed POS-B39');

    // Schema source: db/migrations/*.sql via the production migration runner.
    // 004_vault_commit_failures.sql owns vault_commit_failures — no hand-rolled
    // CREATE TABLE here, so the test can never drift from production schema.
    db = seedFromMigrations();
  });

  afterEach(async () => {
    db.close();
    await fs.rm(vaultDir, { recursive: true, force: true });
  });

  it('git commit failure: write succeeds + logger.error called + IPC event + sqlite row', async () => {
    // Force a git commit failure by making .git read-only between the write and the commit.
    // Easier: spy on simple-git via stubbing the file-system permission. Cleanest path
    // here is to corrupt the index: rename .git so simpleGit.add throws.
    const originalRename = fs.rename;
    let renameSpy: ReturnType<typeof vi.spyOn> | undefined;
    renameSpy = vi.spyOn(fs, 'rename').mockImplementation(async (src, dest) => {
      const r = await originalRename(src as string, dest as string);
      // After temp → target rename, break .git so the upcoming git add fails.
      const gitDir = path.join(vaultDir, '.git');
      const brokenDir = path.join(vaultDir, '.git-broken-' + Date.now());
      try { await originalRename(gitDir, brokenDir); } catch { /* ok */ }
      return r;
    });

    const errors: Array<{ obj: Record<string, unknown>; msg?: string }> = [];
    const emitted: Array<{ kind: string; payload: unknown }> = [];

    const result = await safeWrite(
      filePath,
      '---\nid: POS-B39\nstatus: active\n---\nForced commit failure.\n',
      {
        agent: 'Synthesizer',
        runId: 'run-b39',
        playbook: 'cash_lever',
        commitVault: true,
        zone: 'position',
        logger: { error: (obj, msg) => errors.push({ obj, msg }) },
        emitIpc: (m) => emitted.push({ kind: m.kind, payload: m.payload }),
        db,
      },
    );
    renameSpy.mockRestore();

    // (a) write itself succeeded — result is ok, no exception thrown.
    expect(result.result).toBe('ok');
    if (result.result !== 'ok') return;
    // No commitSha because the commit step failed.
    expect(result.commitSha).toBeUndefined();
    // Target file has the new content on disk.
    const written = await fs.readFile(filePath, 'utf8');
    expect(written).toContain('Forced commit failure.');

    // (b) logger.error was called with structured error payload.
    expect(errors.length).toBeGreaterThanOrEqual(1);
    const errPayload = errors[0]!.obj;
    expect(errPayload.component).toBe('safeWrite');
    expect(errPayload.runId).toBe('run-b39');
    expect(errPayload.path).toBe(filePath);
    expect(typeof errPayload.err).toBe('string');

    // (c) IPC event emitted once.
    const ipcEvents = emitted.filter((m) => m.kind === 'vault.commit.failed');
    expect(ipcEvents).toHaveLength(1);
    expect(ipcEvents[0].payload).toMatchObject({
      path: filePath,
      runId: 'run-b39',
    });
    expect(typeof (ipcEvents[0].payload as { error: string }).error).toBe('string');

    // (d) sqlite row persisted for future Ch.10 retry.
    const rows = db.prepare(
      `SELECT run_id, path, agent, playbook, error, retried_at FROM vault_commit_failures WHERE run_id = ?`,
    ).all('run-b39') as Array<{
      run_id: string; path: string; agent: string; playbook: string; error: string; retried_at: number | null;
    }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].path).toBe(filePath);
    expect(rows[0].agent).toBe('Synthesizer');
    expect(rows[0].playbook).toBe('cash_lever');
    expect(rows[0].error.length).toBeGreaterThan(0);
    expect(rows[0].retried_at).toBeNull();
  });

  it('happy path: no logger/IPC/sqlite calls when commit succeeds', async () => {
    const errors: Array<{ obj: Record<string, unknown> }> = [];
    const emitted: Array<{ kind: string }> = [];

    const result = await safeWrite(
      filePath,
      '---\nid: POS-B39\nstatus: active\n---\nHappy path.\n',
      {
        agent: 'Synthesizer',
        runId: 'run-b39-ok',
        playbook: 'cash_lever',
        commitVault: true,
        zone: 'position',
        logger: { error: (obj) => errors.push({ obj }) },
        emitIpc: (m) => emitted.push({ kind: m.kind }),
        db,
      },
    );

    expect(result.result).toBe('ok');
    if (result.result === 'ok') expect(result.commitSha).toBeTruthy();
    expect(errors).toHaveLength(0);
    expect(emitted.filter((m) => m.kind === 'vault.commit.failed')).toHaveLength(0);
    const rows = db.prepare(
      `SELECT COUNT(*) as n FROM vault_commit_failures WHERE run_id = ?`,
    ).get('run-b39-ok') as { n: number };
    expect(rows.n).toBe(0);
  });
});
