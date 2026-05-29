// apps/renderer/src/hooks/useHomeData.ts
// Source: tasks/ch7-renderer-brief.md §3
// Subscribes to renderer-side IPC variants for home screen data.
// Phase A: IPC events for workstreams/decisions/writebackCount may not exist yet
// (Runtime sub-agent owns the wiring). Falls back to empty arrays + nulls.
// Each pending wire is flagged with // TODO ch7-phase-b: wire <variant>.

import { useEffect, useState, useMemo } from 'react';
import type { IpcMessage } from '@c-suite/shared-types/ipc';
import type { WorkstreamSummary, DecisionSummary, HomeData } from '../components/HomeTypes.js';

const WINDOW_CAP = 180_000; // tokens — matches scheduler.window.reset in ADR §3

export function useHomeData(): HomeData {
  const [workstreams, setWorkstreams] = useState<WorkstreamSummary[]>([]);
  const [decisions, setDecisions] = useState<DecisionSummary[]>([]);
  const [writebackCount, setWritebackCount] = useState<number>(0);
  // Seed to 0 (0% of the 5-hr window used) rather than null so the meter shows the real
  // current usage immediately instead of sticking on "USAGE LOADING…". cost_ledger is empty
  // until a completed run records token spend (separate gap), at which point the live
  // cost.usage push below replaces this seed with the reconciled figure.
  const [windowPct, setWindowPct] = useState<number | null>(0);
  const [todayUsd, setTodayUsd] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ipc) return;

    const cleanup = window.ipc.on('ipc:message', (raw: unknown) => {
      const msg = raw as IpcMessage;
      if (!msg || typeof msg.kind !== 'string') return;

      if (msg.kind === 'cost.usage') {
        const remaining = msg.payload.windowRemainingTokens;
        const used = WINDOW_CAP - remaining;
        setWindowPct(Math.min(100, (used / WINDOW_CAP) * 100));
        if (msg.payload.totalCostUsdReference != null) {
          setTodayUsd(msg.payload.totalCostUsdReference);
        }
      }

      // TODO ch7-phase-b: wire home.workstreams variant when Runtime exposes it.
      // Source: workstream_amounts_mirror SQLite table (ADR-0009 §13.3 + B12 mitigation).
      // Expected shape: { kind: 'home.workstreams', payload: { workstreams: WorkstreamSummary[] } }
      if ((msg as { kind: string }).kind === 'home.workstreams') {
        const payload = ((msg as unknown) as { kind: string; payload: { workstreams: WorkstreamSummary[] } }).payload;
        setWorkstreams(payload.workstreams ?? []);
      }

      // TODO ch7-phase-b: wire home.decisions variant when Runtime exposes it.
      // Expected shape: { kind: 'home.decisions', payload: { decisions: DecisionSummary[] } }
      if ((msg as { kind: string }).kind === 'home.decisions') {
        const payload = ((msg as unknown) as { kind: string; payload: { decisions: DecisionSummary[] } }).payload;
        setDecisions(payload.decisions ?? []);
      }

      // TODO ch7-phase-b: wire home.writebackCount variant when Runtime exposes it.
      // Expected shape: { kind: 'home.writebackCount', payload: { count: number } }
      if ((msg as { kind: string }).kind === 'home.writebackCount') {
        const payload = ((msg as unknown) as { kind: string; payload: { count: number } }).payload;
        setWritebackCount(payload.count ?? 0);
      }

      // Derive writeback count from writeback.proposed events as a fallback until
      // home.writebackCount is wired (Phase B).
      if (msg.kind === 'writeback.proposed') {
        setWritebackCount((prev) => prev + 1);
      }
      if (msg.kind === 'writeback.committed' || msg.kind === 'writeback.rejected') {
        setWritebackCount((prev) => Math.max(0, prev - 1));
      }
    });

    return cleanup;
  }, []);

  return useMemo(
    () => ({
      workstreams,
      decisions,
      writebackCount,
      costUsage:
        windowPct !== null
          ? { windowPct, todayUsd, weekUsd: null }
          : null,
    }),
    [workstreams, decisions, writebackCount, windowPct, todayUsd],
  );
}
