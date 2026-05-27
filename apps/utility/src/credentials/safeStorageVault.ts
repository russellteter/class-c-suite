// apps/utility/src/credentials/safeStorageVault.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §3.2
//
// SECURITY CONTRACT: ALL credentials go through Electron's safeStorage API.
// Zero plaintext on disk. Zero in process.env. Zero in logs. Zero in repo.
//
// The encryptor/decryptor is injected at construction time so this module is
// testable without a live Electron process (unit tests supply fakes).

import type Database from 'better-sqlite3';
import type { McpServiceId, CredentialType } from '@c-suite/shared-types/mcp';

// ── Injected Electron safeStorage interface ───────────────────────────────────
// Matches the Electron API surface we use; injected so tests can provide fakes.

export interface SafeStorageAdapter {
  encryptString(plaintext: string): Buffer;
  decryptString(encrypted: Buffer): string;
  isEncryptionAvailable(): boolean;
}

// ── Credential payload returned from loadCredential ───────────────────────────

export interface LoadedCredential {
  plaintext: string;
  type: CredentialType;
  expiresAt?: Date;
  metadata?: object;
}

// ── Row shape as stored in SQLite ─────────────────────────────────────────────

interface CredentialRow {
  service_id: string;
  encrypted_blob: Buffer;
  credential_type: string;
  expires_at: number | null;
  last_refreshed_at: number;
  metadata_json: string | null;
}

// ── SafeStorageVault ──────────────────────────────────────────────────────────

export class SafeStorageVault {
  private readonly db: Database.Database;
  private readonly storage: SafeStorageAdapter;

  constructor(db: Database.Database, storage: SafeStorageAdapter) {
    this.db = db;
    this.storage = storage;
  }

  /**
   * Store a credential encrypted via safeStorage.
   * Overwrites any existing credential for the same serviceId.
   * Never logs or exposes the plaintext value.
   */
  async storeCredential(
    serviceId: McpServiceId,
    plaintext: string,
    type: CredentialType,
    expiresAt?: Date,
    metadata?: object,
  ): Promise<void> {
    if (!this.storage.isEncryptionAvailable()) {
      throw new Error(
        `safeStorage encryption unavailable — cannot store credential for '${serviceId}'. ` +
        'Electron must be running with keychain access.'
      );
    }
    const encryptedBlob = this.storage.encryptString(plaintext);
    this.db
      .prepare(
        `INSERT OR REPLACE INTO credentials
           (service_id, encrypted_blob, credential_type, expires_at, last_refreshed_at, metadata_json)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        serviceId,
        encryptedBlob,
        type,
        expiresAt ? expiresAt.getTime() : null,
        Date.now(),
        metadata ? JSON.stringify(metadata) : null,
      );
  }

  /**
   * Load and decrypt a credential. Returns null if no credential is stored.
   * Never logs or exposes the plaintext value.
   */
  async loadCredential(serviceId: McpServiceId): Promise<LoadedCredential | null> {
    const row = this.db
      .prepare('SELECT * FROM credentials WHERE service_id = ?')
      .get(serviceId) as CredentialRow | undefined;

    if (!row) return null;

    if (!this.storage.isEncryptionAvailable()) {
      throw new Error(
        `safeStorage decryption unavailable — cannot load credential for '${serviceId}'.`
      );
    }
    const plaintext = this.storage.decryptString(row.encrypted_blob);

    return {
      plaintext,
      type: row.credential_type as CredentialType,
      expiresAt: row.expires_at != null ? new Date(row.expires_at) : undefined,
      metadata: row.metadata_json ? (JSON.parse(row.metadata_json) as object) : undefined,
    };
  }

  /**
   * Delete a stored credential. No-op if none exists.
   */
  async deleteCredential(serviceId: McpServiceId): Promise<void> {
    this.db
      .prepare('DELETE FROM credentials WHERE service_id = ?')
      .run(serviceId);
  }

  /**
   * Check whether a non-expired credential exists for a service.
   */
  async hasValidCredential(serviceId: McpServiceId): Promise<boolean> {
    const row = this.db
      .prepare('SELECT expires_at FROM credentials WHERE service_id = ?')
      .get(serviceId) as Pick<CredentialRow, 'expires_at'> | undefined;

    if (!row) return false;
    if (row.expires_at == null) return true; // non-expiring
    return Date.now() < row.expires_at;
  }
}

// ── Module-level factory (production) ─────────────────────────────────────────
// Lazily loads Electron's safeStorage so unit tests don't hard-import it.

let _vault: SafeStorageVault | null = null;

export async function getVault(db: Database.Database): Promise<SafeStorageVault> {
  if (_vault) return _vault;

  // Lazy import — Electron is only available in the main/utility process at runtime.
  const { safeStorage } = await import('electron');
  _vault = new SafeStorageVault(db, safeStorage);
  return _vault;
}

// Standalone top-level functions using the module-level vault (production API).
// Unit tests should construct SafeStorageVault directly with a fake adapter.

export async function storeCredential(
  db: Database.Database,
  serviceId: McpServiceId,
  plaintext: string,
  type: CredentialType,
  expiresAt?: Date,
  metadata?: object,
): Promise<void> {
  const vault = await getVault(db);
  return vault.storeCredential(serviceId, plaintext, type, expiresAt, metadata);
}

export async function loadCredential(
  db: Database.Database,
  serviceId: McpServiceId,
): Promise<LoadedCredential | null> {
  const vault = await getVault(db);
  return vault.loadCredential(serviceId);
}

export async function deleteCredential(
  db: Database.Database,
  serviceId: McpServiceId,
): Promise<void> {
  const vault = await getVault(db);
  return vault.deleteCredential(serviceId);
}
