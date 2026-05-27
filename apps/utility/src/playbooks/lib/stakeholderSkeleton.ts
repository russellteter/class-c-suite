// apps/utility/src/playbooks/lib/stakeholderSkeleton.ts
// Source: docs/decisions/0009-ch7-playbooks-home.md §3.7 (verbatim) + §2 (scope 2)
//
// createStakeholderSkeleton — when stakeholder_1_1 finds no stakeholder file,
// auto-drafts a minimal skeleton and writes it via SafeWrite.
//
// Output path: <vault>/stakeholders/_skeleton-<slug>.md
// Frontmatter: type, name, role, _skeleton, _skeleton_run_id
// Body: 1-line note for Russell to fill.

import * as path from 'path';
import { createLogger } from '../../logger.js';
import type { SafeWriteClient } from '@c-suite/shared-types/playbook';

const log = createLogger();

/**
 * Convert a human name+role to a URL-safe slug.
 * e.g. "John Smith" + "CFO" → "john-smith-cfo"
 */
function toSlug(name: string, role: string): string {
  return `${name}-${role}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Format today's date as YYYY-MM-DD.
 */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Auto-draft a minimal stakeholder skeleton and write it via SafeWrite.
 *
 * @param name        Stakeholder's name (from PlaybookInput.context.targetName)
 * @param role        Stakeholder's role (from PlaybookInput.context.targetRole)
 * @param vaultPath   Absolute path to the vault root
 * @param safeWrite   SafeWriteClient handle
 * @param runId       Run ID for git commit attribution
 * @returns           The absolute path to the written skeleton file
 */
export async function createStakeholderSkeleton(
  name: string,
  role: string,
  vaultPath: string,
  safeWrite: SafeWriteClient,
  runId: string,
): Promise<{ skeletonPath: string; slug: string }> {
  const slug = toSlug(name, role);
  const skeletonPath = path.join(vaultPath, 'stakeholders', `_skeleton-${slug}.md`);

  const content = [
    '---',
    `type: stakeholder`,
    `name: "${name}"`,
    `role: "${role}"`,
    `_skeleton: true`,
    `_skeleton_run_id: "${runId}"`,
    `created: "${todayIso()}"`,
    `last-updated: "${todayIso()}"`,
    '---',
    '',
    `Auto-generated skeleton — fill from real context before the next 1:1 with ${name}.`,
    '',
    '## Hot Buttons',
    '',
    '_Fill from conversations, deal history, or direct feedback._',
    '',
    '## What NOT to Bring Up',
    '',
    '_Topics that have caused friction or are out of bounds for this relationship._',
    '',
    '## Open Commitments',
    '',
    '_Outstanding commitments made to or by this stakeholder._',
    '',
    '## Background',
    '',
    `_Role: ${role}. Add relationship history, org context, communication preferences._`,
    '',
  ].join('\n');

  log.info({ message: 'createStakeholderSkeleton: writing skeleton', skeletonPath, slug, runId });

  const result = await safeWrite.write({
    absPath: skeletonPath,
    content,
    agent: 'Synthesizer',
    playbook: 'stakeholder_1_1',
    runId,
  });

  if (!result.ok && result.conflict) {
    // Conflict: sidecar written. Use the conflict path but warn.
    log.warn({ message: 'createStakeholderSkeleton: conflict on skeleton write', sidecarPath: result.sidecarPath });
  }

  log.info({ message: 'createStakeholderSkeleton: skeleton written', skeletonPath, slug });
  return { skeletonPath, slug };
}
