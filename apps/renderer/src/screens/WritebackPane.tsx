// apps/renderer/src/screens/WritebackPane.tsx
// Source: ch6-renderer-brief.md §1 + docs/decisions/0008-design-gate-approved.md §1
// Variant A (dense list) with locked refinements §10.1 Topic pill, §10.2 row-expand, §10.3 --text-xs
//
// writeback.proposed IPC payload is thin (4 fields per ipc.ts).
// On mount, invoke writeback.list to hydrate full WritebackDraft records.
// Subsequent IPC events mutate state by writebackId.
//
// IPC pattern: useEffect subscribe; log+drop invalid; no polling; no global singletons.

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { WritebackDraftSchema } from '@c-suite/shared-types/writeback';
import type { WritebackDraft, ArtifactType } from '@c-suite/shared-types/writeback';
import { onIpc, invokeIpc } from '../ipc-client.js';
import { ArtifactTypeIcon } from '../components/ArtifactTypeIcon.js';
import { DiffView } from '../components/DiffView.js';
import { RejectionRationaleModal } from '../components/RejectionRationaleModal.js';
import '../design/tokens.css';

// ---- Types ----------------------------------------------------------------

type FilterType = ArtifactType | 'all';
type FilterStatus = 'proposed' | 'iterating' | 'all';
type SortKey = 'topic' | 'artifactType' | 'artifactId' | 'proposedAt';

interface WritebackPaneProps {
  onOpenConversation: (writebackId: string) => void;
}

// ---- Artifact type label map ----------------------------------------------

const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  'position': 'Position',
  'decision': 'Decision',
  'prediction': 'Prediction',
  'pre-mortem-update': 'Pre-mortem',
  'stakeholder-update': 'Stakeholder',
  'workstream-advance': 'Workstream',
};

// ---- Diff badge -----------------------------------------------------------

function DiffBadge({ wb }: { wb: WritebackDraft }): React.ReactElement {
  if (wb.isNew) {
    return (
      <span style={{
        fontSize: 'var(--text-2xs)',
        background: 'rgba(79, 174, 106, 0.15)',
        color: 'var(--color-success)',
        border: '1px solid rgba(79, 174, 106, 0.3)',
        borderRadius: 'var(--radius-pill)',
        padding: '0 var(--space-1)',
        whiteSpace: 'nowrap',
        fontWeight: 600,
        letterSpacing: '0.03em',
      }}>
        NEW
      </span>
    );
  }
  if (!wb.diffAgainstActive) {
    return <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-2xs)' }}>&#8212;</span>;
  }

  const lines = wb.diffAgainstActive.split('\n');
  const added = lines.filter(l => l.startsWith('+')).length;
  const removed = lines.filter(l => l.startsWith('-')).length;
  return (
    <span style={{ fontSize: 'var(--text-2xs)', whiteSpace: 'nowrap' }}>
      <span style={{ color: 'var(--color-success)' }}>+{added}</span>
      {' / '}
      <span style={{ color: 'var(--color-error)' }}>-{removed}</span>
    </span>
  );
}

// ---- Topic pill (§10.1) --------------------------------------------------

function TopicPill({ topic }: { topic: string }): React.ReactElement {
  return (
    <span
      title={topic}
      style={{
        display: 'inline-block',
        fontSize: 'var(--text-2xs)',
        background: 'rgba(71, 57, 231, 0.15)',
        color: 'var(--color-purple-200)',
        border: '1px solid rgba(71, 57, 231, 0.3)',
        borderRadius: 'var(--radius-pill)',
        padding: '0 var(--space-1)',
        whiteSpace: 'nowrap',
        maxWidth: '80px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        verticalAlign: 'middle',
      }}
    >
      {topic}
    </span>
  );
}

// ---- Action buttons -------------------------------------------------------

interface ActionButtonsProps {
  wb: WritebackDraft;
  onAccept: (id: string) => void;
  onEdit: (id: string) => void;
  onReject: (id: string) => void;
  onConversation: (id: string) => void;
  busy: boolean;
}

const BTN_BASE: React.CSSProperties = {
  fontSize: 'var(--text-2xs)',
  padding: '2px var(--space-2)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid',
  cursor: 'pointer',
  fontWeight: 500,
  transition: 'opacity var(--motion-fast)',
  outline: 'none',
};

function ActionButtons({ wb, onAccept, onEdit, onReject, onConversation, busy }: ActionButtonsProps): React.ReactElement {
  const isIterating = wb.status === 'iterating';

  return (
    <div style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'center', justifyContent: 'flex-end' }}>
      {!isIterating && (
        <>
          <button
            onClick={() => onAccept(wb.writebackId)}
            disabled={busy}
            aria-label={`Accept ${wb.writebackId}`}
            style={{ ...BTN_BASE, background: 'rgba(79,174,106,0.15)', color: 'var(--color-success)', borderColor: 'rgba(79,174,106,0.3)' }}
          >
            Accept
          </button>
          <button
            onClick={() => onEdit(wb.writebackId)}
            disabled={busy}
            aria-label={`Edit ${wb.writebackId}`}
            style={{ ...BTN_BASE, background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}
          >
            Edit
          </button>
          <button
            onClick={() => onReject(wb.writebackId)}
            disabled={busy}
            aria-label={`Reject ${wb.writebackId}`}
            style={{ ...BTN_BASE, background: 'rgba(197,72,72,0.12)', color: 'var(--color-error)', borderColor: 'rgba(197,72,72,0.3)' }}
          >
            Reject
          </button>
        </>
      )}
      <button
        onClick={() => onConversation(wb.writebackId)}
        disabled={busy}
        aria-label={`Open conversation for ${wb.writebackId}`}
        style={{ ...BTN_BASE, background: 'rgba(71,57,231,0.15)', color: 'var(--color-purple-400)', borderColor: 'rgba(71,57,231,0.3)' }}
      >
        {isIterating ? 'Iterating...' : 'Convo'}
      </button>
    </div>
  );
}

// ---- Row ------------------------------------------------------------------

interface RowProps {
  wb: WritebackDraft;
  expanded: boolean;
  onToggle: () => void;
  onAccept: (id: string) => void;
  onEdit: (id: string) => void;
  onReject: (id: string) => void;
  onConversation: (id: string) => void;
  busy: boolean;
}

function WritebackRow({ wb, expanded, onToggle, onAccept, onEdit, onReject, onConversation, busy }: RowProps): React.ReactElement {
  const isIterating = wb.status === 'iterating';

  return (
    <div
      style={{
        background: isIterating ? 'rgba(71,57,231,0.07)' : 'transparent',
        borderBottom: '1px solid var(--color-border)',
        transition: 'background var(--motion-fast)',
      }}
    >
      {/* Collapsed row — always visible */}
      <div
        role="row"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        style={{
          display: 'grid',
          gridTemplateColumns: '28px 80px 72px 1fr 100px 180px 24px',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-1) var(--space-3)',
          cursor: 'pointer',
          minHeight: '32px',
          outline: 'none',
        }}
      >
        {/* Icon */}
        <div style={{ display: 'flex', justifyContent: 'center' }} role="cell">
          <ArtifactTypeIcon type={wb.artifactType} size={14} />
        </div>

        {/* Artifact ID */}
        <div role="cell" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span title={wb.artifactId}>{wb.artifactId}</span>
        </div>

        {/* Topic pill (§10.1) */}
        <div role="cell">
          <TopicPill topic={wb.topic} />
        </div>

        {/* Description (§10.3 — --text-xs + --leading-tight) */}
        <div role="cell" style={{
          fontSize: 'var(--text-xs)',
          lineHeight: 'var(--leading-tight)',
          color: 'var(--color-text-secondary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {wb.description}
        </div>

        {/* Diff badge */}
        <div role="cell" style={{ textAlign: 'right' }}>
          <DiffBadge wb={wb} />
          {isIterating && (
            <span style={{
              marginLeft: 'var(--space-1)',
              fontSize: 'var(--text-2xs)',
              background: 'rgba(71,57,231,0.2)',
              color: 'var(--color-purple-400)',
              borderRadius: 'var(--radius-pill)',
              padding: '0 var(--space-1)',
            }}>
              iter {wb.iterationCount}/3
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div role="cell" onClick={(e) => e.stopPropagation()}>
          <ActionButtons
            wb={wb}
            onAccept={onAccept}
            onEdit={onEdit}
            onReject={onReject}
            onConversation={onConversation}
            busy={busy}
          />
        </div>

        {/* Chevron (§10.2) */}
        <div role="cell" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            aria-hidden="true"
            style={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: `transform var(--motion-base)`,
            }}
          >
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Expanded panel (§10.2) — animates via max-height */}
      <div
        style={{
          overflow: 'hidden',
          maxHeight: expanded ? '600px' : '0',
          transition: `max-height var(--motion-base)`,
        }}
        aria-hidden={!expanded}
      >
        <div style={{ padding: 'var(--space-2) var(--space-3) var(--space-3) var(--space-3)', borderTop: '1px solid var(--color-border)' }}>
          {/* Full description */}
          <p style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-secondary)',
            lineHeight: 'var(--leading-normal)',
            marginBottom: 'var(--space-2)',
          }}>
            {wb.description}
          </p>

          {/* Lenses contributing pills */}
          {wb.proposedBy.lensesContributing.length > 0 && (
            <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-text-muted)', alignSelf: 'center' }}>Lenses:</span>
              {wb.proposedBy.lensesContributing.map((lens) => (
                <span key={lens} style={{
                  fontSize: 'var(--text-2xs)',
                  background: 'var(--color-surface-2)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-pill)',
                  padding: '0 var(--space-1)',
                }}>
                  {lens}
                </span>
              ))}
            </div>
          )}

          {/* Diff preview — first 12 lines (§10.2) */}
          {wb.diffAgainstActive ? (
            <DiffView diff={wb.diffAgainstActive} maxLines={12} />
          ) : (
            wb.isNew && (
              <div style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-muted)',
                fontStyle: 'italic',
                padding: 'var(--space-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-base)',
              }}>
                New artifact — no diff (would create {wb.artifactId})
              </div>
            )
          )}

          {/* Open full conversation link (§10.2) */}
          <button
            onClick={() => onConversation(wb.writebackId)}
            style={{
              display: 'inline-block',
              marginTop: 'var(--space-2)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-purple-400)',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
              outline: 'none',
            }}
          >
            Open full conversation
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Filter bar -----------------------------------------------------------

const ARTIFACT_TYPES: ArtifactType[] = [
  'position', 'decision', 'prediction', 'pre-mortem-update', 'stakeholder-update', 'workstream-advance',
];

const CHIP_BASE: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  padding: '2px var(--space-2)',
  borderRadius: 'var(--radius-pill)',
  border: '1px solid',
  cursor: 'pointer',
  background: 'var(--color-surface-2)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text-secondary)',
  outline: 'none',
  transition: 'background var(--motion-fast), color var(--motion-fast)',
};

const CHIP_ACTIVE: React.CSSProperties = {
  background: 'rgba(71,57,231,0.25)',
  borderColor: 'var(--color-purple-500)',
  color: 'var(--color-purple-200)',
};

function FilterBar({
  filterType, setFilterType,
  filterStatus, setFilterStatus,
  sortKey, setSortKey,
}: {
  filterType: FilterType; setFilterType: (v: FilterType) => void;
  filterStatus: FilterStatus; setFilterStatus: (v: FilterStatus) => void;
  sortKey: SortKey; setSortKey: (v: SortKey) => void;
}): React.ReactElement {
  const chipStyle = (active: boolean): React.CSSProperties => ({ ...CHIP_BASE, ...(active ? CHIP_ACTIVE : {}) });

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)', alignItems: 'center', padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--color-border)' }}>
      <button style={chipStyle(filterType === 'all')} onClick={() => setFilterType('all')}>All</button>
      {ARTIFACT_TYPES.map((t) => (
        <button key={t} style={chipStyle(filterType === t)} onClick={() => setFilterType(t)}>
          {ARTIFACT_TYPE_LABELS[t]}
        </button>
      ))}

      <span style={{ width: '1px', height: '16px', background: 'var(--color-border)', margin: '0 var(--space-1)' }} />

      <button style={chipStyle(filterStatus === 'all')} onClick={() => setFilterStatus('all')}>All</button>
      <button style={chipStyle(filterStatus === 'proposed')} onClick={() => setFilterStatus('proposed')}>Proposed</button>
      <button style={chipStyle(filterStatus === 'iterating')} onClick={() => setFilterStatus('iterating')}>Iterating</button>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
        <label htmlFor="wb-sort" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Sort</label>
        <select
          id="wb-sort"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          style={{
            fontSize: 'var(--text-xs)',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text-secondary)',
            padding: '2px var(--space-1)',
            outline: 'none',
          }}
        >
          <option value="topic">Topic</option>
          <option value="artifactType">Type</option>
          <option value="artifactId">Artifact ID</option>
          <option value="proposedAt">Newest</option>
        </select>
      </div>
    </div>
  );
}

// ---- Main component -------------------------------------------------------

export function WritebackPane({ onOpenConversation }: WritebackPaneProps): React.ReactElement {
  const [drafts, setDrafts] = useState<Map<string, WritebackDraft>>(new Map());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortKey, setSortKey] = useState<SortKey>('topic');
  const listRef = useRef<HTMLDivElement>(null);

  // Hydrate on mount via writeback.list invoke
  useEffect(() => {
    invokeIpc<unknown[]>('writeback.list').then((raw) => {
      const hydrated = new Map<string, WritebackDraft>();
      for (const item of raw) {
        const result = WritebackDraftSchema.safeParse(item);
        if (result.success) {
          hydrated.set(result.data.writebackId, result.data);
        } else {
          console.warn('[WritebackPane] writeback.list item failed parse, dropping', item, result.error);
        }
      }
      setDrafts(hydrated);
    }).catch((err) => {
      // Runtime may not have writeback.list yet — graceful degradation to IPC-only population
      console.warn('[WritebackPane] writeback.list invoke failed, will populate from IPC events', err);
    });
  }, []);

  // IPC subscription — no polling
  useEffect(() => {
    const cleanup = onIpc((msg) => {
      if (msg.kind === 'writeback.proposed') {
        // Thin payload — full hydration comes from writeback.list or future Runtime expansion
        setDrafts((prev) => {
          if (prev.has(msg.payload.writebackId)) return prev; // already have full record
          return prev; // can't build a full WritebackDraft from thin payload; wait for list
        });
      }

      if (msg.kind === 'writeback.iteration.requested') {
        setDrafts((prev) => {
          const existing = prev.get(msg.payload.writebackId);
          if (!existing) return prev;
          const next = new Map(prev);
          next.set(msg.payload.writebackId, { ...existing, status: 'iterating' });
          return next;
        });
      }

      if (msg.kind === 'writeback.iteration.completed') {
        setDrafts((prev) => {
          const existing = prev.get(msg.payload.writebackId);
          if (!existing) return prev;
          const next = new Map(prev);
          next.set(msg.payload.writebackId, {
            ...existing,
            iterationCount: msg.payload.iterationNumber,
            draftPath: msg.payload.newDraftPath,
          });
          return next;
        });
      }

      if (msg.kind === 'writeback.rejected') {
        setDrafts((prev) => {
          const next = new Map(prev);
          next.delete(msg.payload.writebackId);
          return next;
        });
        setBusyIds((prev) => { const s = new Set(prev); s.delete(msg.payload.writebackId); return s; });
      }

      if (msg.kind === 'writeback.committed') {
        setDrafts((prev) => {
          const next = new Map(prev);
          next.delete(msg.payload.writebackId);
          return next;
        });
        setBusyIds((prev) => { const s = new Set(prev); s.delete(msg.payload.writebackId); return s; });
      }

      if (msg.kind === 'writeback.edited') {
        setDrafts((prev) => {
          const existing = prev.get(msg.payload.writebackId);
          if (!existing) return prev;
          const next = new Map(prev);
          next.set(msg.payload.writebackId, { ...existing, draftPath: msg.payload.editedPath });
          return next;
        });
        setBusyIds((prev) => { const s = new Set(prev); s.delete(msg.payload.writebackId); return s; });
      }
    });
    return cleanup;
  }, []);

  // Actions
  const handleAccept = useCallback((id: string) => {
    setBusyIds((prev) => new Set(prev).add(id));
    invokeIpc('writeback.accept', id).catch((err) => {
      console.error('[WritebackPane] writeback.accept failed', id, err);
      setBusyIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    });
  }, []);

  const handleEdit = useCallback((id: string) => {
    setBusyIds((prev) => new Set(prev).add(id));
    invokeIpc('writeback.edit', id).catch((err) => {
      console.error('[WritebackPane] writeback.edit failed', id, err);
      setBusyIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    });
  }, []);

  const handleRejectOpen = useCallback((id: string) => {
    setRejectingId(id);
  }, []);

  const handleRejectConfirm = useCallback((rationale: string) => {
    if (!rejectingId) return;
    const id = rejectingId;
    setRejectingId(null);
    setBusyIds((prev) => new Set(prev).add(id));
    invokeIpc('writeback.reject', id, rationale).catch((err) => {
      console.error('[WritebackPane] writeback.reject failed', id, err);
      setBusyIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    });
  }, [rejectingId]);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Filter + sort
  const visibleDrafts = Array.from(drafts.values())
    .filter((wb) => wb.status === 'proposed' || wb.status === 'iterating')
    .filter((wb) => filterType === 'all' || wb.artifactType === filterType)
    .filter((wb) => filterStatus === 'all' || wb.status === filterStatus)
    .sort((a, b) => {
      switch (sortKey) {
        case 'topic': return a.topic.localeCompare(b.topic);
        case 'artifactType': return a.artifactType.localeCompare(b.artifactType);
        case 'artifactId': return a.artifactId.localeCompare(b.artifactId);
        case 'proposedAt': return b.proposedBy.proposedAt - a.proposedBy.proposedAt;
      }
    });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--color-navy-900)',
        color: 'var(--color-text-primary)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ padding: 'var(--space-3) var(--space-3) 0', borderBottom: '1px solid var(--color-border)' }}>
        <h1 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, margin: 0, marginBottom: 'var(--space-2)' }}>
          Proposed write-backs
          {visibleDrafts.length > 0 && (
            <span style={{
              marginLeft: 'var(--space-2)',
              fontSize: 'var(--text-xs)',
              background: 'rgba(71,57,231,0.2)',
              color: 'var(--color-purple-400)',
              borderRadius: 'var(--radius-pill)',
              padding: '0 var(--space-1)',
            }}>
              {visibleDrafts.length}
            </span>
          )}
        </h1>
      </div>

      {/* Filter bar */}
      <FilterBar
        filterType={filterType} setFilterType={setFilterType}
        filterStatus={filterStatus} setFilterStatus={setFilterStatus}
        sortKey={sortKey} setSortKey={setSortKey}
      />

      {/* Column headers */}
      {visibleDrafts.length > 0 && (
        <div
          role="row"
          style={{
            display: 'grid',
            gridTemplateColumns: '28px 80px 72px 1fr 100px 180px 24px',
            gap: 'var(--space-2)',
            padding: 'var(--space-1) var(--space-3)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          {['', 'Artifact', 'Topic', 'Description', 'Diff', 'Actions', ''].map((h, i) => (
            <div key={i} role="columnheader" style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {h}
            </div>
          ))}
        </div>
      )}

      {/* List */}
      <div
        ref={listRef}
        role="table"
        aria-label="Proposed write-backs"
        style={{ flex: 1, overflowY: 'auto' }}
      >
        {visibleDrafts.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: 'var(--space-2)',
            color: 'var(--color-text-muted)',
          }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
              <path d="M11 16h10M16 11v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p style={{ fontSize: 'var(--text-sm)', margin: 0 }}>No proposed write-backs</p>
            <p style={{ fontSize: 'var(--text-xs)', margin: 0, color: 'var(--color-text-muted)' }}>
              Write-backs appear here when the Synthesizer completes a run.
            </p>
          </div>
        ) : (
          visibleDrafts.map((wb) => (
            <WritebackRow
              key={wb.writebackId}
              wb={wb}
              expanded={expandedIds.has(wb.writebackId)}
              onToggle={() => handleToggleExpand(wb.writebackId)}
              onAccept={handleAccept}
              onEdit={handleEdit}
              onReject={handleRejectOpen}
              onConversation={onOpenConversation}
              busy={busyIds.has(wb.writebackId)}
            />
          ))
        )}
      </div>

      {/* Rejection modal */}
      {rejectingId && (
        <RejectionRationaleModal
          writebackId={rejectingId}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectingId(null)}
        />
      )}
    </div>
  );
}
