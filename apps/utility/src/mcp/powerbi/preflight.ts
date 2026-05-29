// apps/utility/src/mcp/powerbi/preflight.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §9 + BLOCKERS B18/B2
// Hardened per docs/research/powerbi-integration-kit-analysis.md §Changes #1 and #5
//
// Checks performed (in order):
//   1. python3 ≥3.11 on PATH
//   2. customer-dashboard project (src/main.py) present
//   3. .venv bootstrapped
//   4. credentials.json present (Google OAuth desktop client)
//   5. token.pickle present (.secrets/token.pickle or <project>/token.pickle)
//      Creds ok + pickle absent → consent-not-done (headless spawn would hang)
//   6. OneDrive data directory active (primary preferred) with critical CSVs present
//
// Classification (data-access axis only; covers checks 4–6):
//   'ok'               – creds + pickle + critical CSVs all present
//   'creds-missing'    – credentials.json absent (cannot auth at all)
//   'consent-not-done' – creds present but token.pickle absent (needs one-time browser OAuth)
//   'csvs-missing'     – auth ok, but ≥1 critical CSV absent at resolved OneDrive path
//
// Note: python/venv/project structural failures are surfaced in remediation[] and individual
// check fields, but are separate from the data-access classification axis.
//
// Token presence ≠ token validity. A pickle from a GCP "Testing"-mode consent screen
// expires every 7 days (analysis §AUTH "RISK TO PIN"). Presence is checked; expiry is not
// (requires spawning Python to confirm).

import { execSync } from 'child_process';
import { existsSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ---------------------------------------------------------------------------
// Primary and alt OneDrive paths — mirrored from customer-dashboard/config/settings.py:23,26
// Primary has 17 CSVs; alt has 10 (missing class_sessions, account_velocity, and others).
// settings.py auto-detect order: primary → alt → repo data/ → sample_data/
// The preflight checks only primary and alt (the live-sync paths); local repo fallbacks
// mean OneDrive is not configured.
// ---------------------------------------------------------------------------
export const ONEDRIVE_PRIMARY_SUBPATH =
  'Library/CloudStorage/OneDrive-SharedLibraries-ClassEDU/ClassEDU - CustomerDashboard/Data';

export const ONEDRIVE_ALT_SUBPATH =
  'Library/CloudStorage/OneDrive-SharedLibraries-ClassEDU(2)/Business - Documents/CustomerDashboard/Data';

/**
 * The four CSVs whose absence signals a stale or unsynced OneDrive.
 * Derived from analysis §Changes #5 and the full CSV list in §CSV schema.
 * accounts.csv + meeting_minutes.csv are in the primary-only set;
 * account_velocity.csv + class_sessions.csv are absent from the alt path (only 10 CSVs).
 */
export const CRITICAL_CSVS = [
  'accounts.csv',
  'meeting_minutes.csv',
  'account_velocity.csv',
  'class_sessions.csv',
] as const;

export type CriticalCsv = (typeof CRITICAL_CSVS)[number];

// ---------------------------------------------------------------------------
// Public result types
// ---------------------------------------------------------------------------

/**
 * Data-access classification — covers checks 4–6 (credentials, consent, CSVs).
 * Structural failures (python/venv/project missing) are in individual fields + remediation[].
 */
export type PowerBIClassification =
  | 'ok'               // all data-access gates pass
  | 'creds-missing'    // credentials.json absent
  | 'consent-not-done' // creds ok, token.pickle absent (first-run browser OAuth required)
  | 'csvs-missing';    // auth ok, ≥1 critical CSV absent at resolved OneDrive dir

export interface PowerBIPreflightResult {
  python: 'ok' | 'missing';
  pythonVersion?: string;
  venv: 'ok' | 'missing';
  project: 'ok' | 'missing';
  /**
   * Customer-dashboard's own Google OAuth credentials file (separate from the
   * C-Suite app's Gmail OAuth client). The customer-dashboard Python subprocess
   * reads this file to authenticate with Google Sheets / Drive APIs.
   *
   * Default path: <projectPath>/credentials.json
   * Override: CUSTOMER_DASHBOARD_GOOGLE_CREDENTIALS env var
   */
  googleCreds: 'ok' | 'missing' | 'not_checked';
  googleCredsPath: string;
  /**
   * Google OAuth token pickle. Present → prior consent completed (access token
   * auto-refreshes). Absent → one-time browser consent required before subprocess
   * can run headlessly.
   *
   * Path (settings.py:459): <projectPath>/token.pickle
   * NOTE: presence does not guarantee the token is unexpired (GCP Testing-mode
   * tokens expire every 7 days — see analysis §AUTH "RISK TO PIN").
   */
  consentToken: 'ok' | 'missing' | 'not_checked';
  consentTokenPath: string;
  /**
   * OneDrive data directory active for the pipeline.
   * 'primary' = OneDrive-SharedLibraries-ClassEDU (17 CSVs — full dataset)
   * 'alt'     = OneDrive-SharedLibraries-ClassEDU(2) (10 CSVs — partial; session/velocity missing)
   * 'none'    = neither OneDrive mount found (likely offline or not yet synced)
   */
  onedrivePath: 'primary' | 'alt' | 'none';
  onedriveDir: string | null;
  /** CSVs from CRITICAL_CSVS that were absent at the resolved onedrive dir. Empty = all present. */
  missingCsvs: CriticalCsv[];
  /**
   * Data-access classification — the main diagnostic output consumed by smoke + UI.
   * Computed only when project is present; 'not_checked' otherwise.
   */
  classification: PowerBIClassification | 'not_checked';
  projectPath: string;
  remediation: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const CUSTOMER_DASHBOARD_PATH =
  process.env.CUSTOMER_DASHBOARD_PATH ??
  '/Users/russellteter/Claude Code Projects/customer-dashboard';

// ---------------------------------------------------------------------------
// Path resolvers
// ---------------------------------------------------------------------------

/**
 * Resolve the path to the customer-dashboard's Google OAuth credentials file.
 * This is the customer-dashboard project's own Google auth — entirely separate
 * from the C-Suite app's Gmail OAuth client (GMAIL_CLIENT_ID/SECRET).
 *
 * Setup: download credentials.json from Google Cloud Console for the
 * customer-dashboard service account or OAuth client, place it at this path.
 * See docs/research/powerbi-customer-dashboard-google-oauth.md for full steps.
 */
export function resolveGoogleCredsPath(projectPath = CUSTOMER_DASHBOARD_PATH): string {
  return (
    process.env.CUSTOMER_DASHBOARD_GOOGLE_CREDENTIALS ??
    join(projectPath, 'credentials.json')
  );
}

/**
 * Resolve the path to the Google OAuth token pickle.
 * Mirrors customer-dashboard/config/settings.py:459:
 *   "token_file": PROJECT_ROOT / "token.pickle"
 * The analysis doc states ".secrets/token.pickle" — that is incorrect;
 * settings.py is the authoritative source and places it at project root.
 *
 * Override: CUSTOMER_DASHBOARD_TOKEN_PICKLE env var.
 */
export function resolveTokenPicklePath(projectPath = CUSTOMER_DASHBOARD_PATH): string {
  return (
    process.env.CUSTOMER_DASHBOARD_TOKEN_PICKLE ??
    join(projectPath, 'token.pickle')
  );
}

/**
 * Resolve the active OneDrive data directory.
 * Mirrors settings.py:32-40 auto-detect order: primary → alt.
 * Returns the first existing mount-root that resolves a Data/ subdirectory,
 * plus a 'primary' | 'alt' | 'none' indicator.
 *
 * Override: CUSTOMER_DASHBOARD_DATA_DIR env var (skips OneDrive detection).
 * homeDir is injectable so tests can point at tmp dirs.
 */
export function resolveDataDir(homeDir = homedir()): {
  dir: string | null;
  source: 'primary' | 'alt' | 'env' | 'none';
} {
  const envOverride = process.env.CUSTOMER_DASHBOARD_DATA_DIR;
  if (envOverride) {
    return { dir: envOverride, source: 'env' };
  }

  const primary = join(homeDir, ONEDRIVE_PRIMARY_SUBPATH);
  if (existsSync(join(homeDir, 'Library/CloudStorage/OneDrive-SharedLibraries-ClassEDU/ClassEDU - CustomerDashboard'))) {
    return { dir: primary, source: 'primary' };
  }

  const alt = join(homeDir, ONEDRIVE_ALT_SUBPATH);
  if (existsSync(join(homeDir, 'Library/CloudStorage/OneDrive-SharedLibraries-ClassEDU(2)/Business - Documents/CustomerDashboard'))) {
    return { dir: alt, source: 'alt' };
  }

  return { dir: null, source: 'none' };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Check whether python3 ≥3.11 is on PATH.
 * Returns { ok, version? } — does not throw.
 */
function checkPython(): { ok: boolean; version?: string } {
  try {
    const raw = execSync('python3 --version', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const versionStr = raw.trim().replace('Python ', '');
    const [major, minor] = versionStr.split('.').map(Number);
    if (major > 3 || (major === 3 && minor >= 11)) {
      return { ok: true, version: versionStr };
    }
    return { ok: false, version: versionStr };
  } catch {
    return { ok: false };
  }
}

// ---------------------------------------------------------------------------
// Main preflight
// ---------------------------------------------------------------------------

/**
 * Run the full preflight check for the PowerBI subprocess dependency.
 * Returns a structured result with per-check status and remediation strings.
 * Does NOT throw — callers decide whether to surface errors.
 *
 * The homeDir parameter is injectable for testing (so CSV checks point at tmp dirs).
 */
export function preflightPowerBI(
  projectPath = CUSTOMER_DASHBOARD_PATH,
  homeDir = homedir(),
): PowerBIPreflightResult {
  const remediation: string[] = [];

  // ── 1. Python check ─────────────────────────────────────────────────────────
  const pyCheck = checkPython();
  const python: 'ok' | 'missing' = pyCheck.ok ? 'ok' : 'missing';
  if (!pyCheck.ok) {
    const versionNote = pyCheck.version ? ` (found ${pyCheck.version})` : '';
    remediation.push(
      `python3 ≥3.11 required${versionNote}. Install: brew install python@3.12`
    );
  }

  // ── 2. Project presence check ────────────────────────────────────────────────
  const projectExists = existsSync(join(projectPath, 'src', 'main.py'));
  const project: 'ok' | 'missing' = projectExists ? 'ok' : 'missing';
  if (!projectExists) {
    remediation.push(
      `customer-dashboard project not found at ${projectPath}. ` +
      `Clone: git clone https://github.com/russellteter/customer-dashboard "${projectPath}"`
    );
  }

  // ── 3. Venv check ────────────────────────────────────────────────────────────
  const venvExists = existsSync(join(projectPath, '.venv'));
  const venv: 'ok' | 'missing' = venvExists ? 'ok' : 'missing';
  if (!venvExists) {
    remediation.push(
      `customer-dashboard venv not found at ${projectPath}/.venv. ` +
      `Bootstrap: cd "${projectPath}" && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
    );
  }

  // ── 4. Google OAuth credentials check ────────────────────────────────────────
  // Only check when the project itself exists; structural remediation covers that case.
  const googleCredsPath = resolveGoogleCredsPath(projectPath);
  const consentTokenPath = resolveTokenPicklePath(projectPath);

  let googleCreds: 'ok' | 'missing' | 'not_checked';
  let consentToken: 'ok' | 'missing' | 'not_checked';

  if (!projectExists) {
    googleCreds = 'not_checked';
    consentToken = 'not_checked';
  } else {
    googleCreds = existsSync(googleCredsPath) ? 'ok' : 'missing';
    if (googleCreds === 'missing') {
      remediation.push(
        `customer-dashboard Google OAuth credentials not found at ${googleCredsPath}. ` +
        `Download credentials.json from Google Cloud Console (the customer-dashboard project) ` +
        `and place it at that path. ` +
        `See docs/research/powerbi-customer-dashboard-google-oauth.md for full setup steps. ` +
        `Override path: CUSTOMER_DASHBOARD_GOOGLE_CREDENTIALS env var.`
      );
    }

    // ── 5. Consent token (token.pickle) ─────────────────────────────────────────
    // Only check when creds are present — missing creds already blocks everything.
    // Mirrors settings.py:459 ("token_file": PROJECT_ROOT / "token.pickle").
    if (googleCreds === 'ok') {
      consentToken = existsSync(consentTokenPath) ? 'ok' : 'missing';
      if (consentToken === 'missing') {
        remediation.push(
          `Google OAuth token pickle not found at ${consentTokenPath}. ` +
          `One-time browser consent required. Run: ` +
          `cd "${projectPath}" && source .venv/bin/activate && python3 src/main.py --no-am-dashboards ` +
          `(a browser window will open — complete sign-in to write token.pickle).`
        );
      }
    } else {
      consentToken = 'not_checked';
    }
  }

  // ── 6. OneDrive path + critical CSV check ────────────────────────────────────
  // Mirrors settings.py:32-40 auto-detect order.
  // Analysis §Changes #5: four critical CSVs must exist before spawning subprocess.
  const dataDirResult = resolveDataDir(homeDir);
  const onedriveDir = dataDirResult.dir;
  const onedrivePath: 'primary' | 'alt' | 'none' =
    dataDirResult.source === 'env'
      ? // env override: treat as 'primary' for display; it's a user-controlled path
        'primary'
      : dataDirResult.source === 'none'
        ? 'none'
        : dataDirResult.source;

  const missingCsvs: CriticalCsv[] = [];

  if (!onedriveDir) {
    remediation.push(
      `OneDrive data directory not found. Neither primary ` +
      `(~/Library/CloudStorage/OneDrive-SharedLibraries-ClassEDU/ClassEDU - CustomerDashboard) ` +
      `nor alt (...ClassEDU(2)/Business - Documents/CustomerDashboard) mount exists. ` +
      `Ensure OneDrive is signed in and the ClassEDU shared library is synced.`
    );
  } else {
    for (const csv of CRITICAL_CSVS) {
      if (!existsSync(join(onedriveDir, csv))) {
        missingCsvs.push(csv);
      }
    }
    if (missingCsvs.length > 0) {
      const missing = missingCsvs.join(', ');
      const pathLabel = onedrivePath === 'alt'
        ? 'alt OneDrive path (only 10 CSVs; missing class_sessions + account_velocity and others)'
        : 'primary OneDrive path';
      remediation.push(
        `Critical CSVs missing at ${onedriveDir} (${pathLabel}): ${missing}. ` +
        `The Power Automate flow "Customer Dashboard - Weekly Data Export" ` +
        `(GUID 7df99b8c-8647-4254-9788-868c71dd382f) may not have run yet, ` +
        `or OneDrive sync is incomplete. Check OneDrive status and trigger the flow if needed.`
      );
    }
  }

  // ── Derive classification (data-access axis) ─────────────────────────────────
  let classification: PowerBIClassification | 'not_checked';
  if (!projectExists) {
    classification = 'not_checked';
  } else if (googleCreds === 'missing') {
    classification = 'creds-missing';
  } else if (consentToken === 'missing') {
    classification = 'consent-not-done';
  } else if (!onedriveDir || missingCsvs.length > 0) {
    classification = 'csvs-missing';
  } else {
    classification = 'ok';
  }

  return {
    python,
    pythonVersion: pyCheck.version,
    venv,
    project,
    googleCreds,
    googleCredsPath,
    consentToken,
    consentTokenPath,
    onedrivePath,
    onedriveDir,
    missingCsvs,
    classification,
    projectPath,
    remediation,
  };
}
