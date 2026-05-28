// apps/renderer/src/screens/Home.tsx
// TRACK 6 (ch6.3d): rewritten to Variant A — Editorial Sharp (Russell-confirmed 2026-05-28).
// Source: ~/Desktop/csuite-design-home.html Variant A; ADR-0014 CCC adoption.
// Layout: navy gradient header → 3-col body (tree 200px | content 1fr | right 168px).
// Keeps all Ch.7/Ch.10 hooks, handlers, keyboard shortcuts, and live IPC components
// (TripwireBanner, CatchupToast, JobsStrip own their own scheduler.* subscriptions).

import React, { useState } from 'react';
import { PlaybookTile } from '../components/PlaybookTile.js';
import { OpenQABar } from '../components/OpenQABar.js';
import { JobsStrip } from '../components/JobsStrip.js';
import { CatchupToast } from '../components/CatchupToast.js';
import { TripwireBanner } from '../components/TripwireBanner.js';
import { useHomeData } from '../hooks/useHomeData.js';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts.js';
import type { PlaybookTileData, PlaybookId } from '../components/HomeTypes.js';

// ── Playbook tile catalogue (Cmd+1..Cmd+8) ────────────────────────────────────

function computeFreshness(lastRunAt: Date | null): PlaybookTileData['freshness'] {
  if (!lastRunAt) return 'gray';
  const diffH = (Date.now() - lastRunAt.getTime()) / (1000 * 60 * 60);
  if (diffH < 24) return 'green';
  if (diffH < 24 * 7) return 'amber';
  return 'gray';
}

const TILE_CATALOGUE: Omit<PlaybookTileData, 'lastRunAt' | 'freshness'>[] = [
  { ordinal: 1, id: 'cash_lever',           name: 'Cash Lever vs Trough',   icon: '💰', keyboardHint: '⌘1' },
  { ordinal: 2, id: 'gtm_realloc',          name: 'GTM Resource Realloc',   icon: '🎯', keyboardHint: '⌘2' },
  { ordinal: 3, id: 'strategic_option',     name: 'Strategic Option Eval',  icon: '♟️', keyboardHint: '⌘3' },
  { ordinal: 4, id: 'stakeholder_1_1',      name: 'Stakeholder 1:1 Prep',   icon: '🤝', keyboardHint: '⌘4' },
  { ordinal: 5, id: 'board_narrative',      name: 'Board Narrative / Deck', icon: '📊', keyboardHint: '⌘5' },
  { ordinal: 6, id: 'restructure_decision', name: 'Restructure Decision',   icon: '⚖️', keyboardHint: '⌘6' },
  { ordinal: 7, id: 'pre_mortem',           name: 'Pre-mortem',             icon: '🔍', keyboardHint: '⌘7' },
  { ordinal: 8, id: 'quick_read',           name: 'Quick Multi-Lens Read',  icon: '⚡', keyboardHint: '⌘8' },
];

function formatToday(): string {
  return new Date()
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    .toUpperCase()
    .replace(/,/g, ' ·');
}

function dotClass(status: 'GREEN' | 'YELLOW' | 'RED'): string {
  return status === 'GREEN' ? 'g' : status === 'YELLOW' ? 'y' : 'r';
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface HomeProps {
  onTileClick?: (playbookId: PlaybookId) => void;
  onOpenQASubmit?: (prompt: string) => void;
  onWritebacksClick?: () => void;
  onJobClick?: (jobId: string) => void;
  onViewMemo?: (memoPath: string) => void;
  onSettingsScheduler?: () => void;
  onSettingsNotifications?: () => void;
}

// ── Home screen ───────────────────────────────────────────────────────────────

export function Home({
  onTileClick,
  onOpenQASubmit,
  onWritebacksClick,
  onJobClick,
  onViewMemo,
  onSettingsScheduler,
  onSettingsNotifications,
}: HomeProps): React.ReactElement {
  const [qaValue, setQaValue] = useState('');
  const homeData = useHomeData();
  useKeyboardShortcuts();

  // W30 proximity: stubbed; Runtime wires home.w30Proximity (TODO ch7-phase-b).
  const w30ProximityLabel = '26d';

  const tiles: PlaybookTileData[] = TILE_CATALOGUE.map((t) => ({
    ...t,
    lastRunAt: null,
    freshness: computeFreshness(null),
  }));

  function handleQASubmit(prompt: string) {
    setQaValue('');
    onOpenQASubmit?.(prompt);
  }

  const costUsage = homeData.costUsage;
  const windowPct = costUsage?.windowPct ?? 0;

  return (
    <div
      className="cs-home"
      style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--gray-50)', fontFamily: 'var(--font-sans)', color: 'var(--navy)' }}
      data-testid="home-screen"
    >
      {/* ── EDITORIAL HEADER ──────────────────────────────────────────────── */}
      <header className="cs-header" role="banner" aria-label="Session context">
        <h1>C-Suite</h1>
        <span className="cs-stamp num" data-testid="home-date">{formatToday()}</span>
        <span
          className="num"
          style={{
            marginLeft: 'auto',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            background: 'rgba(255,186,0,0.14)',
            border: '1px solid rgba(255,186,0,0.4)',
            color: 'var(--gold)',
            padding: '3px 8px',
            borderRadius: 'var(--r-sm)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
          aria-label={`W30 trough in ${w30ProximityLabel}`}
        >
          W30 in {w30ProximityLabel}
        </span>
        <span
          className="num"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase' }}
          aria-label="Token usage"
        >
          {costUsage !== null ? (
            <>
              WINDOW <strong style={{ color: '#fff' }}>{Math.round(windowPct)}%</strong>
              <span
                role="progressbar"
                aria-valuenow={Math.round(windowPct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Context window ${Math.round(windowPct)}% used`}
                style={{ width: '54px', height: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '2px', overflow: 'hidden', display: 'inline-block' }}
              >
                <span style={{ display: 'block', height: '100%', width: `${windowPct}%`, background: 'linear-gradient(90deg, var(--purple), var(--purple-400))' }} />
              </span>
              {costUsage.todayUsd !== null && (
                <>TODAY <strong style={{ color: '#fff' }}>${costUsage.todayUsd.toFixed(2)}</strong></>
              )}
            </>
          ) : (
            <span>USAGE LOADING…</span>
          )}
        </span>
      </header>

      {/* Tripwire banner (live scheduler.tripwire.flipped subscription) */}
      <TripwireBanner onOpenMemo={onViewMemo} />

      {/* ── THREE-COLUMN BODY ─────────────────────────────────────────────── */}
      <div className="cs-home-body" style={{ flex: 1, display: 'grid', gridTemplateColumns: '200px 1fr 168px', overflow: 'hidden' }}>
        {/* ── LEFT: tree-pane sidebar ────────────────────────────────────── */}
        <nav className="cs-tree" aria-label="Context rail — workstreams, decisions, writebacks">
          <div className="cs-tree-sec">
            <h3 className="cs-eyebrow">Workstreams</h3>
            {homeData.workstreams.length === 0 ? (
              <div className="cs-empty" style={{ padding: '5px 16px' }}>No active workstreams</div>
            ) : (
              homeData.workstreams.map((ws, i) => (
                <div key={ws.id} className={`cs-row${i === 0 ? ' sel' : ''}`} data-testid={`workstream-${ws.id}`}>
                  <span className={`cs-dot ${dotClass(ws.status)}`} />
                  <span className="ws">{ws.id}</span>
                  <span className="cnt num">{ws.phase}</span>
                </div>
              ))
            )}
          </div>

          <div className="cs-tree-sec">
            <h3 className="cs-eyebrow">Open Decisions</h3>
            {homeData.decisions.length === 0 ? (
              <div className="cs-empty" style={{ padding: '5px 16px' }}>No open decisions</div>
            ) : (
              homeData.decisions.map((d) => (
                <div key={d.id} className="cs-row" title={d.title} data-testid={`decision-${d.id}`}>
                  <span className="ws">{d.id}</span>
                </div>
              ))
            )}
          </div>

          <div className="cs-tree-sec">
            <h3 className="cs-eyebrow">Writebacks</h3>
            <button
              type="button"
              className="cs-row"
              onClick={() => onWritebacksClick?.()}
              data-testid="writebacks-row"
              aria-label={`${homeData.writebackCount} pending writebacks`}
            >
              <span className="ws" style={{ color: 'var(--purple)', fontWeight: 600 }}>
                {homeData.writebackCount} pending →
              </span>
            </button>
          </div>

          <div className="cs-tree-sec" role="group" aria-label="Settings navigation">
            <h3 className="cs-eyebrow">Settings</h3>
            <button type="button" className="cs-row" onClick={onSettingsScheduler} aria-label="Open Scheduler settings">
              <span className="ws">Scheduler</span>
            </button>
            <button type="button" className="cs-row" onClick={onSettingsNotifications} aria-label="Open Notifications settings">
              <span className="ws">Notifications</span>
            </button>
          </div>
        </nav>

        {/* ── CENTER: content pane ───────────────────────────────────────── */}
        <main style={{ overflow: 'auto', padding: '16px 20px' }} data-testid="home-center">
          <div style={{ marginBottom: '18px' }}>
            <OpenQABar
              value={qaValue}
              onChange={setQaValue}
              onSubmit={handleQASubmit}
              decomposerPreview={null}
              submitDisabled={false}
            />
          </div>

          <span className="cs-eyebrow" id="pb-section-label">Playbooks</span>
          <div
            role="list"
            aria-labelledby="pb-section-label"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '10px' }}
            data-testid="playbook-grid"
          >
            {tiles.map((tile) => (
              <div key={tile.id} role="listitem">
                <PlaybookTile {...tile} onClick={(id) => onTileClick?.(id)} />
              </div>
            ))}
          </div>
        </main>

        {/* ── RIGHT: token meter + scheduled jobs ────────────────────────── */}
        <aside style={{ borderLeft: '1px solid var(--gray-200)', background: 'var(--paper)', overflow: 'auto', padding: '14px' }} aria-label="Cost and scheduled jobs">
          <span className="cs-eyebrow">Token Meter</span>
          <div className="cs-meter" style={{ margin: '8px 0 18px' }}>
            {costUsage !== null ? (
              <>
                <div className="big num">{Math.round(windowPct)}%</div>
                <div className="cap">Window used</div>
                <div
                  className="bar"
                  role="progressbar"
                  aria-valuenow={Math.round(windowPct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Window ${Math.round(windowPct)}% used`}
                >
                  <i style={{ width: `${windowPct}%` }} />
                </div>
                {costUsage.todayUsd !== null && (
                  <div style={{ marginTop: '10px' }}>
                    <div className="big num" style={{ fontSize: '20px' }}>${costUsage.todayUsd.toFixed(2)}</div>
                    <div className="cap">Spend today</div>
                  </div>
                )}
              </>
            ) : (
              <div className="cs-empty">Loading…</div>
            )}
          </div>

          <span className="cs-eyebrow">Scheduled Jobs</span>
          <div style={{ marginTop: '6px' }}>
            <JobsStrip onJobClick={onJobClick} onViewMemo={onViewMemo} />
          </div>
        </aside>
      </div>

      {/* Catch-up toast (live scheduler.catchup.summary subscription) */}
      <CatchupToast />

      {/* Responsive: collapse to single column under 900px (CCC breakpoint) */}
      <style>{`
        @media (max-width: 900px) {
          [data-testid="home-screen"] .cs-home-body {
            grid-template-columns: 1fr !important;
            overflow: auto !important;
          }
          [data-testid="home-screen"] .cs-tree { border-right: none; border-bottom: 1px solid var(--gray-200); }
          [data-testid="home-screen"] aside { border-left: none; border-top: 1px solid var(--gray-200); }
        }
        @media (max-width: 640px) {
          [data-testid="home-screen"] [data-testid="playbook-grid"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
