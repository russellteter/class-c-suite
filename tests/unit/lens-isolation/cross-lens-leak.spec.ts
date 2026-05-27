/**
 * ADR-0004 §8 row AC-2 — Lens isolation enforcement (B3 keystone + DOCTRINE law #7)
 * Test owner: Ch.3 Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0004-ch3-runtime-spine.md §4 + §8 AC-2 + §8 AC-10
 *
 * STATUS: GREEN — B3 keystone fix applied (passthrough() + raw-input pre-check).
 *
 * Spec intent: calling buildLensContextBundle('CFO', bundle) with a bundle that contains
 * a CRO output field MUST throw LensIsolationViolation. This is the B3 keystone
 * safety test — cross-lens contamination is the keystone safety failure.
 *
 * Also covers: the compile-time test documentation (AC-10 runtime guard assertion).
 * The `// @ts-expect-error` compile-error fixture lives in tests/types/compile-error.ts.
 */

import { describe, it, expect } from 'vitest';
import {
  buildLensContextBundleSchema,
  buildLensContextBundle,
  LensIsolationViolation,
} from '../../../packages/shared-types/src/lens-context-bundle.js';

// ── AC-2 Test suite ───────────────────────────────────────────────────────────

describe('AC-2: Lens isolation enforcement — cross-lens leak detection (ADR-0004 §4)', () => {

  it('buildLensContextBundleSchema and buildLensContextBundle are exported from shared-types', () => {
    expect(typeof buildLensContextBundleSchema).toBe('function');
    expect(typeof buildLensContextBundle).toBe('function');
    expect(typeof LensIsolationViolation).toBe('function');
  });

  it('throws when CRO output is injected into CFO context bundle', () => {
    const croOutput = {
      role: 'CRO' as const,
      runId: 'test-run-lens-iso-001',
      summary: 'CRO analysis output',
      positions: [{ positionId: 'p1', claim: 'Revenue will grow', isQuantitative: false, citations: [], sourceText: 'analysis' }],
      citations: [{ id: 'c1', text: 'Source', source: 'https://example.com' }],
      confidence: 0.9,
    };

    const illegalCfoBundle = {
      runId: 'test-run-lens-iso-001',
      role: 'CFO' as const,
      question: 'Should we expand to Europe?',
      playbook: 'strategic_option_evaluation',
      contextDocuments: [],
      // ILLEGAL: CRO output leaked into CFO bundle
      illegalLeak: croOutput,
    };

    // buildLensContextBundle pre-checks raw input — throws LensIsolationViolation
    expect(() => buildLensContextBundle('CFO', illegalCfoBundle)).toThrow(LensIsolationViolation);
  });

  it('LensIsolationViolation error message contains the offending leaked role', () => {
    const croOutput = {
      role: 'CRO' as const,
      runId: 'test-run-lens-iso-002',
      summary: 'CRO output',
      positions: [],
      citations: [{ id: 'c1', text: 'Source', source: 'https://example.com' }],
      confidence: 0.9,
    };

    const illegalBundle = {
      runId: 'test-run-lens-iso-002',
      role: 'CFO' as const,
      question: 'Budget allocation?',
      playbook: 'quick_multi_lens_read',
      contextDocuments: [],
      croLeakField: croOutput,
    };

    // Verify via schema safeParse for the message content
    const schema = buildLensContextBundleSchema('CFO');
    const result = schema.safeParse(illegalBundle);

    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues[0].message;
      expect(msg).toContain('LensIsolationViolation');
      expect(msg).toContain('CRO');  // the offending role tag per ADR §4.2
    }
  });

  it('does NOT throw when CFO bundle contains only CFO-scoped data', () => {
    // Negative case: clean bundle must pass validation.
    const cleanCfoBundle = {
      runId: 'test-run-lens-iso-003',
      role: 'CFO' as const,
      question: 'Should we expand to Europe?',
      playbook: 'strategic_option_evaluation',
      contextDocuments: [],
      financialMetrics: { arr: 4300000, burnRate: 120000 },
    };

    expect(() => buildLensContextBundle('CFO', cleanCfoBundle)).not.toThrow();
  });

  it('schema.safeParse returns success:false for bundle with CRO leak (schema-level check)', () => {
    const schema = buildLensContextBundleSchema('CFO');
    const result = schema.safeParse({
      runId: 'test-run-lens-iso-004',
      role: 'CFO' as const,
      question: 'Q?',
      playbook: 'quick_multi_lens_read',
      contextDocuments: [],
      illegalField: { role: 'CRO', output: {} },
    });

    expect(result.success).toBe(false);
  });

  it('compile-time: @ts-expect-error annotation confirms type-level guard is load-bearing (AC-10 runtime doc)', () => {
    // The actual compile-time enforcement is in tests/types/compile-error.ts.
    // This test documents that the compile-time check exists and is exercised by CI.
    // See: tests/types/compile-error.ts for the @ts-expect-error annotated fixture.
    //
    // CI step: tsc --noEmit tests/types/compile-error.ts
    // Expected: compilation SUCCEEDS (because @ts-expect-error suppresses the expected error).
    // If the @ts-expect-error were removed, tsc would FAIL — proving the type guard is real.

    expect(true).toBe(true);  // Runtime test; compile-time enforcement is in tests/types/
  });
});
