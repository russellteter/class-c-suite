-- Migration 005 — Ch.6 write-backs: writebacks table + per-writeback iteration
-- Source: docs/decisions/0008-write-backs-and-iterative-feedback.md §3.2 + §10.4
-- Depends on: 001_initial.sql (runs table)
-- Idempotent: CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS

CREATE TABLE IF NOT EXISTS writebacks (
  writeback_id          TEXT    PRIMARY KEY,
  run_id                TEXT    NOT NULL REFERENCES runs(run_id),
  artifact_type         TEXT    NOT NULL,              -- ArtifactType enum (Zod-validated app-side)
  artifact_id           TEXT    NOT NULL,              -- POS-NNN / DEC-NNN / etc.
  is_new                INTEGER NOT NULL,              -- 1 = new artifact; 0 = update
  draft_path            TEXT    NOT NULL,              -- .draft-<runId>.md absolute path
  active_path           TEXT    NOT NULL,              -- where it lands on accept
  description           TEXT    NOT NULL,              -- one-sentence summary
  topic                 TEXT    NOT NULL DEFAULT 'General',  -- §10.1 topic derivation
  proposed_by_json      TEXT    NOT NULL,              -- ProposedBy serialized
  proposed_at           INTEGER NOT NULL,
  decided_at            INTEGER,
  status                TEXT    NOT NULL DEFAULT 'proposed',  -- WritebackStatus enum
  iteration_count       INTEGER NOT NULL DEFAULT 0,
  iteration_history_json TEXT,                         -- IterationHistoryEntry[] serialized; null until first iteration
  rejection_rationale   TEXT,                          -- populated when status='rejected'
  committed_path        TEXT,                          -- populated when status='accepted'
  committed_at          INTEGER
);

CREATE INDEX IF NOT EXISTS idx_writebacks_run      ON writebacks(run_id);
CREATE INDEX IF NOT EXISTS idx_writebacks_status   ON writebacks(status);
CREATE INDEX IF NOT EXISTS idx_writebacks_artifact ON writebacks(artifact_type, artifact_id);
