// tests/unit/playbooks/stakeholderSkeleton.spec.ts
// Source: tasks/ch7-test-brief.md §1 + docs/decisions/0009-ch7-playbooks-home.md §3.7 + §15 AC-5
// Tests the createStakeholderSkeleton primitive (skeleton creation only —
// the stale-handling caller is tested in stakeholder-1-1.spec.ts).
//
// NOTE: apps/utility/src/playbooks/lib/stakeholderSkeleton.ts does not exist yet
// (Runtime sub-agent scope). All cases are it.todo until that file ships.
// DO NOT import the missing module — vitest load-time error would break the suite.

import { describe, it } from 'vitest';

describe('createStakeholderSkeleton — writes expected path (ADR §3.7, AC-5)', () => {

  it.todo('writes to <vaultRoot>/stakeholders/_skeleton-<slug>.md via SafeWrite');
  it.todo('SafeWrite mock called exactly once with (expectedPath, content, { atomicWrite: true, gitCommit: true })');

});

describe('createStakeholderSkeleton — frontmatter', () => {

  it.todo('frontmatter contains type: stakeholder');
  it.todo('frontmatter contains _skeleton: true');
  it.todo('frontmatter contains _skeleton_run_id (non-empty string)');
  it.todo('frontmatter contains name field matching input name');
  it.todo('frontmatter contains role field matching input role');

});

describe('createStakeholderSkeleton — slug generation', () => {

  it.todo('slug is lowercase for "Test Person" → "test-person"');
  it.todo('slug joins tokens with hyphens — no spaces remain');
  it.todo('slug strips non-alphanumeric characters');
  it.todo('filename is _skeleton-<slug>.md');

});
