// apps/renderer/src/components/OpenDecisionsList.tsx
// Source: tasks/ch7-renderer-brief.md §2
// Left-rail open decisions list. 5 rows max.
// Click → vault.openFile IPC if present; console.log stub with TODO otherwise.
// WCAG AA: tabIndex, aria-label, :focus-visible via tokens.css.

import React from 'react';
import type { DecisionSummary } from './HomeTypes.js';

export interface OpenDecisionsListProps {
  decisions: DecisionSummary[];
}

export function OpenDecisionsList({ decisions }: OpenDecisionsListProps): React.ReactElement {
  if (decisions.length === 0) {
    return (
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '0 var(--space-3)' }}>
        No open decisions.
      </p>
    );
  }

  const visible = decisions.slice(0, 5);

  function handleClick(decision: DecisionSummary) {
    // TODO ch7-phase-b: wire vault.openFile IPC when utility exposes the handler.
    // For now, log the intent so the click is testable by RTL.
    if (typeof window !== 'undefined' && window.ipc) {
      // vault.openFile is not yet in the IpcMessage union; send raw via window.ipc.
      // TODO ch7-phase-b: wire vault.openFile variant in shared-types/ipc.ts, then use sendIpc().
      console.log('[OpenDecisionsList] open decision file:', decision.id);
      window.ipc.send({ kind: 'vault.openFile', payload: { decisionId: decision.id } });
    } else {
      console.log('[OpenDecisionsList] stub: open decision', decision.id);
    }
  }

  return (
    <div role="list" aria-label="Open decisions">
      {visible.map((dec) => (
        <div
          key={dec.id}
          role="listitem"
          tabIndex={0}
          aria-label={`${dec.id}: ${dec.title}`}
          style={{
            padding: 'var(--space-1) var(--space-2)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            transition: 'background var(--motion-fast)',
          }}
          onClick={() => handleClick(dec)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClick(dec);
            }
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--color-surface-1)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-2xs)',
              color: 'var(--color-purple-400)',
            }}
          >
            {dec.id}
          </span>
          <span
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)',
              lineHeight: 'var(--leading-snug)',
            }}
          >
            {dec.title}
          </span>
        </div>
      ))}
    </div>
  );
}
