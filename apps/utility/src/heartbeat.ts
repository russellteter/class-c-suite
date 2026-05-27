// apps/utility/src/heartbeat.ts
// Source: docs/decisions/0002-ch1-process-architecture.md §7
// Heartbeat-only IPC relay (B34 mitigation).
// Throttles partial token events to 250ms intervals (max 4/sec per agent).
// Full structured output flows on agent.complete — one event per invocation.
// Heartbeats are best-effort; agent.complete is never dropped.

import type { IpcMessage } from '@c-suite/shared-types/ipc';
import { createLogger } from './logger.js';

const log = createLogger();

const HEARTBEAT_INTERVAL_MS = 250;
const BACKPRESSURE_TIMEOUT_MS = 2_000;  // drop heartbeat if renderer unresponsive >2s

export class HeartbeatEmitter {
  private lastEmit: Map<string, number> = new Map();    // agentId → ms epoch
  private readonly intervalMs = HEARTBEAT_INTERVAL_MS;
  private lastAckAt: number = Date.now();               // track renderer responsiveness

  /**
   * Returns true if enough time has elapsed since the last heartbeat for agentId.
   * First call for a new agentId always returns true.
   */
  shouldEmit(agentId: string): boolean {
    const last = this.lastEmit.get(agentId) ?? 0;
    return Date.now() - last >= this.intervalMs;
  }

  /**
   * Record that a heartbeat was emitted for agentId.
   * Call immediately after emitting.
   */
  record(agentId: string): void {
    this.lastEmit.set(agentId, Date.now());
  }

  /**
   * Record that the renderer acknowledged a message.
   * Used for backpressure detection.
   */
  recordAck(): void {
    this.lastAckAt = Date.now();
  }

  /**
   * Returns true if the renderer appears unresponsive (backpressure active).
   * Only applies to heartbeat events — critical events are never dropped.
   */
  isBackpressured(): boolean {
    return Date.now() - this.lastAckAt > BACKPRESSURE_TIMEOUT_MS;
  }

  /**
   * Clear heartbeat state for agentId (called when agent.complete fires).
   */
  clear(agentId: string): void {
    this.lastEmit.delete(agentId);
  }
}

/**
 * Emit a heartbeat IPC message if throttle and backpressure checks pass.
 * Returns true if the heartbeat was emitted, false if dropped.
 *
 * @param emitter    HeartbeatEmitter instance for this invocation context.
 * @param emitIpc    IPC send function (MessagePort.postMessage to main).
 * @param agentId    Agent identifier (spans utility + renderer for any agent event).
 * @param runId      Run identifier.
 * @param tokensSoFar Cumulative tokens received so far this invocation.
 * @param messageSnippet Optional ≤80 char snippet from latest partial text.
 */
export function emitHeartbeat(
  emitter: HeartbeatEmitter,
  emitIpc: (msg: IpcMessage) => void,
  agentId: string,
  runId: string,
  tokensSoFar: number,
  messageSnippet?: string,
): boolean {
  // Drop if renderer is backpressured (best-effort for heartbeats).
  if (emitter.isBackpressured()) {
    log.warn({ runId, agentId, message: 'heartbeat dropped — renderer backpressured' });
    return false;
  }

  // Throttle: skip if within 250ms of last emit.
  if (!emitter.shouldEmit(agentId)) {
    return false;
  }

  // Clamp snippet to 80 chars — NOT the full token text.
  const snippet = messageSnippet
    ? messageSnippet.slice(0, 80)
    : undefined;

  emitIpc({
    kind: 'agent.heartbeat',
    payload: {
      runId,
      agentId,
      tokensSoFar,
      ...(snippet !== undefined ? { messageSnippet: snippet } : {}),
    },
  });

  emitter.record(agentId);
  return true;
}

/**
 * Emit agent.complete — one event per invocation, never dropped.
 * Clears heartbeat state for the agent.
 *
 * @param emitter         HeartbeatEmitter instance.
 * @param emitIpc         IPC send function.
 * @param runId           Run identifier.
 * @param agentId         Agent identifier.
 * @param role            Agent role string.
 * @param structuredOutput Validated output per AgentDefinition.outputSchema.
 */
export function emitAgentComplete(
  emitter: HeartbeatEmitter,
  emitIpc: (msg: IpcMessage) => void,
  runId: string,
  agentId: string,
  role: string,
  structuredOutput: unknown,
): void {
  emitter.clear(agentId);

  // Validate role against AgentRole union — use string cast for Ch.1 (full check Ch.3).
  const validRole = role as IpcMessage extends { kind: 'agent.complete'; payload: { role: infer R } } ? R : string;

  emitIpc({
    kind: 'agent.complete',
    payload: {
      runId,
      agentId,
      role: validRole as Parameters<typeof emitIpc>[0] extends { kind: 'agent.complete'; payload: { role: infer R } } ? R : never,
      structuredOutput,
    },
  });

  log.info({ runId, agentId, role, message: 'agent.complete emitted' });
}
