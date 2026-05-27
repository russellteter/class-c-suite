// apps/renderer/src/components/DiffView.tsx
// Source: ch6-renderer-brief.md §Shared components
// Renders a unified diff string with +/- lines color-coded.
// Monospace. Reused across WritebackPane (inline preview) and AcceptedHistory (full).

import React, { useMemo } from 'react';

interface DiffViewProps {
  /** Unified diff string. Lines starting with '+' are additions, '-' are removals. */
  diff: string;
  /** If set, truncates to this many lines and shows an overflow indicator. */
  maxLines?: number;
  className?: string;
}

interface ParsedLine {
  raw: string;
  type: 'add' | 'remove' | 'context' | 'header';
}

function parseDiff(diff: string): ParsedLine[] {
  return diff.split('\n').map((raw) => {
    if (raw.startsWith('+++') || raw.startsWith('---') || raw.startsWith('@@')) {
      return { raw, type: 'header' };
    }
    if (raw.startsWith('+')) return { raw, type: 'add' };
    if (raw.startsWith('-')) return { raw, type: 'remove' };
    return { raw, type: 'context' };
  });
}

const lineStyles: Record<ParsedLine['type'], React.CSSProperties> = {
  add: {
    background: 'rgba(79, 174, 106, 0.12)',
    color: 'var(--color-success)',
  },
  remove: {
    background: 'rgba(255, 92, 92, 0.12)',
    color: 'var(--color-error)',
  },
  header: {
    color: 'var(--color-text-muted)',
    fontStyle: 'italic',
  },
  context: {
    color: 'var(--color-text-secondary)',
  },
};

export function DiffView({ diff, maxLines, className }: DiffViewProps): React.ReactElement {
  const lines = useMemo(() => parseDiff(diff), [diff]);

  const displayLines = maxLines ? lines.slice(0, maxLines) : lines;
  const truncated = maxLines && lines.length > maxLines;

  return (
    <div
      className={className}
      style={{
        fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", ui-monospace, monospace',
        fontSize: 'var(--text-xs)',
        lineHeight: 'var(--leading-tight)',
        background: 'var(--color-surface-1)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-base)',
        overflow: 'auto',
      }}
      role="region"
      aria-label="Diff preview"
    >
      {displayLines.map((line, i) => (
        <div
          key={i}
          style={{
            padding: '1px var(--space-2)',
            whiteSpace: 'pre',
            ...lineStyles[line.type],
          }}
        >
          {line.raw || ' '}
        </div>
      ))}
      {truncated && (
        <div
          style={{
            padding: '2px var(--space-2)',
            color: 'var(--color-text-muted)',
            fontSize: 'var(--text-xs)',
            borderTop: '1px solid var(--color-border)',
            textAlign: 'center',
          }}
        >
          +{lines.length - maxLines!} more lines
        </div>
      )}
    </div>
  );
}
