// tests/unit/renderer/Home.spec.tsx
// Source: tasks/ch7-test-brief.md §3 + docs/decisions/0009-ch7-playbooks-home.md §11
// RTL specs for the Home screen Ch.7 version (8-tile grid + Open Q&A bar +
// workstream rail + decisions list + writebacks counter + jobs strip).
//
// NOTE: The Ch.7 Home component (apps/renderer/src/screens/Home.tsx rewrite)
// is the Renderer sub-agent's scope and is not yet shipped. specs that rely on
// the new Home component shape are it.todo until the Renderer sub-agent lands
// the full Ch.7 Home with the HomeProps / HomeData contract.
//
// The fixture file (apps/renderer/src/screens/Home.fixtures.ts) IS available —
// written by Renderer sub-agent in its initial file drop.

import { describe, it } from 'vitest';

// When the Ch.7 Home is shipped, replace this block with:
//   import { render, screen } from '@testing-library/react';
//   import { Home } from '../../../apps/renderer/src/screens/Home.js';
//   import { FIXTURE_WORKSTREAMS, FIXTURE_DECISIONS, FIXTURE_JOBS, FIXTURE_WRITEBACK_COUNT } from '../../../apps/renderer/src/screens/Home.fixtures.js';

describe('Home screen — 8 playbook tiles (ADR §11.1, §11.3)', () => {

  it.todo('renders exactly 8 playbook tile elements');
  it.todo('tile for cash_lever is visible by label text "Cash Lever"');
  it.todo('tile for stakeholder_1_1 is visible by label text');
  it.todo('tile for quick_read is visible by label text');
  it.todo('tile for pre_mortem is visible by label text');
  it.todo('tile for gtm_realloc is visible by label text');
  it.todo('tile for strategic_option is visible by label text');
  it.todo('tile for board_narrative is visible by label text');
  it.todo('tile for restructure_decision is visible by label text');

});

describe('Home screen — Open Q&A bar (ADR §12)', () => {

  it.todo('Open Q&A bar renders in the document');
  it.todo('Open Q&A input accepts text input');
  it.todo('Open Q&A input has placeholder text');

});

describe('Home screen — workstream rail (ADR §11.1, §11.4)', () => {

  it.todo('workstream rail renders when FIXTURE_WORKSTREAMS provided (8 workstreams)');
  it.todo('each workstream status pill renders with correct status value');
  it.todo('empty-state copy "No workstream data" renders when workstreams is empty array');

});

describe('Home screen — top decisions list (ADR §11.2)', () => {

  it.todo('renders 5 decision rows from FIXTURE_DECISIONS');
  it.todo('each decision row shows the decision title');
  it.todo('"No open decisions" copy renders when decisions list is empty');

});

describe('Home screen — writebacks counter (ADR §11.2)', () => {

  it.todo('shows FIXTURE_WRITEBACK_COUNT (3) as the writebacks count');
  it.todo('shows 0 when writebackCount is 0');

});

describe('Home screen — scheduled-jobs strip (ADR §11.2, §13.2)', () => {

  it.todo('renders 5 job slots from FIXTURE_JOBS');
  it.todo('"Pending Ch.10" placeholder renders for jobs with pendingNote');
  it.todo('renders 5 grayed placeholders with "Pending Ch.10" when no live jobs data');

});
