// tests/unit/renderer/OpenQABar.spec.tsx
// Source: tasks/ch7-test-brief.md §3 + docs/decisions/0009-ch7-playbooks-home.md §12.1
// RTL specs for the OpenQABar component (multiline textbox + Cmd+Enter submit).

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { OpenQABar } from '../../../apps/renderer/src/components/OpenQABar.js';
import type { OpenQABarProps } from '../../../apps/renderer/src/components/OpenQABar.js';

afterEach(cleanup);

function makeProps(overrides?: Partial<OpenQABarProps>): OpenQABarProps {
  return {
    value: '',
    onChange: vi.fn(),
    onSubmit: vi.fn(),
    decomposerPreview: null,
    submitDisabled: false,
    ...overrides,
  };
}

describe('OpenQABar — multiline input (ADR §12.1)', () => {

  it('renders a textarea with id="open-qa-input" (OpenQABar.tsx:line 127)', () => {
    render(React.createElement(OpenQABar, makeProps()));
    const ta = document.getElementById('open-qa-input');
    expect(ta).not.toBeNull();
    expect(ta?.tagName.toLowerCase()).toBe('textarea');
  });

  it('accepts text input — typed text triggers onChange callback', async () => {
    const onChange = vi.fn();
    render(React.createElement(OpenQABar, makeProps({ onChange })));
    const ta = document.getElementById('open-qa-input') as HTMLTextAreaElement;
    await userEvent.type(ta, 'test query');
    expect(onChange).toHaveBeenCalled();
  });

});

describe('OpenQABar — Cmd+Enter submit (ADR §12.1)', () => {

  it('Cmd+Enter calls onSubmit with the current textbox value (OpenQABar.tsx:line 45-52)', async () => {
    const onSubmit = vi.fn();
    render(React.createElement(OpenQABar, makeProps({ value: 'what is our runway', onSubmit })));
    const ta = document.getElementById('open-qa-input') as HTMLTextAreaElement;
    await userEvent.click(ta);
    await userEvent.keyboard('{Meta>}{Enter}{/Meta}');
    expect(onSubmit).toHaveBeenCalledWith('what is our runway');
  });

  it('Cmd+Enter with empty value does NOT call onSubmit', async () => {
    const onSubmit = vi.fn();
    render(React.createElement(OpenQABar, makeProps({ value: '', onSubmit })));
    const ta = document.getElementById('open-qa-input') as HTMLTextAreaElement;
    await userEvent.click(ta);
    await userEvent.keyboard('{Meta>}{Enter}{/Meta}');
    expect(onSubmit).not.toHaveBeenCalled();
  });

});

describe('OpenQABar — submit button disabled state', () => {

  it('submit button is disabled when submitDisabled: true (OpenQABar.tsx:line 163)', () => {
    render(React.createElement(OpenQABar, makeProps({ value: 'some query', submitDisabled: true })));
    const btn = screen.getByRole('button', { name: /submit/i });
    expect(btn).toBeDisabled();
  });

  it('submit button is disabled when value is empty string (OpenQABar.tsx:line 163)', () => {
    render(React.createElement(OpenQABar, makeProps({ value: '', submitDisabled: false })));
    const btn = screen.getByRole('button', { name: /submit/i });
    expect(btn).toBeDisabled();
  });

});

describe('OpenQABar — decomposer preview chips (ADR §12.4)', () => {

  it('decomposer preview chips render when decomposerPreview is non-null', () => {
    render(React.createElement(OpenQABar, makeProps({
      decomposerPreview: { lenses: ['CFO', 'COS'], mcps: [] },
    })));
    expect(screen.getByLabelText('Routing preview')).toBeInTheDocument();
  });

  it('each chip shows the lens role name', () => {
    render(React.createElement(OpenQABar, makeProps({
      decomposerPreview: { lenses: ['CFO', 'COS'], mcps: [] },
    })));
    expect(screen.getByText('CFO')).toBeInTheDocument();
    expect(screen.getByText('COS')).toBeInTheDocument();
  });

  it('no chips render when decomposerPreview is null (OpenQABar.tsx:line 202)', () => {
    render(React.createElement(OpenQABar, makeProps({ decomposerPreview: null })));
    expect(screen.queryByLabelText('Routing preview')).not.toBeInTheDocument();
  });

});
