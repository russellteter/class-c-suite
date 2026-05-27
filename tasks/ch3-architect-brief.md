# Ch.3 Architect — Runtime Spine + Stub Harness SPEC Brief

## Your role

Architect for C-Suite Chapter 3 (Runtime spine: typed RunState machine + 12 AgentDefinitions + SDK hooks + lens isolation assertion + Verifier input contract). DOCTRINE law #7 — SPEC only.

**Parallel dispatch context:** Ch.2 Runtime + Test are running in parallel with this dispatch. Your spec reads Ch.1 + Ch.2 ADRs (both committed) but does NOT consume their in-flight implementation. The orchestrator handles integration.

## Required reads

1. `ROADMAP.md` §Ch.3 (lines ~80-93) — exit criteria.
2. `docs/decisions/0001-ch0-foundations.md` — shared types.
3. `docs/decisions/0002-ch1-process-architecture.md` — process model + SQLite + scheduler + heartbeat IPC. Critical for understanding where the orchestrator lives + how it talks to renderer.
4. `docs/decisions/0003-ch2-safewrite.md` — SafeWrite is what the orchestrator calls to persist memos + write-backs. You consume it as an interface.
5. `docs/architecture/runtime.md` §RunState machine + §AgentDefinition shape + §SDK hooks integration + §Tool-call audit trail.
6. `docs/research/phase-r-decisions.md` §Decision 2 — Verifier anti-sycophancy patterns.
7. `BLOCKERS.md` B3 (Verifier reasoning-trace leak — keystone), B30 (already closed).

## Deliverables

ONE ADR at `docs/decisions/0004-ch3-runtime-spine.md`. Sections:

### Section 1 — RunState discriminated union

Per `docs/architecture/runtime.md` §RunState machine. Specify the typed state union:

```typescript
type RunState =
  | { kind: 'bootstrap'; runId, playbook, question }
  | { kind: 'plan-approval'; runId, plan: RunPlan }
  | { kind: 'fan-out'; runId, lensesInFlight: AgentRole[], lensesComplete: AgentRole[] }
  | { kind: 'red-team-steelman'; runId, lensOutputs: LensOutput[] }
  | { kind: 'synthesizer'; runId, redTeam: RedTeamOutput, steelman: SteelmanOutput, lensOutputs: LensOutput[] }
  | { kind: 'verifier'; runId, memo: Memo, verifierInput: VerifierInput }
  | { kind: 'shipped-clean'; runId, memoPath: string, rigorScore: number }
  | { kind: 'shipped-draft'; runId, memoPath: string, failureReasons: string[] }
  | { kind: 'write-back-proposed'; runId, drafts: WritebackDraft[] }
  | { kind: 'review'; runId, writebackId, iteration: number }
  | { kind: 'committed'; runId }
  | { kind: 'handoff'; runId, handoffPath: string }
  | { kind: 'run-critic'; runId, runCritique: RunCritiqueOutput }
  | { kind: 'failed'; runId, error: RunFailedError };
```

Specify transition functions: `transition(state, event): RunState | RunFailedError`. Persist every transition to SQLite `runs.current_state` + insert a state-transition row.

### Section 2 — 12 AgentDefinitions (skeletons only; full prompts in Ch.4)

Per `docs/architecture/runtime.md` §AgentDefinition shape. For each of the 12 agents (CEO, CFO, CRO, CMO, CPO, COS, RedTeam, Steelman, Synthesizer, Verifier, Handoff, RunCritic):
- AgentRole literal.
- inputSchema (Zod) — what context bundle the agent receives.
- outputSchema (Zod) — what structured output it must return (parsed + validated at runtime).
- toolAllowlist — which MCP tools the agent may call (placeholder; full lists in Ch.4+).
- modelHint — Sonnet 4.6 default; Verifier = Opus 4.7.
- citationRequired: true for lenses + Synthesizer; schema-driven for Verifier.

### Section 3 — Claude Agent SDK hooks integration

Per `docs/architecture/runtime.md` §SDK hooks integration (R2 verified hook names current). Wire:
- `SubagentStart` → emit `agent.start` IPC + update SQLite agent_invocations.
- `PreToolUse` → emit `agent.tool.pre` IPC.
- `PostToolUse` → emit `agent.tool.post` IPC + insert `tool_calls` row with full result_json.
- `SubagentStop` → emit `agent.complete` IPC + update agent_invocations + parse structured output via outputSchema.
- Partial messages → heartbeat throttling per Ch.1 ADR §7 (250ms / 4 events per second, capped).

### Section 4 — Lens isolation enforcement (B3 + DOCTRINE law #7)

The keystone safety wiring. Specify:
- `dispatchLens(role, contextBundle)`: orchestrator function that fires one lens.
- Assertion at runtime: `contextBundle` must NOT contain any field tagged with another lens's role. Use Zod discriminated-union tag + a custom validator that throws `LensIsolationViolation` on cross-lens leak.
- Compile-time: TypeScript types prevent passing a `LensOutput<CRO>` into the `contextBundle` argument typed for `dispatchLens(role: 'CFO')`.
- Test: write a fixture that tries to leak a CRO output into CFO's bundle. Assertion MUST throw.

### Section 5 — Verifier input contract assembler (B3 — load-bearing)

The Verifier receives ONLY:
1. Synthesizer's draft memo markdown.
2. Structured outputs of every lens that ran (NOT reasoning traces).
3. Tool-call audit trail.
4. Position metadata for every position cited.
5. Red-Team + Steelman outputs in full.

Assembler `buildVerifierInput(runId): VerifierInput | VerifierInputContractViolation`:
- Reads from SQLite + in-memory run state.
- Validates every required field is present.
- Throws `VerifierInputContractViolation` if any is missing — run does NOT proceed.

Specify the Zod schema for `VerifierInput`. The Verifier's prompt (Ch.4) will reference this schema.

### Section 6 — Stub harness wiring (Ch.0 skeleton → Ch.3 first real use)

Per `docs/architecture/delivery.md` §stub-model harness. Ch.0 shipped the skeleton (`packages/stub-harness/src/stub.ts`). Ch.3 wires it:
- Every `dispatchLens()` call routes through `StubClaudeClient.invoke()`.
- `STUB_MODE=replay` for CI; `record` to capture; `live` for development against real Claude.
- Fixture format: `tests/fixtures/lens-outputs/<runId>/<role>.json`.
- Spec a small set of seed fixtures: one for each of the 12 agents covering "happy path" output.

### Section 7 — Node-granular checkpoint resume

Per `docs/architecture/runtime.md` §Checkpoint and resume + Ch.1 ADR §3 (resumeRun).

The Ch.3 contribution:
- Every lens completion writes the structured output to SQLite agent_invocations BEFORE transitioning to next state.
- On utility crash + restart, `resumeRun(runId)` reads agent_invocations.completed; re-dispatches only the agents that didn't complete.
- Lens isolation MUST hold even after resume — the resumed run does NOT see other lenses' outputs in its context bundle.

### Section 8 — Acceptance criteria (8-10 rows)

Map ROADMAP §Ch.3 exit criteria to tests:
- Full loop runs end-to-end on stubs (`run-loop-e2e.spec.ts`).
- Lens isolation assertion fires on cross-lens leak attempt.
- Verifier input contract throws on missing input.
- Resume-on-crash: kill utility mid-fan-out → resume re-dispatches only incomplete lenses.
- All 12 AgentDefinitions parse via inputSchema + outputSchema with seed fixtures.
- IPC events fire in correct order: agent.start → agent.tool.pre → agent.tool.post → agent.complete.

### Section 9 — Considered alternatives + UNKNOWN

Doc what you considered + rejected. Surface UNKNOWN items.

## Discipline

- SPEC only.
- Cite Ch.0/Ch.1/Ch.2 ADRs + runtime.md.
- Resilience: write scaffold early.
- After writing ADR-0004, return structured summary (<500 words): ADR path, 12 AgentDefinition signatures, Verifier input contract Zod sketch, acceptance criteria table, UNKNOWN items.
- Opus 4.7 — architecture justifies. If Opus 529s, fall back to Sonnet (same pattern that worked for Ch.1 + Ch.2).

## Out of scope

- Production code (Runtime dispatch).
- Lens prompts (Ch.4 — you spec the schemas, not the prompts).
- rigorScore() (Ch.4).
- isQuantOrNamed() (Ch.4).
- UI (Ch.5).
