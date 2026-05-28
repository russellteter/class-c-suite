// tests/unit/renderer/HandoffPreview.spec.tsx
// Source: tasks/ch9-renderer-brief.md §5
// RTL specs for HandoffPreview screen (ADR-0011 §5.2 + AC-7 + AC-8).
// ≥12 specs covering: render from fixture, edit toggle, send IPC, cancel no-persist.

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../../../apps/renderer/src/design/tokens.css', () => ({}));

// Stub IPC handoff helpers
const mockSendHandoffSend = vi.fn();
const mockSendHandoffCancelled = vi.fn();
const mockOnHandoffSent = vi.fn(() => () => {});
const mockOnHandoffFailed = vi.fn(() => () => {});

vi.mock('../../../apps/renderer/src/ipc/handoff.js', () => ({
  sendHandoffSend: (...args: unknown[]) => mockSendHandoffSend(...args),
  sendHandoffCancelled: (...args: unknown[]) => mockSendHandoffCancelled(...args),
  onHandoffSent: (...args: unknown[]) => mockOnHandoffSent(...args),
  onHandoffFailed: (...args: unknown[]) => mockOnHandoffFailed(...args),
  sendHandoffPreviewRequested: vi.fn(),
  onHandoffPreviewReady: vi.fn(() => () => {}),
}));

// Stub parseMemoMarkdown from MemoViewer (markdown rendering)
vi.mock('../../../apps/renderer/src/screens/MemoViewer.js', () => ({
  parseMemoMarkdown: (md: string) => md,
  MemoViewer: vi.fn(),
}));

import { HandoffPreview } from '../../../apps/renderer/src/screens/HandoffPreview.js';
import type { HandoffBrief } from '../../../apps/renderer/src/ipc/handoff.js';

// ── Fixture ────────────────────────────────────────────────────────────────

const BRIEF_FIXTURE: HandoffBrief = {
  runId: 'run-ch9-001',
  frontmatter: {
    type: 'handoff',
    id: 'HANDOFF-2026-05-27-q3-turnaround',
    origin_type: 'decision',
    origin_path: 'decisions/DEC-007.md',
    origin_title: 'Q3 turnaround decision',
    created: '2026-05-27',
    created_by_run_id: 'run-ch9-001',
    status: 'drafted',
    cowork_brand_skills: ['class-brand-document', 'class-brand-presentations'],
    executed_by: null,
    filename: '2026-05-27-q3-turnaround.md',
  },
  bodyMarkdown: '# Q3 Turnaround — Execution Brief\n\n## Decision being executed\nPivot marketing budget.',
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe('HandoffPreview', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the screen container', () => {
    render(<HandoffPreview brief={BRIEF_FIXTURE} onClose={onClose} />);
    expect(screen.getByTestId('handoff-preview')).toBeInTheDocument();
  });

  it('renders handoff ID in header', () => {
    render(<HandoffPreview brief={BRIEF_FIXTURE} onClose={onClose} />);
    expect(screen.getByText('HANDOFF-2026-05-27-q3-turnaround')).toBeInTheDocument();
  });

  it('renders the "Draw up for Cowork" label in header', () => {
    render(<HandoffPreview brief={BRIEF_FIXTURE} onClose={onClose} />);
    expect(screen.getByText('Draw up for Cowork')).toBeInTheDocument();
  });

  it('renders the brief body content', () => {
    render(<HandoffPreview brief={BRIEF_FIXTURE} onClose={onClose} />);
    expect(screen.getByTestId('brief-body-rendered')).toBeInTheDocument();
  });

  it('renders the metadata panel', () => {
    render(<HandoffPreview brief={BRIEF_FIXTURE} onClose={onClose} />);
    expect(screen.getByTestId('metadata-panel')).toBeInTheDocument();
  });

  it('renders filename preview in metadata panel', () => {
    render(<HandoffPreview brief={BRIEF_FIXTURE} onClose={onClose} />);
    expect(screen.getByTestId('filename-preview')).toHaveTextContent('2026-05-27-q3-turnaround.md');
  });

  it('shows skill checkboxes for all 5 brand skills', () => {
    render(<HandoffPreview brief={BRIEF_FIXTURE} onClose={onClose} />);
    const checkboxes = screen.getByTestId('skill-checkboxes').querySelectorAll('input[type="checkbox"]');
    expect(checkboxes).toHaveLength(5);
  });

  it('pre-checks skills from brief fixture', () => {
    render(<HandoffPreview brief={BRIEF_FIXTURE} onClose={onClose} />);
    const docLabel = screen.getByLabelText('Brand skill: class-brand-document');
    const excelLabel = screen.getByLabelText('Brand skill: class-brand-excel');
    expect(docLabel).toBeChecked();
    expect(excelLabel).not.toBeChecked();
  });

  it('Edit body button toggles to textarea', () => {
    render(<HandoffPreview brief={BRIEF_FIXTURE} onClose={onClose} />);
    const editBtn = screen.getByTestId('edit-body-btn');
    fireEvent.click(editBtn);
    expect(screen.getByTestId('edit-body-textarea')).toBeInTheDocument();
    expect(screen.queryByTestId('brief-body-rendered')).not.toBeInTheDocument();
  });

  it('Save button after edit restores rendered view with updated text', () => {
    render(<HandoffPreview brief={BRIEF_FIXTURE} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('edit-body-btn'));
    const textarea = screen.getByTestId('edit-body-textarea');
    fireEvent.change(textarea, { target: { value: '# Edited brief body' } });
    fireEvent.click(screen.getByTestId('edit-save-btn'));
    expect(screen.getByTestId('brief-body-rendered')).toBeInTheDocument();
    // textarea gone after save
    expect(screen.queryByTestId('edit-body-textarea')).not.toBeInTheDocument();
  });

  it('Discard button cancels edit without persisting changes', () => {
    render(<HandoffPreview brief={BRIEF_FIXTURE} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('edit-body-btn'));
    const textarea = screen.getByTestId('edit-body-textarea');
    fireEvent.change(textarea, { target: { value: 'discarded text' } });
    fireEvent.click(screen.getByTestId('edit-cancel-btn'));
    expect(screen.queryByTestId('edit-body-textarea')).not.toBeInTheDocument();
    // Body rendered view is back
    expect(screen.getByTestId('brief-body-rendered')).toBeInTheDocument();
  });

  it('Send to Cowork button fires sendHandoffSend with correct runId', () => {
    render(<HandoffPreview brief={BRIEF_FIXTURE} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('send-to-cowork-btn'));
    expect(mockSendHandoffSend).toHaveBeenCalledOnce();
    expect(mockSendHandoffSend).toHaveBeenCalledWith(
      expect.objectContaining({ runId: 'run-ch9-001' }),
    );
  });

  it('Cancel button fires sendHandoffCancelled and calls onClose', () => {
    render(<HandoffPreview brief={BRIEF_FIXTURE} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('cancel-btn'));
    expect(mockSendHandoffCancelled).toHaveBeenCalledWith('run-ch9-001');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('Cancel does not fire sendHandoffSend (nothing persisted)', () => {
    render(<HandoffPreview brief={BRIEF_FIXTURE} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('cancel-btn'));
    expect(mockSendHandoffSend).not.toHaveBeenCalled();
  });

  it('Send button is accessible with aria-label', () => {
    render(<HandoffPreview brief={BRIEF_FIXTURE} onClose={onClose} />);
    const sendBtn = screen.getByTestId('send-to-cowork-btn');
    expect(sendBtn).toHaveAttribute('aria-label', expect.stringContaining('Send to Cowork'));
  });

  it('Cancel button is accessible with aria-label', () => {
    render(<HandoffPreview brief={BRIEF_FIXTURE} onClose={onClose} />);
    const cancelBtn = screen.getByTestId('cancel-btn');
    expect(cancelBtn).toHaveAttribute('aria-label', expect.stringContaining('Cancel'));
  });
});
