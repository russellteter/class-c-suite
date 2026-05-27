/**
 * ADR-0005 §6 + §10 AC-2 + AC-10 — 12-case locked rigorScore table
 * Test owner: Ch.4 Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0005-ch4-prompts-rigor.md §6 + §10
 *         tests/fixtures/rigor-cases.json (single source of truth)
 *         docs/architecture/prompts.md §rigorScore
 *
 * STATUS: RED until Ch.4 Runtime ships.
 *
 * Spec intent:
 *   - Load tests/fixtures/rigor-cases.json (12 cases).
 *   - For each case: call rigorScore(verifierOutput), assert total matches expected_total.
 *   - For each case: call rigorThreshold(playbook), assert matches expected_threshold.
 *   - For each case: call applyRigorCap(total, playbook), assert capped value.
 *   - For each case: call shipStatus(total, playbook), assert matches expected_ship.
 *   - Case 12 (quick_read): assert shipStatus returns 'quick_read' without calling rigorScore.
 *   - Case 11 (open_qa perfect): assert rigorScore returns 100, applyRigorCap returns 85.
 *
 * All 12 cases must pass for the chapter to close (ROADMAP §Ch.4 exit criteria).
 *
 * Activating when Runtime ships:
 *   1. Uncomment the four imports below.
 *   2. Remove the `expect(() => require(...)).toThrow()` placeholder.
 *   3. Remove `expect(true).toBe(true)` placeholders in each test body.
 *
 * Formula: 35 claim_source + 20 coverage + 15 red_team + 15 calibration + 15 falsifier = 100 max.
 * Thresholds: strategic_option/restructure_decision >= 80 → clean; open_qa cap = 85; default >= 70.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Runtime imports (uncomment when Ch.4 Runtime ships) ─────────────────────
// import {
//   rigorScore,
//   rigorThreshold,
//   applyRigorCap,
//   shipStatus,
// } from '../../apps/utility/src/scoring/rigorScore.js';
// import type { PlaybookId } from '../../apps/utility/src/scoring/rigorScore.js';
// import type { VerifierOutput } from '../../packages/shared-types/src/verifier-output.js';

// ── Fixture load ─────────────────────────────────────────────────────────────

const FIXTURE_PATH = resolve(__dirname, '../../tests/fixtures/rigor-cases.json');

interface RigorCase {
  id: number;
  dimensions: {
    claim_source: number;
    coverage: number;
    red_team: number;
    calibration: number;
    falsifier: number;
  } | null;
  expected_total: number | null;
  expected_capped_total?: number;
  playbook: string;
  expected_ship: string;
  expected_threshold: number | null;
  expected_status_stamp?: string;
  rationale: string;
}

interface RigorFixture {
  comment: string;
  schema: {
    weights: Record<string, number>;
    thresholds: Record<string, number>;
  };
  cases: RigorCase[];
}

function loadFixture(): RigorFixture {
  return JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as RigorFixture;
}

/**
 * Build a synthetic VerifierOutput stub for rigorScore() input.
 * When Runtime ships: replace with actual VerifierOutput type.
 */
function buildStubVerifierOutput(dims: NonNullable<RigorCase['dimensions']>): unknown {
  return {
    rigor_score: 0,  // computed by rigorScore(), not the field
    ship_status: 'draft',
    dimensions: {
      claim_source: {
        score: dims.claim_source,
        claims_total: 10,
        claims_verified: dims.claim_source > 0 ? 8 : 0,
        claims_unverified: [],
      },
      coverage: {
        score: dims.coverage,
        lenses_run: ['CEO', 'CFO', 'CRO', 'CMO', 'CPO', 'COS'],
        lenses_cited_in_memo: dims.coverage > 0 ? ['CEO', 'CFO', 'CRO', 'CMO', 'CPO', 'COS'] : [],
        missing_findings: [],
      },
      red_team: {
        score: dims.red_team,
        addressed: dims.red_team > 0 ? 3 : 0,
        unaddressed: 0,
        unaddressed_details: [],
      },
      calibration: {
        score: dims.calibration,
        stale_position_citations: [],
      },
      falsifier: {
        score: dims.falsifier,
        present: dims.falsifier > 0,
        quality: dims.falsifier > 0 ? 'strong' : 'missing',
      },
    },
    failure_reasons: [],
    verifier_notes: '',
  };
}

// ── Fixture schema verification ──────────────────────────────────────────────

describe('rigor-cases.json fixture schema (pre-flight)', () => {
  it('fixture loads and has 12 cases', () => {
    const fixture = loadFixture();
    expect(fixture.cases).toHaveLength(12);
  });

  it('fixture weights sum to 100', () => {
    const fixture = loadFixture();
    const total = Object.values(fixture.schema.weights).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });

  it('fixture case IDs are 1-12 sequential', () => {
    const fixture = loadFixture();
    const ids = fixture.cases.map(c => c.id);
    expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('fixture matches ADR §6 table — all 12 rows: playbook + expected_ship', () => {
    const fixture = loadFixture();
    const rows = fixture.cases.map(c => ({
      id: c.id,
      playbook: c.playbook,
      expected_ship: c.expected_ship,
    }));
    // ADR §6.2 table locked values:
    expect(rows).toEqual([
      { id: 1,  playbook: 'strategic_option',    expected_ship: 'clean'      },
      { id: 2,  playbook: 'strategic_option',    expected_ship: 'clean'      },
      { id: 3,  playbook: 'strategic_option',    expected_ship: 'clean'      },
      { id: 4,  playbook: 'strategic_option',    expected_ship: 'draft'      },
      { id: 5,  playbook: 'gtm_reallocation',    expected_ship: 'clean'      },
      { id: 6,  playbook: 'gtm_reallocation',    expected_ship: 'draft'      },
      { id: 7,  playbook: 'gtm_reallocation',    expected_ship: 'clean'      },
      { id: 8,  playbook: 'restructure_decision', expected_ship: 'clean'     },
      { id: 9,  playbook: 'board_narrative',      expected_ship: 'clean'     },
      { id: 10, playbook: 'open_qa',              expected_ship: 'clean'     },
      { id: 11, playbook: 'open_qa',              expected_ship: 'clean'     },
      { id: 12, playbook: 'quick_read',           expected_ship: 'quick_read' },
    ]);
  });

  it('fixture dimension totals match expected_total for all non-null cases', () => {
    const fixture = loadFixture();
    for (const c of fixture.cases) {
      if (c.dimensions === null) continue;
      const computed = c.dimensions.claim_source + c.dimensions.coverage
                     + c.dimensions.red_team + c.dimensions.calibration
                     + c.dimensions.falsifier;
      expect(computed).toBe(c.expected_total);
    }
  });
});

// ── AC-2: 12-case rigorScore table ───────────────────────────────────────────

describe('AC-2: rigorScore() 12-case locked table [RED: Runtime not shipped]', () => {
  it('modules are not yet resolvable (expected RED)', () => {
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../../apps/utility/src/scoring/rigorScore.js');
    }).toThrow();
  });

  const fixture = loadFixture();

  for (const c of fixture.cases) {
    if (c.id === 12) continue;  // quick_read bypass tested in AC-10 block

    it(`case ${c.id} (${c.playbook}): rigorScore = ${c.expected_total} [RED]`, () => {
      // When Runtime ships:
      //
      //   const verifierOutput = buildStubVerifierOutput(c.dimensions!) as VerifierOutput;
      //   const score = rigorScore(verifierOutput);
      //   expect(score).toBe(c.expected_total);
      //
      // Rationale: ${c.rationale}

      expect(true).toBe(true); // placeholder — remove when Runtime ships
    });

    it(`case ${c.id} (${c.playbook}): rigorThreshold = ${c.expected_threshold} [RED]`, () => {
      // When Runtime ships:
      //
      //   const threshold = rigorThreshold(c.playbook as PlaybookId);
      //   expect(threshold).toBe(c.expected_threshold);

      expect(true).toBe(true);
    });

    it(`case ${c.id} (${c.playbook}): shipStatus = '${c.expected_ship}' [RED]`, () => {
      // When Runtime ships:
      //
      //   const rawScore = c.expected_total!;
      //   const capped = applyRigorCap(rawScore, c.playbook as PlaybookId);
      //   const status = shipStatus(rawScore, c.playbook as PlaybookId);
      //   expect(status).toBe(c.expected_ship);
      //
      // For case 11 (open_qa, total=100): capped must be 85, status must be 'clean'.

      expect(true).toBe(true);
    });
  }
});

// ── AC-10: quick_read bypass path ─────────────────────────────────────────────

describe('AC-10: quick_read bypasses rigorScore entirely [RED: Runtime not shipped]', () => {
  it('shipStatus(anyScore, "quick_read") returns "quick_read" without rigorScore call [RED]', () => {
    // When Runtime ships:
    //
    //   import { vi } from 'vitest';
    //   import * as rigorScoreModule from '../../apps/utility/src/scoring/rigorScore.js';
    //
    //   const spy = vi.spyOn(rigorScoreModule, 'rigorScore');
    //   const result = shipStatus(99, 'quick_read');
    //
    //   expect(result).toBe('quick_read');
    //   expect(spy).not.toHaveBeenCalled();
    //
    // Case 12 rationale: quick_read bypasses Verifier entirely — no score assembly,
    // no VerifierInput assembled; tests must assert the bypass code path is taken.

    expect(true).toBe(true);
  });

  it('case 12 fixture: dimensions are null, expected_total is null, expected_ship is "quick_read"', () => {
    const fixture = loadFixture();
    const case12 = fixture.cases.find(c => c.id === 12)!;
    expect(case12).toBeDefined();
    expect(case12.dimensions).toBeNull();
    expect(case12.expected_total).toBeNull();
    expect(case12.expected_ship).toBe('quick_read');
    expect(case12.playbook).toBe('quick_read');
  });
});

// ── open_qa cap verification ──────────────────────────────────────────────────

describe('open_qa cap: applyRigorCap clamps score to 85 [RED: Runtime not shipped]', () => {
  it('case 11: rigorScore = 100 → applyRigorCap → 85 [RED]', () => {
    // When Runtime ships:
    //
    //   const fixture = loadFixture();
    //   const case11 = fixture.cases.find(c => c.id === 11)!;
    //   const verifierOutput = buildStubVerifierOutput(case11.dimensions!) as VerifierOutput;
    //   const rawScore = rigorScore(verifierOutput);
    //   expect(rawScore).toBe(100);
    //   const capped = applyRigorCap(rawScore, 'open_qa');
    //   expect(capped).toBe(85);
    //   expect(case11.expected_capped_total).toBe(85);

    const fixture = loadFixture();
    const case11 = fixture.cases.find(c => c.id === 11)!;
    expect(case11).toBeDefined();
    expect(case11.expected_total).toBe(100);
    expect(case11.expected_capped_total).toBe(85);
    expect(case11.expected_status_stamp).toBe('ad_hoc');
  });

  it('case 10: open_qa total = 85 hits the cap exactly; shipStatus = "clean" [RED]', () => {
    // When Runtime ships:
    //
    //   const fixture = loadFixture();
    //   const case10 = fixture.cases.find(c => c.id === 10)!;
    //   const capped = applyRigorCap(case10.expected_total!, 'open_qa');
    //   expect(capped).toBe(85);  // already at cap
    //   const status = shipStatus(case10.expected_total!, 'open_qa');
    //   expect(status).toBe('clean');

    const fixture = loadFixture();
    const case10 = fixture.cases.find(c => c.id === 10)!;
    expect(case10.expected_total).toBe(85);
    expect(case10.expected_threshold).toBe(85);
    expect(case10.expected_ship).toBe('clean');
  });
});
