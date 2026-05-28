// tests/unit/renderer/LinkedExecution.spec.tsx
// Source: tasks/ch9-renderer-brief.md §5 — LinkedExecution spec
// RTL specs for AC-11: renders when executed_by populated; hidden when null/empty.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';

vi.mock('../../../apps/renderer/src/design/tokens.css', () => ({}));

import { LinkedExecution } from '../../../apps/renderer/src/components/LinkedExecution.js';

describe('LinkedExecution', () => {
  afterEach(cleanup);

  it('renders nothing when executedBy is null', () => {
    const { container } = render(<LinkedExecution executedBy={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when executedBy is an empty array', () => {
    const { container } = render(<LinkedExecution executedBy={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the section when executedBy has entries', () => {
    render(
      <LinkedExecution
        executedBy={['executions/DEC-007/Q3-plan.docx']}
      />,
    );
    expect(screen.getByTestId('linked-execution')).toBeInTheDocument();
  });

  it('renders "Linked execution" label text', () => {
    render(
      <LinkedExecution
        executedBy={['executions/DEC-007/Q3-plan.docx']}
      />,
    );
    expect(screen.getByText('Linked execution')).toBeInTheDocument();
  });

  it('renders each path as a data-testid="linked-execution-path"', () => {
    render(
      <LinkedExecution
        executedBy={[
          'executions/DEC-007/Q3-plan.docx',
          'executions/DEC-007/Board-deck.pptx',
        ]}
      />,
    );
    const paths = screen.getAllByTestId('linked-execution-path');
    expect(paths).toHaveLength(2);
  });

  it('renders path text content correctly', () => {
    render(
      <LinkedExecution
        executedBy={['executions/DEC-007/Q3-plan.docx']}
      />,
    );
    expect(screen.getByText('executions/DEC-007/Q3-plan.docx')).toBeInTheDocument();
  });

  it('renders paths as clickable buttons when onOpenPath provided', () => {
    const onOpenPath = vi.fn();
    render(
      <LinkedExecution
        executedBy={['executions/DEC-007/Q3-plan.docx']}
        onOpenPath={onOpenPath}
      />,
    );
    const pathBtn = screen.getByTestId('linked-execution-path');
    expect(pathBtn.tagName).toBe('BUTTON');
  });

  it('fires onOpenPath with correct path on click', () => {
    const onOpenPath = vi.fn();
    render(
      <LinkedExecution
        executedBy={['executions/DEC-007/Q3-plan.docx']}
        onOpenPath={onOpenPath}
      />,
    );
    fireEvent.click(screen.getByTestId('linked-execution-path'));
    expect(onOpenPath).toHaveBeenCalledWith('executions/DEC-007/Q3-plan.docx');
  });

  it('renders paths as spans (not buttons) when onOpenPath not provided', () => {
    render(
      <LinkedExecution
        executedBy={['executions/DEC-007/Q3-plan.docx']}
      />,
    );
    const pathEl = screen.getByTestId('linked-execution-path');
    expect(pathEl.tagName).toBe('SPAN');
  });

  it('section has accessible aria-label', () => {
    render(
      <LinkedExecution executedBy={['executions/DEC-007/Q3-plan.docx']} />,
    );
    expect(screen.getByRole('region', { name: /linked execution/i })).toBeInTheDocument();
  });

  it('path buttons have accessible aria-label', () => {
    const onOpenPath = vi.fn();
    render(
      <LinkedExecution
        executedBy={['executions/DEC-007/Q3-plan.docx']}
        onOpenPath={onOpenPath}
      />,
    );
    expect(screen.getByLabelText(/Open execution artifact/)).toBeInTheDocument();
  });
});
