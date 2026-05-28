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

// TRACK 6 (ch6.3e): CCC editorial tokens — teal-add / red-remove tints (gap 5),
// navy ink, gray-200 surfaces. The write-back review diff pane.
const lineStyles: Record<ParsedLine['type'], React.CSSProperties> = {
  add: {
    background: 'var(--success-soft)',
    color: 'var(--success-ink)',
  },
  remove: {
    background: 'var(--error-soft)',
    color: 'var(--error-ink)',
  },
  header: {
    color: 'var(--gray-500)',
    fontStyle: 'italic',
  },
  context: {
    color: 'var(--gray-700)',
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
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        lineHeight: 1.5,
        background: 'var(--gray-50)',
        border: '1px solid var(--gray-200)',
        borderRadius: 'var(--r-sm)',
        overflow: 'auto',
      }}
      role="region"
      aria-label="Diff preview"
    >
      {displayLines.map((line, i) => (
        <div
          key={i}
          style={{
            padding: '1px 8px',
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
            padding: '2px 8px',
            color: 'var(--gray-500)',
            fontSize: '11px',
            borderTop: '1px solid var(--gray-200)',
            textAlign: 'center',
          }}
        >
          +{lines.length - maxLines!} more lines
        </div>
      )}
    </div>
  );
}
