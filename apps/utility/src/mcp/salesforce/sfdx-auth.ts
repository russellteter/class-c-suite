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
 */
async function refreshViaSfCli(username: string): Promise<{ accessToken: string; instanceUrl: string } | null> {
  try {
    const cmd = `sf org display --target-org ${JSON.stringify(username)} --json`;
    const { stdout } = await execAsync(cmd, { timeout: SF_DISPLAY_TIMEOUT_MS });
    const parsed = JSON.parse(stdout) as {
      status?: number;
      result?: { accessToken?: string; instanceUrl?: string };
    };
    if (parsed.status === 0 && parsed.result?.accessToken && parsed.result?.instanceUrl) {
      return { accessToken: parsed.result.accessToken, instanceUrl: parsed.result.instanceUrl };
    }
  } catch {
    // sf not installed, command failed, timed out, or auth expired
  }
  return null;
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
  const fresh = await refreshViaSfCli(username);
  if (fresh) return { ...fresh, username };

  // Fall back to the stored file (may have a usable access token).
  const stored = await readSfdxAuthFile(username);
  if (stored) return { ...stored, username };

  return null;
}

/**
 * Quick boolean check: is SFDX authenticated against any org?
 * Used by isAuthenticated() — avoids the full token round-trip.
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
