-- db/migrations/001_initial.sql
-- Source: docs/architecture/data.md §SQLite runtime store.
-- Full schema lands in Ch.1 (vault index) and Ch.3 (runtime spine).

CREATE TABLE IF NOT EXISTS schema_version (
  version     INTEGER NOT NULL,
  applied_at  TEXT    NOT NULL DEFAULT (datetime('now', 'utc')),
  description TEXT
);

-- Placeholder tables — full DDL lands per chapter:
-- Ch.1: vault_artifacts (index of every parsed artifact)
-- Ch.3: run_states, agent_events, tool_calls
-- Ch.5: writeback_proposals
-- Ch.6: write_history

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (1, 'Ch.0 initial migration — skeleton only');
