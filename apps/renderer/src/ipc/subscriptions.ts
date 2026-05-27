// apps/renderer/src/ipc/subscriptions.ts
// Source: docs/decisions/0006-ch5-cash-lever-slice.md §4.2 + ADR §6
// IPC event subscription hooks for Ch.5 renderer screens.
// Typed event streams over window.ipc (exposed by preload.ts via contextBridge).

import { useEffect, useCallback, useRef } from 'react';
import type { IpcMessage } from '@c-suite/shared-types/ipc';

// ── IPC event type refinements for Ch.5 ──────────────────────────────────────

export interface AgentStartEvent {
  type: 'agent.start';
  agent: string;
  runId: string;
}

export interface AgentToolPreEvent {
  type: 'agent.tool.pre';
  agent: string;
  toolName: string;
  callId: string;
}

export interface AgentToolPostEvent {
  type: 'agent.tool.post';
  agent: string;
  callId: string;
  sourceId: string;
}

export interface AgentCompleteEvent {
  type: 'agent.complete';
  agent: string;
  runId: string;
}

export interface VerifierScoreEvent {
  type: 'verifier.score';
  score: number;
  status: 'clean' | 'draft';
  verifiedCount: number;
  totalCount: number;
  coveragePct: number;
  runId: string;
}

export type RunIpcEvent =
  | AgentStartEvent
  | AgentToolPreEvent
  | AgentToolPostEvent
  | AgentCompleteEvent
  | VerifierScoreEvent;

// ── Raw IPC event shape (pre-validation) ─────────────────────────────────────

type RawRunEvent = {
  type: string;
  [key: string]: unknown;
};

// ── Substance ribbon state (AC-9) ─────────────────────────────────────────────

export interface SubstanceRibbonState {
  /** null = display as em-dash (—); NEVER 0 before first tool.post */
  sources: number | null;
  /** null = display as —/— until verifier.score */
  verified: string | null;
  /** null = display as —% until verifier.score */
  coverage: string | null;
}

export function displaySources(state: SubstanceRibbonState): string {
  return state.sources === null ? '—' : String(state.sources);
}

export function displayVerified(state: SubstanceRibbonState): string {
  return state.verified ?? '—/—';
}

export function displayCoverage(state: SubstanceRibbonState): string {
  return state.coverage ?? '—%';
}

// ── useRunEvents hook ─────────────────────────────────────────────────────────

/**
 * Subscribe to run-related IPC events.
 * Calls onEvent for each event; returns cleanup.
 *
 * @param runId  The run ID to filter events for (or null to receive all run events)
 * @param onEvent  Callback invoked for each RunIpcEvent
 */
export function useRunEvents(
  runId: string | null,
  onEvent: (event: RunIpcEvent) => void,
): void {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ipc) return;

    const cleanup = window.ipc.on('ipc:run-event', (raw: unknown) => {
      const event = raw as RawRunEvent;
      if (!event || typeof event.type !== 'string') return;
      // Filter by runId if provided
      if (runId !== null && 'runId' in event && event.runId !== runId) return;
      onEventRef.current(event as unknown as RunIpcEvent);
    });

    return cleanup;
  }, [runId]);
}

/**
 * Subscribe to cost.usage IPC events pushed from main.
 * Returns the latest token usage state.
 */
export function useCostUsage(
  onUsage: (usage: { windowRemainingTokens: number; windowCap: number }) => void,
): void {
  const onUsageRef = useRef(onUsage);
  onUsageRef.current = onUsage;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ipc) return;

    const cleanup = window.ipc.on('ipc:message', (raw: unknown) => {
      const msg = raw as IpcMessage;
      if (msg?.kind === 'cost.usage') {
        onUsageRef.current({
          windowRemainingTokens: msg.payload.windowRemainingTokens,
          windowCap: 180_000, // scheduler window cap (ADR-0006 §3.3)
        });
      }
    });

    return cleanup;
  }, []);
}

/**
 * Invoke a tool-call query by source ID (AC-7 click-claim panel).
 * Returns the tool_calls row JSON or null if not found.
 */
export async function invokeToolCallGet(
  callId: string,
): Promise<{ tool_name: string; args_json: string; result_json: string; called_at: number } | null> {
  if (typeof window === 'undefined' || !window.ipc) return null;
  try {
    const result = await window.ipc.invoke('tool-call:get', { call_id: callId });
    return result as { tool_name: string; args_json: string; result_json: string; called_at: number } | null;
  } catch {
    return null;
  }
}

// Augment Window type for TypeScript (preload.ts contextBridge surface)
declare global {
  interface Window {
    ipc: {
      send: (msg: unknown) => void;
      on: (channel: string, listener: (...args: unknown[]) => void) => () => void;
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
    };
  }
}
