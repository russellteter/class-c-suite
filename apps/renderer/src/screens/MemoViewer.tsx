// apps/renderer/src/screens/MemoViewer.tsx
// Source: docs/decisions/0006-ch5-cash-lever-slice.md §5 (memo viewer contract)
//         docs/decisions/0006-ch5-cash-lever-slice.md §8 AC-7 (click-claim)
//         docs/decisions/0006-ch5-cash-lever-slice.md §8 AC-8 (DRAFT path)
//
// Renders memo markdown.
// Each [^source-id] footnote → <button class="glass-badge--purple">.
// Click → IPC invoke 'tool-call:get' → side panel shows tool_calls row.
// DRAFT banner if memo.status === 'draft' (amber, expandable failure_reasons).

import React, { useState, useCallback } from 'react';
import { invokeToolCallGet } from '../ipc/subscriptions.js';
import { DrawUpCTA } from '../components/DrawUpCTA.js';
import { sendHandoffPreviewRequested } from '../ipc/handoff.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MemoViewerMemo {
  runId: string;
  memoMarkdown: string;
  status: 'clean' | 'draft';
  failureReasons?: string[];
  /** The filename to display (e.g. 2026-05-27-cash-lever-loc-vs-aws.draft.md) */
  filename?: string;
  /** Vault-relative path to the memo file (used in handoff origin link) */
  memoPath?: string;
  /** Memo title (used in handoff origin label) */
  memoTitle?: string;
  /** True when at least one accepted decision writeback exists for this memo.
   *  Gates the "Draw up for Cowork" CTA per ADR §5.1. */
  hasAcceptedDecision?: boolean;
}

interface ToolCallSidePanel {
  sourceId: string;
  tool_name: string;
  args_json: string;
  result_json: string;
  called_at: number;
}

// ── Markdown → React with clickable citations ─────────────────────────────────

/**
 * Parse memo markdown and return segments: plain text or citation buttons.
 * Footnote pattern: [^source-id] → clickable badge.
 * Exported for reuse in HandoffPreview (Ch.9) — same rendering pattern.
 */
export function parseMemoMarkdown(
  markdown: string,
  onCitationClick: (sourceId: string) => void,
): React.ReactNode[] {
  const segments: React.ReactNode[] = [];
  // Split on [^...] footnote markers
  const parts = markdown.split(/(\[\^[^\]]+\])/g);

  parts.forEach((part, i) => {
    const match = part.match(/^\[\^([^\]]+)\]$/);
    if (match) {
      const sourceId = match[1];
      segments.push(
        <button
          key={`citation-${sourceId}-${i}`}
          className="glass-badge glass-badge--purple"
          style={{ cursor: 'pointer', border: 'none', fontSize: '10px', verticalAlign: 'super' }}
          onClick={() => onCitationClick(sourceId)}
          aria-label={`Source: ${sourceId}`}
          data-source-id={sourceId}
        >
          [{sourceId}]
        </button>,
      );
    } else if (part) {
      // Render newlines as <br /> for basic markdown display
      const lines = part.split('\n');
      lines.forEach((line, li) => {
        if (li > 0) segments.push(<br key={`br-${i}-${li}`} />);
        if (line.startsWith('# ')) {
          segments.push(<h1 key={`h1-${i}-${li}`}>{line.slice(2)}</h1>);
        } else if (line.startsWith('## ')) {
          segments.push(<h2 key={`h2-${i}-${li}`}>{line.slice(3)}</h2>);
        } else if (line.startsWith('### ')) {
          segments.push(<h3 key={`h3-${i}-${li}`}>{line.slice(4)}</h3>);
        } else {
          segments.push(<React.Fragment key={`text-${i}-${li}`}>{line}</React.Fragment>);
        }
      });
    }
  });

  return segments;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface MemoViewerProps {
  memo: MemoViewerMemo;
  onClose?: () => void;
}

export function MemoViewer({ memo, onClose }: MemoViewerProps): React.ReactElement {
  const [sidePanel, setSidePanel] = useState<ToolCallSidePanel | null>(null);
  const [sidePanelLoading, setSidePanelLoading] = useState(false);
  const [draftExpanded, setDraftExpanded] = useState(false);

  const handleDrawUpForCowork = useCallback(() => {
    // ADR §5.1: only fires when memo is shipped-clean + has accepted decision
    // TODO ch9-runtime-ship: Runtime's run-loop.ts hook listens for this IPC variant
    sendHandoffPreviewRequested({
      runId: memo.runId,
      originType: 'memo',
      originPath: memo.memoPath ?? memo.filename ?? memo.runId,
      originTitle: memo.memoTitle ?? memo.filename ?? 'Memo',
    });
  }, [memo.runId, memo.memoPath, memo.filename, memo.memoTitle]);

  const handleCitationClick = useCallback(async (sourceId: string) => {
    setSidePanelLoading(true);
    try {
      const row = await invokeToolCallGet(sourceId);
      if (row) {
        setSidePanel({ sourceId, ...row });
      } else {
        setSidePanel({
          sourceId,
          tool_name: '(no tool call found)',
          args_json: '{}',
          result_json: '{}',
          called_at: 0,
        });
      }
    } finally {
      setSidePanelLoading(false);
    }
  }, []);

  const memoContent = parseMemoMarkdown(memo.memoMarkdown, handleCitationClick);

  return (
    <div
      style={{ fontFamily: 'var(--font-sans)', display: 'flex', minHeight: '100vh', background: 'var(--bg-surface)' }}
      data-testid="memo-viewer"
    >
      {/* Main memo area */}
      <div style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
        {/* DRAFT banner (AC-8) */}
        {memo.status === 'draft' && (
          <div
            className="draft-banner"
            role="banner"
            aria-label="DRAFT"
            style={{ marginBottom: '20px' }}
            data-testid="draft-banner"
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#92400e', marginBottom: '4px' }}>
                DRAFT — Rigor below 70% threshold
              </div>
              <div style={{ fontSize: '12px', color: '#78350f' }}>
                Citations are still functional. Review failure reasons before sharing.
              </div>
              {memo.failureReasons && memo.failureReasons.length > 0 && (
                <button
                  className="glass-btn-secondary"
                  style={{ marginTop: '8px', fontSize: '11px', padding: '4px 10px', color: '#92400e', borderColor: 'rgba(217,119,6,0.3)' }}
                  onClick={() => setDraftExpanded(e => !e)}
                  data-testid="draft-expand-btn"
                >
                  {draftExpanded ? 'Hide' : 'Why draft?'} ({memo.failureReasons.length} reason{memo.failureReasons.length !== 1 ? 's' : ''})
                </button>
              )}
              {draftExpanded && memo.failureReasons && (
                <ul style={{ marginTop: '8px', paddingLeft: '16px', fontSize: '12px', color: '#78350f' }} data-testid="draft-failure-reasons">
                  {memo.failureReasons.map((reason, i) => (
                    <li key={i} style={{ marginBottom: '4px' }}>{reason}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Memo filename + Draw up for Cowork CTA */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          {memo.filename && (
            <span className="glass-badge glass-badge--navy" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
              {memo.filename}
            </span>
          )}
          {/* CTA: only when shipped-clean + has at least one accepted decision writeback (ADR §5.1) */}
          {memo.status === 'clean' && memo.hasAcceptedDecision && (
            <DrawUpCTA
              onClick={handleDrawUpForCowork}
              data-testid="memo-viewer-draw-up-cta"
            />
          )}
        </div>

        {/* Memo content */}
        <div
          className="glass-card"
          style={{ lineHeight: 1.7, fontSize: '14px', color: 'var(--navy)' }}
          data-testid="memo-content"
        >
          {memoContent}
        </div>
      </div>

      {/* Tool-call side panel (AC-7) */}
      {(sidePanel || sidePanelLoading) && (
        <aside
          style={{
            width: '380px',
            borderLeft: '1px solid var(--glass-border)',
            background: 'var(--bg-surface-alt)',
            padding: '20px',
            overflow: 'auto',
          }}
          role="complementary"
          aria-label="Tool call detail"
          data-testid="tool-call-panel"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--navy)' }}>Tool Call Detail</h3>
            <button
              className="glass-btn-secondary"
              style={{ padding: '4px 10px', fontSize: '11px' }}
              onClick={() => setSidePanel(null)}
              data-testid="tool-call-panel-close"
            >
              Close
            </button>
          </div>

          {sidePanelLoading ? (
            <div className="skeleton" style={{ height: '120px' }} data-testid="tool-call-panel-loading" />
          ) : sidePanel ? (
            <>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                  Source ID
                </div>
                <code style={{ fontSize: '12px', color: 'var(--purple)' }}>{sidePanel.sourceId}</code>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                  Tool Name
                </div>
                <code style={{ fontSize: '12px', color: 'var(--navy)' }}>{sidePanel.tool_name}</code>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                  Arguments
                </div>
                <pre style={{ fontSize: '11px', background: 'var(--glass-bg)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', overflow: 'auto', margin: 0 }}>
                  {JSON.stringify(JSON.parse(sidePanel.args_json), null, 2)}
                </pre>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                  Result
                </div>
                <pre style={{ fontSize: '11px', background: 'var(--glass-bg)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', overflow: 'auto', margin: 0, maxHeight: '300px' }}>
                  {JSON.stringify(JSON.parse(sidePanel.result_json), null, 2)}
                </pre>
              </div>

              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                  Called At
                </div>
                <div style={{ fontSize: '12px', color: 'var(--navy)', fontFamily: 'var(--font-mono)' }}>
                  {sidePanel.called_at ? new Date(sidePanel.called_at * 1000).toISOString() : '—'}
                </div>
              </div>
            </>
          ) : null}
        </aside>
      )}
    </div>
  );
}
