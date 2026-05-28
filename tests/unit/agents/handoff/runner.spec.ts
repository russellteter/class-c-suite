/**
 * Ch.9 — generateHandoffBrief runner specs.
 * Source: docs/decisions/0011-ch9-cowork-handoff.md §4 + AC-1 + AC-12 (B3)
 *
 * B3 invariant (AC-12): the prompt context sent to the model must NOT contain
 * lens outputs, red-team, steelman, reasoning traces, or verifier scores.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StubClaudeClient } from '../../../../packages/stub-harness/src/stub.js';
import type { HandoffGeneratorInput } from '../../../../packages/shared-types/src/handoff.js';
import { HandoffFrontmatter } from '../../../../packages/shared-types/src/handoff.js';

// --- Fixtures ---

function makeInput(overrides: Partial<HandoffGeneratorInput['origin']> = {}): HandoffGeneratorInput {
  return {
    origin: {
      type: 'decision',
      id: 'DEC-007',
      path: 'decisions/DEC-007.md',
      title: 'Q3 Turnaround: Invest in Enterprise',
      bodyMarkdown: '## Body\n- [ ] Board deck for Q3 turnaround\n- [ ] Financial model for FY27\n',
      frontmatter: { id: 'DEC-007', status: 'proposed', decision_maker: 'Russell Teter' },
      ...overrides,
    },
    runContext: {
      runId: 'run-test-001',
      playbookId: 'cash_lever',
      stakeholdersOfInterest: ['Chasen Michael', 'Board'],
      workstreamsOfInterest: ['WS-01', 'WS-04'],
      memoMarkdown: 'Rationale: enterprise segment drives 60% ARR upside.',
    },
  };
}

function makeMockClient(bodyMarkdown: string): StubClaudeClient {
  const client = new StubClaudeClient('replay', 'tests/fixtures/stubs');
  vi.spyOn(client, 'invoke').mockResolvedValue({
    structuredOutput: { bodyMarkdown },
    tokensIn: 100,
    tokensOut: 200,
  });
  return client;
}

// Dynamically import to allow mocking fs (prompt loading)
async function importRunner() {
  return await import('../../../../apps/utility/src/agents/handoff/runner.js');
}

describe('generateHandoffBrief', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a HandoffBrief with valid frontmatter shape', async () => {
    const body = '## Decision being executed\nInvest in enterprise.\n\n## Rationale chain\nEnterprise is 60% upside.\n\n## Specific deliverables Cowork should produce\n- [ ] Board deck for Q3\n- [ ] Financial model\n\n## Stakeholder context\nRussell Teter.\n\n## Workstream context\nWS-01.\n\n## Constraints + risk flags\nNone.\n\n## Acceptance criteria\nDeck delivered.\n\n## Owner + timeline\nRussell, Q3 2026.';
    const client = makeMockClient(body);
    const { generateHandoffBrief } = await importRunner();
    const brief = await generateHandoffBrief(makeInput(), client);

    expect(brief.frontmatter).toBeDefined();
    expect(brief.filename).toMatch(/^\d{4}-\d{2}-\d{2}-.+\.md$/);
    expect(brief.bodyMarkdown).toBe(body);
    expect(brief.fullPath).toContain('handoffs');
  });

  it('frontmatter validates against HandoffFrontmatter Zod schema', async () => {
    const body = '## Decision being executed\nContent.\n\n## Rationale chain\nRationale.\n\n## Specific deliverables Cowork should produce\n- [ ] Doc\n\n## Stakeholder context\n-\n\n## Workstream context\n-\n\n## Constraints + risk flags\n-\n\n## Acceptance criteria\n-\n\n## Owner + timeline\n-';
    const client = makeMockClient(body);
    const { generateHandoffBrief } = await importRunner();
    const brief = await generateHandoffBrief(makeInput(), client);

    const parseResult = HandoffFrontmatter.safeParse(brief.frontmatter);
    expect(parseResult.success).toBe(true);
  });

  it('frontmatter.status is "drafted"', async () => {
    const client = makeMockClient('## Decision being executed\n-\n\n## Rationale chain\n-\n\n## Specific deliverables Cowork should produce\n-\n\n## Stakeholder context\n-\n\n## Workstream context\n-\n\n## Constraints + risk flags\n-\n\n## Acceptance criteria\n-\n\n## Owner + timeline\n-');
    const { generateHandoffBrief } = await importRunner();
    const brief = await generateHandoffBrief(makeInput(), client);
    expect(brief.frontmatter.status).toBe('drafted');
  });

  it('frontmatter.origin_type matches input', async () => {
    const client = makeMockClient('## Decision being executed\n-\n\n## Rationale chain\n-\n\n## Specific deliverables Cowork should produce\n-\n\n## Stakeholder context\n-\n\n## Workstream context\n-\n\n## Constraints + risk flags\n-\n\n## Acceptance criteria\n-\n\n## Owner + timeline\n-');
    const { generateHandoffBrief } = await importRunner();

    const brief = await generateHandoffBrief(makeInput({ type: 'position', id: 'POS-014', path: 'positions/POS-014.md' }), client);
    expect(brief.frontmatter.origin_type).toBe('position');
  });

  it('filename is <YYYY-MM-DD>-<slug>.md', async () => {
    const client = makeMockClient('## Decision being executed\n-\n\n## Rationale chain\n-\n\n## Specific deliverables Cowork should produce\n-\n\n## Stakeholder context\n-\n\n## Workstream context\n-\n\n## Constraints + risk flags\n-\n\n## Acceptance criteria\n-\n\n## Owner + timeline\n-');
    const { generateHandoffBrief } = await importRunner();
    const brief = await generateHandoffBrief(makeInput(), client);
    expect(brief.filename).toMatch(/^\d{4}-\d{2}-\d{2}-.+\.md$/);
    expect(brief.filename.endsWith('.md')).toBe(true);
  });

  it('picks brand skills from deliverables in body', async () => {
    const body = '## Decision being executed\n-\n\n## Rationale chain\n-\n\n## Specific deliverables Cowork should produce\n- [ ] Board deck for Q3\n- [ ] Financial model\n\n## Stakeholder context\n-\n\n## Workstream context\n-\n\n## Constraints + risk flags\n-\n\n## Acceptance criteria\n-\n\n## Owner + timeline\n-';
    const client = makeMockClient(body);
    const { generateHandoffBrief } = await importRunner();
    const brief = await generateHandoffBrief(makeInput(), client);
    expect(brief.frontmatter.cowork_brand_skills).toContain('class-brand-presentations');
    expect(brief.frontmatter.cowork_brand_skills).toContain('class-brand-excel');
  });

  // AC-12 — B3 invariant: no lens traces in prompt context
  it('B3 invariant: prompt context sent to model contains no lens/reasoning keys', async () => {
    const client = makeMockClient('## Decision being executed\n-\n\n## Rationale chain\n-\n\n## Specific deliverables Cowork should produce\n-\n\n## Stakeholder context\n-\n\n## Workstream context\n-\n\n## Constraints + risk flags\n-\n\n## Acceptance criteria\n-\n\n## Owner + timeline\n-');
    const invokeSpy = vi.spyOn(client, 'invoke').mockResolvedValue({
      structuredOutput: { bodyMarkdown: '## Decision being executed\n-\n\n## Rationale chain\n-\n\n## Specific deliverables Cowork should produce\n-\n\n## Stakeholder context\n-\n\n## Workstream context\n-\n\n## Constraints + risk flags\n-\n\n## Acceptance criteria\n-\n\n## Owner + timeline\n-' },
      tokensIn: 10,
      tokensOut: 20,
    });

    const { generateHandoffBrief } = await importRunner();
    await generateHandoffBrief(makeInput(), client);

    expect(invokeSpy).toHaveBeenCalledOnce();
    const [, contextArg] = invokeSpy.mock.calls[0];

    // B3: none of these keys must be present at the top level
    const forbidden = ['lensOutputs', 'redTeam', 'steelman', 'reasoning', 'verifierOutput', 'verifierScore'];
    for (const key of forbidden) {
      expect(contextArg).not.toHaveProperty(key);
    }
  });

  it('B3 invariant: no lens reasoning in any nested key at depth 1', async () => {
    const client = makeMockClient('## Decision being executed\n-\n\n## Rationale chain\n-\n\n## Specific deliverables Cowork should produce\n-\n\n## Stakeholder context\n-\n\n## Workstream context\n-\n\n## Constraints + risk flags\n-\n\n## Acceptance criteria\n-\n\n## Owner + timeline\n-');
    const invokeSpy = vi.spyOn(client, 'invoke').mockResolvedValue({
      structuredOutput: { bodyMarkdown: '-' },
      tokensIn: 10,
      tokensOut: 20,
    });

    const { generateHandoffBrief } = await importRunner();
    await generateHandoffBrief(makeInput(), client);

    const [, contextArg] = invokeSpy.mock.calls[0];
    const contextStr = JSON.stringify(contextArg);

    // B3: no lens-specific strings should appear in serialized context
    expect(contextStr).not.toMatch(/lensOutput/);
    expect(contextStr).not.toMatch(/redTeam/);
    expect(contextStr).not.toMatch(/steelman/);
    expect(contextStr).not.toMatch(/verifierScore/);
  });
});
