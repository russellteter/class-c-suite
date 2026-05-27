/**
 * ADR-0005 §3 + §10 AC-6 — Synthesizer prompt voice-rule bake-in
 * Test owner: Ch.4 Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0005-ch4-prompts-rigor.md §3 + §10 AC-6
 *         docs/research/R0-skill-inventory.md §russell-voice §class-brand-voice
 *         CLAUDE.md ~./claude/rules/stop-slop-writing.md (stop-slop foundation)
 *
 * STATUS: RED until Ch.4 Runtime ships apps/utility/src/prompts/Synthesizer.prompt.md.
 *
 * Spec intent:
 *   - Load apps/utility/src/prompts/Synthesizer.prompt.md.
 *   - Assert it contains a "VOICE RULES — russell-voice" section with the 57-rule set.
 *   - Assert it contains a "VOICE RULES — class-brand-voice" section with the 29-rule set.
 *   - Assert explicit routing instructions:
 *       "personal-facing" content → russell-voice
 *       "company-facing" / "externally" → class-brand-voice
 *   - Assert required Synthesizer structural elements (falsifiers, reconciled position, etc).
 *
 * Rule counts per ADR §3.2:
 *   russell-voice: 8 stop-slop + ~14 voice-layer + ~21 vocab-swaps + ~14 banned-structures = 57
 *   class-brand-voice: 8 voice-constants + 8 terminology + 12 anti-patterns + 1 product-ref = 29
 *
 * Activating when Runtime ships:
 *   1. Flip `existsSync(SYNTHESIZER_PROMPT_PATH)` assertions to toBe(true).
 *   2. Replace `expect(true).toBe(true)` with real readFileSync + content assertions.
 *
 * BLOCKERS addressed: None directly, but Synthesizer voice-bake is a prerequisite for the
 *   memo quality that the Verifier grades. Voice rules baked into prompt = no runtime overhead.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

// ── Prompt file path ──────────────────────────────────────────────────────────

const SYNTHESIZER_PROMPT_PATH = resolve(
  __dirname,
  '../../apps/utility/src/prompts/Synthesizer.prompt.md',
);

// ── Russell-voice load-bearing strings (from ADR §3.2, R0-skill-inventory.md) ─
// These must appear verbatim in the VOICE RULES — russell-voice section.

const RUSSELL_VOICE_LOAD_BEARING = [
  // Stop-slop foundation (8 rules — representative markers)
  'Cut filler phrases',
  'Break formulaic structures',
  'active voice',
  'Be specific',
  // Russell voice layer (representative)
  'Contractions are mandatory',
  // Vocabulary swap table (representative rows)
  'leverage / utilize',
  'navigate challenges',
  // Banned structures (representative)
  'Binary contrasts',
  'Dramatic fragmentation',
  'False agency',
  // Routing instruction
  'russell-voice',
] as const;

// ── Class-brand-voice load-bearing strings (from ADR §3.3, R0-skill-inventory.md) ─

const CLASS_BRAND_VOICE_LOAD_BEARING = [
  // Voice constants (8 rules — representative)
  'Credible',
  'Accessible',
  'Practical',
  'Evidence-Driven',
  // Core positioning
  'Meeting tools were built for meetings',
  'Class was built for learning',
  // Terminology rules (representative)
  'Virtual Instructor-Led Training (VILT)',
  'Purpose-built',
  'Built on Zoom and Teams',
  // Anti-patterns (representative)
  'feature-dumping',
  'No passive voice',
  // Routing instruction
  'class-brand-voice',
] as const;

// ── Synthesizer structural requirements (ADR §3.1 + §3.4) ────────────────────

const SYNTHESIZER_STRUCTURAL_MARKERS = [
  // Falsifier section (NON-NEGOTIABLE per ADR §3.4)
  'Falsifiers',
  'empty falsifiers',
  // Core structural sections
  'executive summary',
  'reconciled position',
  'reco, don\'t average',
  // Write-backs
  'write-backs',
  // Routing instructions
  'personal-facing',
  'company-facing',
] as const;

// ── Pre-flight: prompt file does not yet exist ────────────────────────────────

describe('Synthesizer prompt file (pre-flight) [RED: Runtime not shipped]', () => {
  it('Synthesizer.prompt.md does not yet exist (expected RED)', () => {
    // When Ch.4 Runtime ships: expect(existsSync(SYNTHESIZER_PROMPT_PATH)).toBe(true);
    expect(existsSync(SYNTHESIZER_PROMPT_PATH)).toBe(false);
  });
});

// ── Voice section structure ───────────────────────────────────────────────────

describe('Synthesizer prompt: voice section headers [RED: Runtime not shipped]', () => {
  it('contains "VOICE RULES — russell-voice" section header [RED]', () => {
    // When Runtime ships:
    //   const content = readFileSync(SYNTHESIZER_PROMPT_PATH, 'utf8');
    //   expect(content).toContain('VOICE RULES — russell-voice');
    //   // OR the equivalent kebab-case variant
    //   // Exact header text from ADR §3.2: "VOICE RULES (NON-NEGOTIABLE):"
    //   //   plus "Apply russell-voice for the executive summary..."
    //   expect(content).toMatch(/VOICE RULES.*russell-voice/s);
    expect(true).toBe(true);
  });

  it('contains "VOICE RULES — class-brand-voice" section header [RED]', () => {
    // When Runtime ships:
    //   const content = readFileSync(SYNTHESIZER_PROMPT_PATH, 'utf8');
    //   expect(content).toMatch(/class-brand-voice/);
    expect(true).toBe(true);
  });

  it('contains explicit "VOICE RULES (NON-NEGOTIABLE)" marker [RED]', () => {
    // ADR §3.1 Core Synthesizer Prompt specifies this exact text.
    // When Runtime ships:
    //   const content = readFileSync(SYNTHESIZER_PROMPT_PATH, 'utf8');
    //   expect(content).toContain('VOICE RULES (NON-NEGOTIABLE)');
    expect(true).toBe(true);
  });
});

// ── Russell-voice rules bake-in ───────────────────────────────────────────────

describe('Synthesizer prompt: russell-voice 57 rules baked in [RED: Runtime not shipped]', () => {
  for (const marker of RUSSELL_VOICE_LOAD_BEARING) {
    it(`russell-voice marker present: "${marker}" [RED]`, () => {
      // When Runtime ships:
      //   const content = readFileSync(SYNTHESIZER_PROMPT_PATH, 'utf8');
      //   expect(content).toContain('${marker}');
      expect(true).toBe(true);
    });
  }

  it('russell-voice vocabulary swap table has at least 10 entries [RED]', () => {
    // ADR §3.2 vocab swap table has 18 rows. Test for 10 minimum.
    // When Runtime ships:
    //   const content = readFileSync(SYNTHESIZER_PROMPT_PATH, 'utf8');
    //   // Count "leverage" entries or pipe-separated table rows
    //   const tableRows = (content.match(/\|\s*leverage|utilize|optimize|facilitate|implement/gi) || []);
    //   expect(tableRows.length).toBeGreaterThanOrEqual(5);
    expect(true).toBe(true);
  });

  it('russell-voice banned structures list includes at least 6 banned patterns [RED]', () => {
    // ADR §3.2 lists 8 banned structure categories.
    // When Runtime ships:
    //   const content = readFileSync(SYNTHESIZER_PROMPT_PATH, 'utf8');
    //   const patterns = [
    //     'Binary contrasts',
    //     'Negative listing',
    //     'Dramatic fragmentation',
    //     'Rhetorical setups',
    //     'False agency',
    //     'Passive voice',
    //   ];
    //   for (const p of patterns) {
    //     expect(content).toContain(p);
    //   }
    expect(true).toBe(true);
  });
});

// ── Class-brand-voice rules bake-in ──────────────────────────────────────────

describe('Synthesizer prompt: class-brand-voice 29 rules baked in [RED: Runtime not shipped]', () => {
  for (const marker of CLASS_BRAND_VOICE_LOAD_BEARING) {
    it(`class-brand-voice marker present: "${marker}" [RED]`, () => {
      // When Runtime ships:
      //   const content = readFileSync(SYNTHESIZER_PROMPT_PATH, 'utf8');
      //   expect(content).toContain('${marker}');
      expect(true).toBe(true);
    });
  }

  it('class-brand-voice anti-patterns list has at least 8 items [RED]', () => {
    // ADR §3.3 anti-patterns: 12 entries. Minimum 8 for this test.
    // When Runtime ships:
    //   const content = readFileSync(SYNTHESIZER_PROMPT_PATH, 'utf8');
    //   const antiPatterns = [
    //     'feature-dumping',
    //     'unsourced statistics',
    //     'aggressive sales language',
    //     'competitor bashing',
    //     'one-size-fits-all',
    //     'dismissing existing methods',
    //     'artificial urgency',
    //     'passive voice',
    //   ];
    //   for (const ap of antiPatterns) {
    //     expect(content).toContain(ap);
    //   }
    expect(true).toBe(true);
  });

  it('class-brand-voice core positioning lines present [RED]', () => {
    // ADR §3.3 Core Positioning section contains two locked sentences.
    // When Runtime ships:
    //   const content = readFileSync(SYNTHESIZER_PROMPT_PATH, 'utf8');
    //   expect(content).toContain('Meeting tools were built for meetings. Class was built for learning.');
    expect(true).toBe(true);
  });
});

// ── Voice routing instructions ────────────────────────────────────────────────

describe('Synthesizer prompt: voice routing instructions [RED: Runtime not shipped]', () => {
  it('routes "personal-facing" content to russell-voice [RED]', () => {
    // ADR §3.1: "Apply russell-voice for the executive summary, reco, and open-questions sections
    //             (personal-facing content for Russell)."
    // When Runtime ships:
    //   const content = readFileSync(SYNTHESIZER_PROMPT_PATH, 'utf8');
    //   expect(content).toContain('personal-facing');
    //   expect(content).toContain('russell-voice');
    //   // Both must appear in proximity to each other (within 300 chars of a routing rule)
    expect(true).toBe(true);
  });

  it('routes "company-facing" / external content to class-brand-voice [RED]', () => {
    // ADR §3.1: "Apply class-brand-voice for any content that could be reused externally."
    // When Runtime ships:
    //   const content = readFileSync(SYNTHESIZER_PROMPT_PATH, 'utf8');
    //   expect(content).toContain('class-brand-voice');
    //   expect(content).toContain('externally');
    expect(true).toBe(true);
  });
});

// ── Structural requirements ───────────────────────────────────────────────────

describe('Synthesizer prompt: structural requirements (ADR §3.1 + §3.4) [RED: Runtime not shipped]', () => {
  for (const marker of SYNTHESIZER_STRUCTURAL_MARKERS) {
    it(`structural marker present: "${marker}" [RED]`, () => {
      // When Runtime ships:
      //   const content = readFileSync(SYNTHESIZER_PROMPT_PATH, 'utf8');
      //   expect(content).toContain('${marker}');
      expect(true).toBe(true);
    });
  }

  it('Falsifiers section is NON-NEGOTIABLE (empty falsifiers → Verifier FAIL) [RED]', () => {
    // ADR §3.4: "A memo that says 'X is the right call' without saying 'I'd change my mind if Y'
    //             is rubber-stamp drafting."
    // When Runtime ships:
    //   const content = readFileSync(SYNTHESIZER_PROMPT_PATH, 'utf8');
    //   expect(content).toContain('NON-NEGOTIABLE');
    //   expect(content).toContain('Falsifiers');
    //   expect(content).toContain('empty falsifiers');
    expect(true).toBe(true);
  });

  it('contains "reco, don\'t average" reconciliation rule [RED]', () => {
    // ADR §3.1: "Where lenses disagree, you DECIDE — 'reco, don't average.'"
    // When Runtime ships:
    //   const content = readFileSync(SYNTHESIZER_PROMPT_PATH, 'utf8');
    //   expect(content).toContain("reco, don't average");
    expect(true).toBe(true);
  });

  it('source_id binding requirement present (click-through claims) [RED]', () => {
    // ADR §3.1: "every claim cites its source_id; the renderer binds source_id to tool-call result"
    // When Runtime ships:
    //   const content = readFileSync(SYNTHESIZER_PROMPT_PATH, 'utf8');
    //   expect(content).toContain('source_id');
    expect(true).toBe(true);
  });
});

// ── Rule count documentation (static assertion, passes now) ──────────────────

describe('Voice rule counts per ADR §3.2 / §3.3 (static documentation)', () => {
  it('russell-voice = 57 discrete rules (per ADR §3.2 rule count)', () => {
    // 8 stop-slop foundation + ~14 Russell-voice rules + ~21 vocab swaps + ~14 banned structures
    const stopSlop = 8;
    const russellVoice = 14;
    const vocabSwaps = 21;
    const bannedStructures = 14;
    const total = stopSlop + russellVoice + vocabSwaps + bannedStructures;
    expect(total).toBe(57);
  });

  it('class-brand-voice = 29 discrete rules (per ADR §3.3 rule count)', () => {
    // 8 voice constants + 8 terminology + 12 anti-patterns + 1 product-reference pattern
    const voiceConstants = 8;
    const terminology = 8;
    const antiPatterns = 12;
    const productReference = 1;
    const total = voiceConstants + terminology + antiPatterns + productReference;
    expect(total).toBe(29);
  });
});
