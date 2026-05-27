// apps/utility/src/db/tool-calls.ts
// Source: docs/decisions/0006-ch5-cash-lever-slice.md §5.2 (click-claim → tool-call result)
// AC-7: queryToolCallBySourceId — fetches tool_call row from SQLite by source_id.
//
// Ch.5 adds source_id column to tool_calls (migration-003).
// Each tool call that produces a memo citation gets a source_id that matches the
// footnote format: [^sf-pipeline-2026-05-27], [^ns-cash-2026-05-27], etc.

import type Database from 'better-sqlite3';

/** Full tool_calls row shape returned by queryToolCallBySourceId */
export interface ToolCallRow {
  tool_call_id: string;
  run_id: string;
  agent_invocation_id: string;
  tool_name: string;
  args_json: string;
  result_json: string;
  source_id: string | null;
  called_at: number;
}

/**
 * Query a tool_call row by its source_id.
 * Used by the memo viewer click-claim panel to show raw tool-call results.
 *
 * SQLite query (ADR-0006 §5.2):
 *   SELECT result_json, tool_name, tool_args, completed_at
 *   FROM tool_calls WHERE source_id = ?
 *
 * @param db   SQLite database handle (in-process or injected for tests)
 * @param sourceId  The footnote source ID from the memo markdown (e.g., 'sf-pipeline-2026-05-27')
 * @returns    ToolCallRow or null if not found
 */
export function queryToolCallBySourceId(
  db: Database.Database,
  sourceId: string,
): ToolCallRow | null {
  const row = db.prepare(`
    SELECT tool_call_id, run_id, agent_invocation_id, tool_name,
           args_json, result_json, source_id, called_at
    FROM tool_calls
    WHERE source_id = ?
  `).get(sourceId) as ToolCallRow | undefined;

  return row ?? null;
}

/**
 * Insert a tool_call row with a source_id.
 * Called by the cash lever orchestration layer after each MCP call completes.
 *
 * @param db          SQLite database handle
 * @param toolCall    Tool call data to persist
 */
export function insertToolCall(
  db: Database.Database,
  toolCall: Omit<ToolCallRow, 'called_at'> & { called_at?: number },
): void {
  db.prepare(`
    INSERT INTO tool_calls
      (tool_call_id, run_id, agent_invocation_id, tool_name, args_json, result_json, source_id, called_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    toolCall.tool_call_id,
    toolCall.run_id,
    toolCall.agent_invocation_id,
    toolCall.tool_name,
    toolCall.args_json,
    toolCall.result_json,
    toolCall.source_id ?? null,
    toolCall.called_at ?? Math.floor(Date.now() / 1000),
  );
}
