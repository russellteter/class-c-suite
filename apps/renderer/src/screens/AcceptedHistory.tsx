// apps/renderer/src/screens/AcceptedHistory.tsx
// Source: ch6-renderer-brief.md §3 + accepted-history-A.html (Variant A)
// Per-artifact revision log. Collapsed list, expand-to-diff. Newest first. Read-only.
// Subscribes to historical writeback.committed events filtered to artifactId.
// Fetches initial history via writeback.committed.history.get IPC.

import React, { useEffect, useState, useCallback } from 'react';
import { onIpc, invokeIpc } from '../ipc-client.js';
import { DiffView } from '../components/DiffView.js';
import '../design/tokens.css';

interface CommitEntry {
  writebackId: string;
  artifactPath: string;
  gitSha: string;
  committedAt: number;
  runId: string;
  /** Diff against previous commit — may be null if not available from Runtime */
  diff: string | null;
  /** Playbook label derived from Runtime — optional */
  playbook?: string;
  /** Verifier rigor score — optional */
  rigorScore?: number | null;
}

interface AcceptedHistoryProps {
  artifactId: string;
  onBack: () => void;
}

function CommitRow({ entry, expanded, onToggle }: { entry: CommitEntry; expanded: boolean; onToggle: () => void }): React.ReactElement {
  const shaShort = entry.gitSha.length >= 7 ? entry.gitSha.slice(0, 7) : entry.gitSha;
  const committedAt = new Date(entry.committedAt).toLocaleString();

  return (
    <div style={{ borderBottom: '1px solid var(--color-border)' }}>
      {/* Collapsed row — always visible */}
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        style={{
          display: 'grid',
          gridTemplateColumns: '20px 1fr auto auto',
          alignItems: 'center',
          gap: 'var(--space-3)',
          width: '100%',
          padding: 'var(--space-2) var(--space-3)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          outline: 'none',
        }}
      >
        {/* Commit dot */}
        <div style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: 'var(--color-gold-500)',
          border: '2px solid var(--color-navy-900)',
          flexShrink: 0,
        }} aria-hidden="true" />

        {/* SHA + writeback ID */}
        <div style={{ overflow: 'hidden' }}>
          <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'monospace', color: 'var(--color-gold-500)', marginRight: 'var(--space-2)' }}>
            {shaShort}
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
            {entry.writebackId}
          </span>
        </div>

        {/* Timestamp */}
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
          {committedAt}
        </span>

        {/* Chevron */}
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"
          style={{
            color: 'var(--color-text-muted)',
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: `transform var(--motion-base)`,
          }}
        >
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Expanded panel */}
      <div
        style={{
          overflow: 'hidden',
          maxHeight: expanded ? '800px' : '0',
          transition: `max-height var(--motion-base)`,
        }}
        aria-hidden={!expanded}
      >
        <div style={{ padding: 'var(--space-1) var(--space-3) var(--space-3) calc(20px + var(--space-3) + var(--space-3))' }}>
          {/* Meta row */}
          <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
            {entry.playbook && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                Playbook: <span style={{ color: 'var(--color-text-secondary)' }}>{entry.playbook}</span>
              </span>
            )}
            {entry.rigorScore !== undefined && entry.rigorScore !== null && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                Rigor: <span style={{ color: entry.rigorScore >= 0.7 ? 'var(--color-success)' : 'var(--color-rigor-draft)' }}>
                  {(entry.rigorScore * 100).toFixed(0)}%
                </span>
              </span>
            )}
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
              run: {entry.runId}
            </span>
          </div>

          {/* Diff */}
          {entry.diff ? (
            <DiffView diff={entry.diff} />
          ) : (
            <div style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
              fontStyle: 'italic',
              padding: 'var(--space-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-base)',
            }}>
              Diff not available for this commit
            </div>
          )}

          {/* Artifact path */}
          <div style={{ marginTop: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {entry.artifactPath}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function parseEntry(item: unknown): CommitEntry | null {
  if (typeof item !== 'object' || item === null) return null;
  const r = item as Record<string, unknown>;
  return {
    writebackId: typeof r['writebackId'] === 'string' ? r['writebackId'] : String(r['writebackId'] ?? ''),
    artifactPath: typeof r['artifactPath'] === 'string' ? r['artifactPath'] : '',
    gitSha: typeof r['gitSha'] === 'string' ? r['gitSha'] : '',
    committedAt: typeof r['committedAt'] === 'number' ? r['committedAt'] : 0,
    runId: typeof r['runId'] === 'string' ? r['runId'] : '',
    diff: typeof r['diff'] === 'string' ? r['diff'] : null,
    playbook: typeof r['playbook'] === 'string' ? r['playbook'] : undefined,
    rigorScore: typeof r['rigorScore'] === 'number' ? r['rigorScore'] : null,
  };
}

export function AcceptedHistory({ artifactId, onBack }: AcceptedHistoryProps): React.ReactElement {
  const [entries, setEntries] = useState<CommitEntry[]>([]);
  const [expandedShas, setExpandedShas] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch initial history
  useEffect(() => {
    setLoading(true);
    invokeIpc<unknown[]>('writeback.committed.history.get', artifactId).then((raw) => {
      const parsed = raw.map(parseEntry).filter((e): e is CommitEntry => e !== null);
      // Newest first
      parsed.sort((a, b) => b.committedAt - a.committedAt);
      setEntries(parsed);
    }).catch((err) => {
      console.warn('[AcceptedHistory] writeback.committed.history.get failed', err);
    }).finally(() => setLoading(false));
  }, [artifactId]);

  // Subscribe to new commits for this artifact
  useEffect(() => {
    const cleanup = onIpc((msg) => {
      if (msg.kind === 'writeback.committed') {
        // Re-fetch to get updated history with diff
        invokeIpc<unknown[]>('writeback.committed.history.get', artifactId).then((raw) => {
          const parsed = raw.map(parseEntry).filter((e): e is CommitEntry => e !== null);
          parsed.sort((a, b) => b.committedAt - a.committedAt);
          setEntries(parsed);
        }).catch(console.warn);
      }
    });
    return cleanup;
  }, [artifactId]);

  const toggleExpand = useCallback((key: string) => {
    setExpandedShas((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--color-navy-900)',
      color: 'var(--color-text-primary)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: 'var(--space-3)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'var(--color-purple-400)', cursor: 'pointer', fontSize: 'var(--text-xs)', padding: 0, outline: 'none' }}
        >
          Back
        </button>
        <h1 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, margin: 0 }}>
          Accepted history
          <span style={{ marginLeft: 'var(--space-2)', fontFamily: 'monospace', color: 'var(--color-text-muted)', fontWeight: 400 }}>
            {artifactId}
          </span>
        </h1>
        <span style={{
          marginLeft: 'auto',
          fontSize: 'var(--text-xs)',
          background: 'rgba(79,174,106,0.12)',
          color: 'var(--color-success)',
          border: '1px solid rgba(79,174,106,0.25)',
          borderRadius: 'var(--radius-pill)',
          padding: '0 var(--space-2)',
        }}>
          active
        </span>
      </div>

      {/* Meta row */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-4)',
        padding: 'var(--space-2) var(--space-3)',
        borderBottom: '1px solid var(--color-border)',
        fontSize: 'var(--text-xs)',
        color: 'var(--color-text-muted)',
        flexWrap: 'wrap',
      }}>
        <span>Commits: <span style={{ color: 'var(--color-text-secondary)' }}>{entries.length}</span></span>
        {entries.length > 0 && (
          <span>
            Last committed: <span style={{ color: 'var(--color-text-secondary)' }}>
              {new Date(entries[0].committedAt).toLocaleDateString()}
            </span>
          </span>
        )}
      </div>

      {/* Commit list */}
      <div style={{ flex: 1, overflowY: 'auto' }} role="list" aria-label={`Commit history for ${artifactId}`}>
        {loading && (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
            Loading history...
          </div>
        )}
        {!loading && entries.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            color: 'var(--color-text-muted)',
            gap: 'var(--space-2)',
          }}>
            <p style={{ fontSize: 'var(--text-sm)', margin: 0 }}>No commits yet</p>
            <p style={{ fontSize: 'var(--text-xs)', margin: 0 }}>Accepted write-backs will appear here.</p>
          </div>
        )}
        {entries.map((entry) => {
          const key = entry.gitSha || entry.writebackId;
          return (
            <div key={key} role="listitem">
              <CommitRow
                entry={entry}
                expanded={expandedShas.has(key)}
                onToggle={() => toggleExpand(key)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
