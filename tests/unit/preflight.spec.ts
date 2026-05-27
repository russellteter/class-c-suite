/**
 * ADR-0001 §6 + §9 row 11 (B33) — Preflight extensions
 * Test owner: Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0001-ch0-foundations.md §6 + §9 row 11
 *
 * Tests exercise the NEW preflight sections added in ADR §6:
 *   §6.1: Dropbox marker detection (ancestor walk for .dropbox or .dropbox.cache)
 *   §6.2: Google Drive mount detection (path contains CloudStorage/GoogleDrive* or /Google Drive/)
 *   §6.2: Google Drive process detection (kextstat check)
 *   §6.2: Skill body line-count check (< 50 lines = truncated stub)
 *
 * Strategy: preflight.sh is a shell script, not a TypeScript module.
 * Tests invoke it via child_process.spawnSync with controlled env vars
 * (VAULT_PATH and SKILLS_DIR point to temp dirs, not production paths).
 * Preflight exits 0 on all-clean, non-zero on any fail.
 *
 * Tests will fail until Runtime lands the preflight.sh additions per §6.
 * That is expected per brief line 124.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';

const PREFLIGHT_SCRIPT = path.resolve(__dirname, '../../scripts/preflight.sh');
const REPO_ROOT = path.resolve(__dirname, '../../');

// ── Test scaffolding helpers ─────────────────────────────────────────────────

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function runPreflight(env: Record<string, string>): { exitCode: number; stdout: string; stderr: string } {
  const result = spawnSync('bash', [PREFLIGHT_SCRIPT], {
    // PREFLIGHT_TEST_MODE=1 skips network calls (git ls-remote) and
    // production-path checks (PRD file, customer-dashboard, git hooks)
    // that are irrelevant in the isolated temp-dir test environment.
    env: { ...process.env, PREFLIGHT_TEST_MODE: '1', ...env },
    encoding: 'utf8',
    timeout: 15000,
  });
  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

// ── §6.1: Dropbox sync detection ─────────────────────────────────────────────

describe('Preflight §6.1 — Dropbox marker detection (B33)', () => {
  let tempVault: string;
  let tempSkills: string;

  beforeAll(() => {
    tempVault = makeTempDir('csuite-preflight-vault-');
    tempSkills = makeTempDir('csuite-preflight-skills-');
    // Write minimal skill files (> 50 lines) to pass skill check
    const dummySkillContent = Array(60).fill('# dummy skill line').join('\n');
    for (const skill of ['weekly-cash-forecast', 'covenant-tracker', 'renewal-forecast',
      'call-intelligence', 'run-critique', 'system-check', 'class-aws-connector', 'russell-voice']) {
      const skillDir = path.join(tempSkills, skill);
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), dummySkillContent);
    }
  });

  afterAll(() => {
    fs.rmSync(tempVault, { recursive: true, force: true });
    fs.rmSync(tempSkills, { recursive: true, force: true });
  });

  it('fails when vault dir contains a .dropbox marker file', () => {
    // Place .dropbox marker in vault root (simulates Dropbox-synced folder)
    fs.writeFileSync(path.join(tempVault, '.dropbox'), '');
    const { exitCode, stdout } = runPreflight({
      VAULT_PATH: tempVault,
      SKILLS_DIR: tempSkills,
    });
    fs.unlinkSync(path.join(tempVault, '.dropbox'));
    expect(exitCode).not.toBe(0);
    expect(stdout.toLowerCase()).toMatch(/dropbox/);
  });

  it('fails when an ancestor dir of vault contains a .dropbox marker', () => {
    // Create a nested vault path; place .dropbox in ancestor
    const ancestor = makeTempDir('csuite-ancestor-');
    const nestedVault = path.join(ancestor, 'vault');
    fs.mkdirSync(nestedVault, { recursive: true });
    fs.writeFileSync(path.join(ancestor, '.dropbox'), '');

    const { exitCode, stdout } = runPreflight({
      VAULT_PATH: nestedVault,
      SKILLS_DIR: tempSkills,
    });
    fs.rmSync(ancestor, { recursive: true, force: true });

    expect(exitCode).not.toBe(0);
    expect(stdout.toLowerCase()).toMatch(/dropbox/);
  });

  it('passes when no .dropbox marker exists in vault ancestry', () => {
    const cleanVault = makeTempDir('csuite-clean-vault-');
    const { exitCode, stdout } = runPreflight({
      VAULT_PATH: cleanVault,
      SKILLS_DIR: tempSkills,
    });
    fs.rmSync(cleanVault, { recursive: true, force: true });
    // Should not fail on Dropbox (may still fail on other checks; test only the Dropbox part)
    expect(stdout.toLowerCase()).not.toMatch(/vault is inside a dropbox/i);
  });
});

// ── §6.1: Google Drive path detection ────────────────────────────────────────

describe('Preflight §6.1 — Google Drive mount path detection (B33)', () => {
  let tempSkills: string;

  beforeAll(() => {
    tempSkills = makeTempDir('csuite-preflight-skills2-');
    const dummySkillContent = Array(60).fill('# dummy skill line').join('\n');
    for (const skill of ['weekly-cash-forecast', 'covenant-tracker', 'renewal-forecast',
      'call-intelligence', 'run-critique', 'system-check', 'class-aws-connector', 'russell-voice']) {
      const skillDir = path.join(tempSkills, skill);
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), dummySkillContent);
    }
  });

  afterAll(() => {
    fs.rmSync(tempSkills, { recursive: true, force: true });
  });

  it('fails when vault path contains CloudStorage/GoogleDrive', () => {
    // Simulate a vault path that looks like a Google Drive mount
    const fakeDrivePath = path.join(os.tmpdir(), 'CloudStorage', 'GoogleDrive-test@gmail.com', 'vault');
    // We do not need to create the path — we just pass it as VAULT_PATH
    // preflight.sh checks the path string, not whether the dir exists (string match)
    const { exitCode, stdout } = runPreflight({
      VAULT_PATH: fakeDrivePath,
      SKILLS_DIR: tempSkills,
    });
    expect(exitCode).not.toBe(0);
    expect(stdout.toLowerCase()).toMatch(/google drive/i);
  });

  it('fails when vault path contains /Google Drive/', () => {
    const fakeDrivePath = '/Users/test/Google Drive/vault';
    const { exitCode, stdout } = runPreflight({
      VAULT_PATH: fakeDrivePath,
      SKILLS_DIR: tempSkills,
    });
    expect(exitCode).not.toBe(0);
    expect(stdout.toLowerCase()).toMatch(/google drive/i);
  });
});

// ── §6.2: Skill body line-count check ────────────────────────────────────────

describe('Preflight §6.2 — Skill body line-count check (B29)', () => {
  let tempVault: string;

  beforeAll(() => {
    tempVault = makeTempDir('csuite-preflight-vault2-');
  });

  afterAll(() => {
    fs.rmSync(tempVault, { recursive: true, force: true });
  });

  it('fails when any expected skill file has < 50 lines', () => {
    const tempSkills = makeTempDir('csuite-preflight-skills3-');
    // Write all skills with full content (>50 lines) except run-critique (truncated to 15 lines)
    const fullContent = Array(60).fill('# full skill line').join('\n');
    const truncatedContent = Array(15).fill('# stub line').join('\n');
    for (const skill of ['weekly-cash-forecast', 'covenant-tracker', 'renewal-forecast',
      'call-intelligence', 'system-check', 'class-aws-connector', 'russell-voice']) {
      const skillDir = path.join(tempSkills, skill);
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), fullContent);
    }
    // Truncated stub for run-critique
    const runCritiqueDir = path.join(tempSkills, 'run-critique');
    fs.mkdirSync(runCritiqueDir, { recursive: true });
    fs.writeFileSync(path.join(runCritiqueDir, 'SKILL.md'), truncatedContent);

    const { exitCode, stdout } = runPreflight({
      VAULT_PATH: tempVault,
      SKILLS_DIR: tempSkills,
    });
    fs.rmSync(tempSkills, { recursive: true, force: true });

    expect(exitCode).not.toBe(0);
    expect(stdout.toLowerCase()).toMatch(/truncated|b29|50/);
  });

  it('fails when a required skill file is missing entirely', () => {
    const tempSkills = makeTempDir('csuite-preflight-skills4-');
    // Write only 7 of 8 skills; omit run-critique
    const fullContent = Array(60).fill('# full skill line').join('\n');
    for (const skill of ['weekly-cash-forecast', 'covenant-tracker', 'renewal-forecast',
      'call-intelligence', 'system-check', 'class-aws-connector', 'russell-voice']) {
      const skillDir = path.join(tempSkills, skill);
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), fullContent);
    }

    const { exitCode, stdout } = runPreflight({
      VAULT_PATH: tempVault,
      SKILLS_DIR: tempSkills,
    });
    fs.rmSync(tempSkills, { recursive: true, force: true });

    expect(exitCode).not.toBe(0);
    expect(stdout.toLowerCase()).toMatch(/missing|run-critique/);
  });

  it('passes skill check when all skills have >= 50 lines', () => {
    const tempSkills = makeTempDir('csuite-preflight-skills5-');
    const fullContent = Array(60).fill('# full skill line').join('\n');
    for (const skill of ['weekly-cash-forecast', 'covenant-tracker', 'renewal-forecast',
      'call-intelligence', 'run-critique', 'system-check', 'class-aws-connector', 'russell-voice']) {
      const skillDir = path.join(tempSkills, skill);
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), fullContent);
    }

    const { stdout } = runPreflight({
      VAULT_PATH: tempVault,
      SKILLS_DIR: tempSkills,
    });
    fs.rmSync(tempSkills, { recursive: true, force: true });

    // Should report OK for each skill in the skill section
    expect(stdout).toMatch(/OK/);
    expect(stdout.toLowerCase()).not.toMatch(/truncated/);
  });
});

// ── All-clean path ────────────────────────────────────────────────────────────

describe('Preflight — all-clean path exits 0', () => {
  it('exits 0 when vault is outside sync dirs, git-initialized with ≥1 commit, and all skills are full-body', () => {
    const tempVault = makeTempDir('csuite-clean-vault2-');
    const tempSkills = makeTempDir('csuite-clean-skills-');
    const fullContent = Array(60).fill('# full skill line').join('\n');
    for (const skill of ['weekly-cash-forecast', 'covenant-tracker', 'renewal-forecast',
      'call-intelligence', 'run-critique', 'system-check', 'class-aws-connector', 'russell-voice']) {
      const skillDir = path.join(tempSkills, skill);
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), fullContent);
    }

    // Ch.2 B22: vault must be git-initialized with ≥1 commit for preflight to pass.
    spawnSync('git', ['-c', 'init.defaultBranch=main', 'init'], { cwd: tempVault });
    fs.writeFileSync(path.join(tempVault, '.gitkeep'), '');
    spawnSync('git', ['-c', 'user.email=test@local', '-c', 'user.name=test', 'add', '.'], { cwd: tempVault });
    spawnSync('git', ['-c', 'user.email=test@local', '-c', 'user.name=test', 'commit', '-m', 'baseline'], { cwd: tempVault });

    const { exitCode } = runPreflight({
      VAULT_PATH: tempVault,
      SKILLS_DIR: tempSkills,
    });
    fs.rmSync(tempVault, { recursive: true, force: true });
    fs.rmSync(tempSkills, { recursive: true, force: true });

    expect(exitCode).toBe(0);
  });
});
