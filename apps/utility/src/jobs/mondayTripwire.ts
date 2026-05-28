// apps/utility/src/jobs/mondayTripwire.ts
// Source: docs/decisions/0012-ch10-scheduler-autonomy.md §4
// Monday 6am ET — covenant scan + cash_lever on flip + weekly-cash-forecast output.

import * as path from 'path';
import * as fs from 'fs/promises';
import { randomUUID } from 'node:crypto';
import type { JobDegradedSource, TripwireState } from '@c-suite/shared-types/scheduled-job';
import type { JobRunContext } from '../scheduler/cron.js';
import { notifyTripwireFlip } from '../notifications/macNotify.js';
import { createLogger } from '../logger.js';

const CASH_LEVER_MODULE = '../playbooks/cash-lever/index.js';

const log = createLogger();

export interface TripwireCheckResult {
  tripwireId: string;
  currentState: TripwireState;
  previousState: TripwireState | null;
  flipped: boolean;
  value: number;
  threshold: number;
  unit: string;
}

/**
 * Load the last known tripwire states from SQLite.
 * Table: tripwire_states (tripwire_id TEXT, state TEXT, recorded_at INTEGER).
 * If table doesn't exist yet (pre-Day-Zero form), returns empty map.
 */
function loadPreviousStates(db: JobRunContext['db']): Map<string, TripwireState> {
  const map = new Map<string, TripwireState>();
  try {
    const rows = db.prepare(
      `SELECT tripwire_id, state FROM tripwire_states
       WHERE recorded_at = (SELECT MAX(recorded_at) FROM tripwire_states t2 WHERE t2.tripwire_id = tripwire_states.tripwire_id)`
    ).all() as { tripwire_id: string; state: TripwireState }[];
    for (const row of rows) {
      map.set(row.tripwire_id, row.state);
    }
  } catch {
    // Table may not exist yet — return empty (conservative defaults apply).
    log.warn({ message: 'tripwire_states table not found — using directional defaults (B6)' });
  }
  return map;
}

/**
 * Persist new tripwire states to SQLite.
 * Gracefully skips if table doesn't exist (pre-Day-Zero).
 */
function saveTripwireStates(db: JobRunContext['db'], results: TripwireCheckResult[]): void {
  const now = Date.now();
  try {
    // Ensure table exists.
    db.prepare(`
      CREATE TABLE IF NOT EXISTS tripwire_states (
        tripwire_id TEXT NOT NULL,
        state TEXT NOT NULL,
        value REAL,
        threshold REAL,
        recorded_at INTEGER NOT NULL,
        PRIMARY KEY (tripwire_id, recorded_at)
      )
    `).run();

    const insert = db.prepare(
      `INSERT OR REPLACE INTO tripwire_states (tripwire_id, state, value, threshold, recorded_at)
       VALUES (?, ?, ?, ?, ?)`
    );
    for (const r of results) {
      insert.run(r.tripwireId, r.currentState, r.value, r.threshold, now);
    }
  } catch (err) {
    log.error({ message: 'failed to save tripwire states', err: String(err) });
  }
}

/**
 * Conservative covenant thresholds (B6 mitigation: flagged "directional" until
 * Russell submits the Day-Zero form). These are placeholder defaults.
 */
const CONSERVATIVE_THRESHOLDS: Array<{ id: string; yellowPct: number; redPct: number; unit: string }> = [
  { id: 'cash-runway-weeks', yellowPct: 16, redPct: 8, unit: 'weeks' },
  { id: 'arr-churn-pct', yellowPct: 0.12, redPct: 0.20, unit: 'pct' },
  { id: 'nrr-pct', yellowPct: 0.95, redPct: 0.85, unit: 'pct' },
  { id: 'pipeline-coverage-ratio', yellowPct: 2.0, redPct: 1.5, unit: 'ratio' },
];

/**
 * Compute tripwire state from a current value vs conservative thresholds.
 * Returns GREEN / YELLOW / RED.
 */
function computeState(id: string, value: number): { state: TripwireState; threshold: number } {
  const threshold = CONSERVATIVE_THRESHOLDS.find(t => t.id === id);
  if (!threshold) return { state: 'GREEN', threshold: 0 };

  // For metrics where lower is worse (cash-runway, nrr, pipeline-coverage).
  // For metrics where higher is worse (arr-churn).
  const higherIsWorse = id === 'arr-churn-pct';
  if (higherIsWorse) {
    if (value >= threshold.redPct) return { state: 'RED', threshold: threshold.redPct };
    if (value >= threshold.yellowPct) return { state: 'YELLOW', threshold: threshold.yellowPct };
    return { state: 'GREEN', threshold: threshold.yellowPct };
  } else {
    if (value <= threshold.redPct) return { state: 'RED', threshold: threshold.redPct };
    if (value <= threshold.yellowPct) return { state: 'YELLOW', threshold: threshold.yellowPct };
    return { state: 'GREEN', threshold: threshold.yellowPct };
  }
}

export async function runMondayTripwire(
  ctx: JobRunContext,
): Promise<{ outputMemoPath?: string; degradedSources?: JobDegradedSource[] }> {
  const today = new Date().toISOString().slice(0, 10);
  const runId = randomUUID();
  const degradedSources: JobDegradedSource[] = [];

  log.info({ message: 'monday tripwire starting', date: today, runId });

  // Load previous states for flip detection.
  const previousStates = loadPreviousStates(ctx.db);

  // Stub values — real implementation queries NetSuite/Salesforce via MCP.
  // B6: flagged "directional" until Day-Zero form submitted.
  const currentValues: Record<string, number> = {
    'cash-runway-weeks': 24,        // directional placeholder
    'arr-churn-pct': 0.08,          // directional placeholder
    'nrr-pct': 1.02,                // directional placeholder
    'pipeline-coverage-ratio': 3.1, // directional placeholder
  };

  const results: TripwireCheckResult[] = CONSERVATIVE_THRESHOLDS.map(t => {
    const value = currentValues[t.id] ?? 0;
    const { state, threshold } = computeState(t.id, value);
    const previousState = previousStates.get(t.id) ?? null;
    const flipped = previousState !== null && previousState !== state;

    return {
      tripwireId: t.id,
      currentState: state,
      previousState,
      flipped,
      value,
      threshold,
      unit: t.unit,
    };
  });

  // Persist new states.
  saveTripwireStates(ctx.db, results);

  // Fire notifications + cash_lever for any flipped tripwire.
  const flipped = results.filter(r => r.flipped);
  let cashLeverMemoPath: string | undefined;

  for (const r of flipped) {
    log.info({ message: 'tripwire flipped', tripwireId: r.tripwireId, from: r.previousState, to: r.currentState });
    notifyTripwireFlip(ctx.emitIpc, r.tripwireId, r.previousState!, r.currentState);
  }

  if (flipped.length > 0) {
    try {
      const cashModule = (await import(CASH_LEVER_MODULE)) as unknown as import('@c-suite/shared-types/playbook').PlaybookModule;
      const { runPlaybookGuarded } = await import('../orchestrator/stubGuard.js');
      // B47 stub guard: refuses (STUB_MODE=live) if cash-lever still fabricates data.
      const cashResult = await runPlaybookGuarded(
        cashModule,
        'cash_lever',
        {
          playbookId: 'cash_lever',
          prompt: `Tripwire flip detected on ${today}: ${flipped.map(f => `${f.tripwireId} ${f.previousState}→${f.currentState}`).join(', ')}. Assess cash lever options.`,
          context: { tripwireFlips: flipped },
        },
        {
          runId,
          db: ctx.db,
          vaultPath: ctx.vaultRoot,
          emit: ctx.emitIpc,
          deps: {},
        },
      );

      const memosDir = path.join(ctx.vaultRoot, 'memos');
      await fs.mkdir(memosDir, { recursive: true });
      cashLeverMemoPath = path.join(memosDir, `${runId}.md`);
      await fs.writeFile(cashLeverMemoPath, cashResult.memoMarkdown, 'utf-8');
      for (const s of cashResult.degradedSources) degradedSources.push(s as JobDegradedSource);
    } catch (err) {
      log.error({ message: 'cash_lever playbook failed', err: String(err) });
      degradedSources.push('netsuite');
    }
  }

  // Always run weekly cash forecast (even if no flips).
  const reportsDir = path.join(ctx.vaultRoot, 'scheduled-reports');
  await fs.mkdir(reportsDir, { recursive: true });
  const forecastPath = path.join(reportsDir, `${today}-weekly-cash.md`);

  const directional = previousStates.size === 0 ? '\n\n> **DIRECTIONAL**: Conservative defaults applied — submit Day-Zero form for calibrated thresholds.' : '';

  const forecastContent = [
    `---`,
    `runId: ${runId}`,
    `stamp: WEEKLY_CASH`,
    `date: ${today}`,
    `degradedSources: ${JSON.stringify(degradedSources)}`,
    `---`,
    '',
    `# Weekly Cash Forecast — ${today}`,
    '',
    `## Tripwire Summary`,
    ...results.map(r => `- **${r.tripwireId}**: ${r.currentState} (value: ${r.value} ${r.unit}${r.flipped ? ` — FLIPPED from ${r.previousState}` : ''})`),
    directional,
    '',
    cashLeverMemoPath ? `## Cash Lever Analysis\nSee memo: ${cashLeverMemoPath}` : '## Cash Lever Analysis\nNo tripwire flips detected — no cash lever action required.',
  ].join('\n');

  await fs.writeFile(forecastPath, forecastContent, 'utf-8');

  log.info({ message: 'monday tripwire complete', forecastPath, flippedCount: flipped.length });

  return {
    outputMemoPath: forecastPath,
    degradedSources,
  };
}
