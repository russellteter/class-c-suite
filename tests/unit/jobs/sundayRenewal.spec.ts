/**
 * tests/unit/jobs/sundayRenewal.spec.ts
 * Source: docs/decisions/0012-ch10-scheduler-autonomy.md AC-7
 * Verifies B7 + B20 mitigations present; Chorus degrades gracefully.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';

import { runSundayRenewal } from '../../../apps/utility/src/jobs/sundayRenewal.js';

function makeDb(): unknown {
  return {
    prepare: vi.fn().mockReturnValue({
      get: vi.fn(),
      run: vi.fn(),
      all: vi.fn().mockReturnValue([]),
    }),
  };
}

describe('sundayRenewal', () => {
  let emitIpc: ReturnType<typeof vi.fn>;
  let tmpDir: string;

  beforeEach(async () => {
    emitIpc = vi.fn();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'renewal-'));
  });

  it('produces a renewal-sweep memo file', async () => {
    const ctx = { db: makeDb() as never, emitIpc, vaultRoot: tmpDir };
    const result = await runSundayRenewal(ctx);

    expect(result.outputMemoPath).toBeDefined();
    expect(result.outputMemoPath!).toContain('renewal-sweep');
    const fileExists = await fs.stat(result.outputMemoPath!).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);
  });

  it('memo contains RENEWAL_SWEEP stamp', async () => {
    const ctx = { db: makeDb() as never, emitIpc, vaultRoot: tmpDir };
    const result = await runSundayRenewal(ctx);

    const content = await fs.readFile(result.outputMemoPath!, 'utf-8');
    expect(content).toContain('RENEWAL_SWEEP');
  });

  it('memo contains B7 mitigation marker', async () => {
    const ctx = { db: makeDb() as never, emitIpc, vaultRoot: tmpDir };
    const result = await runSundayRenewal(ctx);

    const content = await fs.readFile(result.outputMemoPath!, 'utf-8');
    expect(content).toContain('b7Mitigation: active');
  });

  it('memo contains B20 mitigation marker', async () => {
    const ctx = { db: makeDb() as never, emitIpc, vaultRoot: tmpDir };
    const result = await runSundayRenewal(ctx);

    const content = await fs.readFile(result.outputMemoPath!, 'utf-8');
    expect(content).toContain('b20Mitigation: active');
  });

  it('degrades gracefully when Chorus signals unavailable', async () => {
    // Chorus is not wired in the stub — degradation path should not throw.
    const ctx = { db: makeDb() as never, emitIpc, vaultRoot: tmpDir };
    const result = await runSundayRenewal(ctx);

    // Should complete without throwing.
    expect(result).toBeDefined();
    expect(result.outputMemoPath).toBeDefined();
  });

  it('memo flags missing signals when chorus degraded', async () => {
    const ctx = { db: makeDb() as never, emitIpc, vaultRoot: tmpDir };
    const result = await runSundayRenewal(ctx);

    const content = await fs.readFile(result.outputMemoPath!, 'utf-8');
    // Either "no data" or "unavailable" should appear for chorus signals.
    expect(content.toLowerCase()).toMatch(/unavailable|no data|pending/);
  });

  it('returns degradedSources as array', async () => {
    const ctx = { db: makeDb() as never, emitIpc, vaultRoot: tmpDir };
    const result = await runSundayRenewal(ctx);
    expect(Array.isArray(result.degradedSources)).toBe(true);
  });
});
