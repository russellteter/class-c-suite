// apps/utility/src/safewrite/zonePolicy.ts
// Source: docs/decisions/0003-ch2-safewrite.md §2
// Zone policy table: ArtifactZone-keyed control over hashCheck + commitVault.
//
// ArtifactZone values come from packages/shared-types/src/vault-schemas.ts.
// Zone-to-path mapping from parseArtifact.ts zoneFor().
//
// Shared zones (agents + orchestrator may write concurrently) → hashCheck=true.
// Lower-concurrency zones → hashCheck=false.

import type { ArtifactZone } from '@c-suite/shared-types/vault-schemas';

export interface ZonePolicy {
  /** Re-read + hash before rename. True for shared zones (conflict-prone). */
  hashCheck: boolean;
  /** Commit to vault git after a successful write. */
  commitVault: boolean;
}

/** Zone policy table keyed by ArtifactZone.
 *
 * Source: ADR §2.1 — verbatim alignment required.
 *
 * SHARED ZONES — concurrent Obsidian + Cowork writes are plausible.
 * Hash-check required (B8). Git commit always.
 *
 * AGENT-EXCLUSIVE ZONES — only C-Suite writes these; external concurrent
 * edit not expected. Skip hash-check; honor opts.commitVault.
 * Source: ROADMAP.md line 77 ("agent-exclusive zones: predictions, investigations,
 * deliverables, memos").
 */
const ZONE_POLICY: Record<ArtifactZone, ZonePolicy> = {
  // SHARED ZONES
  position:            { hashCheck: true,  commitVault: true  },
  decision:            { hashCheck: true,  commitVault: true  },
  workstream:          { hashCheck: true,  commitVault: true  },
  stakeholder_person:  { hashCheck: true,  commitVault: true  },
  stakeholder_account: { hashCheck: true,  commitVault: true  },
  'pre-mortem':        { hashCheck: true,  commitVault: true  },
  tripwire:            { hashCheck: true,  commitVault: true  },
  competitor:          { hashCheck: true,  commitVault: true  },

  // AGENT-EXCLUSIVE ZONES
  prediction:          { hashCheck: false, commitVault: false },
  memo:                { hashCheck: false, commitVault: false },
  handoff:             { hashCheck: false, commitVault: false },
};

/** Lookup zone policy. Returns undefined for zones not in the table. */
export function getZonePolicy(zone: ArtifactZone): ZonePolicy {
  return ZONE_POLICY[zone];
}
