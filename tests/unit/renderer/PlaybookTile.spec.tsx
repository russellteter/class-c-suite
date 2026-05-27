// tests/unit/renderer/PlaybookTile.spec.tsx
// Source: tasks/ch7-test-brief.md §3 + docs/decisions/0009-ch7-playbooks-home.md §11.3
// RTL specs for the PlaybookTile component.
//
// NOTE: apps/renderer/src/components/PlaybookTile.tsx does not exist yet
// (Renderer sub-agent scope). All cases are it.todo until that component ships.
// DO NOT import the missing component — vitest load-time error would break suite.
//
// HomeTypes.ts IS available and defines PlaybookTileData.

import { describe, it } from 'vitest';

// When PlaybookTile ships, replace with:
//   import { render, screen } from '@testing-library/react';
//   import userEvent from '@testing-library/user-event';
//   import { PlaybookTile } from '../../../apps/renderer/src/components/PlaybookTile.js';
//   import type { PlaybookTileData } from '../../../apps/renderer/src/components/HomeTypes.js';

describe('PlaybookTile — rendering (ADR §11.3)', () => {

  it.todo('renders with required props (ordinal, id, name, icon, freshness)');
  it.todo('tile label/name text is visible in the document');

});

describe('PlaybookTile — click interaction (ADR §11.3)', () => {

  it.todo('click invokes onClick callback');
  it.todo('click invokes onClick with the correct PlaybookId payload');

});

describe('PlaybookTile — blocked state (ADR §3.6)', () => {

  it.todo('when blocked: true, tile renders in disabled state');
  it.todo('when blocked: true, tooltip text contains blockedReason string');
  it.todo('when blocked: true, click does NOT invoke onClick');

});

describe('PlaybookTile — freshness dot (ADR §11.3)', () => {

  it.todo('freshness "green" → correct green color indicator');
  it.todo('freshness "amber" → correct amber color indicator');
  it.todo('freshness "gray" → correct gray color indicator');

});
