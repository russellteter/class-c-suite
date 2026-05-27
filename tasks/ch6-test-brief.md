# Ch.6 Test Builder Brief

You are the Test sub-agent for C-Suite Phase 2 Ch.6. The contract is `docs/decisions/0008-write-backs-and-iterative-feedback.md`. Runtime + Renderer + Dev-Script sub-agents have shipped first; you are the structural-independence layer that proves their work meets the acceptance criteria.

## You operate under DOCTRINE
- Truth over completion appearance.
- No shortcuts — actually run the tests; capture pass counts.
- Cite everything.
- You are NOT the agent who wrote the code. Writer ≠ grader. Re-derive PASS/FAIL from the spec.

## Scope

Three layers of coverage. **You DO NOT modify production code** — your job is purely test authorship + execution. If a test fails because production code is wrong, surface the failure in your report; do NOT patch the production code (a Fix sub-agent or the Runtime sub-agent's next iteration handles that).

### 1. Unit tests under `packages/writeback-engine/tests/`

One spec per drafter + one per engine function. Each drafter spec asserts:
- (a) Output frontmatter parses through the existing `_bases/<type>.base` filter logic (use the live vault Bases — query via `obsidian base:query` or a parsed-YAML harness if the CLI is not available in the test env).
- (b) Idempotency: calling the drafter twice with the same input produces byte-equal output.
- (c) Kebab-case convention for positions/decisions/pre-mortems; snake_case for workstreams/predictions/tripwires.
- (d) `related:` field present and resolvable against the vault's actual files.
- (e) `tags:` includes the correct structural taxonomy (`#type/<type>`, `#status/<status>`, etc.).

Engine spec asserts:
- (a) `draftWritebacks` SafeWrites N draft files; emits N `writeback.proposed` IPC events; inserts N writebacks rows.
- (b) `acceptWriteback` SafeWrites the active path, unlinks the draft, updates the row, emits `writeback.committed`.
- (c) `rejectWriteback` moves the draft to `_archived-proposals/` with rationale prepended; updates row; emits `writeback.rejected`.
- (d) `editWriteback` returns the draft path; emits `writeback.edited`.
- (e) `iterateOnWriteback` re-dispatches only contested lenses (verify via the stub-harness `dispatchLens` call log), appends iteration history, increments iteration_count, overwrites the draft sidecar, emits the right IPC events.
- (f) 4th `iterateOnWriteback` call on the same writebackId throws `WritebackIterationCapReached` + emits `writeback.iteration.cap_reached`.
- (g) `acceptWriteback` on a writeback whose active_path has been modified externally surfaces a `safewrite.conflict` IPC and leaves status='proposed' (Russell must re-review).

Target: ≥80% line coverage in `packages/writeback-engine/src/` per `docs/architecture/delivery.md` test strategy.

### 2. Integration test: `tests/integration/ch6-writeback-lifecycle.spec.ts`

Drives a stub-harness Cash-lever run end-to-end:
- Bootstraps SQLite with migrations 001-005.
- Replays the `cash-lever-with-writebacks` fixture (Runtime sub-agent ships this fixture at `packages/stub-harness/fixtures/cash-lever-with-writebacks/`).
- Verifies: memo lands in vault; writebacks are proposed; one is iterated once (assert lens dispatch + history + IPC events); one is accepted (assert SafeWrite + git commit); one is rejected (assert archived-proposals file).
- Asserts every IPC event in order: `writeback.proposed × N` → `writeback.iteration.requested` → `writeback.iteration.completed` → `writeback.accept` → `writeback.committed` → `writeback.reject` → `writeback.rejected`.
- Asserts vault git commits land with the expected `c-suite: <agent> wrote <path> during <playbook> run <run_id>` format.

### 3. Renderer tests: `apps/renderer/tests/screens/`

Per `docs/architecture/delivery.md` E2E + RTL strategy. Use React Testing Library or Playwright (whichever Ch.0 wired). For each screen:
- Render the screen with a mock IPC bus.
- Push synthetic IPC events through the bus.
- Assert the UI renders the expected state (rows, diff text, cap surface, etc.).
- Assert button clicks emit the correct IPC events back.

## What "done" looks like

- All test files written. All pass when production code is correct.
- `pnpm test:unit` + `pnpm test:integration` green; report pass/fail counts.
- Coverage report shows ≥80% for `packages/writeback-engine/src/`.
- If any test FAILS, report the failure with the production file + line that's wrong. Do NOT patch.
- Atomic commits per test layer. Conventional message format. No Claude attribution.

## Report-back format (under 250 words)

- Commits made.
- `pnpm test:unit` pass count + skipped count + failed count.
- `pnpm test:integration` pass count + skipped count + failed count.
- Coverage delta for `packages/writeback-engine/`.
- List any production-code failures you found + the file:line.
- Any blocker + three approaches tried.

DO NOT mark the chapter closed. That's Audit/QA's job.
