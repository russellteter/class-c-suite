// packages/shared-types/src/ipc.ts
// Source: docs/architecture/runtime.md §IPC contract (lines 41-63) +
// docs/architecture/data.md §IPC type definitions (lines 477-505).
// All cross-process messages tagged with `kind`; validated at receive time.
//
// NOTE: ADR §9 row 7 states "22 variants" but ADR §3 enumerates 21.
// data.md lines 477-505 also do not add a 22nd. Shipping the 21 variants
// explicitly enumerated in ADR §3; surfaced as spec ambiguity in build-log.
import { z } from 'zod';

// --- Payload sub-schemas ---

const PlaybookId = z.enum([
  'cash_lever_vs_trough', 'stakeholder_1on1_prep', 'quick_multi_lens_read',
  'pre_mortem_on_proposed_action', 'gtm_resource_reallocation',
  'strategic_option_evaluation', 'board_narrative_prep', 'restructure_decision',
  'open_qa',
]);

const AgentRole = z.enum([
  'CEO', 'CFO', 'CRO', 'CMO', 'CPO', 'COS',
  'RedTeam', 'Steelman',
  'Synthesizer', 'Verifier',
  'Handoff', 'RunCritic',
]);

const McpService = z.enum([
  'salesforce', 'netsuite', 'aws', 'gmail', 'chorus', 'powerbi',
]);

const JobName = z.enum([
  'monday-tripwire',       // 6am ET financial tripwire + weekly cash forecast
  'monday-stakeholder',    // 7am ET stakeholder activity refresh
  'sunday-renewal',        // 6pm ET renewal forecast + Chorus sweep
  'sunday-dashboard',      // 8pm ET workstream dashboard regen + memory consolidation
  'daily-morning-brief',   // 6am ET six-lens compact read
]);

const JobPayload = z.object({
  jobName: JobName,
  jobId: z.string(),
  firedAt: z.number(),                      // ms epoch
  finishedAt: z.number().nullable().optional(),
  status: z.enum(['success', 'failed', 'degraded']).optional(),
  degradedSources: z.array(McpService).optional(),
  errorMessage: z.string().optional(),
});

// --- Discriminated union (21 variants — all kinds from ADR §3) ---

export const IpcMessage = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('run.start'),
    payload: z.object({
      runId: z.string(),
      playbook: PlaybookId,
      question: z.string(),
    }),
  }),
  z.object({
    kind: z.literal('run.plan.ready'),
    payload: z.object({
      runId: z.string(),
      planJson: z.string(),
      autoApproveAfterMs: z.number().nullable(),
    }),
  }),
  z.object({
    kind: z.literal('run.plan.approved'),
    payload: z.object({ runId: z.string() }),
  }),
  z.object({
    kind: z.literal('run.failed'),
    payload: z.object({
      runId: z.string(),
      reason: z.string(),
      stage: z.string(),                    // e.g. 'verifier-input-contract'
    }),
  }),
  z.object({
    kind: z.literal('agent.start'),
    payload: z.object({
      runId: z.string(),
      agentId: z.string(),
      role: AgentRole,
    }),
  }),
  z.object({
    kind: z.literal('agent.tool.pre'),
    payload: z.object({
      runId: z.string(),
      agentId: z.string(),
      tool: z.string(),
      args: z.unknown(),                    // full args persisted for click-through
    }),
  }),
  z.object({
    kind: z.literal('agent.tool.post'),
    payload: z.object({
      runId: z.string(),
      agentId: z.string(),
      tool: z.string(),
      result: z.unknown(),                  // FULL result, not summary (data.md L329)
      sourceId: z.string(),
      callId: z.string(),                   // join key to tool_calls SQLite row
    }),
  }),
  z.object({
    kind: z.literal('agent.complete'),
    payload: z.object({
      runId: z.string(),
      agentId: z.string(),
      role: AgentRole,
      structuredOutput: z.unknown(),        // parsed + validated per AgentDefinition.outputSchema
    }),
  }),
  z.object({
    kind: z.literal('agent.heartbeat'),     // B34 mitigation: NOT raw token events
    payload: z.object({
      runId: z.string(),
      agentId: z.string(),
      tokensSoFar: z.number(),
      messageSnippet: z.string().optional(),   // <=80 chars; for "thinking..." indicator
    }),
  }),
  z.object({
    kind: z.literal('synthesizer.draft'),
    payload: z.object({
      runId: z.string(),
      memoMarkdown: z.string(),
      citations: z.array(z.object({
        claimId: z.string(),
        sourceId: z.string(),
        callId: z.string(),
      })),
    }),
  }),
  z.object({
    kind: z.literal('verifier.score'),
    payload: z.object({
      runId: z.string(),
      score: z.number().int().min(0).max(100),
      breakdown: z.object({
        claim_source: z.number().int(),
        coverage: z.number().int(),
        red_team: z.number().int(),
        calibration: z.number().int(),
        falsifier: z.number().int(),
      }),
      failures: z.array(z.string()),
    }),
  }),
  z.object({
    kind: z.literal('writeback.proposed'),
    payload: z.object({
      runId: z.string(),
      writebackId: z.string(),
      artifactType: z.string(),
      draftPath: z.string(),
    }),
  }),
  z.object({
    kind: z.literal('writeback.committed'),
    payload: z.object({
      runId: z.string(),
      writebackId: z.string(),
      artifactPath: z.string(),
      gitSha: z.string(),
    }),
  }),
  z.object({
    kind: z.literal('safewrite.conflict'),
    payload: z.object({
      path: z.string(),
      sidecarPath: z.string(),
    }),
  }),
  z.object({
    kind: z.literal('scheduler.throttle'),
    payload: z.object({
      reason: z.string(),
      retryAt: z.number().nullable(),       // ms epoch or null if degraded-sequential
    }),
  }),
  z.object({
    kind: z.literal('job.started'),
    payload: JobPayload,
  }),
  z.object({
    kind: z.literal('job.finished'),
    payload: JobPayload,
  }),
  z.object({
    kind: z.literal('job.failed'),
    payload: JobPayload,
  }),
  z.object({
    kind: z.literal('mcp.auth.expired'),
    payload: z.object({
      service: McpService,
    }),
  }),
  z.object({
    kind: z.literal('vault.changed'),
    payload: z.object({
      path: z.string(),
      changeType: z.enum(['added', 'modified', 'deleted']),
    }),
  }),
  z.object({
    kind: z.literal('cost.usage'),
    payload: z.object({
      runId: z.string().optional(),
      jobId: z.string().optional(),
      tokensIn: z.number(),
      tokensOut: z.number(),
      windowRemainingTokens: z.number(),
      windowResetsAt: z.number(),
      totalCostUsdReference: z.number().optional(),   // B5: API-equivalent reference figure
    }),
  }),
  // ADR §5.6 — added Ch.1 (was UNKNOWN in Ch.0 IPC union; now 22 variants total)
  z.object({
    kind: z.literal('scheduler.window.reset'),
    payload: z.object({
      resetAt: z.number(),       // ms epoch
      newWindowCap: z.number(),  // tokens
    }),
  }),
  // Ch.2 G-1: vault.init.error — emitted when VaultNotInitializedError is thrown at startup.
  // Source: docs/decisions/0003-ch2-safewrite.md §G-1
  // Payload shape pinned by tests/unit/ipc.spec.ts (Test dispatch, DOCTRINE law #7).
  z.object({
    kind: z.literal('vault.init.error'),
    payload: z.object({
      message: z.string(),
      vaultPath: z.string().optional(),
    }),
  }),
  // B38 (2026-05-27): run.iteration.cap_reached — review.iterate fired after N=3.
  // Source: docs/research/phase-r-decisions.md §3 (N=3 hard cap)
  //         docs/reviews/ultrareview-2026-05-27.md "Critical Fix 4"
  z.object({
    kind: z.literal('run.iteration.cap_reached'),
    payload: z.object({
      runId: z.string(),
      writebackId: z.string(),
      maxIterations: z.number().int(),
    }),
  }),
  // B39 (2026-05-27): vault.commit.failed — SafeWrite git commit step errored.
  // Write itself succeeded; commit is non-fatal but visible.
  // Source: docs/reviews/ultrareview-2026-05-27.md "Critical Fix 5"
  z.object({
    kind: z.literal('vault.commit.failed'),
    payload: z.object({
      path: z.string(),
      error: z.string(),
      runId: z.string(),
    }),
  }),
]);

export type IpcMessage = z.infer<typeof IpcMessage>;

/** Receivers (main, utility, renderer) call this on every incoming message. */
export function validateIpc(raw: unknown): IpcMessage {
  return IpcMessage.parse(raw);  // throws on invalid; receiver logs + drops
}
