// apps/renderer/src/screens/HandoffPreview.tsx
// Source: docs/decisions/0011-ch9-cowork-handoff.md §5.2 (AC-7, AC-8)
// Two-column layout: left (60%) editable markdown preview; right (40%) metadata panel.
// IPC wiring: handoff.preview.ready → render; handoff.send → main; handoff.sent → toast + close.

import React, { useState, useCallback, useEffect } from 'react';
import { parseMemoMarkdown } from './MemoViewer.js';
import {
  type HandoffBrief,
  onHandoffSent,
  onHandoffFailed,
  sendHandoffSend,
  sendHandoffCancelled,
} from '../ipc/handoff.js';
import '../design/tokens.css';

// ── Sub-types ─────────────────────────────────────────────────────────────────

type SendState = 'idle' | 'sending' | 'sent';

// ── Helpers ───────────────────────────────────────────────────────────────────

function SkillCheckbox({
  skillId,
  checked,
  onChange,
}: {
  skillId: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}): React.ReactElement {
  const id = `skill-${skillId}`;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', marginBottom: 'var(--space-1)' }}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: 'var(--color-gold-500)', cursor: 'pointer' }}
        aria-label={`Brand skill: ${skillId}`}
      />
      <label
        htmlFor={id}
        style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-secondary)',
          cursor: 'pointer',
          fontFamily: 'monospace',
        }}
      >
        {skillId}
      </label>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface HandoffPreviewProps {
  brief: HandoffBrief;
  /** Called on successful send OR cancel — navigates back in App.tsx */
  onClose: () => void;
}

export function HandoffPreview({ brief, onClose }: HandoffPreviewProps): React.ReactElement {
  // Editable state for body markdown
  const [bodyMarkdown, setBodyMarkdown] = useState(brief.bodyMarkdown);
  const [isEditing, setIsEditing] = useState(false);
  const [editBuffer, setEditBuffer] = useState(brief.bodyMarkdown);

  // Selected brand skills (Russell can adjust checkboxes)
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(
    new Set(brief.frontmatter.cowork_brand_skills),
  );

  // Send state machine: idle → sending → sent
  const [sendState, setSendState] = useState<SendState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Subscribe to handoff.sent and handoff.failed IPC from main
  useEffect(() => {
    const cleanupSent = onHandoffSent(({ runId }) => {
      if (runId !== brief.runId) return;
      setSendState('sent');
      // Auto-close after toast delay (1.5s)
      setTimeout(() => onClose(), 1500);
    });
    const cleanupFailed = onHandoffFailed(({ runId, reason }) => {
      if (runId !== brief.runId) return;
      setSendState('idle');
      setErrorMessage(reason);
    });
    return () => {
      cleanupSent();
      cleanupFailed();
    };
  }, [brief.runId, onClose]);

  // Edit body handlers
  const handleEditToggle = useCallback(() => {
    setEditBuffer(bodyMarkdown);
    setIsEditing(true);
  }, [bodyMarkdown]);

  const handleEditSave = useCallback(() => {
    setBodyMarkdown(editBuffer);
    setIsEditing(false);
  }, [editBuffer]);

  const handleEditCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  // Send handler — AC-8: only fires on explicit button click
  const handleSend = useCallback(() => {
    if (sendState !== 'idle') return;
    setSendState('sending');
    setErrorMessage(null);
    // Build the updated brief with any body edits + checkbox changes
    const updatedBrief: HandoffBrief = {
      ...brief,
      frontmatter: {
        ...brief.frontmatter,
        cowork_brand_skills: Array.from(selectedSkills) as HandoffBrief['frontmatter']['cowork_brand_skills'],
      },
      bodyMarkdown,
    };
    sendHandoffSend({
      runId: brief.runId,
      brief: updatedBrief,
      editedBodyMarkdown: bodyMarkdown !== brief.bodyMarkdown ? bodyMarkdown : undefined,
    });
  }, [sendState, brief, bodyMarkdown, selectedSkills]);

  // Cancel handler — AC-8: nothing persisted
  const handleCancel = useCallback(() => {
    sendHandoffCancelled(brief.runId);
    onClose();
  }, [brief.runId, onClose]);

  const fm = brief.frontmatter;

  return (
    <div
      data-testid="handoff-preview"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--color-navy-900)',
        color: 'var(--color-text-primary)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* ── Header ───────────────────────────────────────────────────── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          padding: 'var(--space-3) var(--space-6)',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
        }}
      >
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>
            Origin:
            <span style={{ marginLeft: 'var(--space-1)', fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>
              {fm.origin_path}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-2xs)', fontFamily: 'monospace', color: 'var(--color-purple-400)' }}>
              {fm.id}
            </span>
            <span
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 700,
                color: 'var(--color-gold-500)',
                background: 'rgba(201,161,75,0.10)',
                border: '1px solid rgba(201,161,75,0.25)',
                borderRadius: 'var(--radius-pill)',
                padding: '0 var(--space-2)',
              }}
            >
              Draw up for Cowork
            </span>
          </div>
        </div>
      </header>

      {/* ── Error banner (handoff.failed) ─────────────────────────────── */}
      {errorMessage && (
        <div
          role="alert"
          data-testid="handoff-error-banner"
          style={{
            padding: 'var(--space-2) var(--space-6)',
            background: 'rgba(255,92,92,0.12)',
            borderBottom: '1px solid rgba(255,92,92,0.30)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-error)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <strong>Send failed:</strong> {errorMessage}. Fix the issue or contact support — your edits are preserved above.
        </div>
      )}

      {/* ── Sent toast ───────────────────────────────────────────────── */}
      {sendState === 'sent' && (
        <div
          role="status"
          data-testid="handoff-sent-toast"
          aria-live="polite"
          style={{
            padding: 'var(--space-2) var(--space-6)',
            background: 'rgba(79,174,106,0.15)',
            borderBottom: '1px solid rgba(79,174,106,0.30)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-success)',
            fontWeight: 600,
          }}
        >
          Sent to Cowork.
        </div>
      )}

      {/* ── Two-column body ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left column — 60% — editable markdown preview */}
        <div
          style={{
            flex: '0 0 60%',
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid var(--color-border)',
            overflow: 'hidden',
          }}
        >
          {/* Edit controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--space-2) var(--space-4)',
              borderBottom: '1px solid var(--color-border)',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Brief body
            </span>
            {isEditing ? (
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                  type="button"
                  data-testid="edit-save-btn"
                  onClick={handleEditSave}
                  aria-label="Save body edits"
                  style={{
                    fontSize: 'var(--text-xs)',
                    padding: '3px 10px',
                    background: 'rgba(79,174,106,0.15)',
                    color: 'var(--color-success)',
                    border: '1px solid rgba(79,174,106,0.30)',
                    borderRadius: 'var(--radius-base)',
                    cursor: 'pointer',
                  }}
                >
                  Save
                </button>
                <button
                  type="button"
                  data-testid="edit-cancel-btn"
                  onClick={handleEditCancel}
                  aria-label="Discard body edits"
                  style={{
                    fontSize: 'var(--text-xs)',
                    padding: '3px 10px',
                    background: 'none',
                    color: 'var(--color-text-muted)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-base)',
                    cursor: 'pointer',
                  }}
                >
                  Discard
                </button>
              </div>
            ) : (
              <button
                type="button"
                data-testid="edit-body-btn"
                onClick={handleEditToggle}
                aria-label="Edit brief body"
                style={{
                  fontSize: 'var(--text-xs)',
                  padding: '3px 10px',
                  background: 'none',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-base)',
                  cursor: 'pointer',
                }}
              >
                Edit body
              </button>
            )}
          </div>

          {/* Content area */}
          <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-4)' }}>
            {isEditing ? (
              <textarea
                data-testid="edit-body-textarea"
                value={editBuffer}
                onChange={(e) => setEditBuffer(e.target.value)}
                aria-label="Brief body editor"
                style={{
                  width: '100%',
                  height: '100%',
                  minHeight: '400px',
                  background: 'var(--color-surface-1)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-base)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'monospace',
                  fontSize: 'var(--text-sm)',
                  lineHeight: 'var(--leading-relaxed)',
                  padding: 'var(--space-3)',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            ) : (
              <div
                data-testid="brief-body-rendered"
                style={{
                  fontSize: 'var(--text-sm)',
                  lineHeight: 'var(--leading-relaxed)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {/* Reuse the parseMemoMarkdown renderer from MemoViewer for consistent markdown display */}
                {parseMemoMarkdown(bodyMarkdown, () => {})}
              </div>
            )}
          </div>
        </div>

        {/* Right column — 40% — metadata panel */}
        <div
          data-testid="metadata-panel"
          style={{
            flex: '0 0 40%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
            padding: 'var(--space-4)',
            gap: 'var(--space-4)',
          }}
        >
          {/* Origin link */}
          <section>
            <div style={{ fontSize: 'var(--text-2xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--space-1)' }}>
              Origin
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
              <div style={{ marginBottom: 'var(--space-1)', fontWeight: 600 }}>{fm.origin_title}</div>
              <span style={{ fontFamily: 'monospace', color: 'var(--color-purple-400)', fontSize: 'var(--text-2xs)', wordBreak: 'break-all' }}>
                {fm.origin_path}
              </span>
            </div>
          </section>

          {/* Brand skills checkbox list */}
          <section>
            <div style={{ fontSize: 'var(--text-2xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--space-2)' }}>
              Cowork brand skills
            </div>
            <div data-testid="skill-checkboxes">
              {(
                [
                  'class-brand-document',
                  'class-brand-excel',
                  'class-brand-presentations',
                  'class-ppt-cyan-light',
                  'class-brand-voice',
                ] as const
              ).map((skillId) => (
                <SkillCheckbox
                  key={skillId}
                  skillId={skillId}
                  checked={selectedSkills.has(skillId)}
                  onChange={(checked) => {
                    setSelectedSkills((prev) => {
                      const next = new Set(prev);
                      if (checked) {
                        next.add(skillId);
                      } else {
                        next.delete(skillId);
                      }
                      return next;
                    });
                  }}
                />
              ))}
            </div>
          </section>

          {/* Filename preview */}
          <section>
            <div style={{ fontSize: 'var(--text-2xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--space-1)' }}>
              Handoff file
            </div>
            <div
              data-testid="filename-preview"
              style={{ fontFamily: 'monospace', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', wordBreak: 'break-all' }}
            >
              handoffs/{fm.filename}
            </div>
          </section>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {/* Send to Cowork — primary */}
            <button
              type="button"
              data-testid="send-to-cowork-btn"
              onClick={handleSend}
              disabled={sendState !== 'idle'}
              aria-label="Send to Cowork — write handoff brief to vault"
              aria-busy={sendState === 'sending'}
              style={{
                padding: 'var(--space-2) var(--space-4)',
                fontSize: 'var(--text-sm)',
                fontWeight: 700,
                color: sendState !== 'idle' ? 'var(--color-text-muted)' : 'var(--color-navy-900)',
                background: sendState !== 'idle' ? 'rgba(201,161,75,0.25)' : 'var(--color-gold-500)',
                border: '1px solid transparent',
                borderRadius: 'var(--radius-base)',
                cursor: sendState !== 'idle' ? 'not-allowed' : 'pointer',
                transition: `background var(--motion-base)`,
              }}
            >
              {sendState === 'sending' ? 'Sending...' : 'Send to Cowork'}
            </button>

            {/* Cancel — secondary */}
            <button
              type="button"
              data-testid="cancel-btn"
              onClick={handleCancel}
              aria-label="Cancel handoff — nothing will be saved"
              style={{
                padding: 'var(--space-2) var(--space-4)',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                background: 'none',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-base)',
                cursor: 'pointer',
                transition: `border-color var(--motion-base)`,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
