/**
 * ADR-0004 §8 row AC-6 — IPC event order for a single agent invocation
 * Test owner: Ch.3 Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0004-ch3-runtime-spine.md §3 + §8 AC-6
 *
 * STATUS: RED until Ch.3 Runtime ships.
 *
 * Spec intent: capture IPC events emitted during a single-lens dispatch through
 * the Claude Agent SDK hooks (SubagentStart, PreToolUse, PostToolUse, SubagentStop).
 * Assert order: agent.start → agent.tool.pre → agent.tool.post → agent.complete.
 * No event emitted out-of-order or duplicated.
 *
 * Hook names per ADR §3 (context7-verified):
 *   SubagentStart  → emits kind: 'agent.start'
 *   PreToolUse     → emits kind: 'agent.tool.pre'
 *   PostToolUse    → emits kind: 'agent.tool.post'
 *   SubagentStop   → emits kind: 'agent.complete'
 *
 * Test approach:
 *   - Inject a mock IPC capture sink (EventEmitter or simple array accumulator).
 *   - Call dispatchLens() with STUB_MODE=replay (no live inference).
 *   - Assert event sequence on the captured sink.
 *
 * Activating when Runtime ships:
 *   1. Uncomment the dispatchLens import.
 *   2. Uncomment the ipc mock inject import.
 *   3. Verify the IPC sink injection API — dispatchLens must accept an injectable
 *      ipcEmit: (msg: IpcMessage) => void for testability (or use vi.mock on the
 *      singleton ipc module).
 *   4. Ensure STUB_MODE=replay is set (vitest.config.ts already sets this).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type Database from 'better-sqlite3';
import { validateIpc, type IpcMessage } from '@c-suite/shared-types/ipc';
import { dispatchLens } from '../../apps/utility/src/orchestrator/dispatch.js';
import { seedFromMigrations } from '../helpers/seedFromMigrations.js';

// ── Expected IPC event order per ADR §3 ─────────────────────────────────────
const EXPECTED_EVENT_ORDER = [
  'agent.start',
  'agent.tool.pre',
  'agent.tool.post',
  'agent.complete',
] as const;

type IpcKind = (typeof EXPECTED_EVENT_ORDER)[number];

// ── SQLite setup ─────────────────────────────────────────────────────────────
// Schema comes from the production migrations (db/migrations/NNN_*.sql) via
// seedFromMigrations(), not a hand-rolled CREATE TABLE. The prior inline DDL had
// drifted from prod: agent_invocations used role/output_json/id (prod is
// agent_role/structured_output_json/invocation_id) and tool_calls used
// role/input_json/id (prod is agent_role/args_json/call_id). This test only writes
// to runs (a compatible subset of the real runs schema), so aligning the schema
// source is the fix; no INSERT or assertion changes.

// ── IPC capture sink (mock) ───────────────────────────────────────────────────

class IpcCaptureSink {
  private _events: IpcMessage[] = [];

  emit(msg: IpcMessage): void {
    this._events.push(msg);
  }

  get events(): readonly IpcMessage[] {
    return this._events;
  }

  kinds(): string[] {
    return this._events.map(e => e.kind);
  }

  clear(): void {
    this._events = [];
  }
}

// ── AC-6 Tests ────────────────────────────────────────────────────────────────

describe('AC-6: IPC event order for single-lens dispatch (ADR-0004 §3)', () => {
  const RUN_ID = 'ipc-order-test-001';

  let db: Database.Database;
  let sink: IpcCaptureSink;

  beforeEach(() => {
    db = seedFromMigrations();
    sink = new IpcCaptureSink();

    db.prepare(`
      INSERT INTO runs (run_id, playbook, question, started_at, current_state)
      VALUES (?, 'quick_read', 'IPC event order test', ?, 'fan-out')
    `).run(RUN_ID, Date.now());
  });

  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
  });

  it('dispatchLens is exported from orchestrator/dispatch', () => {
    // IPC event-order test (full dispatch with injectable IPC sink) stays RED until
    // the dispatch function accepts an injectable IpcEmit parameter (Ch.3 wiring).
    expect(typeof dispatchLens).toBe('function');
  });

  it('IpcCaptureSink accumulates messages in insertion order (sink infrastructure test)', () => {
    // This test passes now — validates the test infrastructure, not production code.
    const testMsg: IpcMessage = {
      kind: 'agent.start',
      payload: { runId: 'test', agentId: 'agent-1', role: 'CEO' },
    };

    // Validate IPC schema accepts agent.start
    expect(() => validateIpc(testMsg)).not.toThrow();

    sink.emit(testMsg);
    expect(sink.events).toHaveLength(1);
    expect(sink.kinds()).toEqual(['agent.start']);
  });

  it('EXPECTED_EVENT_ORDER matches IPC discriminated union kinds (schema alignment)', () => {
    // Verifies that each expected event kind is a valid IpcMessage variant.
    // These must exist in packages/shared-types/src/ipc.ts.
    const agentStart: IpcMessage = {
      kind: 'agent.start',
      payload: { runId: 'r1', agentId: 'a1', role: 'CEO' },
    };
    const agentToolPre: IpcMessage = {
      kind: 'agent.tool.pre',
      payload: { runId: 'r1', agentId: 'a1', tool: 'salesforce_query', args: {} },
    };
    const agentToolPost: IpcMessage = {
      kind: 'agent.tool.post',
      payload: { runId: 'r1', agentId: 'a1', tool: 'salesforce_query', result: {}, sourceId: 'src1', callId: 'call1' },
    };
    const agentComplete: IpcMessage = {
      kind: 'agent.complete',
      payload: { runId: 'r1', agentId: 'a1', role: 'CEO', structuredOutput: {} },
    };

    expect(() => validateIpc(agentStart)).not.toThrow();
    expect(() => validateIpc(agentToolPre)).not.toThrow();
    expect(() => validateIpc(agentToolPost)).not.toThrow();
    expect(() => validateIpc(agentComplete)).not.toThrow();
  });

  it.todo('emits events in order: agent.start → agent.tool.pre → agent.tool.post → agent.complete — blocked: dispatchLens injectable IpcEmit parameter not yet wired (Ch.3 Runtime)');

  it.todo('no event is emitted out-of-order or duplicated for a single-lens dispatch — blocked: dispatchLens injectable IpcEmit parameter not yet wired (Ch.3 Runtime)');

  it('documents expected hook → IPC kind mapping (ADR §3 reference)', () => {
    // Living documentation of the hook-to-IPC mapping per ADR §3.
    const hookToIpcKind: Record<string, IpcKind> = {
      SubagentStart: 'agent.start',
      PreToolUse:    'agent.tool.pre',
      PostToolUse:   'agent.tool.post',
      SubagentStop:  'agent.complete',
    };

    expect(Object.keys(hookToIpcKind)).toHaveLength(4);
    expect(Object.values(hookToIpcKind)).toEqual(expect.arrayContaining([...EXPECTED_EVENT_ORDER]));
  });
});
