# Runtime & Orchestration Architecture

> The process architecture, the agent state machine, the SDK integration, the scheduler. Implementation contract for Chapters 0-3. Marks `🔍 R0/R1/R2 VERIFY:` where Phase R must confirm.

## Process architecture

Three processes, supervised by Electron main:

```
┌─────────────────────────────────────────────────────────────┐
│ Electron MAIN process (system-tray owner)                    │
│ - menubar app lifecycle, global hotkey, native notifs        │
│ - LaunchAgent registration (Ch.10)                           │
│ - safeStorage / Keychain access (Ch.8)                       │
│ - chokidar vault watch (Ch.2)                                │
│ - SQLite open (better-sqlite3)                               │
│ - spawns and supervises utility process                      │
└─────────────────────┬───────────────────────────┬────────────┘
                      │ IPC (typed discriminated union)        │
                      ▼                                        ▼
┌──────────────────────────────────┐    ┌─────────────────────────┐
│ Electron UTILITY process          │    │ Electron RENDERER       │
│ - Claude Agent SDK orchestrator   │    │ - React + UI            │
│ - parallel-independent lens fans  │    │ - round-table view       │
│ - SafeWrite executor              │    │ - memo viewer            │
│ - MCP clients                     │    │ - home screen            │
│ - token-budget scheduler          │    │ - subscribes to IPC      │
│ - emits PreToolUse/PostToolUse    │    │   events for live state  │
└──────────────────────────────────┘    └─────────────────────────┘
```

**Why three processes:**
- Main owns OS surface (tray icon, hotkey, notifications, file watches).
- Utility owns inference + side-effects (vault writes, MCP calls). Crashes here do not crash the UI. Supervised restart preserves the user's session.
- Renderer is presentation-only. No direct file access. No direct inference. All via IPC.
- The split also enforces security: renderer runs with `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` — locked principle, not optional.

🔍 R0 VERIFY: confirm Electron version target and the current pattern for spawning utility processes (`utilityProcess.fork()` vs older API).

## IPC contract

A single typed discriminated union spans main ↔ utility ↔ renderer. **All cross-process messages are tagged with `kind`** and validated at receive time via Zod. See `data.md` for the full schema.

```typescript
// shape (abridged — full schema in data.md)
type IpcMessage =
  | { kind: 'run.start';            payload: RunStartPayload }
  | { kind: 'run.plan.ready';       payload: RunPlan }
  | { kind: 'run.plan.approved';    payload: { runId: string } }
  | { kind: 'agent.start';          payload: { runId, agentId, role } }
  | { kind: 'agent.tool.pre';       payload: { runId, agentId, tool, args } }
  | { kind: 'agent.tool.post';      payload: { runId, agentId, tool, result, sourceId } }
  | { kind: 'agent.complete';       payload: { runId, agentId, structuredOutput } }
  | { kind: 'synthesizer.draft';    payload: { runId, memoMarkdown, citations } }
  | { kind: 'verifier.score';       payload: { runId, score, breakdown, failures } }
  | { kind: 'writeback.proposed';   payload: { runId, artifactType, draft } }
  | { kind: 'writeback.committed';  payload: { runId, artifactPath, gitSha } }
  | { kind: 'safewrite.conflict';   payload: { path, sidecarPath } }
  | { kind: 'scheduler.throttle';   payload: { reason, retryAt } }
  | { kind: 'job.started' | 'job.finished' | 'job.failed'; payload: JobPayload }
  | { kind: 'mcp.auth.expired';     payload: { service: McpService } }
  | { kind: 'cost.usage';           payload: { runId, tokensIn, tokensOut, windowRemaining } };
```

**All `runId`-bearing messages flow renderer-bound** so the round-table UI can reconstruct any run's live state from the IPC event stream alone.

## RunState machine

A typed state machine drives the full multi-agent loop. Implemented as a discriminated union of state objects with explicit transitions. Persisted to SQLite at every transition; resume-on-crash works.

```
                ┌───────────────────────┐
                │  bootstrap            │  load context bundle, identify playbook
                └────────┬──────────────┘
                         ▼
                ┌───────────────────────┐
                │  plan-approval        │  build RunPlan, surface to UI; auto-approve
                └────────┬──────────────┘  per playbook config (Phase R decision #6)
                         ▼
                ┌───────────────────────┐
                │  fan-out (parallel)   │  CEO, CFO, CRO, CMO, CPO, COS — independent
                └────────┬──────────────┘  contexts, no inter-agent dialogue
                         ▼
                ┌───────────────────────┐
                │  red-team + steelman  │  parallel; sees lens outputs only
                └────────┬──────────────┘
                         ▼
                ┌───────────────────────┐
                │  synthesizer          │  drafts memo; sees lens structured outputs,
                └────────┬──────────────┘  red-team/steelman, audit trail
                         ▼
                ┌───────────────────────┐
                │  verifier             │  scores; structurally isolated from lens
                └────────┬──────────────┘  reasoning traces (B3 enforcement)
                         ▼
                ┌───────────────────────┐
                │  ship clean / DRAFT   │  memo to vault via SafeWrite; rigor < 70 →
                └────────┬──────────────┘  DRAFT path with failure reasons
                         ▼
                ┌───────────────────────┐
                │  write-back proposal  │  positions/decisions/predictions/etc. drafted
                └────────┬──────────────┘
                         ▼
                ┌───────────────────────┐
                │  review (Russell)     │  accept / edit / reject / feedback (loop N≤3)
                └────────┬──────────────┘
                         ▼
                ┌───────────────────────┐
                │  commit                │  accepted artifacts flip proposed→active
                └────────┬──────────────┘
                         ▼
                ┌───────────────────────┐
                │  handoff (optional)   │  "Draw up for Cowork" path (Ch.9)
                └────────┬──────────────┘
                         ▼
                ┌───────────────────────┐
                │  run-critic           │  self-critique on rigor dimensions
                └───────────────────────┘
```

**Lens isolation enforcement.** Each lens runs in its own SDK invocation with its own context bundle. The orchestrator never passes one lens's output (reasoning trace OR structured output) to another lens during fan-out. Assertion in the orchestrator: `dispatchLens(role, contextBundle)` rejects if `contextBundle` contains any field tagged with another lens's role. This is a compile-time + runtime guard.

**Verifier input contract** (PRD §5 locked; B3 enforcement). The Verifier receives:
1. Synthesizer's draft memo markdown.
2. The full **structured outputs** of every lens that contributed (NOT their reasoning traces).
3. The complete **tool-call audit trail** with `sourceId` + retrieved excerpt per source claim.
4. Metadata of every position the memo cites (id, current confidence, last-retested date, supersession status).
5. Red-Team + Steelman outputs in full.

The Verifier input assembler **fails closed** if any of these are missing. Throws `VerifierInputContractViolation` — the run does NOT proceed to Verifier; orchestrator surfaces error and the synthesis re-runs with diagnostics.

## AgentDefinition shape

Each of the 12 agents is declared as a typed `AgentDefinition`. Concrete prompts in `prompts.md`.

```typescript
type AgentRole =
  | 'CEO' | 'CFO' | 'CRO' | 'CMO' | 'CPO' | 'COS'
  | 'RedTeam' | 'Steelman'
  | 'Synthesizer' | 'Verifier'
  | 'Handoff' | 'RunCritic';

type AgentDefinition = {
  role: AgentRole;
  systemPrompt: string;                  // verbatim from Invocation Guide / authored
  inputSchema: ZodSchema;                // what context bundle this agent receives
  outputSchema: ZodSchema;               // structured output (parsed + validated)
  toolAllowlist: ToolName[];             // which MCP tools this agent may call
  modelHint?: 'sonnet' | 'opus' | 'haiku'; // optional override (defaults per role)
  reasoningTokenBudget?: number;         // optional override
  citationRequired: boolean;             // lens: true; synthesizer: true; verifier: schema-driven
};
```

**Default model assignments** (subject to Phase R Track B billing-path verification):
- Lenses: Sonnet 4.6 default (good price/quality ratio; lens fan-out is the dominant token consumer).
- Synthesizer: Sonnet 4.6 (writes prose; doesn't need Opus-level reasoning).
- **Verifier: Opus 4.7** (grading needs the strongest reasoning; rigor of the rigor itself).
- Red-Team / Steelman: Sonnet 4.6.
- Handoff: Sonnet 4.6.
- RunCritic: Sonnet 4.6.

🔍 R1 VERIFY: confirm Claude Agent SDK current model IDs for Max-subscription auth + actual rate limits per model.

## SDK hooks integration

The Claude Agent SDK exposes lifecycle hooks. The C-Suite wires:

- **`SubagentStart`** → emit `IpcMessage<'agent.start'>`; round-table pulses node on.
- **`PreToolUse`** → emit `agent.tool.pre`; substance ribbon updates "in-flight tool" indicator.
- **`PostToolUse`** → emit `agent.tool.post` with `sourceId`; substance ribbon increments source count + verified citation ratio; tool result persists to audit trail (SQLite).
- **`SubagentStop`** → emit `agent.complete` with parsed structured output; round-table pulses node off; lens output written to in-memory run state for synthesizer pickup.
- **Partial messages (token streaming)** → optionally relayed to UI as "agent X is thinking…" indicator (low-priority; ship without if it complicates the protocol).

🔍 R1 VERIFY: confirm current hook names and signatures in Claude Agent SDK TypeScript (versions move).

## Token-budget concurrency scheduler

The scheduler caps concurrent agent invocations to fit inside the Claude Max 220K-token / 5-hour window, with headroom for Russell's external Claude usage (BLOCKERS B4).

```typescript
type SchedulerState = {
  windowStartedAt: Date;          // 5-hr window anchor
  tokensConsumed: number;         // input+output combined
  windowCap: number;              // configured (default 180_000 to leave headroom)
  inFlight: Map<RunId, AgentInvocation[]>;
  queue: PendingInvocation[];
  priority: 'interactive' | 'scheduled';
};
```

**Priority rule** (B4 mitigation): interactive runs (Russell-initiated) are **strict-priority** over scheduled jobs. If an interactive run arrives while scheduled jobs are running, scheduled-job agents that haven't started yet are paused; in-flight ones complete. The home-screen cost meter shows window-remaining at all times.

**Degradation rule:** if `tokensConsumed + estimatedAgentTokens > windowCap`, the scheduler downgrades the run from parallel to sequential (one lens at a time). Surface to UI as `scheduler.throttle` event so the round-table can visualize.

**Backoff on 429 / rate-limit errors:** exponential backoff with jitter; surface `scheduler.throttle` with retry-at. Never silently retry.

🔍 R1 VERIFY: confirm Claude Max actual 5-hour rolling window behavior + accurate model-specific token accounting on Max.

## Checkpoint and resume

Every state transition writes a checkpoint to SQLite. A crashed utility process resumes from the last checkpoint without re-running completed lenses.

```sql
-- runtime_store schema (excerpt)
CREATE TABLE runs (
  run_id TEXT PRIMARY KEY,
  playbook TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  current_state TEXT NOT NULL,
  plan_json TEXT,
  finished_at INTEGER,
  rigor_score INTEGER,
  status TEXT          -- 'in_progress' | 'shipped_clean' | 'shipped_draft' | 'failed'
);

CREATE TABLE agent_invocations (
  run_id TEXT REFERENCES runs(run_id),
  agent_role TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  structured_output_json TEXT,
  tokens_in INTEGER, tokens_out INTEGER
);

CREATE TABLE tool_calls (
  call_id TEXT PRIMARY KEY,
  run_id TEXT REFERENCES runs(run_id),
  agent_role TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  args_json TEXT NOT NULL,
  result_json TEXT,
  source_id TEXT,
  called_at INTEGER NOT NULL
);

CREATE TABLE writebacks (
  writeback_id TEXT PRIMARY KEY,
  run_id TEXT REFERENCES runs(run_id),
  artifact_type TEXT NOT NULL,
  artifact_path TEXT,
  proposed_at INTEGER NOT NULL,
  committed_at INTEGER,
  status TEXT          -- 'proposed' | 'accepted' | 'edited' | 'rejected' | 'iterating'
);
```

Full schema in `data.md`.

## Tool-call audit trail (the citation backbone)

Every MCP tool invocation records:
- `call_id` (uuid)
- `agent_role` (which lens made the call)
- `tool_name` + `args_json` (what was asked)
- `result_json` (what came back — full, not summarized)
- `source_id` (a short tag like `sf-opportunity-q3-renewal-list` that the agent inserts into any claim derived from this result)
- timestamp

**The Verifier consumes this table** when grading citations. A claim in the synthesizer's draft that references `source_id: sf-...` must have a matching `tool_calls` row, and the cited value must be derivable from `result_json`. Verifier failure on mismatch.

The renderer query for "click claim → see tool-call result" is a single join: `SELECT * FROM tool_calls WHERE call_id = (memo.citations[claim_idx].call_id)`.

## Concurrency model (within the utility process)

The utility process runs the orchestrator on a Node.js event loop. SDK calls are async. **The orchestrator never awaits inside a forEach;** parallel fan-out uses `Promise.all([dispatchLens('CEO', bundle), dispatchLens('CFO', bundle), ...])`.

The scheduler runs as a singleton inside the utility process and gates `dispatchLens` calls.

SafeWrite operations serialize per-file path (a `Map<path, Promise<void>>` chains writes to the same path). Different paths run concurrently.

## Bootstrap context bundle

When a run starts, the orchestrator builds a context bundle for each lens. The bundle is large but tightly scoped:

```typescript
type ContextBundle = {
  question: string;                       // Russell's actual question
  playbook: PlaybookId;
  date: string;                           // today's date (lens reasons about freshness)
  vault: {
    positions: PositionFrontmatter[];     // every active position
    decisions: DecisionFrontmatter[];     // active + recently-resolved
    workstreams: WorkstreamSummary[];     // status + 1-paragraph note
    stakeholders: StakeholderFrontmatter[]; // names + decision-rights + last activity
    preMortems: PreMortemSummary[];
    calibration: CalibrationSummary;      // recent Brier scores, drift signals
  };
  memory: string;                          // contents of MEMORY.md + linked files
  doctrine: {                              // the turnaround library + run-critique rubric
    relevantSections: string[];
  };
  toolAllowlist: ToolName[];               // which MCPs/tools this lens may call
};
```

**Memory.** Per RESEARCH.md R0, the orchestrator locates the correct `MEMORY.md` under `local-agent-mode-sessions/` and reads its `[[linked]]` files transitively. Cached in SQLite per session.

## Error handling

- **MCP service down** (e.g. NetSuite 503): lens proceeds with degraded data, flags `degraded_sources: ['netsuite']` in structured output; Synthesizer surfaces "ran without NetSuite — cash position unverified"; Verifier penalizes coverage but does not fail the run.
- **OAuth expired** (e.g. Gmail refresh-token revoked): emit `mcp.auth.expired`; UI surfaces re-consent prompt; current run pauses at `plan-approval` until reauthed (or Russell cancels).
- **Verifier input contract violation** (B3): throw, log, do NOT proceed. Send `IpcMessage<'run.failed'>` with reason; surface in UI as a build-team bug.
- **Scheduler 429**: backoff per above; runs queue rather than fail.
- **SafeWrite conflict**: write sidecar; emit `safewrite.conflict`; do NOT silently overwrite.

## Open items for Phase R

| Item | Sub-phase | Reference |
|---|---|---|
| Confirm Claude Agent SDK Max-subscription auth path | R1 | Track B |
| Confirm SDK hook names + signatures in current version | R1 | SDK current state |
| Confirm `utilityProcess.fork()` is current pattern (vs. older) | R1 | Electron current docs |
| Confirm Claude Max actual rate-limit math + 5-hr window behavior | R1 | B4 mitigation |
| Confirm `total_cost_usd` semantics on Max (B5) | R1 | scheduler design |
| Confirm Verifier model choice — Opus 4.7 vs Sonnet 4.6 — on Max budget | R1 | B3 enforcement strength |
