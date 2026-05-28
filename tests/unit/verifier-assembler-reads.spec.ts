/**
 * verifier-assembler reads — buildVerifierInput reads agent_invocations (P0 coverage gap).
 *
 * verifier-contract.spec.ts covers the FAIL-CLOSED (missing-field) paths. This file
 * covers the complementary happy-path READ: when agent_invocations rows are seeded with
 * the REAL production columns (agent_role + structured_output_json, per migration 001),
 * buildVerifierInput reads them back correctly. This locks the column-name contract on
 * the read side the way orchestrator-hooks-persistence.spec.ts locks it on the write side.
 *
 * Source under test: apps/utility/src/verifier-assembler.ts (buildVerifierInput).
 * Schema seeded via seedFromMigrations() — never hand-rolled.
 *
 * tool_calls is intentionally left EMPTY: the assembler maps call_id (TEXT) → toolCallId
 * typed as number, so seeding a tool_calls row would risk a parse failure unrelated to
 * what this test asserts (the agent_invocations read path).
 *
 * STATUS: GREEN.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { buildVerifierInput } from '../../apps/utility/src/verifier-assembler.js';
import { seedFromMigrations } from '../helpers/seedFromMigrations.js';

const LENS_ROLES = ['CEO', 'CFO', 'CRO', 'CMO', 'CPO', 'COS'] as const;

function seedRun(db: Database.Database, runId: string): void {
  db.prepare(
    `INSERT INTO runs (run_id, playbook, question, started_at, current_state)
     VALUES (?, 'quick_read', 'Should we expand to Europe?', ?, 'synthesizer')`,
  ).run(runId, Date.now());
}

// All seed helpers write the PRODUCTION columns (agent_role, structured_output_json).
function seedInvocation(db: Database.Database, runId: string, role: string, output: unknown): void {
  db.prepare(
    `INSERT INTO agent_invocations
       (invocation_id, run_id, agent_role, started_at, completed_at, structured_output_json, status)
     VALUES (?, ?, ?, ?, ?, ?, 'completed')`,
  ).run(`inv-${runId}-${role}`, runId, role, Date.now() - 5000, Date.now() - 1000, JSON.stringify(output));
}

function lensOutput(runId: string, role: string): Record<string, unknown> {
  return {
    role,
    runId,
    summary: `${role} summary`,
    positions: [{ positionId: `p-${role}`, claim: 'Claim', isQuantitative: false, citations: [], sourceText: 'analysis' }],
    citations: [{ id: `c-${role}`, text: 'Source', source: 'https://example.com' }],
    confidence: 0.8,
  };
}

function synthOutput(runId: string): Record<string, unknown> {
  return {
    role: 'Synthesizer',
    runId,
    memoMarkdown: '# Test memo\n\nSufficient content for the Verifier contract.'.padEnd(200, ' '),
    executiveSummary: 'Executive summary of the analysis.',
    keyDecisions: ['Expand to Europe'],
    citations: [{ id: 'c-synth-1', text: 'Q3 Report', source: 'https://example.com/report' }],
    positionMetadata: [
      { positionId: 'pm-1', role: 'CEO', claim: 'Expand', isQuantitative: false, citations: [], sourceText: 'analysis' },
    ],
  };
}

function redTeamOutput(runId: string): Record<string, unknown> {
  return {
    role: 'RedTeam',
    runId,
    challenges: [{ targetRole: 'CEO', claim: 'Risky', counterargument: 'Market volatility', severity: 'high' }],
    overallRisk: 'medium',
    citations: [],
  };
}

function steelmanOutput(runId: string): Record<string, unknown> {
  return {
    role: 'Steelman',
    runId,
    steelmen: [{ targetRole: 'CEO', bestCaseArgument: 'Strong upside', evidenceSupport: ['Market data'] }],
    citations: [],
  };
}

function makeSynthesizerState(runId: string): object {
  return {
    kind: 'synthesizer',
    runId,
    redTeam: { role: 'RedTeam', runId, challenges: [], overallRisk: 'low', citations: [] },
    steelman: { role: 'Steelman', runId, steelmen: [], citations: [] },
    lensOutputs: [],
  };
}

describe('verifier-assembler — buildVerifierInput reads agent_invocations (verifier-assembler.ts)', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = seedFromMigrations();
  });

  afterEach(() => {
    db.close();
  });

  it('reads all 6 lens outputs + synth/redteam/steelman from agent_invocations rows', () => {
    const runId = 'va-read-complete';
    seedRun(db, runId);
    for (const role of LENS_ROLES) seedInvocation(db, runId, role, lensOutput(runId, role));
    seedInvocation(db, runId, 'Synthesizer', synthOutput(runId));
    seedInvocation(db, runId, 'RedTeam', redTeamOutput(runId));
    seedInvocation(db, runId, 'Steelman', steelmanOutput(runId));

    const input = buildVerifierInput(runId, makeSynthesizerState(runId) as never, db);

    expect(input.runId).toBe(runId);
    // structured_output_json round-trips through the read: memo body came from the synth row.
    expect(input.memoMarkdown.startsWith('# Test memo')).toBe(true);
    expect(input.lensOutputs).toHaveLength(6);
    expect(new Set(input.lensOutputs.map((l) => l.role))).toEqual(new Set(LENS_ROLES));
    expect(input.redTeamOutput.role).toBe('RedTeam');
    expect(input.steelmanOutput.role).toBe('Steelman');
    expect(input.positionMetadata.length).toBeGreaterThan(0);
    // tool_calls left empty — audit trail is a valid empty list, not a missing field.
    expect(input.toolCallAuditTrail).toEqual([]);
    // runs row metadata also round-tripped.
    expect(input.runPlaybook).toBe('quick_read');
    expect(input.runQuestion).toBe('Should we expand to Europe?');
  });

  it('ignores non-completed invocations (only status=completed rows are read)', () => {
    const runId = 'va-read-status-filter';
    seedRun(db, runId);
    for (const role of LENS_ROLES) seedInvocation(db, runId, role, lensOutput(runId, role));
    seedInvocation(db, runId, 'Synthesizer', synthOutput(runId));
    seedInvocation(db, runId, 'RedTeam', redTeamOutput(runId));
    seedInvocation(db, runId, 'Steelman', steelmanOutput(runId));

    // An in-progress duplicate CEO row must NOT inflate the lens count.
    db.prepare(
      `INSERT INTO agent_invocations (invocation_id, run_id, agent_role, started_at, status)
       VALUES (?, ?, 'CEO', ?, 'in_progress')`,
    ).run(`inv-${runId}-CEO-dup`, runId, Date.now());

    const input = buildVerifierInput(runId, makeSynthesizerState(runId) as never, db);
    expect(input.lensOutputs).toHaveLength(6);
  });
});
