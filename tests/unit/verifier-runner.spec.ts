/**
 * tests/unit/verifier-runner.spec.ts
 * ADR-0005 §4 + §6 — Unit tests for runVerifier() (B35 fix).
 * Test owner: Ch.5 Test dispatch (writer ≠ grader, DOCTRINE law #7)
 *
 * Exercises runVerifier() against:
 *   1. Canary fixture  — ship_status=draft, rigor_score=52 (<70), $43M in claims_unverified
 *   2. Cash-lever fixture — ship_status=clean, rigor_score=83 (>=70)
 *   3. Malformed response — VerifierOutputContractViolation thrown
 *
 * Does NOT use StubClaudeClient (hash-path fixture lookup incompatible with
 * bare fixture files). Uses a direct FakeInvoker that returns fixture JSON.
 * This is the BY-HAND proof path: pnpm vitest run tests/unit/verifier-runner.spec.ts
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  runVerifier,
  VerifierOutputContractViolation,
  type VerifierInvoker,
} from '../../apps/utility/src/agents/verifier-runner.js';
import type { VerifierInput } from '@c-suite/shared-types/verifier-input';

// ── Fixture paths ─────────────────────────────────────────────────────────────

const CANARY_FIXTURE = resolve(
  __dirname,
  '../../tests/fixtures/lens-outputs/canary-run/Verifier.json',
);
const CASH_LEVER_FIXTURE = resolve(
  __dirname,
  '../../tests/fixtures/lens-outputs/cash-lever-run/Verifier.json',
);
const VERIFIER_PROMPT_PATH = resolve(
  __dirname,
  '../../apps/utility/src/prompts/Verifier.prompt.md',
);

// ── FakeInvoker: returns a pre-loaded JSON payload ────────────────────────────

function makeFakeInvoker(payload: unknown): VerifierInvoker {
  return {
    async invoke() {
      return payload;
    },
  };
}

// ── Minimal VerifierInput factory ─────────────────────────────────────────────

function makeMinimalVerifierInput(overrides: Partial<VerifierInput> = {}): VerifierInput {
  const baseLensOutput = (role: string) => ({
    role,
    runId: 'test-run',
    summary: `${role} stub summary`,
    positions: [],
    citations: [{ id: `${role}-cit-1`, text: 'stub', source: 'stub' }],
    confidence: 0.8,
  });

  return {
    runId: 'test-run',
    memoMarkdown: '# Test Memo\n\nContent here.',
    lensOutputs: [
      baseLensOutput('CEO'),
      baseLensOutput('CFO'),
      baseLensOutput('CRO'),
      baseLensOutput('CMO'),
      baseLensOutput('CPO'),
      baseLensOutput('COS'),
    ] as VerifierInput['lensOutputs'],
    toolCallAuditTrail: [],
    positionMetadata: [
      {
        positionId: 'pos-001',
        role: 'CFO' as const,
        claim: 'Cash is sufficient',
        isQuantitative: false,
        citations: [],
        sourceText: 'Cash position is strong.',
      },
    ],
    redTeamOutput: {
      role: 'RedTeam' as const,
      runId: 'test-run',
      challenges: [
        {
          targetRole: 'CFO' as const,
          claim: 'Cash is sufficient',
          counterargument: 'Covenant constraints may limit flexibility.',
          severity: 'medium' as const,
        },
      ],
      overallRisk: 'medium' as const,
      citations: [],
    },
    steelmanOutput: {
      role: 'Steelman' as const,
      runId: 'test-run',
      steelmen: [
        {
          targetRole: 'CFO' as const,
          bestCaseArgument: 'Deferred spend is the optimal lever.',
          evidenceSupport: ['AWS contract terms allow deferral.'],
        },
      ],
      citations: [],
    },
    runPlaybook: 'cash_lever',
    runQuestion: 'Should we shift W30 trough mitigation to deferred AWS spend?',
    assembledAt: 1716768000,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('runVerifier — canary fixture (ADR-0005 §4, B3 anti-sycophancy guard)', () => {
  it('returns rigor_score=52 from canary fixture (NOT hardcoded 85)', async () => {
    const fixture = JSON.parse(readFileSync(CANARY_FIXTURE, 'utf8'));
    const invoker = makeFakeInvoker(fixture);
    const input = makeMinimalVerifierInput({ runId: 'canary-run' });

    const output = await runVerifier(input, { invoker, promptPath: VERIFIER_PROMPT_PATH });

    // BY-HAND proof: the actual rigor_score from fixture — not the hardcoded 85
    expect(output.rigor_score).toBe(52);
    expect(output.rigor_score).not.toBe(85);
  });

  it('canary: ship_status is draft', async () => {
    const fixture = JSON.parse(readFileSync(CANARY_FIXTURE, 'utf8'));
    const output = await runVerifier(
      makeMinimalVerifierInput({ runId: 'canary-run' }),
      { invoker: makeFakeInvoker(fixture), promptPath: VERIFIER_PROMPT_PATH },
    );
    expect(output.ship_status).toBe('draft');
    expect(output.ship_status).not.toBe('clean');
  });

  it('canary: claims_unverified contains the $43M claim', async () => {
    const fixture = JSON.parse(readFileSync(CANARY_FIXTURE, 'utf8'));
    const output = await runVerifier(
      makeMinimalVerifierInput({ runId: 'canary-run' }),
      { invoker: makeFakeInvoker(fixture), promptPath: VERIFIER_PROMPT_PATH },
    );
    const unverified = output.dimensions.claim_source.claims_unverified;
    const has43M = unverified.some(c => /\$43M/.test(c.claim_excerpt));
    expect(has43M).toBe(true);
  });

  it('canary: claim_source.score < 35 (unsourced quantitative claim cost)', async () => {
    const fixture = JSON.parse(readFileSync(CANARY_FIXTURE, 'utf8'));
    const output = await runVerifier(
      makeMinimalVerifierInput({ runId: 'canary-run' }),
      { invoker: makeFakeInvoker(fixture), promptPath: VERIFIER_PROMPT_PATH },
    );
    expect(output.dimensions.claim_source.score).toBeLessThan(35);
  });
});

describe('runVerifier — cash-lever happy-path fixture', () => {
  it('returns rigor_score=83 (>= 70 cash_lever threshold)', async () => {
    const fixture = JSON.parse(readFileSync(CASH_LEVER_FIXTURE, 'utf8'));
    const output = await runVerifier(
      makeMinimalVerifierInput({ runId: 'cash-lever-run' }),
      { invoker: makeFakeInvoker(fixture), promptPath: VERIFIER_PROMPT_PATH },
    );

    // BY-HAND proof: actual fixture score — not literal 85
    expect(output.rigor_score).toBe(83);
    expect(output.rigor_score).not.toBe(85);
  });

  it('cash-lever: ship_status is clean', async () => {
    const fixture = JSON.parse(readFileSync(CASH_LEVER_FIXTURE, 'utf8'));
    const output = await runVerifier(
      makeMinimalVerifierInput({ runId: 'cash-lever-run' }),
      { invoker: makeFakeInvoker(fixture), promptPath: VERIFIER_PROMPT_PATH },
    );
    expect(output.ship_status).toBe('clean');
  });

  it('cash-lever: no claims_unverified (all claims sourced)', async () => {
    const fixture = JSON.parse(readFileSync(CASH_LEVER_FIXTURE, 'utf8'));
    const output = await runVerifier(
      makeMinimalVerifierInput({ runId: 'cash-lever-run' }),
      { invoker: makeFakeInvoker(fixture), promptPath: VERIFIER_PROMPT_PATH },
    );
    expect(output.dimensions.claim_source.claims_unverified).toHaveLength(0);
  });

  it('cash-lever: VerifierOutputSchema validates cleanly (no throw)', async () => {
    const fixture = JSON.parse(readFileSync(CASH_LEVER_FIXTURE, 'utf8'));
    // If Zod throws, runVerifier will re-throw VerifierOutputContractViolation.
    // No throw = schema valid.
    await expect(
      runVerifier(
        makeMinimalVerifierInput({ runId: 'cash-lever-run' }),
        { invoker: makeFakeInvoker(fixture), promptPath: VERIFIER_PROMPT_PATH },
      ),
    ).resolves.toBeDefined();
  });
});

describe('runVerifier — malformed response contract violation', () => {
  it('throws VerifierOutputContractViolation on missing required fields', async () => {
    const malformed = { ship_status: 'clean' }; // missing rigor_score, dimensions, etc.
    await expect(
      runVerifier(
        makeMinimalVerifierInput(),
        { invoker: makeFakeInvoker(malformed), promptPath: VERIFIER_PROMPT_PATH },
      ),
    ).rejects.toBeInstanceOf(VerifierOutputContractViolation);
  });

  it('VerifierOutputContractViolation carries zodError with field details', async () => {
    const malformed = { rigor_score: 'not-a-number', ship_status: 'clean' };
    try {
      await runVerifier(
        makeMinimalVerifierInput(),
        { invoker: makeFakeInvoker(malformed), promptPath: VERIFIER_PROMPT_PATH },
      );
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(VerifierOutputContractViolation);
      const violation = err as VerifierOutputContractViolation;
      expect(violation.zodError).toBeDefined();
      expect(violation.zodError.issues.length).toBeGreaterThan(0);
    }
  });

  it('null response throws VerifierOutputContractViolation', async () => {
    await expect(
      runVerifier(
        makeMinimalVerifierInput(),
        { invoker: makeFakeInvoker(null), promptPath: VERIFIER_PROMPT_PATH },
      ),
    ).rejects.toBeInstanceOf(VerifierOutputContractViolation);
  });
});
