/**
 * EXPECTED-RED: orchestrator hooks — tool_calls persistence bug exposure (P0).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS TEST IS EXPECTED TO FAIL RIGHT NOW. It is the failing test that Phase 1
 * will make pass by fixing hooks.ts. Do NOT fix hooks.ts in this file's PR.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The bug (apps/utility/src/orchestrator/hooks.ts onPostToolUse, ~line 142):
 *   INSERT INTO tool_calls (run_id, role, tool_name, input_json, result_json, ts) ...
 * Those are TEST-schema column names. The PRODUCTION schema (db/migrations/001_initial.sql
 * lines 47-58) is:
 *   tool_calls(call_id PK NOT NULL, run_id, invocation_id NOT NULL FK,
 *              agent_role NOT NULL, tool_name NOT NULL, args_json NOT NULL,
 *              result_json, source_id, called_at NOT NULL, duration_ms)
 * The INSERT references columns role / input_json / ts that do not exist, and omits
 * the NOT-NULL columns call_id / invocation_id / agent_role / args_json / called_at.
 * Against the migration-seeded (production) schema it throws a SqliteError. No
 * tool_calls row is ever persisted, so the Verifier's tool-call audit trail is
 * permanently empty in production.
 *
 * Schema seeded via seedFromMigrations() — never hand-rolled. foreign_keys is ON.
 * onSubagentStart is invoked first so the parent agent_invocations row
 * (invocation_id = `${runId}-${role}`, hooks.ts:98) exists for the FK that Phase 1's
 * corrected INSERT must populate.
 *
 * EXPECTED RESULT TODAY: this test FAILS at the onPostToolUse call with
 *   "SqliteError: table tool_calls has no column named role".
 * AFTER Phase 1 fixes the INSERT to the production columns: this test PASSES with
 * no edit to the test (it does not pin call_id format — Phase 1 chooses that).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createHooks } from '../../apps/utility/src/orchestrator/hooks.js';
import { seedFromMigrations } from '../helpers/seedFromMigrations.js';
import type { IpcMessage } from '@c-suite/shared-types/ipc';

function seedRun(db: Database.Database, runId: string): void {
  db.prepare(
    `INSERT INTO runs (run_id, playbook, question, started_at, current_state)
     VALUES (?, 'quick_read', 'Test question', ?, 'lenses')`,
  ).run(runId, Date.now());
}

describe('orchestrator hooks — tool_calls persistence (EXPECTED-RED until Phase 1 fixes hooks.ts)', () => {
  let db: Database.Database;
  const captured: IpcMessage[] = [];
  const ipcEmit = (msg: IpcMessage): void => {
    captured.push(msg);
  };

  beforeEach(() => {
    db = seedFromMigrations();
    captured.length = 0;
  });

  afterEach(() => {
    db.close();
  });

  it('onPostToolUse persists a tool_calls row against the production schema', async () => {
    const runId = 'tc-persist';
    seedRun(db, runId);
    const { onSubagentStart, onPostToolUse } = createHooks({ runId, role: 'CEO', db, ipcEmit });

    // Establish the parent invocation row so the tool_calls FK has a target.
    await onSubagentStart(
      { hook_event_name: 'SubagentStart', agent_id: 'agent-xyz', agent_type: 'CEO' },
      'tool-use-0',
      {},
    );

    // No try/catch: the current hooks.ts INSERT throws a SqliteError here
    // (unknown column `role`), which surfaces as the test failure — the documented bug.
    await onPostToolUse(
      {
        hook_event_name: 'PostToolUse',
        tool_name: 'mcp__salesforce__run_soql_query',
        tool_input: { query: 'SELECT Id FROM Account LIMIT 1' },
        tool_response: { records: [{ Id: '001xx' }] },
      },
      'tool-use-1',
      {},
    );

    const row = db
      .prepare(
        `SELECT run_id, invocation_id, agent_role, tool_name, args_json, result_json FROM tool_calls WHERE run_id = ?`,
      )
      .get(runId) as
      | {
          run_id: string;
          invocation_id: string;
          agent_role: string;
          tool_name: string;
          args_json: string;
          result_json: string | null;
        }
      | undefined;

    expect(row).toBeDefined();
    expect(row!.run_id).toBe(runId);
    expect(row!.agent_role).toBe('CEO');
    expect(row!.tool_name).toBe('mcp__salesforce__run_soql_query');
    // args_json round-trips the tool input.
    expect(JSON.parse(row!.args_json)).toEqual({ query: 'SELECT Id FROM Account LIMIT 1' });
    // FK references the deterministic invocation id created by onSubagentStart.
    expect(row!.invocation_id).toBe(`${runId}-CEO`);
  });
});
