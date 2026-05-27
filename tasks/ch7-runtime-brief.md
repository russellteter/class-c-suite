# Ch.7 Phase A — Runtime Builder Brief (Novel-Structure Playbooks)

You are the Runtime sub-agent for C-Suite Phase 2 Ch.7 **Phase A**. The contract is `docs/decisions/0009-ch7-playbooks-home.md` (read it fully, especially §3 framework, §6 stakeholder_1_1, §9 pre_mortem, §10 quick_read, §12 open_qa, §14 sequencing, §15 ACs). Variant picks at `docs/decisions/0009-design-gate-approved.md`. This brief assigns scope; it does not restate the contract.

**Phase A scope** = the 3 novel-structure playbooks (`stakeholder_1_1`, `pre_mortem`, `quick_read`) + `open_qa` + the framework helpers all 7 remaining playbooks will share. Phase B (`gtm_realloc`, `strategic_option`, `board_narrative`, `restructure_decision`) is **NOT** in your scope — it dispatches after the intermediate audit per ADR-0009 §14.

## You operate under DOCTRINE
- Truth over completion appearance. UNKNOWN if you don't know.
- Cite every claim with file_path:line.
- You are NOT the agent who grades your work — structure for Audit/QA verification.

## Scope (yours alone — non-overlapping with Renderer / Test briefs)

### 1. Shared types — `packages/shared-types/src/playbook.ts` (new)

Exports verbatim from ADR-0009 §3.1: `PlaybookId`, `PlaybookContext`, `PlaybookDeps`, `PlaybookInput`, `PlaybookResult`, `Stamp` discriminated union, `LensRole` re-export. Zod schema where it's a wire-crossing type (PlaybookInput, PlaybookResult). `Stamp` enum: `'CLEAN' | 'DRAFT' | 'QUICK_READ' | 'DECOMPOSED_AD_HOC' | 'DEGRADED' | 'STAKEHOLDER_SKELETON' | 'ADVERSARIAL_ONLY'`. Re-export from `packages/shared-types/src/index.ts`.

### 2. Framework helpers — `apps/utility/src/playbooks/lib/`

- `evaluatePrereqs.ts` — `evaluatePrereqs(playbookId: PlaybookId, deps: PlaybookDeps): PrereqDecision`. Codify the Phase R Decision 4 matrix from ADR §3.6. Exports `PrereqDecision` discriminated union. Pure function.
- `decomposer.ts` — `decompose(prompt: string, fastClient: ClaudeClient): Promise<DecompositionResult>`. Two-pass per ADR §12.2: deterministic regex/keyword pass first (return `{ kind: 'route_to_playbook', playbookId }` on match), then LLM decomposer (return `{ kind: 'ad_hoc', lenses: LensRole[], mcps: McpId[], outputShape: 'memo' | 'list' | 'table' }`). Use Opus client for the LLM call. The deterministic regex set lives inline in the file — document each pattern with the playbook it routes to. Use `@c-suite/stub-harness/stub` (`StubClaudeClient`) in tests; real client comes from existing Ch.4 wiring.
- `stakeholderSkeleton.ts` — `createStakeholderSkeleton(name: string, role: string, vaultPath: string, safeWrite: SafeWriteClient): Promise<{ skeletonPath: string }>`. Writes `<vault>/stakeholders/_skeleton-<slug>.md` per ADR §3.7. Frontmatter: `type: stakeholder`, `name`, `role`, `_skeleton: true`, `_skeleton_run_id`. Body: 1-line note "Auto-generated skeleton — fill from real context." SafeWrite handles git commit.
- `playbookRouter.ts` — `routeToPlaybook(playbookId: PlaybookId): PlaybookModule`. Static map from id → imported playbook module's `runPlaybook`. Includes `cash_lever` (existing Ch.5 module re-exported under the new `runPlaybook` signature if the existing signature differs — see §3 below).

### 3. Existing `cash-lever` shape conformance

`apps/utility/src/playbooks/cash-lever/index.ts` currently exposes `runCashLeverPlaybook(...)` per ADR-0006 §1. **Re-export it as `runPlaybook` matching the §3.1 signature.** If the existing return type differs from `PlaybookResult`, add a thin shim in `apps/utility/src/playbooks/cash-lever/index.ts` (`export const runPlaybook: PlaybookModule['runPlaybook'] = async (input, ctx) => { const r = await runCashLeverPlaybook(...); return adaptResult(r); };`). Do NOT rewrite the cash-lever internals. Phase B will pattern-match against this adapter.

### 4. Novel-structure playbooks

#### 4a. `apps/utility/src/playbooks/stakeholder-1-1/index.ts`
- Per ADR §6 + §3.7.
- LENSES = ['COS'] constant.
- Threshold 70.
- Reads target stakeholder file from `<vault>/stakeholders/<slug>.md`; if missing, call `createStakeholderSkeleton(...)` and use it; stamp `STAKEHOLDER_SKELETON`.
- If file age > 30 days from `last-updated` frontmatter: degrade-flag (memo header note "Stakeholder file last refreshed N days ago").
- Single-lens fast lane: do NOT use the parallel lens-fan-out dispatcher. Use a direct `dispatchLens('COS', context)` call in sequence.
- Output: see ADR §6 (hot buttons / NOT bring up / open commitments / talking points / strategic questions).
- Writebacks: stakeholder-update proposals enabled (Synthesizer authors per Ch.6 contract; engine renders).

#### 4b. `apps/utility/src/playbooks/pre-mortem/index.ts`
- Per ADR §9 + §3.4.
- LENSES = [] constant (skip lens fan-out entirely).
- Pipeline: dispatch Red-Team first (sequential), then Steelman, then synthesize. Both adversarial roles use the existing prompts at `apps/utility/src/prompts/RedTeam.prompt.md` and `apps/utility/src/prompts/Steelman.prompt.md` (if Steelman prompt doesn't exist, write it — minimal: "Steelman the proposed action. Find its strongest defense against every Red-Team failure mode.")
- Output: failure modes (ranked) / early-warning signals / mitigation / response playbook.
- Verifier runs normally (grades citation discipline against the adversarial outputs).
- Stamp `ADVERSARIAL_ONLY` + `CLEAN | DRAFT`.

#### 4c. `apps/utility/src/playbooks/quick-read/index.ts`
- Per ADR §10 + §3.5.
- LENSES = ['CEO', 'CFO', 'CRO', 'CMO', 'CPO', 'COS'] constant.
- Parallel fan-out across all six.
- **No Synthesizer integration.** Use a lightweight aggregator (this brief — write it inline; not a separate prompt): concatenate each lens output's `summary` field into a fixed six-section memo. Section order: COS / CFO / CRO / CMO / CPO / CEO. Cap each section at 5 sentences (trim if longer).
- **Verifier bypassed.** `shipStatus = 'quick'`. `rigorScore: null`. `rigorThreshold: 0` (placeholder).
- **Writebacks disabled.** `proposedWritebacks: []`.
- Stamp `QUICK_READ`.

#### 4d. `apps/utility/src/playbooks/open-qa/index.ts`
- Per ADR §12.
- Calls `decompose(prompt, opusClient)` first.
- If `route_to_playbook`: return `{ kind: 'redirect', playbookId }` — the caller (`run-loop.ts`) handles re-dispatch.
- Otherwise: standard pipeline with the decomposer's lens set + MCP set.
- **Rigor clamping per §13.6.** Run Verifier normally; before returning `PlaybookResult`, compute `displayedScore = min(verifierScore, 85)` and surface both `rigorScore: displayedScore` and a new `rigorRawScore: verifierScore` field — add `rigorRawScore?: number | null` to `PlaybookResult` shape (back-compat: optional).
- Stamp `DECOMPOSED_AD_HOC`.
- Writebacks enabled.

### 5. Run-loop integration — `apps/utility/src/orchestrator/run-loop.ts`

- Add `playbook_id: PlaybookId` to the run input shape.
- Switch on `playbook_id` via `routeToPlaybook(playbook_id)`.
- For `open_qa` redirects: re-call `startRun` with the new `playbook_id` from the decomposition. (Bounded: do not infinite-recurse — the second call must NOT re-decompose.)
- For `quick_read`: skip the Verifier dispatch step entirely (`if (playbookId === 'quick_read') return assembleQuickReadResult(lensOutputs);` after the lens fan-out).
- For `pre_mortem`: skip the lens fan-out step (`if (playbookId === 'pre_mortem') return runPreMortemPipeline(...)` immediately after prereq check).
- All existing Ch.3–6 behaviors preserved.

### 6. IPC additions — `packages/shared-types/src/ipc.ts`

Add IPC variants:
- `playbook.routed` — payload `{ from: 'open_qa', to: PlaybookId, runId }`. Emitted by `open_qa` when it redirects.
- `playbook.prereq.blocked` — payload `{ playbookId, reason, remediation }`. Emitted by `evaluatePrereqs` block path.
- `playbook.prereq.degraded` — payload `{ playbookId, flags: DegradedSource[] }`. Emitted on degrade path.
- `playbook.stakeholder.skeleton_created` — payload `{ skeletonPath, slug, runId }`.

Do NOT change existing IPC payload shapes.

## Forbidden inferences (Audit/QA will REOPEN if you cross these)

- Inventing playbook IDs not in ADR §3.2.
- Mixing lens-routing (which lenses fire) with prereq evaluation (block/degrade). Two separate concerns.
- Reading reasoning traces from lens outputs (B3 invariant — Verifier blindness must hold).
- Writing UI code (`apps/renderer/`).
- Writing tests (Test sub-agent's scope).
- Patching `cash-lever` internals beyond the adapter shim in §3.
- Implementing Phase B playbooks (gtm_realloc, strategic_option, board_narrative, restructure_decision) — they're explicitly out of scope.
- Writing your own audit/QA report.

## What "done" looks like
- All files above written + `pnpm typecheck` exit-0 clean across utility + shared-types.
- All existing tests still pass (`pnpm vitest run`). You must not break Ch.0–6 tests.
- `grep -rn "from '@c-suite/shared-types/playbook'"` returns ≥1 hit per Phase A playbook module.
- Atomic commits: one concept per commit. Conventional message `ch.7: <what> — <why>`. No Claude attribution.

## Report-back format (≤250 words)
- Commits made (SHA + first-line message).
- Confirmation grep + typecheck green.
- Any contract ambiguity resolved + the decision logged.
- Any blocker hit + the three approaches tried before flagging.

DO NOT proceed to Phase B playbooks. DO NOT write Renderer or Test code. DO NOT close the chapter.
