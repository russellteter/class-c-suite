// apps/renderer/src/components/LinkedExecution.tsx
// Source: docs/decisions/0011-ch9-cowork-handoff.md §6.3 + AC-11
// Renders the "Linked execution" section on decision/position/pre-mortem cards
// when the originating artifact's `executed_by` field is populated.
// Hidden when executed_by is null or empty.

import React from 'react';
import '../design/tokens.css';

interface LinkedExecutionProps {
  /** Paths from the originating artifact's `executed_by` frontmatter field.
   *  Each entry is a vault-relative path to a Cowork-produced execution artifact.
   *  Null or empty array → component renders nothing. */
  executedBy: string[] | null;
  /** Callback when a path link is clicked (opens in vault / OS default handler) */
  onOpenPath?: (path: string) => void;
}

export function LinkedExecution({
  executedBy,
  onOpenPath,
}: LinkedExecutionProps): React.ReactElement | null {
  // Render nothing when no execution artifacts exist (AC-11 hidden condition)
  if (!executedBy || executedBy.length === 0) return null;

  return (
    <section
      data-testid="linked-execution"
      aria-label="Linked execution artifacts"
      style={{
        marginTop: 'var(--space-3)',
        padding: 'var(--space-2) var(--space-3)',
        background: 'rgba(79,174,106,0.07)',
        border: '1px solid rgba(79,174,106,0.20)',
        borderRadius: 'var(--radius-base)',
      }}
    >
      <div
        style={{
          fontSize: 'var(--text-2xs)',
          fontWeight: 700,
          color: 'var(--color-success)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: 'var(--space-1)',
        }}
      >
        Linked execution
      </div>
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-1)',
        }}
      >
        {executedBy.map((path) => (
          <li key={path}>
            {onOpenPath ? (
              <button
                type="button"
                onClick={() => onOpenPath(path)}
                data-testid="linked-execution-path"
                aria-label={`Open execution artifact: ${path}`}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: 'var(--text-xs)',
                  fontFamily: 'monospace',
                  color: 'var(--color-success)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px',
                  wordBreak: 'break-all',
                  textAlign: 'left',
                  // :focus-visible provided globally by tokens.css
                }}
              >
                {path}
              </button>
            ) : (
              <span
                data-testid="linked-execution-path"
                style={{
                  fontSize: 'var(--text-xs)',
                  fontFamily: 'monospace',
                  color: 'var(--color-success)',
                  wordBreak: 'break-all',
                }}
              >
                {path}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
