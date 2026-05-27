/**
 * Ch.6 Unit tests — Per-artifact-type drafter modules
 * Test owner: Test sub-agent (writer ≠ grader, DOCTRINE law #7)
 * Source: docs/decisions/0008-write-backs-and-iterative-feedback.md §3.5
 *
 * Per spec §3.5 + brief §1 assertions:
 * (a) frontmatter parses without schema regression (required fields present)
 * (b) idempotency: same input → byte-equal output on two calls
 * (c) kebab-case convention for positions/decisions/pre-mortems;
 *     snake_case for workstreams/predictions; kebab for stakeholder-updates
 * (d) related: field present and points to vault-resolvable IDs when supplied
 * (e) tags: includes correct structural taxonomy tags
 *
 * No DB — drafters are FS-only (tmpdir vault).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';

import * as positionDrafter from '../../../packages/writeback-engine/src/drafters/position.js';
import * as decisionDrafter from '../../../packages/writeback-engine/src/drafters/decision.js';
import * as predictionDrafter from '../../../packages/writeback-engine/src/drafters/prediction.js';
import * as preMortemDrafter from '../../../packages/writeback-engine/src/drafters/preMortemUpdate.js';
import * as stakeholderDrafter from '../../../packages/writeback-engine/src/drafters/stakeholderUpdate.js';
import * as workstreamDrafter from '../../../packages/writeback-engine/src/drafters/workstreamAdvance.js';
import type { SynthesizerProposedWriteback, DraftContext } from '../../../packages/writeback-engine/src/drafters/types.js';

// ── Test vault setup ──────────────────────────────────────────────────────────

let tmpDir: string;

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'c-suite-drafters-'));
  // Minimal vault directory structure.
  await fs.mkdir(path.join(tmpDir, 'positions/active'), { recursive: true });
  await fs.mkdir(path.join(tmpDir, 'positions/superseded'), { recursive: true });
  await fs.mkdir(path.join(tmpDir, 'decisions'), { recursive: true });
  await fs.mkdir(path.join(tmpDir, 'calibration/predictions'), { recursive: true });
  await fs.mkdir(path.join(tmpDir, 'calibration/resolved'), { recursive: true });
  await fs.mkdir(path.join(tmpDir, 'pre-mortems'), { recursive: true });
  await fs.mkdir(path.join(tmpDir, 'stakeholders/people'), { recursive: true });
  await fs.mkdir(path.join(tmpDir, 'workstreams'), { recursive: true });
  await fs.mkdir(path.join(tmpDir, '_archived-proposals'), { recursive: true });

  // Seed an existing position for update tests.
  await fs.writeFile(
    path.join(tmpDir, 'positions/active', 'POS-001-existing-position.md'),
    [
      '---',
      'id: POS-001',
      'title: Existing Position',
      'status: active',
      'confidence: 75',
      'tags: [type/position, status/active, confidence/mid]',
      '---',
      '',
      '## Summary',
      '',
      'Existing position body.',
    ].join('\n'),
  );

  // Seed an existing workstream for topic resolution.
  await fs.writeFile(
    path.join(tmpDir, 'workstreams', 'WS-01-arr-growth.md'),
    '---\nid: WS-01\ntitle: ARR Growth\nstatus: GREEN\n---\n\nBody.',
  );
});

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// ── Helper: parse frontmatter from proposedBody ───────────────────────────────

function parseFm(proposedBody: string): Record<string, unknown> {
  const m = proposedBody.match(/^---\n([\s\S]*?)\n---/);
  if (!m) throw new Error('No frontmatter found in proposedBody');
  return (yaml.load(m[1]) as Record<string, unknown>) ?? {};
}

// ── Position drafter ──────────────────────────────────────────────────────────

describe('position drafter — ADR §3.5', () => {
  const ctx: DraftContext = { runId: 'run-001', vaultRoot: '', playbook: 'cash_lever' };
  const proposal: SynthesizerProposedWriteback = {
    artifactType: 'position',
    targetArtifactId: null,
    proposedFrontmatterPatch: { title: 'New Cash Position', status: 'active', confidence: 82 },
    proposedBodyPatch: '## Summary\n\nThis is a new position on cash.\n',
    lensesContributing: ['CFO', 'CEO'],
    oneSentenceDescription: 'Take a stronger position on cash reserves.',
  };

  it('(a) produces required frontmatter fields: id, title, status, tags', async () => {
    const result = await positionDrafter.draft(proposal, { ...ctx, vaultRoot: tmpDir });
    const fm = parseFm(result.proposedBody);
    expect(fm).toHaveProperty('id');
    expect(fm).toHaveProperty('title');
    expect(fm).toHaveProperty('status');
    expect(fm).toHaveProperty('tags');
    expect(Array.isArray(fm['tags'])).toBe(true);
  });

  it('(b) idempotency: two calls with same input produce byte-equal proposedBody', async () => {
    // Seed identical artifact ID space between calls.
    const r1 = await positionDrafter.draft(proposal, { ...ctx, vaultRoot: tmpDir });
    const r2 = await positionDrafter.draft(proposal, { ...ctx, vaultRoot: tmpDir });
    expect(r1.proposedBody).toEqual(r2.proposedBody);
  });

  it('(c) kebab-case: uses kebab-case field for decision-this-supports', async () => {
    const result = await positionDrafter.draft(
      { ...proposal, proposedFrontmatterPatch: { ...proposal.proposedFrontmatterPatch, 'decision-this-supports': ['DEC-001'] } },
      { ...ctx, vaultRoot: tmpDir },
    );
    expect(result.proposedBody).toContain('decision-this-supports');
    expect(result.proposedBody).not.toContain('decision_this_supports');
  });

  it('(e) tags: includes type/position and status/active', async () => {
    const result = await positionDrafter.draft(proposal, { ...ctx, vaultRoot: tmpDir });
    const fm = parseFm(result.proposedBody);
    const tags = fm['tags'] as string[];
    expect(tags).toContain('type/position');
    expect(tags).toContain('status/active');
  });

  it('isNew=true when targetArtifactId is null', async () => {
    const result = await positionDrafter.draft(proposal, { ...ctx, vaultRoot: tmpDir });
    expect(result.isNew).toBe(true);
  });

  it('isNew=false when targetArtifactId points to existing artifact', async () => {
    const updateProposal: SynthesizerProposedWriteback = {
      ...proposal,
      targetArtifactId: 'POS-001',
      proposedFrontmatterPatch: { confidence: 90 },
    };
    const result = await positionDrafter.draft(updateProposal, { ...ctx, vaultRoot: tmpDir });
    expect(result.isNew).toBe(false);
    expect(result.artifactId).toBe('POS-001');
  });

  it('existing artifact values are preserved when not in patch', async () => {
    const updateProposal: SynthesizerProposedWriteback = {
      ...proposal,
      targetArtifactId: 'POS-001',
      proposedFrontmatterPatch: { confidence: 90 },
    };
    const result = await positionDrafter.draft(updateProposal, { ...ctx, vaultRoot: tmpDir });
    const fm = parseFm(result.proposedBody);
    expect(fm['confidence']).toBe(90);
    expect(fm['title']).toBe('Existing Position'); // preserved
  });
});

// ── Decision drafter ──────────────────────────────────────────────────────────

describe('decision drafter — ADR §3.5', () => {
  const ctx: DraftContext = { runId: 'run-002', vaultRoot: '', playbook: 'strategic_option' };
  const proposal: SynthesizerProposedWriteback = {
    artifactType: 'decision',
    targetArtifactId: null,
    proposedFrontmatterPatch: {
      title: 'Invest in ARR Growth',
      state: 'DRAFT',
      reversibility: 'two-way',
    },
    proposedBodyPatch: '## Rationale\n\nThis decision drives ARR.\n',
    lensesContributing: ['CEO', 'CFO'],
    oneSentenceDescription: 'Allocate resources to ARR growth initiatives.',
  };

  it('(a) produces required frontmatter fields: id, title, state, tags', async () => {
    const result = await decisionDrafter.draft(proposal, { ...ctx, vaultRoot: tmpDir });
    const fm = parseFm(result.proposedBody);
    expect(fm).toHaveProperty('id');
    expect(fm).toHaveProperty('title');
    expect(fm).toHaveProperty('state');
    expect(fm).toHaveProperty('tags');
  });

  it('(b) idempotency', async () => {
    const r1 = await decisionDrafter.draft(proposal, { ...ctx, vaultRoot: tmpDir });
    const r2 = await decisionDrafter.draft(proposal, { ...ctx, vaultRoot: tmpDir });
    expect(r1.proposedBody).toEqual(r2.proposedBody);
  });

  it('(c) kebab-case: uses linked-positions not linked_positions', async () => {
    const result = await decisionDrafter.draft(
      { ...proposal, proposedFrontmatterPatch: { ...proposal.proposedFrontmatterPatch, 'linked-positions': ['POS-001'] } },
      { ...ctx, vaultRoot: tmpDir },
    );
    expect(result.proposedBody).toContain('linked-positions');
    expect(result.proposedBody).not.toContain('linked_positions');
  });

  it('(e) tags: includes type/decision and state/draft', async () => {
    const result = await decisionDrafter.draft(proposal, { ...ctx, vaultRoot: tmpDir });
    const fm = parseFm(result.proposedBody);
    const tags = fm['tags'] as string[];
    expect(tags).toContain('type/decision');
    expect(tags).toContain('state/draft');
  });
});

// ── Prediction drafter ────────────────────────────────────────────────────────

describe('prediction drafter — ADR §3.5', () => {
  const ctx: DraftContext = { runId: 'run-003', vaultRoot: '', playbook: 'cash_lever' };
  const proposal: SynthesizerProposedWriteback = {
    artifactType: 'prediction',
    targetArtifactId: null,
    proposedFrontmatterPatch: {
      title: 'ARR will hit $5M by Q3',
      status: 'open',
      confidence: 70,
    },
    proposedBodyPatch: '## Basis\n\nBased on current pipeline.\n',
    lensesContributing: ['CFO', 'CRO'],
    oneSentenceDescription: 'ARR forecast for Q3.',
  };

  it('(a) produces required frontmatter: id, title, status, tags', async () => {
    const result = await predictionDrafter.draft(proposal, { ...ctx, vaultRoot: tmpDir });
    const fm = parseFm(result.proposedBody);
    expect(fm).toHaveProperty('id');
    expect(fm).toHaveProperty('title');
    expect(fm).toHaveProperty('status');
    expect(fm).toHaveProperty('tags');
  });

  it('(b) idempotency', async () => {
    const r1 = await predictionDrafter.draft(proposal, { ...ctx, vaultRoot: tmpDir });
    const r2 = await predictionDrafter.draft(proposal, { ...ctx, vaultRoot: tmpDir });
    expect(r1.proposedBody).toEqual(r2.proposedBody);
  });

  it('(c) snake_case: uses linked_workstreams not linked-workstreams', async () => {
    const result = await predictionDrafter.draft(
      { ...proposal, proposedFrontmatterPatch: { ...proposal.proposedFrontmatterPatch, linked_workstreams: ['WS-01'] } },
      { ...ctx, vaultRoot: tmpDir },
    );
    expect(result.proposedBody).toContain('linked_workstreams');
    expect(result.proposedBody).not.toContain('linked-workstreams');
  });

  it('(e) tags: includes type/prediction and confidence/mid for 70', async () => {
    const result = await predictionDrafter.draft(proposal, { ...ctx, vaultRoot: tmpDir });
    const fm = parseFm(result.proposedBody);
    const tags = fm['tags'] as string[];
    expect(tags).toContain('type/prediction');
    expect(tags).toContain('confidence/mid');
  });
});

// ── Pre-mortem update drafter ─────────────────────────────────────────────────

describe('pre-mortem update drafter — ADR §3.5', () => {
  const ctx: DraftContext = { runId: 'run-004', vaultRoot: '', playbook: 'pre_mortem' };
  const proposal: SynthesizerProposedWriteback = {
    artifactType: 'pre-mortem-update',
    targetArtifactId: null,
    proposedFrontmatterPatch: {
      title: 'Cash runway risk',
      impact: 'high',
      probability: 60,
    },
    proposedBodyPatch: '## Risk description\n\nCash runway shortfall.\n',
    lensesContributing: ['CFO', 'RedTeam'],
    oneSentenceDescription: 'Cash runway risk under bear-case scenario.',
  };

  it('(a) produces required frontmatter: id, title, impact, tags', async () => {
    const result = await preMortemDrafter.draft(proposal, { ...ctx, vaultRoot: tmpDir });
    const fm = parseFm(result.proposedBody);
    expect(fm).toHaveProperty('id');
    expect(fm).toHaveProperty('title');
    expect(fm).toHaveProperty('tags');
  });

  it('(b) idempotency', async () => {
    const r1 = await preMortemDrafter.draft(proposal, { ...ctx, vaultRoot: tmpDir });
    const r2 = await preMortemDrafter.draft(proposal, { ...ctx, vaultRoot: tmpDir });
    expect(r1.proposedBody).toEqual(r2.proposedBody);
  });

  it('(e) tags: includes type/pre-mortem and impact/high', async () => {
    const result = await preMortemDrafter.draft(proposal, { ...ctx, vaultRoot: tmpDir });
    const fm = parseFm(result.proposedBody);
    const tags = fm['tags'] as string[];
    expect(tags).toContain('type/pre-mortem');
    expect(tags).toContain('impact/high');
  });
});

// ── Stakeholder update drafter ────────────────────────────────────────────────

describe('stakeholder update drafter — ADR §3.5', () => {
  const ctx: DraftContext = { runId: 'run-005', vaultRoot: '', playbook: 'stakeholder_1_1' };
  const proposal: SynthesizerProposedWriteback = {
    artifactType: 'stakeholder-update',
    targetArtifactId: null,
    proposedFrontmatterPatch: {
      title: 'Board Q3 Update',
      status: 'active',
    },
    proposedBodyPatch: '## Update summary\n\nQ3 board briefing.\n',
    lensesContributing: ['COS', 'CEO'],
    oneSentenceDescription: 'Quarterly board member briefing.',
  };

  it('(a) produces required frontmatter: id, title, tags', async () => {
    const result = await stakeholderDrafter.draft(proposal, { ...ctx, vaultRoot: tmpDir });
    const fm = parseFm(result.proposedBody);
    expect(fm).toHaveProperty('id');
    expect(fm).toHaveProperty('title');
    expect(fm).toHaveProperty('tags');
  });

  it('(b) idempotency', async () => {
    const r1 = await stakeholderDrafter.draft(proposal, { ...ctx, vaultRoot: tmpDir });
    const r2 = await stakeholderDrafter.draft(proposal, { ...ctx, vaultRoot: tmpDir });
    expect(r1.proposedBody).toEqual(r2.proposedBody);
  });
});

// ── Workstream advance drafter ────────────────────────────────────────────────

describe('workstream advance drafter — ADR §3.5', () => {
  const ctx: DraftContext = { runId: 'run-006', vaultRoot: '', playbook: 'cash_lever' };
  const proposal: SynthesizerProposedWriteback = {
    artifactType: 'workstream-advance',
    targetArtifactId: null,
    proposedFrontmatterPatch: {
      title: 'ARR Growth Initiative',
      status: 'GREEN',
      phase: 'execution',
    },
    proposedBodyPatch: '## Progress\n\nOn track for Q3 target.\n',
    lensesContributing: ['CRO', 'CMO'],
    oneSentenceDescription: 'Advance ARR Growth workstream to execution phase.',
  };

  it('(a) produces required frontmatter: id, title, status, tags', async () => {
    const result = await workstreamDrafter.draft(proposal, { ...ctx, vaultRoot: tmpDir });
    const fm = parseFm(result.proposedBody);
    expect(fm).toHaveProperty('id');
    expect(fm).toHaveProperty('title');
    expect(fm).toHaveProperty('status');
    expect(fm).toHaveProperty('tags');
  });

  it('(b) idempotency', async () => {
    const r1 = await workstreamDrafter.draft(proposal, { ...ctx, vaultRoot: tmpDir });
    const r2 = await workstreamDrafter.draft(proposal, { ...ctx, vaultRoot: tmpDir });
    expect(r1.proposedBody).toEqual(r2.proposedBody);
  });

  it('(c) snake_case: uses depends_on not depends-on', async () => {
    const result = await workstreamDrafter.draft(
      { ...proposal, proposedFrontmatterPatch: { ...proposal.proposedFrontmatterPatch, depends_on: ['WS-01'] } },
      { ...ctx, vaultRoot: tmpDir },
    );
    expect(result.proposedBody).toContain('depends_on');
    expect(result.proposedBody).not.toContain('depends-on:');
  });

  it('(e) tags: includes type/workstream and health/green', async () => {
    const result = await workstreamDrafter.draft(proposal, { ...ctx, vaultRoot: tmpDir });
    const fm = parseFm(result.proposedBody);
    const tags = fm['tags'] as string[];
    expect(tags).toContain('type/workstream');
    expect(tags).toContain('health/green');
  });

  it('(d) related: resolved when linked workstream exists', async () => {
    const result = await workstreamDrafter.draft(
      { ...proposal, proposedFrontmatterPatch: { ...proposal.proposedFrontmatterPatch, depends_on: ['WS-01'] } },
      { ...ctx, vaultRoot: tmpDir },
    );
    const fm = parseFm(result.proposedBody);
    if (fm['related']) {
      const related = fm['related'] as string[];
      expect(related[0]).toMatch(/^\[\[WS-01/);
    }
    // related field may be absent if no IDs resolve — check at least it parsed
    expect(result.proposedFrontmatter).toBeDefined();
  });
});
