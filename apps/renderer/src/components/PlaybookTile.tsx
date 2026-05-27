// apps/renderer/src/components/PlaybookTile.tsx
// Source: tasks/ch7-renderer-brief.md §2 — Variant A uniform 4×2 tile.
// WCAG AA: :focus-visible ring via tokens.css global rule; aria-label on each tile.
// Disabled state if blocked prop is set; tooltip via title attribute.

import React from 'react';
import type { PlaybookId, FreshnessState } from './HomeTypes.js';

// ── Styles (inline to avoid adding a separate CSS file; token vars from tokens.css) ──

const TILE_STYLE: React.CSSProperties = {
  background: 'var(--color-navy-700)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-3) var(--space-3) var(--space-2)',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  minHeight: '110px',
  width: '140px',
  position: 'relative',
  transition: 'border-color var(--motion-fast), background var(--motion-fast), transform var(--motion-fast), box-shadow var(--motion-fast)',
  userSelect: 'none',
};

const TILE_HOVER_STYLE: React.CSSProperties = {
  borderColor: 'rgba(106,92,240,0.5)',
  background: 'rgba(71,57,231,0.06)',
  transform: 'translateY(-2px)',
  boxShadow: 'var(--shadow-base)',
};

const TILE_BLOCKED_STYLE: React.CSSProperties = {
  opacity: 0.45,
  cursor: 'not-allowed',
  pointerEvents: 'none',
};

const FRESHNESS_DOT: React.CSSProperties = {
  position: 'absolute',
  top: '10px',
  right: '10px',
  width: '6px',
  height: '6px',
  borderRadius: '50%',
};

const FRESHNESS_COLOR: Record<FreshnessState, string> = {
  green: 'var(--color-success)',
  amber: 'var(--color-warning)',
  gray: 'var(--color-text-muted)',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatLastRun(date: Date | null): string {
  if (!date) return 'Never run';
  const diffMs = Date.now() - date.getTime();
  const diffH = diffMs / (1000 * 60 * 60);
  if (diffH < 1) return '<1h ago';
  if (diffH < 24) return `${Math.floor(diffH)}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return '1d ago';
  return `${diffD}d ago`;
}

// ── Props ──────────────────────────────────────────────────────────────────────

export interface PlaybookTileProps {
  ordinal: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  id: PlaybookId;
  name: string;
  /** Emoji string or ReactNode. Rendered at 18px. */
  icon: string | React.ReactNode;
  lastRunAt: Date | null;
  freshness: FreshnessState;
  keyboardHint: string;
  blocked?: boolean;
  blockedReason?: string;
  onClick?: (id: PlaybookId) => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function PlaybookTile({
  ordinal,
  id,
  name,
  icon,
  lastRunAt,
  freshness,
  keyboardHint,
  blocked = false,
  blockedReason,
  onClick,
}: PlaybookTileProps): React.ReactElement {
  const [hovered, setHovered] = React.useState(false);

  const mergedStyle: React.CSSProperties = {
    ...TILE_STYLE,
    ...(hovered && !blocked ? TILE_HOVER_STYLE : {}),
    ...(blocked ? TILE_BLOCKED_STYLE : {}),
  };

  const lastRunLabel = formatLastRun(lastRunAt);
  const ariaLabel = blocked
    ? `Playbook ${ordinal}: ${name} — blocked${blockedReason ? `: ${blockedReason}` : ''}`
    : `Playbook ${ordinal}: ${name}${lastRunAt ? `, last run ${lastRunLabel}` : ', never run'}`;

  return (
    <div
      role="button"
      tabIndex={blocked ? -1 : 0}
      aria-label={ariaLabel}
      aria-disabled={blocked}
      title={blocked && blockedReason ? blockedReason : undefined}
      style={mergedStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => !blocked && onClick?.(id)}
      onKeyDown={(e) => {
        if (!blocked && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.(id);
        }
      }}
    >
      {/* Freshness dot — top-right corner */}
      <div
        style={{ ...FRESHNESS_DOT, background: FRESHNESS_COLOR[freshness] }}
        aria-hidden="true"
        title={freshness === 'green' ? 'Run < 24h ago' : freshness === 'amber' ? 'Run < 7d ago' : 'Run 7+ days ago or never'}
      />

      {/* Top row: ordinal badge + icon */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
        <span
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)',
            padding: '1px 5px',
            flexShrink: 0,
            lineHeight: '1.4',
          }}
          aria-hidden="true"
        >
          {ordinal}
        </span>
        <span
          style={{ fontSize: '18px', lineHeight: 1, flexShrink: 0 }}
          aria-hidden="true"
          role="img"
        >
          {icon}
        </span>
      </div>

      {/* Playbook name */}
      <div
        style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          lineHeight: 'var(--leading-snug)',
          flex: 1,
        }}
      >
        {name}
      </div>

      {/* Footer: last run + keyboard hint */}
      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          paddingTop: 'var(--space-1)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          {lastRunLabel}
        </span>
        <kbd
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px 6px',
            color: 'var(--color-text-muted)',
          }}
          aria-hidden="true"
        >
          {keyboardHint}
        </kbd>
      </div>
    </div>
  );
}
