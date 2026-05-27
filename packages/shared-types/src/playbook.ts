// packages/shared-types/src/playbook.ts
// Source: docs/decisions/0009-ch7-playbooks-home.md §3.1
// Playbook framework types for all 9 playbooks (8 V1 + open_qa).
//
// DECISION (2026-05-27 ch.7 build): PlaybookId uses the SHORT names from ADR-0009 §3.2.
// The existing ipc.ts has a LOCAL PlaybookId enum with LONG names ('cash_lever_vs_trough', etc.)
// for existing run.start payload — left untouched per "do not change existing IPC payload shapes"
// constraint. The two coexist; Phase B should reconcile them. Logged here per DOCTRINE law #9.

import { z } from 'zod';

// ── PlaybookId (short canonical names per ADR-0009 §3.2) ─────────────────────

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

export const PlaybookIdSchema = z.enum([
  'cash_lever',
  'gtm_realloc',
  'strategic_option',
  'stakeholder_1_1',
  'board_narrative',
  'restructure_decision',
  'pre_mortem',
  'quick_read',
  'open_qa',
]);

// ── Stamp enum per ADR-0009 §3.3 ─────────────────────────────────────────────

export type Stamp =
  | 'CLEAN'
  | 'DRAFT'
  | 'QUICK_READ'
  | 'DECOMPOSED_AD_HOC'
  | 'DEGRADED'
  | 'STAKEHOLDER_SKELETON'
  | 'ADVERSARIAL_ONLY';

// ── LensRole re-export ────────────────────────────────────────────────────────
// Source: packages/shared-types/src/agent-definition.ts

export type { LensRole } from './agent-definition.js';

// ── DegradedSource — moved here from cash-lever/index.ts for framework use ───
// cash-lever/index.ts re-exports for back-compat (see adapter shim in §3).

export type DegradedSource =
  | 'aws'
  | 'netsuite'
  | 'salesforce'
  | 'cash_model'
  | 'powerbi'
  | 'gmail'
  | 'chorus'
  | 'calibration';

// ── McpId — alias of existing McpService union from ipc.ts ───────────────────

export type McpId = 'salesforce' | 'netsuite' | 'aws' | 'gmail' | 'chorus' | 'powerbi';

// ── MCP + external client stubs (structural — real wiring in Ch.8) ──────────

export interface SalesforceClient { __kind: 'salesforce' }
export interface NetSuiteClient { __kind: 'netsuite' }
export interface AwsClient { __kind: 'aws' }
export interface GmailClient { __kind: 'gmail' }
export interface ChorusClient { __kind: 'chorus' }
export interface PowerBiClient { __kind: 'powerbi' }
export interface CalibrationReader { __kind: 'calibration' }

// ── SafeWriteClient — structural alias for the existing safeWrite function ───

export interface SafeWriteClient {
  write(args: {
    absPath: string;
    content: string;
    agent: string;
    playbook: string;
    runId: string;
  }): Promise<{ ok: boolean; sha?: string; conflict?: boolean; sidecarPath?: string }>;
}

// ── PlaybookDeps per ADR-0009 §3.1 ───────────────────────────────────────────

export interface PlaybookDeps {
  salesforce?: SalesforceClient;
  netsuite?: NetSuiteClient;
  aws?: AwsClient;
  gmail?: GmailClient;
  chorus?: ChorusClient;
  powerbi?: PowerBiClient;
  calibration?: CalibrationReader;
}

// ── PlaybookContext per ADR-0009 §3.1 ────────────────────────────────────────

import type Database from 'better-sqlite3';
import type { IpcMessage } from './ipc.js';

export interface PlaybookContext {
  runId: string;
  db: Database.Database;
  vaultPath: string;
  emit: (msg: IpcMessage) => void;
  deps: PlaybookDeps;
}

// ── PlaybookInput per ADR-0009 §3.1 (Zod schema — wire-crossing type) ────────

export const PlaybookInputSchema = z.object({
  playbookId: PlaybookIdSchema,
  prompt: z.string(),
  context: z.record(z.string(), z.unknown()).optional(),
});
export type PlaybookInput = z.infer<typeof PlaybookInputSchema>;

// ── ProposedWriteback — structural alias for Ch.6 WritebackDraft ─────────────
// Full schema lives in writeback.ts; alias here so PlaybookResult stays self-contained.

export type ProposedWriteback = {
  writebackId: string;
  artifactType: string;
  draftPath: string;
  description: string;
  topic: string;
  [k: string]: unknown;
};

// ── PlaybookResult per ADR-0009 §3.1 + §13.6 (rigorRawScore for open_qa) ────

export const PlaybookResultSchema = z.object({
  memoMarkdown: z.string(),
  degradedSources: z.array(z.string()),
  lensOutputs: z.record(z.string(), z.unknown()),
  stamps: z.array(z.string()),
  rigorScore: z.number().nullable(),
  rigorThreshold: z.number(),
  rigorRawScore: z.number().nullable().optional(),  // open_qa only — raw pre-cap score (§13.6)
  proposedWritebacks: z.array(z.unknown()),
});
export type PlaybookResult = z.infer<typeof PlaybookResultSchema>;

// ── PlaybookModule — the contract every playbook directory exports ────────────

export interface PlaybookModule {
  runPlaybook(input: PlaybookInput, ctx: PlaybookContext): Promise<PlaybookResult>;
}

// ── DecompositionResult — open_qa decomposer output (ADR-0009 §12.2) ─────────

export type DecompositionResult =
  | { kind: 'route_to_playbook'; playbookId: PlaybookId }
  | {
      kind: 'ad_hoc';
      lenses: LensRoleImport[];
      mcps: McpId[];
      outputShape: 'memo' | 'list' | 'table';
    };

// Local type alias to avoid import cycle with agent-definition
type LensRoleImport = 'CEO' | 'CFO' | 'CRO' | 'CMO' | 'CPO' | 'COS';

// ── PrereqDecision — evaluatePrereqs output (ADR-0009 §3.6) ──────────────────

export type PrereqDecision =
  | { kind: 'block'; reason: string; remediation: string }
  | { kind: 'degrade'; flags: DegradedSource[] }
  | { kind: 'proceed' };
