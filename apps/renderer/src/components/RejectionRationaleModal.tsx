// apps/renderer/src/components/RejectionRationaleModal.tsx
// Source: ch6-renderer-brief.md §Shared components
// Modal for collecting rejection rationale before sending writeback.reject IPC.
// WCAG AA: role="dialog", focus trap (Tab/Shift+Tab cycles within modal), Escape closes.
// Focus rings applied via CSS :focus-visible in tokens.css (outline: none here enables it).

import React, { useEffect, useRef, useCallback } from 'react';

interface RejectionRationaleModalProps {
  writebackId: string;
  onConfirm: (rationale: string) => void;
  onCancel: () => void;
}

export function RejectionRationaleModal({ writebackId, onConfirm, onCancel }: RejectionRationaleModalProps): React.ReactElement {
  const [rationale, setRationale] = React.useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);
  const lastFocusRef = useRef<HTMLButtonElement>(null);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Escape closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  // Focus trap: Tab / Shift+Tab stays within modal
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const focusable = [textareaRef.current, firstFocusRef.current, lastFocusRef.current].filter(Boolean) as HTMLElement[];
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  const handleConfirm = () => {
    const trimmed = rationale.trim();
    if (!trimmed) {
      textareaRef.current?.focus();
      return;
    }
    onConfirm(trimmed);
  };

  return (
    // Backdrop
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 24, 73, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 'var(--z-modal)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      aria-modal="true"
    >
      {/* Dialog */}
      <div
        role="dialog"
        aria-labelledby="reject-modal-title"
        aria-describedby="reject-modal-desc"
        onKeyDown={handleKeyDown}
        style={{
          background: 'var(--color-navy-800)',
          border: '1px solid var(--color-border-strong)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-6)',
          width: '480px',
          maxWidth: '90vw',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <h2
          id="reject-modal-title"
          style={{
            fontSize: 'var(--text-base)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-1)',
            fontWeight: 600,
          }}
        >
          Reject write-back
        </h2>
        <p
          id="reject-modal-desc"
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)',
            marginBottom: 'var(--space-4)',
            lineHeight: 'var(--leading-normal)',
          }}
        >
          <code style={{ fontFamily: 'monospace' }}>{writebackId}</code> will be archived.
          State your reason so the Synthesizer can learn from it.
        </p>
        <label
          htmlFor="rejection-rationale"
          style={{
            display: 'block',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--space-1)',
          }}
        >
          Rationale
        </label>
        <textarea
          id="rejection-rationale"
          ref={textareaRef}
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          placeholder="e.g. Conclusion doesn't match the data cited; position is already logged as DEC-041."
          rows={4}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-base)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--text-sm)',
            lineHeight: 'var(--leading-normal)',
            padding: 'var(--space-2) var(--space-3)',
            resize: 'vertical',
            outline: 'none',
            transition: 'border-color var(--motion-fast)',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-purple-500)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
          <button
            ref={firstFocusRef}
            onClick={onCancel}
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-base)',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--text-sm)',
              padding: 'var(--space-1) var(--space-4)',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            Cancel
          </button>
          <button
            ref={lastFocusRef}
            onClick={handleConfirm}
            disabled={!rationale.trim()}
            aria-disabled={!rationale.trim()}
            style={{
              background: rationale.trim() ? 'rgba(197, 72, 72, 0.85)' : 'var(--color-surface-3)',
              border: `1px solid ${rationale.trim() ? 'var(--color-error)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-base)',
              color: rationale.trim() ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              padding: 'var(--space-1) var(--space-4)',
              cursor: rationale.trim() ? 'pointer' : 'not-allowed',
              outline: 'none',
              transition: 'background var(--motion-fast), border-color var(--motion-fast)',
            }}
          >
            Reject write-back
          </button>
        </div>
      </div>
    </div>
  );
}
