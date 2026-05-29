// tests/unit/mcp/powerbi/preflight.spec.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §9
// Extended per docs/research/powerbi-integration-kit-analysis.md §Changes #1 and #5

import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// We test the logic of preflightPowerBI by pointing it at temp dirs we control.
// The function itself calls execSync('python3 --version') for the python check —
// we can't mock execSync without module mocking, so we test the structural
// project/venv checks here and accept that the python check reflects the
// actual system state (expected to pass on Russell's Mac with python 3.14).

import {
  preflightPowerBI,
  resolveGoogleCredsPath,
  resolveTokenPicklePath,
  resolveDataDir,
  ONEDRIVE_PRIMARY_SUBPATH,
  ONEDRIVE_ALT_SUBPATH,
  CRITICAL_CSVS,
} from '../../../../apps/utility/src/mcp/powerbi/preflight.js';

// ── Scaffolding helpers ──────────────────────────────────────────────────────

interface ProjectOpts {
  withMainPy?: boolean;
  withVenv?: boolean;
  withCreds?: boolean;
  withTokenPickle?: boolean;
}

function makeTempProject(opts: ProjectOpts = {}): string {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'cdash-test-'));
  if (opts.withMainPy) {
    fs.mkdirSync(path.join(base, 'src'), { recursive: true });
    fs.writeFileSync(path.join(base, 'src', 'main.py'), '# stub');
  }
  if (opts.withVenv) {
    fs.mkdirSync(path.join(base, '.venv'), { recursive: true });
  }
  if (opts.withCreds) {
    fs.writeFileSync(path.join(base, 'credentials.json'), '{"installed":{}}');
  }
  if (opts.withTokenPickle) {
    fs.writeFileSync(path.join(base, 'token.pickle'), 'stub-pickle-bytes');
  }
  return base;
}

/**
 * Make a fake OneDrive home tree rooted at tmpdir.
 * Returns the fake home dir and the resolved data dir path.
 */
function makeFakeOneDriveHome(opts: {
  subpath: string;
  csvs?: string[];
}): { fakeHome: string; dataDir: string } {
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'odtest-'));
  const dataDir = path.join(fakeHome, opts.subpath);
  fs.mkdirSync(dataDir, { recursive: true });
  for (const csv of opts.csvs ?? []) {
    fs.writeFileSync(path.join(dataDir, csv), 'col1,col2\n1,2\n');
  }
  return { fakeHome, dataDir };
}

// ── Cleanup tracker ──────────────────────────────────────────────────────────

let dirsToClean: string[] = [];

afterEach(() => {
  for (const d of dirsToClean) {
    if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
  }
  dirsToClean = [];
});

function track(dir: string): string {
  dirsToClean.push(dir);
  return dir;
}

// ── Existing project/venv/python checks (regression) ────────────────────────

describe('preflightPowerBI — project / venv / python (regression)', () => {
  it('returns project=ok when src/main.py exists', () => {
    const tmpDir = track(makeTempProject({ withMainPy: true }));
    const result = preflightPowerBI(tmpDir);
    expect(result.project).toBe('ok');
  });

  it('returns project=missing when src/main.py absent', () => {
    const tmpDir = track(makeTempProject({ withMainPy: false }));
    const result = preflightPowerBI(tmpDir);
    expect(result.project).toBe('missing');
  });

  it('returns venv=ok when .venv directory exists', () => {
    const tmpDir = track(makeTempProject({ withMainPy: true, withVenv: true }));
    const result = preflightPowerBI(tmpDir);
    expect(result.venv).toBe('ok');
  });

  it('returns venv=missing when .venv directory absent', () => {
    const tmpDir = track(makeTempProject({ withMainPy: true, withVenv: false }));
    const result = preflightPowerBI(tmpDir);
    expect(result.venv).toBe('missing');
  });

  it('includes remediation for missing project', () => {
    const tmpDir = track(makeTempProject({ withMainPy: false }));
    const result = preflightPowerBI(tmpDir);
    expect(result.remediation.join('\n')).toContain('git clone');
  });

  it('includes remediation for missing venv', () => {
    const tmpDir = track(makeTempProject({ withMainPy: true, withVenv: false }));
    const result = preflightPowerBI(tmpDir);
    expect(result.remediation.join('\n')).toContain('python3 -m venv .venv');
  });

  it('returns projectPath matching input', () => {
    const tmpDir = track(makeTempProject({ withMainPy: true, withVenv: true }));
    const result = preflightPowerBI(tmpDir);
    expect(result.projectPath).toBe(tmpDir);
  });

  it('python check reflects system python (does not throw)', () => {
    const tmpDir = track(makeTempProject({ withMainPy: true, withVenv: true }));
    const result = preflightPowerBI(tmpDir);
    expect(result.python).toMatch(/^(ok|missing)$/);
  });

  it('returns empty remediation for venv+project when all three present and python ok', () => {
    const tmpDir = track(makeTempProject({ withMainPy: true, withVenv: true }));
    const result = preflightPowerBI(tmpDir);
    const rem = result.remediation.join('\n');
    expect(rem).not.toContain('python3 -m venv');
    expect(rem).not.toContain('git clone');
  });

  it('all-absent path returns ≥2 remediation entries (project + venv)', () => {
    const tmpDir = track(makeTempProject({ withMainPy: false, withVenv: false }));
    const result = preflightPowerBI(tmpDir);
    expect(result.remediation.length).toBeGreaterThanOrEqual(2);
  });
});

// ── Check #1 (re-confirm): credentials.json check (creds-missing) ───────────

describe('preflightPowerBI — credentials.json (creds-missing)', () => {
  it('returns googleCreds=ok when credentials.json exists', () => {
    const tmpDir = track(makeTempProject({ withMainPy: true, withCreds: true }));
    const result = preflightPowerBI(tmpDir);
    expect(result.googleCreds).toBe('ok');
  });

  it('returns googleCreds=missing when credentials.json absent', () => {
    const tmpDir = track(makeTempProject({ withMainPy: true, withCreds: false }));
    const result = preflightPowerBI(tmpDir);
    expect(result.googleCreds).toBe('missing');
  });

  it('returns googleCreds=not_checked when project is missing', () => {
    const tmpDir = track(makeTempProject({ withMainPy: false }));
    const result = preflightPowerBI(tmpDir);
    expect(result.googleCreds).toBe('not_checked');
  });

  it('classification=creds-missing when creds absent', () => {
    const tmpDir = track(makeTempProject({ withMainPy: true, withCreds: false }));
    const result = preflightPowerBI(tmpDir);
    expect(result.classification).toBe('creds-missing');
  });

  it('includes remediation mentioning credentials.json when creds missing', () => {
    const tmpDir = track(makeTempProject({ withMainPy: true, withCreds: false }));
    const result = preflightPowerBI(tmpDir);
    expect(result.remediation.join('\n')).toContain('credentials.json');
  });
});

// ── Check #5 (new): token.pickle consent check (consent-not-done) ────────────

describe('preflightPowerBI — token.pickle (consent-not-done)', () => {
  it('returns consentToken=ok when token.pickle exists alongside credentials', () => {
    const tmpDir = track(
      makeTempProject({ withMainPy: true, withCreds: true, withTokenPickle: true }),
    );
    const result = preflightPowerBI(tmpDir);
    expect(result.consentToken).toBe('ok');
  });

  it('returns consentToken=missing when credentials present but token.pickle absent', () => {
    const tmpDir = track(
      makeTempProject({ withMainPy: true, withCreds: true, withTokenPickle: false }),
    );
    const result = preflightPowerBI(tmpDir);
    expect(result.consentToken).toBe('missing');
  });

  it('returns consentToken=not_checked when credentials.json is missing (creds gates pickle check)', () => {
    const tmpDir = track(
      makeTempProject({ withMainPy: true, withCreds: false, withTokenPickle: true }),
    );
    const result = preflightPowerBI(tmpDir);
    expect(result.consentToken).toBe('not_checked');
  });

  it('returns consentToken=not_checked when project is missing', () => {
    const tmpDir = track(
      makeTempProject({ withMainPy: false, withCreds: false, withTokenPickle: false }),
    );
    const result = preflightPowerBI(tmpDir);
    expect(result.consentToken).toBe('not_checked');
  });

  it('classification=consent-not-done when creds ok but token.pickle absent', () => {
    const tmpDir = track(
      makeTempProject({ withMainPy: true, withCreds: true, withTokenPickle: false }),
    );
    const result = preflightPowerBI(tmpDir);
    expect(result.classification).toBe('consent-not-done');
  });

  it('classification=creds-missing takes precedence over consent-not-done', () => {
    // No creds → classification must be creds-missing, not consent-not-done
    const tmpDir = track(makeTempProject({ withMainPy: true, withCreds: false }));
    const result = preflightPowerBI(tmpDir);
    expect(result.classification).toBe('creds-missing');
    expect(result.classification).not.toBe('consent-not-done');
  });

  it('consentTokenPath matches project root (settings.py:459 token.pickle location)', () => {
    const tmpDir = track(makeTempProject({ withMainPy: true }));
    const result = preflightPowerBI(tmpDir);
    expect(result.consentTokenPath).toBe(path.join(tmpDir, 'token.pickle'));
  });

  it('includes remediation mentioning one-time browser consent when token.pickle absent', () => {
    const tmpDir = track(
      makeTempProject({ withMainPy: true, withCreds: true, withTokenPickle: false }),
    );
    const result = preflightPowerBI(tmpDir);
    expect(result.remediation.join('\n')).toContain('token.pickle');
    expect(result.remediation.join('\n')).toContain('--no-am-dashboards');
  });
});

// ── Check #2 (new): OneDrive path detection ──────────────────────────────────

describe('resolveDataDir — OneDrive path detection', () => {
  it('returns primary source when primary mount exists', () => {
    const { fakeHome } = makeFakeOneDriveHome({
      subpath: ONEDRIVE_PRIMARY_SUBPATH,
    });
    track(fakeHome);
    // Also need the parent dir for the existence check on the mount root
    const result = resolveDataDir(fakeHome);
    expect(result.source).toBe('primary');
    expect(result.dir).toContain('OneDrive-SharedLibraries-ClassEDU/ClassEDU - CustomerDashboard/Data');
  });

  it('returns alt source when only alt mount exists', () => {
    const { fakeHome } = makeFakeOneDriveHome({
      subpath: ONEDRIVE_ALT_SUBPATH,
    });
    track(fakeHome);
    const result = resolveDataDir(fakeHome);
    expect(result.source).toBe('alt');
    expect(result.dir).toContain('OneDrive-SharedLibraries-ClassEDU(2)');
  });

  it('returns none when neither OneDrive mount exists', () => {
    const fakeHome = track(fs.mkdtempSync(path.join(os.tmpdir(), 'noodtest-')));
    const result = resolveDataDir(fakeHome);
    expect(result.source).toBe('none');
    expect(result.dir).toBeNull();
  });

  it('returns env source when CUSTOMER_DASHBOARD_DATA_DIR is set', () => {
    const overrideDir = track(fs.mkdtempSync(path.join(os.tmpdir(), 'envoverride-')));
    const origEnv = process.env.CUSTOMER_DASHBOARD_DATA_DIR;
    process.env.CUSTOMER_DASHBOARD_DATA_DIR = overrideDir;
    try {
      const result = resolveDataDir('/nonexistent-home');
      expect(result.source).toBe('env');
      expect(result.dir).toBe(overrideDir);
    } finally {
      if (origEnv === undefined) {
        delete process.env.CUSTOMER_DASHBOARD_DATA_DIR;
      } else {
        process.env.CUSTOMER_DASHBOARD_DATA_DIR = origEnv;
      }
    }
  });
});

// ── Check #3 (new): CSV presence (csvs-missing) ──────────────────────────────

describe('preflightPowerBI — critical CSV presence (csvs-missing)', () => {
  // Full auth setup with injected homeDir pointing at a fake OneDrive tree

  it('missingCsvs is empty when all four critical CSVs are present', () => {
    const tmpDir = track(
      makeTempProject({ withMainPy: true, withCreds: true, withTokenPickle: true }),
    );
    const { fakeHome } = makeFakeOneDriveHome({
      subpath: ONEDRIVE_PRIMARY_SUBPATH,
      csvs: [...CRITICAL_CSVS],
    });
    track(fakeHome);
    const result = preflightPowerBI(tmpDir, fakeHome);
    expect(result.missingCsvs).toHaveLength(0);
  });

  it('classification=ok when auth complete and all critical CSVs present', () => {
    const tmpDir = track(
      makeTempProject({ withMainPy: true, withCreds: true, withTokenPickle: true }),
    );
    const { fakeHome } = makeFakeOneDriveHome({
      subpath: ONEDRIVE_PRIMARY_SUBPATH,
      csvs: [...CRITICAL_CSVS],
    });
    track(fakeHome);
    const result = preflightPowerBI(tmpDir, fakeHome);
    expect(result.classification).toBe('ok');
  });

  it('missingCsvs contains absent CSVs when partial set present', () => {
    const tmpDir = track(
      makeTempProject({ withMainPy: true, withCreds: true, withTokenPickle: true }),
    );
    // Only put accounts.csv + meeting_minutes.csv — omit account_velocity + class_sessions
    const { fakeHome } = makeFakeOneDriveHome({
      subpath: ONEDRIVE_PRIMARY_SUBPATH,
      csvs: ['accounts.csv', 'meeting_minutes.csv'],
    });
    track(fakeHome);
    const result = preflightPowerBI(tmpDir, fakeHome);
    expect(result.missingCsvs).toContain('account_velocity.csv');
    expect(result.missingCsvs).toContain('class_sessions.csv');
    expect(result.missingCsvs).not.toContain('accounts.csv');
    expect(result.missingCsvs).not.toContain('meeting_minutes.csv');
  });

  it('classification=csvs-missing when auth ok but CSVs absent', () => {
    const tmpDir = track(
      makeTempProject({ withMainPy: true, withCreds: true, withTokenPickle: true }),
    );
    const { fakeHome } = makeFakeOneDriveHome({
      subpath: ONEDRIVE_PRIMARY_SUBPATH,
      csvs: [], // empty data dir
    });
    track(fakeHome);
    const result = preflightPowerBI(tmpDir, fakeHome);
    expect(result.classification).toBe('csvs-missing');
  });

  it('classification=csvs-missing when OneDrive mount absent entirely (no home mounts)', () => {
    const tmpDir = track(
      makeTempProject({ withMainPy: true, withCreds: true, withTokenPickle: true }),
    );
    const emptyHome = track(fs.mkdtempSync(path.join(os.tmpdir(), 'nood-')));
    const result = preflightPowerBI(tmpDir, emptyHome);
    expect(result.classification).toBe('csvs-missing');
    expect(result.onedrivePath).toBe('none');
    expect(result.onedriveDir).toBeNull();
  });

  it('onedrivePath=primary when primary mount is active', () => {
    const tmpDir = track(makeTempProject({ withMainPy: true }));
    const { fakeHome } = makeFakeOneDriveHome({
      subpath: ONEDRIVE_PRIMARY_SUBPATH,
      csvs: [...CRITICAL_CSVS],
    });
    track(fakeHome);
    const result = preflightPowerBI(tmpDir, fakeHome);
    expect(result.onedrivePath).toBe('primary');
  });

  it('onedrivePath=alt when only alt mount exists', () => {
    const tmpDir = track(makeTempProject({ withMainPy: true }));
    const { fakeHome } = makeFakeOneDriveHome({
      subpath: ONEDRIVE_ALT_SUBPATH,
      csvs: ['accounts.csv'], // partial — alt has only 10 CSVs
    });
    track(fakeHome);
    const result = preflightPowerBI(tmpDir, fakeHome);
    expect(result.onedrivePath).toBe('alt');
  });

  it('remediation includes Power Automate flow hint when CSVs missing', () => {
    const tmpDir = track(
      makeTempProject({ withMainPy: true, withCreds: true, withTokenPickle: true }),
    );
    const { fakeHome } = makeFakeOneDriveHome({
      subpath: ONEDRIVE_PRIMARY_SUBPATH,
      csvs: [],
    });
    track(fakeHome);
    const result = preflightPowerBI(tmpDir, fakeHome);
    expect(result.remediation.join('\n')).toContain('Power Automate');
  });

  it('remediation includes "alt" warning when alt path has missing primary-only CSVs', () => {
    const tmpDir = track(
      makeTempProject({ withMainPy: true, withCreds: true, withTokenPickle: true }),
    );
    // Alt path: only 10 CSVs, missing account_velocity + class_sessions
    const { fakeHome } = makeFakeOneDriveHome({
      subpath: ONEDRIVE_ALT_SUBPATH,
      csvs: ['accounts.csv', 'meeting_minutes.csv'],
    });
    track(fakeHome);
    const result = preflightPowerBI(tmpDir, fakeHome);
    expect(result.remediation.join('\n')).toContain('alt');
  });
});

// ── Classification precedence ────────────────────────────────────────────────

describe('preflightPowerBI — classification precedence', () => {
  it('not_checked when project is missing', () => {
    const tmpDir = track(makeTempProject({ withMainPy: false }));
    const result = preflightPowerBI(tmpDir);
    expect(result.classification).toBe('not_checked');
  });

  it('creds-missing before consent-not-done before csvs-missing', () => {
    // No creds, no pickle, no CSVs — should still be creds-missing
    const tmpDir = track(
      makeTempProject({ withMainPy: true, withCreds: false, withTokenPickle: false }),
    );
    const emptyHome = track(fs.mkdtempSync(path.join(os.tmpdir(), 'empty-')));
    const result = preflightPowerBI(tmpDir, emptyHome);
    expect(result.classification).toBe('creds-missing');
  });

  it('consent-not-done before csvs-missing (creds ok, no pickle, no CSVs)', () => {
    const tmpDir = track(
      makeTempProject({ withMainPy: true, withCreds: true, withTokenPickle: false }),
    );
    const emptyHome = track(fs.mkdtempSync(path.join(os.tmpdir(), 'empty2-')));
    const result = preflightPowerBI(tmpDir, emptyHome);
    expect(result.classification).toBe('consent-not-done');
  });
});

// ── Path resolver unit tests ─────────────────────────────────────────────────

describe('resolveGoogleCredsPath', () => {
  it('returns <projectPath>/credentials.json by default', () => {
    const p = resolveGoogleCredsPath('/some/project');
    expect(p).toBe('/some/project/credentials.json');
  });

  it('honors CUSTOMER_DASHBOARD_GOOGLE_CREDENTIALS env override', () => {
    const orig = process.env.CUSTOMER_DASHBOARD_GOOGLE_CREDENTIALS;
    process.env.CUSTOMER_DASHBOARD_GOOGLE_CREDENTIALS = '/custom/creds.json';
    try {
      expect(resolveGoogleCredsPath('/any/path')).toBe('/custom/creds.json');
    } finally {
      if (orig === undefined) delete process.env.CUSTOMER_DASHBOARD_GOOGLE_CREDENTIALS;
      else process.env.CUSTOMER_DASHBOARD_GOOGLE_CREDENTIALS = orig;
    }
  });
});

describe('resolveTokenPicklePath', () => {
  it('returns <projectPath>/token.pickle by default (settings.py:459)', () => {
    const p = resolveTokenPicklePath('/some/project');
    expect(p).toBe('/some/project/token.pickle');
  });

  it('honors CUSTOMER_DASHBOARD_TOKEN_PICKLE env override', () => {
    const orig = process.env.CUSTOMER_DASHBOARD_TOKEN_PICKLE;
    process.env.CUSTOMER_DASHBOARD_TOKEN_PICKLE = '/custom/token.pickle';
    try {
      expect(resolveTokenPicklePath('/any/path')).toBe('/custom/token.pickle');
    } finally {
      if (orig === undefined) delete process.env.CUSTOMER_DASHBOARD_TOKEN_PICKLE;
      else process.env.CUSTOMER_DASHBOARD_TOKEN_PICKLE = orig;
    }
  });
});
