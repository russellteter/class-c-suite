// apps/utility/src/watchers/executionLinkback.ts
// Source: docs/decisions/0011-ch9-cowork-handoff.md §6.2
// Chokidar watcher for <vault>/executions/ — auto-links Cowork output artifacts
// back to their originating decision/memo/position/pre-mortem via executed_by field.
// Idempotent: re-detecting the same file never double-appends.

import chokidar from 'chokidar';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';
import { safeWrite } from '../safewrite/index.js';
import { createLogger } from '../logger.js';

const log = createLogger();

const VAULT_PATH =
  process.env.VAULT_PATH ??
  path.join(os.homedir(), 'Documents', 'Claude', 'Projects', 'Business Planning');

export interface LinkbackWatcherHandle {
  close(): Promise<void>;
}

/**
 * Resolve an origin artifact path from a decision-id directory name.
 * Convention: executions/<decision-id>/<artifact-name>
 * Decision IDs: DEC-NNN → decisions/DEC-NNN.md
 * Position IDs: POS-NNN → positions/POS-NNN.md
 * Pre-mortem IDs: PM-NNN → pre-mortems/PM-NNN.md
 * Memo slugs: anything else → memos/<slug>.md
 */
export function resolveOriginPath(decisionId: string, vaultPath: string): string | null {
  const id = decisionId.trim().toUpperCase();

  if (/^DEC-\d+$/.test(id)) {
    return path.join(vaultPath, 'decisions', `${decisionId}.md`);
  }
  if (/^POS-\d+$/.test(id)) {
    return path.join(vaultPath, 'positions', `${decisionId}.md`);
  }
  if (/^PM-\d+$/.test(id)) {
    return path.join(vaultPath, 'pre-mortems', `${decisionId}.md`);
  }
  // Treat as memo slug
  return path.join(vaultPath, 'memos', `${decisionId}.md`);
}

/**
 * Parse the decision-id from an executions/ path.
 * Expected: .../executions/<decision-id>/<artifact>
 * Returns null if path doesn't match the convention.
 */
export function parseDecisionIdFromPath(absPath: string, executionsDir: string): string | null {
  const rel = path.relative(executionsDir, absPath);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  const parts = rel.split(path.sep);
  // Must be at least 2 segments: <decision-id>/<artifact>
  if (parts.length < 2) return null;
  return parts[0];
}

/**
 * Extract YAML frontmatter from markdown content.
 */
function extractFrontmatter(content: string): { raw: string; fm: Record<string, unknown> } | null {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  try {
    const fm = yaml.load(m[1]) as Record<string, unknown>;
    return { raw: m[1], fm };
  } catch {
    return null;
  }
}

/**
 * Append an execution path to the origin artifact's executed_by field.
 * Idempotent: if the path is already present, returns without writing.
 */
export async function appendExecutedBy(
  originPath: string,
  executionPath: string,
  runId: string,
): Promise<{ updated: boolean; reason?: string }> {
  let content: string;
  try {
    content = await fs.readFile(originPath, 'utf8');
  } catch (err) {
    const reason = `origin file not found: ${originPath}`;
    log.warn({ message: 'executionLinkback: ' + reason });
    return { updated: false, reason };
  }

  const parsed = extractFrontmatter(content);
  if (!parsed) {
    const reason = `no frontmatter in origin: ${originPath}`;
    log.warn({ message: 'executionLinkback: ' + reason });
    return { updated: false, reason };
  }

  const { fm } = parsed;

  // Normalize executed_by to array
  let executedBy: string[];
  if (!fm.executed_by || fm.executed_by === null) {
    executedBy = [];
  } else if (typeof fm.executed_by === 'string') {
    executedBy = [fm.executed_by];
  } else if (Array.isArray(fm.executed_by)) {
    executedBy = fm.executed_by.filter((x): x is string => typeof x === 'string');
  } else {
    executedBy = [];
  }

  // Idempotency check
  if (executedBy.includes(executionPath)) {
    log.info({ message: 'executionLinkback: already linked, skipping', originPath, executionPath });
    return { updated: false };
  }

  executedBy.push(executionPath);
  fm.executed_by = executedBy;

  // Rebuild file content: replace frontmatter block
  const newYaml = yaml.dump(fm, { lineWidth: 120 });
  const newContent = content.replace(/^---\r?\n[\s\S]*?\r?\n---/, `---\n${newYaml}---`);

  const result = await safeWrite({
    absPath: originPath,
    content: newContent,
    agent: 'execution-linkback-watcher',
    playbook: 'handoff',
    runId,
  });

  if (!result.ok) {
    const reason = `SafeWrite conflict on ${originPath}`;
    log.warn({ message: 'executionLinkback: ' + reason });
    return { updated: false, reason };
  }

  log.info({ message: 'executionLinkback: executed_by appended', originPath, executionPath });
  return { updated: true };
}

/**
 * Create a chokidar watcher on <vault>/executions/.
 * On file addition: extracts decision-id, finds origin artifact, appends executed_by.
 * Idempotent. Handles edge cases per ADR §6.3 (log + skip).
 */
export function createExecutionLinkbackWatcher(
  vaultPath: string = VAULT_PATH,
): LinkbackWatcherHandle {
  const executionsDir = path.join(vaultPath, 'executions');

  const watcher = chokidar.watch(executionsDir, {
    ignored: ['**/.git/**', '**/.DS_Store', '**/*.tmp-*', '**/*.proposed-*'],
    persistent: true,
    ignoreInitial: true,   // only react to new files, not pre-existing at startup
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
  });

  watcher.on('add', async (absPath: string) => {
    log.info({ message: 'executionLinkback: detected new file', absPath });

    const decisionId = parseDecisionIdFromPath(absPath, executionsDir);
    if (!decisionId) {
      log.warn({ message: 'executionLinkback: no decision-id in path, skipping', absPath });
      return;
    }

    const originPath = resolveOriginPath(decisionId, vaultPath);
    if (!originPath) {
      log.warn({ message: 'executionLinkback: could not resolve origin, skipping', decisionId });
      return;
    }

    const runId = `linkback-${Date.now()}`;
    await appendExecutedBy(originPath, absPath, runId);
  });

  watcher.on('error', (err: unknown) => {
    log.error({ message: 'executionLinkback watcher error', err: String(err) });
  });

  return {
    async close(): Promise<void> {
      await watcher.close();
    },
  };
}
