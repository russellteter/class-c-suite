// apps/renderer/src/screens/ConversationPane.tsx
// Source: ch6-renderer-brief.md §2 + conversation-pane-A.html (Variant A — linear timeline)
// Renders iteration history for a single writeback.
// Subscribes to IPC events for the open writebackId.
// Cap surface renders when iterationCount >= 3.

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { IterationHistoryEntry } from '@c-suite/shared-types/writeback';
import type { WritebackDraft } from '@c-suite/shared-types/writeback';
import type { IterationHistoryEntry as IterationHistoryEntryType } from '@c-suite/shared-types/writeback';
import { onIpc, invokeIpc } from '../ipc-client.js';
import { ArtifactTypeIcon } from '../components/ArtifactTypeIcon.js';
import { IterationCapSurface } from '../components/IterationCapSurface.js';
import type { CapChoice } from '../components/IterationCapSurface.js';
import '../design/tokens.css';

interface ConversationPaneProps {
  writebackId: string;
  draft: WritebackDraft | null;
  onBack: () => void;
}

const MAX_ITERATIONS = 3;

function VerifierScoreDelta({ before, after }: { before: number | null; after: number | null }): React.ReactElement | null {
  if (before === null && after === null) return null;
  const delta = after !== null && before !== null ? after - before : null;
  return (
    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
      Score: {before ?? '?'} &rarr; {after ?? '?'}
      {delta !== null && (
        <span style={{ marginLeft: 'var(--space-1)', color: delta >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
          ({delta >= 0 ? '+' : ''}{delta.toFixed(2)})
        </span>
      )}
    </span>
  );
}

interface IterationRoundProps {
  entry: IterationHistoryEntryType;
  expandedDiff: boolean;
  onToggleDiff: () => void;
}

function IterationRound({ entry, expandedDiff, onToggleDiff }: IterationRoundProps): React.ReactElement {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
      {/* Timeline column */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '20px' }}>
        <div style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: 'var(--color-purple-500)',
          border: '2px solid var(--color-navy-900)',
          flexShrink: 0,
          marginTop: '3px',
        }} aria-hidden="true" />
        <div style={{ width: '1px', flex: 1, background: 'var(--color-border)', minHeight: '16px' }} aria-hidden="true" />
      </div>

      {/* Content column */}
      <div style={{ flex: 1, paddingBottom: 'var(--space-3)' }}>
        {/* Round label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Round {entry.iterationNumber}
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            {new Date(entry.requestedAt).toLocaleTimeString()}
          </span>
          <VerifierScoreDelta before={entry.verifierScoreBefore} after={entry.verifierScoreAfter} />
        </div>

        {/* Russell's feedback */}
        <div style={{
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-2) var(--space-3)',
          fontSize: 'var(--text-xs)',
          lineHeight: 'var(--leading-normal)',
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--space-2)',
        }}>
          <span style={{ display: 'block', fontSize: 'var(--text-2xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>
            Your feedback
          </span>
          {entry.russellFeedback}
        </div>

        {/* Contested lenses */}
        {entry.contestedLenses.length > 0 && (
          <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-text-muted)', alignSelf: 'center' }}>Contested:</span>
            {entry.contestedLenses.map((lens) => (
              <span key={lens} style={{
                fontSize: 'var(--text-2xs)',
                background: 'rgba(197,72,72,0.1)',
                color: 'var(--color-error)',
                border: '1px solid rgba(197,72,72,0.25)',
                borderRadius: 'var(--radius-pill)',
                padding: '0 var(--space-1)',
              }}>
                {lens}
              </span>
            ))}
          </div>
        )}

        {/* Draft path toggle */}
        <button
          onClick={onToggleDiff}
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-purple-400)',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            outline: 'none',
          }}
          aria-expanded={expandedDiff}
        >
          <svg
            width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"
            style={{ transform: expandedDiff ? 'rotate(180deg)' : 'none', transition: `transform var(--motion-base)` }}
          >
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {expandedDiff ? 'Hide' : 'Show'} draft path for this round
        </button>

        {expandedDiff && (
          <div style={{ marginTop: 'var(--space-2)' }}>
            <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-text-muted)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {entry.newDraftPath}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ConversationPane({ writebackId, draft, onBack }: ConversationPaneProps): React.ReactElement {
  const [history, setHistory] = useState<IterationHistoryEntryType[]>([]);
  const [capReached, setCapReached] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedDiffs, setExpandedDiffs] = useState<Set<number>>(new Set());
  const [capChoiceLoading, setCapChoiceLoading] = useState(false);
  const feedbackRef = useRef<HTMLTextAreaElement>(null);

  // Fetch history on mount
  useEffect(() => {
    invokeIpc<unknown[]>('writeback.history.get', writebackId).then((raw) => {
      const parsed: IterationHistoryEntryType[] = [];
      for (const item of raw) {
        const result = IterationHistoryEntry.safeParse(item);
        if (result.success) {
          parsed.push(result.data);
        } else {
          console.warn('[ConversationPane] history entry parse failed, dropping', item, result.error);
        }
      }
      setHistory(parsed.sort((a, b) => a.iterationNumber - b.iterationNumber));
    }).catch((err) => {
      console.warn('[ConversationPane] writeback.history.get failed', err);
    });
  }, [writebackId]);

  // IPC subscription
  useEffect(() => {
    const cleanup = onIpc((msg) => {
      if (msg.kind === 'writeback.iteration.requested' && msg.payload.writebackId === writebackId) {
        setSubmitting(false);
      }

      if (msg.kind === 'writeback.iteration.completed' && msg.payload.writebackId === writebackId) {
        // Re-fetch full history on completion
        invokeIpc<unknown[]>('writeback.history.get', writebackId).then((raw) => {
          const parsed: IterationHistoryEntryType[] = [];
          for (const item of raw) {
            const result = IterationHistoryEntry.safeParse(item);
            if (result.success) parsed.push(result.data);
          }
          setHistory(parsed.sort((a, b) => a.iterationNumber - b.iterationNumber));
        }).catch(console.warn);
      }

      if (msg.kind === 'writeback.iteration.cap_reached' && msg.payload.writebackId === writebackId) {
        setCapReached(true);
      }
    });
    return cleanup;
  }, [writebackId]);

  const iterationCount = draft?.iterationCount ?? history.length;
  const roundsUsed = Math.max(iterationCount, history.length);
  const isAtCap = capReached || roundsUsed >= MAX_ITERATIONS;

  const handleSubmitFeedback = useCallback(() => {
    const trimmed = feedback.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setFeedback('');
    invokeIpc('writeback.iterate.requested', writebackId, trimmed).catch((err) => {
      console.error('[ConversationPane] writeback.iterate.requested failed', err);
      setSubmitting(false);
    });
  }, [feedback, submitting, writebackId]);

  const handleCapChoice = useCallback((choice: CapChoice) => {
    setCapChoiceLoading(true);
    const channel = choice === 'commit'
      ? 'writeback.accept'
      : choice === 'reject'
        ? 'writeback.reject'
        : 'writeback.rerun';
    invokeIpc(channel, writebackId).then(() => {
      onBack();
    }).catch((err) => {
      console.error('[ConversationPane] cap choice failed', channel, err);
      setCapChoiceLoading(false);
    });
  }, [writebackId, onBack]);

  const toggleDiff = useCallback((iterationNumber: number) => {
    setExpandedDiffs((prev) => {
      const next = new Set(prev);
      if (next.has(iterationNumber)) {
        next.delete(iterationNumber);
      } else {
        next.add(iterationNumber);
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
      {/* Breadcrumb */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        padding: 'var(--space-2) var(--space-3)',
        borderBottom: '1px solid var(--color-border)',
        fontSize: 'var(--text-xs)',
        color: 'var(--color-text-muted)',
      }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'var(--color-purple-400)', cursor: 'pointer', padding: 0, fontSize: 'var(--text-xs)', outline: 'none' }}
        >
          Write-backs
        </button>
        <span aria-hidden="true">/</span>
        <span style={{ color: 'var(--color-text-secondary)' }}>{writebackId}</span>
        <span aria-hidden="true">/</span>
        <span>Conversation</span>
      </div>

      {/* Artifact summary card */}
      {draft && (
        <div style={{
          margin: 'var(--space-3)',
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <ArtifactTypeIcon type={draft.artifactType} size={16} />
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{draft.artifactId}</span>
            <span style={{
              marginLeft: 'auto',
              fontSize: 'var(--text-xs)',
              background: isAtCap ? 'rgba(197,72,72,0.15)' : 'rgba(71,57,231,0.15)',
              color: isAtCap ? 'var(--color-error)' : 'var(--color-purple-400)',
              borderRadius: 'var(--radius-pill)',
              padding: '0 var(--space-2)',
              border: `1px solid ${isAtCap ? 'rgba(197,72,72,0.3)' : 'rgba(71,57,231,0.3)'}`,
            }}>
              {roundsUsed} / {MAX_ITERATIONS} rounds used
            </span>
          </div>

          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 'var(--leading-normal)' }}>
            {draft.description}
          </p>

          {/* Lenses contributing */}
          {draft.proposedBy.lensesContributing.length > 0 && (
            <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
              {draft.proposedBy.lensesContributing.map((lens) => (
                <span key={lens} style={{
                  fontSize: 'var(--text-2xs)',
                  background: 'var(--color-surface-3)',
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
        </div>
      )}

      {/* Timeline */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-3)' }}>
        {history.length === 0 && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
            No iteration rounds yet. Submit feedback below to begin.
          </p>
        )}
        {history.map((entry) => (
          <IterationRound
            key={entry.iterationNumber}
            entry={entry}
            expandedDiff={expandedDiffs.has(entry.iterationNumber)}
            onToggleDiff={() => toggleDiff(entry.iterationNumber)}
          />
        ))}

        {/* Cap surface */}
        {isAtCap && (
          <IterationCapSurface
            writebackId={writebackId}
            onChoose={handleCapChoice}
            disabled={capChoiceLoading}
          />
        )}
      </div>

      {/* Feedback input */}
      {!isAtCap && (
        <div style={{
          borderTop: '1px solid var(--color-border)',
          padding: 'var(--space-3)',
          background: 'var(--color-surface-1)',
        }}>
          <label
            htmlFor="conversation-feedback"
            style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}
          >
            Round {roundsUsed + 1} of {MAX_ITERATIONS} — your feedback
          </label>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
            <textarea
              id="conversation-feedback"
              ref={feedbackRef}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              disabled={submitting}
              placeholder="What should the Synthesizer change or reconsider?"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSubmitFeedback();
                }
              }}
              style={{
                flex: 1,
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-base)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--text-sm)',
                lineHeight: 'var(--leading-normal)',
                padding: 'var(--space-2) var(--space-3)',
                resize: 'vertical',
                outline: 'none',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-purple-500)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
            />
            <button
              onClick={handleSubmitFeedback}
              disabled={!feedback.trim() || submitting}
              style={{
                background: feedback.trim() && !submitting ? 'var(--color-purple-500)' : 'var(--color-surface-3)',
                border: 'none',
                borderRadius: 'var(--radius-base)',
                color: feedback.trim() && !submitting ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                padding: 'var(--space-2) var(--space-4)',
                cursor: feedback.trim() && !submitting ? 'pointer' : 'not-allowed',
                outline: 'none',
                flexShrink: 0,
                transition: 'background var(--motion-fast)',
              }}
            >
              {submitting ? 'Sending...' : 'Send (Cmd+Enter)'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
