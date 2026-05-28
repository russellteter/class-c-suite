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
  | { name: 'roundtable'; runId: string }
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
      return { name: 'roundtable', runId: params.get('runId') ?? 'r-2026-05-27-cash-lever-a4f9' };
    }
    if (screen === 'memo-viewer') {
      return { name: 'memo-viewer', memo: fixtureMemo(params.get('variant')) };
    }
  }
  return { name: 'home' };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a minimal Ch5RunPlan stub from a tile click.
 * Real plan building is Runtime's job (Phase B); this lets the plan-approval
 * screen render with correct shape while the IPC round-trip isn't wired yet.
 * TODO ch7-phase-b: replace with real plan from run.plan.ready IPC event.
 */
function stubPlanFromPlaybook(playbookId: PlaybookId): Ch5RunPlan {
  return {
    playbook: playbookId,
    question: '',
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

// ---- Root component -------------------------------------------------------

export function App(): React.ReactElement {
  const [screen, setScreen] = useState<Screen>(initialScreen);

  const navigateTo = (next: Screen) => setScreen(next);

  // Ch.9 — subscribe to handoff.preview.ready from Runtime.
  // When generated brief arrives, push HandoffPreview screen preserving current return point.
  // TODO ch9-runtime-ship: Runtime sub-agent emits this on handoff.preview.requested trigger.
  useEffect(() => {
    const cleanup = onHandoffPreviewReady(({ brief }) => {
      setScreen((current) => ({
        name: 'handoff-preview',
        brief,
        returnScreen: current.name === 'handoff-preview' ? current.returnScreen : current,
      }));
    });
    return cleanup;
  }, []);

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
      return <RoundTable runId={screen.runId} />;

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
            onViewMemo={(memoPath) => {
              // Ch.10: open MemoViewer with the path — MemoViewer already exists from Ch.7.
              // Navigate to the memo path; MemoViewer handles rendering from vault path.
              // For now, send via IPC since MemoViewer routing is not yet in Screen union.
              // TODO ch10-renderer-extend: add 'memo-viewer' Screen variant; navigate directly.
              if (typeof window !== 'undefined' && window.ipc) {
                window.ipc.send({ kind: 'vault.openFile', payload: { path: memoPath } });
              }
            }}
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
}
