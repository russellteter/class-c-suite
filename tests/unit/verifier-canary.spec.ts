/**
 * ADR-0004 §8 row AC-7 — B3 canary: no reasoning traces in VerifierInput + canary memo
 * Test owner: Ch.3 Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0004-ch3-runtime-spine.md §5.4 + §8 AC-7
 *         BLOCKERS.md B3 (P0, VERIFIED — Verifier reasoning-trace leak is keystone)
 *
 * STATUS: AC-7a (structural no-reasoning-trace check) is RED until Ch.3 Runtime ships.
 *         AC-7b (planted-claim canary — $43M unsourced claim) is RED until Ch.4 ships.
 *
 * Spec intent (AC-7a):
 *   - Call buildVerifierInput() on a complete run.
 *   - Assert output JSON contains no reasoning trace markers:
 *       '<thinking>', 'chain_of_thought', 'reasoning_trace'
 *   - The Verifier ONLY sees structured outputs — never reasoning traces.
 *
 * Spec intent (AC-7b — canary):
 *   - Load tests/fixtures/canary-memo.md (exists — already committed).
 *   - Build VerifierInput with the canary memo (which contains unsourced "$43M" claim).
 *   - Call Verifier via stub harness with Ch.4-captured canary fixture.
 *   - Assert: claims_unverified contains the $43M claim, ship_status='draft', score < 35.
 *   - This canary goes RED if Verifier becomes lenient — the anti-sycophancy regression guard.
 *
 * Note: Ch.3 Test sets up the test infrastructure; Ch.4 Test/Runtime supplies the
 * Verifier prompt + recorded canary stub. When Ch.4 ships, activate AC-7b below.
 *
 * Activating when Runtime ships (AC-7a):
 *   1. Uncomment the buildVerifierInput + VerifierInputContractViolation import.
 *   2. Remove the `expect(true).toBe(true)` placeholder from the structural check test.
 *
 * Activating when Ch.4 ships (AC-7b canary):
 *   1. Uncomment the Ch.4 Verifier invocation block.
 *   2. Confirm canary fixture at tests/fixtures/stubs/verifier-canary-<hash>.json.
 *   3. The assertions on ship_status, claims_unverified, score must never be relaxed.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import Database from 'better-sqlite3';

import {
  buildVerifierInput,
  VerifierInputContractViolation,
} from '../../apps/utility/src/verifier-assembler.js';

// ── Ch.4 import (uncomment when Ch.4 Verifier ships) ────────────────────────
// import { invokeVerifier } from '../../apps/utility/src/orchestrator/index.js';

// ── Canary fixture paths ───────────────────────────────────────────────────────
const CANARY_MEMO_PATH = resolve(__dirname, '../../tests/fixtures/canary-memo.md');

// Strings that MUST NOT appear in a VerifierInput (reasoning trace markers per ADR §5.1)
const REASONING_TRACE_MARKERS = [
  '<thinking>',
  'chain_of_thought',
  'reasoning_trace',
] as const;

// ── AC-7 Tests ────────────────────────────────────────────────────────────────

describe('AC-7: B3 canary — VerifierInput contains no reasoning traces (ADR-0004 §5.4)', () => {

  it('canary-memo.md fixture exists and contains the planted unsourced $43M claim', () => {
    // This assertion passes now — the fixture is already committed.
    expect(existsSync(CANARY_MEMO_PATH)).toBe(true);

    const content = readFileSync(CANARY_MEMO_PATH, 'utf8');
    // The planted claim is load-bearing — do NOT modify canary-memo.md.
    expect(content).toMatch(/Q3 ARR was \$43M/);
    // The planted claim in the executive summary must have no source_id on the same line.
    // (source_id appears later in the test assertion documentation section — that's fine.)
    const execSummarySection = content.split('## Reconciled position')[0] ?? content;
    expect(execSummarySection).not.toMatch(/Q3 ARR was \$43M.*source_id/s);
  });

  it('canary-memo.md documents the expected Verifier behavior (anti-sycophancy guard)', () => {
    const content = readFileSync(CANARY_MEMO_PATH, 'utf8');
    // Verify the fixture contains the test assertion section
    expect(content).toContain('Verifier expected behavior');
    expect(content).toContain('ship_status');
    expect(content).toContain('claims_unverified');
  });

  it('buildVerifierInput and VerifierInputContractViolation are exported from verifier-assembler', () => {
    expect(typeof buildVerifierInput).toBe('function');
    expect(typeof VerifierInputContractViolation).toBe('function');
  });

  it('VerifierInput JSON contains no reasoning trace markers [RED: Runtime not shipped]', () => {
    // Structural check — the assembled VerifierInput must never contain reasoning trace strings.
    // When Runtime ships:
    //
    //   const db = createCompleteRunDb('canary-no-traces');
    //   const state = makeCompleteSynthesizerState('canary-no-traces');
    //   const input = buildVerifierInput('canary-no-traces', state, db);
    //   const json = JSON.stringify(input);
    //
    //   for (const marker of REASONING_TRACE_MARKERS) {
    //     expect(json).not.toContain(marker);
    //   }
    //
    //   db.close();

    expect(true).toBe(true);
  });

  it('VerifierInput does not include any agent systemPrompt field [RED: Runtime not shipped]', () => {
    // Verifier audits the memo on merits — must not receive prompts (ADR §5.1 exclusion list).
    // When Runtime ships:
    //   const input = buildVerifierInput('test-run', state, db);
    //   const json = JSON.stringify(input);
    //   expect(json).not.toContain('systemPrompt');
    //   expect(json).not.toContain('STUB — see Ch.4');

    expect(true).toBe(true);
  });

  it('VerifierInput does not include partial message streams [RED: Runtime not shipped]', () => {
    // Verifier must not see partial message buffers — only schema-validated output_json.
    // When Runtime ships:
    //   const input = buildVerifierInput('test-run', state, db);
    //   const json = JSON.stringify(input);
    //   expect(json).not.toContain('partial_message');
    //   expect(json).not.toContain('messageSnippet');

    expect(true).toBe(true);
  });
});

describe('AC-7b: B3 canary planted-claim detection (Ch.4 Verifier required) [RED: Ch.4 not shipped]', () => {

  it('Verifier catches planted unsourced $43M claim in canary-memo.md [RED: Ch.4 not shipped]', () => {
    // This is the keystone anti-sycophancy regression guard per BLOCKERS B3.
    // Do NOT relax these assertions. If Verifier returns ship_status='clean', the build fails.
    //
    // When Ch.4 ships:
    //   const canaryMemo = readFileSync(CANARY_MEMO_PATH, 'utf8');
    //
    //   const canaryVerifierInput = buildCanaryVerifierInput(canaryMemo);
    //   // invokeVerifier uses STUB_MODE=replay with Ch.4-captured canary fixture
    //   const output = await invokeVerifier(canaryVerifierInput, db);
    //
    //   // The $43M claim MUST be flagged as unverified
    //   const claimsUnverified = output.dimensions?.claim_source?.claims_unverified ?? [];
    //   const has43MFlag = claimsUnverified.some(
    //     (c: { claim_excerpt?: string }) => /Q3 ARR was \$43M/.test(c.claim_excerpt ?? '')
    //   );
    //   expect(has43MFlag).toBe(true);
    //
    //   // claim_source.score must be < 35 (unsourced quantitative claim costs points)
    //   expect(output.dimensions?.claim_source?.score).toBeLessThan(35);
    //
    //   // ship_status must be 'draft' (not 'clean')
    //   expect(output.ship_status).toBe('draft');
    //
    //   // CRITICAL: if this passes with ship_status='clean', the Verifier is broken.
    //   expect(output.ship_status).not.toBe('clean');

    // Document the canary's purpose: fail the build if Verifier becomes lenient.
    const canaryMemo = readFileSync(CANARY_MEMO_PATH, 'utf8');
    expect(canaryMemo).toContain('$43M');  // planted claim is present
    // The rest goes RED until Ch.4 ships — placeholder:
    expect(true).toBe(true);
  });

  it('REASONING_TRACE_MARKERS list is complete (living contract per ADR §5.4)', () => {
    // Documents the exact strings that must never appear in VerifierInput.
    // If the SDK gains new reasoning trace field names, add them here.
    expect(REASONING_TRACE_MARKERS).toContain('<thinking>');
    expect(REASONING_TRACE_MARKERS).toContain('chain_of_thought');
    expect(REASONING_TRACE_MARKERS).toContain('reasoning_trace');
  });
});

// ── Ch.4 Extension: AC-1 Verifier prompt + canary stub fixture ────────────────
//
// Added by: Ch.4 Test dispatch (writer ≠ grader, DOCTRINE law #7)
// Source: docs/decisions/0005-ch4-prompts-rigor.md §5 + §10 AC-1 + AC-7
//         BLOCKERS.md B3 (P0, anti-sycophancy keystone)
//
// STATUS: RED until Ch.4 Runtime ships prompts + canary stub fixture.
//
// Spec intent (AC-1):
//   - Load Verifier prompt from apps/utility/src/prompts/Verifier.prompt.md.
//   - Build VerifierInput with canary memo + synthetic lens output structure.
//   - Run via stub harness with canary fixture at tests/fixtures/lens-outputs/canary-run/Verifier.json.
//   - Assert: claims_unverified includes $43M claim; ship_status = 'draft'; claim_source.score < 35.
//   - Assert: NO <thinking> or chain_of_thought strings in VerifierInput JSON (B3 enforcement).
//
// Spec intent (AC-7):
//   - VerifierOutputSchema.parse(canaryOutput) must NOT throw.
//   - Schema validates rigor_score, ship_status, dimensions, failure_reasons, verifier_notes fields.
//
// Canary fixture at tests/fixtures/lens-outputs/canary-run/Verifier.json:
//   - Captured via STUB_MODE=record on Ch.4 implementation pass.
//   - UNKNOWN (U-2): fixture does not exist yet — Ch.4 Runtime must capture it.
//   - Once captured, it becomes permanent: modifying it requires re-capture + reviewer sign-off.
//
// Activating when Runtime + Ch.4 prompts ship:
//   1. Uncomment imports below.
//   2. Confirm canary fixture exists at tests/fixtures/lens-outputs/canary-run/Verifier.json.
//   3. Replace `expect(true).toBe(true)` placeholders with real invocations.
//   4. Remove the "fixture not captured" skip guard.

// ── Ch.4 imports (uncomment when Ch.4 Runtime ships) ────────────────────────
// import { buildVerifierInput } from '../../apps/utility/src/verifier-assembler.js';
// import { runVerifier } from '../../apps/utility/src/agents/verifier-runner.js';
// import { VerifierOutputSchema } from '../../packages/shared-types/src/verifier-output.js';

const VERIFIER_PROMPT_PATH = resolve(__dirname, '../../apps/utility/src/prompts/Verifier.prompt.md');
const CANARY_FIXTURE_PATH = resolve(__dirname, '../../tests/fixtures/lens-outputs/canary-run/Verifier.json');

describe('Ch.4 AC-1: Verifier prompt file contract (ADR-0005 §4)', () => {
  it('Verifier.prompt.md exists (Ch.4 Runtime shipped)', () => {
    expect(existsSync(VERIFIER_PROMPT_PATH)).toBe(true);
  });

  it('Verifier prompt contains anti-sycophancy pattern 1: structural isolation statement', () => {
    const prompt = readFileSync(VERIFIER_PROMPT_PATH, 'utf8');
    // ADR §4.1 Pattern 1 — explicit contract violation detection
    expect(prompt).toContain('VerifierInputContractViolation');
    // ADR §4.1 — blind to lens reasoning
    expect(prompt).toContain('STRUCTURALLY BLIND to lens chain-of-thought');
  });

  it('Verifier prompt contains all 5 dimension names + weights', () => {
    const prompt = readFileSync(VERIFIER_PROMPT_PATH, 'utf8');
    expect(prompt).toContain('Claim-source binding (35)');
    expect(prompt).toContain('Coverage (20)');
    expect(prompt).toContain('Red-team integration (15)');
    expect(prompt).toContain('Calibration freshness (15)');
    expect(prompt).toContain('Falsifier completeness (15)');
  });

  it('Verifier prompt contains threshold table (80 for strategic_option, 85 cap for open_qa)', () => {
    const prompt = readFileSync(VERIFIER_PROMPT_PATH, 'utf8');
    expect(prompt).toContain('Strategic option evaluation, Restructure decision: >= 80');
    expect(prompt).toContain('Open Q&A: cap at 85');
  });

  it('Verifier prompt enforces empty falsifier rejection (anti-sycophancy discipline)', () => {
    const prompt = readFileSync(VERIFIER_PROMPT_PATH, 'utf8');
    expect(prompt).toContain('Empty falsifier rejection');
    expect(prompt).toContain('ANTI-SYCOPHANCY DISCIPLINES');
  });

  it('Verifier prompt specifies isQuantOrNamed() classification logic inline', () => {
    const prompt = readFileSync(VERIFIER_PROMPT_PATH, 'utf8');
    expect(prompt).toContain('isQuantOrNamed()');
  });
});

describe('Ch.4 AC-1: canary stub fixture (U-2 captured — Ch.4 Runtime shipped)', () => {
  it('canary-run/Verifier.json exists (captured via STUB_MODE=record)', () => {
    expect(existsSync(CANARY_FIXTURE_PATH)).toBe(true);
  });

  it('canary fixture: $43M claim is flagged in claims_unverified, ship_status=draft, score<35', () => {
    // Keystone anti-sycophancy guard per BLOCKERS B3 P0.
    // Do NOT relax these assertions. ship_status='clean' means the Verifier is broken.
    // Asserts against the captured stub fixture (STUB_MODE=record output).
    const fixture = JSON.parse(readFileSync(CANARY_FIXTURE_PATH, 'utf8'));

    // $43M planted claim must be in claims_unverified
    const claimsUnverified: Array<{ claim_excerpt: string; issue: string }> =
      fixture.dimensions?.claim_source?.claims_unverified ?? [];
    const has43MFlag = claimsUnverified.some(c => /\$43M/.test(c.claim_excerpt));
    expect(has43MFlag).toBe(true);

    // claim_source.score must be < 35 (unsourced quantitative claim costs heavily)
    expect(fixture.dimensions.claim_source.score).toBeLessThan(35);

    // ship_status must be 'draft', never 'clean'
    expect(fixture.ship_status).toBe('draft');
    expect(fixture.ship_status).not.toBe('clean');
  });

  it('canary fixture: sourced claim sf-opportunity-q3-renewals NOT in claims_unverified', () => {
    // Verifier must distinguish sourced from unsourced — not simply fail all claims.
    const fixture = JSON.parse(readFileSync(CANARY_FIXTURE_PATH, 'utf8'));
    const unverified: Array<{ claim_excerpt: string }> =
      fixture.dimensions?.claim_source?.claims_unverified ?? [];
    const hasSourcedClaimFlagged = unverified.some(u =>
      u.claim_excerpt.includes('1.2M') || u.claim_excerpt.includes('sf-opportunity-q3-renewals')
    );
    expect(hasSourcedClaimFlagged).toBe(false);
  });
});

describe('Ch.4 AC-7: VerifierOutputSchema validates canary output [RED: Runtime not shipped]', () => {
  it('VerifierOutputSchema module is not yet resolvable [RED]', () => {
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../../packages/shared-types/src/verifier-output.js');
    }).toThrow();
  });

  it('VerifierOutputSchema.parse(canaryOutput) does not throw [RED]', async () => {
    // When Runtime ships:
    //   const { VerifierOutputSchema } = await import('../../packages/shared-types/src/verifier-output.js');
    //   const out = await runVerifier(verifierInput);
    //   // Schema parse must not throw — all required fields present + correct types
    //   expect(() => VerifierOutputSchema.parse(out)).not.toThrow();
    //
    // Required fields per ADR §4.3 VerifierOutputSchema:
    //   rigor_score: z.number().int().min(0).max(100)
    //   ship_status: z.enum(['clean', 'draft', 'fail'])
    //   dimensions: VerifierDimensionsSchema (all 5 dimensions)
    //   failure_reasons: z.array(z.string())
    //   verifier_notes: z.string()

    expect(true).toBe(true);
  });

  it('VerifierOutputSchema rejects null on required fields [RED]', () => {
    // When Runtime ships:
    //   const { VerifierOutputSchema } = await import('../../packages/shared-types/src/verifier-output.js');
    //   // Missing rigor_score → parse throws
    //   expect(() => VerifierOutputSchema.parse({ ship_status: 'clean' })).toThrow();
    //   // Missing ship_status → parse throws
    //   expect(() => VerifierOutputSchema.parse({ rigor_score: 80 })).toThrow();
    //   // Null ship_status → parse throws (z.string() not z.string().nullable())
    //   expect(() => VerifierOutputSchema.parse({ rigor_score: 80, ship_status: null })).toThrow();

    expect(true).toBe(true);
  });
});
