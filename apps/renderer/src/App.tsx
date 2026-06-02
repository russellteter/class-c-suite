// apps/renderer/src/App.tsx
// Source: docs/decisions/0002-ch1-process-architecture.md §1
// Ch.6: adds state-based routing for WritebackPane, ConversationPane, AcceptedHistory.
// Ch.7: Home is the default route (replaces Ch.1 HomeScreen stub); adds plan-approval route
//       wired to tile-click and Open Q&A submit per tasks/ch7-renderer-brief.md §4.

import React, { useState, useEffect } from 'react';
import type { WritebackDraft } from '@c-suite/shared-types/writeback';
import { WritebackPane } from './screens/WritebackPane.js';
import { ConversationPane } from './screens/ConversationPane.js';
import { AcceptedHistory } from './screens/AcceptedHistory.js';
import { Home } from './screens/Home.js';
import { PlanApproval, type Ch5RunPlan } from './screens/PlanApproval.js';
import { HandoffPreview } from './screens/HandoffPreview.js';
import { SettingsScheduler } from './screens/SettingsScheduler.js';
import { NotificationSettings } from './screens/NotificationSettings.js';
import { Connectors } from './screens/Connectors.js';
import { RoundTable } from './screens/RoundTable.js';
import { MemoViewer, type MemoViewerMemo } from './screens/MemoViewer.js';
import type { PlaybookId } from './components/HomeTypes.js';
import { onHandoffPreviewReady, type HandoffBrief } from './ipc/handoff.js';

// ---- Screen routing -------------------------------------------------------

type Screen =
  | { name: 'home' }
  | { name: 'writeback' }
  | { name: 'conversation'; writebackId: string; draft: WritebackDraft | null }
  | { name: 'history'; artifactId: string }
  | { name: 'plan-approval'; plan: Ch5RunPlan }
  // Ch.9 — HandoffPreview state machine: idle (any screen) → preview-open → (sent/cancelled) → idle
  | { name: 'handoff-preview'; brief: HandoffBrief; returnScreen: Screen }
  // Ch.10 — Settings sub-screens
  | { name: 'settings-scheduler'; selectedJobId?: string }
  | { name: 'settings-notifications' }
  | { name: 'settings-connectors' }
  // TRACK 6 — hero-screen test routes (headless Playwright fidelity checks)
  | { name: 'roundtable'; runId: string; seedState?: 'midrun' | 'complete' }
  | { name: 'memo-viewer'; memo: MemoViewerMemo };

// ── Fixtures for the hero-screen test routes (?screen=roundtable / memo-viewer) ─

const FIXTURE_MEMO_MARKDOWN = [
  '# LOC draw vs AWS deferral — W30 trough',
  '',
  'The W30 cash trough lands in 26 days. NetSuite AR aging shows $1.42M collectible inside the window[^cash-001], against a projected $2.1M shortfall at trough.',
  '',
  '## Option 1 — Draw the Barclays LOC',
  'Available headroom is $3.0M at SOFR+275[^barclays-003]. Draws are reversible within the quarter and preserve the AWS commit schedule.',
  '',
  '## Option 2 — Defer the AWS reserved-instance prepay',
  'Deferring the Q3 prepay frees $1.8M[^aws-002] but forfeits the 31% reserved-instance discount, a $560K annualized cost.',
  '',
  '## Recommendation',
  'Draw the LOC for the trough, hold the AWS prepay. Cheaper carry, fully reversible.',
].join('\n');

function fixtureMemo(variant: string | null): MemoViewerMemo {
  const base: MemoViewerMemo = {
    runId: 'r-2026-05-27-cash-lever-a4f9',
    memoMarkdown: FIXTURE_MEMO_MARKDOWN,
    status: 'clean',
    rigorScore: 78,
    filename: '2026-05-27-cash-lever-loc-vs-aws.md',
    memoTitle: 'Cash Memo',
    hasAcceptedDecision: true,
    outputSurfaces: [
      { kind: 'gdoc', url: 'https://docs.google.com/document/d/fixture', title: 'View as Google Doc' },
    ],
  };
  if (variant === 'draft') {
    return {
      ...base,
      status: 'draft',
      rigorScore: 61,
      filename: '2026-05-27-cash-lever-loc-vs-aws.draft.md',
      failureReasons: ['Coverage 64% below 70% threshold', '2 claims unverified by the verifier'],
      hasAcceptedDecision: false,
    };
  }
  if (variant === 'degraded') {
    return {
      ...base,
      degradationWarnings: [
        { table: 'account', reason: 'Role lacks View permission on Account records', remediation: 'Grant the integration role View access to Lists › Accounting › Accounts' },
        { table: 'department', reason: 'SuiteQL returned INSUFFICIENT_PERMISSION', remediation: 'Add the Department permission to the integration role' },
      ],
    };
  }
  return base;
}

function initialScreen(): Screen {
  // Allow test navigation via URL query params (brief §Wiring: "openable via a test route")
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const screen = params.get('screen');
    if (screen === 'writeback') return { name: 'writeback' };
    if (screen === 'conversation') {
      const id = params.get('writebackId') ?? 'UNKNOWN';
      return { name: 'conversation', writebackId: id, draft: null };
    }
    if (screen === 'history') {
      const artifactId = params.get('artifactId') ?? 'UNKNOWN';
      return { name: 'history', artifactId };
    }
    if (screen === 'roundtable') {
      const st = params.get('state');
      return {
        name: 'roundtable',
        runId: params.get('runId') ?? 'r-2026-05-27-cash-lever-a4f9',
        seedState: st === 'midrun' || st === 'complete' ? st : undefined,
      };
    }
    if (screen === 'memo-viewer') {
      return { name: 'memo-viewer', memo: fixtureMemo(params.get('variant')) };
    }
  }
  return { name: 'home' };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Default framing question per playbook. A tile click opens PlanApproval pre-filled
 * with this (editable there); the run needs a non-empty question to dispatch. These
 * are starting prompts, not canned answers — the user refines before approving.
 * TODO ch7-phase-b: replace stub plans with the real run.plan.ready IPC event.
 */
const DEFAULT_QUESTION: Record<PlaybookId, string> = {
  cash_lever: 'Where are our highest-leverage cash moves over the next 90 days, and what should we pull first?',
  gtm_realloc: 'How should we reallocate GTM spend across segments to maximize pipeline this quarter?',
  strategic_option: 'Evaluate our top strategic options and recommend which to pursue and why.',
  stakeholder_1_1: 'Prepare me for my next 1:1 with this stakeholder — what matters to them and what should I raise?',
  board_narrative: 'Draft the narrative for the next board update — what is the story and the proof?',
  restructure_decision: 'Should we restructure, and if so, what is the most defensible option?',
  pre_mortem: 'Run a pre-mortem on this initiative — how could it fail and how do we de-risk it?',
  quick_read: 'Give me a fast multi-lens read on the current state of the business.',
  open_qa: '',
};

/**
 * Build a minimal Ch5RunPlan stub from a tile click, pre-filled with the playbook's
 * default framing question (editable in PlanApproval before approval).
 * TODO ch7-phase-b: replace with real plan from run.plan.ready IPC event.
 */
function stubPlanFromPlaybook(playbookId: PlaybookId): Ch5RunPlan {
  return {
    playbook: playbookId,
    question: DEFAULT_QUESTION[playbookId] ?? '',
    lenses: [],
    mcps: [],
    tokenEstimate: 0,
    memoPath: '',
    degradations: [],
  };
}

function stubPlanFromPrompt(prompt: string): Ch5RunPlan {
  return {
    playbook: 'open_qa',
    question: prompt,
    lenses: [],
    mcps: [],
    tokenEstimate: 0,
    memoPath: '',
    stamp: 'AD-HOC',
    degradations: [],
  };
}

// ---- Persistent chrome ----------------------------------------------------

/** Slim global nav, always rendered above every screen. Guarantees a way Home. */
function GlobalNav({ screenName, onHome }: { screenName: string; onHome: () => void }): React.ReactElement {
  return (
    <div
      role="navigation"
      aria-label="Global navigation"
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px',
        height: 36, flexShrink: 0, background: 'var(--navy, #0b1733)', color: '#fff',
        borderBottom: '1px solid rgba(255,255,255,0.08)', WebkitUserSelect: 'none',
      }}
    >
      <button onClick={onHome} aria-label="C-Suite home"
        style={{ background: 'transparent', border: 'none', color: '#fff', fontWeight: 700, fontSize: 13, letterSpacing: '0.02em', cursor: 'pointer' }}>
        C-Suite
      </button>
      <button onClick={onHome} aria-label="Go to Home"
        style={{
          background: screenName === 'home' ? 'rgba(255,255,255,0.14)' : 'transparent',
          border: '1px solid rgba(255,255,255,0.18)', color: '#fff', fontSize: 12,
          padding: '2px 10px', borderRadius: 6, cursor: 'pointer',
        }}>
        Home
      </button>
      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {screenName.replace(/-/g, ' ')}
      </span>
    </div>
  );
}

/** Catches a screen render crash and shows a recoverable fallback (never a blank window). */
class AppErrorBoundary extends React.Component<
  { onHome: () => void; children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error): { error: Error } { return { error }; }
  componentDidCatch(error: Error): void { console.error('[C-Suite] screen render crashed:', error); }
  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'var(--font-sans, system-ui)' }}>
          <h2 style={{ margin: '0 0 8px' }}>This screen hit an error.</h2>
          <p style={{ color: '#64748b', margin: '0 0 16px', fontSize: 13 }}>{this.state.error.message}</p>
          <button onClick={this.props.onHome}
            style={{ background: 'var(--navy, #0b1733)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
            ← Back to Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---- Root component -------------------------------------------------------

export function App(): React.ReactElement {
  const [screen, setScreen] = useState<Screen>(initialScreen);

  const navigateTo = (next: Screen) => setScreen(next);

  // Open a produced memo: load its markdown by vault-relative path (memo:read, main owns the
  // vault), then route to the MemoViewer. Shared by the Home Recent Runs list, TripwireBanner,
  // and JobsStrip (all call onViewMemo(path)). Null = unsafe/missing path → stay put (no blank view).
  const handleViewMemo = async (memoPath: string): Promise<void> => {
    if (!memoPath || typeof window === 'undefined' || !window.ipc?.invoke) return;
    try {
      const memo = (await window.ipc.invoke('memo:read', memoPath)) as MemoViewerMemo | null;
      if (memo && typeof memo.memoMarkdown === 'string' && memo.memoMarkdown.length > 0) {
        navigateTo({ name: 'memo-viewer', memo });
      } else {
        console.warn('[App] memo:read returned no content for', memoPath);
      }
    } catch (err) {
      console.warn('[App] memo:read failed for', memoPath, err);
    }
  };

  // Ch.9 — subscribe to handoff.preview.ready from Runtime.
  // When generated brief arrives, push HandoffPreview screen preserving current return point.
  // TODO ch9-runtime-ship: Runtime sub-agent emits this on handoff.preview.requested trigger.
  useEffect(() => {
    const cleanup = onHandoffPreviewReady(({ runId, brief }) => {
      // The utility's brief omits runId (it lives in the preview.ready payload); merge it in so
      // HandoffPreview's Send (which posts handoff.send with brief.runId) carries a real id — without
      // this the send is rejected at index.ts (missing runId) and no bundle is ever written.
      setScreen((current) => ({
        name: 'handoff-preview',
        brief: { ...brief, runId },
        returnScreen: current.name === 'handoff-preview' ? current.returnScreen : current,
      }));
    });
    return cleanup;
  }, []);

  const content: React.ReactElement = ((): React.ReactElement => {
  switch (screen.name) {
    case 'settings-scheduler':
      return (
        <SettingsScheduler
          selectedJobId={screen.selectedJobId}
          onBack={() => navigateTo({ name: 'home' })}
        />
      );

    case 'settings-notifications':
      return (
        <NotificationSettings
          onBack={() => navigateTo({ name: 'home' })}
        />
      );

    case 'settings-connectors':
      return (
        <Connectors
          onBack={() => navigateTo({ name: 'home' })}
        />
      );

    case 'handoff-preview':
      return (
        <HandoffPreview
          brief={screen.brief}
          onClose={() => navigateTo(screen.returnScreen)}
        />
      );

    case 'plan-approval':
      return (
        <PlanApproval
          plan={screen.plan}
          onApprove={() => navigateTo({ name: 'home' })}
          onEdit={() => navigateTo({ name: 'home' })}
          onCancel={() => navigateTo({ name: 'home' })}
        />
      );

    case 'writeback':
      return (
        <WritebackPane
          onOpenConversation={(writebackId) =>
            navigateTo({ name: 'conversation', writebackId, draft: null })
          }
        />
      );

    case 'conversation':
      return (
        <ConversationPane
          writebackId={screen.writebackId}
          draft={screen.draft}
          onBack={() => navigateTo({ name: 'writeback' })}
        />
      );

    case 'history':
      return (
        <AcceptedHistory
          artifactId={screen.artifactId}
          onBack={() => navigateTo({ name: 'home' })}
        />
      );

    case 'roundtable':
      return <RoundTable runId={screen.runId} seedState={screen.seedState} />;

    case 'memo-viewer':
      return <MemoViewer memo={screen.memo} onClose={() => navigateTo({ name: 'home' })} />;

    case 'home':
    default:
      return (
        <>
          <Home
            onTileClick={(playbookId) =>
              navigateTo({ name: 'plan-approval', plan: stubPlanFromPlaybook(playbookId) })
            }
            onOpenQASubmit={(prompt) =>
              navigateTo({ name: 'plan-approval', plan: stubPlanFromPrompt(prompt) })
            }
            onWritebacksClick={() => navigateTo({ name: 'writeback' })}
            onJobClick={(jobId) => navigateTo({ name: 'settings-scheduler', selectedJobId: jobId })}
            onViewMemo={(memoPath) => { void handleViewMemo(memoPath); }}
            onSettingsScheduler={() => navigateTo({ name: 'settings-scheduler' })}
            onSettingsNotifications={() => navigateTo({ name: 'settings-notifications' })}
          />
          {/* Dev nav — visible only in non-production for screen testing */}
          {process.env.NODE_ENV !== 'production' && (
            <div style={{ position: 'fixed', bottom: 12, right: 12, display: 'flex', gap: 8, zIndex: 999 }}>
              <button
                onClick={() => navigateTo({ name: 'writeback' })}
                style={{ fontSize: 11, padding: '2px 8px', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 4, cursor: 'pointer' }}
              >
                WritebackPane
              </button>
              <button
                onClick={() => navigateTo({ name: 'history', artifactId: 'POS-001' })}
                style={{ fontSize: 11, padding: '2px 8px', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 4, cursor: 'pointer' }}
              >
                AcceptedHistory
              </button>
              <button
                onClick={() => navigateTo({ name: 'settings-connectors' })}
                style={{ fontSize: 11, padding: '2px 8px', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 4, cursor: 'pointer' }}
              >
                Connectors
              </button>
            </div>
          )}
        </>
      );
  }
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <GlobalNav screenName={screen.name} onHome={() => navigateTo({ name: 'home' })} />
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <AppErrorBoundary key={screen.name} onHome={() => navigateTo({ name: 'home' })}>
          {content}
        </AppErrorBoundary>
      </div>
    </div>
  );
}
