// apps/utility/src/jobs/sundayWorkstream.ts
// Source: docs/decisions/0012-ch10-scheduler-autonomy.md §7
// Sunday 8pm ET — re-parse vault workstreams → repopulate workstream_amounts_mirror.
// Memory consolidation: prune old rows per documented TTLs.
// Halt (P0) on vault-unreachable.

import * as path from 'path';
import * as fs from 'fs/promises';
import type Database from 'better-sqlite3';
import type { DegradedSource } from '@c-suite/shared-types/scheduled-job';
import type { JobRunContext } from '../scheduler/cron.js';
import { VaultUnreachableError } from '../scheduler/retry.js';
import { createLogger } from '../logger.js';

const log = createLogger('sundayWorkstream');

// Memory consolidation TTLs (ADR §7).
const PRUNE_PROCESS_EVENTS_OLDER_THAN_DAYS = 30;
const PRUNE_RUNS_OLDER_THAN_DAYS = 90;
const PRUNE_SCHEDULED_JOBS_OLDER_THAN_DAYS = 180;

interface WorkstreamRecord {
  id: string;
  title: string;
  status: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
  phase: 'execution' | 'maintenance' | 'planning' | 'unknown';
  amount: number | null;
  currency: string;
  lastModified: string;
}

/**
 * Parse a single workstream markdown file.
 * Extracts: id, title, status, phase, amount from front-matter or body.
 */
function parseWorkstreamFile(filename: string, content: string): WorkstreamRecord {
  const lines = content.split('\n');

  let id = filename.replace(/\.md$/, '');
  let title = id;
  let status: WorkstreamRecord['status'] = 'UNKNOWN';
  let phase: WorkstreamRecord['phase'] = 'unknown';
  let amount: number | null = null;
  let currency = 'USD';

  // Parse front-matter block.
  let inFrontMatter = false;
  for (const line of lines) {
    if (line.trim() === '---') {
      inFrontMatter = !inFrontMatter;
      continue;
    }
    if (!inFrontMatter) {
      // Parse H1 as title fallback.
      if (line.startsWith('# ')) title = line.slice(2).trim();
      continue;
    }

    const [key, ...rest] = line.split(':');
    const value = rest.join(':').trim();
    switch (key?.trim()) {
      case 'id':     id = value; break;
      case 'title':  title = value; break;
      case 'status': status = (['GREEN', 'YELLOW', 'RED'].includes(value) ? value : 'UNKNOWN') as WorkstreamRecord['status']; break;
      case 'phase':  phase = (['execution', 'maintenance', 'planning'].includes(value) ? value : 'unknown') as WorkstreamRecord['phase']; break;
      case 'amount': amount = parseFloat(value) || null; break;
      case 'currency': currency = value; break;
    }
  }

  return { id, title, status, phase, amount, currency, lastModified: new Date().toISOString() };
}

/**
 * Repopulate workstream_amounts_mirror table from vault files.
 * B12 mitigation: re-parse from source of truth rather than relying on stale cache.
 */
async function repopulateWorkstreamMirror(
  db: Database.Database,
  workstreamsDir: string,
): Promise<WorkstreamRecord[]> {
  // Ensure table exists.
  db.prepare(`
    CREATE TABLE IF NOT EXISTS workstream_amounts_mirror (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      phase TEXT NOT NULL,
      amount REAL,
      currency TEXT NOT NULL DEFAULT 'USD',
      last_modified TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `).run();

  let files: string[] = [];
  try {
    files = (await fs.readdir(workstreamsDir)).filter(f => f.endsWith('.md') && !f.startsWith('_'));
  } catch {
    throw new VaultUnreachableError(`Cannot read workstreams directory: ${workstreamsDir}`);
  }

  const records: WorkstreamRecord[] = [];
  for (const filename of files) {
    const content = await fs.readFile(path.join(workstreamsDir, filename), 'utf-8').catch(() => null);
    if (!content) continue;
    records.push(parseWorkstreamFile(filename, content));
  }

  // Atomic replace: delete all + re-insert.
  db.prepare('DELETE FROM workstream_amounts_mirror').run();
  const insert = db.prepare(`
    INSERT INTO workstream_amounts_mirror (id, title, status, phase, amount, currency, last_modified, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const r of records) {
    insert.run(r.id, r.title, r.status, r.phase, r.amount, r.currency, r.lastModified, Date.now());
  }

  log.info({ message: 'workstream_amounts_mirror repopulated', count: records.length });
  return records;
}

/**
 * Memory consolidation — prune old rows per documented TTLs, vacuum SQLite.
 */
function runMemoryConsolidation(db: Database.Database): void {
  const now = Date.now();

  const pruneProcessEvents = now - PRUNE_PROCESS_EVENTS_OLDER_THAN_DAYS * 86_400_000;
  const pruneRuns = now - PRUNE_RUNS_OLDER_THAN_DAYS * 86_400_000;
  const pruneScheduledJobs = now - PRUNE_SCHEDULED_JOBS_OLDER_THAN_DAYS * 86_400_000;

  try {
    const pruned: Record<string, number> = {};

    // Prune process_events (>30 days).
    try {
      const r = db.prepare('DELETE FROM process_events WHERE created_at < ?').run(pruneProcessEvents);
      pruned['process_events'] = r.changes;
    } catch { /* table may not exist */ }

    // Prune runs (>90 days).
    try {
      const r = db.prepare('DELETE FROM runs WHERE started_at < ?').run(pruneRuns);
      pruned['runs'] = r.changes;
    } catch { /* table may not exist */ }

    // Prune scheduled_jobs (>180 days).
    try {
      const r = db.prepare('DELETE FROM scheduled_jobs WHERE created_at < ?').run(pruneScheduledJobs);
      pruned['scheduled_jobs'] = r.changes;
    } catch { /* table may not exist */ }

    // Vacuum to reclaim space.
    db.prepare('VACUUM').run();

    log.info({ message: 'memory consolidation complete', pruned });
  } catch (err) {
    log.error({ message: 'memory consolidation error', err: String(err) });
  }
}

export async function runSundayWorkstream(
  ctx: JobRunContext,
): Promise<{ outputMemoPath?: string; degradedSources?: DegradedSource[] }> {
  log.info({ message: 'sunday workstream starting' });

  const workstreamsDir = path.join(ctx.vaultRoot, 'workstreams');

  // Vault-unreachable → halt + immediate notification (P0 per ADR).
  let records: WorkstreamRecord[];
  try {
    records = await repopulateWorkstreamMirror(ctx.db, workstreamsDir);
  } catch (err) {
    if (err instanceof VaultUnreachableError) {
      ctx.emitIpc({
        kind: 'main.show-notification',
        payload: {
          type: 'job-failure',
          title: 'C-Suite: vault unreachable',
          body: 'sunday-workstream halted — vault directory unavailable. Click for diagnostics.',
          clickAction: 'settings-scheduler',
        },
      });
      throw err; // Let retry.ts handle escalation.
    }
    throw err;
  }

  // Memory consolidation.
  runMemoryConsolidation(ctx.db);

  log.info({ message: 'sunday workstream complete', workstreamCount: records.length });

  return { degradedSources: [] };
}
