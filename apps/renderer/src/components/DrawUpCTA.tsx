// apps/renderer/src/components/DrawUpCTA.tsx
// Source: docs/decisions/0011-ch9-cowork-handoff.md §5.1 (AC-6)
// "Draw up for Cowork" CTA button — placed on 4 accepted-artifact surfaces:
//   1. MemoViewer header (when shipped-clean + has accepted decision)
//   2. Accepted decision cards (AcceptedHistory)
//   3. Accepted position cards (AcceptedHistory)
//   4. Accepted pre-mortem cards (AcceptedHistory)
// NOT on: prediction, stakeholder-update, or workstream-advance cards.

import React from 'react';
import '../design/tokens.css';

interface DrawUpCTAProps {
  /** Triggered when Russell clicks "Draw up for Cowork" */
  onClick: () => void;
  /** Optional additional CSS class */
  className?: string;
  /** Icon size in px (default 12) */
  iconSize?: number;
}

// Small "send to external" icon — simplified arrow-up-right shape.
function SendIcon({ size = 12 }: { size?: number }): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M2 10L10 2M10 2H5M10 2V7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DrawUpCTA({
  onClick,
  className,
  iconSize = 12,
}: DrawUpCTAProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      data-testid="draw-up-cta"
      aria-label="Draw up for Cowork — generate an execution handoff brief"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        padding: '4px 10px',
        fontSize: 'var(--text-xs)',
        fontWeight: 600,
        color: 'var(--gold)',
        background: 'rgba(255,186,0,0.10)',
        border: '1px solid rgba(255,186,0,0.30)',
        borderRadius: 'var(--radius-base)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: `background var(--motion-base), border-color var(--motion-base)`,
        // :focus-visible handled globally by tokens.css — uses --focus-ring
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,186,0,0.18)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,186,0,0.55)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,186,0,0.10)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,186,0,0.30)';
      }}
    >
      <SendIcon size={iconSize} />
      Draw up for Cowork
    </button>
  );
}
