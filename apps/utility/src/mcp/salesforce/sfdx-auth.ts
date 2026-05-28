// apps/utility/src/mcp/salesforce/sfdx-auth.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §4 (Salesforce auth) +
//         Russell-decision 2026-05-28: ride SFDX CLI auth instead of dedicated Connected App.
//
// Reads Salesforce auth from the SFDX CLI's stored session at
// ~/.sfdx/<username>.json. The sf CLI uses Salesforce's built-in "PlatformCLI"
// Connected App, so we don't need our own client_id/client_secret.
//
// Refresh strategy: shell to `sf org display --target-org <user> --json` —
// the sf CLI handles its own access-token refresh transparently via Salesforce's
// /services/oauth2/token endpoint (which accepts the CLI's PlatformCLI secret
// server-side without exposing it to user code). The returned access token is
// freshly minted on every call; we never need to manage refresh ourselves.

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

const execAsync = promisify(exec);
const SF_DISPLAY_TIMEOUT_MS = 15_000;

// ── Typed SFDX probe result ───────────────────────────────────────────────────

/**
 * Explicit three-state result for SFDX auth checks.
 * Callers must not collapse these into a boolean — each maps to a distinct
 * health-probe state.
 */
export type SfdxProbeResult =
  | { state: 'ok'; session: SfdxAuthSession }
  | { state: 'no_cli'; reason: 'sf binary not on PATH' }
  | { state: 'no_org'; reason: string }
  | { state: 'session_expired'; reason: string; username?: string }
  | { state: 'error'; reason: string };

export interface SfdxAuthSession {
  accessToken: string;
  instanceUrl: string;
  username: string;
}

/**
 * Look up the default SFDX target-org alias.
 * Returns the username (e.g. "sf.operations@classedu.com") or null if not set.
 */
async function getDefaultTargetOrg(): Promise<string | null> {
  // Try ~/.sfdx/sfdx-config.json (legacy) and ~/.sf/config.json (current).
  const candidates = [
    path.join(os.homedir(), '.sf', 'config.json'),
    path.join(os.homedir(), '.sfdx', 'sfdx-config.json'),
  ];
  for (const file of candidates) {
    try {
      const raw = await fs.readFile(file, 'utf8');
      const parsed = JSON.parse(raw) as { 'target-org'?: string; defaultusername?: string };
      const target = parsed['target-org'] ?? parsed.defaultusername;
      if (typeof target === 'string' && target.length > 0) return target;
    } catch {
      // not present; try next
    }
  }

  // Fallback: find the only/first auth file under ~/.sfdx/ that looks like a username.
  try {
    const sfdxDir = path.join(os.homedir(), '.sfdx');
    const entries = await fs.readdir(sfdxDir);
    const userJson = entries.find((f) => f.endsWith('.json') && f.includes('@'));
    if (userJson) return userJson.replace(/\.json$/, '');
  } catch {
    // no .sfdx dir at all
  }
  return null;
}

/**
 * Read the SFDX auth file directly for the given username.
 * Returns the stored session (access token may be stale).
 */
async function readSfdxAuthFile(username: string): Promise<{ accessToken: string; instanceUrl: string } | null> {
  const file = path.join(os.homedir(), '.sfdx', `${username}.json`);
  try {
    const raw = await fs.readFile(file, 'utf8');
    const parsed = JSON.parse(raw) as { accessToken?: string; instanceUrl?: string };
    if (typeof parsed.accessToken === 'string' && typeof parsed.instanceUrl === 'string') {
      return { accessToken: parsed.accessToken, instanceUrl: parsed.instanceUrl };
    }
  } catch {
    // file missing or malformed
  }
  return null;
}

/**
 * Shell to `sf org display --target-org <user> --json` to get a freshly-refreshed
 * access token. The sf CLI handles refresh internally via its built-in Connected App.
 * Returns a typed result distinguishing CLI-missing from session-expired.
 */
async function refreshViaSfCli(username: string): Promise<
  | { ok: true; accessToken: string; instanceUrl: string }
  | { ok: false; reason: string; noCliFound?: boolean }
> {
  try {
    const cmd = `sf org display --target-org ${JSON.stringify(username)} --json`;
    const { stdout } = await execAsync(cmd, { timeout: SF_DISPLAY_TIMEOUT_MS });
    const parsed = JSON.parse(stdout) as {
      status?: number;
      result?: { accessToken?: string; instanceUrl?: string };
      message?: string;
    };
    if (parsed.status === 0 && parsed.result?.accessToken && parsed.result?.instanceUrl) {
      return { ok: true, accessToken: parsed.result.accessToken, instanceUrl: parsed.result.instanceUrl };
    }
    // sf returned non-zero or missing fields — session likely expired
    return { ok: false, reason: parsed.message ?? 'sf org display returned non-zero or incomplete result' };
  } catch (err: unknown) {
    const msg = String(err);
    // Distinguish "sf not found" from other failures
    if (msg.includes('not found') || msg.includes('ENOENT') || msg.includes('command not found')) {
      return { ok: false, reason: 'sf CLI binary not found on PATH', noCliFound: true };
    }
    if (msg.includes('expired') || msg.includes('invalid') || msg.includes('NoOrgFound') || msg.includes('AuthInfo')) {
      return { ok: false, reason: `SFDX session expired or invalid: ${msg}` };
    }
    return { ok: false, reason: `sf org display failed: ${msg}` };
  }
}

/**
 * Get a current SFDX session: prefers `sf org display` (always fresh), falls back
 * to reading the file directly (may be stale but is fast).
 * Returns null if SFDX is not authenticated against any Salesforce org.
 */
export async function getSfdxAuth(): Promise<SfdxAuthSession | null> {
  const username = await getDefaultTargetOrg();
  if (!username) return null;

  // Prefer the CLI — guarantees a fresh token.
  const cliResult = await refreshViaSfCli(username);
  if (cliResult.ok) return { ...cliResult, username };

  // Fall back to the stored file (may have a usable access token).
  const stored = await readSfdxAuthFile(username);
  if (stored) return { ...stored, username };

  return null;
}

/**
 * Quick boolean check: is SFDX authenticated against any org?
 * Used by isAuthenticated() — avoids the full token round-trip.
 * NOTE: only checks file presence, not token validity. Use probeSfdxAuth()
 * for health-check purposes where state distinction matters.
 */
export async function hasSfdxAuth(): Promise<boolean> {
  const username = await getDefaultTargetOrg();
  if (!username) return false;
  const file = path.join(os.homedir(), '.sfdx', `${username}.json`);
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

/**
 * Full typed SFDX health probe distinguishing:
 *   ok              — sf CLI present, session valid, fresh access token obtained
 *   no_cli          — sf binary not found on PATH
 *   no_org          — sf installed but no default target-org configured
 *   session_expired — target-org configured but token refresh failed
 *   error           — unexpected failure
 *
 * This is the probe used by SalesforceClient.healthCheck() and smoke tests.
 * hasSfdxAuth() is kept for the isAuthenticated() fast-path only.
 */
export async function probeSfdxAuth(): Promise<SfdxProbeResult> {
  // Check if sf CLI is on PATH first
  try {
    await execAsync('sf version --json', { timeout: 5_000 });
  } catch (err: unknown) {
    const msg = String(err);
    if (msg.includes('not found') || msg.includes('ENOENT') || msg.includes('command not found')) {
      return { state: 'no_cli', reason: 'sf binary not on PATH' };
    }
    // Might still work despite non-zero exit from version check — fall through
  }

  const username = await getDefaultTargetOrg();
  if (!username) {
    return {
      state: 'no_org',
      reason: 'No default target-org in ~/.sf/config.json or ~/.sfdx/sfdx-config.json. Run: sf org login web',
    };
  }

  const cliResult = await refreshViaSfCli(username);
  if (cliResult.ok) {
    return { state: 'ok', session: { accessToken: cliResult.accessToken, instanceUrl: cliResult.instanceUrl, username } };
  }

  if (cliResult.noCliFound) {
    return { state: 'no_cli', reason: 'sf binary not on PATH' };
  }

  // CLI found but token refresh failed — session expired
  return { state: 'session_expired', reason: cliResult.reason, username };
}
