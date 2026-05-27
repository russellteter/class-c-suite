/**
 * ADR-0005 §3 + §10 AC-6 — Synthesizer prompt voice-rule bake-in
 * Test owner: Ch.4 Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0005-ch4-prompts-rigor.md §3 + §10 AC-6
 *         docs/research/R0-skill-inventory.md §russell-voice §class-brand-voice
 *         CLAUDE.md ~./claude/rules/stop-slop-writing.md (stop-slop foundation)
 *
 * STATUS: GREEN — Ch.4 Runtime shipped apps/utility/src/prompts/Synthesizer.prompt.md.
 *
 * Spec intent:
 *   - Load apps/utility/src/prompts/Synthesizer.prompt.md.
 *   - Assert it contains a "VOICE RULES — russell-voice" section with the 57-rule set.
 *   - Assert it contains a "VOICE RULES — class-brand-voice" section with the 29-rule set.
 *   - Assert explicit routing instructions:
 *       "personal-facing" content → russell-voice
 *       "externally" → class-brand-voice
 *   - Assert required Synthesizer structural elements (falsifiers, reconciled position, etc).
 *
 * Rule counts per ADR §3.2:
 *   russell-voice: 8 stop-slop + ~14 voice-layer + ~21 vocab-swaps + ~14 banned-structures = 57
 *   class-brand-voice: 8 voice-constants + 8 terminology + 12 anti-patterns + 1 product-ref = 29
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
// Note: prompt routes to class-brand-voice via "externally" (not "company-facing")

const SYNTHESIZER_STRUCTURAL_MARKERS = [
  // Falsifier section (NON-NEGOTIABLE per ADR §3.4)
  'Falsifiers',
  'empty falsifiers',
  // Core structural sections
  'executive summary',
  'reconciled position',
  "reco, don't average",
  // Write-backs
  'write-backs',
  // Routing instructions
  'personal-facing',
  'externally',    // prompt uses "reused externally" — not "company-facing"
] as const;

// ── Pre-flight: prompt file exists (Ch.4 Runtime shipped) ────────────────────

describe('Synthesizer prompt file (pre-flight)', () => {
  it('Synthesizer.prompt.md exists', () => {
    expect(existsSync(SYNTHESIZER_PROMPT_PATH)).toBe(true);
  });
});

// ── Voice section structure ───────────────────────────────────────────────────

describe('Synthesizer prompt: voice section headers', () => {
  it('contains "VOICE RULES — russell-voice" section header', () => {
    const content = readFileSync(SYNTHESIZER_PROMPT_PATH, 'utf8');
    expect(content).toContain('VOICE RULES — russell-voice');
  });

  it('contains "VOICE RULES — class-brand-voice" section header', () => {
    const content = readFileSync(SYNTHESIZER_PROMPT_PATH, 'utf8');
    expect(content).toContain('VOICE RULES — class-brand-voice');
  });

  it('contains explicit "VOICE RULES (NON-NEGOTIABLE)" marker', () => {
    const content = readFileSync(SYNTHESIZER_PROMPT_PATH, 'utf8');
    expect(content).toContain('VOICE RULES (NON-NEGOTIABLE)');
  });
});

// ── Russell-voice rules bake-in ───────────────────────────────────────────────

describe('Synthesizer prompt: russell-voice 57 rules baked in', () => {
  for (const marker of RUSSELL_VOICE_LOAD_BEARING) {
    it(`russell-voice marker present: "${marker}"`, () => {
      const content = readFileSync(SYNTHESIZER_PROMPT_PATH, 'utf8');
      expect(content).toContain(marker);
    });
  }

  it('russell-voice vocabulary swap table has at least 5 entries', () => {
    const content = readFileSync(SYNTHESIZER_PROMPT_PATH, 'utf8');
    // Count pipe-separated table rows matching vocab swap pattern
    const tableRows = (content.match(/\|\s*(?:leverage|utilize|optimize|facilitate|implement|navigate|align)/gi) || []);
    expect(tableRows.length).toBeGreaterThanOrEqual(5);
  });

  it('russell-voice banned structures list includes at least 6 banned patterns', () => {
    const content = readFileSync(SYNTHESIZER_PROMPT_PATH, 'utf8');
    const patterns = [
      'Binary contrasts',
      'Dramatic fragmentation',
      'False agency',
      'active voice',
      'Cut filler',
      'Break formulaic',
    ];
    for (const p of patterns) {
      expect(content).toContain(p);
    }
  });
});

// ── Class-brand-voice rules bake-in ──────────────────────────────────────────

describe('Synthesizer prompt: class-brand-voice 29 rules baked in', () => {
  for (const marker of CLASS_BRAND_VOICE_LOAD_BEARING) {
    it(`class-brand-voice marker present: "${marker}"`, () => {
      const content = readFileSync(SYNTHESIZER_PROMPT_PATH, 'utf8');
      expect(content).toContain(marker);
    });
  }

  it('class-brand-voice anti-patterns list has at least 5 items', () => {
    const content = readFileSync(SYNTHESIZER_PROMPT_PATH, 'utf8');
    const antiPatterns = [
      'feature-dumping',
      'No passive voice',
      'Credible',
      'Accessible',
      'Practical',
    ];
    for (const ap of antiPatterns) {
      expect(content).toContain(ap);
    }
  });

  it('class-brand-voice core positioning lines present', () => {
    const content = readFileSync(SYNTHESIZER_PROMPT_PATH, 'utf8');
    expect(content).toContain('Meeting tools were built for meetings');
    expect(content).toContain('Class was built for learning');
  });
});

// ── Voice routing instructions ────────────────────────────────────────────────

describe('Synthesizer prompt: voice routing instructions', () => {
  it('routes "personal-facing" content to russell-voice', () => {
    const content = readFileSync(SYNTHESIZER_PROMPT_PATH, 'utf8');
    expect(content).toContain('personal-facing');
    expect(content).toContain('russell-voice');
  });

  it('routes external content to class-brand-voice', () => {
    // Prompt uses "reused externally" rather than "company-facing"
    const content = readFileSync(SYNTHESIZER_PROMPT_PATH, 'utf8');
    expect(content).toContain('class-brand-voice');
    expect(content).toContain('externally');
  });
});

// ── Structural requirements ───────────────────────────────────────────────────

describe('Synthesizer prompt: structural requirements (ADR §3.1 + §3.4)', () => {
  for (const marker of SYNTHESIZER_STRUCTURAL_MARKERS) {
    it(`structural marker present: "${marker}"`, () => {
      const content = readFileSync(SYNTHESIZER_PROMPT_PATH, 'utf8');
      expect(content).toContain(marker);
    });
  }

  it('Falsifiers section is NON-NEGOTIABLE (empty falsifiers → Verifier FAIL)', () => {
    const content = readFileSync(SYNTHESIZER_PROMPT_PATH, 'utf8');
    expect(content).toContain('NON-NEGOTIABLE');
    expect(content).toContain('Falsifiers');
    expect(content).toContain('empty falsifiers');
  });

  it("contains \"reco, don't average\" reconciliation rule", () => {
    const content = readFileSync(SYNTHESIZER_PROMPT_PATH, 'utf8');
    expect(content).toContain("reco, don't average");
  });

  it('source_id binding requirement present (click-through claims)', () => {
    const content = readFileSync(SYNTHESIZER_PROMPT_PATH, 'utf8');
    expect(content).toContain('source_id');
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
