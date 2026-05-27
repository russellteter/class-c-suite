# Ch.7 Phase A — Test Builder Brief

You are the Test sub-agent for C-Suite Phase 2 Ch.7 **Phase A**. The contract is `docs/decisions/0009-ch7-playbooks-home.md` §15 (acceptance criteria) — your job is to write the specs that verify each AC for Phase A scope.

**Phase A test scope:**
- Framework helpers (`evaluatePrereqs`, `decompose`, `createStakeholderSkeleton`, `routeToPlaybook`).
- 3 Phase-A playbooks (`stakeholder_1_1`, `pre_mortem`, `quick_read`) + `open_qa` decomposer routing.
- Home screen RTL specs (rendering + keyboard shortcuts + empty states).

**Out of scope for Phase A:**
- gtm_realloc, strategic_option, board_narrative, restructure_decision (Phase B).
- Full integration tests across the playbook router + dispatch (the intermediate Audit/QA pass owns the integration smoke).
- E2E `pnpm dev` smoke (Audit/QA owns it).

## You operate under DOCTRINE
- Truth over completion appearance — if a test is structurally fake (asserts that a const exists), mark it `it.todo` or refuse to write it.
- Cite source with file_path:line in spec descriptions.
- One assertion per `it`. If you need multiple, split.

## Scope (yours alone — non-overlapping with Runtime / Renderer briefs)

### 1. Framework helper specs

#### `tests/unit/playbooks/evaluatePrereqs.spec.ts`
- 8 playbook × {block / degrade / proceed} test matrix per ADR §3.6 + Phase R Decision 4.
- For each playbook: assert correct decision returned for representative dep states.
- Cover the block-vs-degrade boundary explicitly (e.g. `strategic_option` blocks when Salesforce missing; degrades when stale).
- ≥24 cases (8 playbooks × 3 states minimum).

#### `tests/unit/playbooks/decomposer.spec.ts`
- Deterministic pass: ≥8 cases of {prompt → expected playbook id route} from the regex set the Runtime sub-agent codifies (read the regex set from `apps/utility/src/playbooks/lib/decomposer.ts` — do not invent patterns).
- LLM pass: 2 cases — feed `StubClaudeClient` deterministic mock outputs, assert the returned `{ lenses, mcps, outputShape }` matches the mock.
- Edge: empty prompt → deterministic regex doesn't match → LLM decomposer fires. Confirm.

#### `tests/unit/playbooks/stakeholderSkeleton.spec.ts`
- `createStakeholderSkeleton({ name: 'Test Person', role: 'CFO' }, vaultRoot, mockSafeWrite)` writes the expected path.
- Frontmatter contains `type: stakeholder`, `_skeleton: true`, `_skeleton_run_id`.
- Slug is correct (lowercase + hyphen-joined).
- SafeWrite mock is called once with the expected args (atomic-write + git-commit).
- Stale handling: caller (`stakeholder_1_1` playbook) tested separately in §2a — this spec covers just the skeleton-creation primitive.

#### `tests/unit/playbooks/playbookRouter.spec.ts`
- For each `PlaybookId`, assert `routeToPlaybook(id)` returns a module with a `runPlaybook` function.
- Specifically: `cash_lever` adapter exports `runPlaybook`.
- Unknown id: throws or returns null (assert which, based on Runtime's actual choice — read it from the file before writing the spec).

### 2. Phase-A playbook specs

#### 2a. `tests/unit/playbooks/stakeholder-1-1.spec.ts`
- File present → reads from vault, lens dispatch fires once, COS lens only.
- File missing → skeleton created, stamp `STAKEHOLDER_SKELETON` present in result.
- File stale (>30d via mocked `last-updated`) → degrade flag present in result.
- LENSES constant equals `['COS']`.

#### 2b. `tests/unit/playbooks/pre-mortem.spec.ts`
- Lens fan-out skipped (no `dispatchLens` calls for the 6 strategic lenses).
- Red-Team dispatched first; Steelman second; sequential not parallel.
- Stamp `ADVERSARIAL_ONLY` present.
- Verifier still runs (assert `verifierScore` is non-null).

#### 2c. `tests/unit/playbooks/quick-read.spec.ts`
- All 6 lenses dispatched in parallel.
- Verifier NOT dispatched (assert no `verifierScore` computation).
- `rigorScore: null` in result.
- `proposedWritebacks: []` in result.
- Stamp `QUICK_READ`.
- Memo section order: COS / CFO / CRO / CMO / CPO / CEO.

#### 2d. `tests/unit/playbooks/open-qa.spec.ts`
- Deterministic-route case: prompt matches a regex → returns `{ kind: 'redirect', playbookId }` without dispatching lenses.
- Ad-hoc case: prompt doesn't match → decomposer fires → lens fan-out happens with the decomposer's lens set → Verifier runs → score clamped to 85.
- Both `rigorScore` (capped) and `rigorRawScore` (uncapped) are present in result when raw > 85.
- Stamp `DECOMPOSED_AD_HOC`.

### 3. Renderer specs

Use React Testing Library + the fixtures at `apps/renderer/src/screens/Home.fixtures.ts` (Renderer sub-agent's scope).

#### `tests/unit/renderer/Home.spec.tsx`
- 8 playbook tiles render (count assertion + visible-by-text).
- Open Q&A bar present + accepts text input.
- Workstream rail renders when fixtures provided; empty-state copy when empty.
- Top decisions list (5 rows) renders.
- Writebacks counter shows fixture value.
- Jobs strip: 5 slots, "Pending Ch.10" placeholder when no jobs.

#### `tests/unit/renderer/PlaybookTile.spec.tsx`
- Renders with required props.
- Click invokes `onClick` with correct payload.
- Disabled state when `blocked: true` — tooltip text contains `blockedReason`.
- Freshness dot color matches `freshness` prop.

#### `tests/unit/renderer/OpenQABar.spec.tsx`
- Multiline textbox accepts text.
- `Cmd+Enter` calls `onSubmit` with current value.
- Submit button disabled when `submitDisabled: true`.
- Decomposer preview chips render when `decomposerPreview` is non-null.

#### `tests/unit/renderer/useKeyboardShortcuts.spec.tsx`
- Cmd+1 through Cmd+8 → emits IPC `playbook.invoke` with correct ordinal-to-id mapping.
- Cmd+/ → focuses Open Q&A input (mock the element + assert focus call).
- Cmd+R → emits IPC `home.refresh`.
- Cleanup on unmount → no listener leak.

### 4. Vitest + RTL config sanity

If RTL isn't yet set up for renderer specs (Ch.6 deferred this), set it up. Pin `@testing-library/react ^16`, `@testing-library/jest-dom ^6`, `jsdom ^25`. Add `vitest.config.ts` `test.environment = 'jsdom'` for the `tests/unit/renderer/` glob.

If already set up (Ch.6 may have landed it): use the existing config; do not duplicate.

## Forbidden inferences
- Asserting against the wrong stamp (every playbook has a specific expected stamp set).
- Asserting LLM behavior nondeterministically (always use `StubClaudeClient` with seeded outputs).
- Writing tests for Phase B playbooks (out of scope).
- Touching `apps/utility/` source (Runtime sub-agent's scope).
- Touching `apps/renderer/` source (Renderer sub-agent's scope).
- Writing E2E tests (Audit/QA owns).

## What "done" looks like
- All spec files written.
- `pnpm vitest run` exit-0 clean. **All specs pass** — if a spec fails because the Runtime/Renderer sub-agent hasn't shipped the file yet, write the spec as `it.todo` for that case. Do NOT leave failing specs.
- ≥80 new specs across the suite (rough estimate; quality > count).
- Atomic commits: one spec file per commit ideally; or grouped by component if logical. `ch.7 tests: <what> — <why>`. No Claude attribution.

## Report-back format (≤250 words)
- Commits made (SHA + first-line message).
- Spec count by file.
- `pnpm vitest run` summary (passed / failed / todo).
- Any test you marked `it.todo` because the production file didn't exist at write time.
- Any blocker hit + three approaches tried.

DO NOT touch Runtime / Renderer source. DO NOT close the chapter.
