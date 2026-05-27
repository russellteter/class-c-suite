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
  projectPath: string;
  remediation: string[];
}

export const CUSTOMER_DASHBOARD_PATH =
  process.env.CUSTOMER_DASHBOARD_PATH ??
  '/Users/russellteter/Claude Code Projects/customer-dashboard';

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

  return {
    python,
    pythonVersion: pyCheck.version,
    venv,
    project,
    projectPath,
    remediation,
  };
}
