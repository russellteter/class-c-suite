// apps/renderer/src/components/HomeTypes.ts
// Source: tasks/ch7-renderer-brief.md §2
// Shared type definitions for Ch.7 Home screen components.
// All renderer-local; no cross-package import needed.

// Playbook IDs mirror the canonical enum at packages/shared-types/src/ipc.ts:13-18.
// Inlined here to avoid deep package coupling; keep in sync if the union changes.
export type PlaybookId =
  | 'cash_lever_vs_trough'
  | 'stakeholder_1on1_prep'
  | 'quick_multi_lens_read'
  | 'pre_mortem_on_proposed_action'
  | 'gtm_resource_reallocation'
  | 'strategic_option_evaluation'
  | 'board_narrative_prep'
  | 'restructure_decision'
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

export interface ScheduledJobStatus {
  id: string;
  name: string;
  pendingNote?: string;
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
