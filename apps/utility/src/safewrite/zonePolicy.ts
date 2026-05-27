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
 * 'decision', 'workstream', 'position' → high-concurrency shared zones (hashCheck=true).
 * Others → lower concurrency (hashCheck=false).
 *
 * Source: ADR §2.1 + actual ArtifactZone enum from vault-schemas.ts.
 */
const ZONE_POLICY: Record<ArtifactZone, ZonePolicy> = {
  // High-concurrency shared zones — multiple agents may write concurrently
  decision:           { hashCheck: true,  commitVault: true },
  workstream:         { hashCheck: true,  commitVault: true },
  position:           { hashCheck: true,  commitVault: true },
  prediction:         { hashCheck: true,  commitVault: true },

  // Lower-concurrency zones — single writer by construction in normal flows
  stakeholder_person:  { hashCheck: false, commitVault: true },
  stakeholder_account: { hashCheck: false, commitVault: true },
  'pre-mortem':        { hashCheck: false, commitVault: true },
  memo:                { hashCheck: false, commitVault: true },
  handoff:             { hashCheck: false, commitVault: true },
  tripwire:            { hashCheck: false, commitVault: true },
  competitor:          { hashCheck: false, commitVault: true },
};

/** Lookup zone policy. Returns undefined for zones not in the table. */
export function getZonePolicy(zone: ArtifactZone): ZonePolicy {
  return ZONE_POLICY[zone];
}
