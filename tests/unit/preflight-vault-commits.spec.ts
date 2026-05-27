/**
 * ADR-0003 §7 — Preflight vault-git-initialized check (B22)
 * Test owner: Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0003-ch2-safewrite.md §7.1
 *
 * Tests cover:
 *   - Empty vault git → preflight fails with non-zero exit + hint to vault-bootstrap.sh
 *   - Vault with ≥1 commit → preflight passes vault-init section
 *
 * Strategy: scripts/preflight.sh is a shell script invoked via spawnSync
 * (same pattern as tests/unit/preflight.spec.ts which covers Ch.0 §6 checks).
 * VAULT_PATH is set to a temp dir. PREFLIGHT_TEST_MODE=1 skips unrelated checks.
 *
 * Tests will fail until Runtime adds the vault-git checks to scripts/preflight.sh
 * per ADR §7.1. That is expected: TDD — tests describe intended behavior.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';
import simpleGit from 'simple-git';

const PREFLIGHT_SCRIPT = path.resolve(__dirname, '../../scripts/preflight.sh');

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function makeSkillsDir(dir: string): void {
  const fullContent = Array(60).fill('# full skill line').join('\n');
  for (const skill of [
    'weekly-cash-forecast', 'covenant-tracker', 'renewal-forecast',
    'call-intelligence', 'run-critique', 'system-check', 'class-aws-connector', 'russell-voice',
  ]) {
    const skillDir = path.join(dir, skill);
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), fullContent);
  }
}

function runPreflight(env: Record<string, string>): { exitCode: number; stdout: string; stderr: string } {
  const result = spawnSync('bash', [PREFLIGHT_SCRIPT], {
    env: { ...process.env, PREFLIGHT_TEST_MODE: '1', ...env },
    encoding: 'utf8',
    timeout: 15_000,
  });
  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('Preflight §7.1 — vault git-initialization check (B22)', () => {
  let tempSkills: string;

  beforeAll(() => {
    tempSkills = makeTempDir('csuite-preflight-vault-commits-skills-');
    makeSkillsDir(tempSkills);
  });

  afterAll(() => {
    fs.rmSync(tempSkills, { recursive: true, force: true });
  });

  // ── Failure path: vault not a git repo ──────────────────────────────────

  it('fails when vault directory is not git-initialized (no .git dir)', () => {
    const plainDir = makeTempDir('csuite-vault-nongit-');
    const { exitCode, stdout } = runPreflight({
      VAULT_PATH: plainDir,
      SKILLS_DIR: tempSkills,
    });
    fs.rmSync(plainDir, { recursive: true, force: true });

    expect(exitCode).not.toBe(0);
    // Must mention git-initialization failure
    expect(stdout.toLowerCase()).toMatch(/git|not git|initialized/);
  });

  // ── Failure path: git repo but zero commits ──────────────────────────────

  it('fails with non-zero exit when vault is git-initialized but has 0 commits', () => {
    const emptyGitVault = makeTempDir('csuite-vault-nocommit-');
    const git = simpleGit(emptyGitVault);

    // git init synchronously via spawnSync (simpleGit is async — use sync for beforeAll context)
    const initResult = spawnSync('git', ['init', emptyGitVault], { encoding: 'utf8' });
    expect(initResult.status).toBe(0);

    const { exitCode, stdout } = runPreflight({
      VAULT_PATH: emptyGitVault,
      SKILLS_DIR: tempSkills,
    });
    fs.rmSync(emptyGitVault, { recursive: true, force: true });

    expect(exitCode).not.toBe(0);
    // Must hint at vault-bootstrap.sh (B22 requirement per ADR §7.1)
    expect(stdout).toMatch(/vault-bootstrap\.sh/);
  });

  it('output mentions vault-bootstrap.sh when vault has no commits', () => {
    const emptyGitVault = makeTempDir('csuite-vault-hint-');
    spawnSync('git', ['init', emptyGitVault], { encoding: 'utf8' });

    const { stdout } = runPreflight({
      VAULT_PATH: emptyGitVault,
      SKILLS_DIR: tempSkills,
    });
    fs.rmSync(emptyGitVault, { recursive: true, force: true });

    // The hint must reference the bootstrap script by name
    expect(stdout).toMatch(/vault-bootstrap\.sh/);
  });

  // ── Pass path: vault with ≥1 commit ──────────────────────────────────────

  it('passes vault-init section when vault has at least 1 commit', () => {
    const initializedVault = makeTempDir('csuite-vault-init-');
    spawnSync('git', ['init', initializedVault], { encoding: 'utf8' });
    spawnSync('git', ['-C', initializedVault, 'config', 'user.email', 'test@csuite.local'], { encoding: 'utf8' });
    spawnSync('git', ['-C', initializedVault, 'config', 'user.name', 'C-Suite Test'], { encoding: 'utf8' });

    // Create a file and commit it
    const seedFile = path.join(initializedVault, '.gitkeep');
    fs.writeFileSync(seedFile, '');
    spawnSync('git', ['-C', initializedVault, 'add', '.'], { encoding: 'utf8' });
    spawnSync('git', ['-C', initializedVault, 'commit', '-m', 'vault: pre-C-Suite baseline'], { encoding: 'utf8' });

    const { exitCode, stdout } = runPreflight({
      VAULT_PATH: initializedVault,
      SKILLS_DIR: tempSkills,
    });
    fs.rmSync(initializedVault, { recursive: true, force: true });

    // Vault-init section must not fail
    // (exitCode may still be non-zero if OTHER preflight checks fail — we only assert vault-init passes)
    expect(stdout.toLowerCase()).toMatch(/vault.*git.*ok|vault git.*initialized|commits.*ok/);
    // Must NOT mention vault-bootstrap.sh (no failure)
    expect(stdout).not.toMatch(/Run.*vault-bootstrap\.sh/);
  });

  it('does not print vault-bootstrap.sh hint when vault has commits', () => {
    const initializedVault = makeTempDir('csuite-vault-nohint-');
    spawnSync('git', ['init', initializedVault], { encoding: 'utf8' });
    spawnSync('git', ['-C', initializedVault, 'config', 'user.email', 'test@csuite.local'], { encoding: 'utf8' });
    spawnSync('git', ['-C', initializedVault, 'config', 'user.name', 'C-Suite Test'], { encoding: 'utf8' });
    fs.writeFileSync(path.join(initializedVault, '.gitkeep'), '');
    spawnSync('git', ['-C', initializedVault, 'add', '.'], { encoding: 'utf8' });
    spawnSync('git', ['-C', initializedVault, 'commit', '-m', 'vault: baseline'], { encoding: 'utf8' });

    const { stdout } = runPreflight({
      VAULT_PATH: initializedVault,
      SKILLS_DIR: tempSkills,
    });
    fs.rmSync(initializedVault, { recursive: true, force: true });

    // The bootstrap hint is only shown on failure — it must be absent on the happy path
    expect(stdout).not.toMatch(/Run.*vault-bootstrap\.sh.*restart/);
  });
});
