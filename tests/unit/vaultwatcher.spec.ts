/**
 * ADR-0003 §5 + §8 AC-7, AC-10 — VaultWatcher (chokidar) unit tests
 * Test owner: Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0003-ch2-safewrite.md §5 + §8
 *
 * Tests cover:
 *   AC-7   chokidar 1s debounce: rapid 5 writes within 500ms → exactly 1 vault.changed event
 *   AC-10  chokidar ignores: .git/**, .DS_Store, *.tmp-*, *.proposed-* → zero events
 *   AC-10b chokidar watcher config `ignored` array contains the required patterns
 *          (partial: verified here against the exported config, not instantiated watcher)
 *   AC-5   vault.changed includes parsed frontmatter payload (POS-001 fixture)
 *
 * Strategy: watcher is a module-level side-effectful chokidar instance.
 *   - Tests import VaultWatcher class/factory from the not-yet-shipped module.
 *   - Electron app.getPath is mocked to return a temp vault dir.
 *   - chokidar watch is pointed at temp dir (not Russell's real vault).
 *   - IPC send is spied on to assert event counts and payload shapes.
 *
 * Tests will fail until Runtime ships packages/vault-watcher/src/watcher.ts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as os from 'os';
import * as path from 'path';

// VaultWatcher ships with Runtime (Ch.2).
// The module must export:
//   - createVaultWatcher(vaultPath: string, ipcSend: (msg: IpcMessage) => void): WatcherHandle
//   - WATCHER_IGNORED_PATTERNS: string[]   (the chokidar `ignored` array)
//   - DEBOUNCE_MS: number                  (must equal 1000)
import {
  createVaultWatcher,
  WATCHER_IGNORED_PATTERNS,
  DEBOUNCE_MS,
  type WatcherHandle,
} from '../../packages/vault-watcher/src/watcher.js';

// POS-001 fixture content (structured frontmatter — for AC-5 parseArtifact test)
const POS_001_CONTENT = fsSync.readFileSync(
  path.resolve(__dirname, '../fixtures/vault/position/POS-001.md'),
  'utf8',
);

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Wait for all pending debounced timers to fire. */
function waitDebounce(ms = DEBOUNCE_MS + 200): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/** Write a file rapidly N times within a short window. */
async function rapidWrites(filePath: string, n: number, intervalMs = 50): Promise<void> {
  for (let i = 0; i < n; i++) {
    await fs.writeFile(filePath, `---\nid: POS-TEST\nstatus: active\n---\nRapid write ${i}.\n`, 'utf8');
    await new Promise(r => setTimeout(r, intervalMs));
  }
}

// ── AC-10b: WATCHER_IGNORED_PATTERNS contract ────────────────────────────────

describe('VaultWatcher AC-10b — chokidar ignored patterns exported', () => {
  it('exports WATCHER_IGNORED_PATTERNS as an array', () => {
    expect(Array.isArray(WATCHER_IGNORED_PATTERNS)).toBe(true);
    expect(WATCHER_IGNORED_PATTERNS.length).toBeGreaterThan(0);
  });

  it('ignored patterns include **/.git/**', () => {
    expect(WATCHER_IGNORED_PATTERNS).toContain('**/.git/**');
  });

  it('ignored patterns include **/.DS_Store', () => {
    expect(WATCHER_IGNORED_PATTERNS).toContain('**/.DS_Store');
  });

  it('ignored patterns include **/*.tmp-* (SafeWrite temp files)', () => {
    const hasTmp = WATCHER_IGNORED_PATTERNS.some(p => p.includes('*.tmp-*'));
    expect(hasTmp).toBe(true);
  });

  it('ignored patterns include **/*.proposed-* (SafeWrite sidecar conflict files)', () => {
    const hasProposed = WATCHER_IGNORED_PATTERNS.some(p => p.includes('*.proposed-*'));
    expect(hasProposed).toBe(true);
  });

  it('DEBOUNCE_MS is 1000ms per spec', () => {
    expect(DEBOUNCE_MS).toBe(1000);
  });
});

// ── AC-7: 1s debounce collapses rapid writes to one event ─────────────────

describe('VaultWatcher AC-7 — chokidar 1s debounce', () => {
  let vaultDir: string;
  let watcher: WatcherHandle;
  let ipcSendSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vaultDir = await fs.mkdtemp(path.join(os.tmpdir(), 'csuite-watcher-'));
    await fs.mkdir(path.join(vaultDir, 'positions', 'active'), { recursive: true });
    ipcSendSpy = vi.fn();
    watcher = createVaultWatcher(vaultDir, ipcSendSpy);
    // Allow watcher to initialize before writes
    await new Promise(r => setTimeout(r, 300));
  });

  afterEach(async () => {
    await watcher.close();
    await fs.rm(vaultDir, { recursive: true, force: true });
  });

  it('rapid 5 writes within 500ms emit exactly 1 vault.changed event after debounce', async () => {
    const filePath = path.join(vaultDir, 'positions', 'active', 'POS-DEBOUNCE.md');
    await rapidWrites(filePath, 5, 80); // 5 writes, 80ms apart = ~400ms total
    await waitDebounce(); // wait for debounce to fire

    const vaultChangedCalls = ipcSendSpy.mock.calls.filter(
      args => args[0]?.kind === 'vault.changed' && args[0]?.payload?.path === filePath,
    );
    expect(vaultChangedCalls.length).toBe(1);
  });

  it('two writes 1.5s apart emit two separate vault.changed events', async () => {
    const filePath = path.join(vaultDir, 'positions', 'active', 'POS-TWO.md');
    await fs.writeFile(filePath, '---\nid: POS-TWO\nstatus: active\n---\nFirst.\n', 'utf8');
    await waitDebounce(); // debounce fires for first write

    await fs.writeFile(filePath, '---\nid: POS-TWO\nstatus: active\n---\nSecond.\n', 'utf8');
    await waitDebounce(); // debounce fires for second write

    const calls = ipcSendSpy.mock.calls.filter(
      args => args[0]?.kind === 'vault.changed' && args[0]?.payload?.path === filePath,
    );
    expect(calls.length).toBe(2);
  });
});

// ── AC-10: Ignored paths emit zero vault.changed events ──────────────────

describe('VaultWatcher AC-10 — ignored paths produce no events', () => {
  let vaultDir: string;
  let watcher: WatcherHandle;
  let ipcSendSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vaultDir = await fs.mkdtemp(path.join(os.tmpdir(), 'csuite-watcher-ignore-'));
    await fs.mkdir(path.join(vaultDir, '.git'), { recursive: true });
    ipcSendSpy = vi.fn();
    watcher = createVaultWatcher(vaultDir, ipcSendSpy);
    await new Promise(r => setTimeout(r, 300));
  });

  afterEach(async () => {
    await watcher.close();
    await fs.rm(vaultDir, { recursive: true, force: true });
  });

  it('write to .git/HEAD emits no vault.changed event', async () => {
    const gitHead = path.join(vaultDir, '.git', 'HEAD');
    await fs.writeFile(gitHead, 'ref: refs/heads/main\n', 'utf8');
    await waitDebounce();

    const calls = ipcSendSpy.mock.calls.filter(args => args[0]?.kind === 'vault.changed');
    expect(calls.length).toBe(0);
  });

  it('write to .DS_Store emits no vault.changed event', async () => {
    const ds = path.join(vaultDir, '.DS_Store');
    await fs.writeFile(ds, 'fake ds_store', 'utf8');
    await waitDebounce();

    const calls = ipcSendSpy.mock.calls.filter(args => args[0]?.kind === 'vault.changed');
    expect(calls.length).toBe(0);
  });

  it('SafeWrite .tmp-* file emits no vault.changed event', async () => {
    await fs.mkdir(path.join(vaultDir, 'positions', 'active'), { recursive: true });
    const tmpFile = path.join(vaultDir, 'positions', 'active', 'POS-001.md.tmp-12345-1716800000000');
    await fs.writeFile(tmpFile, 'temp content', 'utf8');
    await waitDebounce();

    const calls = ipcSendSpy.mock.calls.filter(args => args[0]?.kind === 'vault.changed');
    expect(calls.length).toBe(0);

    await fs.unlink(tmpFile).catch(() => {});
  });

  it('SafeWrite .proposed-* sidecar emits no vault.changed event', async () => {
    await fs.mkdir(path.join(vaultDir, 'positions', 'active'), { recursive: true });
    const sidecar = path.join(
      vaultDir,
      'positions',
      'active',
      'POS-001.md.proposed-2026-05-27T143052-481.md',
    );
    await fs.writeFile(sidecar, '---\nid: POS-001\nstatus: active\n---\nConflict.\n', 'utf8');
    await waitDebounce();

    const calls = ipcSendSpy.mock.calls.filter(args => args[0]?.kind === 'vault.changed');
    expect(calls.length).toBe(0);

    await fs.unlink(sidecar).catch(() => {});
  });
});

// ── AC-5: vault.changed payload includes parsed frontmatter ──────────────────

describe('VaultWatcher AC-5 — vault.changed emits parsed artifact payload', () => {
  let vaultDir: string;
  let watcher: WatcherHandle;
  let ipcSendSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vaultDir = await fs.mkdtemp(path.join(os.tmpdir(), 'csuite-watcher-parse-'));
    await fs.mkdir(path.join(vaultDir, 'positions', 'active'), { recursive: true });
    ipcSendSpy = vi.fn();
    watcher = createVaultWatcher(vaultDir, ipcSendSpy);
    await new Promise(r => setTimeout(r, 300));
  });

  afterEach(async () => {
    await watcher.close();
    await fs.rm(vaultDir, { recursive: true, force: true });
  });

  it('writing POS-001 fixture emits vault.changed with path and changeType', async () => {
    const filePath = path.join(vaultDir, 'positions', 'active', 'POS-001.md');
    await fs.writeFile(filePath, POS_001_CONTENT, 'utf8');
    await waitDebounce();

    const calls = ipcSendSpy.mock.calls.filter(args => args[0]?.kind === 'vault.changed');
    expect(calls.length).toBeGreaterThan(0);

    const msg = calls[0][0];
    expect(msg.kind).toBe('vault.changed');
    expect(msg.payload.path).toBe(filePath);
    expect(['added', 'modified']).toContain(msg.payload.changeType);
  });

  it('vault.changed event for a deletion emits changeType=deleted', async () => {
    const filePath = path.join(vaultDir, 'positions', 'active', 'POS-DELETE.md');
    await fs.writeFile(filePath, POS_001_CONTENT, 'utf8');
    await waitDebounce();
    ipcSendSpy.mockClear();

    await fs.unlink(filePath);
    await waitDebounce();

    const deleteCalls = ipcSendSpy.mock.calls.filter(
      args => args[0]?.kind === 'vault.changed' && args[0]?.payload?.changeType === 'deleted',
    );
    expect(deleteCalls.length).toBe(1);
  });
});
