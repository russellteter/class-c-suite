// packages/writeback-engine/src/drafters/_idAlloc.ts
// Picks the next available artifact ID by globbing the zone directory.
// Pattern: PREFIX-NNN (zero-padded 3 digits).

import * as fs from 'fs/promises';
import * as path from 'path';

const ZONE_CONFIG: Record<string, { prefix: string; dirs: string[] }> = {
  position:            { prefix: 'POS', dirs: ['positions/active', 'positions/superseded'] },
  decision:            { prefix: 'DEC', dirs: ['decisions'] },
  prediction:          { prefix: 'PRED', dirs: ['calibration/predictions', 'calibration/resolved'] },
  'pre-mortem-update': { prefix: 'PM',  dirs: ['pre-mortems'] },
  'stakeholder-update':{ prefix: 'STK', dirs: ['stakeholders/people', 'stakeholders/accounts'] },
  'workstream-advance':{ prefix: 'WS',  dirs: ['workstreams'] },
};

/**
 * Returns the next available ID for an artifact type (e.g. 'POS-017').
 * Scans all files in the zone directories and returns max+1.
 */
export async function nextAvailableId(
  artifactType: string,
  vaultRoot: string,
): Promise<string> {
  const config = ZONE_CONFIG[artifactType];
  if (!config) throw new Error(`Unknown artifactType for ID allocation: ${artifactType}`);

  const { prefix, dirs } = config;
  const seen: number[] = [];

  for (const dir of dirs) {
    const full = path.join(vaultRoot, dir);
    let entries: string[];
    try {
      entries = await fs.readdir(full);
    } catch {
      continue;
    }
    for (const f of entries) {
      if (!f.endsWith('.md')) continue;
      const m = f.match(new RegExp(`^${prefix}-(\\d+)`));
      if (m) seen.push(parseInt(m[1]!, 10));
    }
  }

  const max = seen.length > 0 ? Math.max(...seen) : 0;
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

/**
 * Returns the active path for an existing or new artifact.
 */
export function activePath(
  artifactType: string,
  artifactId: string,
  filename: string,
  vaultRoot: string,
): string {
  const config = ZONE_CONFIG[artifactType];
  if (!config) throw new Error(`Unknown artifactType for path resolution: ${artifactType}`);
  // Use the first listed directory as the default active zone.
  const primaryDir = config.dirs[0] ?? '';
  return path.join(vaultRoot, primaryDir, filename);
}
