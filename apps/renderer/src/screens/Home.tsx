// apps/renderer/src/screens/Home.tsx
// Source: tasks/ch7-renderer-brief.md §1 — Variant B (dense rail) + §2 components + §3 hooks.
// Ch.7 Phase A rewrite; replaces Ch.5 stub wholesale.
// Layout: CSS Grid 280px | 1fr | 240px (desktop); single column below 900px.
// Left rail is sticky. IPC stubs with TODO ch7-phase-b comments throughout.

import React, { useState } from 'react';
import '../design/tokens.css';
import { PlaybookTile } from '../components/PlaybookTile.js';
import { OpenQABar } from '../components/OpenQABar.js';
import { WorkstreamRail } from '../components/WorkstreamRail.js';
import { OpenDecisionsList } from '../components/OpenDecisionsList.js';
import { WritebacksCounter } from '../components/WritebacksCounter.js';
import { JobsStrip } from '../components/JobsStrip.js';
import { useHomeData } from '../hooks/useHomeData.js';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts.js';
import type { PlaybookTileData, PlaybookId } from '../components/HomeTypes.js';

// ── Playbook tile catalogue ───────────────────────────────────────────────────
// Ordinal order matches Cmd+1..Cmd+8 mapping in useKeyboardShortcuts.ts.
// lastRunAt + freshness are runtime values; Phase A stubs them as null/gray
// since home.playbookActivity IPC is not wired yet.
// TODO ch7-phase-b: receive lastRunAt + freshness from home.playbookActivity IPC variant.

function computeFreshness(lastRunAt: Date | null): PlaybookTileData['freshness'] {
  if (!lastRunAt) return 'gray';
  const diffH = (Date.now() - lastRunAt.getTime()) / (1000 * 60 * 60);
  if (diffH < 24) return 'green';
  if (diffH < 24 * 7) return 'amber';
  return 'gray';
}

const TILE_CATALOGUE: Omit<PlaybookTileData, 'lastRunAt' | 'freshness'>[] = [
  { ordinal: 1, id: 'cash_lever_vs_trough',          name: 'Cash Lever vs Trough',   icon: '💰', keyboardHint: '⌘1' },
  { ordinal: 2, id: 'gtm_resource_reallocation',      name: 'GTM Resource Realloc',   icon: '🎯', keyboardHint: '⌘2' },
  { ordinal: 3, id: 'strategic_option_evaluation',    name: 'Strategic Option Eval',  icon: '♟️', keyboardHint: '⌘3' },
  { ordinal: 4, id: 'stakeholder_1on1_prep',          name: 'Stakeholder 1:1 Prep',   icon: '🤝', keyboardHint: '⌘4' },
  { ordinal: 5, id: 'board_narrative_prep',           name: 'Board Narrative / Deck', icon: '📊', keyboardHint: '⌘5' },
  { ordinal: 6, id: 'restructure_decision',           name: 'Restructure Decision',   icon: '⚖️', keyboardHint: '⌘6' },
  { ordinal: 7, id: 'pre_mortem_on_proposed_action',  name: 'Pre-mortem',             icon: '🔍', keyboardHint: '⌘7' },
  { ordinal: 8, id: 'quick_multi_lens_read',          name: 'Quick Multi-Lens Read',  icon: '⚡', keyboardHint: '⌘8' },
];

// ── Today's date display ──────────────────────────────────────────────────────

function formatToday(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
}

// ── Sub-components (layout helpers) ──────────────────────────────────────────

function RailSectionLabel({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div style={{
      fontSize: 'var(--text-2xs)',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'var(--color-text-muted)',
      marginBottom: 'var(--space-2)',
      paddingBottom: 'var(--space-1)',
      borderBottom: '1px solid var(--color-border)',
    }}>
      {children}
    </div>
  );
}

function RightLabel({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div style={{
      fontSize: 'var(--text-2xs)',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'var(--color-text-muted)',
      marginBottom: 'var(--space-2)',
      paddingBottom: 'var(--space-1)',
      borderBottom: '1px solid var(--color-border)',
    }}>
      {children}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface HomeProps {
  /** Called when a tile is clicked or Cmd+1-8 fires — nav to plan-approval */
  onTileClick?: (playbookId: PlaybookId) => void;
  /** Called when Open Q&A is submitted — nav to plan-approval with prompt */
  onOpenQASubmit?: (prompt: string) => void;
  /** Called when writebacks counter is clicked — nav to WritebackPane */
  onWritebacksClick?: () => void;
}

// ── Home screen ───────────────────────────────────────────────────────────────

export function Home({ onTileClick, onOpenQASubmit, onWritebacksClick }: HomeProps): React.ReactElement {
  const [qaValue, setQaValue] = useState('');
  const homeData = useHomeData();
  useKeyboardShortcuts();

  // W30 proximity: stubbed to "26 days" — Runtime sub-agent wires home.w30Proximity.
  // TODO ch7-phase-b: wire home.w30Proximity IPC variant (W30 indexer hook).
  const w30ProximityLabel = '26 days';

  const tiles: PlaybookTileData[] = TILE_CATALOGUE.map((t) => ({
    ...t,
    lastRunAt: null, // TODO ch7-phase-b: wire from home.playbookActivity IPC
    freshness: computeFreshness(null),
  }));

  function handleQASubmit(prompt: string) {
    setQaValue('');
    onOpenQASubmit?.(prompt);
  }

  function handleTileClick(id: PlaybookId) {
    onTileClick?.(id);
  }

  const costUsage = homeData.costUsage;
  const windowPct = costUsage?.windowPct ?? 0;

  return (
    <div
      style={{
        background: 'var(--color-navy-900)',
        color: 'var(--color-text-primary)',
        minHeight: '100vh',
        fontFamily: '-apple-system, "SF Pro Display", "Inter", system-ui, sans-serif',
        fontSize: 'var(--text-sm)',
        lineHeight: 'var(--leading-snug)',
      }}
      data-testid="home-screen"
    >
      {/* ── TOP BAR ────────────────────────────────────────────────────────── */}
      <header
        role="banner"
        aria-label="Session context"
        style={{
          background: 'var(--color-navy-700)',
          borderBottom: '1px solid var(--color-border)',
          padding: '7px var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          flexWrap: 'wrap',
        }}
      >
        {/* Date */}
        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
          <span style={{ color: 'var(--color-text-primary)' }}>{formatToday()}</span>
        </div>

        {/* W30 trough chip */}
        <div
          style={{
            fontSize: 'var(--text-xs)',
            background: 'rgba(201,161,75,0.12)',
            border: '1px solid rgba(201,161,75,0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px 7px',
            color: 'var(--color-gold-500)',
          }}
          aria-label={`W30 trough in ${w30ProximityLabel}`}
        >
          W30 in <strong>{w30ProximityLabel}</strong>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Cost ribbon */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}
          aria-label="Token usage"
        >
          {costUsage !== null ? (
            <>
              <span>
                Window{' '}
                <strong style={{ color: 'var(--color-text-secondary)' }}>
                  {Math.round(windowPct)}%
                </strong>
              </span>
              <div
                role="progressbar"
                aria-valuenow={Math.round(windowPct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Context window ${Math.round(windowPct)}% used`}
                style={{
                  width: '60px',
                  height: '4px',
                  background: 'var(--color-surface-2)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <div style={{
                  height: '100%',
                  width: `${windowPct}%`,
                  background: 'linear-gradient(90deg, var(--color-purple-500), var(--color-purple-400))',
                  borderRadius: '2px',
                }} />
              </div>
              {costUsage.todayUsd !== null && (
                <span>
                  Today{' '}
                  <strong style={{ color: 'var(--color-text-secondary)' }}>
                    ${costUsage.todayUsd.toFixed(2)}
                  </strong>
                </span>
              )}
            </>
          ) : (
            <span style={{ color: 'var(--color-text-muted)' }}>Usage loading…</span>
          )}
        </div>
      </header>

      {/* ── THREE-COLUMN BODY ─────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '280px 1fr 240px',
          minHeight: 'calc(100vh - 37px)',
        }}
      >
        {/* ── LEFT RAIL ──────────────────────────────────────────────────── */}
        <nav
          aria-label="Context rail — workstreams, decisions, writebacks"
          style={{
            background: 'rgba(10,24,73,0.92)',
            borderRight: '1px solid var(--color-border)',
            padding: 'var(--space-3) 0',
            overflowY: 'auto',
            position: 'sticky',
            top: 0,
            height: 'calc(100vh - 37px)',
          }}
        >
          {/* Workstreams */}
          <div style={{ padding: '0 var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <RailSectionLabel>Workstreams</RailSectionLabel>
            <WorkstreamRail workstreams={homeData.workstreams} />
          </div>

          {/* Open Decisions */}
          <div style={{ padding: '0 var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <RailSectionLabel>Open Decisions</RailSectionLabel>
            <OpenDecisionsList decisions={homeData.decisions} />
          </div>

          {/* Writebacks Counter */}
          <div style={{ padding: '0 var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <RailSectionLabel>Writebacks</RailSectionLabel>
            {onWritebacksClick ? (
              <WritebacksCounter count={homeData.writebackCount} onClick={onWritebacksClick} />
            ) : (
              <WritebacksCounter count={homeData.writebackCount} onClick={() => {}} />
            )}
          </div>
        </nav>

        {/* ── CENTER CANVAS ──────────────────────────────────────────────── */}
        <main
          style={{
            padding: 'var(--space-3) var(--space-4)',
            overflowY: 'auto',
          }}
          data-testid="home-center"
        >
          {/* Open Q&A bar */}
          <OpenQABar
            value={qaValue}
            onChange={setQaValue}
            onSubmit={handleQASubmit}
            decomposerPreview={null} // TODO ch7-phase-b: wire decomposer preview IPC
            submitDisabled={false}
          />

          {/* Playbook tiles — 4×2 grid */}
          <div
            style={{
              fontSize: 'var(--text-xs)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-text-muted)',
              marginBottom: 'var(--space-2)',
            }}
            id="pb-section-label"
          >
            Playbooks
          </div>
          <div
            role="list"
            aria-labelledby="pb-section-label"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 140px)',
              gap: 'var(--space-2)',
              marginBottom: 'var(--space-3)',
            }}
            data-testid="playbook-grid"
          >
            {tiles.map((tile) => (
              <div key={tile.id} role="listitem">
                <PlaybookTile {...tile} onClick={handleTileClick} />
              </div>
            ))}
          </div>
        </main>

        {/* ── RIGHT COLUMN ───────────────────────────────────────────────── */}
        <aside
          aria-label="Cost and scheduled jobs"
          style={{
            borderLeft: '1px solid var(--color-border)',
            padding: 'var(--space-3)',
            overflowY: 'auto',
          }}
        >
          {/* Token meter — fixed-height 120px section */}
          <div style={{ marginBottom: 'var(--space-4)', minHeight: '120px' }}>
            <RightLabel>Token Meter</RightLabel>
            {costUsage !== null ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {/* Window used */}
                <div>
                  <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-text-muted)' }}>
                    Window used
                  </div>
                  <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    {Math.round(windowPct)}%
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={Math.round(windowPct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Window ${Math.round(windowPct)}% used`}
                    style={{ height: '5px', background: 'var(--color-surface-2)', borderRadius: '2px', overflow: 'hidden', marginTop: '2px' }}
                  >
                    <div style={{ height: '100%', width: `${windowPct}%`, background: 'linear-gradient(90deg, var(--color-purple-500), var(--color-purple-400))', borderRadius: '2px' }} />
                  </div>
                </div>

                {/* Today's spend */}
                {costUsage.todayUsd !== null && (
                  <div>
                    <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-text-muted)' }}>Today's spend</div>
                    <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                      ${costUsage.todayUsd.toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                Loading…
              </p>
            )}
          </div>

          {/* Scheduled jobs strip */}
          <div>
            <RightLabel>Scheduled Jobs</RightLabel>
            <JobsStrip jobs={[]} /> {/* TODO ch7-phase-b: wire home.scheduledJobs IPC variant */}
          </div>
        </aside>
      </div>

      {/* ── RESPONSIVE: single column under 900px ────────────────────────── */}
      <style>{`
        @media (max-width: 900px) {
          [data-testid="home-screen"] > div:nth-child(2) {
            grid-template-columns: 1fr !important;
          }
          [data-testid="home-screen"] > div:nth-child(2) > nav {
            position: static !important;
            height: auto !important;
          }
          [data-testid="home-screen"] [role="list"][aria-labelledby="pb-section-label"] {
            grid-template-columns: repeat(2, 140px) !important;
          }
        }
      `}</style>
    </div>
  );
}
