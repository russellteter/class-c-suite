/**
 * Ch.9 — HandoffFrontmatter Zod schema validation specs.
 * Source: docs/decisions/0011-ch9-cowork-handoff.md §3.1 + AC-1
 */
import { describe, it, expect } from 'vitest';
import {
  HandoffFrontmatter,
  HandoffStatusSchema,
  HandoffOriginTypeSchema,
  CoworkBrandSkillIdSchema,
} from '../../../../packages/shared-types/src/handoff.js';

// --- Helpers ---

function baseHandoff(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: 'handoff',
    id: 'HANDOFF-2026-05-27-q3-turnaround',
    decision_id: 'DEC-007',
    origin_type: 'decision',
    origin_path: 'decisions/DEC-007.md',
    created: '2026-05-27',
    created_by_run_id: 'run-abc123',
    status: 'drafted',
    cowork_brand_skills: [],
    executed_by: null,
    ...overrides,
  };
}

// --- HandoffFrontmatter schema ---

describe('HandoffFrontmatter', () => {
  it('validates a minimal drafted decision handoff', () => {
    const result = HandoffFrontmatter.safeParse(baseHandoff());
    expect(result.success).toBe(true);
  });

  it('validates origin_type: memo', () => {
    const result = HandoffFrontmatter.safeParse(baseHandoff({
      decision_id: undefined,
      memo_id: 'MEM-weekly-board-update',
      origin_type: 'memo',
      origin_path: 'memos/weekly-board-update.md',
    }));
    expect(result.success).toBe(true);
  });

  it('validates origin_type: position', () => {
    const result = HandoffFrontmatter.safeParse(baseHandoff({
      decision_id: undefined,
      position_id: 'POS-014',
      origin_type: 'position',
      origin_path: 'positions/POS-014.md',
    }));
    expect(result.success).toBe(true);
  });

  it('validates origin_type: pre_mortem', () => {
    const result = HandoffFrontmatter.safeParse(baseHandoff({
      decision_id: undefined,
      pre_mortem_id: 'PM-001',
      origin_type: 'pre_mortem',
      origin_path: 'pre-mortems/PM-001.md',
    }));
    expect(result.success).toBe(true);
  });

  it('rejects invalid origin_type', () => {
    const result = HandoffFrontmatter.safeParse(baseHandoff({ origin_type: 'lens_output' }));
    expect(result.success).toBe(false);
  });

  it('validates status: sent', () => {
    const result = HandoffFrontmatter.safeParse(baseHandoff({ status: 'sent' }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe('sent');
  });

  it('validates status: executed', () => {
    const result = HandoffFrontmatter.safeParse(baseHandoff({ status: 'executed' }));
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = HandoffFrontmatter.safeParse(baseHandoff({ status: 'pending' }));
    expect(result.success).toBe(false);
  });

  it('accepts cowork_brand_skills with valid IDs', () => {
    const skills = ['class-brand-document', 'class-brand-presentations', 'class-brand-voice'];
    const result = HandoffFrontmatter.safeParse(baseHandoff({ cowork_brand_skills: skills }));
    expect(result.success).toBe(true);
  });

  it('rejects invented brand skill IDs', () => {
    const result = HandoffFrontmatter.safeParse(baseHandoff({
      cowork_brand_skills: ['class-brand-invented-skill'],
    }));
    expect(result.success).toBe(false);
  });

  it('accepts executed_by as null', () => {
    const result = HandoffFrontmatter.safeParse(baseHandoff({ executed_by: null }));
    expect(result.success).toBe(true);
  });

  it('accepts executed_by as a string (single path)', () => {
    const result = HandoffFrontmatter.safeParse(baseHandoff({
      executed_by: 'executions/DEC-007/Q3-plan.docx',
    }));
    expect(result.success).toBe(true);
  });

  it('accepts executed_by as an array of paths', () => {
    const result = HandoffFrontmatter.safeParse(baseHandoff({
      executed_by: ['executions/DEC-007/Q3-plan.docx', 'executions/DEC-007/Q3-deck.pptx'],
    }));
    expect(result.success).toBe(true);
  });

  it('passes through extra fields (passthrough)', () => {
    const result = HandoffFrontmatter.safeParse(baseHandoff({ extra_field: 'extra-value' }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>).extra_field).toBe('extra-value');
    }
  });

  it('requires id field', () => {
    const { id: _id, ...noId } = baseHandoff() as Record<string, unknown>;
    const result = HandoffFrontmatter.safeParse(noId);
    expect(result.success).toBe(false);
  });

  it('requires created field', () => {
    const { created: _c, ...noDates } = baseHandoff() as Record<string, unknown>;
    const result = HandoffFrontmatter.safeParse(noDates);
    expect(result.success).toBe(false);
  });

  it('requires created_by_run_id', () => {
    const { created_by_run_id: _r, ...noRun } = baseHandoff() as Record<string, unknown>;
    const result = HandoffFrontmatter.safeParse(noRun);
    expect(result.success).toBe(false);
  });
});

// --- CoworkBrandSkillIdSchema ---

describe('CoworkBrandSkillIdSchema — closed set of 5 IDs', () => {
  const validIds = [
    'class-brand-document',
    'class-brand-excel',
    'class-brand-presentations',
    'class-ppt-cyan-light',
    'class-brand-voice',
  ];

  for (const id of validIds) {
    it(`accepts: ${id}`, () => {
      expect(CoworkBrandSkillIdSchema.safeParse(id).success).toBe(true);
    });
  }

  it('rejects ids outside the catalog', () => {
    expect(CoworkBrandSkillIdSchema.safeParse('class-brand-word').success).toBe(false);
    expect(CoworkBrandSkillIdSchema.safeParse('class-brand-powerpoint').success).toBe(false);
    expect(CoworkBrandSkillIdSchema.safeParse('').success).toBe(false);
  });
});

// --- HandoffStatusSchema ---

describe('HandoffStatusSchema', () => {
  it('accepts all 3 statuses', () => {
    for (const s of ['drafted', 'sent', 'executed']) {
      expect(HandoffStatusSchema.safeParse(s).success).toBe(true);
    }
  });

  it('rejects non-status strings', () => {
    expect(HandoffStatusSchema.safeParse('pending').success).toBe(false);
    expect(HandoffStatusSchema.safeParse('archived').success).toBe(false);
  });
});

// --- HandoffOriginTypeSchema ---

describe('HandoffOriginTypeSchema', () => {
  it('accepts all 4 origin types', () => {
    for (const t of ['decision', 'memo', 'position', 'pre_mortem']) {
      expect(HandoffOriginTypeSchema.safeParse(t).success).toBe(true);
    }
  });

  it('rejects pre-mortem kebab variant (ADR uses snake)', () => {
    expect(HandoffOriginTypeSchema.safeParse('pre-mortem').success).toBe(false);
  });

  it('rejects lens outputs', () => {
    expect(HandoffOriginTypeSchema.safeParse('lens_output').success).toBe(false);
  });
});
