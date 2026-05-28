// apps/utility/src/playbooks/lib/buildDeps.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §10
// Wires real MCP clients into PlaybookDeps. Called by run-loop.ts at run-start.
//
// Pattern: each client either takes a SafeStorageVault (Salesforce/Gmail/Chorus/NetSuite)
// or constructs unconditionally (AWS/PowerBI). NetSuite + AWS + PowerBI always construct —
// they internally decide whether to degrade based on env state (TBA tokens / SSO profile /
// venv presence). Salesforce/Gmail/Chorus check vault for credential first; if absent,
// the dep is left undefined and the playbook's evaluatePrereqs() handles degradation
// per ADR-0009 §3.6 / Phase R Decision 4.
//
// Construction failures are caught + logged + the dep left undefined so the playbook
// degrades rather than the whole run failing.

import type Database from 'better-sqlite3';
import { createLogger } from '../../logger.js';
import { loadCredential } from '../../credentials/safeStorageVault.js';
import { SafeStorageVault } from '../../credentials/safeStorageVault.js';
import type { PlaybookDeps, PlaybookId } from '@c-suite/shared-types/playbook';

const log = createLogger();

/**
 * Build the PlaybookDeps for a given playbook.
 * Today we hydrate all clients regardless of playbook; future optimization can narrow
 * via a per-playbook DEPS_NEEDED constant.
 */
export async function buildDeps(playbookId: PlaybookId, db: Database.Database): Promise<PlaybookDeps> {
  void playbookId; // reserved for future per-playbook narrowing
  const deps: PlaybookDeps = {};

  // safeStorage is Electron-only; the vault constructor needs a SafeStorageAdapter.
  // Import lazily so non-Electron test contexts that don't need MCP clients still work.
  let vault: SafeStorageVault | null = null;
  try {
    const { safeStorage } = await import('electron');
    vault = new SafeStorageVault(db, safeStorage);
  } catch (err) {
    log.warn({ message: 'buildDeps: safeStorage unavailable, MCP clients that require credentials will be skipped', err: String(err) });
  }

  // Salesforce — requires safeStorage credential.
  if (vault) {
    try {
      const cred = await loadCredential(db, 'salesforce');
      if (cred) {
        const { SalesforceClient } = await import('../../mcp/salesforce/client.js');
        deps.salesforce = new SalesforceClient(vault);
      }
    } catch (err) {
      log.warn({ message: 'buildDeps: salesforce construction failed', err: String(err) });
    }
  }

  // NetSuite — construct unconditionally (client handles token-absent mode internally).
  if (vault) {
    try {
      const { NetSuiteClient } = await import('../../mcp/netsuite/client.js');
      deps.netsuite = new NetSuiteClient(vault);
    } catch (err) {
      log.warn({ message: 'buildDeps: netsuite construction failed', err: String(err) });
    }
  }

  // AWS — local SSO, no vault dependency. Construct unconditionally; client flags missing profiles.
  try {
    const { AWSClient } = await import('../../mcp/aws/client.js');
    deps.aws = new AWSClient();
  } catch (err) {
    log.warn({ message: 'buildDeps: aws construction failed', err: String(err) });
  }

  // Gmail — requires safeStorage credential.
  if (vault) {
    try {
      const cred = await loadCredential(db, 'gmail');
      if (cred) {
        const { GmailClient } = await import('../../mcp/gmail/client.js');
        deps.gmail = new GmailClient(vault);
      }
    } catch (err) {
      log.warn({ message: 'buildDeps: gmail construction failed', err: String(err) });
    }
  }

  // Chorus — requires safeStorage credential.
  if (vault) {
    try {
      const cred = await loadCredential(db, 'chorus');
      if (cred) {
        const { ChorusClient } = await import('../../mcp/chorus/client.js');
        deps.chorus = new ChorusClient(vault);
      }
    } catch (err) {
      log.warn({ message: 'buildDeps: chorus construction failed', err: String(err) });
    }
  }

  // PowerBI — subprocess, no vault dependency. Construct unconditionally; preflight handles missing python/venv.
  try {
    const { PowerBIClient } = await import('../../mcp/powerbi/subprocess.js');
    deps.powerbi = new PowerBIClient();
  } catch (err) {
    log.warn({ message: 'buildDeps: powerbi construction failed', err: String(err) });
  }

  return deps;
}
