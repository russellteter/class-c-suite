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

  const submitBlocked = submitDisabled || !value.trim();

  return (
    <section
      role="search"
      aria-label="Open Q&A — ask the C-Suite anything"
    >
      <label id="qa-label" htmlFor="open-qa-input" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        Open Q&amp;A — ask the C-Suite anything
      </label>

      {/* Inline Q&A row (Variant A) */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
        <textarea
          id="open-qa-input"
          ref={textareaRef}
          aria-labelledby="qa-label"
          className="cs-input"
          placeholder="Ask anything — decomposes into a playbook…"
          value={value}
          rows={1}
          style={{
            flex: 1,
            resize: 'none',
            minHeight: '40px',
            maxHeight: '200px',
            overflow: 'hidden',
            lineHeight: 1.4,
            boxShadow: focused ? '0 0 0 3px rgba(71,57,231,0.1)' : 'none',
            borderColor: focused ? 'var(--purple)' : 'var(--gray-300)',
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="cs-btn"
          aria-label="Submit question to C-Suite"
          disabled={submitBlocked}
          onClick={() => {
            const trimmed = value.trim();
            if (trimmed && !submitDisabled) onSubmit(trimmed);
          }}
        >
          Run
        </button>
      </div>

      {/* Decomposer preview — Phase A: always null; renders when wired in Phase B */}
      {decomposerPreview !== null && (
        <div
          aria-live="polite"
          aria-label="Routing preview"
          style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
        >
          <span className="cs-eyebrow">Routes to</span>
          {decomposerPreview.lenses.map((lens) => (
            <span key={lens} className="cs-pill info">{lens}</span>
          ))}
        </div>
      )}
    </section>
  );
}
