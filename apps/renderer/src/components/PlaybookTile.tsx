// apps/renderer/src/components/PlaybookTile.tsx
// Source: tasks/ch7-renderer-brief.md §2 — Variant A uniform 4×2 tile.
// WCAG AA: :focus-visible ring via tokens.css global rule; aria-label on each tile.
// Disabled state if blocked prop is set; tooltip via title attribute.

import React from 'react';
import type { PlaybookId, FreshnessState } from './HomeTypes.js';

// TRACK 6 (ch6.3d): restyled to Editorial Sharp (.cs-pb in ccc-components.css).
// White paper card, mono ordinal + keyboard hint, purple accent strip on hover.
// All props, a11y, and keyboard behavior preserved.

const FRESHNESS_COLOR: Record<FreshnessState, string> = {
  green: 'var(--success)',
  amber: 'var(--gold)',
  gray: 'var(--gray-300)',
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
      className="cs-pb"
      style={{
        minHeight: '94px',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        ...(blocked ? { opacity: 0.45, cursor: 'not-allowed', pointerEvents: 'none' } : {}),
      }}
      onClick={() => !blocked && onClick?.(id)}
      onKeyDown={(e) => {
        if (!blocked && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.(id);
        }
      }}
    >
      {/* Top row: icon + freshness dot */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <span className="ico" aria-hidden="true" role="img">{icon}</span>
        <span
          aria-hidden="true"
          title={freshness === 'green' ? 'Run < 24h ago' : freshness === 'amber' ? 'Run < 7d ago' : 'Run 7+ days ago or never'}
          style={{ width: '6px', height: '6px', borderRadius: '50%', background: FRESHNESS_COLOR[freshness], marginTop: '4px', flexShrink: 0 }}
        />
      </div>

      {/* Playbook name */}
      <div className="nm" style={{ flex: 1 }}>{name}</div>

      {/* Footer: last run + keyboard hint */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '6px' }}>
        <span className="hint">{lastRunLabel}</span>
        <kbd className="hint" aria-hidden="true">{keyboardHint}</kbd>
      </div>
    </div>
  );
}
