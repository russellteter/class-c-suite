/**
 * Parse vault artifact YAML frontmatter.
 * Source: docs/research/R0-constraints-ledger.md §SD-01 (lines 309-323).
 * Injects `type` from file-path zone (NOT from YAML — the on-disk `type:` key
 * is absent from every vault artifact per R0-Vault verification).
 */
import { z } from 'zod';
import {
  PositionFrontmatter, DecisionFrontmatter, WorkstreamFrontmatterUnion,
  StakeholderFrontmatter, PreMortemFrontmatter, PredictionFrontmatter,
  MemoFrontmatter, HandoffFrontmatter, TripwireFrontmatter, CompetitorFrontmatter,
  type ArtifactZone,
} from './vault-schemas.js';
import { normalizeKeys } from './normalizeKeys.js';

/**
 * Wraps a Zod parse error with vault-zone context.
 * ADR-0001 §2 — parseArtifact must expose zone + zodIssues on failure.
 */
export class VaultSchemaParseError extends Error {
  readonly zone: ArtifactZone;
  readonly zodIssues: z.ZodIssue[];
  constructor(zone: ArtifactZone, zodError: z.ZodError) {
    super(`VaultSchemaParseError [zone=${zone}]: ${zodError.message}`);
    this.name = 'VaultSchemaParseError';
    this.zone = zone;
    this.zodIssues = zodError.issues;
  }
}

const ZoneToSchema = {
  position: PositionFrontmatter,
  decision: DecisionFrontmatter,
  workstream: WorkstreamFrontmatterUnion,
  stakeholder_person: StakeholderFrontmatter,    // union handles both shapes
  stakeholder_account: StakeholderFrontmatter,
  'pre-mortem': PreMortemFrontmatter,
  prediction: PredictionFrontmatter,
  memo: MemoFrontmatter,
  handoff: HandoffFrontmatter,
  tripwire: TripwireFrontmatter,
  competitor: CompetitorFrontmatter,
} as const satisfies Record<ArtifactZone, z.ZodTypeAny>;

/**
 * Zone is derived from file path BEFORE this is called.
 * Example mapping: positions/active/POS-001.md → 'position'
 *                  stakeholders/customers-top-arr/seu-bme.md → 'stakeholder_account'
 *                  stakeholders/internal-exec-board/x.md → 'stakeholder_person'
 */
export function parseArtifact(rawYaml: unknown, zone: ArtifactZone) {
  const normalized = normalizeKeys(rawYaml);
  const schema = ZoneToSchema[zone];
  try {
    const parsed = schema.parse(normalized);
    // Inject discriminator post-parse (B21: vault YAML has no `type:` key — type
    // is derived from file-path zone, not embedded in the frontmatter).
    return { ...parsed, type: zone } as typeof parsed & { type: ArtifactZone };
  } catch (e) {
    if (e instanceof z.ZodError) {
      throw new VaultSchemaParseError(zone, e);
    }
    throw e;
  }
}

/**
 * Zone classifier — file-path → ArtifactZone.
 * Ch.1 indexer wires this into the chokidar event handler.
 */
export function zoneFor(absolutePath: string): ArtifactZone | null {
  const p = absolutePath.toLowerCase();
  if (p.includes('/positions/')) return 'position';
  if (p.includes('/decisions/')) return 'decision';
  if (p.includes('/workstreams/')) return 'workstream';
  if (p.includes('/stakeholders/customers-')) return 'stakeholder_account';
  if (p.includes('/stakeholders/')) return 'stakeholder_person';
  if (p.includes('/pre-mortems/')) return 'pre-mortem';
  if (p.includes('/calibration/predictions/')) return 'prediction';
  if (p.includes('/memos/')) return 'memo';
  if (p.includes('/handoffs/')) return 'handoff';
  if (p.includes('/adversarial/financial-tripwires/')) return 'tripwire';
  if (p.includes('/adversarial/competitor-watch/')) return 'competitor';
  return null;  // read-only zones + investigations/ + deliverables/ return null
}
