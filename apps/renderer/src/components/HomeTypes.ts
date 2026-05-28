// apps/renderer/src/components/HomeTypes.ts
// Source: tasks/ch7-renderer-brief.md §2
// Shared type definitions for Ch.7 Home screen components.
// All renderer-local; no cross-package import needed.

// Playbook IDs — short names per ADR-0009 §3.2 canonical.
// Source of truth: packages/shared-types/src/playbook.ts:15-23.
// Legacy long-name usages in classify-playbook.ts / run-plan-builder.ts / safewrite.ts /
// ipc.ts are pre-Ch.7 debt; migration scheduled before end-to-end IPC wiring.
export type PlaybookId =
  | 'cash_lever'
  | 'gtm_realloc'
  | 'strategic_option'
  | 'stakeholder_1_1'
  | 'board_narrative'
  | 'restructure_decision'
  | 'pre_mortem'
  | 'quick_read'
  | 'open_qa';

// Lens roles used in decomposer preview chips.
// Source: ipc.ts AgentRole enum — subset relevant to lens routing display.
export type LensRole = 'CEO' | 'CFO' | 'CRO' | 'CMO' | 'CPO' | 'COS';

// MCP service IDs used in decomposer preview chips.
// Source: ipc.ts McpService enum.
export type McpId = 'salesforce' | 'netsuite' | 'aws' | 'gmail' | 'chorus' | 'powerbi';

// ── Playbook tile data ────────────────────────────────────────────────────────

export type FreshnessState = 'green' | 'amber' | 'gray';

export interface PlaybookTileData {
  ordinal: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  id: PlaybookId;
  name: string;
  icon: string;
  lastRunAt: Date | null;
  freshness: FreshnessState;
  keyboardHint: string;
  blocked?: boolean;
  blockedReason?: string;
}

// ── Rail data types ───────────────────────────────────────────────────────────

export interface WorkstreamSummary {
  id: string;
  status: 'GREEN' | 'YELLOW' | 'RED';
  phase: string;
}

export interface DecisionSummary {
  id: string;
  title: string;
}

export type JobRunStatus = 'succeeded' | 'failed' | 'caught_up' | 'skipped_auth_expired';

export interface ScheduledJobStatus {
  id: string;
  name: string;
  /** Set only when job not yet live — e.g. "Pending Ch.10". Falls back to placeholder render. */
  pendingNote?: string;
  /** Human-readable cron summary, e.g. "Mondays 6am ET". */
  cronSummary?: string;
  /** ISO timestamp of last run, or null if never run. */
  lastRunAt?: string | null;
  /** Status of most recent run. */
  lastRunStatus?: JobRunStatus;
  /** Source service IDs that returned degraded/partial data. */
  degradedSources?: string[];
  /** Path to output memo file; present when the job wrote a memo. */
  outputMemoPath?: string;
  /** Auth-expired service name, populated when status is skipped_auth_expired. */
  authExpiredService?: string;
}

// ── Home aggregated data ──────────────────────────────────────────────────────

export interface HomeData {
  workstreams: WorkstreamSummary[];
  decisions: DecisionSummary[];
  writebackCount: number;
  costUsage: {
    windowPct: number;
    todayUsd: number | null;
    weekUsd: number | null;
  } | null;
}
