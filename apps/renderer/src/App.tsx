// apps/renderer/src/App.tsx
// Source: docs/decisions/0002-ch1-process-architecture.md §1
// Ch.6: adds state-based routing for WritebackPane, ConversationPane, AcceptedHistory.
// WritebackPane lands as the primary writeback screen; ConversationPane opens on demand;
// AcceptedHistory is accessible via test route (?screen=history&artifactId=...) per brief.
// Original Ch.1 token-usage display preserved in home screen.

import React, { useEffect, useState } from 'react';
import { onIpc } from './ipc-client.js';
import type { IpcMessage } from '@c-suite/shared-types/ipc';
import type { WritebackDraft } from '@c-suite/shared-types/writeback';
import { WritebackPane } from './screens/WritebackPane.js';
import { ConversationPane } from './screens/ConversationPane.js';
import { AcceptedHistory } from './screens/AcceptedHistory.js';

// ---- Screen routing -------------------------------------------------------

type Screen =
  | { name: 'home' }
  | { name: 'writeback' }
  | { name: 'conversation'; writebackId: string; draft: WritebackDraft | null }
  | { name: 'history'; artifactId: string };

function initialScreen(): Screen {
  // Allow test navigation via URL query params (brief §Wiring: "openable via a test route")
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const screen = params.get('screen');
    if (screen === 'writeback') return { name: 'writeback' };
    if (screen === 'conversation') {
      const id = params.get('writebackId') ?? 'UNKNOWN';
      return { name: 'conversation', writebackId: id, draft: null };
    }
    if (screen === 'history') {
      const artifactId = params.get('artifactId') ?? 'UNKNOWN';
      return { name: 'history', artifactId };
    }
  }
  return { name: 'home' };
}

// ---- Token usage display (original Ch.1 component) -----------------------

interface TokenUsageState {
  windowRemainingTokens: number | null;
  windowResetsAt: number | null;
  totalCostUsdReference: number | null;
}

function HomeScreen(): React.ReactElement {
  const [usage, setUsage] = useState<TokenUsageState>({
    windowRemainingTokens: null,
    windowResetsAt: null,
    totalCostUsdReference: null,
  });
  const [status, setStatus] = useState<string>('initializing');

  useEffect(() => {
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
        setUsage((prev) => ({
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

// ---- Root component -------------------------------------------------------

export function App(): React.ReactElement {
  const [screen, setScreen] = useState<Screen>(initialScreen);

  const navigateTo = (next: Screen) => setScreen(next);

  switch (screen.name) {
    case 'writeback':
      return (
        <WritebackPane
          onOpenConversation={(writebackId) =>
            navigateTo({ name: 'conversation', writebackId, draft: null })
          }
        />
      );

    case 'conversation':
      return (
        <ConversationPane
          writebackId={screen.writebackId}
          draft={screen.draft}
          onBack={() => navigateTo({ name: 'writeback' })}
        />
      );

    case 'history':
      return (
        <AcceptedHistory
          artifactId={screen.artifactId}
          onBack={() => navigateTo({ name: 'home' })}
        />
      );

    case 'home':
    default:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <HomeScreen />
          {/* Dev nav — visible only in non-production for screen testing */}
          {process.env.NODE_ENV !== 'production' && (
            <div style={{ position: 'fixed', bottom: 12, right: 12, display: 'flex', gap: 8 }}>
              <button
                onClick={() => navigateTo({ name: 'writeback' })}
                style={{ fontSize: 11, padding: '2px 8px', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 4, cursor: 'pointer' }}
              >
                WritebackPane
              </button>
              <button
                onClick={() => navigateTo({ name: 'history', artifactId: 'POS-001' })}
                style={{ fontSize: 11, padding: '2px 8px', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 4, cursor: 'pointer' }}
              >
                AcceptedHistory
              </button>
            </div>
          )}
        </div>
      );
  }
}
