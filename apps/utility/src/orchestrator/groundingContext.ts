// apps/utility/src/orchestrator/groundingContext.ts
// Source: docs/decisions/0006-ch5-cash-lever-slice.md §1.3; handoff "wire buildLensBundle grounding".
//
// The interactive cash_lever run takes the Ch.5 generic 6-lens path (run-loop.ts), where
// buildLensBundle() ships an EMPTY contextDocuments array — so the lenses reason from the question
// alone and (per cfo.prompt.md) honestly report "no context documents → low confidence / UNKNOWN".
// This builder fills that gap: it reads REAL cash-model lever rows from the vault xlsx and packages
// them as a ContextDocument the lenses ground on + cite. It NEVER fabricates — if the xlsx is
// absent it returns [] and the lenses degrade honestly.
//
// Data-honesty (defense-in-depth): the document carries an explicit LEGEND + sign convention so a
// run with no modeled adjustments (all-zero adjustment columns) reads as "no scenario entered yet",
// NOT "no cash levers available".

import { z } from 'zod';
import { ContextDocumentSchema } from '@c-suite/shared-types/lens-output';
import { createLogger } from '../logger.js';
import { readXlsxLeverRows, resolveCashModelPath, defaultVaultPath, type LeverRow } from '../data/cash-model.js';
import path from 'node:path';

const log = createLogger();

export type ContextDoc = z.infer<typeof ContextDocumentSchema>;

function money(n: number | null): string {
  if (n == null) return '—';
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(n).toLocaleString('en-US')}`;
}

function leverRowsDoc(rows: LeverRow[], file: string): ContextDoc {
  const fileName = path.basename(file);
  const body = [
    `Source: ${fileName} → sheet "03_Cost_Levers" (read live from the vault at run time).`,
    '',
    'LEGEND / SIGN CONVENTION (read carefully before citing):',
    '- "Finance Forecast (34 wks)" is the current 34-week forecast per line item. NEGATIVE = cash OUTFLOW/cost; POSITIVE = cash INFLOW/collection.',
    '- "Annual Adjustment" is the modeled override input. A value of 0 means NO scenario has been entered for that lever yet — it does NOT mean the lever is unavailable or has zero potential.',
    '- "Weekly Impact" is the computed weekly cash effect of an entered adjustment; it is blank/0 when no adjustment has been modeled.',
    '- Treat these as the real cost/collection structure available to pull on; quantified scenarios require the operator to enter adjustments in the model.',
    '',
    '| Lever (Line Item) | Finance Forecast (34 wks) | Annual Adjustment | Weekly Impact | Notes / Rationale |',
    '|---|---|---|---|---|',
    ...rows.map(
      (r) => `| ${r.leverName} | ${money(r.currentValue)} | ${money(r.adjustedValue)} | ${money(r.cashImpact)} | ${r.notes ?? ''} |`,
    ),
  ].join('\n');
  return {
    id: 'cash-model-levers',
    title: 'Cash Lever Model — Cost Line Item Levers (live xlsx read)',
    content: body,
    source: fileName,
  };
}

/**
 * Build the grounding ContextDocuments for an interactive cash_lever run.
 * Currently grounds on the cash-model xlsx lever rows. Returns [] (honest degrade) if the file is
 * absent — callers MUST treat [] as "ungrounded" and never block the run on it.
 */
export function buildCashLeverGrounding(vaultDir: string = defaultVaultPath()): ContextDoc[] {
  const docs: ContextDoc[] = [];
  const file = resolveCashModelPath(vaultDir);
  if (!file) {
    log.info({ message: 'cash_lever grounding: no cash-model xlsx found in vault — lenses run ungrounded (honest UNKNOWN)' });
    return docs;
  }
  const rows = readXlsxLeverRows(file);
  if (rows.length === 0) {
    log.warn({ message: `cash_lever grounding: ${path.basename(file)} found but 03_Cost_Levers yielded 0 rows — ungrounded` });
    return docs;
  }
  docs.push(leverRowsDoc(rows, file));
  log.info({ message: `cash_lever grounding: ${rows.length} lever rows from ${path.basename(file)} → contextDocuments` });
  return docs;
}
