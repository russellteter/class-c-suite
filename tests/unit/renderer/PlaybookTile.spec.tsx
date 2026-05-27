// tests/unit/renderer/PlaybookTile.spec.tsx
// Source: tasks/ch7-test-brief.md §3 + docs/decisions/0009-ch7-playbooks-home.md §11.3
// RTL specs for the PlaybookTile component.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlaybookTile } from '../../../apps/renderer/src/components/PlaybookTile.js';
import type { PlaybookTileProps } from '../../../apps/renderer/src/components/PlaybookTile.js';

afterEach(cleanup);

function makeTileProps(overrides?: Partial<PlaybookTileProps>): PlaybookTileProps {
  return {
    ordinal: 1,
    id: 'cash_lever_vs_trough',
    name: 'Cash Lever',
    icon: '💰',
    lastRunAt: null,
    freshness: 'green',
    keyboardHint: '⌘1',
    onClick: vi.fn(),
    ...overrides,
  };
}

describe('PlaybookTile — rendering (ADR §11.3)', () => {

  it('renders with required props (ordinal, id, name, icon, freshness)', () => {
    render(<PlaybookTile {...makeTileProps()} />);
    // Button role confirms the tile rendered
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('tile label/name text is visible in the document', () => {
    render(<PlaybookTile {...makeTileProps({ name: 'Quick Read' })} />);
    expect(screen.getByText('Quick Read')).toBeInTheDocument();
  });

});

describe('PlaybookTile — click interaction (ADR §11.3)', () => {

  it('click invokes onClick callback', async () => {
    const onClick = vi.fn();
    render(<PlaybookTile {...makeTileProps({ onClick })} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('click invokes onClick with the correct PlaybookId payload', async () => {
    const onClick = vi.fn();
    render(<PlaybookTile {...makeTileProps({ id: 'pre_mortem_on_proposed_action', onClick })} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledWith('pre_mortem_on_proposed_action');
  });

});

describe('PlaybookTile — blocked state (ADR §3.6)', () => {

  it('when blocked: true, tile renders with aria-disabled (PlaybookTile.tsx:line 116)', () => {
    render(<PlaybookTile {...makeTileProps({ blocked: true, blockedReason: 'NetSuite offline' })} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
  });

  it('when blocked: true, tooltip title contains blockedReason string (PlaybookTile.tsx:line 116)', () => {
    render(<PlaybookTile {...makeTileProps({ blocked: true, blockedReason: 'NetSuite offline' })} />);
    expect(screen.getByRole('button')).toHaveAttribute('title', 'NetSuite offline');
  });

  it('when blocked: true, click does NOT invoke onClick (PlaybookTile.tsx:line 120)', async () => {
    const onClick = vi.fn();
    // pointerEvents: none prevents clicks from reaching handler; simulate keyboard instead
    const tile = render(<PlaybookTile {...makeTileProps({ blocked: true, onClick })} />);
    const btn = tile.getByRole('button');
    // Direct onClick call is guarded by !blocked check in the handler
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onClick).not.toHaveBeenCalled();
  });

});

describe('PlaybookTile — freshness dot (ADR §11.3)', () => {

  it('freshness "green" → freshness dot has var(--color-success) background (PlaybookTile.tsx:line 49)', () => {
    const { container } = render(<PlaybookTile {...makeTileProps({ freshness: 'green' })} />);
    const dot = container.querySelector('[aria-hidden="true"][title]') as HTMLElement | null;
    expect(dot?.style.background).toBe('var(--color-success)');
  });

  it('freshness "amber" → freshness dot has var(--color-warning) background', () => {
    const { container } = render(<PlaybookTile {...makeTileProps({ freshness: 'amber' })} />);
    const dot = container.querySelector('[aria-hidden="true"][title]') as HTMLElement | null;
    expect(dot?.style.background).toBe('var(--color-warning)');
  });

  it('freshness "gray" → freshness dot has var(--color-text-muted) background', () => {
    const { container } = render(<PlaybookTile {...makeTileProps({ freshness: 'gray' })} />);
    const dot = container.querySelector('[aria-hidden="true"][title]') as HTMLElement | null;
    expect(dot?.style.background).toBe('var(--color-text-muted)');
  });

});
