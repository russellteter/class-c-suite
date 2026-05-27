// apps/renderer/src/App.tsx
// Source: docs/decisions/0002-ch1-process-architecture.md §1
// Placeholder root component for Ch.1. Real screens ship in Ch.5.
// Subscribes to cost.usage events and shows a window-remaining counter.

import React, { useEffect, useState } from 'react';
import { onIpc } from './ipc-client.js';
import type { IpcMessage } from '@c-suite/shared-types/ipc';

interface TokenUsageState {
  windowRemainingTokens: number | null;
  windowResetsAt: number | null;
  totalCostUsdReference: number | null;
}

export function App(): React.ReactElement {
  const [usage, setUsage] = useState<TokenUsageState>({
    windowRemainingTokens: null,
    windowResetsAt: null,
    totalCostUsdReference: null,
  });

  const [status, setStatus] = useState<string>('initializing');

  useEffect(() => {
    // Subscribe to IPC events from main.
    const cleanup = onIpc((msg: IpcMessage) => {
      if (msg.kind === 'cost.usage') {
        setUsage({
          windowRemainingTokens: msg.payload.windowRemainingTokens,
          windowResetsAt: msg.payload.windowResetsAt,
          totalCostUsdReference: msg.payload.totalCostUsdReference ?? null,
        });
      }

      if (msg.kind === 'run.start') {
        setStatus(`run active: ${msg.payload.runId}`);
      }

      if (msg.kind === 'run.failed') {
        setStatus(`failed: ${msg.payload.reason}`);
      }

      if (msg.kind === 'scheduler.window.reset') {
        setUsage(prev => ({
          ...prev,
          windowRemainingTokens: msg.payload.newWindowCap,
          windowResetsAt: msg.payload.resetAt + 5 * 60 * 60 * 1000,
        }));
      }
    });

    return cleanup;
  }, []);

  const resetsAt = usage.windowResetsAt
    ? new Date(usage.windowResetsAt).toLocaleTimeString()
    : 'unknown';

  return (
    <div style={{ fontFamily: 'monospace', padding: '24px', color: '#e5e7eb', background: '#111827', minHeight: '100vh' }}>
      <h1>C-Suite</h1>
      <p>Ch.1 runtime ready</p>
      <hr />
      <p>Status: {status}</p>
      {usage.windowRemainingTokens !== null && (
        <p>
          Window remaining: {usage.windowRemainingTokens.toLocaleString()} tokens
          (resets {resetsAt})
        </p>
      )}
      {usage.totalCostUsdReference !== null && (
        <p>
          Cost reference: ${usage.totalCostUsdReference.toFixed(4)} (API-equivalent, not subscription credits)
        </p>
      )}
    </div>
  );
}
