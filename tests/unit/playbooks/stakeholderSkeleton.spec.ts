// tests/unit/playbooks/stakeholderSkeleton.spec.ts
// Source: tasks/ch7-test-brief.md §1 + docs/decisions/0009-ch7-playbooks-home.md §3.7 + §15 AC-5
// Tests the createStakeholderSkeleton primitive (skeleton creation only —
// the stale-handling caller is tested in stakeholder-1-1.spec.ts).

import { describe, it, expect, vi } from 'vitest';
import * as path from 'path';
import { createStakeholderSkeleton } from '../../../apps/utility/src/playbooks/lib/stakeholderSkeleton.js';
import type { SafeWriteClient } from '@c-suite/shared-types/playbook';

function makeMockSafeWrite(): SafeWriteClient {
  return {
    write: vi.fn().mockResolvedValue({ ok: true }),
  };
}

const VAULT = '/tmp/vault';
const RUN_ID = 'test-run-001';

describe('createStakeholderSkeleton — writes expected path (ADR §3.7, AC-5)', () => {

  it('writes to <vaultRoot>/stakeholders/_skeleton-<slug>.md via SafeWrite', async () => {
    const sw = makeMockSafeWrite();
    const { skeletonPath } = await createStakeholderSkeleton('Alice Chen', 'COO', VAULT, sw, RUN_ID);
    const expectedPath = path.join(VAULT, 'stakeholders', '_skeleton-alice-chen-coo.md');
    expect(skeletonPath).toBe(expectedPath);
  });

  it('SafeWrite mock called exactly once with absPath, content, agent, playbook, runId (stakeholderSkeleton.ts:line 88-94)', async () => {
    const sw = makeMockSafeWrite();
    await createStakeholderSkeleton('Bob Jones', 'CFO', VAULT, sw, RUN_ID);
    expect(sw.write).toHaveBeenCalledTimes(1);
    const call = (sw.write as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.absPath).toBeDefined();
    expect(call.content).toBeDefined();
    expect(call.runId).toBe(RUN_ID);
  });

});

describe('createStakeholderSkeleton — frontmatter', () => {

  it('frontmatter contains type: stakeholder', async () => {
    const sw = makeMockSafeWrite();
    await createStakeholderSkeleton('Carl Davis', 'CRO', VAULT, sw, RUN_ID);
    const content = (sw.write as ReturnType<typeof vi.fn>).mock.calls[0][0].content as string;
    expect(content).toContain('type: stakeholder');
  });

  it('frontmatter contains _skeleton: true', async () => {
    const sw = makeMockSafeWrite();
    await createStakeholderSkeleton('Dana Lee', 'CPO', VAULT, sw, RUN_ID);
    const content = (sw.write as ReturnType<typeof vi.fn>).mock.calls[0][0].content as string;
    expect(content).toContain('_skeleton: true');
  });

  it('frontmatter contains _skeleton_run_id (non-empty string)', async () => {
    const sw = makeMockSafeWrite();
    await createStakeholderSkeleton('Eva Kim', 'CMO', VAULT, sw, 'run-xyz');
    const content = (sw.write as ReturnType<typeof vi.fn>).mock.calls[0][0].content as string;
    expect(content).toContain('_skeleton_run_id: "run-xyz"');
  });

  it('frontmatter contains name field matching input name', async () => {
    const sw = makeMockSafeWrite();
    await createStakeholderSkeleton('Frank Wu', 'CEO', VAULT, sw, RUN_ID);
    const content = (sw.write as ReturnType<typeof vi.fn>).mock.calls[0][0].content as string;
    expect(content).toContain('name: "Frank Wu"');
  });

  it('frontmatter contains role field matching input role', async () => {
    const sw = makeMockSafeWrite();
    await createStakeholderSkeleton('Grace Park', 'COS', VAULT, sw, RUN_ID);
    const content = (sw.write as ReturnType<typeof vi.fn>).mock.calls[0][0].content as string;
    expect(content).toContain('role: "COS"');
  });

});

describe('createStakeholderSkeleton — slug generation', () => {

  it('slug is lowercase — "Test Person" + "CFO" → "test-person-cfo" (stakeholderSkeleton.ts:line 22-26)', async () => {
    const sw = makeMockSafeWrite();
    const { slug } = await createStakeholderSkeleton('Test Person', 'CFO', VAULT, sw, RUN_ID);
    expect(slug).toBe('test-person-cfo');
  });

  it('slug joins tokens with hyphens — no spaces remain', async () => {
    const sw = makeMockSafeWrite();
    const { slug } = await createStakeholderSkeleton('John Smith', 'COO', VAULT, sw, RUN_ID);
    expect(slug).not.toContain(' ');
    expect(slug).toMatch(/^[a-z0-9-]+$/);
  });

  it('slug strips non-alphanumeric characters', async () => {
    const sw = makeMockSafeWrite();
    const { slug } = await createStakeholderSkeleton("O'Brien", 'CRO', VAULT, sw, RUN_ID);
    expect(slug).not.toMatch(/[^a-z0-9-]/);
  });

  it('filename is _skeleton-<slug>.md (stakeholderSkeleton.ts:line 53)', async () => {
    const sw = makeMockSafeWrite();
    const { skeletonPath, slug } = await createStakeholderSkeleton('Helen Fox', 'CMO', VAULT, sw, RUN_ID);
    expect(skeletonPath).toMatch(new RegExp(`_skeleton-${slug}\\.md$`));
  });

});
