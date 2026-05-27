/**
 * ADR-0001 §2.10 + §9 row 5 (B21) — parseArtifact() wrapper
 * Test owner: Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0001-ch0-foundations.md §2.10 + §9 row 5
 *
 * Key invariants per ADR §2.10:
 *   - `type` field is ABSENT from all on-disk vault YAML (R0-Vault verified 75+ files).
 *   - parseArtifact(rawYaml, zone) injects `type` at parse time from the zone argument.
 *   - normalizeKeys() is called inside parseArtifact before Zod.parse().
 *   - zoneFor(absolutePath) maps file paths to ArtifactZone values.
 *
 * Tests will fail until Runtime lands packages/shared-types/src/parseArtifact.ts.
 * That is expected per brief line 124.
 */

import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { parseArtifact, zoneFor } from '@c-suite/shared-types/parseArtifact';

// Minimal valid raw YAML objects per zone — keys in original (kebab or snake) form
// as they appear on disk. parseArtifact normalizes + injects type.

const validPosition = {
  id: 'POS-001',
  slug: 'aws-90day-ceiling-12pct',
  title: 'AWS 30% cost reduction is infeasible in 90 days',
  status: 'active',
  confidence: 75,
  created: '2026-05-19',
  'last-updated': '2026-05-21',
  'last-retested': '2026-05-21',
  supersedes: null,
  'superseded-by': null,
  'authored-by': 'claude-pass2-cfo-lens',
  'decision-this-supports': 'DEC-004',
  'predictions-spawned': ['PRED-007', 'PRED-008'],
  source: 'aws_data/*.json',
};

const validDecision = {
  id: 'DEC-005',
  title: 'Russell absorbs CRO scope on Ed Miller exit',
  date_proposed: '2026-05-22',
  decision_maker: 'Russell + Chasen',
  status: 'proposed',
  reversibility: 'one-way (organizationally)',
  confidence: 65,
  source: 'investigations/class-org-institutional-read.md',
};

const validWorkstream = {
  workstream_id: 'WS-04',
  title: 'AWS / Infrastructure Cost Optimization',
  owner: 'Technical lead + Russell',
  phase: 'execution',
  status: 'YELLOW',
  status_criteria: {
    green: 'AWS spend tracking ≤90% of monthly forecast',
    yellow: 'Spend within 90-100% of forecast',
    red: 'Spend >100% of forecast or RI coverage drops',
  },
  cash_impact: {
    amount_usd: '~$30-40K/mo achievable',
    direction: 'positive',
    timing: 'phased through Q3',
  },
  arr_impact: {
    amount_usd: 0,
    direction: 'neutral',
    timing: 'n/a',
  },
  people_involved: ['Technical lead', 'Russell'],
  depends_on: [],
  depended_on_by: ['WS-01'],
  next_milestone: 'Lock identified cuts by 2026-06-05',
  next_milestone_date: '2026-06-05',
  decisions_pending: [],
  linked_positions: ['POS-001'],
  linked_decisions: [],
  last_updated: '2026-05-21',
};

const validStakeholderPerson = {
  name: 'chasen-michael-ceo',
  sensitivity: 'HIGH',
  last_known_status: 'WARM',
  last_refresh: '2026-05-21',
  source: 'investigations/class-org-institutional-read.md',
};

const validStakeholderAccount = {
  account_id: '0018a00001tNqFuAAK',
  account_name: 'BME - Saudi Electronics University',
  short_name: 'SEU/BME',
  segment: 'International - Higher Ed',
  territory: 'EMEA - Middle East',
  location: 'Riyadh, Saudi Arabia',
  customer_type: 'Collab',
  total_contacts: 35,
  account_owner: 'Massimo Gentili',
  current_opp_owner: 'Emmanuel Clemot',
  class_share_of_arr: '~10.1%',
  last_updated: '2026-05-26',
  sensitivity: 'HIGH',
};

const validPreMortemKebab = {
  id: 'PM-001',
  slug: 'barclays-calls-loan',
  probability: 15,
  impact: 'existential',
  'last-reviewed': '2026-05-21',
  'related-positions': ['POS-003', 'POS-006'],
};

const validPreMortemSnake = {
  name: 'PM-003-key-engineer-resigns',
  probability: '30%',
  impact: 'HIGH',
  last_reviewed: '2026-05-21',
  source: 'investigations/class-org-institutional-read.md',
};

const validPrediction = {
  id: 'PRED-001',
  claim: 'Russell sustains < 60 hr/week through end of Q3 2026',
  confidence: 60,
  resolution_date: '2026-09-30',
  status: 'open',
  spawned_by: 'POS-007',
};

const validMemo = {
  run_id: 'run-2026-05-26-cash-lever-001',
  playbook: 'cash_lever',
  question: 'What is our W30 cash lever stack?',
  created: '2026-05-26',
  rigor_score: 82,
  rigor_threshold: 75,
  status: 'clean',
  citations: [{ claim_id: 'c1', source_id: 's1', call_id: 'call1' }],
};

const validHandoff = {
  id: 'handoff-2026-05-26-cash-lever',
  decision_id: 'DEC-002',
  created: '2026-05-26',
  cowork_brand_skills: ['weekly-cash-forecast'],
  status: 'drafted',
};

const validTripwire = {
  tripwire_id: 'TW-FIN-001',
  title: 'Barclays leverage covenant proximity',
  category: 'financial',
  source: 'Barclays facility covenant package',
  owner: 'CFO + Russell',
  scan_cadence: 'Weekly Monday 6:07am ET',
  escalation: 'GREEN → YELLOW → RED → BREACH',
  last_updated: '2026-05-26',
};

const validCompetitor = {
  competitor: 'Engageli',
  threat_level: 'Medium-High → High',
  last_updated: '2026-05-21',
  last_signal: '2026-05-21',
  sources: ['class-gtm-strategy-2026 investigation'],
};

describe('parseArtifact — B21 type-injection wrapper', () => {
  describe('type injection from zone (ADR §2.10 — type absent from all vault YAML)', () => {
    it('injects type=position when zone is position', () => {
      const result = parseArtifact(validPosition, 'position');
      expect((result as { type?: string }).type).toBe('position');
    });

    it('injects type=decision when zone is decision', () => {
      const result = parseArtifact(validDecision, 'decision');
      expect((result as { type?: string }).type).toBe('decision');
    });

    it('injects type=workstream when zone is workstream', () => {
      const result = parseArtifact(validWorkstream, 'workstream');
      expect((result as { type?: string }).type).toBe('workstream');
    });

    it('injects type=stakeholder_person when zone is stakeholder_person', () => {
      const result = parseArtifact(validStakeholderPerson, 'stakeholder_person');
      expect((result as { type?: string }).type).toBe('stakeholder_person');
    });

    it('injects type=stakeholder_account when zone is stakeholder_account', () => {
      const result = parseArtifact(validStakeholderAccount, 'stakeholder_account');
      expect((result as { type?: string }).type).toBe('stakeholder_account');
    });

    it('injects type=pre-mortem when zone is pre-mortem', () => {
      const result = parseArtifact(validPreMortemKebab, 'pre-mortem');
      expect((result as { type?: string }).type).toBe('pre-mortem');
    });

    it('injects type=prediction when zone is prediction', () => {
      const result = parseArtifact(validPrediction, 'prediction');
      expect((result as { type?: string }).type).toBe('prediction');
    });

    it('injects type=memo when zone is memo', () => {
      const result = parseArtifact(validMemo, 'memo');
      expect((result as { type?: string }).type).toBe('memo');
    });

    it('injects type=handoff when zone is handoff', () => {
      const result = parseArtifact(validHandoff, 'handoff');
      expect((result as { type?: string }).type).toBe('handoff');
    });

    it('injects type=tripwire when zone is tripwire', () => {
      const result = parseArtifact(validTripwire, 'tripwire');
      expect((result as { type?: string }).type).toBe('tripwire');
    });

    it('injects type=competitor when zone is competitor', () => {
      const result = parseArtifact(validCompetitor, 'competitor');
      expect((result as { type?: string }).type).toBe('competitor');
    });
  });

  describe('successful parse returns typed object', () => {
    it('parses position with all required fields', () => {
      const result = parseArtifact(validPosition, 'position') as Record<string, unknown>;
      expect(result.id).toBe('POS-001');
      expect(result.slug).toBe('aws-90day-ceiling-12pct');
      expect(typeof result.confidence).toBe('number');
    });

    it('parses decision with all required fields', () => {
      const result = parseArtifact(validDecision, 'decision') as Record<string, unknown>;
      expect(result.id).toBe('DEC-005');
      expect(result.status).toBe('proposed');
    });

    it('parses workstream with all required fields including nested objects', () => {
      const result = parseArtifact(validWorkstream, 'workstream') as Record<string, unknown>;
      expect(result.workstream_id).toBe('WS-04');
      const arrImpact = result.arr_impact as Record<string, unknown>;
      expect(arrImpact).toBeDefined();
    });

    it('parses stakeholder_person with required fields', () => {
      const result = parseArtifact(validStakeholderPerson, 'stakeholder_person') as Record<string, unknown>;
      expect(result.name).toBe('chasen-michael-ceo');
      expect(result.sensitivity).toBe('HIGH');
    });

    it('parses stakeholder_account with required fields', () => {
      const result = parseArtifact(validStakeholderAccount, 'stakeholder_account') as Record<string, unknown>;
      expect(result.account_id).toBe('0018a00001tNqFuAAK');
    });

    it('parses pre-mortem kebab variant (PM-001 — probability bare int)', () => {
      const result = parseArtifact(validPreMortemKebab, 'pre-mortem') as Record<string, unknown>;
      expect(result.probability).toBe(15);
      expect(result.impact).toBe('existential');
    });

    it('parses pre-mortem snake variant (PM-003 — probability "30%")', () => {
      const result = parseArtifact(validPreMortemSnake, 'pre-mortem') as Record<string, unknown>;
      expect(result.probability).toBe('30%');
      expect(result.impact).toBe('HIGH');
    });

    it('parses prediction with required fields', () => {
      const result = parseArtifact(validPrediction, 'prediction') as Record<string, unknown>;
      expect(result.id).toBe('PRED-001');
      expect(result.status).toBe('open');
    });

    it('parses tripwire with all required fields', () => {
      const result = parseArtifact(validTripwire, 'tripwire') as Record<string, unknown>;
      expect(result.tripwire_id).toBe('TW-FIN-001');
    });

    it('parses competitor with all required fields', () => {
      const result = parseArtifact(validCompetitor, 'competitor') as Record<string, unknown>;
      expect(result.competitor).toBe('Engageli');
    });
  });

  describe('normalizeKeys called inside parseArtifact', () => {
    it('accepts kebab-key position YAML and normalizes before Zod parse', () => {
      // ADR §2.10: normalizeKeys() is called inside parseArtifact.
      // The kebab keys in validPosition should be normalized transparently.
      const result = parseArtifact(validPosition, 'position') as Record<string, unknown>;
      // After normalization: 'last-updated' → 'last_updated'
      expect(result.last_updated).toBe('2026-05-21');
      expect(result.authored_by).toBe('claude-pass2-cfo-lens');
      expect(result.decision_this_supports).toBe('DEC-004');
    });
  });

  describe('error cases', () => {
    it('throws VaultSchemaParseError with zone in error when required field is missing', () => {
      const malformed = { title: 'Missing required id field' };
      expect(() => parseArtifact(malformed, 'position')).toThrow();
    });

    it('error from malformed position includes zone information', () => {
      const malformed = { title: 'Missing required fields' };
      try {
        parseArtifact(malformed, 'position');
        expect.fail('should have thrown');
      } catch (err) {
        // ADR §2.10: throws VaultSchemaParseError with zone in error context
        // Either the error message or a custom field contains the zone
        const errStr = String(err);
        expect(
          errStr.includes('position') || (err as { zone?: string }).zone === 'position'
        ).toBe(true);
      }
    });

    it('throws on malformed YAML object for decision zone', () => {
      expect(() => parseArtifact({ foo: 'bar' }, 'decision')).toThrow();
    });
  });
});

describe('zoneFor — file-path → ArtifactZone classifier', () => {
  it('returns position for paths including /positions/', () => {
    expect(zoneFor('/vault/positions/active/POS-001.md')).toBe('position');
  });

  it('returns decision for paths including /decisions/', () => {
    expect(zoneFor('/vault/decisions/DEC-005.md')).toBe('decision');
  });

  it('returns workstream for paths including /workstreams/', () => {
    expect(zoneFor('/vault/workstreams/WS-04.md')).toBe('workstream');
  });

  it('returns stakeholder_account for paths including /stakeholders/customers-', () => {
    expect(zoneFor('/vault/stakeholders/customers-top-arr/seu-bme.md')).toBe('stakeholder_account');
  });

  it('returns stakeholder_person for paths including /stakeholders/ (non-customer)', () => {
    expect(zoneFor('/vault/stakeholders/internal-exec-board/chasen-michael-ceo.md')).toBe('stakeholder_person');
  });

  it('returns pre-mortem for paths including /pre-mortems/', () => {
    expect(zoneFor('/vault/pre-mortems/PM-001.md')).toBe('pre-mortem');
  });

  it('returns prediction for paths including /calibration/predictions/', () => {
    expect(zoneFor('/vault/calibration/predictions/PRED-001.md')).toBe('prediction');
  });

  it('returns memo for paths including /memos/', () => {
    expect(zoneFor('/vault/memos/run-001.md')).toBe('memo');
  });

  it('returns handoff for paths including /handoffs/', () => {
    expect(zoneFor('/vault/handoffs/handoff-001.md')).toBe('handoff');
  });

  it('returns tripwire for paths including /adversarial/financial-tripwires/', () => {
    expect(zoneFor('/vault/adversarial/financial-tripwires/barclays-leverage-covenant.md')).toBe('tripwire');
  });

  it('returns competitor for paths including /adversarial/competitor-watch/', () => {
    expect(zoneFor('/vault/adversarial/competitor-watch/engageli.md')).toBe('competitor');
  });

  it('returns null for unrecognized paths (investigations/, deliverables/)', () => {
    expect(zoneFor('/vault/investigations/class-org-read.md')).toBeNull();
    expect(zoneFor('/vault/deliverables/report.md')).toBeNull();
  });
});
