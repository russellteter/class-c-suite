# Ch.3 Runtime — Implementation Brief (Runtime spine + 12 AgentDefinitions)

## Your role

Runtime engineer for Ch.3. Implements against `docs/decisions/0004-ch3-runtime-spine.md`. Activates the TDD-RED tests from `tests/unit/{run-loop-e2e,lens-isolation/cross-lens-leak,verifier-contract,checkpoint-resume,agent-definitions,ipc-event-order,verifier-canary,state-machine}.spec.ts`. DOCTRINE law #7 — don't write tests.

## Required reads

1. `docs/decisions/0004-ch3-runtime-spine.md` — your spec (read end-to-end).
2. `docs/decisions/0001-ch0-foundations.md` §2 — shared-types ipc + parseArtifact.
3. `docs/decisions/0002-ch1-process-architecture.md` §3 + §5 — supervisor + scheduler (you consume these).
4. `docs/decisions/0003-ch2-safewrite.md` §1 — SafeWrite (you call it from the orchestrator to persist memo + write-back drafts).
5. `tests/unit/{run-loop-e2e,lens-isolation/cross-lens-leak,verifier-contract,checkpoint-resume,agent-definitions,ipc-event-order,verifier-canary,state-machine}.spec.ts` — the failing tests you'll make green.

## Deliverables (per ADR-0004 sections)

### Section 1 — RunState machine + state transitions

`apps/utility/src/orchestrator/state-machine.ts`:
- `RunState` discriminated union (14 kinds per ADR §1).
- `transition(state, event): RunState | RunFailedError` — pure function; no side effects.
- Persists every transition to SQLite (insert into `state_transitions` table + UPDATE `runs.current_state`).
- New migration `db/migrations/003_state_transitions.sql`.

### Section 2 — 12 AgentDefinitions

`apps/utility/src/agents/`:
- `index.ts` — exports the 12 AgentDefinitions: CEO, CFO, CRO, CMO, CPO, COS, RedTeam, Steelman, Synthesizer, Verifier, Handoff, RunCritic.
- Each agent's `inputSchema` + `outputSchema` per ADR §2 (Zod).
- Prompt files at `apps/utility/src/prompts/<role>.prompt.md` are PLACEHOLDER stubs (Ch.4 Runtime ships actual content).
- `modelHint`: Sonnet 4.6 for all lenses + Synthesizer + handoff + critic; Opus 4.7 for Verifier.

### Section 3 — SDK hooks integration

`apps/utility/src/orchestrator/hooks.ts`:
- Wire `SubagentStart` → emit `agent.start` IPC + UPDATE agent_invocations.
- Wire `PreToolUse` → emit `agent.tool.pre` IPC.
- Wire `PostToolUse` → emit `agent.tool.post` IPC + INSERT tool_calls.
- Wire `SubagentStop` → emit `agent.complete` IPC + parse output via outputSchema.
- Partial messages → route via Ch.1's heartbeat throttler.

### Section 4 — Lens isolation enforcement (B3 keystone)

`apps/utility/src/orchestrator/dispatch.ts`:
- `dispatchLens<R extends LensRole>(role: R, bundle: ContextBundle<R>): Promise<LensOutput<R>>`.
- Compile-time: TypeScript generics prevent cross-lens payloads.
- Runtime: assertion that bundle doesn't contain any other lens's tagged output. Throws `LensIsolationViolation`.

### Section 5 — Verifier input contract assembler (B3 load-bearing)

`apps/utility/src/orchestrator/verifierInput.ts`:
- `buildVerifierInput(runId): VerifierInput | throws VerifierInputContractViolation`.
- Reads SQLite + in-memory state.
- Validates all 6 required inputs present. Throws on missing with `{missing: string[]}`.

### Section 6 — Stub harness wiring

Wire `StubClaudeClient` (Ch.0 skeleton) into `dispatchLens()`:
- `STUB_MODE=replay`: load fixture by stableHash.
- `STUB_MODE=record`: fire SDK + capture.
- `STUB_MODE=live`: fire SDK.

Seed fixtures: `tests/fixtures/lens-outputs/<role>.json` — write minimal "happy path" outputs for all 12 agents.

### Section 7 — Checkpoint resume integration

Extend Ch.1's `resumeRun()` per ADR §7:
- After respawn, read agent_invocations where `status='completed'`.
- Re-dispatch agents where `status='in_progress'`.
- Skip agents where `status='completed'`.
- Lens isolation MUST hold after resume.

### Section 8 — Acceptance gates

Run after EVERY commit:
- `pnpm -r run typecheck` — all packages PASS.
- `pnpm build:packages`.
- `pnpm run test:unit` — all 706+ green PLUS the 7 Ch.3 TDD-RED files now green.

## Commit discipline

Atomic per ADR section:
1. `ch3: RunState machine + state_transitions migration (ADR §1)`
2. `ch3: 12 AgentDefinitions (skeletons + placeholder prompts) (ADR §2)`
3. `ch3: SDK hooks integration (ADR §3)`
4. `ch3: lens isolation assertion (B3 keystone; ADR §4)`
5. `ch3: Verifier input contract assembler (B3 load-bearing; ADR §5)`
6. `ch3: stub harness wiring + seed fixtures (ADR §6)`
7. `ch3: checkpoint resume integration (ADR §7)`

Each auto-pushes.

## Return

Under 500 words: files created/modified, commit SHAs (last 10), spec ambiguity resolved (esp U-1 BaseHookInput, U-6 vault.init.error — already shipped by Ch.2, U-7 scheduler.window.reset — shipped by Ch.1, U-8 runs.question column), `tail -5 .git/auto-push.log`.

## Out of scope

- Lens prompt content (Ch.4 Runtime).
- rigorScore / isQuantOrNamed (Ch.4 Runtime).
- UI screens (Ch.5 Runtime).
- Tests (Test dispatch already shipped TDD-RED tests).
