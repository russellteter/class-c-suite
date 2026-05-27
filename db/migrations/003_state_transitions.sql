-- Migration 003 — Ch.3: state_transitions audit table + agent_invocations idempotency guard
-- Source: docs/decisions/0004-ch3-runtime-spine.md §1.5 + §7.4
-- Depends on: 001_initial.sql (runs, agent_invocations tables)

-- State transition audit trail: every call to transition() writes one row.
CREATE TABLE IF NOT EXISTS state_transitions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id      TEXT    NOT NULL REFERENCES runs(run_id),
  from_kind   TEXT    NOT NULL,
  to_kind     TEXT    NOT NULL,
  event_json  TEXT    NOT NULL,
  ts          INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Fast lookup for a run's transition history (ordered by ts for debugging).
CREATE INDEX IF NOT EXISTS idx_st_run_id ON state_transitions(run_id, ts);

-- Idempotency guard: prevents duplicate completed-lens rows (ADR §7.4).
-- resumeRun() checks completedRoles set; this constraint is the last-resort safety net.
-- Note: production schema (migration 001) uses 'agent_role' column (not 'role').
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_run_role
  ON agent_invocations(run_id, agent_role)
  WHERE status = 'completed';
