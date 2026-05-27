// apps/renderer/src/components/OpenQABar.tsx
// Source: tasks/ch7-renderer-brief.md §2 — Variant A inline Open Q&A bar.
// WCAG AA: explicit label, :focus-visible ring (tokens.css global), aria-live on preview.
// Cmd+Enter submits (macOS metaKey). Auto-grows to max-height 200px.

import React, { useRef, useEffect } from 'react';
import type { LensRole, McpId } from './HomeTypes.js';

export interface DecomposerPreview {
  lenses: LensRole[];
  mcps: McpId[];
}

export interface OpenQABarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  /** null in Phase A — decomposer preview wiring deferred to Phase B */
  decomposerPreview: DecomposerPreview | null;
  submitDisabled?: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function OpenQABar({
  value,
  onChange,
  onSubmit,
  decomposerPreview,
  submitDisabled = false,
}: OpenQABarProps): React.ReactElement {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = React.useState(false);

  // Auto-grow textarea: reset height to auto, then set to scrollHeight
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Cmd+Enter (macOS) submits
    if (e.metaKey && e.key === 'Enter') {
      e.preventDefault();
      const trimmed = value.trim();
      if (trimmed && !submitDisabled) {
        onSubmit(trimmed);
      }
    }
  }

  const containerBorder = focused
    ? 'rgba(71,57,231,0.5)'
    : 'rgba(71,57,231,0.25)';

  const containerShadow = focused
    ? '0 0 0 3px rgba(71,57,231,0.1)'
    : 'none';

  return (
    <section
      role="search"
      aria-label="Open Q&A — ask the C-Suite anything"
      style={{
        background: 'linear-gradient(135deg, rgba(71,57,231,0.07) 0%, rgba(24,42,107,0.6) 100%)',
        border: `1px solid ${containerBorder}`,
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3) var(--space-4)',
        marginBottom: 'var(--space-3)',
        transition: 'border-color var(--motion-fast), box-shadow var(--motion-fast)',
        boxShadow: containerShadow,
      }}
    >
      {/* Top row: label + shortcut hint */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
        <label
          id="qa-label"
          htmlFor="open-qa-input"
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            color: 'var(--color-purple-400)',
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            cursor: 'default',
          }}
        >
          Open Q&amp;A
        </label>
        <span
          style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginLeft: 'auto' }}
          aria-hidden="true"
        >
          <kbd
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '1px 4px',
            }}
          >
            ⌘/
          </kbd>{' '}
          to focus &nbsp;|&nbsp;{' '}
          <kbd
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '1px 4px',
            }}
          >
            ⌘↵
          </kbd>{' '}
          to submit
        </span>
      </div>

      {/* Textarea */}
      <textarea
        id="open-qa-input"
        ref={textareaRef}
        aria-labelledby="qa-label"
        placeholder="Ask anything (decomposes ad-hoc; ⌘/ to focus)"
        value={value}
        rows={1}
        style={{
          width: '100%',
          background: 'rgba(10,24,73,0.7)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-base)',
          color: 'var(--color-text-primary)',
          fontFamily: 'inherit',
          fontSize: 'var(--text-sm)',
          lineHeight: 'var(--leading-normal)',
          padding: 'var(--space-2) var(--space-3)',
          resize: 'none',
          minHeight: '60px',
          maxHeight: '200px',
          overflow: 'hidden',
          transition: `border-color var(--motion-fast), box-shadow var(--motion-fast)`,
          boxShadow: focused ? '0 0 0 2px rgba(71,57,231,0.15)' : 'none',
          borderColor: focused ? 'var(--color-purple-500)' : 'var(--color-border)',
          // :focus-visible handled globally by tokens.css, but we also style for all focus
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      {/* Action row: submit button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
        <button
          type="button"
          aria-label="Submit question to C-Suite"
          disabled={submitDisabled || !value.trim()}
          onClick={() => {
            const trimmed = value.trim();
            if (trimmed && !submitDisabled) onSubmit(trimmed);
          }}
          style={{
            background: submitDisabled || !value.trim() ? 'rgba(71,57,231,0.35)' : 'var(--color-purple-500)',
            border: 'none',
            borderRadius: 'var(--radius-base)',
            color: 'var(--color-text-primary)',
            fontFamily: 'inherit',
            fontSize: 'var(--text-xs)',
            fontWeight: 500,
            padding: '7px var(--space-4)',
            cursor: submitDisabled || !value.trim() ? 'not-allowed' : 'pointer',
            transition: 'opacity var(--motion-fast), background var(--motion-fast)',
            opacity: submitDisabled || !value.trim() ? 0.6 : 1,
          }}
        >
          Ask C-Suite
        </button>
        <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-text-muted)' }} aria-hidden="true">
          or press{' '}
          <kbd
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-2xs)',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '1px 3px',
            }}
          >
            ⌘↵
          </kbd>
        </span>
      </div>

      {/* Decomposer preview — Phase A: always null; renders when wired in Phase B */}
      {decomposerPreview !== null && (
        <div
          aria-live="polite"
          aria-label="Routing preview"
          style={{
            marginTop: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-3)',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-xs)',
          }}
        >
          <div
            style={{
              fontSize: 'var(--text-2xs)',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: 'var(--color-text-muted)',
              marginBottom: 'var(--space-1)',
            }}
          >
            Decomposer routing preview
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {decomposerPreview.lenses.map((lens) => (
              <span
                key={lens}
                style={{
                  fontSize: 'var(--text-xs)',
                  background: 'rgba(71,57,231,0.15)',
                  border: '1px solid rgba(71,57,231,0.3)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '2px var(--space-2)',
                  color: 'var(--color-purple-400)',
                  fontWeight: 500,
                }}
              >
                {lens}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
