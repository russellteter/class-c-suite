// apps/renderer/src/screens/Home.tsx
// Source: docs/decisions/0006-ch5-cash-lever-slice.md §6 (Open Q&A UI contract)
//         docs/decisions/0006-ch5-cash-lever-slice.md §8 AC-1 + AC-6
// 8 playbook tiles + Open Q&A input + tripwire strip + cost meter.

import React, { useState, useEffect, useRef } from 'react';
import { sendIpc } from '../ipc-client.js';
import { useCostUsage } from '../ipc/subscriptions.js';

// ── Playbook tile definitions ─────────────────────────────────────────────────

interface PlaybookTile {
  id: string;
  label: string;
  description: string;
  lit: boolean;
}

const PLAYBOOK_TILES: PlaybookTile[] = [
  { id: 'cash_lever',           label: 'Cash Lever',         description: 'W30 trough, LoC vs. AWS spend',         lit: true  },
  { id: 'stakeholder_1on1_prep',label: 'Stakeholder 1:1',    description: 'Prep for key meetings',                 lit: false },
  { id: 'quick_multi_lens',     label: 'Multi-Lens',         description: 'Quick cross-functional read',           lit: false },
  { id: 'pre_mortem',           label: 'Pre-Mortem',         description: 'Identify failure modes before launch',  lit: false },
  { id: 'gtm_reallocation',     label: 'GTM Reallocation',   description: 'Reallocate go-to-market spend',         lit: false },
  { id: 'strategic_option',     label: 'Strategic Option',   description: 'Evaluate build/buy/partner decisions',  lit: false },
  { id: 'board_narrative',      label: 'Board Narrative',    description: 'Prep board-ready materials',            lit: false },
  { id: 'restructure_decision', label: 'Restructure',        description: 'Org design and role changes',           lit: false },
];

// ── Tripwire placeholder rows ─────────────────────────────────────────────────

const TRIPWIRE_STUBS = [
  { id: 'tw-1', label: 'Cash runway < 90 days', status: 'watching' },
  { id: 'tw-2', label: 'Committed pipeline < $4M', status: 'watching' },
  { id: 'tw-3', label: 'AWS spend > $200K/mo', status: 'watching' },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface HomeProps {
  onSubmitQuestion?: (question: string) => void;
}

export function Home({ onSubmitQuestion }: HomeProps): React.ReactElement {
  const [question, setQuestion] = useState('');
  const [windowRemainingTokens, setWindowRemainingTokens] = useState<number | null>(null);
  const windowCap = 180_000;
  const inputRef = useRef<HTMLInputElement>(null);

  useCostUsage(({ windowRemainingTokens: remaining }) => {
    setWindowRemainingTokens(remaining);
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    onSubmitQuestion?.(q);
    // Emit run.requested IPC to main — main classifies playbook + builds RunPlan
    sendIpc({ kind: 'run.requested', payload: { question: q } } as never);
    setQuestion('');
  }

  const usedTokens = windowRemainingTokens !== null ? windowCap - windowRemainingTokens : null;
  const meterPct = usedTokens !== null ? Math.min(100, (usedTokens / windowCap) * 100) : 0;

  return (
    <div style={{ fontFamily: 'var(--font-sans)', padding: '24px', minHeight: '100vh', background: 'var(--bg-surface)' }}>
      {/* Open Q&A input bar */}
      <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
        <div className="glass-card" style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px 16px' }}>
          <input
            ref={inputRef}
            className="glass-input"
            style={{ flex: 1, fontSize: '14px' }}
            placeholder="Ask the C-Suite anything — or pick a playbook below"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            data-testid="open-qa-input"
          />
          <button
            type="submit"
            className="glass-btn-primary"
            disabled={!question.trim()}
            data-testid="open-qa-submit"
          >
            Run
          </button>
        </div>
      </form>

      {/* 8 playbook tiles */}
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}
        data-testid="playbook-tiles"
      >
        {PLAYBOOK_TILES.map(tile => (
          <div
            key={tile.id}
            className={`glass-card ${tile.lit ? 'glass-card--selected' : ''}`}
            style={{
              opacity: tile.lit ? 1 : 0.55,
              cursor: tile.lit ? 'pointer' : 'not-allowed',
              position: 'relative',
            }}
            onClick={() => {
              if (!tile.lit) return;
              // Pre-fill the question input with the playbook prompt
              inputRef.current?.focus();
            }}
            title={tile.lit ? tile.description : 'Coming in Ch.7'}
            data-testid={`tile-${tile.id}`}
          >
            <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '4px', color: 'var(--navy)' }}>
              {tile.label}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: 1.4 }}>
              {tile.description}
            </div>
            {tile.lit && (
              <span className="glass-badge glass-badge--purple" style={{ marginTop: '8px', display: 'inline-flex' }}>
                Active
              </span>
            )}
            {!tile.lit && (
              <span className="glass-badge glass-badge--navy" style={{ marginTop: '8px', display: 'inline-flex', opacity: 0.6 }}>
                Ch.7
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Tripwire strip */}
      <div className="glass-card" style={{ marginBottom: '24px' }} data-testid="tripwire-strip">
        <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
          Tripwires
        </div>
        {TRIPWIRE_STUBS.map(tw => (
          <div
            key={tw.id}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--glass-border)' }}
          >
            <span style={{ fontSize: '13px', color: 'var(--navy)' }}>{tw.label}</span>
            <span className="glass-badge glass-badge--navy">{tw.status}</span>
          </div>
        ))}
      </div>

      {/* Cost meter */}
      <div className="glass-card" data-testid="cost-meter">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontWeight: 600, fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Context Window
          </span>
          <span style={{ fontSize: '12px', color: 'var(--navy)', fontFamily: 'var(--font-mono)' }} data-testid="cost-meter-text">
            {windowRemainingTokens !== null
              ? `${windowRemainingTokens.toLocaleString()} / ${windowCap.toLocaleString()} remaining`
              : '— / 180,000 remaining'}
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-bar__fill progress-bar__fill--primary"
            style={{ transform: `scaleX(${meterPct / 100})` }}
            data-testid="cost-meter-bar"
          />
        </div>
      </div>
    </div>
  );
}
