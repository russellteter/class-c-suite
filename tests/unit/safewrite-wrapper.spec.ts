/**
 * ADR-0003 §8 AC-5 — SafeWrite wrapper IPC emission test
 * Test owner: Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0003-ch2-safewrite.md §3.2 + §8 AC-5
 *
 * Verifies that apps/utility/src/safewrite/index.ts (the utility wrapper)
 * calls emitFn with a safewrite.conflict IpcMessage when a shared-zone
 * write detects external modification (preHash !== reReadHash).
 *
 * The primitive (packages/vault-writer/src/safeWrite.ts) does NOT emit IPC —
 * it returns {result:'conflict'} only. Emission is the wrapper's responsibility.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import simpleGit from 'simple-git';
import type { IpcMessage } from '@c-suite/shared-types/ipc';

// Plumbing: vi.mock with spy:true allows vi.spyOn on Node built-in ESM namespaces.
vi.mock('fs/promises', { spy: true });

// ── Helpers ──────────────────────────────────────────────────────────────────

async function makeGitVault(dir: string): Promise<void> {
  const git = simpleGit(dir);
  await git.init();
  await git.addConfig('user.email', 'test@csuite.local');
  await git.addConfig('user.name', 'C-Suite Test');
  // Baseline commit so assertVaultInitialized (B22 guard) passes.
  const seedFile = path.join(dir, '.gitkeep');
  await fs.writeFile(seedFile, '');
  await git.add('.');
  await git.commit('vault: pre-C-Suite SafeWrite baseline (manual snapshot)');
}

// ── AC-5: safewrite.conflict IPC emission on conflict ────────────────────────

describe('SafeWrite wrapper AC-5 — safewrite.conflict IPC emitted on conflict', () => {
  let vaultDir: string;
  let filePath: string;

  beforeEach(async () => {
    vaultDir = await fs.mkdtemp(path.join(os.tmpdir(), 'csuite-wrapper-ipc-'));
    await makeGitVault(vaultDir);
    await fs.mkdir(path.join(vaultDir, 'positions', 'active'), { recursive: true });
    filePath = path.join(vaultDir, 'positions', 'active', 'POS-WRAPPER.md');
    await fs.writeFile(
      filePath,
      '---\nid: POS-WRAPPER\nstatus: active\n---\nOriginal.\n',
      'utf8',
    );
  });

  afterEach(async () => {
    await fs.rm(vaultDir, { recursive: true, force: true });
    vi.resetModules();
    delete process.env.VAULT_PATH;
  });

  it('emits IpcMessage with kind=safewrite.conflict when external write detected', async () => {
    // Set VAULT_PATH before dynamic import so the wrapper captures it at module load.
    process.env.VAULT_PATH = vaultDir;

    // Dynamic import after env + resetModules so the wrapper re-reads VAULT_PATH.
    const { initSafeWrite, safeWrite } = await import(
      '../../apps/utility/src/safewrite/index.js'
    );

    const emitFn = vi.fn<[IpcMessage], void>();
    await initSafeWrite({ emit: emitFn });

    // Force conflict: spy on fs.readFile to return different content on the
    // second read of the target (simulates external write between pre-hash and re-hash).
    // Mirrors the AC-4 pattern used in safewrite.spec.ts.
    const originalReadFile = fs.readFile;
    let readCount = 0;
    const readFileSpy = vi.spyOn(fs, 'readFile').mockImplementation(async (p, encoding) => {
      const content = await originalReadFile(p as string, encoding as BufferEncoding);
      if (String(p) === filePath) {
        readCount++;
        if (readCount === 2) {
          // Second read of the target → simulate external modification.
          return '---\nid: POS-WRAPPER\nstatus: active\n---\nExternal edit.\n';
        }
      }
      return content;
    });

    const result = await safeWrite({
      absPath: filePath,
      content: '---\nid: POS-WRAPPER\nstatus: active\n---\nC-Suite update.\n',
      agent: 'Synthesizer',
      playbook: 'cash_lever_vs_trough',
      runId: 'run-wrapper-001',
    });

    readFileSpy.mockRestore();

    // The wrapper must have detected the conflict (preHash !== reReadHash).
    expect(result).toMatchObject({ ok: false, conflict: true });
    expect((result as { sidecarPath: string }).sidecarPath).toMatch(
      /\.proposed-\d{4}-\d{2}-\d{2}T\d{6}-\d{3}\.md$/,
    );

    // AC-5 core assertion: emitFn was called exactly once with safewrite.conflict.
    expect(emitFn).toHaveBeenCalledTimes(1);
    const emitted = emitFn.mock.calls[0][0];
    expect(emitted.kind).toBe('safewrite.conflict');
    expect(emitted.payload).toMatchObject({
      path: filePath,
      sidecarPath: (result as { sidecarPath: string }).sidecarPath,
    });
  });

  it('does NOT emit safewrite.conflict on a successful write', async () => {
    process.env.VAULT_PATH = vaultDir;

    const { initSafeWrite, safeWrite } = await import(
      '../../apps/utility/src/safewrite/index.js'
    );

    const emitFn = vi.fn<[IpcMessage], void>();
    await initSafeWrite({ emit: emitFn });

    const result = await safeWrite({
      absPath: filePath,
      content: '---\nid: POS-WRAPPER\nstatus: active\n---\nSuccessful update.\n',
      agent: 'Synthesizer',
      playbook: 'cash_lever_vs_trough',
      runId: 'run-wrapper-002',
    });

    expect(result).toMatchObject({ ok: true });
    // No safewrite.conflict emission on success path.
    const conflictEmissions = emitFn.mock.calls.filter(
      ([msg]) => msg.kind === 'safewrite.conflict',
    );
    expect(conflictEmissions).toHaveLength(0);
  });
});
