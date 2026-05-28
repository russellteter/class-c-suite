// apps/utility/src/mcp/powerbi/preflight.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §9 + BLOCKERS B18/B2
// Checks that python3 (≥3.11), the customer-dashboard project, and its venv are present.

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

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
  projectPath: string;
  remediation: string[];
}

export const CUSTOMER_DASHBOARD_PATH =
  process.env.CUSTOMER_DASHBOARD_PATH ??
  '/Users/russellteter/Claude Code Projects/customer-dashboard';

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

/**
 * Run the full preflight check for the PowerBI subprocess dependency.
 * Returns a structured result with per-check status and remediation strings.
 * Does NOT throw — callers decide whether to surface errors.
 */
export function preflightPowerBI(projectPath = CUSTOMER_DASHBOARD_PATH): PowerBIPreflightResult {
  const remediation: string[] = [];

  // 1. Python check
  const pyCheck = checkPython();
  const python: 'ok' | 'missing' = pyCheck.ok ? 'ok' : 'missing';
  if (!pyCheck.ok) {
    const versionNote = pyCheck.version ? ` (found ${pyCheck.version})` : '';
    remediation.push(
      `python3 ≥3.11 required${versionNote}. Install: brew install python@3.12`
    );
  }

  // 2. Project presence check
  const projectExists = existsSync(join(projectPath, 'src', 'main.py'));
  const project: 'ok' | 'missing' = projectExists ? 'ok' : 'missing';
  if (!projectExists) {
    remediation.push(
      `customer-dashboard project not found at ${projectPath}. ` +
      `Clone: git clone https://github.com/russellteter/customer-dashboard "${projectPath}"`
    );
  }

  // 3. Venv check
  const venvExists = existsSync(join(projectPath, '.venv'));
  const venv: 'ok' | 'missing' = venvExists ? 'ok' : 'missing';
  if (!venvExists) {
    remediation.push(
      `customer-dashboard venv not found at ${projectPath}/.venv. ` +
      `Bootstrap: cd "${projectPath}" && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
    );
  }

  // 4. Google OAuth credentials check (customer-dashboard's own creds — separate from C-Suite Gmail)
  //    Only check when the project itself exists; otherwise the remediation above covers it.
  const googleCredsPath = resolveGoogleCredsPath(projectPath);
  let googleCreds: 'ok' | 'missing' | 'not_checked';
  if (!projectExists) {
    googleCreds = 'not_checked';
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
  }

  return {
    python,
    pythonVersion: pyCheck.version,
    venv,
    project,
    googleCreds,
    googleCredsPath,
    projectPath,
    remediation,
  };
}
