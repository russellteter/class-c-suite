// apps/utility/src/jobs/mondayStakeholder.ts
// Source: docs/decisions/0012-ch10-scheduler-autonomy.md §5
// Monday 7am ET — foreach stakeholder file; sequential invocations of stakeholder_1_1.
// Skip stakeholders whose file was updated <7 days ago (recent prep is current).

import * as path from 'path';
import * as fs from 'fs/promises';
import { randomUUID } from 'node:crypto';
import type { JobDegradedSource } from '@c-suite/shared-types/scheduled-job';
import type { JobRunContext } from '../scheduler/cron.js';
import { createLogger } from '../logger.js';

const STAKEHOLDER_MODULE = '../playbooks/stakeholder-1-1/index.js';

const log = createLogger();

const SKIP_IF_UPDATED_WITHIN_DAYS = 7;

function daysSince(mtime: Date): number {
  return (Date.now() - mtime.getTime()) / (1000 * 60 * 60 * 24);
}

export async function runMondayStakeholder(
  ctx: JobRunContext,
): Promise<{ outputMemoPath?: string; degradedSources?: JobDegradedSource[] }> {
  const today = new Date().toISOString().slice(0, 10);
  const degradedSources: JobDegradedSource[] = [];
  const processedSlugs: string[] = [];
  const skippedSlugs: string[] = [];

  log.info({ message: 'monday stakeholder starting', date: today });

  const stakeholdersDir = path.join(ctx.vaultRoot, 'stakeholders');

  let entries: string[] = [];
  try {
    const dirEntries = await fs.readdir(stakeholdersDir);
    entries = dirEntries.filter(e => e.endsWith('.md') && !e.startsWith('_skeleton-'));
  } catch {
    log.warn({ message: 'stakeholders directory not found or empty', dir: stakeholdersDir });
    return { degradedSources: [] };
  }

  const { runPlaybook } = (await import(STAKEHOLDER_MODULE)) as {
    runPlaybook: (input: unknown, ctx: unknown) => Promise<{ memoMarkdown: string; degradedSources: string[] }>
  };

  // Sequential (not parallel) — respects window cap per ADR §5.
  for (const filename of entries) {
    const filePath = path.join(stakeholdersDir, filename);
    const slug = filename.replace(/\.md$/, '');

    // Check last-modified time — skip if updated <7 days ago.
    const stat = await fs.stat(filePath).catch(() => null);
    if (stat && daysSince(stat.mtime) < SKIP_IF_UPDATED_WITHIN_DAYS) {
      log.info({ message: 'stakeholder skipped — updated recently', slug, mtime: stat.mtime.toISOString() });
      skippedSlugs.push(slug);
      continue;
    }

    const runId = randomUUID();
    log.info({ message: 'stakeholder processing', slug, runId });

    try {
      const result = await runPlaybook(
        {
          playbookId: 'stakeholder_1_1',
          prompt: `Prepare 1:1 brief for ${slug} as of ${today}.`,
          context: { stakeholderSlug: slug },
        },
        {
          runId,
          db: ctx.db,
          vaultPath: ctx.vaultRoot,
          emit: ctx.emitIpc,
          deps: {},
        },
      );

      for (const s of result.degradedSources) degradedSources.push(s as JobDegradedSource);
      processedSlugs.push(slug);
    } catch (err) {
      log.error({ message: 'stakeholder invocation failed', slug, err: String(err) });
      // Per ADR §5: per-stakeholder failure propagates from playbook; whole-job only fails on SafeWrite/DB issues.
      // Continue to next stakeholder.
    }
  }

  log.info({
    message: 'monday stakeholder complete',
    processed: processedSlugs.length,
    skipped: skippedSlugs.length,
  });

  // No single output memo — each stakeholder_1_1 produces its own memo via SafeWrite.
  // Emit aggregate IPC via job.finished (cron.ts handles that).
  return { degradedSources };
}
