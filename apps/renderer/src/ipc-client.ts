// apps/renderer/src/ipc-client.ts
// Source: docs/decisions/0002-ch1-process-architecture.md §1.5
// Typed facade over window.ipc (exposed by preload.ts via contextBridge).
// Validates outbound messages via validateIpc(); renderer never imports ipcRenderer.

import { validateIpc, type IpcMessage } from '@c-suite/shared-types/ipc';

// Type declaration for the contextBridge surface.
declare global {
  interface Window {
    ipc: {
      send: (msg: unknown) => void;
      on: (channel: string, listener: (...args: unknown[]) => void) => () => void;
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
    };
  }
}

/**
 * Send a validated IPC message to the main process.
 * Throws if the message does not conform to the IpcMessage union.
 */
export function sendIpc(msg: IpcMessage): void {
  validateIpc(msg);   // throws on invalid — protects the IPC channel
  window.ipc.send(msg);
}

/**
 * Subscribe to IPC events pushed from main.
 * Returns a cleanup function — call it to remove the listener.
 */
export function onIpc(listener: (msg: IpcMessage) => void): () => void {
  return window.ipc.on('ipc:message', (raw) => {
    try {
      const msg = validateIpc(raw);
      listener(msg);
    } catch {
      // Invalid message from main — log and drop.
      console.warn('[ipc-client] invalid IPC message received, dropping', raw);
    }
  });
}

/**
 * Request-response invoke — for queries like runs:list, runs:get.
 */
export function invokeIpc<T = unknown>(channel: string, ...args: unknown[]): Promise<T> {
  return window.ipc.invoke(channel, ...args) as Promise<T>;
}

/**
 * Relay a renderer log entry to main for consolidated logging (ADR §8.3).
 * This uses __internal.log which is outside the typed IpcMessage union.
 */
export function relayLog(entry: {
  ts: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  runId?: string;
  agentId?: string;
  message: string;
  [key: string]: unknown;
}): void {
  window.ipc.send({ kind: '__internal.log', payload: { ...entry, process: 'renderer' } });
}
