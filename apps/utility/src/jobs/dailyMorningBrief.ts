// apps/utility/src/jobs/dailyMorningBrief.ts
// Source: docs/decisions/0012-ch10-scheduler-autonomy.md §8
// Daily 6am ET — invokes quick_read playbook (all six lenses, QUICK_READ stamp).
// Memo lands at <vault>/scheduled-reports/<date>-morning-brief.md.

import * as path from 'path';
import * as fs from 'fs/promises';
import { randomUUID } from 'node:crypto';
import type { DegradedSource } from '@c-suite/shared-types/scheduled-job';
import type { JobRunContext } from '../scheduler/cron.js';
import { createLogger } from '../logger.js';

// Dynamically import quick-read playbook at runtime.
const QUICK_READ_MODULE = '../playbooks/quick-read/index.js';

const log = createLogger('dailyMorningBrief');

export async function runDailyMorningBrief(
  ctx: JobRunContext,
): Promise<{ outputMemoPath?: string; degradedSources?: DegradedSource[] }> {
  const today = new Date().toISOString().slice(0, 10);
  const runId = randomUUID();

  log.info({ message: 'daily morning brief starting', date: today, runId });

  const { runPlaybook } = (await import(QUICK_READ_MODULE)) as { runPlaybook: (input: unknown, ctx: unknown) => Promise<{ memoMarkdown: string; degradedSources: string[]; stamps: string[] }> };

  const result = await runPlaybook(
    {
      playbookId: 'quick_read',
      prompt: `Six-lens compact read for ${today}. What is the one thing in each lens's domain that Russell needs to know before today's work starts?`,
    },
    {
      runId,
      db: ctx.db,
      vaultPath: ctx.vaultRoot,
      emit: ctx.emitIpc,
      deps: {},
    },
  );

  const reportsDir = path.join(ctx.vaultRoot, 'scheduled-reports');
  await fs.mkdir(reportsDir, { recursive: true });

  const outputPath = path.join(reportsDir, `${today}-morning-brief.md`);
  const content = `---\nrunId: ${runId}\nstamp: QUICK_READ\ndate: ${today}\n---\n\n${result.memoMarkdown}`;
  await fs.writeFile(outputPath, content, 'utf-8');

  log.info({ message: 'morning brief written', outputPath, degradedSources: result.degradedSources });

  return {
    outputMemoPath: outputPath,
    degradedSources: result.degradedSources as DegradedSource[],
  };
}
