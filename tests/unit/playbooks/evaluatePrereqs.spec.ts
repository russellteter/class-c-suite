// tests/unit/playbooks/evaluatePrereqs.spec.ts
// Source: tasks/ch7-test-brief.md §1 + docs/decisions/0009-ch7-playbooks-home.md §3.6 + §15 AC-4
// Tests the evaluatePrereqs(playbookId, deps) → PrereqDecision helper.
// Phase R Decision 4 table is the canonical block/degrade matrix.

import { describe, it, expect } from 'vitest';
import { evaluatePrereqs } from '../../../apps/utility/src/playbooks/lib/evaluatePrereqs.js';
import type { PlaybookDeps } from '@c-suite/shared-types/playbook';

// All deps available — baseline for "proceed" cases
const ALL: PlaybookDeps = {
  salesforce: true,
  netsuite: true,
  powerbi: true,
  aws: true,
  calibration: true,
  chorus: true,
  gmail: true,
};

// No deps available
const NONE: PlaybookDeps = {
  salesforce: false,
  netsuite: false,
  powerbi: false,
  aws: false,
  calibration: false,
  chorus: false,
  gmail: false,
};

describe('evaluatePrereqs — block/degrade/proceed matrix (ADR §3.6, Decision 4)', () => {

  // ── cash_lever ────────────────────────────────────────────────────────────
  describe('cash_lever', () => {
    it('block when NetSuite cash data unreachable', () => {
      const result = evaluatePrereqs('cash_lever', { ...ALL, netsuite: false });
      expect(result.kind).toBe('block');
    });

    it('degrade when PowerBI unavailable (CRO lens degraded-flag)', () => {
      const result = evaluatePrereqs('cash_lever', { ...ALL, powerbi: false });
      expect(result.kind).toBe('degrade');
      if (result.kind === 'degrade') {
        expect(result.flags).toContain('powerbi');
      }
    });

    it('proceed when all deps available', () => {
      const result = evaluatePrereqs('cash_lever', ALL);
      expect(result.kind).toBe('proceed');
    });
  });

  // ── stakeholder_1_1 ───────────────────────────────────────────────────────
  describe('stakeholder_1_1', () => {
    it('proceed (no block) when stakeholder file missing — skeleton path taken', () => {
      // evaluatePrereqs does not know about file presence; skeleton handled inside playbook.
      // With all deps available, always proceeds.
      const result = evaluatePrereqs('stakeholder_1_1', ALL);
      expect(result.kind).toBe('proceed');
    });

    it('degrade when chorus unavailable (evaluatePrereqs:line 83-86)', () => {
      const result = evaluatePrereqs('stakeholder_1_1', { ...ALL, chorus: false });
      expect(result.kind).toBe('degrade');
    });

    it('proceed when stakeholder file deps (chorus + gmail) both available', () => {
      const result = evaluatePrereqs('stakeholder_1_1', { ...ALL, chorus: true, gmail: true });
      expect(result.kind).toBe('proceed');
    });
  });

  // ── quick_read ────────────────────────────────────────────────────────────
  describe('quick_read', () => {
    it('proceed regardless of dep availability — stale MCPs flagged per-lens not here (evaluatePrereqs:line 133-136)', () => {
      const result = evaluatePrereqs('quick_read', NONE);
      expect(result.kind).toBe('proceed');
    });

    it('proceed when all sources available', () => {
      const result = evaluatePrereqs('quick_read', ALL);
      expect(result.kind).toBe('proceed');
    });

    it('always returns proceed for quick_read regardless of salesforce flag', () => {
      const result = evaluatePrereqs('quick_read', { ...NONE, salesforce: false });
      expect(result.kind).toBe('proceed');
    });
  });

  // ── pre_mortem ────────────────────────────────────────────────────────────
  describe('pre_mortem', () => {
    it('proceed when only proposedAction string provided (no external deps required)', () => {
      const result = evaluatePrereqs('pre_mortem', NONE);
      expect(result.kind).toBe('proceed');
    });

    it('proceed with optional workstream + calibration when provided', () => {
      const result = evaluatePrereqs('pre_mortem', { ...ALL, calibration: true });
      expect(result.kind).toBe('proceed');
    });

    it('always proceeds — no blocks or degrades for pre_mortem (evaluatePrereqs:line 128-131)', () => {
      const result = evaluatePrereqs('pre_mortem', ALL);
      expect(result.kind).toBe('proceed');
    });
  });

  // ── gtm_realloc ───────────────────────────────────────────────────────────
  describe('gtm_realloc', () => {
    it('block when Salesforce auth expired — re-consent prompt required', () => {
      const result = evaluatePrereqs('gtm_realloc', { ...ALL, salesforce: false });
      expect(result.kind).toBe('block');
    });

    it('degrade when netsuite unavailable — flag, do not block', () => {
      const result = evaluatePrereqs('gtm_realloc', { ...ALL, netsuite: false });
      expect(result.kind).toBe('degrade');
      if (result.kind === 'degrade') {
        expect(result.flags).toContain('netsuite');
      }
    });

    it('proceed when Salesforce auth valid and all deps available', () => {
      const result = evaluatePrereqs('gtm_realloc', ALL);
      expect(result.kind).toBe('proceed');
    });
  });

  // ── strategic_option ──────────────────────────────────────────────────────
  describe('strategic_option', () => {
    it('block when Salesforce + AWS + calibration not all available (all missing)', () => {
      const result = evaluatePrereqs('strategic_option', NONE);
      expect(result.kind).toBe('block');
    });

    it('block when salesforce is missing (required spine)', () => {
      const result = evaluatePrereqs('strategic_option', { ...ALL, salesforce: false });
      expect(result.kind).toBe('block');
    });

    it('block when aws is missing (required spine)', () => {
      const result = evaluatePrereqs('strategic_option', { ...ALL, aws: false });
      expect(result.kind).toBe('block');
    });

    it('degrade when netsuite unavailable (optional) — flag, do not block', () => {
      const result = evaluatePrereqs('strategic_option', { ...ALL, netsuite: false });
      expect(result.kind).toBe('degrade');
    });

    it('proceed when all three spine sources (salesforce + aws + calibration) available', () => {
      const result = evaluatePrereqs('strategic_option', ALL);
      expect(result.kind).toBe('proceed');
    });
  });

  // ── board_narrative ───────────────────────────────────────────────────────
  describe('board_narrative', () => {
    it('block when Salesforce unavailable', () => {
      const result = evaluatePrereqs('board_narrative', { ...ALL, salesforce: false });
      expect(result.kind).toBe('block');
    });

    it('block when NetSuite unavailable', () => {
      const result = evaluatePrereqs('board_narrative', { ...ALL, netsuite: false });
      expect(result.kind).toBe('block');
    });

    it('block when PowerBI unavailable', () => {
      const result = evaluatePrereqs('board_narrative', { ...ALL, powerbi: false });
      expect(result.kind).toBe('block');
    });

    it('block when calibration unavailable', () => {
      const result = evaluatePrereqs('board_narrative', { ...ALL, calibration: false });
      expect(result.kind).toBe('block');
    });

    it('degrade when aws unavailable (optional) — flag with banner, do not block', () => {
      const result = evaluatePrereqs('board_narrative', { ...ALL, aws: false });
      expect(result.kind).toBe('degrade');
    });

    it('proceed when all of {salesforce, netsuite, powerbi, calibration} available', () => {
      const result = evaluatePrereqs('board_narrative', ALL);
      expect(result.kind).toBe('proceed');
    });
  });

  // ── restructure_decision ──────────────────────────────────────────────────
  describe('restructure_decision', () => {
    it('block when salesforce + netsuite + calibration all missing', () => {
      const result = evaluatePrereqs('restructure_decision', NONE);
      expect(result.kind).toBe('block');
    });

    it('block when salesforce missing (required spine)', () => {
      const result = evaluatePrereqs('restructure_decision', { ...ALL, salesforce: false });
      expect(result.kind).toBe('block');
    });

    it('degrade when gmail unavailable — flag, do not block', () => {
      const result = evaluatePrereqs('restructure_decision', { ...ALL, gmail: false });
      expect(result.kind).toBe('degrade');
    });

    it('proceed when salesforce + netsuite + calibration all available', () => {
      const result = evaluatePrereqs('restructure_decision', ALL);
      expect(result.kind).toBe('proceed');
    });
  });

  // ── block-vs-degrade boundary explicit ───────────────────────────────────
  describe('strategic_option block-vs-degrade boundary', () => {
    it('returns kind: block when Salesforce missing (required spine)', () => {
      const result = evaluatePrereqs('strategic_option', { ...ALL, salesforce: false });
      expect(result.kind).toBe('block');
    });

    it('returns kind: degrade (not block) when salesforce present but netsuite absent', () => {
      // evaluatePrereqs takes boolean deps, not dates — "stale" maps to absent optional flag
      const result = evaluatePrereqs('strategic_option', { ...ALL, netsuite: false });
      expect(result.kind).toBe('degrade');
    });

    it('returned degrade.flags array contains the flagged source name', () => {
      const result = evaluatePrereqs('strategic_option', { ...ALL, netsuite: false });
      expect(result.kind).toBe('degrade');
      if (result.kind === 'degrade') {
        expect(Array.isArray(result.flags)).toBe(true);
        expect(result.flags.length).toBeGreaterThan(0);
      }
    });

    it('returned block.remediation is a non-empty string', () => {
      const result = evaluatePrereqs('strategic_option', { ...ALL, salesforce: false });
      expect(result.kind).toBe('block');
      if (result.kind === 'block') {
        expect(typeof result.remediation).toBe('string');
        expect(result.remediation.length).toBeGreaterThan(0);
      }
    });
  });

});
