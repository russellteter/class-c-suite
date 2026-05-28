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
  'cash_lever', 'stakeholder_1_1', 'quick_read',
  'pre_mortem', 'gtm_realloc',
  'strategic_option', 'board_narrative', 'restructure_decision',
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
      // ADR-0008 §10.4 — additive field carrying the row's domain/topic pill.
      // Derived by writeback-engine/src/deriveTopic.ts per §10.1.
      topic: z.string(),
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
  // Ch.7 ADR-0009 §6 — playbook lifecycle IPC variants.
  // playbook.routed: emitted by open_qa when deterministic/LLM decomposer routes to a known playbook.
  z.object({
    kind: z.literal('playbook.routed'),
    payload: z.object({
      from: z.literal('open_qa'),
      to: z.string(),   // PlaybookId short name (ADR-0009 §3.2)
      runId: z.string(),
    }),
  }),
  // playbook.prereq.blocked: emitted by evaluatePrereqs when a playbook run is hard-blocked.
  z.object({
    kind: z.literal('playbook.prereq.blocked'),
    payload: z.object({
      playbookId: z.string(),
      reason: z.string(),
      remediation: z.string(),
    }),
  }),
  // playbook.prereq.degraded: emitted when prereq check returns degrade path.
  z.object({
    kind: z.literal('playbook.prereq.degraded'),
    payload: z.object({
      playbookId: z.string(),
      flags: z.array(z.string()),   // DegradedSource[]
    }),
  }),
  // playbook.stakeholder.skeleton_created: emitted when stakeholder_1_1 auto-creates a skeleton.
  z.object({
    kind: z.literal('playbook.stakeholder.skeleton_created'),
    payload: z.object({
      skeletonPath: z.string(),
      slug: z.string(),
      runId: z.string(),
    }),
  }),
  // B45 instrumentation: utility.crash.diagnostic — first-crash env dump + buffered stderr.
  // Emitted by supervisor once per crash cycle before the restart loop begins.
  // Renderer can ignore; useful for dev-mode diagnostics and crash triage.
  z.object({
    kind: z.literal('utility.crash.diagnostic'),
    payload: z.object({
      nodeVersion: z.string(),
      modulesAbi: z.string(),
      electronVersion: z.string().optional(),
      execPath: z.string(),
      stderr: z.string(),       // full buffered stderr from crash cycle
      stdout: z.string(),       // full buffered stdout from crash cycle
      exitCode: z.number().nullable(),
    }),
  }),
  // Ch.9 ADR-0011 §5.3 — Cowork handoff IPC variants.
  // handoff.preview.requested: renderer → main; explicit "Draw up for Cowork" trigger (NOT auto).
  z.object({
    kind: z.literal('handoff.preview.requested'),
    payload: z.object({
      runId: z.string(),
      originType: z.enum(['decision', 'memo', 'position', 'pre_mortem']),
      originId: z.string(),
    }),
  }),
  // handoff.preview.ready: main → renderer; generation complete.
  z.object({
    kind: z.literal('handoff.preview.ready'),
    payload: z.object({
      runId: z.string(),
      brief: z.unknown(),    // HandoffBrief — validated in utility before emit
    }),
  }),
  // handoff.send: renderer → main; Russell confirms the brief (possibly with edits).
  z.object({
    kind: z.literal('handoff.send'),
    payload: z.object({
      runId: z.string(),
      brief: z.unknown(),                   // HandoffBrief
      editedBodyMarkdown: z.string().optional(),
    }),
  }),
  // handoff.sent: main → renderer; SafeWrite + git commit succeeded.
  z.object({
    kind: z.literal('handoff.sent'),
    payload: z.object({
      runId: z.string(),
      handoffId: z.string(),
      path: z.string(),
    }),
  }),
  // handoff.cancelled: renderer → main; Russell cancelled preview without sending.
  z.object({
    kind: z.literal('handoff.cancelled'),
    payload: z.object({ runId: z.string() }),
  }),
  // handoff.failed: main → renderer; generation or write failed.
  z.object({
    kind: z.literal('handoff.failed'),
    payload: z.object({
      runId: z.string(),
      reason: z.string(),
    }),
  }),
  // Ch.6 ADR-0008 §3.3 — per-writeback iteration + accept/reject/edit IPC events.
  // Do NOT modify writeback.proposed / writeback.committed (existing shapes above).
  z.object({
    kind: z.literal('writeback.iteration.requested'),
    payload: z.object({
      writebackId: z.string(),
      russellFeedback: z.string(),
      requestedAt: z.number(),
    }),
  }),
  z.object({
    kind: z.literal('writeback.iteration.completed'),
    payload: z.object({
      writebackId: z.string(),
      iterationNumber: z.number(),
      newDraftPath: z.string(),
      verifierScoreAfter: z.number().nullable(),
      completedAt: z.number(),
    }),
  }),
  z.object({
    kind: z.literal('writeback.iteration.cap_reached'),
    payload: z.object({
      writebackId: z.string(),
      surfaceChoices: z.array(z.enum(['commit', 'reject', 'escalate-full-rerun'])),
    }),
  }),
  z.object({
    kind: z.literal('writeback.rejected'),
    payload: z.object({
      writebackId: z.string(),
      rationale: z.string(),
      archivedPath: z.string(),
      rejectedAt: z.number(),
    }),
  }),
  z.object({
    kind: z.literal('writeback.edited'),
    payload: z.object({
      writebackId: z.string(),
      editedPath: z.string(),
      editedAt: z.number(),
    }),
  }),
]);

export type IpcMessage = z.infer<typeof IpcMessage>;

/** Receivers (main, utility, renderer) call this on every incoming message. */
export function validateIpc(raw: unknown): IpcMessage {
  return IpcMessage.parse(raw);  // throws on invalid; receiver logs + drops
}
