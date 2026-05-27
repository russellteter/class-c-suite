// tests/unit/renderer/useKeyboardShortcuts.spec.tsx
// Source: tasks/ch7-test-brief.md §3 + docs/decisions/0009-ch7-playbooks-home.md §11.3 §13.1
// RTL specs for the useKeyboardShortcuts hook.
// Ordinal-to-id mapping: cash_lever=1, gtm_realloc=2, strategic_option=3,
// stakeholder_1_1=4, board_narrative=5, restructure_decision=6, pre_mortem=7, quick_read=8.
//
// NOTE: apps/renderer/src/hooks/useKeyboardShortcuts.ts does not exist yet
// (Renderer sub-agent scope). All cases are it.todo until that hook ships.
// DO NOT import the missing hook — vitest load-time error would break the suite.

import { describe, it } from 'vitest';

// When useKeyboardShortcuts ships, replace with:
//   import { render, screen } from '@testing-library/react';
//   import userEvent from '@testing-library/user-event';
//   import { useKeyboardShortcuts } from '../../../apps/renderer/src/hooks/useKeyboardShortcuts.js';

describe('useKeyboardShortcuts — Cmd+1..8 playbook invocation (ADR §13.1)', () => {

  it.todo('Cmd+1 emits IPC playbook.invoke with playbookId "cash_lever"');
  it.todo('Cmd+2 emits IPC playbook.invoke with playbookId "gtm_realloc"');
  it.todo('Cmd+3 emits IPC playbook.invoke with playbookId "strategic_option"');
  it.todo('Cmd+4 emits IPC playbook.invoke with playbookId "stakeholder_1_1"');
  it.todo('Cmd+5 emits IPC playbook.invoke with playbookId "board_narrative"');
  it.todo('Cmd+6 emits IPC playbook.invoke with playbookId "restructure_decision"');
  it.todo('Cmd+7 emits IPC playbook.invoke with playbookId "pre_mortem"');
  it.todo('Cmd+8 emits IPC playbook.invoke with playbookId "quick_read"');

});

describe('useKeyboardShortcuts — Cmd+/ focuses Open Q&A (ADR §13.1)', () => {

  it.todo('Cmd+/ calls focus() on the Open Q&A input element');
  it.todo('Cmd+/ uses the ref passed to the hook, not a global query');

});

describe('useKeyboardShortcuts — Cmd+R refresh (ADR §13.1)', () => {

  it.todo('Cmd+R emits IPC home.refresh');

});

describe('useKeyboardShortcuts — cleanup on unmount', () => {

  it.todo('no keyboard listener leak after component unmounts');
  it.todo('event listeners are removed on cleanup (removeEventListener called)');

});
