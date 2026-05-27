// tests/unit/renderer/OpenQABar.spec.tsx
// Source: tasks/ch7-test-brief.md §3 + docs/decisions/0009-ch7-playbooks-home.md §12.1
// RTL specs for the OpenQABar component (multiline textbox + Cmd+Enter submit).
//
// NOTE: apps/renderer/src/components/OpenQABar.tsx does not exist yet
// (Renderer sub-agent scope). All cases are it.todo until that component ships.
// DO NOT import the missing component — vitest load-time error would break suite.

import { describe, it } from 'vitest';

// When OpenQABar ships, replace with:
//   import { render, screen } from '@testing-library/react';
//   import userEvent from '@testing-library/user-event';
//   import { OpenQABar } from '../../../apps/renderer/src/components/OpenQABar.js';

describe('OpenQABar — multiline input (ADR §12.1)', () => {

  it.todo('renders a multiline textbox (textarea or role="textbox" with multiline)');
  it.todo('accepts text input — typed text appears in the textbox');

});

describe('OpenQABar — Cmd+Enter submit (ADR §12.1)', () => {

  it.todo('Cmd+Enter calls onSubmit with the current textbox value');
  it.todo('Cmd+Enter with empty value does NOT call onSubmit');

});

describe('OpenQABar — submit button disabled state', () => {

  it.todo('submit button is disabled when submitDisabled: true');
  it.todo('submit button is enabled when submitDisabled: false and value non-empty');

});

describe('OpenQABar — decomposer preview chips (ADR §12.4)', () => {

  it.todo('decomposer preview chips render when decomposerPreview is non-null');
  it.todo('each chip shows the lens role name');
  it.todo('no chips render when decomposerPreview is null');

});
