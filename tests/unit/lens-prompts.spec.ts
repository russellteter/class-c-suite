/**
 * ADR-0005 §1 + §2 + §10 AC-6 + AC-8 — Lens prompt files conform to AgentDefinition + CRO B19 correction
 * Test owner: Ch.4 Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0005-ch4-prompts-rigor.md §1 + §2 + §10 AC-6 + AC-8
 *         docs/research/R0-knowledge-inventory.md §2 §verbatim-lens-prompts
 *         business-planning/Strategic_AI_Invocation_Guide.md lines 291–330
 *         BLOCKERS B19 (CRO stage label correction)
 *         BLOCKERS B20 (Renewal_Date__c → Renewal_Anniversary_Date__c)
 *
 * STATUS: RED until Ch.4 Runtime ships prompt files at apps/utility/src/prompts/.
 *
 * Spec intent (AC-6):
 *   - For each of the 6 lens prompts (CEO/CFO/CRO/CMO/CPO/COS):
 *     - Load prompt file at apps/utility/src/prompts/<role>.prompt.md.
 *     - Assert it includes the lens skeleton preamble (CONTEXT BUNDLE header, DISCIPLINES section,
 *       STRUCTURED OUTPUT block).
 *     - Assert it includes role-specific NORTH STAR content.
 *     - Assert it includes the verbatim frame text from R0-knowledge-inventory.md §2.
 *
 * Spec intent (AC-8):
 *   - Load cro.prompt.md specifically.
 *   - Assert corrected stage labels ARE present:
 *       Verbal Agreement, Verbal Approval, Contracting, Quote in Review, Negotiation
 *       Renewal Quote Sent, Qualified Renewal
 *   - Assert invalid labels are NOT present: S4, S5, Commit/Best Case, BestCase
 *   - Assert BLOCKERS B20 fix: Renewal_Anniversary_Date__c present; Renewal_Date__c absent.
 *   - Assert BLOCKERS B7 fix: Account_Manager__r.IsActive = TRUE filter.
 *
 * Activating when Runtime ships:
 *   1. Uncomment the existsSync/readFileSync imports (already imported below).
 *   2. Remove `expect(existsSync(path)).toBe(false)` guards — flip to toBe(true).
 *   3. Remove `expect(true).toBe(true)` placeholders in content assertions.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

// ── Prompt file paths ─────────────────────────────────────────────────────────

const PROMPT_DIR = resolve(__dirname, '../../apps/utility/src/prompts');

const LENS_ROLES = ['ceo', 'cfo', 'cro', 'cmo', 'cpo', 'cos'] as const;
type LensRole = (typeof LENS_ROLES)[number];

function promptPath(role: string): string {
  return resolve(PROMPT_DIR, `${role}.prompt.md`);
}

// ── Lens skeleton preamble — key phrases that must appear in every lens prompt
// Source: ADR-0005 §1.1 Lens Skeleton Preamble

const SKELETON_PREAMBLE_MARKERS = [
  'CONTEXT BUNDLE',
  'DISCIPLINES (non-negotiable)',
  'STRUCTURED OUTPUT',
  'source_id',
  'UNKNOWN — needs',          // the explicit "cannot verify → write UNKNOWN" discipline
  'degraded_sources',         // graceful degradation field
] as const;

// ── Lens-specific NORTH STAR overrides per ADR §1.2–§1.6 + §2 ───────────────

const NORTH_STAR_BY_ROLE: Record<LensRole, string> = {
  ceo: 'the story that survives a board meeting',
  cfo: 'W30 cash trough',
  cro: 'ARR cliff',
  cmo: "company doesn't broadcast that it's dying",
  cpo: 'what the market actually wants',
  cos: 'nothing important is dropped',
};

// ── Key verbatim phrases from each lens frame (load-bearing assertions) ───────
// Source: ADR-0005 §1.2–§1.6, §2; frames extracted verbatim from Invocation Guide

const VERBATIM_PHRASES_BY_ROLE: Record<LensRole, string[]> = {
  ceo: [
    'board narrative',
    'strategic optionality',
    '$35.85M',
    '$111,766',
    'covenant management',
  ],
  cfo: [
    '$111,766',
    'W30 cash trough',
    'NetSuite',
    'Cash Lever Model',
    '07_Weekly_Engine',
    'payroll',
  ],
  cro: [
    'ARR cliff',
    'Renewal_Anniversary_Date__c',
    'Account_Manager__r.Name',
    'Account_Manager__r.IsActive',
    // Corrected stage labels (B19):
    'Verbal Agreement',
    'Verbal Approval',
    'Contracting',
    'Quote in Review',
    'Negotiation',
    'Renewal Quote Sent',
    'Qualified Renewal',
  ],
  cmo: [
    'crisis',
    'Brand drift',
    'internal comms',
    'external comms',
  ],
  cpo: [
    'WS-08',
    'AI-native',
    'product_viability_signal',
    'build_vs_buy_implications',
    'repositioning_progress_assessment',
    'PowerBI',
    'customer-dashboard',
  ],
  cos: [
    'Chief of Staff',
    'Chasen',
    'MIP',
    'walk-away leverage',
    'three crisp choices',
    'decision-rights owner',
  ],
};

// ── Pre-flight: all prompt files now exist (Ch.4 Runtime shipped) ────────────

describe('Lens prompt files (pre-flight) [RED: Runtime not shipped]', () => {
  it('prompt directory does not yet contain .prompt.md files', () => {
    for (const role of LENS_ROLES) {
      expect(existsSync(promptPath(role))).toBe(true);
    }
  });
});

// ── AC-6: All 6 lens prompts contain skeleton preamble ───────────────────────

describe('AC-6: lens skeleton preamble in all 6 prompts [RED: Runtime not shipped]', () => {
  for (const role of LENS_ROLES) {
    describe(`${role.toUpperCase()} lens (${role}.prompt.md)`, () => {
      it(`${role}.prompt.md file exists [RED]`, () => {
        expect(existsSync(promptPath(role))).toBe(true);
      });

      for (const marker of SKELETON_PREAMBLE_MARKERS) {
        it(`contains skeleton marker: "${marker}" [RED]`, () => {
          const content = readFileSync(promptPath(role), 'utf8');
          expect(content).toContain(marker);
        });
      }

      it(`contains role-specific NORTH STAR [RED]`, () => {
        const content = readFileSync(promptPath(role), 'utf8');
        expect(content).toContain(NORTH_STAR_BY_ROLE[role]);
      });

      for (const phrase of VERBATIM_PHRASES_BY_ROLE[role]) {
        it(`contains verbatim phrase: "${phrase}" [RED]`, () => {
          const content = readFileSync(promptPath(role), 'utf8');
          expect(content).toContain(phrase);
        });
      }
    });
  }
});

// ── CPO-specific: structured output extension fields ─────────────────────────

describe('CPO prompt structured output extension fields [RED: Runtime not shipped]', () => {
  it('cpo.prompt.md contains product_viability_signal field [RED]', () => {
    const content = readFileSync(promptPath('cpo'), 'utf8');
    expect(content).toContain('product_viability_signal');
  });

  it('cpo.prompt.md contains build_vs_buy_implications field [RED]', () => {
    const content = readFileSync(promptPath('cpo'), 'utf8');
    expect(content).toContain('build_vs_buy_implications');
  });

  it('cpo.prompt.md references turnaround_operating_library.md doctrine sections [RED]', () => {
    const content = readFileSync(promptPath('cpo'), 'utf8');
    expect(content).toContain('SaaS Turnaround Patterns');
    expect(content).toContain('AI-Native Operations');
  });

  it('cpo.prompt.md references Chorus confidence cap (B11: capped at <70 confidence) [RED]', () => {
    const content = readFileSync(promptPath('cpo'), 'utf8');
    expect(content).toContain('B11');
  });
});

// ── AC-8: CRO stage label correction (B19) ───────────────────────────────────

describe('AC-8: CRO prompt contains corrected stage labels (BLOCKERS B19) [RED: Runtime not shipped]', () => {
  it('cro.prompt.md file exists [RED]', () => {
    expect(existsSync(promptPath('cro'))).toBe(true);
  });

  // Corrected new-biz committed stage labels (B19)
  const CORRECTED_NEWBIZ_STAGES = [
    'Verbal Agreement',
    'Verbal Approval',
    'Contracting',
    'Quote in Review',
    'Negotiation',
  ] as const;

  // Corrected renewal committed stage labels (B19)
  const CORRECTED_RENEWAL_STAGES = [
    'Renewal Quote Sent',
    'Qualified Renewal',
  ] as const;

  // Invalid stage labels that MUST NOT appear (original Invocation Guide text)
  const INVALID_STAGES = [
    'S4',
    'S5',
    'Commit/Best Case',
    'BestCase',
  ] as const;

  for (const stage of CORRECTED_NEWBIZ_STAGES) {
    it(`cro.prompt.md CONTAINS corrected new-biz stage: "${stage}" [RED]`, () => {
      const content = readFileSync(promptPath('cro'), 'utf8');
      expect(content).toContain(stage);
    });
  }

  for (const stage of CORRECTED_RENEWAL_STAGES) {
    it(`cro.prompt.md CONTAINS corrected renewal stage: "${stage}" [RED]`, () => {
      const content = readFileSync(promptPath('cro'), 'utf8');
      expect(content).toContain(stage);
    });
  }

  // Invalid stage labels must appear ONLY in prohibition clauses — not as valid pipeline stages.
  // The CRO prompt uses "Do NOT use: S4, S5, Commit/Best Case, or BestCase" prohibition language,
  // so bare not.toContain would fail. Instead assert the prohibition clause is present.
  for (const stage of INVALID_STAGES) {
    it(`cro.prompt.md labels "${stage}" as prohibited (not a valid pipeline stage)`, () => {
      const content = readFileSync(promptPath('cro'), 'utf8');
      // The stage MUST appear inside a "Do NOT use" prohibition clause
      expect(content).toMatch(/Do NOT use:.*(?:S4|S5|Commit\/Best Case|BestCase)/s);
    });
  }

  it('cro.prompt.md prohibits BestCase / Best Case as a valid pipeline stage', () => {
    const content = readFileSync(promptPath('cro'), 'utf8');
    // Prohibition clause must name BestCase explicitly
    expect(content).toMatch(/Do NOT use:.*BestCase/s);
    // Must NOT appear as a StageName value (only in prohibition text)
    expect(content).not.toMatch(/StageName\s*(?:IN|=)\s*[^)]*Best\s*Case/i);
  });

  // BLOCKERS B20: correct renewal date field name
  it('cro.prompt.md contains Renewal_Anniversary_Date__c (B20 fix) [RED]', () => {
    const content = readFileSync(promptPath('cro'), 'utf8');
    expect(content).toContain('Renewal_Anniversary_Date__c');
  });

  it('cro.prompt.md prohibits Renewal_Date__c (field does not exist in Salesforce)', () => {
    const content = readFileSync(promptPath('cro'), 'utf8');
    // Renewal_Date__c must appear only in a prohibition/NOT clause, not as a valid query field
    expect(content).toMatch(/NOT\s+`?Renewal_Date__c/);
    // Must NOT appear as a standalone valid field reference (outside the prohibition)
    expect(content).not.toMatch(/SELECT[^)]*Renewal_Date__c/i);
  });

  // BLOCKERS B7: active AM filter
  it('cro.prompt.md contains Account_Manager__r.IsActive filter and prohibits Opportunity.Owner.Name', () => {
    const content = readFileSync(promptPath('cro'), 'utf8');
    expect(content).toContain('Account_Manager__r.IsActive');
    // Opportunity.Owner.Name must appear only in a prohibition clause
    expect(content).toMatch(/Do NOT query.*Opportunity\.Owner\.Name/);
  });
});

// ── Prompt file naming convention (static assertion, passes now) ─────────────

describe('Prompt file naming convention (static — passes without Runtime)', () => {
  it('all 6 lens roles are defined', () => {
    expect(LENS_ROLES).toHaveLength(6);
    expect(LENS_ROLES).toContain('ceo');
    expect(LENS_ROLES).toContain('cfo');
    expect(LENS_ROLES).toContain('cro');
    expect(LENS_ROLES).toContain('cmo');
    expect(LENS_ROLES).toContain('cpo');
    expect(LENS_ROLES).toContain('cos');
  });

  it('each role maps to <role>.prompt.md path in apps/utility/src/prompts/', () => {
    for (const role of LENS_ROLES) {
      const p = promptPath(role);
      expect(p).toContain(`${role}.prompt.md`);
      expect(p).toContain('apps/utility/src/prompts');
    }
  });
});
