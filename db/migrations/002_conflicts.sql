-- Migration 002: Ch.2 SafeWrite conflicts table
-- All tables use CREATE TABLE IF NOT EXISTS for idempotency.
-- Source: docs/decisions/0003-ch2-safewrite.md §G-2

CREATE TABLE IF NOT EXISTS conflicts (
  conflict_id  TEXT    PRIMARY KEY,
  run_id       TEXT    REFERENCES runs(run_id),
  vault_path   TEXT    NOT NULL,
  sidecar_path TEXT    NOT NULL,
  pre_hash     TEXT    NOT NULL,
  re_read_hash TEXT    NOT NULL,
  detected_at  INTEGER NOT NULL,   -- ms epoch
  resolved_at  INTEGER,            -- ms epoch; NULL until operator resolves
  resolution   TEXT                -- free-text description of resolution
);

CREATE INDEX IF NOT EXISTS idx_conflicts_path ON conflicts(vault_path);
