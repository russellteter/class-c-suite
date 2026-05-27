-- Migration 004 — Ch.2 hardening: B39 vault.commit.failed audit table
-- Source: docs/reviews/ultrareview-2026-05-27.md "Critical Fix 5"
--         PRD §5 ("vault writes are git-tracked with auto-commit")
-- Depends on: 001_initial.sql

-- Record every SafeWrite git-commit failure. Write itself succeeded; commit
-- failure is non-fatal but must be visible and recoverable (future Ch.10
-- scheduler retries from this table).
CREATE TABLE IF NOT EXISTS vault_commit_failures (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id      TEXT    NOT NULL,
  path        TEXT    NOT NULL,
  agent       TEXT,
  playbook    TEXT,
  error       TEXT    NOT NULL,
  ts          INTEGER NOT NULL DEFAULT (unixepoch()),
  retried_at  INTEGER,
  retry_status TEXT
);

CREATE INDEX IF NOT EXISTS idx_vcf_run_id ON vault_commit_failures(run_id, ts);
CREATE INDEX IF NOT EXISTS idx_vcf_unretried ON vault_commit_failures(ts) WHERE retried_at IS NULL;
