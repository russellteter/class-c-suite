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
import type { DegradationWarning, OutputSurface } from '@c-suite/shared-types/playbook';

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
  /** Verifier rigor score (0–100) — shown in the document sub-line. */
  rigorScore?: number | null;
  /** True when at least one accepted decision writeback exists for this memo.
   *  Gates the "Draw up for Cowork" CTA per ADR §5.1. */
  hasAcceptedDecision?: boolean;
  /** Per-table NetSuite degradation warnings (TRACK 3). Renders a banner+table. */
  degradationWarnings?: DegradationWarning[];
  /** External-document render targets (TRACK 5). Renders View-as links. */
  outputSurfaces?: OutputSurface[];
}

// ── Output-surface link helpers (TRACK 5) ─────────────────────────────────────

const SURFACE_LABEL: Record<string, string> = {
  gdoc: 'View as Google Doc',
  gsheet: 'View as Google Sheet',
  gslides: 'View as Google Slides',
  gdrive_upload: 'View in Google Drive',
};

function renderableSurfaces(surfaces?: OutputSurface[]): OutputSurface[] {
  // 'memo' is the markdown itself (already shown); only link external artifacts with a URL.
  return (surfaces ?? []).filter((s) => s.kind !== 'memo' && typeof s.url === 'string' && s.url.length > 0);
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
          className="cs-cite"
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
  const surfaces = renderableSurfaces(memo.outputSurfaces);
  const warnings = memo.degradationWarnings ?? [];
  const panelOpen = !!(sidePanel || sidePanelLoading);
  const statusLabel = memo.status === 'clean' ? 'Clean' : 'Draft';
  const rigorLabel = memo.rigorScore != null ? ` · Rigor ${memo.rigorScore}/100` : '';

  function safePretty(json: string): string {
    try {
      return JSON.stringify(JSON.parse(json), null, 2);
    } catch {
      return json;
    }
  }

  return (
    <div
      className="cs-memo"
      style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--gray-50)', fontFamily: 'var(--font-sans)' }}
      data-testid="memo-viewer"
    >
      {/* Editorial header with filename stamp + Draw-up CTA */}
      <header className="cs-header">
        <h1>{memo.memoTitle ?? 'Cash Memo'}</h1>
        {memo.filename && (
          <span className="cs-stamp" data-testid="memo-filename">{memo.filename}</span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {surfaces.map((s, i) => (
            <a
              key={`surface-${i}`}
              className="cs-surface-link"
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`output-surface-${s.kind}`}
            >
              {s.title ?? SURFACE_LABEL[s.kind] ?? 'View document'} ↗
            </a>
          ))}
          {memo.status === 'clean' && memo.hasAcceptedDecision && (
            <DrawUpCTA onClick={handleDrawUpForCowork} data-testid="memo-viewer-draw-up-cta" />
          )}
        </div>
      </header>

      {/* Two-column body: memo + docked tool-call panel */}
      <div
        style={{ flex: 1, display: 'grid', gridTemplateColumns: panelOpen ? '1fr 300px' : '1fr', overflow: 'hidden' }}
      >
        <div style={{ overflow: 'auto', padding: '22px 26px' }}>
          {/* Degradation warnings (TRACK 3) */}
          {warnings.length > 0 && (
            <div className="cs-degrade" role="status" aria-label="Degraded data sources" data-testid="degradation-banner">
              <div className="hd">
                <span className="cs-dot y" /> {warnings.length} data source{warnings.length !== 1 ? 's' : ''} unavailable
              </div>
              <table>
                <thead>
                  <tr><th>Table</th><th>Reason</th><th>Remediation</th></tr>
                </thead>
                <tbody>
                  {warnings.map((w, i) => (
                    <tr key={`warn-${i}`} data-testid="degradation-row">
                      <td><span className="tbl">{w.table}</span></td>
                      <td>{w.reason}</td>
                      <td>{w.remediation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* DRAFT banner (AC-8) */}
          {memo.status === 'draft' && (
            <div className="cs-draft" role="banner" aria-label="DRAFT" style={{ marginBottom: '16px' }} data-testid="draft-banner">
              <div className="t">DRAFT — Rigor below 70% threshold</div>
              <div className="d">Citations are still functional. Review failure reasons before sharing.</div>
              {memo.failureReasons && memo.failureReasons.length > 0 && (
                <button className="why" onClick={() => setDraftExpanded(e => !e)} data-testid="draft-expand-btn">
                  {draftExpanded ? 'Hide' : 'Why draft?'} ({memo.failureReasons.length} reason{memo.failureReasons.length !== 1 ? 's' : ''})
                </button>
              )}
              {draftExpanded && memo.failureReasons && (
                <ul data-testid="draft-failure-reasons">
                  {memo.failureReasons.map((reason, i) => (<li key={i}>{reason}</li>))}
                </ul>
              )}
            </div>
          )}

          <div className="cs-eyebrow" style={{ marginBottom: '14px' }}>
            Memo · {memo.memoTitle ?? 'Cash Lever'} · {statusLabel}
          </div>

          {/* Memo document surface */}
          <div className="cs-doc" data-testid="memo-content">
            <div className="sub">Generated {memo.runId}{rigorLabel}</div>
            {memoContent}
          </div>
        </div>

        {/* Tool-call detail panel (AC-7) — docked right */}
        {panelOpen && (
          <aside className="cs-panel" role="complementary" aria-label="Tool call detail" data-testid="tool-call-panel">
            <div className="ph">
              <span className="t">Tool Call Detail</span>
              <button className="x" onClick={() => setSidePanel(null)} data-testid="tool-call-panel-close">Close</button>
            </div>
            {sidePanelLoading ? (
              <div className="cs-skel" style={{ height: '120px' }} data-testid="tool-call-panel-loading" />
            ) : sidePanel ? (
              <>
                <div className="fld"><div className="l">Source ID</div><code>{sidePanel.sourceId}</code></div>
                <div className="fld"><div className="l">Tool Name</div><code style={{ color: 'var(--navy)' }}>{sidePanel.tool_name}</code></div>
                <div className="fld"><div className="l">Arguments</div><pre>{safePretty(sidePanel.args_json)}</pre></div>
                <div className="fld"><div className="l">Result</div><pre style={{ maxHeight: '300px' }}>{safePretty(sidePanel.result_json)}</pre></div>
                <div className="fld">
                  <div className="l">Called At</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--navy)' }} className="num">
                    {sidePanel.called_at ? new Date(sidePanel.called_at * 1000).toISOString() : '—'}
                  </div>
                </div>
              </>
            ) : null}
          </aside>
        )}
      </div>
    </div>
  );
}
