// apps/renderer/src/hooks/useRuns.ts
// Reads the persisted runs via the runs:list IPC channel (main owns the DB handle) and keeps
// them fresh as runs start/complete. Powers the Home tiles' real per-playbook freshness and the
// Recent Runs list that routes a completed run to the MemoViewer (App.handleViewMemo → memo:read).

import { useEffect, useState, useCallback } from 'react';

export interface RunListItem {
  runId: string;
  playbook: string;
  question: string;
  startedAt: Date | null;
  finishedAt: Date | null;
  status: string | null;
  /** Vault-relative memo path; non-null once a run has SafeWritten its memo. */
  memoPath: string | null;
  rigorScore: number | null;
}

interface RawRunRow {
  run_id: string;
  playbook: string;
  question: string;
  started_at: number | null;
  finished_at: number | null;
  status: string | null;
  memo_path: string | null;
  rigor_score: number | null;
}

// runs.started_at / finished_at are unixepoch() SECONDS (not ms) — convert for a JS Date.
function toDate(sec: number | null | undefined): Date | null {
  return typeof sec === 'number' && sec > 0 ? new Date(sec * 1000) : null;
}

function mapRow(r: RawRunRow): RunListItem {
  return {
    runId: r.run_id,
    playbook: r.playbook,
    question: r.question,
    startedAt: toDate(r.started_at),
    finishedAt: toDate(r.finished_at),
    status: r.status,
    memoPath: r.memo_path,
    rigorScore: r.rigor_score,
  };
}

export function useRuns(): { runs: RunListItem[]; refresh: () => void } {
  const [runs, setRuns] = useState<RunListItem[]>([]);

  const refresh = useCallback(() => {
    if (typeof window === 'undefined' || !window.ipc?.invoke) return;
    window.ipc
      .invoke('runs:list')
      .then((rows) => {
        if (Array.isArray(rows)) setRuns((rows as RawRunRow[]).map(mapRow));
      })
      .catch(() => {
        /* main not ready / no handler — keep the prior list rather than clearing it. */
      });
  }, []);

  useEffect(() => {
    refresh();
    if (typeof window === 'undefined' || !window.ipc?.on) return;
    // Re-fetch on the run signals that actually flow utility→renderer. There is no run-level
    // success event (only agent.* + run.failed), and the row's memo_path is written at run
    // completion, so the refresh after the final agent.complete surfaces the memo. A fresh mount
    // (or explicit refresh) is the authoritative read — these events keep the list reactive.
    const cleanup = window.ipc.on('ipc:message', (raw: unknown) => {
      const kind = (raw as { kind?: string })?.kind;
      if (kind === 'agent.start' || kind === 'agent.complete' || kind === 'run.failed') {
        refresh();
      }
    });
    return cleanup;
  }, [refresh]);

  return { runs, refresh };
}
