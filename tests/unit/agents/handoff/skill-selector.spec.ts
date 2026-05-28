/**
 * Ch.9 — pickBrandSkills / pickAllBrandSkills specs.
 * Source: docs/decisions/0011-ch9-cowork-handoff.md §3.3 + AC-3
 * All 5 heuristic cases + multi-deliverable + edge cases.
 */
import { describe, it, expect } from 'vitest';
import {
  pickBrandSkills,
  pickAllBrandSkills,
  includesCyanLightVariant,
} from '../../../../apps/utility/src/agents/handoff/skill-selector.js';

describe('pickBrandSkills — single deliverable heuristics', () => {
  it('"deck" → class-brand-presentations', () => {
    expect(pickBrandSkills(['Board deck for Q3'])).toContain('class-brand-presentations');
  });

  it('"slides" → class-brand-presentations', () => {
    expect(pickBrandSkills(['Slides for all-hands'])).toContain('class-brand-presentations');
  });

  it('"presentation" keyword → class-brand-presentations', () => {
    expect(pickBrandSkills(['Customer presentation'])).toContain('class-brand-presentations');
  });

  it('"doc" → class-brand-document', () => {
    expect(pickBrandSkills(['Strategic doc'])).toContain('class-brand-document');
  });

  it('"memo" → class-brand-document', () => {
    expect(pickBrandSkills(['Board memo'])).toContain('class-brand-document');
  });

  it('"report" → class-brand-document', () => {
    expect(pickBrandSkills(['Q3 report for CEO'])).toContain('class-brand-document');
  });

  it('"letter" → class-brand-document', () => {
    expect(pickBrandSkills(['Renewal letter to customer'])).toContain('class-brand-document');
  });

  it('"model" → class-brand-excel', () => {
    expect(pickBrandSkills(['Financial model for FY27'])).toContain('class-brand-excel');
  });

  it('"spreadsheet" → class-brand-excel', () => {
    expect(pickBrandSkills(['Budget spreadsheet'])).toContain('class-brand-excel');
  });

  it('"xlsx" → class-brand-excel', () => {
    expect(pickBrandSkills(['Export as xlsx'])).toContain('class-brand-excel');
  });

  it('"external" appends class-brand-voice', () => {
    const skills = pickBrandSkills(['External email to customer']);
    expect(skills).toContain('class-brand-voice');
  });

  it('"customer-facing" appends class-brand-voice', () => {
    const skills = pickBrandSkills(['Customer-facing one-pager']);
    expect(skills).toContain('class-brand-voice');
  });
});

describe('pickBrandSkills — multi-deliverable + empty', () => {
  it('empty deliverables → []', () => {
    expect(pickBrandSkills([])).toEqual([]);
  });

  it('deliverable with no keyword match → []', () => {
    expect(pickBrandSkills(['Ship the code artifact'])).toEqual([]);
  });

  it('multi-deliverable: deck + model → presentations + excel', () => {
    const skills = pickBrandSkills(['Board deck', 'Financial model']);
    expect(skills).toContain('class-brand-presentations');
    expect(skills).toContain('class-brand-excel');
  });

  it('multi-deliverable: doc + external → document + voice', () => {
    const skills = pickBrandSkills(['Strategic doc', 'External email']);
    expect(skills).toContain('class-brand-document');
    expect(skills).toContain('class-brand-voice');
  });

  it('deduplicates: two "deck" deliverables → single presentations entry', () => {
    const skills = pickBrandSkills(['Board deck', 'All-hands deck']);
    expect(skills.filter(s => s === 'class-brand-presentations').length).toBe(1);
  });

  it('all three primary types in one list', () => {
    const skills = pickBrandSkills(['Customer deck', 'Budget model', 'Board memo']);
    expect(skills).toContain('class-brand-presentations');
    expect(skills).toContain('class-brand-excel');
    expect(skills).toContain('class-brand-document');
  });
});

describe('includesCyanLightVariant', () => {
  it('internal + deck → true', () => {
    expect(includesCyanLightVariant(['Internal deck for team meeting'])).toBe(true);
  });

  it('internal + slides → true', () => {
    expect(includesCyanLightVariant(['Internal slides'])).toBe(true);
  });

  it('external deck → false (no internal keyword)', () => {
    expect(includesCyanLightVariant(['Customer deck'])).toBe(false);
  });

  it('internal doc → false (no deck/slides keyword)', () => {
    expect(includesCyanLightVariant(['Internal memo'])).toBe(false);
  });
});

describe('pickAllBrandSkills — includes cyan-light when applicable', () => {
  it('internal deck → includes class-ppt-cyan-light', () => {
    const skills = pickAllBrandSkills(['Internal team deck']);
    expect(skills).toContain('class-ppt-cyan-light');
    expect(skills).toContain('class-brand-presentations');
  });

  it('external deck → does not include cyan-light', () => {
    const skills = pickAllBrandSkills(['Customer deck']);
    expect(skills).not.toContain('class-ppt-cyan-light');
  });
});
