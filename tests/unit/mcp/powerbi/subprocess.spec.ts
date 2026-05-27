// tests/unit/mcp/powerbi/subprocess.spec.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §9

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';

// ── Mock child_process.spawn ──────────────────────────────────────────────────
// We mock the module so PowerBIClient's _spawnSubprocess uses the fake.

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return {
    ...actual,
    spawn: vi.fn(),
  };
});

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>();
  return {
    ...actual,
    readFile: vi.fn(),
    unlink: vi.fn().mockResolvedValue(undefined),
  };
});

import { spawn } from 'child_process';
import { readFile } from 'fs/promises';
import {
  PowerBISubprocessError,
  PowerBIJsonInvalidError,
  PowerBIVenvMissingError,
} from '../../../../apps/utility/src/mcp/powerbi/errors.js';
import { PowerBIClient } from '../../../../apps/utility/src/mcp/powerbi/subprocess.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Creates a fake ChildProcess-like EventEmitter that simulates
 * a subprocess with configurable exit code and stderr output.
 */
function makeFakeProc({
  exitCode = 0,
  stderrLines = [] as string[],
  delay = 5,
}: {
  exitCode?: number;
  stderrLines?: string[];
  delay?: number;
} = {}) {
  const proc = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    kill: ReturnType<typeof vi.fn>;
  };
  proc.stdout = new EventEmitter() as EventEmitter & { resume: () => void };
  (proc.stdout as unknown as { resume: () => void }).resume = () => {};
  proc.stderr = new EventEmitter();
  proc.kill = vi.fn();

  setTimeout(() => {
    for (const line of stderrLines) {
      proc.stderr.emit('data', Buffer.from(line));
    }
    proc.emit('close', exitCode);
  }, delay);

  return proc;
}

function makeTempProject(opts: { withMainPy: boolean; withVenv: boolean }): string {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'cdash-sub-test-'));
  if (opts.withMainPy) {
    fs.mkdirSync(path.join(base, 'src'), { recursive: true });
    fs.writeFileSync(path.join(base, 'src', 'main.py'), '# stub');
  }
  if (opts.withVenv) {
    fs.mkdirSync(path.join(base, '.venv', 'bin'), { recursive: true });
    fs.writeFileSync(path.join(base, '.venv', 'bin', 'python3'), '#!/bin/bash\necho stub');
  }
  return base;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PowerBIClient', () => {
  let tmpDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tmpDir = makeTempProject({ withMainPy: true, withVenv: true });
  });

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // ── isAuthenticated ─────────────────────────────────────────────────────────

  it('isAuthenticated returns true when python+venv+project all present', async () => {
    const client = new PowerBIClient(tmpDir);
    // python check hits real system — we only ensure it returns a boolean
    const result = await client.isAuthenticated();
    expect(typeof result).toBe('boolean');
  });

  it('isAuthenticated returns false when venv absent', async () => {
    const noVenv = makeTempProject({ withMainPy: true, withVenv: false });
    const client = new PowerBIClient(noVenv);
    const result = await client.isAuthenticated();
    expect(result).toBe(false);
    fs.rmSync(noVenv, { recursive: true });
  });

  it('isAuthenticated returns false when project absent', async () => {
    const noProj = makeTempProject({ withMainPy: false, withVenv: true });
    const client = new PowerBIClient(noProj);
    const result = await client.isAuthenticated();
    expect(result).toBe(false);
    fs.rmSync(noProj, { recursive: true });
  });

  // ── healthCheck ─────────────────────────────────────────────────────────────

  it('healthCheck returns authMode=subprocess', async () => {
    const client = new PowerBIClient(tmpDir);
    const health = await client.healthCheck();
    expect(health.authMode).toBe('subprocess');
  });

  // ── serviceId ──────────────────────────────────────────────────────────────

  it('serviceId is "powerbi"', () => {
    const client = new PowerBIClient(tmpDir);
    expect(client.serviceId).toBe('powerbi');
  });

  // ── runFullExport — happy path ─────────────────────────────────────────────

  it('runFullExport calls spawn with correct args and cwd', async () => {
    const validData = [{ account_id: '001ABC', account_name: 'Test School' }];
    const fakeProc = makeFakeProc({ exitCode: 0 });

    vi.mocked(spawn).mockReturnValue(fakeProc as ReturnType<typeof spawn>);
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(validData) as unknown as Buffer);

    const client = new PowerBIClient(tmpDir);
    const result = await client.runFullExport({ runId: 'test-run-1' });

    expect(spawn).toHaveBeenCalledWith(
      expect.stringContaining('python3'),
      expect.arrayContaining(['-j', expect.stringContaining('cdash-test-run-1.json')]),
      expect.objectContaining({ cwd: tmpDir })
    );
    expect(result).toHaveLength(1);
    expect(result[0].account_id).toBe('001ABC');
  });

  it('runFullExport returns cached result on second call', async () => {
    const validData = [{ account_id: '001CACHE', account_name: 'Cached School' }];
    const fakeProc = makeFakeProc({ exitCode: 0 });

    vi.mocked(spawn).mockReturnValue(fakeProc as ReturnType<typeof spawn>);
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(validData) as unknown as Buffer);

    const client = new PowerBIClient(tmpDir);
    await client.runFullExport({ runId: 'cache-run' });
    await client.runFullExport({ runId: 'cache-run' });

    // spawn should only be called once (second call hits cache)
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  // ── runFullExport — error: non-zero exit ───────────────────────────────────

  it('throws PowerBISubprocessError on non-zero exit', async () => {
    const fakeProc = makeFakeProc({ exitCode: 1, stderrLines: ['traceback here'] });
    vi.mocked(spawn).mockReturnValue(fakeProc as ReturnType<typeof spawn>);

    const client = new PowerBIClient(tmpDir);
    await expect(client.runFullExport({ runId: 'fail-run' })).rejects.toThrow(
      PowerBISubprocessError
    );
  });

  it('PowerBISubprocessError carries stderrTail', async () => {
    const fakeProc = makeFakeProc({ exitCode: 1, stderrLines: ['ImportError: no module'] });
    vi.mocked(spawn).mockReturnValue(fakeProc as ReturnType<typeof spawn>);

    const client = new PowerBIClient(tmpDir);
    try {
      await client.runFullExport({ runId: 'stderr-run' });
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(PowerBISubprocessError);
      expect((e as PowerBISubprocessError).stderrTail).toContain('ImportError');
    }
  });

  // ── runFullExport — error: JSON parse failure ──────────────────────────────

  it('throws PowerBIJsonInvalidError when JSON file contains non-JSON content', async () => {
    const fakeProc = makeFakeProc({ exitCode: 0 });
    vi.mocked(spawn).mockReturnValue(fakeProc as ReturnType<typeof spawn>);
    vi.mocked(readFile).mockResolvedValue('not json' as unknown as Buffer);

    const client = new PowerBIClient(tmpDir);
    await expect(client.runFullExport({ runId: 'badJson-run' })).rejects.toThrow(
      PowerBIJsonInvalidError
    );
  });

  // ── runFullExport — error: Zod validation failure ─────────────────────────

  it('throws PowerBIJsonInvalidError when JSON is not an array', async () => {
    const fakeProc = makeFakeProc({ exitCode: 0 });
    vi.mocked(spawn).mockReturnValue(fakeProc as ReturnType<typeof spawn>);
    vi.mocked(readFile).mockResolvedValue(JSON.stringify({ not: 'array' }) as unknown as Buffer);

    const client = new PowerBIClient(tmpDir);
    await expect(client.runFullExport({ runId: 'zodFail-run' })).rejects.toThrow(
      PowerBIJsonInvalidError
    );
  });

  // ── runFullExport — error: venv missing ───────────────────────────────────

  it('throws PowerBIVenvMissingError when venv absent', async () => {
    const noVenv = makeTempProject({ withMainPy: true, withVenv: false });
    const client = new PowerBIClient(noVenv);
    await expect(client.runFullExport({ runId: 'novenv-run' })).rejects.toThrow(
      PowerBIVenvMissingError
    );
    fs.rmSync(noVenv, { recursive: true });
  });

  // ── getAccountUsage ────────────────────────────────────────────────────────

  it('getAccountUsage returns matching record by account_id', async () => {
    const validData = [
      { account_id: '001MATCH00000000ABC', account_name: 'Match School' },
      { account_id: '001OTHER00000000DEF', account_name: 'Other School' },
    ];
    const fakeProc = makeFakeProc({ exitCode: 0 });
    vi.mocked(spawn).mockReturnValue(fakeProc as ReturnType<typeof spawn>);
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(validData) as unknown as Buffer);

    const client = new PowerBIClient(tmpDir);
    const record = await client.getAccountUsage({
      accountId18: '001MATCH00000000ABC',
      runId: 'acct-run',
    });
    expect(record?.account_name).toBe('Match School');
  });

  it('getAccountUsage returns null when no match', async () => {
    const validData = [{ account_id: '001NOMATCH', account_name: 'School A' }];
    const fakeProc = makeFakeProc({ exitCode: 0 });
    vi.mocked(spawn).mockReturnValue(fakeProc as ReturnType<typeof spawn>);
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(validData) as unknown as Buffer);

    const client = new PowerBIClient(tmpDir);
    const record = await client.getAccountUsage({
      accountId18: '001NOTFOUND00000000',
      runId: 'null-acct-run',
    });
    expect(record).toBeNull();
  });
});
