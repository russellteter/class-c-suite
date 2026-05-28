// apps/utility/src/mcp/chorus/confidence-cap.ts
// Source: BLOCKERS B11 — Chorus-only-sourced claims capped <70.
//
// Every result from ChorusClient must carry:
//   source_type: 'chorus'
//   sourceConfidenceCap: CHORUS_CONFIDENCE_CAP (69)
//
// This constant is the single source of truth for the cap value.
// The Synthesizer reads sourceConfidenceCap from result objects and enforces
// that any claim derived solely from Chorus is annotated with confidence < 70.

export const CHORUS_CONFIDENCE_CAP = 69 as const;

/** Tag shape stamped on every Chorus API result. */
export interface ChorusSourceTag {
  source_type: 'chorus';
  sourceConfidenceCap: typeof CHORUS_CONFIDENCE_CAP;
}

/**
 * Stamp the B11 source tag onto a result object.
 * Use at every client boundary — never skip.
 */
export function withConfidenceCap<T extends object>(result: T): T & ChorusSourceTag {
  return {
    ...result,
    source_type: 'chorus' as const,
    sourceConfidenceCap: CHORUS_CONFIDENCE_CAP,
  };
}
