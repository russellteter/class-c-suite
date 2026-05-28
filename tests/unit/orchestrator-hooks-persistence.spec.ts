/**
 * Orchestrator hook persistence — agent_invocations lifecycle (P0 coverage gap).
 *
 * These paths had ZERO test coverage and shipped P0 bugs. This file locks the
 * recently-fixed column names so a regression to role/output_json re-breaks the
 * test instead of silently re-breaking production.
 *
 * Source under test: apps/utility/src/orchestrator/hooks.ts
 *   - createHooks().onSubagentStart  → INSERT OR IGNORE INTO agent_invocations
 *       (invocation_id, run_id, agent_role, started_at, status='in_progress')
 *   - createHooks().onSubagentStop   → UPDATE agent_invocations
 *       SET status='completed', structured_output_json, completed_at
 *
 * Schema is seeded via seedFromMigrations() (db/migrations/001_initial.sql) —
 * never hand-rolled. foreign_keys is ON, so a parent runs row is required before
 * any agent_invocations insert; each test seeds one first.
 *
 * STATUS: GREEN. If this goes red, hooks.ts INSERT/UPDATE column names drifted
 * back to the pre-fix shape (role / output_json) and no longer match migration 001.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createHooks } from '../../apps/utility/src/orchestrator/hooks.js';
import { seedFromMigrations } from '../helpers/seedFromMigrations.js';
import type { IpcMessage } from '@c-suite/shared-types/ipc';

// A valid CEO LensOutput (BaseLensOutputSchema shape, mirrors verifier-contract.spec
// seedLensOutput). onSubagentStop runs this through AGENT_REGISTRY.CEO.outputSchema —
// an invalid object would throw AgentOutputSchemaViolation and the UPDATE would never fire.
function validCeoOutput(runId: string): Record<string, unknown> {
  return {
    role: 'CEO',
    runId,
    summary: 'CEO summary of the strategic question.',
    positions: [
      { positionId: 'p-CEO', claim: 'Expand to Europe', isQuantitative: false, citations: [], sourceText: 'analysis' },
    ],
    citations: [{ id: 'c-CEO', text: 'Q3 Report', source: 'https://example.com' }],
    confidence: 0.8,
  };
}

function seedRun(db: Database.Database, runId: string): void {
  db.prepare(
    `INSERT INTO runs (run_id, playbook, question, started_at, current_state)
     VALUES (?, 'quick_read', 'Test question', ?, 'lenses')`,
  ).run(runId, Date.now());
}

describe('orchestrator hooks — agent_invocations persistence (hooks.ts)', () => {
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

  it('onSubagentStart INSERTs an agent_invocations row with agent_role populated', async () => {
    const runId = 'hk-start';
    seedRun(db, runId);
    const { onSubagentStart } = createHooks({ runId, role: 'CEO', db, ipcEmit });

    await onSubagentStart(
      { hook_event_name: 'SubagentStart', agent_id: 'agent-xyz', agent_type: 'CEO' },
      'tool-use-0',
      {},
    );

    const row = db
      .prepare(`SELECT invocation_id, run_id, agent_role, status FROM agent_invocations WHERE run_id = ?`)
      .get(runId) as
      | { invocation_id: string; run_id: string; agent_role: string; status: string }
      | undefined;

    expect(row).toBeDefined();
    // Deterministic id (runId-role) — hooks.ts:98. The deferred tool_calls FK references this.
    expect(row!.invocation_id).toBe(`${runId}-CEO`);
    // Locks the role → agent_role column fix (migration 001 column is agent_role, not role).
    expect(row!.agent_role).toBe('CEO');
    expect(row!.status).toBe('in_progress');
  });

  it('onSubagentStop UPDATEs the row to completed with structured_output_json populated', async () => {
    const runId = 'hk-stop';
    seedRun(db, runId);
    const { onSubagentStart, onSubagentStop } = createHooks({ runId, role: 'CEO', db, ipcEmit });

    await onSubagentStart(
      { hook_event_name: 'SubagentStart', agent_id: 'agent-xyz', agent_type: 'CEO' },
      'tool-use-0',
      {},
    );

    const output = validCeoOutput(runId);
    const parsed = await onSubagentStop(output);

    // onSubagentStop returns the schema-parsed data
    expect((parsed as { role: string }).role).toBe('CEO');

    const row = db
      .prepare(
        `SELECT status, completed_at, structured_output_json FROM agent_invocations WHERE run_id = ? AND agent_role = 'CEO'`,
      )
      .get(runId) as
      | { status: string; completed_at: number | null; structured_output_json: string | null }
      | undefined;

    expect(row).toBeDefined();
    expect(row!.status).toBe('completed');
    expect(row!.completed_at).toBeTypeOf('number');
    // Locks the output_json → structured_output_json column fix.
    expect(row!.structured_output_json).not.toBeNull();
    const stored = JSON.parse(row!.structured_output_json!) as { role: string; summary: string };
    expect(stored.role).toBe('CEO');
    expect(stored.summary).toBe(output.summary);
  });
});
