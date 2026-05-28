/**
 * ADR-0006 §8 AC-7 — Click-any-claim → tool-call result side panel
 * Test owner: Ch.5 Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0006-ch5-cash-lever-slice.md §5.2 (memo viewer click-claim contract)
 *         docs/decisions/0006-ch5-cash-lever-slice.md §8 AC-7
 *
 * STATUS: RED until Ch.5 Runtime ships.
 *
 * Spec intent (AC-7):
 *   - Build a memo markdown string containing a [^sf-opp-q3] citation.
 *   - The renderer's claim-click handler queries SQLite tool_calls WHERE source_id = '<id>'.
 *   - Assert returned row contains: tool_name, args_json, result_json, called_at.
 *   - UI panel renders the JSON (tested via SQLite query result shape — React Testing Library
 *     test for the panel render is noted but deferred until Ch.5 UI ships).
 *
 * SQLite query contract (ADR-0006 §5.2):
 *   SELECT result_json, tool_name, tool_args, completed_at
 *   FROM tool_calls
 *   WHERE source_id = ?
 *
 * tool_calls schema from Ch.1 ADR-0002 §SQLite:
 *   - tool_call_id TEXT PRIMARY KEY
 *   - run_id TEXT
 *   - agent_invocation_id TEXT
 *   - tool_name TEXT
 *   - args_json TEXT
 *   - result_json TEXT
 *   - source_id TEXT   ← Ch.5 addition: links to memo footnote ids
 *   - called_at INTEGER
 *
 * NOTE: 'source_id' column is a Ch.5 addition to tool_calls. Ch.5 Runtime must add
 * migration 003 to add this column. Tests use in-memory SQLite for isolation.
 *
 * Activating when Ch.5 Runtime ships:
 *   1. Uncomment the queryToolCallBySourceId import.
 *   2. Remove `expect(true).toBe(false)` placeholders from RED tests.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { seedFromMigrations } from '../helpers/seedFromMigrations.js';

// ── Runtime import — Ch.5 Runtime shipped ───────────────────────────────────
import {
  queryToolCallBySourceId,
} from '../../apps/utility/src/db/tool-calls.js';

// ── Test SQLite setup ─────────────────────────────────────────────────────────
// Use production migrations (db/migrations/001..007) instead of the formerly
// hand-rolled DDL, which had drifted from prod: tool_call_id/agent_invocation_id
// vs prod call_id/invocation_id (db/migrations/001_initial.sql lines 47-58).
// seedFromMigrations() applies all migrations; runs + agent_invocations rows are
// seeded so the tool_calls FK constraints (invocation_id → agent_invocations,
// run_id → runs) resolve with foreign_keys=ON.

const SAMPLE_RUN_ID    = 'run-test-ch5';
const SAMPLE_INV_ID    = 'run-test-ch5-CFO'; // matches `${runId}-${role}` convention

const SAMPLE_TOOL_CALL = {
  call_id:       'tc-sf-001',
  run_id:        SAMPLE_RUN_ID,
  invocation_id: SAMPLE_INV_ID,
  agent_role:    'CFO',
  tool_name:     'salesforce.committedPipelineQuery',
  args_json:     JSON.stringify({ stagesIn: ['Verbal Agreement', 'Contracting'], activeAm: true }),
  result_json:   JSON.stringify([
    { id: 'opp-001', name: 'Acme Renewal', amount: 120000, stageName: 'Contracting', closeDate: '2026-07-15' },
    { id: 'opp-002', name: 'Beta Corp New', amount: 85000,  stageName: 'Verbal Agreement', closeDate: '2026-06-30' },
  ]),
  source_id:     'sf-pipeline-2026-05-27',
  called_at:     1748304000, // 2026-05-27 00:00:00 UTC
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AC-7 — click-claim → tool-call result (Ch.5 Runtime RED)', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = seedFromMigrations();

    // Seed parent rows required by FK constraints (foreign_keys=ON).
    db.prepare(
      `INSERT INTO runs (run_id, playbook, question, started_at, current_state)
       VALUES (?, 'quick_read', 'Pipeline review', ?, 'fan-out')`
    ).run(SAMPLE_RUN_ID, Date.now());

    db.prepare(
      `INSERT INTO agent_invocations (invocation_id, run_id, agent_role, started_at, status)
       VALUES (?, ?, 'CFO', ?, 'completed')`
    ).run(SAMPLE_INV_ID, SAMPLE_RUN_ID, Date.now() - 5000);

    db.prepare(`
      INSERT INTO tool_calls
        (call_id, run_id, invocation_id, agent_role, tool_name, args_json, result_json, source_id, called_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      SAMPLE_TOOL_CALL.call_id,
      SAMPLE_TOOL_CALL.run_id,
      SAMPLE_TOOL_CALL.invocation_id,
      SAMPLE_TOOL_CALL.agent_role,
      SAMPLE_TOOL_CALL.tool_name,
      SAMPLE_TOOL_CALL.args_json,
      SAMPLE_TOOL_CALL.result_json,
      SAMPLE_TOOL_CALL.source_id,
      SAMPLE_TOOL_CALL.called_at,
    );
  });

  afterEach(() => {
    db.close();
  });

  // ── GREEN — schema tests using raw SQLite (no Runtime needed) ────────────

  it('tool_calls table accepts source_id column (prod schema via migrations)', () => {
    const row = db.prepare(
      'SELECT call_id, source_id FROM tool_calls WHERE source_id = ?'
    ).get('sf-pipeline-2026-05-27') as { call_id: string; source_id: string } | undefined;

    expect(row).toBeDefined();
    expect(row!.source_id).toBe('sf-pipeline-2026-05-27');
  });

  it('query by source_id returns tool_name, args_json, result_json, called_at', () => {
    const row = db.prepare(`
      SELECT result_json, tool_name, args_json, called_at
      FROM tool_calls
      WHERE source_id = ?
    `).get('sf-pipeline-2026-05-27') as {
      result_json: string;
      tool_name: string;
      args_json: string;
      called_at: number;
    } | undefined;

    expect(row).toBeDefined();
    expect(row!.tool_name).toBe('salesforce.committedPipelineQuery');
    expect(row!.args_json).toBeTruthy();
    expect(row!.result_json).toBeTruthy();
    expect(typeof row!.called_at).toBe('number');
  });

  it('result_json parses to array with expected opportunity shape', () => {
    const row = db.prepare(
      'SELECT result_json FROM tool_calls WHERE source_id = ?'
    ).get('sf-pipeline-2026-05-27') as { result_json: string } | undefined;

    const results = JSON.parse(row!.result_json) as Array<{
      id: string; name: string; amount: number; stageName: string;
    }>;
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]).toHaveProperty('id');
    expect(results[0]).toHaveProperty('amount');
    expect(typeof results[0].amount).toBe('number');
  });

  it('query returns null for unknown source_id (no phantom rows)', () => {
    const row = db.prepare(
      'SELECT * FROM tool_calls WHERE source_id = ?'
    ).get('nonexistent-source-id');
    expect(row).toBeUndefined();
  });

  // ── RED — runtime function tests ─────────────────────────────────────────

  it('queryToolCallBySourceId() returns correct row via runtime helper', () => {
    const result = queryToolCallBySourceId(db, 'sf-pipeline-2026-05-27');
    expect(result).not.toBeNull();
    expect(result!.tool_name).toBe('salesforce.committedPipelineQuery');
    expect(result!.result_json).toBeTruthy();
  });

  it.skip('RED: memo markdown [^sf-pipeline-2026-05-27] footnote renders as clickable citation badge — RTL integration (Ch.5 Audit/QA scope)', () => {
    // React Testing Library test — requires jsdom + @testing-library/react setup.
    // MemoViewer.tsx ships at apps/renderer/src/screens/MemoViewer.tsx.
    // The citation badge renders as a <button class="glass-badge--purple"> per AC-7.
    // Activate in Ch.5 Audit/QA once RTL + jsdom is wired in vitest.config.ts.
  });
});
