// tests/unit/playbooks/gtm-realloc.spec.ts
// Source: tasks/ch7-phase-b-test-brief.md §1 + docs/decisions/0009-ch7-playbooks-home.md §3.2
// Tests the gtm_realloc playbook module.
// Pipeline: 5 lenses parallel (CRO, CFO, CMO, CPO, COS); Salesforce auth-expired → block;
// degrade on stale; Stamp: CLEAN | DRAFT | DEGRADED.
//
// Phase B production module not yet shipped — all assertions are it.todo until Runtime lands
// apps/utility/src/playbooks/gtm-realloc/index.ts.
// Convert on arrival per tasks/ch7-phase-b-test-brief.md §4.

import { describe, it } from 'vitest';

// NOTE: do NOT import from apps/utility/src/playbooks/gtm-realloc/index.js until that file
// exists; a missing static import causes collect-time failure, not a per-test skip.

describe('gtm_realloc — LENSES constant (ADR §3.2)', () => {

  it.todo('LENSES equals [\'CRO\', \'CFO\', \'CMO\', \'CPO\', \'COS\'] (5 lenses)');

  it.todo('LENSES length is 5');

  it.todo('LENSES contains CRO');

  it.todo('LENSES contains CFO');

  it.todo('LENSES contains CMO');

  it.todo('LENSES contains CPO');

  it.todo('LENSES contains COS');

});

describe('gtm_realloc — rigor threshold (ADR §3.2)', () => {

  it.todo('rigorThreshold on result equals 70');

});

describe('gtm_realloc — parallel lens fan-out (ADR §3.2)', () => {

  it.todo('all 5 lenses dispatched in parallel — dispatchLens called 5 times');

  it.todo('CRO lens dispatched with gtm_realloc playbookId');

  it.todo('CFO lens dispatched with gtm_realloc playbookId');

  it.todo('CMO lens dispatched with gtm_realloc playbookId');

  it.todo('CPO lens dispatched with gtm_realloc playbookId');

  it.todo('COS lens dispatched with gtm_realloc playbookId');

  it.todo('dispatchLens call count is exactly 5 (no extra lenses invoked)');

});

describe('gtm_realloc — prereq decision integration (ADR §3.6, Decision 4)', () => {

  it.todo('block when Salesforce auth expired — result not returned, emit receives block event');

  it.todo('degrade on stale Salesforce data — result.degradedSources includes salesforce');

  it.todo('degrade when NetSuite unavailable — result.degradedSources includes netsuite');

  it.todo('degrade when PowerBI unavailable — result.degradedSources includes powerbi');

  it.todo('proceed when all deps available — result.degradedSources is empty');

});

describe('gtm_realloc — stamps (ADR §3.3)', () => {

  it.todo('result.stamps contains CLEAN when rigorScore >= 70 and no degraded sources');

  it.todo('result.stamps contains DRAFT when rigorScore < 70');

  it.todo('result.stamps contains DEGRADED when degradedSources is non-empty');

  it.todo('result.stamps does not contain ADVERSARIAL_ONLY — gtm_realloc is not adversarial-only');

});

describe('gtm_realloc — memo output sections (ADR §3.2)', () => {

  it.todo('memoMarkdown contains current GTM cost section');

  it.todo('memoMarkdown contains recommended reallocation section');

  it.todo('memoMarkdown contains pipeline impact section');

  it.todo('memoMarkdown contains risks section');

  it.todo('memoMarkdown contains workstream-update proposals section');

  it.todo('memoMarkdown is a non-empty string');

});

describe('gtm_realloc — writebacks (ADR §3.2)', () => {

  it.todo('proposedWritebacks contains at least one workstream-update entry');

  it.todo('proposedWriteback entries have required draftPath and topic fields');

});

describe('gtm_realloc — PlaybookModule contract (ADR §3.1)', () => {

  it.todo('module exports runPlaybook as a function');

  it.todo('runPlaybook returns a PlaybookResult with memoMarkdown, stamps, rigorScore fields');

  it.todo('result.lensOutputs has keys matching the 5 LENSES');

});
