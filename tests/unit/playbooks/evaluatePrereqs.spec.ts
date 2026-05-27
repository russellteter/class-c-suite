// tests/unit/playbooks/evaluatePrereqs.spec.ts
// Source: tasks/ch7-test-brief.md §1 + docs/decisions/0009-ch7-playbooks-home.md §3.6 + §15 AC-4
// Tests the evaluatePrereqs(playbookId, deps) → PrereqDecision helper.
// Phase R Decision 4 table is the canonical block/degrade matrix.
//
// NOTE: apps/utility/src/playbooks/lib/evaluatePrereqs.ts does not exist yet
// (Runtime sub-agent scope). All cases are it.todo until that file ships.
// DO NOT import the missing module — vitest load-time error would break the suite.

import { describe, it } from 'vitest';

describe('evaluatePrereqs — block/degrade/proceed matrix (ADR §3.6, Decision 4)', () => {

  // ── cash_lever ────────────────────────────────────────────────────────────
  describe('cash_lever', () => {
    it.todo('block when NetSuite cash data unreachable');
    it.todo('degrade when PowerBI unavailable (CRO lens degraded-flag)');
    it.todo('proceed when all deps available');
  });

  // ── stakeholder_1_1 ───────────────────────────────────────────────────────
  describe('stakeholder_1_1', () => {
    it.todo('proceed (no block) when stakeholder file missing — skeleton path taken');
    it.todo('degrade when stakeholder file stale >30d');
    it.todo('proceed when stakeholder file present and fresh');
  });

  // ── quick_read ────────────────────────────────────────────────────────────
  describe('quick_read', () => {
    it.todo('degrade (not block) when a lens source is missing — skip that lens');
    it.todo('degrade when MCP source is stale — flag, do not block');
    it.todo('proceed when all sources available');
  });

  // ── pre_mortem ────────────────────────────────────────────────────────────
  describe('pre_mortem', () => {
    it.todo('proceed when only proposedAction string provided (no external deps required)');
    it.todo('proceed with optional workstream + calibration when provided');
    it.todo('degrade gracefully when calibration ledger missing (no block)');
  });

  // ── gtm_realloc ───────────────────────────────────────────────────────────
  describe('gtm_realloc', () => {
    it.todo('block when Salesforce auth expired — re-consent prompt required');
    it.todo('degrade when Salesforce data stale >24h — flag, do not block');
    it.todo('proceed when Salesforce auth valid');
  });

  // ── strategic_option ──────────────────────────────────────────────────────
  describe('strategic_option', () => {
    it.todo('block when Salesforce + AWS + cash-data not all available');
    it.todo('block when any one of {Salesforce, AWS, cash-data} missing');
    it.todo('degrade when any source stale >7d — flag with banner, do not block');
    it.todo('proceed when all three spine sources available and fresh');
  });

  // ── board_narrative ───────────────────────────────────────────────────────
  describe('board_narrative', () => {
    it.todo('block when Salesforce unavailable');
    it.todo('block when NetSuite unavailable');
    it.todo('block when PowerBI unavailable');
    it.todo('block when calibration unavailable');
    it.todo('degrade when a source is stale — flag with severity banner, do not block');
    it.todo('proceed when all of {Salesforce, NetSuite, PowerBI, calibration} available');
  });

  // ── restructure_decision ──────────────────────────────────────────────────
  describe('restructure_decision', () => {
    it.todo('block when Salesforce + NetSuite + cash-model all unavailable');
    it.todo('block when cash-model missing (required spine)');
    it.todo('degrade when a source stale >7d — flag, do not block');
    it.todo('proceed when Salesforce + NetSuite + cash-model available');
  });

  // ── block-vs-degrade boundary explicit ───────────────────────────────────
  describe('strategic_option block-vs-degrade boundary', () => {
    it.todo('returns kind: block when Salesforce missing (required spine)');
    it.todo('returns kind: degrade (not block) when Salesforce present but stale >7d');
    it.todo('returned degrade.flags array contains the stale source name');
    it.todo('returned block.remediation is a non-empty string');
  });

});
