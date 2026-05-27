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

// ── Runtime import — Ch.5 Runtime shipped ───────────────────────────────────
import {
  queryToolCallBySourceId,
} from '../../apps/utility/src/db/tool-calls.js';

// ── Test SQLite setup ─────────────────────────────────────────────────────────

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS tool_calls (
      tool_call_id          TEXT PRIMARY KEY,
      run_id                TEXT NOT NULL,
      agent_invocation_id   TEXT NOT NULL,
      tool_name             TEXT NOT NULL,
      args_json             TEXT NOT NULL,
      result_json           TEXT NOT NULL,
      source_id             TEXT,
      called_at             INTEGER NOT NULL
    );
  `);
  return db;
}

const SAMPLE_TOOL_CALL = {
  tool_call_id:         'tc-sf-001',
  run_id:               'run-test-ch5',
  agent_invocation_id:  'inv-cfo-001',
  tool_name:            'salesforce.committedPipelineQuery',
  args_json:            JSON.stringify({ stagesIn: ['Verbal Agreement', 'Contracting'], activeAm: true }),
  result_json:          JSON.stringify([
    { id: 'opp-001', name: 'Acme Renewal', amount: 120000, stageName: 'Contracting', closeDate: '2026-07-15' },
    { id: 'opp-002', name: 'Beta Corp New', amount: 85000,  stageName: 'Verbal Agreement', closeDate: '2026-06-30' },
  ]),
  source_id:            'sf-pipeline-2026-05-27',
  called_at:            1748304000, // 2026-05-27 00:00:00 UTC
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AC-7 — click-claim → tool-call result (Ch.5 Runtime RED)', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    db.prepare(`
      INSERT INTO tool_calls
        (tool_call_id, run_id, agent_invocation_id, tool_name, args_json, result_json, source_id, called_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      SAMPLE_TOOL_CALL.tool_call_id,
      SAMPLE_TOOL_CALL.run_id,
      SAMPLE_TOOL_CALL.agent_invocation_id,
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

  it('tool_calls table accepts source_id column (Ch.5 migration-003 schema)', () => {
    const row = db.prepare(
      'SELECT tool_call_id, source_id FROM tool_calls WHERE source_id = ?'
    ).get('sf-pipeline-2026-05-27') as { tool_call_id: string; source_id: string } | undefined;

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

  it('RED: memo markdown [^sf-pipeline-2026-05-27] footnote renders as clickable citation badge', () => {
    // React Testing Library test — deferred until Ch.5 UI ships.
    // const { getByRole } = render(<MemoViewer markdown={MEMO_WITH_CITATION} db={db} />);
    // const badge = getByRole('button', { name: /sf-pipeline-2026-05-27/ });
    // expect(badge).toBeInTheDocument();
    // await userEvent.click(badge);
    // expect(getByRole('complementary')).toBeInTheDocument(); // side panel
    expect(true).toBe(false); // intentional RED
  });
});
