// tests/unit/renderer/DrawUpCTA.spec.tsx
// Source: tasks/ch9-renderer-brief.md §5 — DrawUpCTA spec
// RTL specs confirming:
//   - CTA present on 4 surfaces (MemoViewer, decision, position, pre-mortem)
//   - CTA absent on prediction/stakeholder/workstream cards (ADR §5.1 explicit exclusion)

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';

vi.mock('../../../apps/renderer/src/design/tokens.css', () => ({}));

// ── Mock IPC ───────────────────────────────────────────────────────────────

const mockSendHandoffPreviewRequested = vi.fn();

vi.mock('../../../apps/renderer/src/ipc/handoff.js', () => ({
  sendHandoffPreviewRequested: (...args: unknown[]) => mockSendHandoffPreviewRequested(...args),
  onHandoffPreviewReady: vi.fn(() => () => {}),
  sendHandoffSend: vi.fn(),
  sendHandoffCancelled: vi.fn(),
  onHandoffSent: vi.fn(() => () => {}),
  onHandoffFailed: vi.fn(() => () => {}),
}));

vi.mock('../../../apps/renderer/src/ipc/subscriptions.js', () => ({
  invokeToolCallGet: vi.fn().mockResolvedValue(null),
  useRunEvents: vi.fn(),
  useCostUsage: vi.fn(),
  displaySources: vi.fn(),
  displayVerified: vi.fn(),
  displayCoverage: vi.fn(),
}));

// ── DrawUpCTA unit tests ────────────────────────────────────────────────────

import { DrawUpCTA } from '../../../apps/renderer/src/components/DrawUpCTA.js';

describe('DrawUpCTA component', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders with correct label text', () => {
    render(<DrawUpCTA onClick={vi.fn()} />);
    expect(screen.getByText('Draw up for Cowork')).toBeInTheDocument();
  });

  it('fires onClick when clicked', () => {
    const handler = vi.fn();
    render(<DrawUpCTA onClick={handler} />);
    fireEvent.click(screen.getByTestId('draw-up-cta'));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('has accessible aria-label', () => {
    render(<DrawUpCTA onClick={vi.fn()} />);
    const btn = screen.getByTestId('draw-up-cta');
    expect(btn).toHaveAttribute('aria-label', expect.stringContaining('Draw up for Cowork'));
  });

  it('is a button element (keyboard-navigable)', () => {
    render(<DrawUpCTA onClick={vi.fn()} />);
    expect(screen.getByTestId('draw-up-cta').tagName).toBe('BUTTON');
  });
});

// ── MemoViewer CTA presence ────────────────────────────────────────────────

vi.mock('../../../apps/renderer/src/screens/MemoViewer.js', async () => {
  const actual = await vi.importActual<typeof import('../../../apps/renderer/src/screens/MemoViewer.js')>(
    '../../../apps/renderer/src/screens/MemoViewer.js',
  );
  return actual;
});

import { MemoViewer } from '../../../apps/renderer/src/screens/MemoViewer.js';

describe('MemoViewer — Draw up for Cowork CTA', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  const baseMemo = {
    runId: 'run-001',
    memoMarkdown: '# Memo content',
    status: 'clean' as const,
    filename: '2026-05-27-test.md',
    memoPath: 'memos/2026-05-27-test.md',
    memoTitle: 'Test Memo',
  };

  it('shows CTA when status=clean and hasAcceptedDecision=true', () => {
    render(
      <MemoViewer
        memo={{ ...baseMemo, hasAcceptedDecision: true }}
      />,
    );
    expect(screen.getByTestId('draw-up-cta')).toBeInTheDocument();
  });

  it('hides CTA when status=draft (not shipped-clean)', () => {
    render(
      <MemoViewer
        memo={{ ...baseMemo, status: 'draft', hasAcceptedDecision: true }}
      />,
    );
    expect(screen.queryByTestId('draw-up-cta')).not.toBeInTheDocument();
  });

  it('hides CTA when hasAcceptedDecision=false', () => {
    render(
      <MemoViewer
        memo={{ ...baseMemo, hasAcceptedDecision: false }}
      />,
    );
    expect(screen.queryByTestId('draw-up-cta')).not.toBeInTheDocument();
  });

  it('clicking CTA sends handoff.preview.requested with originType=memo', () => {
    render(
      <MemoViewer
        memo={{ ...baseMemo, hasAcceptedDecision: true }}
      />,
    );
    fireEvent.click(screen.getByTestId('draw-up-cta'));
    expect(mockSendHandoffPreviewRequested).toHaveBeenCalledWith(
      expect.objectContaining({ originType: 'memo' }),
    );
  });
});

// ── AcceptedHistory CTA presence (decision/position/pre-mortem vs excluded types) ─

vi.mock('../../../apps/renderer/src/ipc-client.js', () => ({
  onIpc: vi.fn(() => () => {}),
  invokeIpc: vi.fn().mockResolvedValue([]),
  sendIpc: vi.fn(),
  relayLog: vi.fn(),
}));

vi.mock('../../../apps/renderer/src/components/DiffView.js', () => ({
  DiffView: ({ diff }: { diff: string }) => <pre data-testid="diff-view">{diff}</pre>,
}));

import { AcceptedHistory } from '../../../apps/renderer/src/screens/AcceptedHistory.js';
import { invokeIpc } from '../../../apps/renderer/src/ipc-client.js';

function makeEntry(
  artifactId: string,
  opts: { originType?: string; runId?: string } = {},
) {
  return {
    writebackId: `wb-${artifactId}`,
    artifactId,
    artifactPath: `vault/${artifactId}.md`,
    artifactTitle: `Title for ${artifactId}`,
    gitSha: 'abc1234',
    committedAt: Date.now(),
    runId: opts.runId ?? 'run-001',
    diff: null,
    playbook: 'cash_lever',
    rigorScore: 0.8,
    executedBy: null,
  };
}

describe('AcceptedHistory — Draw up for Cowork CTA on card types', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  async function renderWithEntries(entries: ReturnType<typeof makeEntry>[]) {
    vi.mocked(invokeIpc).mockResolvedValueOnce(entries);
    const { rerender } = render(
      <AcceptedHistory artifactId="DEC-001" onBack={vi.fn()} />,
    );
    // Wait for async data load
    await new Promise((r) => setTimeout(r, 10));
    return { rerender };
  }

  it('renders CTA on a decision card (DEC- prefix) when expanded', async () => {
    const entries = [makeEntry('DEC-007')];
    vi.mocked(invokeIpc).mockResolvedValueOnce(entries);
    render(<AcceptedHistory artifactId="DEC-007" onBack={vi.fn()} />);
    await new Promise((r) => setTimeout(r, 10));
    // Expand the row
    const toggleBtn = screen.getAllByRole('button')[0];
    fireEvent.click(toggleBtn);
    expect(screen.getByTestId('draw-up-cta')).toBeInTheDocument();
  });

  it('renders CTA on a position card (POS- prefix) when expanded', async () => {
    const entries = [makeEntry('POS-003')];
    vi.mocked(invokeIpc).mockResolvedValueOnce(entries);
    render(<AcceptedHistory artifactId="POS-003" onBack={vi.fn()} />);
    await new Promise((r) => setTimeout(r, 10));
    const toggleBtn = screen.getAllByRole('button')[0];
    fireEvent.click(toggleBtn);
    expect(screen.getByTestId('draw-up-cta')).toBeInTheDocument();
  });

  it('renders CTA on a pre-mortem card (PM- prefix) when expanded', async () => {
    const entries = [makeEntry('PM-001')];
    vi.mocked(invokeIpc).mockResolvedValueOnce(entries);
    render(<AcceptedHistory artifactId="PM-001" onBack={vi.fn()} />);
    await new Promise((r) => setTimeout(r, 10));
    const toggleBtn = screen.getAllByRole('button')[0];
    fireEvent.click(toggleBtn);
    expect(screen.getByTestId('draw-up-cta')).toBeInTheDocument();
  });

  it('does NOT render CTA on a prediction card (PRED- prefix)', async () => {
    const entries = [makeEntry('PRED-005')];
    vi.mocked(invokeIpc).mockResolvedValueOnce(entries);
    render(<AcceptedHistory artifactId="PRED-005" onBack={vi.fn()} />);
    await new Promise((r) => setTimeout(r, 10));
    const buttons = screen.getAllByRole('button');
    buttons.forEach((b) => fireEvent.click(b));
    expect(screen.queryByTestId('draw-up-cta')).not.toBeInTheDocument();
  });

  it('does NOT render CTA on a stakeholder-update card (STK- prefix)', async () => {
    const entries = [makeEntry('STK-002')];
    vi.mocked(invokeIpc).mockResolvedValueOnce(entries);
    render(<AcceptedHistory artifactId="STK-002" onBack={vi.fn()} />);
    await new Promise((r) => setTimeout(r, 10));
    const buttons = screen.getAllByRole('button');
    buttons.forEach((b) => fireEvent.click(b));
    expect(screen.queryByTestId('draw-up-cta')).not.toBeInTheDocument();
  });

  it('does NOT render CTA on a workstream-advance card (WS- prefix)', async () => {
    const entries = [makeEntry('WS-008')];
    vi.mocked(invokeIpc).mockResolvedValueOnce(entries);
    render(<AcceptedHistory artifactId="WS-008" onBack={vi.fn()} />);
    await new Promise((r) => setTimeout(r, 10));
    const buttons = screen.getAllByRole('button');
    buttons.forEach((b) => fireEvent.click(b));
    expect(screen.queryByTestId('draw-up-cta')).not.toBeInTheDocument();
  });

  it('clicking CTA sends handoff.preview.requested with correct originType=decision', async () => {
    const entries = [makeEntry('DEC-007')];
    vi.mocked(invokeIpc).mockResolvedValueOnce(entries);
    render(<AcceptedHistory artifactId="DEC-007" onBack={vi.fn()} />);
    await new Promise((r) => setTimeout(r, 10));
    const toggleBtn = screen.getAllByRole('button')[0];
    fireEvent.click(toggleBtn);
    fireEvent.click(screen.getByTestId('draw-up-cta'));
    expect(mockSendHandoffPreviewRequested).toHaveBeenCalledWith(
      expect.objectContaining({ originType: 'decision' }),
    );
  });

  it('clicking CTA on position card sends originType=position', async () => {
    const entries = [makeEntry('POS-003')];
    vi.mocked(invokeIpc).mockResolvedValueOnce(entries);
    render(<AcceptedHistory artifactId="POS-003" onBack={vi.fn()} />);
    await new Promise((r) => setTimeout(r, 10));
    const toggleBtn = screen.getAllByRole('button')[0];
    fireEvent.click(toggleBtn);
    fireEvent.click(screen.getByTestId('draw-up-cta'));
    expect(mockSendHandoffPreviewRequested).toHaveBeenCalledWith(
      expect.objectContaining({ originType: 'position' }),
    );
  });
});
