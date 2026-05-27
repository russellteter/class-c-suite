# Ch.3 Test — TDD Brief (Runtime spine + 12 AgentDefinitions + Verifier input contract)

## Your role

Test author for Ch.3. TDD-first — write tests against ADR-0004 §8 acceptance criteria. Tests will be RED until Ch.3 Runtime ships (Runtime not yet dispatched). You operate under DOCTRINE law #7 — writer ≠ grader; no production code.

## Required reads

1. `docs/decisions/0004-ch3-runtime-spine.md` — your spec (Section 8 acceptance criteria, 10 rows). Read end-to-end.
2. `docs/decisions/0002-ch1-process-architecture.md` §3 (resume) + §5 (scheduler) — Ch.3 builds on this.
3. `packages/shared-types/src/ipc.ts` — IPC variants you'll use (`agent.start`, `agent.tool.pre`, `agent.tool.post`, `agent.complete`).
4. `packages/stub-harness/src/stub.ts` — Ch.0 skeleton; Ch.3 will wire it for first real use.
5. `apps/utility/src/orchestrator/index.ts` — Ch.1 skeleton; Ch.3 fleshes out RunState machine.
6. Existing tests at `tests/unit/orchestrator-resume.spec.ts` — Ch.1 covers checkpoint resume basics; Ch.3 extends.

## Test files to write

### `tests/unit/run-loop-e2e.spec.ts` (AC-1)

End-to-end stub-harness run: bootstrap → plan-approval (auto-approve in test) → fan-out → red-team/steelman → synthesizer → verifier → shipped-clean OR shipped-draft → write-back-proposed → committed → handoff (skip if no handoff trigger) → run-critic.

Assertions:
- All 14 RunState transitions visited (cite the state names from ADR §1).
- Stub harness fixtures load for each of the 6 lenses + Synthesizer + Verifier + Red-Team + Steelman + RunCritic.
- Final state is one of `shipped-clean`, `shipped-draft`, or `committed` (per playbook).
- No live inference (`STUB_MODE=replay` from vitest.config.ts).

### `tests/unit/lens-isolation/cross-lens-leak.spec.ts` (AC-2)

The keystone safety test for B3 + DOCTRINE law #7.

- Construct a context bundle for `dispatchLens('CFO', bundle)` that mistakenly includes a CRO output (e.g., `bundle.croOutput = { positions: [...] }`).
- Call `dispatchLens()`.
- Assert it throws `LensIsolationViolation` with the offending tag in the error.
- Also: compile-time test — write a `tests/types/compile-error.ts` that tries to type-check a `dispatchLens('CFO', { croOutput: ... })` — should fail tsc (AC-10).

### `tests/unit/verifier-contract.spec.ts` (AC-3)

- Build a `VerifierInput` with one required field missing (e.g., omit `redTeamOutput`).
- Call `buildVerifierInput(runId)` against a SQLite state that lacks that data.
- Assert it throws `VerifierInputContractViolation` with `missing: ['redTeamOutput']`.
- Test for each of the 6 required inputs (memoMarkdown, lensOutputs, toolCallAuditTrail, positionMetadata, redTeamOutput, steelmanOutput).

### `tests/unit/checkpoint-resume.spec.ts` (AC-4 + AC-9)

Builds on Ch.1's `orchestrator-resume.spec.ts`. Adds:
- Mid-fan-out resume: 3 of 6 lenses completed; `resumeRun(runId)` re-dispatches the remaining 3.
- Fully-complete fan-out resume: all 6 lenses done; resume skips fan-out entirely, transitions to red-team/steelman.
- Verify lens isolation HOLDS during resume (re-dispatched lenses don't see other lenses' completed outputs).

### `tests/unit/agent-definitions.spec.ts` (AC-5)

- Load each of the 12 AgentDefinitions from `apps/utility/src/agents/index.ts`.
- For each: parse the seed fixture at `tests/fixtures/lens-outputs/<role>.json` against the definition's outputSchema.
- Assert every parse succeeds.

### `tests/unit/ipc-event-order.spec.ts` (AC-6)

- Set up a mock IPC capture sink.
- Run a single-lens dispatch through the SDK hooks.
- Assert the IPC events emitted in order: `agent.start → agent.tool.pre → agent.tool.post → agent.complete`.
- Assert no event emitted out-of-order or duplicated.

### `tests/unit/verifier-canary.spec.ts` (AC-7)

The planted-claim canary. Per Ch.4 ADR §5, this fixture goes RED if Verifier becomes lenient.

- Load `tests/fixtures/canary-memo.md`.
- Build VerifierInput where the memo contains a planted unsourced "$43M" claim.
- Call the Verifier (via stub harness with the canary fixture).
- Assert `claims_unverified` contains the $43M claim, `ship_status: 'draft'`, `claim_source.score < 35`.

Note: this canary fixture also lives in the Ch.4 dispatch. Ch.3 Test sets up the test infrastructure; Ch.4 Test/Runtime supplies the Verifier prompt + the recorded canary stub.

### `tests/unit/state-machine.spec.ts` (AC-8)

- Mock SQLite. Run a single transition `bootstrap → plan-approval`.
- Assert `runs.current_state` updates from `'bootstrap'` to `'plan-approval'`.
- Assert a new row inserted into `state_transitions` (if Ch.3 Runtime ships that table; else verify the equivalent record per ADR §1).

### `tests/types/compile-error.ts` (AC-10)

A TypeScript file that DEFINES an incorrect call (`dispatchLens('CFO', { croOutput: ... })`) but is NOT included in any test runner. It exists only to be type-checked. CI runs `tsc` on it; expects a compile error. Test verifies via parsing `tsc` output that the expected error is present.

## Discipline

- TDD: tests will fail until Runtime ships. That's expected.
- Use `Skill('superpowers:test-driven-development')` before starting.
- Commit per test file. Each auto-pushes.
- Do not modify Ch.0/Ch.1/Ch.2 tests or production code.

## Return

Under 500 words: test files created, AC mapping, coverage estimate, commit SHAs, `tail -5 .git/auto-push.log`.

## Out of scope

- Production code (Ch.3 Runtime will dispatch later, after Ch.2 stable).
- Ch.4 Verifier prompt content (you test the contract; Ch.4 supplies the prompt).
- UI (Ch.5).
