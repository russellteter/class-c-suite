// tests/unit/mcp/google-workspace/output-surface-defaults.spec.ts
// Tests for per-playbook output surface defaults + PlaybookResult integration.
//
// Verifies:
// - getDefaultSurfaces returns the correct surfaces per playbook
// - cash_lever resolves to gsheet
// - all non-mapped playbooks resolve to []
// - OutputSurface Zod schema validates correctly
// - PlaybookResultSchema accepts outputSurfaces field

import { describe, it, expect } from 'vitest';
import {
  getDefaultSurfaces,
  hasWorkspaceSurfaces,
} from '../../../../apps/utility/src/playbooks/lib/outputSurfaceDefaults.js';
import {
  OutputSurfaceSchema,
  PlaybookResultSchema,
} from '@c-suite/shared-types/playbook';

// ── Per-playbook surface config ───────────────────────────────────────────────

describe('getDefaultSurfaces', () => {
  it('cash_lever → gsheet', () => {
    expect(getDefaultSurfaces('cash_lever')).toEqual(['gsheet']);
  });

  it('board_narrative → gslides', () => {
    expect(getDefaultSurfaces('board_narrative')).toEqual(['gslides']);
  });

  it('gtm_realloc → gsheet', () => {
    expect(getDefaultSurfaces('gtm_realloc')).toEqual(['gsheet']);
  });

  it('strategic_option → gdoc', () => {
    expect(getDefaultSurfaces('strategic_option')).toEqual(['gdoc']);
  });

  it('pre_mortem → [] (default)', () => {
    expect(getDefaultSurfaces('pre_mortem')).toEqual([]);
  });

  it('open_qa → [] (default)', () => {
    expect(getDefaultSurfaces('open_qa')).toEqual([]);
  });

  it('quick_read → [] (default)', () => {
    expect(getDefaultSurfaces('quick_read')).toEqual([]);
  });

  it('stakeholder_1_1 → [] (default)', () => {
    expect(getDefaultSurfaces('stakeholder_1_1')).toEqual([]);
  });

  it('restructure_decision → [] (default)', () => {
    expect(getDefaultSurfaces('restructure_decision')).toEqual([]);
  });
});

describe('hasWorkspaceSurfaces', () => {
  it('true for cash_lever', () => {
    expect(hasWorkspaceSurfaces('cash_lever')).toBe(true);
  });

  it('false for pre_mortem', () => {
    expect(hasWorkspaceSurfaces('pre_mortem')).toBe(false);
  });
});

// ── OutputSurface Zod schema ──────────────────────────────────────────────────

describe('OutputSurfaceSchema', () => {
  it('accepts a valid gsheet surface with url', () => {
    const result = OutputSurfaceSchema.safeParse({
      kind: 'gsheet',
      url: 'https://docs.google.com/spreadsheets/d/abc123/edit',
      title: 'Cash Lever Model',
      metadata: { rowCount: 12 },
    });
    expect(result.success).toBe(true);
  });

  it('accepts memo kind without url (always first entry)', () => {
    const result = OutputSurfaceSchema.safeParse({ kind: 'memo' });
    expect(result.success).toBe(true);
  });

  it('accepts all valid kinds', () => {
    for (const kind of ['memo', 'gdoc', 'gsheet', 'gslides', 'gdrive_upload'] as const) {
      expect(OutputSurfaceSchema.safeParse({ kind }).success).toBe(true);
    }
  });

  it('rejects invalid kind', () => {
    const result = OutputSurfaceSchema.safeParse({ kind: 'unknown_kind' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid url format', () => {
    const result = OutputSurfaceSchema.safeParse({ kind: 'gsheet', url: 'not-a-url' });
    expect(result.success).toBe(false);
  });
});

// ── PlaybookResult integration — cash_lever emits gsheet OutputSurface ───────

describe('PlaybookResult with outputSurfaces', () => {
  const baseResult = {
    memoMarkdown: '# Cash Lever\n\nMemo body.',
    degradedSources: [],
    lensOutputs: {},
    stamps: ['CLEAN'],
    rigorScore: 85,
    rigorThreshold: 70,
    proposedWritebacks: [],
  };

  it('cash_lever PlaybookResult with gsheet outputSurface validates against schema', () => {
    const result = PlaybookResultSchema.safeParse({
      ...baseResult,
      outputSurfaces: [
        { kind: 'memo' },
        {
          kind: 'gsheet',
          url: 'https://docs.google.com/spreadsheets/d/xyz789/edit',
          title: 'Cash Lever — lever cells',
          metadata: { rowCount: 8 },
        },
      ],
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const surfaces = result.data.outputSurfaces!;
    expect(surfaces).toHaveLength(2);
    expect(surfaces[0].kind).toBe('memo');
    expect(surfaces[1].kind).toBe('gsheet');
    expect(surfaces[1].url).toBe(
      'https://docs.google.com/spreadsheets/d/xyz789/edit',
    );
  });

  it('PlaybookResult without outputSurfaces still validates (backward compat)', () => {
    const result = PlaybookResultSchema.safeParse(baseResult);
    expect(result.success).toBe(true);
    expect(result.data?.outputSurfaces).toBeUndefined();
  });
});

// ── Live smoke test (skips unless LIVE_CONNECTORS=1) ─────────────────────────
// Real artifact creation is gated behind LIVE_CONNECTORS=1.
// Reaching BUILD-COMPLETE-VERIFY-PENDING-CREDS is the expected end state.

const LIVE = process.env['LIVE_CONNECTORS'] === '1';

describe.skipIf(!LIVE)('LIVE: create real Google Sheet (requires credentials)', () => {
  it('createSheet produces a shareable URL', async () => {
    // This test will fail with GoogleWorkspaceAuthError until Russell completes
    // the Google Connect flow with the expanded scopes. That is the expected
    // BUILD-COMPLETE-VERIFY-PENDING-CREDS end state.
    const { createSheet } = await import(
      '../../../../apps/utility/src/mcp/google-workspace/sheets.js'
    );
    const { SafeStorageVault } = await import(
      '../../../../apps/utility/src/credentials/safeStorageVault.js'
    );

    const vault = new SafeStorageVault('live-test');
    const rows: unknown[][] = [
      ['Lever', 'Current', 'Target', 'Delta'],
      ['Seat expansion', 1_200_000, 1_500_000, 300_000],
    ];

    const result = await createSheet(vault, 'C-Suite Live Test Sheet', rows);

    expect(result.spreadsheetId).toBeTruthy();
    expect(result.url).toMatch(/^https:\/\/docs\.google\.com\/spreadsheets/);
    // eslint-disable-next-line no-console
    console.log('Live sheet URL:', result.url);
  });
});
