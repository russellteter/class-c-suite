// tests/unit/credentials/safeStorage-vault.spec.ts
// Tests for SafeStorageVault: store/load/delete roundtrip;
// encryption/decryption verified via fake SafeStorageAdapter.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { SafeStorageVault } from '../../../apps/utility/src/credentials/safeStorageVault.js';
import type { SafeStorageAdapter } from '../../../apps/utility/src/credentials/safeStorageVault.js';
import { seedFromMigrations } from '../../helpers/seedFromMigrations.js';

// ── Fake SafeStorageAdapter ───────────────────────────────────────────────────
// XOR-shifts the bytes as a deterministic "encryption" — enough to verify the
// vault round-trips through the adapter without Electron.

const FAKE_XOR_KEY = 0xab;

const fakeAdapter: SafeStorageAdapter = {
  isEncryptionAvailable: () => true,
  encryptString: (plaintext: string) => {
    const buf = Buffer.from(plaintext, 'utf8');
    return Buffer.from(buf.map(b => b ^ FAKE_XOR_KEY));
  },
  decryptString: (encrypted: Buffer) => {
    const decrypted = Buffer.from(encrypted.map(b => b ^ FAKE_XOR_KEY));
    return decrypted.toString('utf8');
  },
};

// ── DB setup ──────────────────────────────────────────────────────────────────

function openTestDb(): { db: Database.Database; tmpDir: string } {
  const dir = mkdtempSync(join(tmpdir(), 'c-suite-vault-'));
  const db = new Database(join(dir, 'test.db'));

  // Apply the full production schema via the real migration runner — single
  // source of truth for the credentials table (db/migrations/006_credentials.sql).
  seedFromMigrations(db);
  return { db, tmpDir: dir };
}

// Helper for describe blocks that need db/vault.
function makeFixture() {
  let db: Database.Database;
  let tmpDir: string;
  let vault: SafeStorageVault;

  beforeEach(() => {
    const opened = openTestDb();
    db = opened.db;
    tmpDir = opened.tmpDir;
    vault = new SafeStorageVault(db, fakeAdapter);
  });

  afterEach(() => {
    try { db?.close(); } catch { /* already closed */ }
    try { if (tmpDir) rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  return {
    getDb: () => db,
    getVault: () => vault,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SafeStorageVault — store / load roundtrip', () => {
  const f = makeFixture();

  it('stores and loads a plaintext credential unchanged', async () => {
    const vault = f.getVault();
    await vault.storeCredential('salesforce', 'my-refresh-token-123', 'oauth_refresh_token');
    const loaded = await vault.loadCredential('salesforce');
    expect(loaded).not.toBeNull();
    expect(loaded?.plaintext).toBe('my-refresh-token-123');
    expect(loaded?.type).toBe('oauth_refresh_token');
  });

  it('encrypts: stored blob does not equal plaintext', async () => {
    const vault = f.getVault();
    const db = f.getDb();
    const plaintext = 'super-secret-token';
    await vault.storeCredential('salesforce', plaintext, 'oauth_refresh_token');
    const row = db
      .prepare('SELECT encrypted_blob FROM credentials WHERE service_id = ?')
      .get('salesforce') as { encrypted_blob: Buffer };
    expect(row.encrypted_blob.toString('utf8')).not.toBe(plaintext);
    expect(row.encrypted_blob.toString('hex')).not.toBe(
      Buffer.from(plaintext).toString('hex')
    );
  });

  it('round-trips expiresAt', async () => {
    const vault = f.getVault();
    const expiry = new Date('2027-01-01T00:00:00Z');
    await vault.storeCredential('netsuite', 'tba-key', 'tba_token', expiry);
    const loaded = await vault.loadCredential('netsuite');
    expect(loaded?.expiresAt?.getTime()).toBe(expiry.getTime());
  });

  it('round-trips metadata', async () => {
    const vault = f.getVault();
    const meta = { instanceUrl: 'https://classedu.my.salesforce.com' };
    await vault.storeCredential('salesforce', 'tok', 'oauth_refresh_token', undefined, meta);
    const loaded = await vault.loadCredential('salesforce');
    expect(loaded?.metadata).toEqual(meta);
  });

  it('returns null for a service with no stored credential', async () => {
    const vault = f.getVault();
    const loaded = await vault.loadCredential('gmail');
    expect(loaded).toBeNull();
  });

  it('stores all six service IDs without conflict', async () => {
    const vault = f.getVault();
    const services = ['salesforce', 'netsuite', 'aws', 'gmail', 'chorus', 'powerbi'] as const;
    for (const svc of services) {
      await vault.storeCredential(svc, `token-for-${svc}`, 'api_key');
    }
    for (const svc of services) {
      const loaded = await vault.loadCredential(svc);
      expect(loaded?.plaintext).toBe(`token-for-${svc}`);
    }
  });

  it('overwrites an existing credential for the same serviceId', async () => {
    const vault = f.getVault();
    await vault.storeCredential('salesforce', 'old-token', 'oauth_refresh_token');
    await vault.storeCredential('salesforce', 'new-token', 'oauth_refresh_token');
    const loaded = await vault.loadCredential('salesforce');
    expect(loaded?.plaintext).toBe('new-token');
  });
});

describe('SafeStorageVault — delete', () => {
  const f = makeFixture();

  it('deletes an existing credential', async () => {
    const vault = f.getVault();
    await vault.storeCredential('salesforce', 'tok', 'oauth_refresh_token');
    await vault.deleteCredential('salesforce');
    const loaded = await vault.loadCredential('salesforce');
    expect(loaded).toBeNull();
  });

  it('no-op when deleting a non-existent credential', async () => {
    const vault = f.getVault();
    await expect(vault.deleteCredential('gmail')).resolves.not.toThrow();
  });
});

describe('SafeStorageVault — hasValidCredential', () => {
  const f = makeFixture();

  it('returns false when no credential stored', async () => {
    expect(await f.getVault().hasValidCredential('salesforce')).toBe(false);
  });

  it('returns true when credential has no expiry', async () => {
    await f.getVault().storeCredential('salesforce', 'tok', 'oauth_refresh_token');
    expect(await f.getVault().hasValidCredential('salesforce')).toBe(true);
  });

  it('returns true when credential expires in the future', async () => {
    const future = new Date(Date.now() + 3_600_000);
    await f.getVault().storeCredential('salesforce', 'tok', 'oauth_refresh_token', future);
    expect(await f.getVault().hasValidCredential('salesforce')).toBe(true);
  });

  it('returns false when credential is expired', async () => {
    const past = new Date(Date.now() - 1000);
    await f.getVault().storeCredential('salesforce', 'tok', 'oauth_refresh_token', past);
    expect(await f.getVault().hasValidCredential('salesforce')).toBe(false);
  });
});

describe('SafeStorageVault — encryption unavailable', () => {
  it('throws on storeCredential when encryption unavailable', async () => {
    const { db, tmpDir } = openTestDb();
    const disabledAdapter: SafeStorageAdapter = {
      isEncryptionAvailable: () => false,
      encryptString: () => Buffer.alloc(0),
      decryptString: () => '',
    };
    const vault = new SafeStorageVault(db, disabledAdapter);

    try {
      await expect(
        vault.storeCredential('salesforce', 'tok', 'oauth_refresh_token')
      ).rejects.toThrow('encryption unavailable');
    } finally {
      db.close();
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
