// apps/main/src/preload.ts
// Source: docs/decisions/0002-ch1-process-architecture.md §1.5
// Minimum IPC surface exposed to renderer. Does NOT expose ipcRenderer directly.
// contextIsolation: true is LOCKED — enforced by BrowserWindow config in window.ts.

import { contextBridge, ipcRenderer } from 'electron';

// MINIMUM surface — only what the renderer needs.
contextBridge.exposeInMainWorld('ipc', {
  // Send a run-initiation message to main.
  send: (msg: unknown) => ipcRenderer.send('ipc:message', msg),

  // Subscribe to events pushed by main (run state, agent events, scheduler events).
  // Returns a cleanup function.
  on: (channel: string, listener: (...args: unknown[]) => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, ...args: unknown[]) =>
      listener(...args);
    ipcRenderer.on(channel, wrapped);
    return () => ipcRenderer.removeListener(channel, wrapped);
  },

  // Invoke (request-response) — used for queries like getSchedulerState, getRunHistory.
  invoke: (channel: string, ...args: unknown[]) =>
    ipcRenderer.invoke(channel, ...args),
});
