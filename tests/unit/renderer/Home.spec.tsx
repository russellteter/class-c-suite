// tests/unit/renderer/Home.spec.tsx
// Source: tasks/ch7-test-brief.md §3 + docs/decisions/0009-ch7-playbooks-home.md §11
// RTL specs for the Home screen Ch.7 version (8-tile grid + Open Q&A bar +
// workstream rail + decisions list + writebacks counter + jobs strip).

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import React from 'react';

// Mock CSS imports (not available in jsdom)
vi.mock('../../../apps/renderer/src/design/tokens.css', () => ({}));

// Mock useHomeData to return fixture data — avoids IPC window subscriptions
vi.mock('../../../apps/renderer/src/hooks/useHomeData.js', () => ({
  useHomeData: vi.fn().mockReturnValue({
    workstreams: [
      { id: 'WS-01', status: 'GREEN', phase: 'execution' },
      { id: 'WS-02', status: 'GREEN', phase: 'execution' },
      { id: 'WS-03', status: 'YELLOW', phase: 'execution' },
      { id: 'WS-04', status: 'GREEN', phase: 'execution' },
      { id: 'WS-05', status: 'RED',   phase: 'execution' },
      { id: 'WS-06', status: 'GREEN', phase: 'maintenance' },
      { id: 'WS-07', status: 'YELLOW', phase: 'maintenance' },
      { id: 'WS-08', status: 'GREEN', phase: 'maintenance' },
    ],
    decisions: [
      { id: 'DEC-005', title: 'Strategic-option recap path' },
      { id: 'DEC-006', title: 'Barclays renewal — line of credit' },
      { id: 'DEC-008', title: 'GTM head-count reduction trigger' },
      { id: 'DEC-009', title: 'AWS deferral conversion path' },
      { id: 'DEC-011', title: 'Board deck framing — turnaround vs growth' },
    ],
    writebackCount: 3,
    costUsage: { windowPct: 68, todayUsd: 4.20, weekUsd: 19.80 },
  }),
}));

// Mock useKeyboardShortcuts — no window.ipc in jsdom
vi.mock('../../../apps/renderer/src/hooks/useKeyboardShortcuts.js', () => ({
  useKeyboardShortcuts: vi.fn(),
}));

import { Home } from '../../../apps/renderer/src/screens/Home.js';
import { useHomeData } from '../../../apps/renderer/src/hooks/useHomeData.js';
import {
  FIXTURE_WORKSTREAMS,
  FIXTURE_DECISIONS,
  FIXTURE_JOBS,
  FIXTURE_WRITEBACK_COUNT,
} from '../../../apps/renderer/src/screens/Home.fixtures.js';

const mockUseHomeData = vi.mocked(useHomeData);
const EMPTY_HOME_DATA = {
  workstreams: [] as typeof FIXTURE_WORKSTREAMS,
  decisions: [] as typeof FIXTURE_DECISIONS,
  writebackCount: 0,
  costUsage: null as null,
};

afterEach(cleanup);

describe('Home screen — 8 playbook tiles (ADR §11.1, §11.3)', () => {

  it('renders exactly 8 playbook tile elements (Home.tsx:line 307-312)', () => {
    render(React.createElement(Home, {}));
    const grid = screen.getByTestId('playbook-grid');
    const listItems = within(grid).getAllByRole('listitem');
    expect(listItems).toHaveLength(8);
  });

  it('tile for cash_lever is visible by label text "Cash Lever vs Trough" (Home.tsx:line 34)', () => {
    render(React.createElement(Home, {}));
    expect(screen.getByText('Cash Lever vs Trough')).toBeInTheDocument();
  });

  it('tile for stakeholder_1_1 is visible by label text "Stakeholder 1:1 Prep"', () => {
    render(React.createElement(Home, {}));
    expect(screen.getByText('Stakeholder 1:1 Prep')).toBeInTheDocument();
  });

  it('tile for quick_read is visible by label text "Quick Multi-Lens Read"', () => {
    render(React.createElement(Home, {}));
    expect(screen.getByText('Quick Multi-Lens Read')).toBeInTheDocument();
  });

  it('tile for pre_mortem is visible by label text "Pre-mortem"', () => {
    render(React.createElement(Home, {}));
    expect(screen.getByText('Pre-mortem')).toBeInTheDocument();
  });

  it('tile for gtm_realloc is visible by label text "GTM Resource Realloc"', () => {
    render(React.createElement(Home, {}));
    expect(screen.getByText('GTM Resource Realloc')).toBeInTheDocument();
  });

  it('tile for strategic_option is visible by label text "Strategic Option Eval"', () => {
    render(React.createElement(Home, {}));
    expect(screen.getByText('Strategic Option Eval')).toBeInTheDocument();
  });

  it('tile for board_narrative is visible by label text "Board Narrative / Deck"', () => {
    render(React.createElement(Home, {}));
    expect(screen.getByText('Board Narrative / Deck')).toBeInTheDocument();
  });

  it('tile for restructure_decision is visible by label text "Restructure Decision"', () => {
    render(React.createElement(Home, {}));
    expect(screen.getByText('Restructure Decision')).toBeInTheDocument();
  });

});

describe('Home screen — Open Q&A bar (ADR §12)', () => {

  it('Open Q&A bar renders in the document (textarea with id="open-qa-input")', () => {
    render(React.createElement(Home, {}));
    expect(document.getElementById('open-qa-input')).toBeInTheDocument();
  });

  it('Open Q&A input has placeholder text', () => {
    render(React.createElement(Home, {}));
    const ta = document.getElementById('open-qa-input') as HTMLTextAreaElement;
    expect(ta?.placeholder).toMatch(/ask/i);
  });

  it('Open Q&A section has aria label identifying its purpose', () => {
    render(React.createElement(Home, {}));
    expect(screen.getByRole('search')).toBeInTheDocument();
  });

});

describe('Home screen — workstream rail (ADR §11.1, §11.4)', () => {

  it('workstream rail renders (mocked useHomeData provides 8 workstreams)', () => {
    render(React.createElement(Home, {}));
    // WorkstreamRail renders WS IDs — check at least one appears
    expect(screen.getByText(/WS-01/i)).toBeInTheDocument();
  });

  it('all 8 workstream IDs appear in the rail', () => {
    render(React.createElement(Home, {}));
    for (const ws of FIXTURE_WORKSTREAMS) {
      expect(screen.getByText(ws.id)).toBeInTheDocument();
    }
  });

  it('left rail nav has aria-label describing its content', () => {
    render(React.createElement(Home, {}));
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

});

describe('Home screen — top decisions list (ADR §11.2)', () => {

  it('renders 5 decision rows from fixture decisions', () => {
    render(React.createElement(Home, {}));
    for (const dec of FIXTURE_DECISIONS) {
      expect(screen.getByText(dec.title)).toBeInTheDocument();
    }
  });

  it('first decision title is visible (Strategic-option recap path)', () => {
    render(React.createElement(Home, {}));
    expect(screen.getByText('Strategic-option recap path')).toBeInTheDocument();
  });

  it('"No open decisions" copy renders when decisions list is empty (useHomeData mock override)', () => {
    mockUseHomeData.mockReturnValueOnce(EMPTY_HOME_DATA);
    render(React.createElement(Home, {}));
    expect(screen.getByText(/no open decisions/i)).toBeInTheDocument();
  });

});

describe('Home screen — writebacks counter (ADR §11.2)', () => {

  it('shows FIXTURE_WRITEBACK_COUNT (3) as the writebacks count in aria-label', () => {
    render(React.createElement(Home, {}));
    // WritebacksCounter renders aria-label with count
    expect(screen.getByRole('button', { name: /3 writebacks/i })).toBeInTheDocument();
  });

  it('shows 0 when writebackCount is 0 (useHomeData mock override)', () => {
    mockUseHomeData.mockReturnValueOnce(EMPTY_HOME_DATA);
    render(React.createElement(Home, {}));
    // WritebacksCounter aria-label says "0 writebacks"
    expect(screen.getByRole('button', { name: /0 writeback/i })).toBeInTheDocument();
  });

});

describe('Home screen — scheduled-jobs strip (ADR §11.2, §13.2)', () => {

  it('JobsStrip is present in the right column (Home.tsx:line 369)', () => {
    render(React.createElement(Home, {}));
    // JobsStrip renders "Pending Ch.10" placeholder slots
    expect(screen.getAllByText(/pending ch\.10/i).length).toBeGreaterThanOrEqual(1);
  });

  it('"Pending Ch.10" placeholder renders in jobs strip (JobsStrip renders 5 slots)', () => {
    render(React.createElement(Home, {}));
    const pendingItems = screen.getAllByText(/pending ch\.10/i);
    expect(pendingItems.length).toBeGreaterThanOrEqual(1);
  });

  it('FIXTURE_JOBS all have pendingNote = "Pending Ch.10"', () => {
    // Fixture validation — confirms test data is consistent
    for (const job of FIXTURE_JOBS) {
      expect(job.pendingNote).toBe('Pending Ch.10');
    }
  });

});
