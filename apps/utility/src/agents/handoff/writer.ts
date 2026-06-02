// apps/utility/src/agents/handoff/writer.ts
// Source: docs/decisions/0011-ch9-cowork-handoff.md §3 (brief writer)
// Write a HandoffBrief to <vault>/handoffs/<filename> via SafeWrite.
// writeHandoffBundle writes the full CoWork folder bundle (brief.md + memo.md + continue-prompt.md).
// On flat write success: triggers INDEX regeneration.

import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';
import type Database from 'better-sqlite3';
import type { HandoffBrief } from '@c-suite/shared-types/handoff';
import { safeWrite } from '../../safewrite/index.js';
import { regenerateHandoffIndex } from './indexRegen.js';
import { createLogger } from '../../logger.js';

const log = createLogger();

const VAULT_PATH =
  process.env.VAULT_PATH ??
  path.join(os.homedir(), 'Documents', 'Claude', 'Projects', 'Business Planning');

/**
 * Serialize frontmatter + body to a markdown file string.
 * Format: ---\n<yaml>\n---\n\n<body>
 */
export function serializeHandoffFile(brief: HandoffBrief): string {
  // Build a plain object for YAML serialization (strip Zod prototype)
  const fm: Record<string, unknown> = { ...brief.frontmatter };
  const yamlStr = yaml.dump(fm, { lineWidth: 120, quotingType: '"', forceQuotes: false });
  return `---\n${yamlStr}---\n\n${brief.bodyMarkdown}\n`;
}

/**
 * Write the brief to vault and regenerate the INDEX.
 * Returns { ok: true, sha } on success or { ok: false, reason } on failure.
 */
export async function writeHandoffBrief(
  brief: HandoffBrief,
  db: Database.Database,
): Promise<{ ok: true; sha: string } | { ok: false; reason: string }> {
  const content = serializeHandoffFile(brief);
  const absPath = brief.fullPath;

  // Validate that the path is under VAULT_PATH/handoffs
  const handoffsDir = path.join(VAULT_PATH, 'handoffs');
  const rel = path.relative(handoffsDir, absPath);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    const reason = `writeHandoffBrief: path ${absPath} is outside handoffs dir ${handoffsDir}`;
    log.error({ message: reason });
    return { ok: false, reason };
  }

  const result = await safeWrite({
    absPath,
    content,
    agent: 'handoff-agent',
    playbook: 'handoff',
    runId: brief.frontmatter.created_by_run_id,
  });

  if (!result.ok) {
    const reason = `safeWrite conflict: sidecar at ${(result as { sidecarPath?: string }).sidecarPath ?? 'unknown'}`;
    log.warn({ message: 'handoff write conflict', absPath });
    return { ok: false, reason };
  }

  // Trigger INDEX regeneration
  try {
    await regenerateHandoffIndex(db);
  } catch (err) {
    // Non-fatal: log + continue; the brief itself was written successfully
    log.error({ message: 'handoff INDEX regeneration failed', err: String(err) });
  }

  log.info({ message: 'handoff brief written', path: absPath, sha: result.sha });
  return { ok: true, sha: result.sha };
}

/**
 * Write the full CoWork hand-back bundle to vault:
 *   handoffs/<slug>/brief.md         — serialized HandoffBrief (always written)
 *   handoffs/<slug>/memo.md          — memoMarkdown (skipped if null)
 *   handoffs/<slug>/continue-prompt.md — templated CoWork continue prompt (always written)
 *
 * All files use zone 'handoff' (commitVault: false — disk only, by design).
 * safeWrite mkdir's the parent dir automatically (recursive: true).
 * Returns { ok, slug, folderPath } (folderPath absolute).
 */
export async function writeHandoffBundle(
  brief: HandoffBrief,
  memoMarkdown: string | null,
  db: Database.Database,
): Promise<{ ok: boolean; slug: string; folderPath: string }> {
  const slug = brief.filename.replace(/\.md$/, '');
  const folderPath = path.join(VAULT_PATH, 'handoffs', slug);

  const continuePrompt = `# Continue in Claude Desktop CoWork

You are picking up a C-Suite strategic decision. The reconciled 6-lens memo is in \`memo.md\`; the
hand-off brief (context, open threads, next actions) is in \`brief.md\`. Read both, then continue the
work: ${brief.frontmatter.id}.

Start by confirming the recommendation in memo.md against any newer information, then take the next
action the brief identifies.
`;

  const runId = brief.frontmatter.created_by_run_id;

  // Write brief.md (required)
  const briefResult = await safeWrite({
    absPath: path.join(folderPath, 'brief.md'),
    content: serializeHandoffFile(brief),
    agent: 'handoff-agent',
    playbook: 'handoff',
    runId,
  });
  if (!briefResult.ok) {
    const reason = `safeWrite conflict on brief.md: sidecar at ${(briefResult as { sidecarPath?: string }).sidecarPath ?? 'unknown'}`;
    log.warn({ message: 'handoff bundle brief.md conflict', folderPath });
    return { ok: false, slug, folderPath };
  }

  // Write memo.md (optional — skip if memoMarkdown is null)
  if (memoMarkdown !== null) {
    const memoResult = await safeWrite({
      absPath: path.join(folderPath, 'memo.md'),
      content: memoMarkdown,
      agent: 'handoff-agent',
      playbook: 'handoff',
      runId,
    });
    if (!memoResult.ok) {
      log.warn({ message: 'handoff bundle memo.md conflict — continuing', folderPath });
      // Non-fatal: brief.md written; log and continue
    }
  }

  // Write continue-prompt.md (required)
  const promptResult = await safeWrite({
    absPath: path.join(folderPath, 'continue-prompt.md'),
    content: continuePrompt,
    agent: 'handoff-agent',
    playbook: 'handoff',
    runId,
  });
  if (!promptResult.ok) {
    log.warn({ message: 'handoff bundle continue-prompt.md conflict', folderPath });
    // Non-fatal: brief.md written successfully
  }

  // Trigger INDEX regeneration (non-fatal)
  try {
    await regenerateHandoffIndex(db);
  } catch (err) {
    log.error({ message: 'handoff bundle INDEX regeneration failed', err: String(err) });
  }

  log.info({ message: 'handoff bundle written', slug, folderPath });
  return { ok: true, slug, folderPath };
}
