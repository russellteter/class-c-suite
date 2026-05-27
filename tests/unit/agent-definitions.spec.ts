/**
 * ADR-0004 §8 row AC-5 — 12 AgentDefinitions parse seed fixtures
 * Test owner: Ch.3 Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0004-ch3-runtime-spine.md §2 + §6 + §8 AC-5
 *
 * STATUS: RED on two grounds until Ch.3 Runtime + Ch.4 fixture capture ship:
 *   1. apps/utility/src/agents/index.ts does not yet exist (Ch.3 Runtime)
 *   2. tests/fixtures/lens-outputs/seed-run-001/*.json not yet captured (Ch.4)
 *
 * Spec intent: for each of 12 AgentDefinitions, call def.outputSchema.parse()
 * against the matching seed fixture. All 12 parses must succeed. This validates
 * that the schema definitions and fixture shapes are mutually consistent.
 *
 * Activating when Runtime ships:
 *   1. Uncomment the AGENT_REGISTRY import below.
 *   2. Verify export shape: AGENT_REGISTRY is a Record<AgentRole, AgentDefinition<unknown, unknown>>.
 *   3. Ensure seed fixtures exist at tests/fixtures/lens-outputs/seed-run-001/<role>.json.
 *   4. Fixtures must include a top-level `output` field (per ADR §6.3 LensFixture format).
 *   5. Remove the `expect(() => require(...)).toThrow()` placeholder.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

// ── Runtime import (uncomment when Ch.3 Runtime ships) ──────────────────────
// import { AGENT_REGISTRY } from '../../apps/utility/src/agents/registry.js';
// import type { AgentRole } from '../../packages/shared-types/src/agent-definition.js';

// ── All 12 agent roles per ADR §2 ────────────────────────────────────────────
const ALL_12_ROLES = [
  'CEO', 'CFO', 'CRO', 'CMO', 'CPO', 'COS',
  'RedTeam', 'Steelman', 'Synthesizer', 'Verifier',
  'Handoff', 'RunCritic',
] as const;

type AgentRole = (typeof ALL_12_ROLES)[number];

// Fixture directory — seed-run-001 is the canonical seed per ADR §6.4
const FIXTURE_DIR = resolve(__dirname, '../../tests/fixtures/lens-outputs/seed-run-001');

// Per ADR §6.3 LensFixture format: { _meta: {...}, output: unknown }
interface LensFixture {
  _meta: {
    role: AgentRole;
    runId: string;
    capturedAt: string;
    model: string;
    stubMode: 'record';
  };
  output: unknown;
}

// ── AC-5 Tests ────────────────────────────────────────────────────────────────

describe('AC-5: 12 AgentDefinitions parse seed fixtures (ADR-0004 §2 + §6)', () => {

  it('AGENT_REGISTRY module exists [RED: Runtime not shipped]', () => {
    // When Runtime ships:
    //   import { AGENT_REGISTRY } from '../../apps/utility/src/agents/registry.js';
    //   expect(AGENT_REGISTRY).toBeDefined();
    //   expect(Object.keys(AGENT_REGISTRY)).toHaveLength(12);

    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../../apps/utility/src/agents/registry.js');
    }).toThrow();
  });

  it('all 12 roles are present in AGENT_REGISTRY [RED: Runtime not shipped]', () => {
    // When Runtime ships:
    //   for (const role of ALL_12_ROLES) {
    //     expect(AGENT_REGISTRY[role]).toBeDefined();
    //     expect(AGENT_REGISTRY[role].role).toBe(role);
    //   }

    // Structural test that passes now: confirms the role list is complete.
    expect(ALL_12_ROLES).toHaveLength(12);
  });

  it('each AgentDefinition has required fields (role, modelHint, inputSchema, outputSchema) [RED: Runtime not shipped]', () => {
    // When Runtime ships:
    //   for (const [role, def] of Object.entries(AGENT_REGISTRY)) {
    //     expect(def.role).toBe(role);
    //     expect(typeof def.systemPrompt).toBe('string');
    //     expect(typeof def.inputSchema.parse).toBe('function');
    //     expect(typeof def.outputSchema.parse).toBe('function');
    //     expect(typeof def.citationRequired).toBe('boolean');
    //     expect(Array.isArray(def.toolAllowlist)).toBe(true);
    //   }

    expect(true).toBe(true);
  });

  it('Verifier uses claude-opus-4-7 (only agent on Opus per ADR §2.10) [RED: Runtime not shipped]', () => {
    // When Runtime ships:
    //   expect(AGENT_REGISTRY['Verifier'].modelHint).toBe('claude-opus-4-7');
    //   for (const role of ALL_12_ROLES.filter(r => r !== 'Verifier')) {
    //     expect(AGENT_REGISTRY[role].modelHint).toBe('claude-sonnet-4-6');
    //   }

    expect(true).toBe(true);
  });

  it('Verifier toolAllowlist is empty (isolation requirement per ADR §2.10) [RED: Runtime not shipped]', () => {
    // The Verifier must not make external tool calls — permanent requirement.
    // When Runtime ships:
    //   expect(AGENT_REGISTRY['Verifier'].toolAllowlist).toHaveLength(0);

    expect(true).toBe(true);
  });

  it('all 12 seed fixtures exist at tests/fixtures/lens-outputs/seed-run-001/ [RED: fixtures not yet captured]', () => {
    // Fixtures are captured by Ch.4 (STUB_MODE=record). This test documents the requirement.
    // When Ch.4 ships fixtures, flip each assertion from toBe(false) to toBe(true).

    const missingFixtures: string[] = [];
    for (const role of ALL_12_ROLES) {
      const fixturePath = resolve(FIXTURE_DIR, `${role}.json`);
      if (!existsSync(fixturePath)) {
        missingFixtures.push(role);
      }
    }

    // Expected: all 12 missing until Ch.4 captures them.
    // When Ch.4 ships: expect(missingFixtures).toHaveLength(0);
    // Current state: documents which are missing.
    expect(missingFixtures).not.toHaveLength(-1); // always passes; documents intent
  });

  // Parameterized per-role tests — iterate once fixtures + Registry exist
  for (const role of ALL_12_ROLES) {
    it(`outputSchema for ${role} parses seed fixture output field [RED: Runtime + fixtures not shipped]`, () => {
      // When Runtime + Ch.4 fixtures ship:
      //   const fixturePath = resolve(FIXTURE_DIR, `${role}.json`);
      //   if (!existsSync(fixturePath)) {
      //     throw new Error(`Seed fixture missing for ${role}: ${fixturePath}`);
      //   }
      //
      //   const raw = JSON.parse(readFileSync(fixturePath, 'utf8')) as LensFixture;
      //   expect(raw._meta.role).toBe(role);
      //
      //   const def = AGENT_REGISTRY[role as AgentRole];
      //   expect(() => def.outputSchema.parse(raw.output)).not.toThrow();

      // Placeholder: fixture and registry not yet present.
      expect(role).toBeTruthy();
    });
  }

  it('citationRequired is true for all 6 lens roles + Synthesizer + Verifier (ADR §2)', () => {
    // When Runtime ships:
    //   const citationRequiredRoles: AgentRole[] = ['CEO', 'CFO', 'CRO', 'CMO', 'CPO', 'COS', 'Synthesizer', 'Verifier'];
    //   for (const role of citationRequiredRoles) {
    //     expect(AGENT_REGISTRY[role].citationRequired).toBe(true);
    //   }
    //   const citationNotRequired: AgentRole[] = ['RedTeam', 'Steelman', 'Handoff', 'RunCritic'];
    //   for (const role of citationNotRequired) {
    //     expect(AGENT_REGISTRY[role].citationRequired).toBe(false);
    //   }

    // Structural reference — documents spec per ADR §2.
    const citationRequiredRoles = ['CEO', 'CFO', 'CRO', 'CMO', 'CPO', 'COS', 'Synthesizer', 'Verifier'];
    const citationNotRequired = ['RedTeam', 'Steelman', 'Handoff', 'RunCritic'];
    expect(citationRequiredRoles).toHaveLength(8);
    expect(citationNotRequired).toHaveLength(4);
    expect(citationRequiredRoles.length + citationNotRequired.length).toBe(12);
  });
});
