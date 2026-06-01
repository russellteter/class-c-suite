# C-Suite Follow-up Specs — 2026-06-01 (workflow `wf_4f03e8a0`, adversarially verified)

Produced by a 3-thread investigate→verify workflow (Opus diagnosis for cash_model, Sonnet for the two
implementation specs; Sonnet adversarial verifier per thread). The verifiers caught **two would-have-broken-
the-build bugs** and the honesty verdict was **artifact-verified** by hand (not agent prose). These are the
CORRECTED specs — implement from here, not the raw investigator output. Each change is a separate clean phase
that must be re-verified with a live run (the 4/4 reliability baseline is attached to commit `9b5db30`).

---

## Thread 1 — Synth-size trim (recipe's "then tackle synth-size for UX")

**Mechanism (confirmed):** synth output 34.9–38.3KB is dominated by `positionMetadata` (52%, ~20KB); the model
carries 20–24 entries = ~all 23 input lens positions. No prompt ceiling (`Synthesizer.prompt.md:39,176`), no
schema `.max()` (`apps/utility/src/agents/index.ts:227`). `memoMarkdown` is 30% (10–13KB, all 7 required
sections — do NOT touch). `citations` top-level 8% (MemoViewer footnotes — do NOT touch).

**SHIP — Tier 1 (prompt-only, ~24% projected cut):** edit `apps/utility/src/prompts/Synthesizer.prompt.md`
- `:39` and `:176` — instruct: build `positionMetadata[]` from ONLY positions whose `positionId` appears in
  the memo body; **carry no more than 12 entries**; omit positions not referenced in `memoMarkdown`.
- The "include any positionId you cite in the memo body" phrasing is load-bearing — it prevents the Verifier
  citation-resolution gap (entries missing for cited positions → lower rigor).

**DO NOT SHIP — Tier 2 `.max(16)` (verifier BLOCK):** `.max(16)` sits **below** the measured baseline (the 4
clean runs had 22/23/24/20 entries) — it would have **failed every proven-good run** at `onSubagentStop`
validation (`dispatch.ts:220`). Violates `calibrate-guards-against-measured-baseline`. If a safety cap must
ship now, use **`.max(28)`–`.max(30)`** (above the observed max 24, pathological-blowup guard only). Otherwise
**defer any cap until 2–3 post-Tier-1 live runs measure the new distribution**, then set above that max.

**Verification required:** the 24% cut is a PROJECTION (no track record of the model honoring a prose count
cap on this surface). After editing, run the live harness once, measure the new Synthesizer
`length(structured_output_json)` + `positionMetadata` count + confirm rigor stays ~90 and status `shipped_clean`.

**Test:** `SynthesizerOutputSchema` is **not exported** (`agents/index.ts:220` is `const`, not `export const`)
— add `export` before writing the schema-cap test, or access via the exported `SynthesizerDefinition.outputSchema`.

---

## Thread 2 — Telemetry writers (model + tokens + cost_ledger)

**Mechanism (confirmed):** usage discarded at 3 dispatch sites (`dispatch.ts:114-125/214-225/294-303` extract
only `envelope.structuredOutput`, drop `tokensIn/tokensOut`); `hooks.ts:178-182` UPDATE omits model/tokens; the
**Verifier never INSERTs an agent_invocations row at all** (calls neither `createHooks` nor `tool-calls.ts`) —
the single most expensive (Opus) call is absent from telemetry. Zero `cost_ledger` INSERT sites exist.

**Changes 1–4 (sound, apply as written):**
1. Add `model?: string` to `AgentOutputLike` (`packages/stub-harness/src/stub.ts:16` + the `dist/stub.d.ts`).
2. Return `model` in `RealClaudeClient._invokeOnce` (`realClaudeClient.ts:309-313`; `model` is in scope at :220).
3. Extend `onSubagentStop(rawOutput, usage?)` (`hooks.ts:163`); UPDATE adds model/tokens_in/tokens_out; add a
   `cost_ledger` INSERT with **`cost_usd = NULL`** (Max-subscription OAuth — never fabricate a USD figure; schema
   marks it nullable, `001_initial.sql:83`). **Remove the dead `const { randomUUID } = await import('crypto')`**
   (verifier: never used; entry_id is `${runId}-${role}-${Date.now()}`). Use `unixepoch()` for `recorded_at`
   (seconds, consistent with the DB — not `Date.now()`).
4. Pass `{model,tokensIn,tokensOut}` from `envelope` to `onSubagentStop` at the 3 live/record sites. Replay sites
   pass no usage (optional) → NULL columns, no ledger row (correct).

**Change 5 (verifier CRITICAL fix — original would break all 4 live runs):** do **NOT** change
`VerifierInvoker.invoke()`'s return type to the wrapper — `runVerifier:147` parses that return directly with
`VerifierOutputSchema.safeParse`, so returning `{structuredOutput,model,...}` throws `VerifierOutputContractViolation`
on every live run. Instead: add a public `lastUsage?` field on `StubVerifierInvoker`, set inside `invoke()`
(which keeps returning bare `structuredOutput`), and after `runVerifier()` returns in `run-loop.ts:347` +
`playbookVerifier.ts:175`, gate on `STUB_MODE==='live' && invoker.lastUsage` → call a new
`writeVerifierTelemetry(db,runId,usage)` helper (INSERT OR IGNORE the invocation row + UPDATE + cost_ledger).
Also update the inline client type in the `StubVerifierInvoker` constructor (`verifier-runner.ts:49-54`), or access
`envelope.model` via a cast, else `pnpm typecheck` fails.

**Test:** new `tests/unit/telemetry-writers.spec.ts` — drives live-usage branch (asserts model/tokens set +
1 cost_ledger row + `cost_usd IS NULL`) and replay branch (NULL columns, 0 ledger rows). DB-only, no SDK/auth.

---

## Thread 3 — cash_model / stub-guard (HONESTY — investigated, **artifact-verified**)

**Mechanism (confirmed + hand-verified against runtime artifacts):** `cash_lever` is **deliberately excluded
from `KNOWN_CH7_PLAYBOOK_IDS`** (`run-loop.ts:39-41`, `filter(id => id !== 'cash_lever')` — verified). The stub
guard `runPlaybookGuarded` (`run-loop.ts:127`) lives **inside** the `if KNOWN_CH7…has(playbookId)` block, so
cash_lever falls through to the Ch.5 generic 6-lens path (`:213+`) which never calls the guard, the adapter,
`STUBBED_SOURCES`, or `stubCashModelQuery`. Cash data reaches the lenses via `buildCashLeverGrounding()` →
`readXlsxLeverRows()` (real SheetJS reader, `data/cash-model.ts:86`) as `contextDocuments`. The guard /
`STUBBED_SOURCES=['cash_model']` / `stubCashModelQuery` are **dead code on the interactive path** — reached only
by the cron `mondayTripwire.ts:168`.

**Honesty verdict — NOT a DOCTRINE #1 violation (artifact-verified, not prose):**
- `tool_calls = 0` across all 4 runs → the stub's `readXlsxLeverRows` INSERT (`index.ts:226`, fires even under
  `allowedTools:[]`) never ran → **stub ruled OUT**.
- f617c0ed memo: **0 stub fingerprints** (Barclays facility / Semi-monthly payroll / Hardware refresh Q3 / …),
  **5 real xlsx markers** ($8.05M, BME, 03_Cost_Levers, cash-model-levers, Class_Cash_Lever_Model). All 4 runs
  cite real line items that exist only in the real xlsx → **built-on-real-grounding PROVEN**.
- The misleading parts are **docs, not behavior**: `STUBBED_SOURCES=['cash_model']`, the `index.ts:391-396`
  comment, the backlog P1, and the CLAUDE.md gotcha all describe a guard that does not run on this path.

**Recommendations:**
- (a) No honesty fix needed for the interactive path — runs ship legitimately clean.
- (b) **Un-stub (small, shapes already match):** in `stubCashModelQuery` (`cash-lever/index.ts:204-240`) replace
  the hardcoded 5-row array with `readXlsxLeverRows(vaultPath)` (thread `ctx.vaultPath` through
  `runCashLeverPlaybook→runCfoLens`, default `defaultVaultPath()`); `LeverRow` fields already match the result
  shape (zero schema gap). Set `degraded = rows.length === 0`. Then drop `'cash_model'` from `STUBBED_SOURCES`
  (`:396`) — makes the cron/adapter path legitimately clean too and removes the dead-stub liability.
- (c) **Do NOT** route interactive cash_lever through `runPlaybookGuarded` (STUBBED_SOURCES non-empty today →
  would THROW and break the 4 clean runs).
- (d) **The real latent gap to close (highest-value honesty fix):** Ch.5 grounding **never blocks** —
  `run-loop.ts:242-244` swallows any failure → `[]`, so a **missing/renamed xlsx would still ship an UNGROUNDED
  memo CLEAN at rigor 90+**. Add a degrade-on-empty-grounding stamp: when `buildCashLeverGrounding()` returns `[]`
  for cash_lever, push `cash_model_ungrounded` into the run's degradedSources / stamp DEGRADED. **Stamp, don't
  throw** (DOCTRINE: grounding never blocks).

**Test breakage to fix before (b):** `tests/unit/orchestrator/stub-guard.spec.ts:153`
(`expect(mod.STUBBED_SOURCES).toContain('cash_model')`) and `:125-141` (empty-STUBBED_SOURCES playbooks must
have no `stub*Query` identifier — requires fully renaming/removing `stubCashModelQuery`).

**Tests to add:** (1) regression: cash_lever NOT in KNOWN_CH7_PLAYBOOK_IDS + live start does not throw
StubbedSourceLiveError; (2) honesty-artifact: a live memo cites the real model (03_Cost_Levers) and contains
none of the stub strings; (3) post-un-stub degraded=true on empty xlsx; (4) post-(d): no-xlsx run ships DEGRADED.

---

## Recommended next-session order
1. **Thread 1 Tier 1** (smallest, recipe's next step) → edit prompt → live-verify reduction + still-clean.
2. **Thread 3 (d)** the ungrounded-ships-clean stamp (genuine honesty gap) — independent of (b).
3. **Thread 3 (b)** cash_model un-stub (drops the dead-code liability; fix the 2 named tests).
4. **Thread 2** telemetry (largest surface; the lastUsage Verifier fix is mandatory).

Raw workflow output (ephemeral): `/tmp/claude-501/.../tasks/wzs41ytw4.output`. Per-run logs: `/tmp/live-run-{1,2,3}.log`.
