// apps/utility/src/playbooks/lib/outputSurfaceDefaults.ts
// Source: docs/decisions/0016-google-workspace-output-surfaces.md §Task 5
//
// Per-playbook default output surfaces.
// Orchestration code calls getDefaultSurfaces(playbookId) after Synthesizer runs
// to determine which Google Workspace artifacts to create alongside the memo.
//
// Mapping:
//   board_narrative   → memo + gslides (deck skeleton)
//   gtm_realloc       → memo + gsheet  (rep allocation table)
//   cash_lever        → memo + gsheet  (lever cells with annotations)
//   strategic_option  → memo + gdoc    (full option memo)
//   all others        → memo only
//
// Config key: PlaybookId (canonical short names from ADR-0009 §3.2).

import type { PlaybookId } from '@c-suite/shared-types/playbook';
import type { OutputSurfaceKind } from '@c-suite/shared-types/playbook';

/** The non-memo surfaces a playbook produces by default. */
export type DefaultSurface = Exclude<OutputSurfaceKind, 'memo' | 'gdrive_upload'>;

const PLAYBOOK_SURFACE_MAP: Partial<Record<PlaybookId, DefaultSurface[]>> = {
  board_narrative: ['gslides'],
  gtm_realloc: ['gsheet'],
  cash_lever: ['gsheet'],
  strategic_option: ['gdoc'],
};

/**
 * Return the non-memo surface kinds configured for a playbook.
 * Always returns at least an empty array.
 */
export function getDefaultSurfaces(playbookId: PlaybookId): DefaultSurface[] {
  return PLAYBOOK_SURFACE_MAP[playbookId] ?? [];
}

/**
 * True when the given playbook should produce at least one Workspace artifact.
 */
export function hasWorkspaceSurfaces(playbookId: PlaybookId): boolean {
  return getDefaultSurfaces(playbookId).length > 0;
}
