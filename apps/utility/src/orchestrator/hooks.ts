// apps/utility/src/orchestrator/hooks.ts
// Source: docs/decisions/0004-ch3-runtime-spine.md §3
// Claude Agent SDK hook handlers: SubagentStart, PreToolUse, PostToolUse, SubagentStop.
import type Database from 'better-sqlite3';
import type { AgentRole } from '@c-suite/shared-types/agent-definition';
import type { IpcMessage } from '@c-suite/shared-types/ipc';
import { AGENT_REGISTRY } from '../agents/registry.js';

// ── Hook input type stubs (BaseHookInput U-1 UNKNOWN — provisional shape) ─────

export interface BaseHookInput {
  hook_event_name: string;
  session_id?: string;
  transcript_item_id?: string;
}

export interface SubagentStartHookInput extends BaseHookInput {
  hook_event_name: 'SubagentStart';
  agent_id: string;
  agent_type: string;
}

export interface PreToolUseHookInput extends BaseHookInput {
  hook_event_name: 'PreToolUse';
  tool_name: string;
  tool_input: unknown;
}

export interface PostToolUseHookInput extends BaseHookInput {
  hook_event_name: 'PostToolUse';
  tool_name: string;
  tool_input: unknown;
  tool_response: unknown;
}

export interface SubagentStopHookInput extends BaseHookInput {
  hook_event_name: 'SubagentStop';
  stop_hook_active: boolean;
}

// ── IPC emitter type ──────────────────────────────────────────────────────────

export type IpcEmit = (msg: IpcMessage) => void;

// ── Error types ───────────────────────────────────────────────────────────────

export class ToolAllowlistViolation extends Error {
  constructor(public readonly role: AgentRole, public readonly tool: string) {
    super(`ToolAllowlistViolation: agent '${role}' attempted unauthorized tool '${tool}'`);
    this.name = 'ToolAllowlistViolation';
  }
}

export class AgentOutputSchemaViolation extends Error {
  constructor(public readonly role: AgentRole, public readonly issues: unknown) {
    super(`AgentOutputSchemaViolation: agent '${role}' output did not match outputSchema`);
    this.name = 'AgentOutputSchemaViolation';
  }
}

// ── Hook context ──────────────────────────────────────────────────────────────

export interface HookContext {
  runId: string;
  role: AgentRole;
  db: Database.Database;
  ipcEmit: IpcEmit;
}

export type HookCallback = (input: unknown, toolUseId: string, ctx: { signal?: AbortSignal }) => Promise<Record<string, unknown>>;

/**
 * Creates the 4 SDK hooks for a single agent invocation.
 * All hooks are bound to the specific runId, role, db, and ipcEmit for this invocation.
 */
export function createHooks(ctx: HookContext): {
  onSubagentStart: HookCallback;
  onPreToolUse: HookCallback;
  onPostToolUse: HookCallback;
  onSubagentStop: (rawOutput: unknown) => Promise<unknown>;
} {
  const { runId, role, db, ipcEmit } = ctx;

  const onSubagentStart: HookCallback = async (input, _toolUseId, _ctx) => {
    const evt = input as SubagentStartHookInput;
    const agentId = evt.agent_id ?? `${role}-${Date.now()}`;

    ipcEmit({
      kind: 'agent.start',
      payload: { runId, agentId, role },
    });

    // Production schema (migration 001): invocation_id PK NOT NULL, column agent_role.
    // Deterministic id (runId-role) so the deferred tool_calls FK can reference it.
    db.prepare(
      `INSERT OR IGNORE INTO agent_invocations (invocation_id, run_id, agent_role, started_at, status)
       VALUES (?, ?, ?, unixepoch(), 'in_progress')`
    ).run(`${runId}-${role}`, runId, role);

    return {};
  };

  const onPreToolUse: HookCallback = async (input, toolUseId, _ctx) => {
    const evt = input as PreToolUseHookInput;

    ipcEmit({
      kind: 'agent.tool.pre',
      payload: {
        runId,
        agentId: `${role}-${toolUseId}`,
        tool: evt.tool_name,
        args: evt.tool_input,
      },
    });

    // Validate tool is in agent's allowlist
    const def = AGENT_REGISTRY[role];
    if (def.toolAllowlist.length > 0 && !def.toolAllowlist.includes(evt.tool_name)) {
      throw new ToolAllowlistViolation(role, evt.tool_name);
    }

    return {};
  };

  const onPostToolUse: HookCallback = async (input, toolUseId, _ctx) => {
    const evt = input as PostToolUseHookInput;
    const callId = `${role}-${toolUseId}`;

    ipcEmit({
      kind: 'agent.tool.post',
      payload: {
        runId,
        agentId: callId,
        tool: evt.tool_name,
        result: evt.tool_response,
        sourceId: role,
        callId,
      },
    });

    // Insert tool_calls row — full audit trail (B3 requirement)
    // Production schema: db/migrations/001_initial.sql lines 47-58.
    // call_id = `${role}-${toolUseId}` (deterministic, matches callId in IPC payload).
    // invocation_id = `${runId}-${role}` — the deterministic id onSubagentStart inserts.
    db.prepare(
      `INSERT INTO tool_calls (call_id, run_id, invocation_id, agent_role, tool_name, args_json, result_json, source_id, called_at)
       VALUES (?, ?, ?, ?, ?, json(?), json(?), ?, unixepoch())`
    ).run(
      callId,
      runId,
      `${runId}-${role}`,
      role,
      evt.tool_name,
      JSON.stringify(evt.tool_input),
      JSON.stringify(evt.tool_response),
      role,
    );

    return {};
  };

  // onSubagentStop: parses output via outputSchema, writes to agent_invocations checkpoint
  const onSubagentStop = async (rawOutput: unknown): Promise<unknown> => {
    const def = AGENT_REGISTRY[role];
    const parseResult = def.outputSchema.safeParse(rawOutput);

    const agentId = `${role}-done`;

    if (!parseResult.success) {
      ipcEmit({
        kind: 'agent.complete',
        payload: { runId, agentId, role, structuredOutput: null },
      });
      throw new AgentOutputSchemaViolation(role, (parseResult.error as { issues?: unknown })?.issues ?? parseResult.error);
    }

    // Write to agent_invocations BEFORE transitioning state (checkpoint ordering ADR §7.1)
    db.prepare(
      `UPDATE agent_invocations
       SET status = 'completed', structured_output_json = json(?), completed_at = unixepoch()
       WHERE run_id = ? AND agent_role = ?`
    ).run(JSON.stringify(parseResult.data), runId, role);

    ipcEmit({
      kind: 'agent.complete',
      payload: { runId, agentId, role, structuredOutput: parseResult.data },
    });

    return parseResult.data;
  };

  return { onSubagentStart, onPreToolUse, onPostToolUse, onSubagentStop };
}
