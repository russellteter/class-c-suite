-- db/migrations/008_workstream_amounts_mirror.sql
-- Source: apps/utility/src/jobs/sundayWorkstream.ts — table was previously created
--         by CREATE TABLE IF NOT EXISTS inside the job runner, so it only existed
--         after the Sunday job fired at least once. Moving it here ensures the table
--         is present from first launch (schema_version tracks creation).
-- The sunday-workstream job still owns population; this migration only creates the shell.

CREATE TABLE IF NOT EXISTS workstream_amounts_mirror (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  status       TEXT NOT NULL,    -- 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN'
  phase        TEXT NOT NULL,    -- 'execution' | 'maintenance' | 'planning' | 'unknown'
  amount       REAL,             -- may be NULL if not specified in front-matter
  currency     TEXT NOT NULL DEFAULT 'USD',
  last_modified TEXT NOT NULL,
  updated_at   INTEGER NOT NULL
);
