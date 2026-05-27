# ADR-0004 — Ch.3: Runtime Spine + Stub Harness

**Status**: Accepted  
**Date**: 2026-05-27  
**Author**: Backend Architect (Ch.3)  
**Grader**: Audit/QA (Ch.3 — separate per DOCTRINE law #7)  
**Depends on**: ADR-0001 (Ch.0), ADR-0002 (Ch.1), ADR-0003 (Ch.2)  
**Implements**: ROADMAP §Ch.3 exit criteria  
**Addresses**: BLOCKERS B3 (P0 — Verifier reasoning-trace leak, keystone)

---

## Context

Ch.0 laid the Electron shell, IPC discriminated union, shared types, and stub harness skeleton. Ch.1 defined the three-process architecture, SQLite schema (runs, agent_invocations, tool_calls, process_events, cost_ledger), Scheduler, HeartbeatEmitter, and resumeRun stub. Ch.2 defined SafeWrite.

Ch.3 wires the runtime spine: the typed RunState machine, 12 AgentDefinitions (skeletons — prompts deferred to Ch.4), Claude Agent SDK hook integration, lens isolation enforcement (B3 keystone), the Verifier input contract assembler (B3 load-bearing), stub harness first real use, and node-granular checkpoint resume.

This is a SPEC-ONLY document. No production code ships in Ch.3. Runtime dispatch (Ch.3 implementation), lens prompts (Ch.4), rigorScore() (Ch.4), and UI (Ch.5) are out of scope.

---

## Section 1 — RunState Discriminated Union

### 1.1 State Union Definition

Per `docs/architecture/runtime.md` §RunState machine. Located at `packages/shared-types/src/run-state.ts`.

```typescript
import { z } from 'zod';
import type { AgentRole } from './ipc.js';         // Ch.0 ADR §3
import type { RunPlan } from './run-plan.js';        // new in Ch.3
import type { LensOutput } from './lens-output.js'; // new in Ch.3
import type { RedTeamOutput } from './red-team.js'; // new in Ch.3
import type { SteelmanOutput } from './steelman.js'; // new in Ch.3
import type { Memo } from './memo.js';               // new in Ch.3
import type { VerifierInput } from './verifier-input.js'; // Section 5
import type { WritebackDraft } from './writeback.js'; // new in Ch.3
import type { RunCritiqueOutput } from './run-critique.js'; // new in Ch.3

export type RunState =
  | { kind: 'bootstrap';           runId: string; playbook: string; question: string }
  | { kind: 'plan-approval';       runId: string; plan: RunPlan }
  | { kind: 'fan-out';             runId: string; lensesInFlight: AgentRole[]; lensesComplete: AgentRole[] }
  | { kind: 'red-team-steelman';   runId: string; lensOutputs: LensOutput[] }
  | { kind: 'synthesizer';         runId: string; redTeam: RedTeamOutput; steelman: SteelmanOutput; lensOutputs: LensOutput[] }
  | { kind: 'verifier';            runId: string; memo: Memo; verifierInput: VerifierInput }
  | { kind: 'shipped-clean';       runId: string; memoPath: string; rigorScore: number }
  | { kind: 'shipped-draft';       runId: string; memoPath: string; failureReasons: string[] }
  | { kind: 'write-back-proposed'; runId: string; drafts: WritebackDraft[] }
  | { kind: 'review';              runId: string; writebackId: string; iteration: number }
  | { kind: 'committed';           runId: string }
  | { kind: 'handoff';             runId: string; handoffPath: string }
  | { kind: 'run-critic';          runId: string; runCritique: RunCritiqueOutput }
  | { kind: 'failed';              runId: string; error: RunFailedError };

export type RunFailedError = {
  code: string;
  message: string;
  recoverableAt?: RunState['kind'];
};
```

### 1.2 Zod Runtime Schema

A Zod schema mirrors the TypeScript type for SQLite serialisation and deserialisation. The discriminated union is validated on every `loadState(runId)` call.

```typescript
// packages/shared-types/src/run-state-schema.ts
export const RunStateSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('bootstrap'),           runId: z.string(), playbook: z.string(), question: z.string() }),
  z.object({ kind: z.literal('plan-approval'),       runId: z.string(), plan: RunPlanSchema }),
  z.object({ kind: z.literal('fan-out'),             runId: z.string(), lensesInFlight: z.array(AgentRoleSchema), lensesComplete: z.array(AgentRoleSchema) }),
  z.object({ kind: z.literal('red-team-steelman'),   runId: z.string(), lensOutputs: z.array(LensOutputSchema) }),
  z.object({ kind: z.literal('synthesizer'),         runId: z.string(), redTeam: RedTeamOutputSchema, steelman: SteelmanOutputSchema, lensOutputs: z.array(LensOutputSchema) }),
  z.object({ kind: z.literal('verifier'),            runId: z.string(), memo: MemoSchema, verifierInput: VerifierInputSchema }),
  z.object({ kind: z.literal('shipped-clean'),       runId: z.string(), memoPath: z.string(), rigorScore: z.number() }),
  z.object({ kind: z.literal('shipped-draft'),       runId: z.string(), memoPath: z.string(), failureReasons: z.array(z.string()) }),
  z.object({ kind: z.literal('write-back-proposed'), runId: z.string(), drafts: z.array(WritebackDraftSchema) }),
  z.object({ kind: z.literal('review'),              runId: z.string(), writebackId: z.string(), iteration: z.number().int().min(1) }),
  z.object({ kind: z.literal('committed'),           runId: z.string() }),
  z.object({ kind: z.literal('handoff'),             runId: z.string(), handoffPath: z.string() }),
  z.object({ kind: z.literal('run-critic'),          runId: z.string(), runCritique: RunCritiqueOutputSchema }),
  z.object({ kind: z.literal('failed'),              runId: z.string(), error: RunFailedErrorSchema }),
]);
```

### 1.3 Transition Function

```typescript
// apps/utility/src/state-machine.ts

/**
 * Pure transition function — no side effects.
 * Returns new state or RunFailedError on illegal transition.
 * Persist BEFORE exposing the new state to any downstream caller.
 */
export function transition(
  state: RunState,
  event: RunEvent,
  db: Database,             // better-sqlite3 instance owned by main process (proxied via IPC)
): RunState | RunFailedError {
  // 1. Validate event is legal from current state.kind
  // 2. Compute next state
  // 3. Persist: UPDATE runs SET current_state = ? WHERE run_id = ?
  // 4. INSERT INTO state_transitions (run_id, from_state, to_state, event, ts)
  // 5. Return next state (or RunFailedError for illegal transitions)
}
```

### 1.4 Legal Transitions

| From | Allowed → | Notes |
|------|-----------|-------|
| `bootstrap` | `plan-approval` | After plan generated |
| `plan-approval` | `fan-out` | Plan accepted |
| `plan-approval` | `failed` | Explicit rejection |
| `fan-out` | `fan-out` | Each lens completion updates lensesInFlight/lensesComplete (in-place update) |
| `fan-out` | `red-team-steelman` | All lenses complete |
| `red-team-steelman` | `synthesizer` | Both complete |
| `synthesizer` | `verifier` | Draft memo ready |
| `verifier` | `shipped-clean` | rigorScore >= threshold |
| `verifier` | `shipped-draft` | rigorScore < threshold |
| `shipped-clean` | `write-back-proposed` | If write-backs exist |
| `shipped-clean` | `run-critic` | No write-backs |
| `shipped-draft` | `run-critic` | Always |
| `write-back-proposed` | `review` | Write-back sent |
| `review` | `committed` | Accepted |
| `review` | `write-back-proposed` | Iteration (max 3) |
| `committed` | `run-critic` | Final critique |
| `run-critic` | `handoff` | Handoff generated |
| `handoff` | (terminal) | End of run |
| any | `failed` | Unrecoverable error |

### 1.5 SQLite Persistence Contract

Every call to `transition()` MUST:
1. Execute `UPDATE runs SET current_state = json(?), updated_at = unixepoch() WHERE run_id = ?` atomically within a transaction.
2. Execute `INSERT INTO state_transitions (run_id, from_kind, to_kind, event_json, ts) VALUES (?, ?, ?, json(?), unixepoch())`.
3. Both writes are a single SQLite transaction — partial writes are illegal.
4. `current_state` column stores the full RunState as JSON (Zod-serialised).

SQLite table additions required in Ch.3 migration (migration 002):

```sql
CREATE TABLE IF NOT EXISTS state_transitions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id      TEXT    NOT NULL REFERENCES runs(run_id),
  from_kind   TEXT    NOT NULL,
  to_kind     TEXT    NOT NULL,
  event_json  TEXT    NOT NULL,
  ts          INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_st_run_id ON state_transitions(run_id, ts);
```

---

## Section 2 — 12 AgentDefinitions (Skeletons)

Per `docs/architecture/runtime.md` §AgentDefinition shape. Located at `apps/utility/src/agents/`. Full prompts deferred to Ch.4. `systemPrompt` is a stub string in all definitions below.

### 2.0 AgentDefinition Shape

```typescript
// packages/shared-types/src/agent-definition.ts
import type { ZodSchema } from 'zod';

export type AgentRole =
  | 'CEO' | 'CFO' | 'CRO' | 'CMO' | 'CPO' | 'COS'
  | 'RedTeam' | 'Steelman' | 'Synthesizer' | 'Verifier'
  | 'Handoff' | 'RunCritic';

export type LensRole = 'CEO' | 'CFO' | 'CRO' | 'CMO' | 'CPO' | 'COS';

export const LENS_ROLES: readonly LensRole[] = ['CEO', 'CFO', 'CRO', 'CMO', 'CPO', 'COS'];

export interface AgentDefinition<I, O> {
  role: AgentRole;
  modelHint: 'claude-sonnet-4-6' | 'claude-opus-4-7';
  systemPrompt: string;        // stub in Ch.3; full prompts in Ch.4
  inputSchema: ZodSchema<I>;
  outputSchema: ZodSchema<O>;
  toolAllowlist: string[];     // MCP tool IDs; placeholder in Ch.3
  citationRequired: boolean;
}
```

### 2.1 CEO — Chief Executive Officer Lens

```typescript
// Role: strategic vision, mission alignment, leadership posture
const CEOInputSchema = z.object({
  runId: z.string(),
  role: z.literal('CEO'),
  question: z.string(),
  playbook: z.string(),
  contextDocuments: z.array(ContextDocumentSchema),
});

const CEOOutputSchema = z.object({
  role: z.literal('CEO'),
  runId: z.string(),
  summary: z.string().min(1),
  positions: z.array(PositionSchema),          // cited positions
  citations: z.array(CitationSchema).min(1),   // citationRequired = true
  confidence: z.number().min(0).max(1),
});

export const CEODefinition: AgentDefinition<CEOInput, CEOOutput> = {
  role: 'CEO',
  modelHint: 'claude-sonnet-4-6',
  systemPrompt: 'STUB — see Ch.4',
  inputSchema: CEOInputSchema,
  outputSchema: CEOOutputSchema,
  toolAllowlist: [],   // Ch.4+
  citationRequired: true,
};
```

### 2.2 CFO — Chief Financial Officer Lens

```typescript
// Role: financial analysis, ROI, capital allocation, risk-adjusted returns
const CFOInputSchema = z.object({
  runId: z.string(),
  role: z.literal('CFO'),
  question: z.string(),
  playbook: z.string(),
  contextDocuments: z.array(ContextDocumentSchema),
  financialMetrics: z.record(z.string(), z.unknown()).optional(),
});

const CFOOutputSchema = z.object({
  role: z.literal('CFO'),
  runId: z.string(),
  summary: z.string().min(1),
  positions: z.array(PositionSchema),
  citations: z.array(CitationSchema).min(1),
  confidence: z.number().min(0).max(1),
  quantitativeAssertions: z.array(QuantitativeAssertionSchema), // isQuantOrNamed Ch.4
});

export const CFODefinition: AgentDefinition<CFOInput, CFOOutput> = {
  role: 'CFO',
  modelHint: 'claude-sonnet-4-6',
  systemPrompt: 'STUB — see Ch.4',
  inputSchema: CFOInputSchema,
  outputSchema: CFOOutputSchema,
  toolAllowlist: [],
  citationRequired: true,
};
```

### 2.3 CRO — Chief Revenue Officer Lens

```typescript
// Role: revenue growth, pipeline, GTM, customer acquisition
const CROInputSchema = z.object({
  runId: z.string(),
  role: z.literal('CRO'),
  question: z.string(),
  playbook: z.string(),
  contextDocuments: z.array(ContextDocumentSchema),
});

const CROOutputSchema = z.object({
  role: z.literal('CRO'),
  runId: z.string(),
  summary: z.string().min(1),
  positions: z.array(PositionSchema),
  citations: z.array(CitationSchema).min(1),
  confidence: z.number().min(0).max(1),
});

export const CRODefinition: AgentDefinition<CROInput, CROOutput> = {
  role: 'CRO',
  modelHint: 'claude-sonnet-4-6',
  systemPrompt: 'STUB — see Ch.4',
  inputSchema: CROInputSchema,
  outputSchema: CROOutputSchema,
  toolAllowlist: [],
  citationRequired: true,
};
```

### 2.4 CMO — Chief Marketing Officer Lens

```typescript
// Role: brand, positioning, marketing strategy, communications
const CMOInputSchema = z.object({
  runId: z.string(),
  role: z.literal('CMO'),
  question: z.string(),
  playbook: z.string(),
  contextDocuments: z.array(ContextDocumentSchema),
});

const CMOOutputSchema = z.object({
  role: z.literal('CMO'),
  runId: z.string(),
  summary: z.string().min(1),
  positions: z.array(PositionSchema),
  citations: z.array(CitationSchema).min(1),
  confidence: z.number().min(0).max(1),
});

export const CMODefinition: AgentDefinition<CMOInput, CMOOutput> = {
  role: 'CMO',
  modelHint: 'claude-sonnet-4-6',
  systemPrompt: 'STUB — see Ch.4',
  inputSchema: CMOInputSchema,
  outputSchema: CMOOutputSchema,
  toolAllowlist: [],
  citationRequired: true,
};
```

### 2.5 CPO — Chief Product Officer Lens

```typescript
// Role: product strategy, roadmap, user needs, build vs buy
const CPOInputSchema = z.object({
  runId: z.string(),
  role: z.literal('CPO'),
  question: z.string(),
  playbook: z.string(),
  contextDocuments: z.array(ContextDocumentSchema),
});

const CPOOutputSchema = z.object({
  role: z.literal('CPO'),
  runId: z.string(),
  summary: z.string().min(1),
  positions: z.array(PositionSchema),
  citations: z.array(CitationSchema).min(1),
  confidence: z.number().min(0).max(1),
});

export const CPODefinition: AgentDefinition<CPOInput, CPOOutput> = {
  role: 'CPO',
  modelHint: 'claude-sonnet-4-6',
  systemPrompt: 'STUB — see Ch.4',
  inputSchema: CPOInputSchema,
  outputSchema: CPOOutputSchema,
  toolAllowlist: [],
  citationRequired: true,
};
```

### 2.6 COS — Chief of Staff Lens

```typescript
// Role: operational coherence, cross-functional coordination, execution risk
const COSInputSchema = z.object({
  runId: z.string(),
  role: z.literal('COS'),
  question: z.string(),
  playbook: z.string(),
  contextDocuments: z.array(ContextDocumentSchema),
});

const COSOutputSchema = z.object({
  role: z.literal('COS'),
  runId: z.string(),
  summary: z.string().min(1),
  positions: z.array(PositionSchema),
  citations: z.array(CitationSchema).min(1),
  confidence: z.number().min(0).max(1),
});

export const COSDefinition: AgentDefinition<COSInput, COSOutput> = {
  role: 'COS',
  modelHint: 'claude-sonnet-4-6',
  systemPrompt: 'STUB — see Ch.4',
  inputSchema: COSInputSchema,
  outputSchema: COSOutputSchema,
  toolAllowlist: [],
  citationRequired: true,
};
```

### 2.7 RedTeam

```typescript
// Role: adversarial challenge — find flaws, blind spots, failure modes in lens outputs
const RedTeamInputSchema = z.object({
  runId: z.string(),
  role: z.literal('RedTeam'),
  question: z.string(),
  lensOutputs: z.array(LensOutputSchema),    // receives all 6 lens outputs
  memo: MemoSchema,                          // Synthesizer's draft
});

const RedTeamOutputSchema = z.object({
  role: z.literal('RedTeam'),
  runId: z.string(),
  challenges: z.array(z.object({
    targetRole: AgentRoleSchema,
    claim: z.string(),
    counterargument: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
  })).min(1),
  overallRisk: z.enum(['low', 'medium', 'high', 'critical']),
  citations: z.array(CitationSchema),
});

export const RedTeamDefinition: AgentDefinition<RedTeamInput, RedTeamOutput> = {
  role: 'RedTeam',
  modelHint: 'claude-sonnet-4-6',
  systemPrompt: 'STUB — see Ch.4',
  inputSchema: RedTeamInputSchema,
  outputSchema: RedTeamOutputSchema,
  toolAllowlist: [],
  citationRequired: false,  // challenges self-evidencing
};
```

### 2.8 Steelman

```typescript
// Role: strongest possible case for each lens position; counterweight to RedTeam
const SteelmanInputSchema = z.object({
  runId: z.string(),
  role: z.literal('Steelman'),
  question: z.string(),
  lensOutputs: z.array(LensOutputSchema),
  redTeamOutput: RedTeamOutputSchema,
});

const SteelmanOutputSchema = z.object({
  role: z.literal('Steelman'),
  runId: z.string(),
  steelmen: z.array(z.object({
    targetRole: AgentRoleSchema,
    bestCaseArgument: z.string(),
    evidenceSupport: z.array(z.string()),
  })).min(1),
  citations: z.array(CitationSchema),
});

export const SteelmanDefinition: AgentDefinition<SteelmanInput, SteelmanOutput> = {
  role: 'Steelman',
  modelHint: 'claude-sonnet-4-6',
  systemPrompt: 'STUB — see Ch.4',
  inputSchema: SteelmanInputSchema,
  outputSchema: SteelmanOutputSchema,
  toolAllowlist: [],
  citationRequired: false,
};
```

### 2.9 Synthesizer

```typescript
// Role: draft the memo — integrates all lenses, RedTeam, Steelman into coherent analysis
const SynthesizerInputSchema = z.object({
  runId: z.string(),
  role: z.literal('Synthesizer'),
  question: z.string(),
  playbook: z.string(),
  lensOutputs: z.array(LensOutputSchema),
  redTeam: RedTeamOutputSchema,
  steelman: SteelmanOutputSchema,
});

const SynthesizerOutputSchema = z.object({
  role: z.literal('Synthesizer'),
  runId: z.string(),
  memoMarkdown: z.string().min(100),
  executiveSummary: z.string().min(50),
  keyDecisions: z.array(z.string()).min(1),
  citations: z.array(CitationSchema).min(1),
  positionMetadata: z.array(PositionMetadataSchema),  // required for Verifier
});

export const SynthesizerDefinition: AgentDefinition<SynthesizerInput, SynthesizerOutput> = {
  role: 'Synthesizer',
  modelHint: 'claude-sonnet-4-6',
  systemPrompt: 'STUB — see Ch.4',
  inputSchema: SynthesizerInputSchema,
  outputSchema: SynthesizerOutputSchema,
  toolAllowlist: [],
  citationRequired: true,
};
```

### 2.10 Verifier

```typescript
// Role: independent rigor check — anti-sycophancy, citation validation, quantitative claims
// Receives ONLY: VerifierInput (Section 5) — NO reasoning traces from any prior agent
const VerifierInputAgentSchema = VerifierInputSchema;  // Section 5 schema

const VerifierOutputSchema = z.object({
  role: z.literal('Verifier'),
  runId: z.string(),
  rigorScore: z.number().min(0).max(100),             // rigorScore() impl in Ch.4
  passed: z.boolean(),
  failureReasons: z.array(z.string()),
  citationAudit: z.array(z.object({
    citationId: z.string(),
    verdict: z.enum(['valid', 'unsupported', 'fabricated', 'ambiguous']),
    notes: z.string().optional(),
  })),
  quantitativeAudit: z.array(z.object({
    claim: z.string(),
    verdict: z.enum(['named-entity', 'quantified', 'vague', 'unsupported']),
  })),
  antiSycophancyFlags: z.array(z.string()),
});

export const VerifierDefinition: AgentDefinition<VerifierInput, VerifierOutput> = {
  role: 'Verifier',
  modelHint: 'claude-opus-4-7',   // Opus only for Verifier — research-grade scrutiny
  systemPrompt: 'STUB — see Ch.4',
  inputSchema: VerifierInputAgentSchema,
  outputSchema: VerifierOutputSchema,
  toolAllowlist: [],   // Verifier uses NO external tools — isolation requirement
  citationRequired: true,  // schema-driven; Verifier audits others' citations
};
```

### 2.11 Handoff

```typescript
// Role: generate the session-handoff document from the completed run
const HandoffInputSchema = z.object({
  runId: z.string(),
  role: z.literal('Handoff'),
  memo: MemoSchema,
  verifierOutput: VerifierOutputSchema,
  runCritique: RunCritiqueOutputSchema,
  targetPath: z.string(),
});

const HandoffOutputSchema = z.object({
  role: z.literal('Handoff'),
  runId: z.string(),
  handoffMarkdown: z.string().min(100),
  handoffPath: z.string(),
});

export const HandoffDefinition: AgentDefinition<HandoffInput, HandoffOutput> = {
  role: 'Handoff',
  modelHint: 'claude-sonnet-4-6',
  systemPrompt: 'STUB — see Ch.4',
  inputSchema: HandoffInputSchema,
  outputSchema: HandoffOutputSchema,
  toolAllowlist: [],
  citationRequired: false,
};
```

### 2.12 RunCritic

```typescript
// Role: post-run meta-critique — what did the C-Suite get right/wrong; improve next run
const RunCriticInputSchema = z.object({
  runId: z.string(),
  role: z.literal('RunCritic'),
  question: z.string(),
  allLensOutputs: z.array(LensOutputSchema),
  redTeam: RedTeamOutputSchema,
  steelman: SteelmanOutputSchema,
  verifierOutput: VerifierOutputSchema,
  finalMemo: MemoSchema,
});

const RunCriticOutputSchema = z.object({
  role: z.literal('RunCritic'),
  runId: z.string(),
  overallQuality: z.enum(['excellent', 'good', 'adequate', 'poor']),
  strengthsByRole: z.record(AgentRoleSchema, z.string()),
  weaknessesByRole: z.record(AgentRoleSchema, z.string()),
  processImprovements: z.array(z.string()),
  critiqueMarkdown: z.string().min(50),
});

export const RunCriticDefinition: AgentDefinition<RunCriticInput, RunCriticOutput> = {
  role: 'RunCritic',
  modelHint: 'claude-sonnet-4-6',
  systemPrompt: 'STUB — see Ch.4',
  inputSchema: RunCriticInputSchema,
  outputSchema: RunCriticOutputSchema,
  toolAllowlist: [],
  citationRequired: false,
};
```

### 2.13 AgentDefinition Registry

```typescript
// apps/utility/src/agents/registry.ts
export const AGENT_REGISTRY: Record<AgentRole, AgentDefinition<unknown, unknown>> = {
  CEO:        CEODefinition,
  CFO:        CFODefinition,
  CRO:        CRODefinition,
  CMO:        CMODefinition,
  CPO:        CPODefinition,
  COS:        COSDefinition,
  RedTeam:    RedTeamDefinition,
  Steelman:   SteelmanDefinition,
  Synthesizer: SynthesizerDefinition,
  Verifier:   VerifierDefinition,
  Handoff:    HandoffDefinition,
  RunCritic:  RunCriticDefinition,
};
```

---

## Section 3 — Claude Agent SDK Hooks Integration

**Context7 verification** (2026-05-27): Hook names and input types confirmed from `/nothflare/claude-agent-sdk-docs` (Benchmark Score: 83.8, Source Reputation: Medium). Source: `https://github.com/nothflare/claude-agent-sdk-docs/blob/main/docs/en/agent-sdk/typescript.md`.

Verified hook names:
- `SubagentStart` (input: `SubagentStartHookInput = BaseHookInput & { hook_event_name: 'SubagentStart'; agent_id: string; agent_type: string }`)
- `PreToolUse` (input: `PreToolUseHookInput = BaseHookInput & { hook_event_name: 'PreToolUse'; tool_name: string; tool_input: unknown }`)
- `PostToolUse` (input: `PostToolUseHookInput = BaseHookInput & { hook_event_name: 'PostToolUse'; tool_name: string; tool_input: unknown; tool_response: unknown }`)
- `SubagentStop` (input: `SubagentStopHookInput = BaseHookInput & { hook_event_name: 'SubagentStop'; stop_hook_active: boolean }`)

UNKNOWN: `BaseHookInput` fields not fully confirmed from context7 results — likely includes `session_id` and `transcript_item_id`. Ch.4 implementation must confirm full BaseHookInput shape before wiring. **Context7 reputation: Medium** — treat hook names as confirmed, BaseHookInput fields as provisional.

### 3.1 Hook Registration Location

Hooks are registered in `apps/utility/src/orchestrator.ts` when the Claude Agent SDK client is instantiated per agent invocation. The orchestrator owns hook wiring; lenses, Verifier, and other agents never register hooks themselves.

### 3.2 SubagentStart Hook

```typescript
// Fires when a Claude subagent begins execution
const onSubagentStart: HookCallback = async (input, toolUseId, { signal }) => {
  const evt = input as SubagentStartHookInput;
  
  // 1. Emit IPC to renderer
  ipc.emit({ kind: 'agent.start', runId, role, agentId: evt.agent_id, ts: Date.now() });
  
  // 2. Insert agent_invocations row
  db.prepare(`
    INSERT INTO agent_invocations (run_id, role, agent_id, status, started_at)
    VALUES (?, ?, ?, 'running', unixepoch())
  `).run(runId, role, evt.agent_id);
  
  return {};
};
```

IPC kind: `agent.start` — defined in Ch.0 ADR §3 `packages/shared-types/src/ipc.ts`.

### 3.3 PreToolUse Hook

```typescript
// Fires before each MCP tool call
const onPreToolUse: HookCallback = async (input, toolUseId, { signal }) => {
  const evt = input as PreToolUseHookInput;
  
  // Emit IPC — renderer shows "tool in flight" indicator
  ipc.emit({
    kind: 'agent.tool.pre',
    runId,
    role,
    toolName: evt.tool_name,
    toolInput: evt.tool_input,
    toolUseId,
    ts: Date.now(),
  });
  
  // Validate tool is in agent's allowlist
  const def = AGENT_REGISTRY[role];
  if (def.toolAllowlist.length > 0 && !def.toolAllowlist.includes(evt.tool_name)) {
    // Throw to abort tool call — unauthorized tool for this agent
    throw new ToolAllowlistViolation(role, evt.tool_name);
  }
  
  return {};
};
```

IPC kind: `agent.tool.pre` — defined in Ch.0 ADR §3.

### 3.4 PostToolUse Hook

```typescript
// Fires after each MCP tool call completes
const onPostToolUse: HookCallback = async (input, toolUseId, { signal }) => {
  const evt = input as PostToolUseHookInput;
  
  // 1. Emit IPC
  ipc.emit({
    kind: 'agent.tool.post',
    runId,
    role,
    toolName: evt.tool_name,
    toolInput: evt.tool_input,
    toolResponse: evt.tool_response,
    toolUseId,
    ts: Date.now(),
  });
  
  // 2. Insert tool_calls row (full audit trail — B3 requirement)
  db.prepare(`
    INSERT INTO tool_calls (run_id, role, tool_name, input_json, result_json, ts)
    VALUES (?, ?, ?, json(?), json(?), unixepoch())
  `).run(
    runId,
    role,
    evt.tool_name,
    JSON.stringify(evt.tool_input),
    JSON.stringify(evt.tool_response),
  );
  
  return {};
};
```

IPC kind: `agent.tool.post` — defined in Ch.0 ADR §3. The `result_json` column provides the tool-call audit trail that `buildVerifierInput()` reads (Section 5.3).

### 3.5 SubagentStop Hook

```typescript
// Fires when a Claude subagent finishes (success or failure)
const onSubagentStop: HookCallback = async (input, toolUseId, { signal }) => {
  const evt = input as SubagentStopHookInput;
  
  // 1. Parse + validate structured output via outputSchema
  //    This is the ONLY place structured output is extracted — guarantees schema compliance
  const rawOutput = /* extract from agent result */;
  const def = AGENT_REGISTRY[role];
  const parseResult = def.outputSchema.safeParse(rawOutput);
  
  if (!parseResult.success) {
    // Emit failure; do NOT write to agent_invocations.output_json
    ipc.emit({ kind: 'agent.complete', runId, role, success: false, error: parseResult.error.message, ts: Date.now() });
    throw new AgentOutputSchemaViolation(role, parseResult.error);
  }
  
  // 2. Write structured output to agent_invocations BEFORE transitioning state
  //    This is the checkpoint that enables resume (Section 7)
  db.prepare(`
    UPDATE agent_invocations
    SET status = 'completed', output_json = json(?), completed_at = unixepoch()
    WHERE run_id = ? AND role = ?
  `).run(JSON.stringify(parseResult.data), runId, role);
  
  // 3. Emit IPC
  ipc.emit({ kind: 'agent.complete', runId, role, success: true, output: parseResult.data, ts: Date.now() });
  
  // 4. THEN transition state (ordering is load-bearing for checkpoint resume)
  await transitionAfterAgentComplete(runId, role, parseResult.data, db);
  
  return {};
};
```

IPC kind: `agent.complete` — defined in Ch.0 ADR §3.

### 3.6 Partial Message Heartbeats

Per Ch.1 ADR §7. The `HeartbeatEmitter` class (`apps/utility/src/heartbeat.ts`) handles partial message streaming:

```typescript
// Partial message chunks from the Claude SDK stream → HeartbeatEmitter
// HeartbeatEmitter throttles to 250ms / 4 events per second (B34 mitigation)
hearbeatEmitter.onPartial(chunk => {
  // emits { kind: 'agent.heartbeat', runId, role, partial: chunk.text, ts }
  // throttled — does NOT flood IPC
});
```

IPC kind: `agent.heartbeat` — defined in Ch.0 ADR §3.

### 3.7 Hook Wiring Per Agent Invocation

```typescript
// apps/utility/src/orchestrator.ts
async function invokeAgent<I, O>(
  role: AgentRole,
  input: I,
  runId: string,
  db: Database,
): Promise<O> {
  const def = AGENT_REGISTRY[role];
  const client = stubFromEnv();  // routes to StubClaudeClient or live — Section 6
  
  const hooks: HookCallback[] = [
    onSubagentStart,
    onPreToolUse,
    onPostToolUse,
    onSubagentStop,
  ];
  
  return client.invoke({
    systemPrompt: def.systemPrompt,
    input,
    model: def.modelHint,
    hooks,
    toolAllowlist: def.toolAllowlist,
  });
}
```

---

## Section 4 — Lens Isolation Enforcement

B3 keystone safety wiring. Per `docs/architecture/runtime.md` §lens isolation assertion (line 121). DOCTRINE law #7 mandates structural separation — lenses must not see each other's outputs during their execution.

### 4.1 Compile-Time: Branded LensContextBundle

```typescript
// packages/shared-types/src/lens-context-bundle.ts

// Phantom brand prevents mixing bundles at TypeScript compile time
declare const __lensRoleBrand: unique symbol;
type BrandedFor<R extends LensRole> = { readonly [__lensRoleBrand]: R };

export type LensContextBundle<R extends LensRole> = BrandedFor<R> & {
  runId: string;
  role: R;
  question: string;
  playbook: string;
  contextDocuments: ContextDocument[];
  // Deliberately NO field typed as LensOutput<OtherRole>
  // TypeScript structurally prevents leaking CRO output into CFO bundle
  // because LensOutput<CRO> carries brand BrandedFor<'CRO'>
};

// dispatchLens signature — compile-time guard:
// TypeScript will reject dispatchLens('CFO', bundle) if bundle is typed LensContextBundle<'CRO'>
export declare function dispatchLens<R extends LensRole>(
  role: R,
  contextBundle: LensContextBundle<R>,
): Promise<LensOutput<R>>;
```

### 4.2 Runtime: Zod superRefine Validator

```typescript
// packages/shared-types/src/lens-context-bundle.ts (runtime schema)

export class LensIsolationViolation extends Error {
  constructor(
    public readonly forRole: LensRole,
    public readonly leakedRole: string,
    public readonly fieldPath: string,
  ) {
    super(`LensIsolationViolation: ${forRole} context bundle contains data tagged for ${leakedRole} at ${fieldPath}`);
    this.name = 'LensIsolationViolation';
  }
}

// Zod schema with runtime cross-lens leak detection
export function buildLensContextBundleSchema<R extends LensRole>(
  role: R,
): z.ZodType<LensContextBundle<R>> {
  return z.object({
    runId: z.string(),
    role: z.literal(role),
    question: z.string(),
    playbook: z.string(),
    contextDocuments: z.array(ContextDocumentSchema),
  }).superRefine((data, ctx) => {
    // Walk all values recursively — throw on any object with a 'role' field
    // that is a LensRole != the expected role
    const violations = findCrossLensLeaks(data, role, '$');
    for (const v of violations) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `LensIsolationViolation: leaked ${v.leakedRole} at ${v.path}`,
      });
    }
  }) as z.ZodType<LensContextBundle<R>>;
}

function findCrossLensLeaks(
  value: unknown,
  expectedRole: LensRole,
  path: string,
): Array<{ leakedRole: string; path: string }> {
  if (typeof value !== 'object' || value === null) return [];
  const obj = value as Record<string, unknown>;
  const violations: Array<{ leakedRole: string; path: string }> = [];
  
  if ('role' in obj && LENS_ROLES.includes(obj.role as LensRole) && obj.role !== expectedRole) {
    violations.push({ leakedRole: obj.role as string, path });
  }
  
  for (const [key, val] of Object.entries(obj)) {
    violations.push(...findCrossLensLeaks(val, expectedRole, `${path}.${key}`));
  }
  
  return violations;
}
```

### 4.3 dispatchLens Implementation Contract

```typescript
// apps/utility/src/orchestrator.ts
export async function dispatchLens<R extends LensRole>(
  role: R,
  contextBundle: LensContextBundle<R>,
  db: Database,
): Promise<LensOutput<R>> {
  // 1. Runtime validation — throws LensIsolationViolation on cross-lens leak
  const schema = buildLensContextBundleSchema(role);
  schema.parse(contextBundle);  // throws ZodError containing LensIsolationViolation detail on failure
  
  // 2. Invoke agent (hooks wired in invokeAgent — Section 3)
  return invokeAgent(role, contextBundle, contextBundle.runId, db);
}
```

### 4.4 Test Fixture — Cross-Lens Leak Detection

```typescript
// tests/lens-isolation/cross-lens-leak.spec.ts
import { buildLensContextBundleSchema, LensIsolationViolation } from '@c-suite/shared-types';

describe('Lens isolation enforcement', () => {
  it('throws LensIsolationViolation when CRO output is injected into CFO context bundle', () => {
    const croOutput = {
      role: 'CRO' as const,
      runId: 'test-run-1',
      summary: 'CRO analysis',
      positions: [],
      citations: [],
      confidence: 0.9,
    };
    
    const cfoBundle = {
      runId: 'test-run-1',
      role: 'CFO' as const,
      question: 'Should we expand to Europe?',
      playbook: 'strategic-decision',
      contextDocuments: [],
      // ILLEGAL: leaking CRO output into CFO bundle
      illegalLeak: croOutput,
    };
    
    const schema = buildLensContextBundleSchema('CFO');
    expect(() => schema.parse(cfoBundle)).toThrow();
    
    const result = schema.safeParse(cfoBundle);
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues[0].message;
      expect(msg).toContain('LensIsolationViolation');
      expect(msg).toContain('CRO');
    }
  });
  
  it('compile-time: TypeScript prevents assigning LensContextBundle<CRO> to dispatchLens CFO parameter', () => {
    // This test is enforced by tsc --noEmit in CI, not at runtime
    // Fixture: see tests/lens-isolation/compile-error.ts (expected to fail tsc)
    expect(true).toBe(true); // runtime guard above covers the functional requirement
  });
});
```

---

## Section 5 — Verifier Input Contract Assembler (B3 — Load-Bearing)

B3 (P0, VERIFIED) — Verifier reasoning-trace leak is the keystone safety property. The Verifier must receive ONLY structured outputs — never reasoning traces, chain-of-thought, or raw agent streams from any prior agent. This section specifies the exact contract.

Per `docs/research/phase-r-decisions.md` §Decision 2 — 5 Verifier anti-sycophancy patterns. Per BLOCKERS B3.

### 5.1 What the Verifier Receives (Exhaustive List)

1. Synthesizer's draft memo markdown (structured output only — not reasoning)
2. Structured outputs of every lens that ran (validated via outputSchema — not reasoning)
3. Tool-call audit trail (full tool_calls rows from SQLite)
4. Position metadata for every position cited in the memo
5. RedTeam output in full (structured — not reasoning)
6. Steelman output in full (structured — not reasoning)

The Verifier does NOT receive:
- Any agent's reasoning trace or chain-of-thought
- Partial message streams
- Raw text output prior to schema validation
- Any agent's systemPrompt (Verifier audits the memo, not the prompts)
- Cross-lens outputs during lens execution (lens isolation is complete by Verifier time)

### 5.2 VerifierInput Zod Schema

```typescript
// packages/shared-types/src/verifier-input.ts

export const CitationSchema = z.object({
  id: z.string(),
  text: z.string(),
  source: z.string().url().or(z.string().min(1)),
  page: z.number().int().optional(),
});

export const PositionMetadataSchema = z.object({
  positionId: z.string(),
  role: AgentRoleSchema,
  claim: z.string(),
  isQuantitative: z.boolean(),   // isQuantOrNamed() — impl deferred to Ch.4
  namedEntity: z.string().optional(),
  citations: z.array(CitationSchema),
  sourceText: z.string(),
});

export const ToolCallAuditEntrySchema = z.object({
  toolCallId: z.number().int(),
  role: AgentRoleSchema,
  toolName: z.string(),
  inputJson: z.unknown(),
  resultJson: z.unknown(),
  ts: z.number().int(),
});

export const VerifierInputSchema = z.object({
  runId: z.string(),
  
  // 1. Synthesizer draft memo
  memoMarkdown: z.string().min(1),
  
  // 2. Structured lens outputs (all 6)
  lensOutputs: z.array(LensOutputSchema).min(6).max(6),
  
  // 3. Tool-call audit trail
  toolCallAuditTrail: z.array(ToolCallAuditEntrySchema),
  
  // 4. Position metadata
  positionMetadata: z.array(PositionMetadataSchema).min(1),
  
  // 5. RedTeam + Steelman
  redTeamOutput: RedTeamOutputSchema,
  steelmanOutput: SteelmanOutputSchema,
  
  // Metadata
  runPlaybook: z.string(),
  runQuestion: z.string(),
  assembledAt: z.number().int(),  // unixepoch
});

export type VerifierInput = z.infer<typeof VerifierInputSchema>;
```

### 5.3 Assembler: buildVerifierInput()

```typescript
// apps/utility/src/verifier-assembler.ts

export class VerifierInputContractViolation extends Error {
  constructor(public readonly missing: string[]) {
    super(`VerifierInputContractViolation: missing required fields: ${missing.join(', ')}`);
    this.name = 'VerifierInputContractViolation';
  }
}

/**
 * Assembles VerifierInput from SQLite + in-memory run state.
 * FAILS CLOSED: throws VerifierInputContractViolation if any required field is missing.
 * Run does NOT proceed to Verifier on violation.
 */
export function buildVerifierInput(
  runId: string,
  state: RunState & { kind: 'synthesizer' },  // must be in synthesizer state
  db: Database,
): VerifierInput | never {
  const missing: string[] = [];
  
  // 1. Synthesizer draft memo
  const synthInvocation = db.prepare(
    `SELECT output_json FROM agent_invocations WHERE run_id = ? AND role = 'Synthesizer' AND status = 'completed'`
  ).get(runId) as { output_json: string } | undefined;
  
  if (!synthInvocation) missing.push('synthesizer.output');
  
  const synthOutput = synthInvocation
    ? SynthesizerOutputSchema.parse(JSON.parse(synthInvocation.output_json))
    : null;
  
  // 2. Lens structured outputs (all 6)
  const lensRows = db.prepare(
    `SELECT role, output_json FROM agent_invocations
     WHERE run_id = ? AND role IN ('CEO','CFO','CRO','CMO','CPO','COS') AND status = 'completed'`
  ).all(runId) as Array<{ role: string; output_json: string }>;
  
  if (lensRows.length < 6) {
    const completedRoles = lensRows.map(r => r.role);
    const missing6 = (['CEO','CFO','CRO','CMO','CPO','COS'] as const).filter(r => !completedRoles.includes(r));
    missing.push(...missing6.map(r => `lens.${r}`));
  }
  
  // 3. Tool-call audit trail
  const toolCallRows = db.prepare(
    `SELECT id as toolCallId, role, tool_name as toolName, input_json as inputJson, result_json as resultJson, ts
     FROM tool_calls WHERE run_id = ? ORDER BY ts ASC`
  ).all(runId) as ToolCallAuditEntry[];
  
  // 4. Position metadata
  if (!synthOutput?.positionMetadata || synthOutput.positionMetadata.length === 0) {
    missing.push('synthesizer.positionMetadata');
  }
  
  // 5. RedTeam + Steelman
  const redTeamRow = db.prepare(
    `SELECT output_json FROM agent_invocations WHERE run_id = ? AND role = 'RedTeam' AND status = 'completed'`
  ).get(runId) as { output_json: string } | undefined;
  const steelmanRow = db.prepare(
    `SELECT output_json FROM agent_invocations WHERE run_id = ? AND role = 'Steelman' AND status = 'completed'`
  ).get(runId) as { output_json: string } | undefined;
  
  if (!redTeamRow) missing.push('redTeam.output');
  if (!steelmanRow) missing.push('steelman.output');
  
  // Fail closed
  if (missing.length > 0) {
    throw new VerifierInputContractViolation(missing);
  }
  
  const rawInput: VerifierInput = {
    runId,
    memoMarkdown: synthOutput!.memoMarkdown,
    lensOutputs: lensRows.map(r => LensOutputSchema.parse(JSON.parse(r.output_json))),
    toolCallAuditTrail: toolCallRows,
    positionMetadata: synthOutput!.positionMetadata,
    redTeamOutput: RedTeamOutputSchema.parse(JSON.parse(redTeamRow!.output_json)),
    steelmanOutput: SteelmanOutputSchema.parse(JSON.parse(steelmanRow!.output_json)),
    runPlaybook: state.lensOutputs[0]?.runId ?? runId,  // UNKNOWN: derive from run metadata
    runQuestion: '',  // loaded from runs table — see impl note
    assembledAt: Math.floor(Date.now() / 1000),
  };
  
  // Final schema validation — catches any field shape drift
  return VerifierInputSchema.parse(rawInput);
}
```

**Critical invariant**: `buildVerifierInput()` reads ONLY `output_json` fields from `agent_invocations` — the structured outputs validated at `SubagentStop`. It never reads any streaming buffer, partial message, or reasoning trace. Enforced by architecture: the utility process never stores reasoning traces — only schema-validated `output_json` persists to SQLite.

### 5.4 B3 Canary Test

Per BLOCKERS B3: planted-claim canary at `tests/verifier-canary.spec.ts`. The canary verifies the Verifier catches a deliberately planted false claim that appears to have citation support but doesn't.

```typescript
// tests/verifier-canary.spec.ts (spec outline — full impl in Ch.4 with real Verifier prompts)
describe('B3 Verifier canary', () => {
  it('throws VerifierInputContractViolation when Synthesizer output is missing', () => {
    // Assembler fails closed
    expect(() => buildVerifierInput(runId, state, dbWithNoSynth)).toThrow(VerifierInputContractViolation);
  });
  
  it('VerifierInput contains no reasoning traces (structural check)', () => {
    const input = buildVerifierInput(runId, state, db);
    // Verify no field contains raw reasoning text (heuristic: no <thinking> tags)
    const json = JSON.stringify(input);
    expect(json).not.toContain('<thinking>');
    expect(json).not.toContain('chain_of_thought');
    expect(json).not.toContain('reasoning_trace');
  });
});
```

---

## Section 6 — Stub Harness Wiring

Per `docs/architecture/delivery.md` §stub-model harness. Ch.0 shipped the skeleton (`packages/stub-harness/src/stub.ts`). Ch.3 is the first real consumer.

### 6.1 Routing Through StubClaudeClient

All `dispatchLens()` calls route through `invokeAgent()`, which calls `stubFromEnv()` (Ch.0 ADR §2). The stub client intercepts before any real Claude API call is made.

```typescript
// apps/utility/src/orchestrator.ts (Section 3.7 above)
const client = stubFromEnv();
// STUB_MODE=replay → reads fixture file; record → calls Claude and writes fixture; live → real Claude
```

`stubFromEnv()` implementation is in `packages/stub-harness/src/stub.ts` (Ch.0 skeleton — Ch.3 does not modify it; Ch.3 writes the fixture files it reads).

### 6.2 STUB_MODE Values

| Mode | Behaviour | When Used |
|------|-----------|-----------|
| `replay` | Read from `tests/fixtures/lens-outputs/<runId>/<role>.json` | CI (all tests) |
| `record` | Call real Claude; write fixture to disk | Capture new golden fixtures |
| `live` | Call real Claude; no fixture I/O | Developer testing; Scheduler must pass |

`STUB_MODE` defaults to `replay` in test environments (set by Vitest setup). `live` requires `ANTHROPIC_API_KEY` and a passing Scheduler `canDispatch()`.

### 6.3 Fixture Format

```typescript
// Fixture schema: tests/fixtures/lens-outputs/<runId>/<role>.json
// One file per agent per run. The file IS the outputSchema output.
type LensFixture = {
  _meta: {
    role: AgentRole;
    runId: string;
    capturedAt: string;  // ISO-8601
    model: string;
    stubMode: 'record';
  };
  output: unknown;  // must parse against role's outputSchema
};
```

Example path: `tests/fixtures/lens-outputs/seed-run-001/CEO.json`

### 6.4 Seed Fixtures — 12 Agent Happy-Path Outputs

Seed fixtures are stored at `tests/fixtures/lens-outputs/seed-run-001/`. One file per agent. These cover the happy-path (all fields present, passes outputSchema validation) and drive the E2E stub test (`run-loop-e2e.spec.ts`).

| File | Agent | Key fields |
|------|-------|------------|
| `CEO.json` | CEO | summary, positions[1+], citations[1+], confidence=0.85 |
| `CFO.json` | CFO | summary, quantitativeAssertions[1+], citations[1+], confidence=0.80 |
| `CRO.json` | CRO | summary, positions[1+], citations[1+], confidence=0.82 |
| `CMO.json` | CMO | summary, positions[1+], citations[1+], confidence=0.78 |
| `CPO.json` | CPO | summary, positions[1+], citations[1+], confidence=0.88 |
| `COS.json` | COS | summary, positions[1+], citations[1+], confidence=0.75 |
| `RedTeam.json` | RedTeam | challenges[2+], overallRisk="medium" |
| `Steelman.json` | Steelman | steelmen[6] (one per lens), evidenceSupport |
| `Synthesizer.json` | Synthesizer | memoMarkdown[200+ chars], keyDecisions[2+], positionMetadata[2+], citations[2+] |
| `Verifier.json` | Verifier | rigorScore=82, passed=true, citationAudit, quantitativeAudit, antiSycophancyFlags=[] |
| `Handoff.json` | Handoff | handoffMarkdown[200+ chars], handoffPath |
| `RunCritic.json` | RunCritic | overallQuality="good", strengthsByRole, weaknessesByRole, processImprovements[1+] |

Fixture authoring protocol: `STUB_MODE=record` + `ANTHROPIC_API_KEY` → call `pnpm run fixtures:capture --runId=seed-run-001`. Ch.3 does not include captured fixtures (requires live Claude); Ch.4 captures and commits them.

---

## Section 7 — Node-Granular Checkpoint Resume

Per `docs/architecture/runtime.md` §Checkpoint and resume. Per Ch.1 ADR §3 (`resumeRun` stub).

### 7.1 Checkpoint Write Protocol (Ordering Is Load-Bearing)

The ordering within `SubagentStop` (Section 3.5) is critical:

1. Parse + validate structured output via `outputSchema` → fails if schema invalid
2. `UPDATE agent_invocations SET status='completed', output_json=? WHERE run_id=? AND role=?`
3. Emit `agent.complete` IPC
4. Call `transition()` to advance RunState

Step 2 MUST complete before step 4. If the utility process crashes between steps 2 and 4, the lens output is durable and the state transition did not happen. On resume, the orchestrator detects `agent_invocations.status='completed'` and skips re-dispatching that lens.

### 7.2 resumeRun() Implementation Contract

```typescript
// apps/utility/src/orchestrator.ts
// Ch.1 ADR §3 declared the stub; Ch.3 specifies the implementation:

export async function resumeRun(runId: string, db: Database): Promise<void> {
  // 1. Load current RunState from SQLite
  const runRow = db.prepare(`SELECT current_state FROM runs WHERE run_id = ?`).get(runId) as
    { current_state: string } | undefined;
  if (!runRow) throw new Error(`resumeRun: unknown runId ${runId}`);
  
  const state = RunStateSchema.parse(JSON.parse(runRow.current_state));
  
  // 2. Load completed agent invocations
  const completed = loadCompletedInvocations(runId, db);
  const completedRoles = new Set(completed.map(inv => inv.role));
  
  // 3. Re-dispatch only incomplete agents
  if (state.kind === 'fan-out') {
    const toRedispatch = state.lensesInFlight.filter(role => !completedRoles.has(role));
    // Dispatch incomplete lenses — each goes through dispatchLens() with fresh isolated bundle
    await Promise.all(toRedispatch.map(role => dispatchLens(role, buildLensBundle(role, runId, db), db)));
  }
  // Other states: orchestrator re-enters the appropriate phase
}

export function loadCompletedInvocations(runId: string, db: Database): AgentInvocationRecord[] {
  return db.prepare(
    `SELECT role, output_json, completed_at FROM agent_invocations
     WHERE run_id = ? AND status = 'completed' ORDER BY completed_at ASC`
  ).all(runId) as AgentInvocationRecord[];
}
```

### 7.3 Lens Isolation After Resume

Lens isolation holds on resume by the same mechanism as initial dispatch: `dispatchLens()` always calls `buildLensContextBundleSchema(role).parse(bundle)` before invoking the agent. The resumed lens receives a freshly constructed `LensContextBundle<R>` — never the other lens outputs. The `fan-out` state only stores which lenses are in-flight and which are complete; it does not carry lens output data (those live in `agent_invocations.output_json`).

### 7.4 Idempotency Guard

If `resumeRun()` is called on a run where `agent_invocations.status='completed'` for a given role, the orchestrator MUST NOT re-invoke the agent for that role. The `completedRoles` set enforces this. Re-dispatching a completed lens would produce a second `agent_invocations` row, creating ambiguity for `buildVerifierInput()`. The assembler reads the single completed row per role; duplicate rows for the same `(run_id, role)` are a schema constraint violation.

SQLite unique constraint for safety:

```sql
-- In migration 002:
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_run_role ON agent_invocations(run_id, role)
WHERE status = 'completed';
```

---

## Section 8 — Acceptance Criteria

Map to ROADMAP §Ch.3 exit criteria. All tests run in `STUB_MODE=replay`.

| # | Test | File | Assertion | Prerequisite |
|---|------|------|-----------|--------------|
| AC-1 | Full E2E loop on stubs | `tests/run-loop-e2e.spec.ts` | Run completes from `bootstrap` → `handoff`; all 14 states visited in order; no errors | 12 seed fixtures present |
| AC-2 | Lens isolation fires on cross-lens leak | `tests/lens-isolation/cross-lens-leak.spec.ts` | `buildLensContextBundleSchema('CFO').parse(bundleWithCROLeak)` throws with message containing 'LensIsolationViolation' | Section 4.2 |
| AC-3 | Verifier contract throws on missing input | `tests/verifier-contract.spec.ts` | `buildVerifierInput()` with missing Synthesizer row throws `VerifierInputContractViolation`; `missing` field lists 'synthesizer.output' | Section 5.3 |
| AC-4 | Resume re-dispatches only incomplete lenses | `tests/checkpoint-resume.spec.ts` | Kill utility after 3/6 lenses complete; `resumeRun()` dispatches exactly 3 remaining; completed lenses' `agent_invocations` rows unchanged | Section 7 |
| AC-5 | 12 AgentDefinitions parse seed fixtures | `tests/agent-definitions.spec.ts` | For each of 12 roles, `def.outputSchema.parse(seedFixture[role].output)` succeeds | 12 seed fixtures + Section 2 |
| AC-6 | IPC event order correct | `tests/ipc-event-order.spec.ts` | Capture IPC events for one agent invocation; assert order: `agent.start` → `agent.tool.pre` → `agent.tool.post` → `agent.complete` | Section 3 |
| AC-7 | B3 canary: no reasoning traces in VerifierInput | `tests/verifier-canary.spec.ts` | `buildVerifierInput()` output JSON contains no `<thinking>`, `chain_of_thought`, or `reasoning_trace` strings | Section 5.4 |
| AC-8 | Transition persists to SQLite | `tests/state-machine.spec.ts` | After `transition(state, event, db)`, `runs.current_state` equals serialised next state; `state_transitions` has one new row | Section 1.4, 1.5 |
| AC-9 | Idempotency guard: completed lens not re-dispatched | `tests/checkpoint-resume.spec.ts` | Call `resumeRun()` on a run where all lenses are completed; assert zero new agent invocations | Section 7.4 |
| AC-10 | tsc --noEmit passes on test fixture that assigns wrong LensContextBundle | `CI: type-check` step | `tests/lens-isolation/compile-error.ts` fails tsc (expected compile error); annotated with `// @ts-expect-error` on the offending line | Section 4.1 |

---

## Section 9 — Considered Alternatives + UNKNOWN

### 9.1 Alternatives Considered

**A1: Event sourcing instead of RunState snapshot**
- Considered storing every event and deriving current state by replay.
- Rejected: replay cost grows linearly with run length; snapshot + state_transitions table gives equivalent audit trail at O(1) read cost. Event sourcing adds complexity with no benefit at this scale (14 states, <100 transitions per run).

**A2: In-memory state only (no SQLite persistence per transition)**
- Rejected: violates checkpoint resume requirement (ROADMAP §Ch.3). A utility process crash without SQLite persistence loses the entire run. SafeWrite (Ch.2) demonstrates the project's commitment to durability — same principle applies here.

**A3: Single shared LensContextBundle (all lenses receive same object)**
- Rejected: directly violates B3. Cross-lens contamination is the keystone safety failure. Sharing a context bundle object would require runtime scrubbing, which is error-prone and unauditable. Typed generics + Zod superRefine is verifiable at both compile time and runtime.

**A4: Verifier receives full agent transcripts (including reasoning)**
- Rejected: the explicit finding in `docs/research/phase-r-decisions.md` §Decision 2 is that Verifier access to reasoning traces creates sycophancy risk. The Verifier must assess the memo on its merits, not by reading the prior agents' justifications.

**A5: Opus 4.7 for all agents (maximum quality)**
- Rejected: BLOCKERS B4 (P2) — 180K token cap is conservative. Opus for 12 agents in parallel during fan-out would exhaust the token budget before Synthesizer + Verifier run. Sonnet 4.6 for lenses preserves budget for the two highest-stakes agents (Verifier = Opus; Synthesizer at the boundary).

**A6: GraphQL subscription for IPC instead of Electron ipcMain/ipcRenderer**
- Rejected: adds a network server dependency (port conflicts, process ownership complexity) to a single-machine menubar app. Ch.1 ADR §2 established IPC-only communication; Ch.3 inherits that decision.

### 9.2 UNKNOWN Items

| ID | Area | Description | Owner | Resolution |
|----|------|-------------|-------|------------|
| U-1 | SDK hooks | `BaseHookInput` complete field list (context7 source reputation: Medium). Fields beyond `hook_event_name` not confirmed. | Ch.3 impl | Confirm against Anthropic TypeScript SDK source on first implementation pass |
| U-2 | Verifier rigorScore threshold | What score constitutes `shipped-clean` vs `shipped-draft`? Affects `verifier → shipped-clean/shipped-draft` transition. | Ch.4 | `rigorScore()` + threshold defined in Ch.4 |
| U-3 | `isQuantOrNamed()` | Required for `QuantitativeAssertionSchema` and `PositionMetadataSchema.isQuantitative`. Logic deferred to Ch.4. `PositionMetadataSchema.isQuantitative: z.boolean()` is a stub. | Ch.4 | 5 edge cases listed in BLOCKERS B3 |
| U-4 | `NAMED_ENTITY_REGISTRY` | Phase-R Decision 2 requires a registry for named-entity validation in Verifier anti-sycophancy check. Structure not yet defined. | Ch.4 | Ch.4 Verifier prompt + registry schema |
| U-5 | `buildLensBundle()` helper | `resumeRun()` calls `buildLensBundle(role, runId, db)` — the function that reconstructs a fresh `LensContextBundle<R>` from SQLite on resume. Implementation not specified here (requires knowing what context documents are stored in Ch.3 vs loaded on demand). | Ch.3 impl | Ch.3 implementation pass |
| U-6 | `vault.init.error` IPC kind | Ch.2 ADR spec gap G-1: this IPC kind is missing from the Ch.0 discriminated union. Ch.3 calls SafeWrite (which emits this kind). The union in `packages/shared-types/src/ipc.ts` must be amended before Ch.3 compiles. | Ch.0 (amendment) | Add `vault.init.error` to IPC union in `packages/shared-types/src/ipc.ts` before Ch.3 implementation |
| U-7 | `scheduler.window.reset` IPC kind | Ch.1 ADR surfaced: `Scheduler` emits a window-reset notification but this IPC kind is not in the Ch.0 union. Same amendment needed as U-6. | Ch.0 (amendment) | Add `scheduler.window.reset` to IPC union |
| U-8 | `runPlaybook` / `runQuestion` in buildVerifierInput | The assembler reads `runPlaybook` and `runQuestion` from the `runs` table. The `runs` table schema (Ch.1 ADR §4.2) does not show a `question` column explicitly. Ch.3 implementation must confirm column names. | Ch.1 schema / Ch.3 impl | Check Ch.1 migration 001 for `runs` column list; add `question TEXT` if missing |

---

## Implementation Notes for Ch.3 Runtime + Test

The Ch.3 Runtime agent implements; Ch.3 Test agent verifies independently (DOCTRINE law #7).

1. Write migration 002 (`state_transitions` table + unique index on `agent_invocations`) before wiring `transition()`.
2. `buildLensContextBundleSchema` uses Zod `superRefine` — Zod 4.x is pinned (Ch.0 ADR). Confirm `superRefine` API is unchanged in Zod 4.x before wiring.
3. Seed fixture files must exist before AC-5 test runs. `STUB_MODE=record` capture is the first task in Ch.4 or end of Ch.3 implementation.
4. Resolve U-6 and U-7 (IPC union amendments) before implementation begins — both are hard compile blockers.
5. The Verifier's `toolAllowlist: []` is intentional and permanent. The Verifier must not make external tool calls; its only inputs are `VerifierInput`. Any Ch.4 prompt that attempts to give the Verifier tool access is a spec violation.

---

*Cites: ADR-0001 (Ch.0 foundations), ADR-0002 (Ch.1 process architecture), ADR-0003 (Ch.2 SafeWrite), `docs/architecture/runtime.md`, `docs/research/phase-r-decisions.md` §Decision 2, BLOCKERS B3, ROADMAP §Ch.3.*
