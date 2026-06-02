# Handoff — 2026-06-02 → next · C-Suite V1: Priority 2(a) DONE; honesty gate PARTIALLY closed

## What was done this session
- **Priority 2(a) — cash_lever degrade-on-empty-grounding stamp (Thread 3d) SHIPPED** (commit `7ecf98d`,
  pushed; HEAD == origin/main). The interactive cash_lever Ch.5 path (`run-loop.ts`) swallowed a
  missing/renamed cash-model xlsx to `[]` and shipped an ungrounded memo `shipped_clean` at rigor 90+
  (DOCTRINE #1 appearance-over-truth gap). Now: empty `buildCashLeverGrounding()` →
  `degradedSources=['cash_model_ungrounded']` + a plain DEGRADED banner prepended to the memo. **Stamp, don't
  throw** — grounding still never blocks.
- Banner applied at the **Ch.5 return (post-Verifier)** so it cannot touch rigor; `FinalRunState.degradedSources`
  threaded out (consumed internally by `prependDegradedBanner`; **no production reader yet — awaiting (b)**).
- **Advisor-corrected before coding:** my first instinct (`runs.status='shipped_degraded'`) was cut — it's
  scope-creep into (b) and INERT today (Home tile never reads `r.status`; `memo:get` derives clean/draft from
  the `.draft.md` suffix, ignoring status). A status value with zero readers = `wire-new-helpers` anti-pattern.

## THE HONESTY GATE IS NOT FULLY CLOSED (read this before any cash_lever/financial decision)
Priority 2 exists to "close honesty gaps **before any cash_lever/financial decision**." 2(a) closed the **memo**
surface only. **The run row still says `shipped_clean` and the Home tile renders an ungrounded run identically
to a grounded one** (same rigor, "VIEW →", no badge). If Russell acts off the run-list/tile **without opening
the memo**, the ungrounded state is invisible — the same "looks clean at rigor 90+" symptom, surviving on the
surface 2(a) didn't touch. **The gate closes only when (b) ships.** This is a property of the gate, not a
deferred nice-to-have.

## Current state
- **Priority 2(a): DONE & proven.** **2(b): NOT done** (gate residual). V1 burn-down unchanged: **3/5** (C1✅
  C2✅ C4✅, C5 READY, C3 PARTIAL) — Priority 2 is a separate honesty track, does not gate C5.
- Proof (artifact, not self-report): spine-proof e2e through `dist` + Electron 33 ABI →
  `memo head: "> **DEGRADED: not grounded on the cash model.**\n..."` (banner is line 1 of the written memo),
  reaches `handoff` terminal (no throw). 5/5 new integration tests (empty-vault vs real-xlsx discriminator;
  positive control logs "1 lever rows → contextDocuments"). 66/66 regression on touched surfaces; typecheck 0.
- **better-sqlite3 ABI is currently ELECTRON (launch-ready).** I ran `rebuild:node` for vitest then
  `rebuild:electron` to restore. Run `pnpm rebuild:node` before vitest again; `pnpm rebuild:electron` before app/e2e.

## Files touched (commit `7ecf98d`, pushed)
- `apps/utility/src/orchestrator/run-loop.ts` (+42): degradedSources compute + `prependDegradedBanner` + return field.
- `tests/unit/orchestrator/cash-lever-grounding-degrade.spec.ts` (new, 5 tests).
- `docs/build-log.md` (+65): the 2(a) entry (honest 2a-done/2b-deferred labeling). dist gitignored, rebuilt locally.

## Next step — choose ONE, unambiguous (recommendation: do (b) to CLOSE THE GATE)
1. **(b) — close the honesty gate (RECOMMENDED, highest-value).** Persist degraded on the run row + render it
   on the Home tile + the structured MemoViewer banner. Concretely:
   - Persist: thread `result.degradedSources` to `apps/utility/src/index.ts:113-122` and set
     `runs.status='shipped_degraded'` when `degradedSources.length>0` and the run would otherwise be clean
     (precedence: failed > shipped_draft > shipped_degraded > shipped_clean). **Consumer-safe** — `handlers.ts:118`
     (`memo:get`) IGNORES `status` (derives clean/draft from the `.draft.md` suffix), and `runs:list`
     (`handlers.ts:45`) passes status through with no filter. Verify no other consumer assumes the closed set.
   - Render: Home tile (`Home.tsx:318-347`) — add a DEGRADED badge keyed on status (today it reads
     playbook/memoPath/rigor only). MemoViewer already has the `cs-degrade` structured surface
     (`MemoViewer.tsx:208-229`, fed by `memo.degradationWarnings`) — populate it from the run's degraded state in
     `memo:get`. **Introduce `shipped_degraded` together with these readers so it isn't inert.**
2. **Spec's alternative order (followup-specs.md, lower honesty-priority):** 3(b) un-stub `cash_model`
   (`cash-lever/index.ts:204-240` → `readXlsxLeverRows`; drop `'cash_model'` from `STUBBED_SOURCES`; fix the 2
   named tests at `stub-guard.spec.ts:153` + `:125-141`) → Thread 2 telemetry writers (largest surface; the
   `StubVerifierInvoker.lastUsage` Verifier fix is MANDATORY — see Thread 2, change 5).
- **V2, needs Russell's go:** agentic pilot (`docs/agentic-pilot-consideration.md`).

## Resume recipe
1. Read `tasks/handoff.md` → `tasks/followup-specs.md` (Thread 3 recommendations + Thread 2) → `CLAUDE.md`
   Gotchas (cash_lever path, RealClaudeClient JSON/maxTurns, synth-is-slow, started_at-is-seconds, memos-untracked).
2. Prep before any e2e: vite :5273 up; `pkill -f electron@33.4.11` between runs; clear stale runs
   (`sqlite3 "$HOME/Library/Application Support/@c-suite/main/runtime.db" "UPDATE runs SET status='failed' WHERE status='in_progress'"`).
   ABI dance: `pnpm rebuild:node` before `npx vitest`; `pnpm rebuild:electron` before app/e2e (currently Electron).
3. For (b): the degraded signal already exists on `FinalRunState.degradedSources` (this session). Wire it to the
   run row + tile + MemoViewer banner. Cheap e2e to confirm: `ELECTRON_RUN_AS_NODE=1
   "node_modules/.pnpm/electron@33.4.11/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron"
   tests/e2e/spine-proof.mjs` (empty vault → degraded path; ~seconds, replay).
4. After any prompt/utility edit MUST `pnpm --filter utility build` (live tests dist/, not src/).
