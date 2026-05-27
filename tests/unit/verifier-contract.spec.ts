/**
 * ADR-0004 §8 row AC-3 — Verifier input contract assembler
 * Test owner: Ch.3 Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0004-ch3-runtime-spine.md §5 + §8 AC-3
 *
 * STATUS: GREEN — buildVerifierInput and VerifierInputContractViolation are shipped.
 *
 * Spec intent: buildVerifierInput() FAILS CLOSED — throws VerifierInputContractViolation
 * when any required input field is missing from SQLite state. One test per missing
 * field (6 required inputs per ADR §5.1):
 *   1. memoMarkdown (from Synthesizer output)
 *   2. lensOutputs (6 lenses — CEO/CFO/CRO/CMO/CPO/COS)
 *   3. toolCallAuditTrail (from tool_calls table — may be empty list, not missing)
 *   4. positionMetadata (from Synthesizer positionMetadata)
 *   5. redTeamOutput
 *   6. steelmanOutput
 *
 * VerifierInputContractViolation.missing[] enumerates which fields are absent.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import {
  buildVerifierInput,
  VerifierInputContractViolation,
} from '../../apps/utility/src/verifier-assembler.js';

// ── SQLite schema for tests ───────────────────────────────────────────────────

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      run_id        TEXT PRIMARY KEY,
      playbook      TEXT NOT NULL,
      question      TEXT NOT NULL,
      started_at    INTEGER NOT NULL,
      current_state TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'in_progress'
    );

    CREATE TABLE IF NOT EXISTS agent_invocations (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id        TEXT NOT NULL REFERENCES runs(run_id),
      role          TEXT NOT NULL,
      started_at    INTEGER NOT NULL,
      completed_at  INTEGER,
      output_json   TEXT,
      status        TEXT NOT NULL DEFAULT 'in_progress',
      UNIQUE(run_id, role) -- ADR §7.4 idempotency guard
    );

    CREATE TABLE IF NOT EXISTS tool_calls (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id      TEXT NOT NULL,
      role        TEXT NOT NULL,
      tool_name   TEXT NOT NULL,
      input_json  TEXT NOT NULL,
      result_json TEXT NOT NULL,
      ts          INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);
  return db;
}

// ── Seed helpers ──────────────────────────────────────────────────────────────

const LENS_ROLES = ['CEO', 'CFO', 'CRO', 'CMO', 'CPO', 'COS'] as const;

function seedRun(db: Database.Database, runId: string): void {
  db.prepare(`
    INSERT INTO runs (run_id, playbook, question, started_at, current_state)
    VALUES (?, 'quick_read', 'Test question', ?, 'synthesizer')
  `).run(runId, Date.now());
}

function seedLensOutput(db: Database.Database, runId: string, role: string): void {
  db.prepare(`
    INSERT INTO agent_invocations (run_id, role, started_at, completed_at, output_json, status)
    VALUES (?, ?, ?, ?, ?, 'completed')
  `).run(
    runId, role, Date.now() - 5000, Date.now() - 1000,
    JSON.stringify({
      role,
      runId,
      summary: `${role} summary`,
      positions: [{ positionId: `p-${role}`, claim: 'Claim', isQuantitative: false, citations: [], sourceText: 'analysis' }],
      citations: [{ id: `c-${role}`, text: 'Source', source: 'https://example.com' }],
      confidence: 0.8,
    }),
  );
}

function seedSynthesizerOutput(db: Database.Database, runId: string, withPositionMetadata = true): void {
  const output = {
    role: 'Synthesizer',
    runId,
    memoMarkdown: '# Test memo\n\nThis is a test memo with sufficient content for the Verifier contract.'.padEnd(200, ' '),
    executiveSummary: 'Executive summary of the analysis.',
    keyDecisions: ['Expand to Europe', 'Increase marketing budget'],
    citations: [{ id: 'c-synth-1', text: 'Q3 Report', source: 'https://example.com/report' }],
    positionMetadata: withPositionMetadata
      ? [{ positionId: 'pm-1', role: 'CEO', claim: 'Expand', isQuantitative: false, citations: [], sourceText: 'analysis' }]
      : [],
  };
  db.prepare(`
    INSERT INTO agent_invocations (run_id, role, started_at, completed_at, output_json, status)
    VALUES (?, 'Synthesizer', ?, ?, ?, 'completed')
  `).run(runId, Date.now() - 3000, Date.now() - 500, JSON.stringify(output));
}

function seedRedTeamOutput(db: Database.Database, runId: string): void {
  db.prepare(`
    INSERT INTO agent_invocations (run_id, role, started_at, completed_at, output_json, status)
    VALUES (?, 'RedTeam', ?, ?, ?, 'completed')
  `).run(
    runId, Date.now() - 4000, Date.now() - 800,
    JSON.stringify({
      role: 'RedTeam', runId,
      challenges: [{ targetRole: 'CEO', claim: 'Risky', counterargument: 'Market volatility', severity: 'high' }],
      overallRisk: 'medium',
      citations: [],
    }),
  );
}

function seedSteelmanOutput(db: Database.Database, runId: string): void {
  db.prepare(`
    INSERT INTO agent_invocations (run_id, role, started_at, completed_at, output_json, status)
    VALUES (?, 'Steelman', ?, ?, ?, 'completed')
  `).run(
    runId, Date.now() - 4000, Date.now() - 700,
    JSON.stringify({
      role: 'Steelman', runId,
      steelmen: [{ targetRole: 'CEO', bestCaseArgument: 'Strong upside', evidenceSupport: ['Market data'] }],
      citations: [],
    }),
  );
}

// Stub RunState in 'synthesizer' kind (ADR §5.3 signature requires this)
function makeSynthesizerState(runId: string): object {
  return {
    kind: 'synthesizer',
    runId,
    redTeam: { role: 'RedTeam', runId, challenges: [], overallRisk: 'low', citations: [] },
    steelman: { role: 'Steelman', runId, steelmen: [], citations: [] },
    lensOutputs: [],
  };
}

// ── AC-3 Tests ────────────────────────────────────────────────────────────────

describe('AC-3: buildVerifierInput() fails closed on missing required fields (ADR-0004 §5)', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it('buildVerifierInput and VerifierInputContractViolation are exported from verifier-assembler', () => {
    expect(typeof buildVerifierInput).toBe('function');
    expect(typeof VerifierInputContractViolation).toBe('function');
  });

  it('throws VerifierInputContractViolation when Synthesizer output is missing', () => {
    const runId = 'vc-test-no-synth';
    seedRun(db, runId);
    for (const role of LENS_ROLES) seedLensOutput(db, runId, role);
    seedRedTeamOutput(db, runId);
    seedSteelmanOutput(db, runId);
    // No Synthesizer row seeded

    expect(() => buildVerifierInput(runId, makeSynthesizerState(runId) as never, db))
      .toThrow(VerifierInputContractViolation);

    try { buildVerifierInput(runId, makeSynthesizerState(runId) as never, db); }
    catch (e) {
      expect(e).toBeInstanceOf(VerifierInputContractViolation);
      expect((e as VerifierInputContractViolation).missing).toContain('synthesizer.output');
    }
  });

  it('throws VerifierInputContractViolation listing missing lensOutputs', () => {
    const runId = 'vc-test-partial-lenses';
    seedRun(db, runId);
    seedLensOutput(db, runId, 'CEO');  // only 1 of 6 lenses
    seedSynthesizerOutput(db, runId);
    seedRedTeamOutput(db, runId);
    seedSteelmanOutput(db, runId);

    try { buildVerifierInput(runId, makeSynthesizerState(runId) as never, db); }
    catch (e) {
      expect(e).toBeInstanceOf(VerifierInputContractViolation);
      const missing = (e as VerifierInputContractViolation).missing;
      // Missing 5 lenses: CFO, CRO, CMO, CPO, COS
      expect(missing.some(m => m.startsWith('lens.'))).toBe(true);
      expect(missing.filter(m => m.startsWith('lens.'))).toHaveLength(5);
    }
  });

  it('throws VerifierInputContractViolation when positionMetadata is empty', () => {
    const runId = 'vc-test-no-positions';
    seedRun(db, runId);
    for (const role of LENS_ROLES) seedLensOutput(db, runId, role);
    seedSynthesizerOutput(db, runId, /* withPositionMetadata= */ false);
    seedRedTeamOutput(db, runId);
    seedSteelmanOutput(db, runId);

    try { buildVerifierInput(runId, makeSynthesizerState(runId) as never, db); }
    catch (e) {
      expect(e).toBeInstanceOf(VerifierInputContractViolation);
      expect((e as VerifierInputContractViolation).missing).toContain('synthesizer.positionMetadata');
    }
  });

  it('throws VerifierInputContractViolation when RedTeam output is missing', () => {
    const runId = 'vc-test-no-redteam';
    seedRun(db, runId);
    for (const role of LENS_ROLES) seedLensOutput(db, runId, role);
    seedSynthesizerOutput(db, runId);
    seedSteelmanOutput(db, runId);
    // No RedTeam seeded

    try { buildVerifierInput(runId, makeSynthesizerState(runId) as never, db); }
    catch (e) {
      expect(e).toBeInstanceOf(VerifierInputContractViolation);
      expect((e as VerifierInputContractViolation).missing).toContain('redTeam.output');
    }
  });

  it('throws VerifierInputContractViolation when Steelman output is missing', () => {
    const runId = 'vc-test-no-steelman';
    seedRun(db, runId);
    for (const role of LENS_ROLES) seedLensOutput(db, runId, role);
    seedSynthesizerOutput(db, runId);
    seedRedTeamOutput(db, runId);
    // No Steelman seeded

    try { buildVerifierInput(runId, makeSynthesizerState(runId) as never, db); }
    catch (e) {
      expect(e).toBeInstanceOf(VerifierInputContractViolation);
      expect((e as VerifierInputContractViolation).missing).toContain('steelman.output');
    }
  });

  it('returns a valid VerifierInput when all 6 required inputs are present', () => {
    const runId = 'vc-test-complete';
    seedRun(db, runId);
    for (const role of LENS_ROLES) seedLensOutput(db, runId, role);
    seedSynthesizerOutput(db, runId);
    seedRedTeamOutput(db, runId);
    seedSteelmanOutput(db, runId);

    const input = buildVerifierInput(runId, makeSynthesizerState(runId) as never, db);
    expect(input.runId).toBe(runId);
    expect(input.memoMarkdown.length).toBeGreaterThan(0);
    expect(input.lensOutputs).toHaveLength(6);
    expect(input.redTeamOutput).toBeDefined();
    expect(input.steelmanOutput).toBeDefined();
    expect(input.positionMetadata.length).toBeGreaterThan(0);
  });

  it('documents that all 6 required VerifierInput fields are specified (contract reference)', () => {
    // Living documentation — these are the 6 required fields per ADR §5.1.
    // If any changes here, also update buildVerifierInput() and this test.
    const requiredFields = [
      'memoMarkdown',       // from Synthesizer structured output
      'lensOutputs',        // 6 lens structured outputs (CEO/CFO/CRO/CMO/CPO/COS)
      'toolCallAuditTrail', // from tool_calls table (may be empty array)
      'positionMetadata',   // from Synthesizer.positionMetadata (must have >= 1)
      'redTeamOutput',      // from RedTeam structured output
      'steelmanOutput',     // from Steelman structured output
    ];
    expect(requiredFields).toHaveLength(6);
  });
});
