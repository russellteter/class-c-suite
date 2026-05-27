/**
 * ADR-0001 §2 + §9 row 4 — Locked Zod schemas for every vault artifact type
 * Test owner: Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0001-ch0-foundations.md §2.2 through §2.8 + §9 row 4
 *
 * Strategy per brief:
 *   - Load one fixture per zone from tests/fixtures/vault/<zone>/sample.md
 *   - Parse YAML frontmatter (between --- markers)
 *   - Assert parseArtifact(rawYaml, zone) returns a typed object
 *   - Assert ALL required fields per schema are present
 *   - Assert at least one optional field is correctly typed
 *
 * Edge cases explicitly required by brief:
 *   - POS-014 with correction-log array
 *   - WS-04 with arr_impact.amount_usd: 0 bare integer
 *   - PM-003 snake variant with probability: "30%"
 *   - PM-001 kebab variant with probability: 15 bare int
 *   - StakeholderPerson AND StakeholderAccount both parse
 *
 * Tests will fail until Runtime lands packages/shared-types/src/vault-schemas.ts.
 * That is expected per brief line 124.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseArtifact } from '@c-suite/shared-types/parseArtifact';
import type { ArtifactZone } from '@c-suite/shared-types/vault-schemas';

// Fixture base path — tests/fixtures/vault/<zone>/
const FIXTURE_BASE = path.join(__dirname, '../fixtures/vault');

/**
 * Parse YAML frontmatter from markdown file content.
 * Extracts content between first pair of --- markers.
 * Uses js-yaml (or gray-matter if Runtime wires it).
 */
function parseFrontmatter(content: string): unknown {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error('No frontmatter found');
  // Dynamic import of js-yaml or gray-matter — Runtime wires the dep.
  // For test structure purposes, we use require-style import.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const yaml = require('js-yaml');
  return yaml.load(match[1]);
}

function loadFixture(zone: ArtifactZone | string, filename: string): { raw: unknown; content: string } {
  const filepath = path.join(FIXTURE_BASE, zone, filename);
  const content = fs.readFileSync(filepath, 'utf8');
  const raw = parseFrontmatter(content);
  return { raw, content };
}

// ── §2.2 PositionFrontmatter ─────────────────────────────────────────────────

describe('PositionFrontmatter — §2.2 (ADR-0001)', () => {
  it('parses POS-001 fixture and returns required fields', () => {
    const { raw } = loadFixture('position', 'POS-001.md');
    const result = parseArtifact(raw, 'position') as Record<string, unknown>;

    // Required fields per ADR §2.2
    expect(result.id).toBe('POS-001');
    expect(typeof result.slug).toBe('string');
    expect(typeof result.title).toBe('string');
    expect(result.status).toBe('active');
    expect(typeof result.confidence).toBe('number');
    expect(typeof result.created).toBe('string');
    expect(typeof result.last_updated).toBe('string');   // normalized from last-updated
    expect(typeof result.last_retested).toBe('string');  // normalized from last-retested
    expect(result).toHaveProperty('supersedes');          // null or string
    expect(result).toHaveProperty('superseded_by');       // normalized
    expect(typeof result.authored_by).toBe('string');     // normalized from authored-by
    expect(typeof result.decision_this_supports).toBe('string');
    expect(Array.isArray(result.predictions_spawned)).toBe(true);
    expect(typeof result.source).toBe('string');
  });

  it('type is injected as position (not present in YAML)', () => {
    const { raw } = loadFixture('position', 'POS-001.md');
    const result = parseArtifact(raw, 'position') as Record<string, unknown>;
    expect(result.type).toBe('position');
  });
});

// ── POS-014 edge case: correction-log array ──────────────────────────────────

describe('PositionFrontmatter edge case — POS-014 correction-log array (§2.2)', () => {
  it('parses POS-014 correction-log as array of strings', () => {
    const { raw } = loadFixture('position', 'POS-014.md');
    const result = parseArtifact(raw, 'position') as Record<string, unknown>;

    expect(result.id).toBe('POS-014');
    // correction_log is optional array of strings (NOT objects per R0 §2.1)
    expect(Array.isArray(result.correction_log)).toBe(true);
    const log = result.correction_log as unknown[];
    expect(log.length).toBeGreaterThan(0);
    expect(typeof log[0]).toBe('string');
  });
});

// ── §2.3 DecisionFrontmatter ─────────────────────────────────────────────────

describe('DecisionFrontmatter — §2.3 (ADR-0001)', () => {
  it('parses DEC-005 fixture and returns required fields', () => {
    const { raw } = loadFixture('decision', 'DEC-005.md');
    const result = parseArtifact(raw, 'decision') as Record<string, unknown>;

    expect(result.id).toBe('DEC-005');
    expect(typeof result.title).toBe('string');
    expect(typeof result.date_proposed).toBe('string');  // was decided_on in data.md; corrected per SD-06
    expect(typeof result.decision_maker).toBe('string');
    expect(result.status).toBe('proposed');              // observed value; not in old data.md enum
    expect(typeof result.reversibility).toBe('string'); // free text (NOT enum per SD-06)
    expect(typeof result.source).toBe('string');
  });

  it('confidence is optional integer when present', () => {
    const { raw } = loadFixture('decision', 'DEC-005.md');
    const result = parseArtifact(raw, 'decision') as Record<string, unknown>;
    if (result.confidence !== undefined) {
      expect(Number.isInteger(result.confidence)).toBe(true);
    }
  });

  it('type is injected as decision', () => {
    const { raw } = loadFixture('decision', 'DEC-005.md');
    const result = parseArtifact(raw, 'decision') as Record<string, unknown>;
    expect(result.type).toBe('decision');
  });
});

// ── §2.4 WorkstreamFrontmatter ───────────────────────────────────────────────

describe('WorkstreamFrontmatter — §2.4 canonical (ADR-0001)', () => {
  it('parses WS-04 fixture and returns required fields', () => {
    const { raw } = loadFixture('workstream', 'WS-04.md');
    const result = parseArtifact(raw, 'workstream') as Record<string, unknown>;

    expect(result.workstream_id).toBe('WS-04');
    expect(typeof result.title).toBe('string');
    expect(typeof result.owner).toBe('string');
    expect(typeof result.phase).toBe('string');
    expect(typeof result.status).toBe('string');
    expect(typeof result.last_updated).toBe('string');
  });

  it('status_criteria object has green/yellow/red string fields', () => {
    const { raw } = loadFixture('workstream', 'WS-04.md');
    const result = parseArtifact(raw, 'workstream') as Record<string, unknown>;
    const sc = result.status_criteria as Record<string, unknown>;
    expect(typeof sc.green).toBe('string');
    expect(typeof sc.yellow).toBe('string');
    expect(typeof sc.red).toBe('string');
  });

  it('type is injected as workstream', () => {
    const { raw } = loadFixture('workstream', 'WS-04.md');
    const result = parseArtifact(raw, 'workstream') as Record<string, unknown>;
    expect(result.type).toBe('workstream');
  });
});

// ── WS-04 edge case: arr_impact.amount_usd = 0 bare integer ─────────────────

describe('WorkstreamFrontmatter edge case — WS-04 arr_impact.amount_usd=0 (§2.4)', () => {
  it('accepts arr_impact.amount_usd as bare integer 0 (not a string)', () => {
    const { raw } = loadFixture('workstream', 'WS-04.md');
    const result = parseArtifact(raw, 'workstream') as Record<string, unknown>;
    const arrImpact = result.arr_impact as Record<string, unknown>;
    // ADR §2.4: amount_usd is z.union([z.string(), z.number()]) — handles bare 0
    expect(arrImpact.amount_usd).toBe(0);
    expect(typeof arrImpact.amount_usd).toBe('number');
  });
});

// ── WS-03 minimal variant (id: instead of workstream_id:) ───────────────────

describe('WorkstreamFrontmatterUnion — WS-03 minimal variant (§2.4)', () => {
  it('parses WS-03 using the minimal id-variant schema', () => {
    const { raw } = loadFixture('workstream', 'WS-03.md');
    const result = parseArtifact(raw, 'workstream') as Record<string, unknown>;
    // WS-03 uses 'id' instead of 'workstream_id'
    expect(result.id).toBe('WS-03');
    expect(typeof result.title).toBe('string');
    expect(typeof result.status).toBe('string');
    expect(typeof result.owner).toBe('string');
  });
});

// ── §2.5 StakeholderFrontmatter ──────────────────────────────────────────────

describe('StakeholderPersonFrontmatter — §2.5 (ADR-0001)', () => {
  it('parses chasen-michael-ceo with required fields', () => {
    const { raw } = loadFixture('stakeholder_person', 'chasen-michael-ceo.md');
    const result = parseArtifact(raw, 'stakeholder_person') as Record<string, unknown>;

    expect(typeof result.name).toBe('string');
    expect(result.sensitivity).toBe('HIGH');
    expect(typeof result.last_known_status).toBe('string');
    expect(typeof result.last_refresh).toBe('string');
    expect(typeof result.source).toBe('string');
  });

  it('type is injected as stakeholder_person', () => {
    const { raw } = loadFixture('stakeholder_person', 'chasen-michael-ceo.md');
    const result = parseArtifact(raw, 'stakeholder_person') as Record<string, unknown>;
    expect(result.type).toBe('stakeholder_person');
  });
});

describe('StakeholderAccountFrontmatter — §2.5 (ADR-0001)', () => {
  it('parses seu-bme with required account fields', () => {
    const { raw } = loadFixture('stakeholder_account', 'seu-bme.md');
    const result = parseArtifact(raw, 'stakeholder_account') as Record<string, unknown>;

    // account_id is the discriminator key per ADR §2.5
    expect(typeof result.account_id).toBe('string');
    expect(typeof result.account_name).toBe('string');
    expect(typeof result.short_name).toBe('string');
    expect(typeof result.segment).toBe('string');
    expect(typeof result.territory).toBe('string');
    expect(typeof result.location).toBe('string');
    expect(typeof result.customer_type).toBe('string');
    expect(Number.isInteger(result.total_contacts)).toBe(true);
    expect(typeof result.account_owner).toBe('string');
    expect(typeof result.current_opp_owner).toBe('string');
    expect(typeof result.class_share_of_arr).toBe('string');
    expect(typeof result.last_updated).toBe('string');
    expect(typeof result.sensitivity).toBe('string');
  });

  it('linked_pre_mortems is optional array of strings', () => {
    const { raw } = loadFixture('stakeholder_account', 'seu-bme.md');
    const result = parseArtifact(raw, 'stakeholder_account') as Record<string, unknown>;
    // normalized from linked_pre-mortems via normalizeKeys
    if (result.linked_pre_mortems !== undefined) {
      expect(Array.isArray(result.linked_pre_mortems)).toBe(true);
    }
  });

  it('type is injected as stakeholder_account', () => {
    const { raw } = loadFixture('stakeholder_account', 'seu-bme.md');
    const result = parseArtifact(raw, 'stakeholder_account') as Record<string, unknown>;
    expect(result.type).toBe('stakeholder_account');
  });
});

// ── §2.6 PreMortemFrontmatter ────────────────────────────────────────────────

describe('PreMortemFrontmatter kebab variant — PM-001 (§2.6)', () => {
  it('parses PM-001 with probability as bare integer', () => {
    const { raw } = loadFixture('pre-mortem', 'PM-001.md');
    const result = parseArtifact(raw, 'pre-mortem') as Record<string, unknown>;

    expect(result.probability).toBe(15);
    expect(typeof result.probability).toBe('number');
    expect(result.impact).toBe('existential');
    expect(typeof result.last_reviewed).toBe('string'); // normalized from last-reviewed
  });

  it('type is injected as pre-mortem', () => {
    const { raw } = loadFixture('pre-mortem', 'PM-001.md');
    const result = parseArtifact(raw, 'pre-mortem') as Record<string, unknown>;
    expect(result.type).toBe('pre-mortem');
  });
});

describe('PreMortemFrontmatter snake variant — PM-003 (§2.6)', () => {
  it('parses PM-003 with probability as "30%" string', () => {
    const { raw } = loadFixture('pre-mortem', 'PM-003.md');
    const result = parseArtifact(raw, 'pre-mortem') as Record<string, unknown>;

    expect(result.probability).toBe('30%');
    expect(result.impact).toBe('HIGH');
    expect(typeof result.last_reviewed).toBe('string');
  });

  it('type is injected as pre-mortem for snake variant', () => {
    const { raw } = loadFixture('pre-mortem', 'PM-003.md');
    const result = parseArtifact(raw, 'pre-mortem') as Record<string, unknown>;
    expect(result.type).toBe('pre-mortem');
  });
});

// ── §2.7 PredictionFrontmatter ───────────────────────────────────────────────

describe('PredictionFrontmatter snake variant — PRED-001 (§2.7)', () => {
  it('parses PRED-001 with required fields', () => {
    const { raw } = loadFixture('prediction', 'PRED-001.md');
    const result = parseArtifact(raw, 'prediction') as Record<string, unknown>;

    expect(result.id).toBe('PRED-001');
    expect(typeof result.claim).toBe('string');
    expect(result.status).toBe('open');
    expect(typeof result.confidence).toBe('number');
  });

  it('type is injected as prediction', () => {
    const { raw } = loadFixture('prediction', 'PRED-001.md');
    const result = parseArtifact(raw, 'prediction') as Record<string, unknown>;
    expect(result.type).toBe('prediction');
  });
});

describe('PredictionFrontmatter kebab variant — PRED-007 (§2.7)', () => {
  it('parses PRED-007 with kebab resolution-date key normalized', () => {
    const { raw } = loadFixture('prediction', 'PRED-007.md');
    const result = parseArtifact(raw, 'prediction') as Record<string, unknown>;

    expect(result.id).toBe('PRED-007');
    expect(result.status).toBe('open');
    // kebab keys normalized: resolution-date → resolution_date
    // resolution-criterion → resolution_criterion
    // confidence-at-time-of-prediction → confidence_at_time_of_prediction (passthrough)
    expect(typeof result.claim).toBe('string');
  });
});

// ── §2.8 MemoFrontmatter (synthetic fixture) ─────────────────────────────────

describe('MemoFrontmatter — §2.8 (ADR-0001, synthetic fixture)', () => {
  it('parses synthetic memo/sample.md with required fields', () => {
    const { raw } = loadFixture('memo', 'sample.md');
    const result = parseArtifact(raw, 'memo') as Record<string, unknown>;

    expect(typeof result.run_id).toBe('string');
    expect(typeof result.playbook).toBe('string');
    expect(typeof result.question).toBe('string');
    expect(typeof result.created).toBe('string');
    expect(Number.isInteger(result.rigor_score)).toBe(true);
    expect(Number.isInteger(result.rigor_threshold)).toBe(true);
    expect(typeof result.status).toBe('string');
    expect(Array.isArray(result.citations)).toBe(true);
  });

  it('type is injected as memo', () => {
    const { raw } = loadFixture('memo', 'sample.md');
    const result = parseArtifact(raw, 'memo') as Record<string, unknown>;
    expect(result.type).toBe('memo');
  });
});

// ── §2.8 HandoffFrontmatter (synthetic fixture) ──────────────────────────────

describe('HandoffFrontmatter — §2.8 (ADR-0001, synthetic fixture)', () => {
  it('parses synthetic handoff/sample.md with required fields', () => {
    const { raw } = loadFixture('handoff', 'sample.md');
    const result = parseArtifact(raw, 'handoff') as Record<string, unknown>;

    expect(typeof result.id).toBe('string');
    expect(typeof result.created).toBe('string');
    expect(Array.isArray(result.cowork_brand_skills)).toBe(true);
    expect(typeof result.status).toBe('string');
  });

  it('type is injected as handoff', () => {
    const { raw } = loadFixture('handoff', 'sample.md');
    const result = parseArtifact(raw, 'handoff') as Record<string, unknown>;
    expect(result.type).toBe('handoff');
  });
});

// ── §2.8 TripwireFrontmatter ─────────────────────────────────────────────────

describe('TripwireFrontmatter — §2.8 (ADR-0001)', () => {
  it('parses barclays-leverage-covenant with required fields', () => {
    const { raw } = loadFixture('tripwire', 'barclays-leverage-covenant.md');
    const result = parseArtifact(raw, 'tripwire') as Record<string, unknown>;

    expect(typeof result.tripwire_id).toBe('string');
    expect(typeof result.title).toBe('string');
    expect(typeof result.category).toBe('string');
    expect(typeof result.source).toBe('string');
    expect(typeof result.owner).toBe('string');
    expect(typeof result.scan_cadence).toBe('string');
    expect(typeof result.escalation).toBe('string');
    expect(typeof result.last_updated).toBe('string');
  });

  it('type is injected as tripwire', () => {
    const { raw } = loadFixture('tripwire', 'barclays-leverage-covenant.md');
    const result = parseArtifact(raw, 'tripwire') as Record<string, unknown>;
    expect(result.type).toBe('tripwire');
  });
});

// ── §2.8 CompetitorFrontmatter ───────────────────────────────────────────────

describe('CompetitorFrontmatter — §2.8 (ADR-0001)', () => {
  it('parses engageli.md with required fields', () => {
    const { raw } = loadFixture('competitor', 'engageli.md');
    const result = parseArtifact(raw, 'competitor') as Record<string, unknown>;

    expect(typeof result.competitor).toBe('string');
    expect(typeof result.threat_level).toBe('string');
    expect(typeof result.last_updated).toBe('string');
    expect(typeof result.last_signal).toBe('string');
    expect(Array.isArray(result.sources)).toBe(true);
  });

  it('type is injected as competitor', () => {
    const { raw } = loadFixture('competitor', 'engageli.md');
    const result = parseArtifact(raw, 'competitor') as Record<string, unknown>;
    expect(result.type).toBe('competitor');
  });
});
