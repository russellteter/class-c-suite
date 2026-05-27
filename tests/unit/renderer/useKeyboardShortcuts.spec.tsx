// tests/unit/renderer/useKeyboardShortcuts.spec.tsx
// Source: tasks/ch7-test-brief.md §3 + docs/decisions/0009-ch7-playbooks-home.md §11.3 §13.1
// RTL specs for the useKeyboardShortcuts hook.
// Ordinal-to-id mapping (useKeyboardShortcuts.ts:line 12-21):
//   1='cash_lever_vs_trough', 2='gtm_resource_reallocation', 3='strategic_option_evaluation',
//   4='stakeholder_1on1_prep', 5='board_narrative_prep', 6='restructure_decision',
//   7='pre_mortem_on_proposed_action', 8='quick_multi_lens_read'.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, cleanup, act } from '@testing-library/react';
import { useKeyboardShortcuts } from '../../../apps/renderer/src/hooks/useKeyboardShortcuts.js';

afterEach(cleanup);

// Setup window.ipc mock before each test
let mockIpcSend: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockIpcSend = vi.fn();
  Object.defineProperty(window, 'ipc', {
    value: { send: mockIpcSend },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  // Remove window.ipc after each test
  Object.defineProperty(window, 'ipc', {
    value: undefined,
    writable: true,
    configurable: true,
  });
});

function fireKeydown(key: string, metaKey = true) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, metaKey, bubbles: true }));
  });
}

describe('useKeyboardShortcuts — Cmd+1..8 playbook invocation (ADR §13.1)', () => {

  it('Cmd+1 emits IPC playbook.invoke with playbookId "cash_lever_vs_trough"', () => {
    renderHook(() => useKeyboardShortcuts());
    fireKeydown('1');
    expect(mockIpcSend).toHaveBeenCalledWith({ kind: 'playbook.invoke', payload: { playbookId: 'cash_lever_vs_trough' } });
  });

  it('Cmd+2 emits IPC playbook.invoke with playbookId "gtm_resource_reallocation"', () => {
    renderHook(() => useKeyboardShortcuts());
    fireKeydown('2');
    expect(mockIpcSend).toHaveBeenCalledWith({ kind: 'playbook.invoke', payload: { playbookId: 'gtm_resource_reallocation' } });
  });

  it('Cmd+3 emits IPC playbook.invoke with playbookId "strategic_option_evaluation"', () => {
    renderHook(() => useKeyboardShortcuts());
    fireKeydown('3');
    expect(mockIpcSend).toHaveBeenCalledWith({ kind: 'playbook.invoke', payload: { playbookId: 'strategic_option_evaluation' } });
  });

  it('Cmd+4 emits IPC playbook.invoke with playbookId "stakeholder_1on1_prep"', () => {
    renderHook(() => useKeyboardShortcuts());
    fireKeydown('4');
    expect(mockIpcSend).toHaveBeenCalledWith({ kind: 'playbook.invoke', payload: { playbookId: 'stakeholder_1on1_prep' } });
  });

  it('Cmd+5 emits IPC playbook.invoke with playbookId "board_narrative_prep"', () => {
    renderHook(() => useKeyboardShortcuts());
    fireKeydown('5');
    expect(mockIpcSend).toHaveBeenCalledWith({ kind: 'playbook.invoke', payload: { playbookId: 'board_narrative_prep' } });
  });

  it('Cmd+6 emits IPC playbook.invoke with playbookId "restructure_decision"', () => {
    renderHook(() => useKeyboardShortcuts());
    fireKeydown('6');
    expect(mockIpcSend).toHaveBeenCalledWith({ kind: 'playbook.invoke', payload: { playbookId: 'restructure_decision' } });
  });

  it('Cmd+7 emits IPC playbook.invoke with playbookId "pre_mortem_on_proposed_action"', () => {
    renderHook(() => useKeyboardShortcuts());
    fireKeydown('7');
    expect(mockIpcSend).toHaveBeenCalledWith({ kind: 'playbook.invoke', payload: { playbookId: 'pre_mortem_on_proposed_action' } });
  });

  it('Cmd+8 emits IPC playbook.invoke with playbookId "quick_multi_lens_read"', () => {
    renderHook(() => useKeyboardShortcuts());
    fireKeydown('8');
    expect(mockIpcSend).toHaveBeenCalledWith({ kind: 'playbook.invoke', payload: { playbookId: 'quick_multi_lens_read' } });
  });

});

describe('useKeyboardShortcuts — Cmd+/ focuses Open Q&A (ADR §13.1)', () => {

  it('Cmd+/ calls focus() on the element with id="open-qa-input"', () => {
    // Insert a fake textarea so document.getElementById finds it
    const ta = document.createElement('textarea');
    ta.id = 'open-qa-input';
    const focusSpy = vi.spyOn(ta, 'focus');
    document.body.appendChild(ta);

    renderHook(() => useKeyboardShortcuts());
    fireKeydown('/');

    expect(focusSpy).toHaveBeenCalled();
    document.body.removeChild(ta);
  });

  it('Cmd+/ does not emit a playbook.invoke IPC call', () => {
    renderHook(() => useKeyboardShortcuts());
    fireKeydown('/');
    const invokeCalls = mockIpcSend.mock.calls.filter((c) => c[0]?.kind === 'playbook.invoke');
    expect(invokeCalls).toHaveLength(0);
  });

});

describe('useKeyboardShortcuts — Cmd+R refresh (ADR §13.1)', () => {

  it('Cmd+R emits IPC home.refresh', () => {
    renderHook(() => useKeyboardShortcuts());
    fireKeydown('r');
    expect(mockIpcSend).toHaveBeenCalledWith({ kind: 'home.refresh', payload: {} });
  });

});

describe('useKeyboardShortcuts — cleanup on unmount', () => {

  it('no keyboard listener leak after component unmounts (removeEventListener called)', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useKeyboardShortcuts());
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    unmount();
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('event listener handler is the same function for add and remove (useKeyboardShortcuts.ts:line 57)', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useKeyboardShortcuts());
    const addedHandler = addSpy.mock.calls.find((c) => c[0] === 'keydown')?.[1];

    unmount();
    const removedHandler = removeSpy.mock.calls.find((c) => c[0] === 'keydown')?.[1];

    expect(addedHandler).toBe(removedHandler);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

});
