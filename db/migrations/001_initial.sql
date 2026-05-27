-- Migration 001: Ch.1 initial schema
-- All tables use CREATE TABLE IF NOT EXISTS for idempotency.
-- Migration runner executes this in a single transaction.
-- Source: docs/decisions/0002-ch1-process-architecture.md §4.2

CREATE TABLE IF NOT EXISTS schema_version (
  version     INTEGER NOT NULL,
  applied_at  INTEGER NOT NULL             -- ms epoch
);

-- Insert version marker ONLY if not already present (idempotent).
INSERT OR IGNORE INTO schema_version (version, applied_at)
  VALUES (1, strftime('%s', 'now') * 1000);

CREATE TABLE IF NOT EXISTS runs (
  run_id          TEXT PRIMARY KEY,
  playbook        TEXT NOT NULL,
  question        TEXT NOT NULL,
  started_at      INTEGER NOT NULL,        -- ms epoch
  current_state   TEXT NOT NULL,           -- state machine node name
  plan_json       TEXT,
  finished_at     INTEGER,
  rigor_score     INTEGER,
  rigor_threshold INTEGER,
  status          TEXT,                    -- 'in_progress'|'shipped_clean'|'shipped_draft'|'failed'|'cancelled'
  memo_path       TEXT
);

CREATE INDEX IF NOT EXISTS idx_runs_status     ON runs(status);
CREATE INDEX IF NOT EXISTS idx_runs_started_at ON runs(started_at);

CREATE TABLE IF NOT EXISTS agent_invocations (
  invocation_id          TEXT PRIMARY KEY,
  run_id                 TEXT NOT NULL REFERENCES runs(run_id),
  agent_role             TEXT NOT NULL,
  started_at             INTEGER NOT NULL,
  completed_at           INTEGER,
  structured_output_json TEXT,
  tokens_in              INTEGER,
  tokens_out             INTEGER,
  reasoning_tokens       INTEGER,
  model                  TEXT,
  status                 TEXT              -- 'in_progress'|'completed'|'failed'|'cancelled'
);

CREATE INDEX IF NOT EXISTS idx_invocations_run ON agent_invocations(run_id);

CREATE TABLE IF NOT EXISTS tool_calls (
  call_id       TEXT PRIMARY KEY,
  run_id        TEXT NOT NULL REFERENCES runs(run_id),
  invocation_id TEXT NOT NULL REFERENCES agent_invocations(invocation_id),
  agent_role    TEXT NOT NULL,
  tool_name     TEXT NOT NULL,
  args_json     TEXT NOT NULL,
  result_json   TEXT,                     -- FULL result per data.md line 325
  source_id     TEXT,
  called_at     INTEGER NOT NULL,
  duration_ms   INTEGER
);

CREATE INDEX IF NOT EXISTS idx_tool_calls_run  ON tool_calls(run_id);
CREATE INDEX IF NOT EXISTS idx_tool_calls_call ON tool_calls(call_id);

CREATE TABLE IF NOT EXISTS process_events (
  event_id      TEXT PRIMARY KEY,
  occurred_at   INTEGER NOT NULL,
  process       TEXT NOT NULL,            -- 'main'|'utility'
  event_type    TEXT NOT NULL,            -- 'crash'|'restart'|'halt'|'start'
  exit_code     INTEGER,
  stack_trace   TEXT,
  restart_count INTEGER
);

CREATE INDEX IF NOT EXISTS idx_process_events_occurred ON process_events(occurred_at);

CREATE TABLE IF NOT EXISTS cost_ledger (
  entry_id    TEXT PRIMARY KEY,
  run_id      TEXT REFERENCES runs(run_id),
  job_id      TEXT,                       -- REFERENCES jobs(job_id) — jobs table lands Ch.2+
  agent_role  TEXT,
  model       TEXT,
  tokens_in   INTEGER,
  tokens_out  INTEGER,
  cost_usd    REAL,                       -- B5: nullable; API-equivalent reference figure
  recorded_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cost_ledger_run ON cost_ledger(run_id);
