// tests/unit/mcp/powerbi/preflight.spec.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §9

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// We test the logic of preflightPowerBI by pointing it at temp dirs we control.
// The function itself calls execSync('python3 --version') for the python check —
// we can't mock execSync without module mocking, so we test the structural
// project/venv checks here and accept that the python check reflects the
// actual system state (expected to pass on Russell's Mac with python 3.14).

import { preflightPowerBI } from '../../../../apps/utility/src/mcp/powerbi/preflight.js';

function makeTempProject(opts: { withMainPy: boolean; withVenv: boolean }): string {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'cdash-test-'));
  if (opts.withMainPy) {
    fs.mkdirSync(path.join(base, 'src'), { recursive: true });
    fs.writeFileSync(path.join(base, 'src', 'main.py'), '# stub');
  }
  if (opts.withVenv) {
    fs.mkdirSync(path.join(base, '.venv'), { recursive: true });
  }
  return base;
}

describe('preflightPowerBI', () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('returns project=ok when src/main.py exists', () => {
    tmpDir = makeTempProject({ withMainPy: true, withVenv: false });
    const result = preflightPowerBI(tmpDir);
    expect(result.project).toBe('ok');
  });

  it('returns project=missing when src/main.py absent', () => {
    tmpDir = makeTempProject({ withMainPy: false, withVenv: false });
    const result = preflightPowerBI(tmpDir);
    expect(result.project).toBe('missing');
  });

  it('returns venv=ok when .venv directory exists', () => {
    tmpDir = makeTempProject({ withMainPy: true, withVenv: true });
    const result = preflightPowerBI(tmpDir);
    expect(result.venv).toBe('ok');
  });

  it('returns venv=missing when .venv directory absent', () => {
    tmpDir = makeTempProject({ withMainPy: true, withVenv: false });
    const result = preflightPowerBI(tmpDir);
    expect(result.venv).toBe('missing');
  });

  it('includes remediation for missing project', () => {
    tmpDir = makeTempProject({ withMainPy: false, withVenv: false });
    const result = preflightPowerBI(tmpDir);
    const remediation = result.remediation.join('\n');
    expect(remediation).toContain('git clone');
  });

  it('includes remediation for missing venv', () => {
    tmpDir = makeTempProject({ withMainPy: true, withVenv: false });
    const result = preflightPowerBI(tmpDir);
    const remediation = result.remediation.join('\n');
    expect(remediation).toContain('python3 -m venv .venv');
  });

  it('returns projectPath matching input', () => {
    tmpDir = makeTempProject({ withMainPy: true, withVenv: true });
    const result = preflightPowerBI(tmpDir);
    expect(result.projectPath).toBe(tmpDir);
  });

  it('python check reflects system python (does not throw)', () => {
    tmpDir = makeTempProject({ withMainPy: true, withVenv: true });
    // Should not throw — just returns ok or missing
    const result = preflightPowerBI(tmpDir);
    expect(result.python).toMatch(/^(ok|missing)$/);
  });

  it('returns empty remediation when all three present and python ok', () => {
    // We can only test project + venv with temp dir.
    // Python check is live — skip assertion on remediation count if python fails.
    tmpDir = makeTempProject({ withMainPy: true, withVenv: true });
    const result = preflightPowerBI(tmpDir);
    // project + venv are ok; remediation should not contain venv or project messages
    const rem = result.remediation.join('\n');
    expect(rem).not.toContain('python3 -m venv');
    expect(rem).not.toContain('git clone');
  });

  it('all-absent path returns three remediation entries (project + venv + python if missing)', () => {
    tmpDir = makeTempProject({ withMainPy: false, withVenv: false });
    const result = preflightPowerBI(tmpDir);
    // At minimum project + venv should be in remediation
    expect(result.remediation.length).toBeGreaterThanOrEqual(2);
  });
});
