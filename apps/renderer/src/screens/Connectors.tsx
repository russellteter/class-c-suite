// apps/renderer/src/screens/Connectors.tsx
// Source: docs/decisions/0015-netsuite-oauth-migration.md §3
//
// Settings → Connectors. First-launch OAuth UX for MCP connectors.
// NetSuite (TRACK 3): "Connect" opens the default browser to the NetSuite authorize
// URL; the utility's local loopback listener (fixed port 8765) captures the redirect,
// exchanges the code for tokens, and persists them. On success the row shows "Connected".
//
// Styling is intentionally minimal/structural — TRACK 6 (design overhaul) restyles this.
// IPC channel 'connector.netsuite.connect' is handled by main→utility (TODO wiring);
// the screen degrades gracefully when window.ipc is absent (e.g. in tests).

import React, { useEffect, useState, useCallback } from 'react';
import '../design/tokens.css';

type ConnState = 'unknown' | 'connected' | 'disconnected' | 'connecting' | 'error';

interface ConnectorRowProps {
  id: string;
  label: string;
  description: string;
  state: ConnState;
  detail?: string;
  onConnect: () => void;
}

function statusText(state: ConnState, detail?: string): string {
  switch (state) {
    case 'connected': return detail ? `Connected as ${detail}` : 'Connected';
    case 'connecting': return 'Connecting… complete consent in your browser';
    case 'disconnected': return 'Not connected';
    case 'error': return detail ? `Error: ${detail}` : 'Connection failed';
    default: return 'Status unknown';
  }
}

function ConnectorRow({ id, label, description, state, detail, onConnect }: ConnectorRowProps): React.ReactElement {
  const connected = state === 'connected';
  return (
    <div
      data-testid={`connector-row-${id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        padding: 'var(--space-3) var(--space-4)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--space-3)',
        background: 'var(--color-surface-1)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>{label}</div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{description}</div>
        <div
          data-testid={`connector-status-${id}`}
          style={{ fontSize: 'var(--text-xs)', color: connected ? 'var(--color-success)' : 'var(--color-text-muted)', marginTop: 2 }}
        >
          {statusText(state, detail)}
        </div>
      </div>
      <button
        type="button"
        data-testid={`connector-connect-${id}`}
        onClick={onConnect}
        disabled={state === 'connecting'}
        style={{
          fontSize: 'var(--text-sm)',
          padding: '6px 14px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--color-border)',
          background: connected ? 'var(--color-surface-2)' : 'var(--color-accent, #2563eb)',
          color: connected ? 'var(--color-text-primary)' : '#fff',
          cursor: state === 'connecting' ? 'default' : 'pointer',
          flexShrink: 0,
        }}
      >
        {connected ? 'Reconnect' : 'Connect'}
      </button>
    </div>
  );
}

export interface ConnectorsProps {
  onBack?: () => void;
  /** Inject NetSuite state (tests). */
  initialNetsuiteState?: ConnState;
}

export function Connectors({ onBack, initialNetsuiteState = 'unknown' }: ConnectorsProps): React.ReactElement {
  const [nsState, setNsState] = useState<ConnState>(initialNetsuiteState);
  const [nsDetail, setNsDetail] = useState<string | undefined>(undefined);

  // Load current NetSuite connection status on mount.
  useEffect(() => {
    if (initialNetsuiteState !== 'unknown') return;
    if (typeof window === 'undefined' || !window.ipc) return;
    // TODO ch-wiring: implement connector.netsuite.status IPC channel in main→utility.
    window.ipc
      .invoke('connector.netsuite.status')
      .then((res: unknown) => {
        const r = res as { connected?: boolean; user?: string } | null;
        if (r?.connected) { setNsState('connected'); setNsDetail(r.user); }
        else setNsState('disconnected');
      })
      .catch(() => setNsState('disconnected'));
  }, [initialNetsuiteState]);

  const connectNetsuite = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ipc) {
      setNsState('error');
      setNsDetail('IPC unavailable');
      return;
    }
    setNsState('connecting');
    setNsDetail(undefined);
    try {
      // Main process invokes NetSuiteClient.reconnect() which opens the browser and
      // runs the OAuth public-client + PKCE flow against the loopback on port 8765.
      // TODO ch-wiring: implement connector.netsuite.connect IPC channel in main→utility.
      const res = (await window.ipc.invoke('connector.netsuite.connect')) as { user?: string } | undefined;
      setNsState('connected');
      setNsDetail(res?.user);
    } catch (err) {
      setNsState('error');
      setNsDetail(err instanceof Error ? err.message : String(err));
    }
  }, []);

  return (
    <main
      aria-label="Settings: Connectors"
      style={{ padding: 'var(--space-6)', maxWidth: 600, margin: '0 auto', color: 'var(--color-text-primary)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to Settings"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)',
              padding: '4px 8px', borderRadius: 'var(--radius-sm)',
            }}
          >
            ← Back
          </button>
        )}
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, margin: 0 }}>Connectors</h1>
      </div>

      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-5)' }}>
        Connect C-Suite to your data sources. Authentication runs in your browser; tokens
        are stored encrypted in the macOS Keychain.
      </p>

      <ConnectorRow
        id="netsuite"
        label="NetSuite"
        description="OAuth 2.0 via the NetSuite AI Connector Service (account 603734)."
        state={nsState}
        detail={nsDetail}
        onConnect={connectNetsuite}
      />
    </main>
  );
}
