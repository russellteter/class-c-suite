/**
 * ADR-0001 §5 + §9 row 9 — Stub-model harness skeleton
 * Test owner: Test dispatch (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0001-ch0-foundations.md §5 + §9 row 9
 *
 * Key invariants per ADR §5:
 *   - STUB_MODE=replay: StubClaudeClient.invoke() returns canned fixture by stableHash(role, ctx)
 *   - STUB_MODE=record: invoke() throws "not wired in Ch.0"
 *   - STUB_MODE=live: invoke() throws "not wired in Ch.0"
 *   - stableHash returns identical output for identical inputs across runs (deterministic)
 *   - Fixtures live at tests/fixtures/stubs/<hash>.json
 *   - stubFromEnv() creates the right mode from STUB_MODE env var
 *
 * Tests will fail until Runtime lands packages/stub-harness/src/stub.ts.
 * That is expected per brief line 124.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { StubClaudeClient, stubFromEnv } from '@c-suite/stub-harness/stub';

// Fixture directory for test stubs (isolated from production fixtures)
const TEST_STUB_DIR = path.join(__dirname, '../fixtures/stubs');

// Minimal valid AgentDefinitionLike + ContextBundleLike (structural types per ADR §5)
const testDef = {
  role: 'CFO',
  systemPrompt: 'You are the CFO lens agent analyzing Class Technologies cash position.',
};

const testCtx = {
  question: 'What is our W30 cash lever stack?',
  playbookId: 'cash_lever_vs_trough',
  runId: 'run-test-001',
};

// Canned AgentOutputLike fixture for replay tests
const cannedOutput = {
  structuredOutput: {
    summary: 'W30 is addressable via BACA tranche + AR pull-forward.',
    confidence: 70,
  },
  tokensIn: 15000,
  tokensOut: 3500,
};

// ── Setup: write a replay fixture file for the test ─────────────────────────

let fixtureHash: string;
let fixtureFilePath: string;

/**
 * Compute the expected hash using the same algorithm as ADR §5:
 * SHA-256 over (role + JSON.stringify(context, sortedKeys)), truncated to 16 hex.
 * We do this here via Node crypto to know which filename to seed.
 */
async function computeExpectedHash(role: string, ctx: Record<string, unknown>): Promise<string> {
  const { createHash } = await import('crypto');
  const h = createHash('sha256');
  h.update(role);
  h.update(JSON.stringify(ctx, Object.keys(ctx).sort()));
  return h.digest('hex').slice(0, 16);
}

beforeAll(async () => {
  // Ensure test fixture dir exists
  fs.mkdirSync(TEST_STUB_DIR, { recursive: true });

  // Compute hash and seed canned fixture file
  fixtureHash = await computeExpectedHash(testDef.role, testCtx);
  fixtureFilePath = path.join(TEST_STUB_DIR, `${fixtureHash}.json`);
  fs.writeFileSync(fixtureFilePath, JSON.stringify(cannedOutput, null, 2));
});

afterAll(() => {
  // Clean up test fixture
  if (fixtureFilePath && fs.existsSync(fixtureFilePath)) {
    fs.unlinkSync(fixtureFilePath);
  }
});

// ── STUB_MODE=replay ─────────────────────────────────────────────────────────

describe('StubClaudeClient — STUB_MODE=replay', () => {
  it('invoke returns canned fixture matching stableHash(role, context)', async () => {
    const client = new StubClaudeClient('replay', TEST_STUB_DIR);
    const result = await client.invoke(testDef, testCtx);
    expect(result).toEqual(cannedOutput);
  });

  it('invoke returns structured output from the fixture', async () => {
    const client = new StubClaudeClient('replay', TEST_STUB_DIR);
    const result = await client.invoke(testDef, testCtx);
    expect(result.structuredOutput).toBeDefined();
    expect(result.tokensIn).toBeGreaterThan(0);
    expect(result.tokensOut).toBeGreaterThan(0);
  });

  it('throws when fixture file does not exist for the hash', async () => {
    const client = new StubClaudeClient('replay', TEST_STUB_DIR);
    const unknownDef = { role: 'CMO', systemPrompt: 'CMO lens' };
    const unknownCtx = { question: 'No fixture for this', runId: 'unknown' };
    await expect(client.invoke(unknownDef, unknownCtx)).rejects.toThrow();
  });
});

// ── stableHash determinism ───────────────────────────────────────────────────

describe('stableHash — determinism (ADR §5)', () => {
  it('returns identical hash for identical role + context across two calls', async () => {
    // We test this by calling invoke twice with same inputs and verifying same fixture is loaded
    const client = new StubClaudeClient('replay', TEST_STUB_DIR);
    const r1 = await client.invoke(testDef, testCtx);
    const r2 = await client.invoke(testDef, testCtx);
    expect(r1).toEqual(r2);
  });

  it('returns different hash for different role (different fixture path)', async () => {
    // Different role → different hash → missing fixture → throws
    const client = new StubClaudeClient('replay', TEST_STUB_DIR);
    const differentDef = { ...testDef, role: 'CRO' };
    await expect(client.invoke(differentDef, testCtx)).rejects.toThrow();
  });

  it('key order in context does not affect hash (sorted JSON.stringify)', async () => {
    // Reorder context keys — hash must be identical to the seeded fixture
    const client = new StubClaudeClient('replay', TEST_STUB_DIR);
    const reorderedCtx = {
      runId: testCtx.runId,
      question: testCtx.question,
      playbookId: testCtx.playbookId,
    };
    const result = await client.invoke(testDef, reorderedCtx);
    expect(result).toEqual(cannedOutput);
  });
});

// ── STUB_MODE=live ───────────────────────────────────────────────────────────

describe('StubClaudeClient — STUB_MODE=live', () => {
  it('throws "not wired in Ch.0" error', async () => {
    const client = new StubClaudeClient('live', TEST_STUB_DIR);
    await expect(client.invoke(testDef, testCtx)).rejects.toThrow(/Ch\.0/);
  });
});

// ── STUB_MODE=record ─────────────────────────────────────────────────────────

describe('StubClaudeClient — STUB_MODE=record', () => {
  it('throws "not wired in Ch.0" error', async () => {
    const client = new StubClaudeClient('record', TEST_STUB_DIR);
    await expect(client.invoke(testDef, testCtx)).rejects.toThrow(/Ch\.0/);
  });
});

// ── stubFromEnv factory ──────────────────────────────────────────────────────

describe('stubFromEnv — env-driven factory', () => {
  it('creates a replay client when STUB_MODE=replay', () => {
    process.env.STUB_MODE = 'replay';
    const client = stubFromEnv(TEST_STUB_DIR);
    expect(client).toBeInstanceOf(StubClaudeClient);
  });

  it('creates a live client when STUB_MODE=live', () => {
    process.env.STUB_MODE = 'live';
    const client = stubFromEnv(TEST_STUB_DIR);
    expect(client).toBeInstanceOf(StubClaudeClient);
  });

  it('throws for invalid STUB_MODE value', () => {
    process.env.STUB_MODE = 'streaming';  // not a valid StubMode
    expect(() => stubFromEnv(TEST_STUB_DIR)).toThrow(/Invalid STUB_MODE/);
  });

  afterAll(() => {
    // Restore env
    delete process.env.STUB_MODE;
  });
});
