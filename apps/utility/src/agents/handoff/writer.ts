// apps/utility/src/agents/handoff/writer.ts
// Source: docs/decisions/0011-ch9-cowork-handoff.md §3 (brief writer)
// Write a HandoffBrief to <vault>/handoffs/<filename> via SafeWrite.
// On success: triggers INDEX regeneration.

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
