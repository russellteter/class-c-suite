-- db/migrations/006_credentials.sql
-- Source: docs/decisions/0010-ch8-mcp-integration.md §3.2
-- Credential storage table — all blobs encrypted via Electron safeStorage.
-- Idempotent: CREATE TABLE IF NOT EXISTS; safe to run twice.
-- Advances schema to version 6.

CREATE TABLE IF NOT EXISTS credentials (
  service_id         TEXT    PRIMARY KEY,           -- 'salesforce', 'gmail', etc.
  encrypted_blob     BLOB    NOT NULL,              -- safeStorage.encryptString(JSON-serialized credential)
  credential_type    TEXT    NOT NULL,              -- 'oauth_refresh_token' | 'tba_token' | 'api_key' | 'sso_profile_ref'
  expires_at         INTEGER,                       -- Unix epoch ms; NULL if non-expiring
  last_refreshed_at  INTEGER NOT NULL,
  metadata_json      TEXT                           -- service-specific (e.g., Salesforce instance URL)
);

CREATE INDEX IF NOT EXISTS idx_credentials_service_id ON credentials (service_id);
