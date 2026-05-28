-- db/migrations/007_scheduled_jobs.sql
-- Source: docs/decisions/0012-ch10-scheduler-autonomy.md §3.7
-- Idempotent. Advances schema_version to 7.

CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL,
  scheduled_for INTEGER NOT NULL,           -- Unix epoch ms
  actually_ran_at INTEGER,                  -- NULL if missed / not yet caught up
  status TEXT NOT NULL DEFAULT 'pending',   -- 'pending' | 'running' | 'succeeded' | 'failed' | 'caught_up' | 'skipped_auth_expired'
  degraded_sources TEXT,                    -- JSON array of DegradedSource strings
  output_memo_path TEXT,
  failure_reason TEXT,
  run_id TEXT,                              -- FK to runs.run_id (nullable)
  duration_ms INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (run_id) REFERENCES runs(run_id)
);

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_job_id_scheduled_for
  ON scheduled_jobs(job_id, scheduled_for DESC);

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status
  ON scheduled_jobs(status);

-- Advance schema_version to 7.
UPDATE schema_version SET version = 7 WHERE version = 6;
