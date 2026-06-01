# World-Class Readiness Backlog

> Reconstructed 2026-05-29 after the orchestrating session froze (ECONNRESET on the *orchestrator's
> own* API connection, not the app) mid-synthesis. This version is grounded in re-verified evidence
> from the runtime DB, the live-run log, and source reads — and **corrects three misdiagnoses** the
> frozen session was about to ship. Evidence is cited as `file:line`, DB query, or `/tmp` log.

## Headline

The C-Suite is **real**: it boots, persists, renders (replay-proven), passes its unit suite, and
SafeWrite is safe. A **live grounded run genuinely works** — it reads the real cash-model xlsx and
produces real, cited C-suite analysis. But **no live run has ever completed end-to-end to a shipped
memo**, so **0 of 8 V1 outcomes pass on-Mac**. The single thing standing between "real" and "first
outcome proven" is letting one live run *finish*.

## Moment of truth — what the live run actually does (PROVEN, with evidence)

From `/tmp/live-cash-real-vault.log` (run launched 2026-05-29 20:19):

- `cash_lever grounding: 10 lever rows from Class_Cash_Lever_Model_v5_2026-05-18.xlsx → contextDocuments`
  — the real xlsx reader (`apps/utility/src/data/cash-model.ts`, landed in `fcf7b36`) fired and fed
  real lever rows to the lenses. Grounding is real.
- **CEO** lens completed 20:23:55, `model: claude-sonnet-4-6`, with real cited figures: $14.36M
  forecast collections, $6.96M cost levers, $8.05M Class/Collaborate AR, BME $1.4M overdue from 2022-23.
- **COS** lens completed 20:25:45, `claude-sonnet-4-6`, real operational analysis (flagged the model
  is un-actuated: every Annual Adjustment = $0).

This is real live inference against real business data. The lens layer is **done and proven**.

## P0 — RESOLVED 2026-05-31: first live grounded memo shipped CLEAN (rigor 92)

**RESOLUTION.** A full live `cash_lever` run completed end-to-end and shipped a real grounded,
Opus-verified memo: `memos/2026-06-01-cash_lever-f617c0ed.md` (11.8KB, rigor **92/100** CLEAN, final
state `handoff`). Chain ran with no stubs/fallbacks: 6 grounded lenses → RedTeam → Steelman →
Synthesizer → Opus Verifier (`claude-opus-4-7`, real score, not the 85 fallback) → SafeWrite. Three
fixes beyond the harness-timeout below got it there: (1) the generic run-loop never *dispatched*
RedTeam/Steelman (only recorded them) and loaded the wrong multi-mode prompts → added
`dispatchAdversarial` + dedicated `RedTeam.sixLens`/`Steelman.sixLens` prompts; (2) a flat 5-min stall
timeout false-aborted the legit 9-17 min Synthesizer (a 30-38KB memo gen — SLOW, not hung; that "hang"
call was a symptom-without-discriminator error) → role-aware ceilings (Synth 25m / Verifier 20m / rest
8m); (3) `RealClaudeClient` had no timeout at all → added one. Commits `b9bb0b9`, `8ac3705`, `e7b7481`.
The original symptom + harness-timeout analysis below is kept for history.

**Original symptom:** every recent live `cash_lever` run was `status=in_progress`, no memo.
DB: 10 in_progress / 10 failed / 10 shipped_clean (shipped_clean are replay/stub seeds, e.g. the 280B
placeholder `bb235f24`). Only one memo file exists on disk (the placeholder seed).

**Root cause (verified, not guessed):** the live run is *killed mid-flight*, not crashing. The log
shows CEO done at 4 min, COS at 6 min, then `app quitting — stopping supervisor` at the 15-min mark.
The driver `tests/e2e/live-cash-real-vault.mjs` polled for only **900s** then closed the app. A full
run is 6 lenses (~4-6 min each, only partly concurrent under the token-budget scheduler) + Synthesizer
+ RedTeam/Steelman + the Opus Verifier + memo write ≈ **~40 min**. The 15-min window never let it
finish. Six of the "in_progress" rows are just timed-out relaunch attempts across the day, each
killed at 15 min.

**Fix in flight:** harness poll window extended 900s → 3600s (`live-cash-real-vault.mjs`, `1800`→`7200`
iterations); utility rebuilt; relaunched 2026-05-29 ~21:38 against the real vault. If it completes,
the first real grounded memo lands in `<vault>/memos/` and the first V1 outcome is provable on-Mac.

**Durable follow-on (P1):** the "parallel" fan-out (`run-loop.ts:243`, Promise.all over 6 lenses) was
meant to cut the leg to ~3-4 min but the token-budget scheduler serializes it (COS finished only ~2
min after CEO — partial concurrency, not full). Either raise the scheduler's concurrency for the live
lens leg, or accept ~40-min runs and stop driving them through a short-timeout harness. A 40-min
foreground harness is the wrong long-term shape — the app should run the job and notify; the harness
is a test driver, not the product path.

## Corrections to the frozen session's misdiagnoses (do not re-chase these)

1. **"Died on a network blip; add retry."** Retry (`realClaudeClient.ts:192-214`, committed `67910fa`)
   is correct defense and worth keeping, but it was **not** the blocker. The relaunch *with* retry
   still produced no memo — because the blocker is the harness timeout, not a transient error. The
   ECONNRESET that froze the session was the **orchestrator's own** Claude Code connection
   (`✻ Brewed 1h22m` → `API Error: ECONNRESET`), never the C-Suite app's inference.
2. **"Double-dispatch / twin runs."** There is no double-dispatch. With corrected timestamps
   (`runs.started_at` is **seconds** via `unixepoch()`, not ms — dividing by 1000 produced the bogus
   `1970` display), consecutive cash_lever runs are 698-9745s apart: separate relaunches, not twins.
   `PlanApproval.tsx:96-97` guards with `approvedRef`; only `run.start` reaches the utility
   (`handlers.ts:38`). One approve → one run.
3. **"App has never run live / all stub."** False — and nearly shipped. It was inferred from
   `model=NULL` + empty `cost_ledger` + empty `tool_calls`. But **none of those columns have a
   writer**: `hooks.ts:178` UPDATE sets only status/output/completed_at; nothing writes `model`,
   `tokens_in`, `tokens_out`, or any `cost_ledger` row; `RealClaudeClient` sets `allowedTools: []`
   so a live run records zero `tool_calls` by design. Absence of those rows proves nothing. The log +
   the 5.7KB/6.1KB real lens outputs prove the opposite: live works.

## Verified P1/P2 backlog (evidence-cited)

- **Telemetry gap (P1).** `model`, `tokens_in/out` on `agent_invocations` and the entire `cost_ledger`
  table have **no writers** anywhere in `apps/utility/src` or `apps/main/src`. The app cannot report
  its own token spend or per-run cost; the cost/usage UI has nothing to read. Wire the SDK `usage`
  (`realClaudeClient.ts:251-254` already captures `tokensIn/tokensOut`) through `onSubagentStop`
  into the invocation row + a `cost_ledger` insert.
- **`cash_model` still stubbed in the playbook (P1).** `cash-lever/index.ts:335` still calls
  `stubCashModelQuery`; `STUBBED_SOURCES = ['cash_model']` (`:396`) makes `STUB_MODE=live` carry a
  **DEGRADED** stamp unless `ALLOW_STUBBED_LIVE=1`. The real xlsx reader feeds *grounding* but the
  playbook-internal lens path still stubs. Drop `cash_model` from STUBBED_SOURCES once the
  playbook-internal path reads the real model, so live cash_lever can ship **CLEAN**, not DEGRADED.
- **Silent verifier catch (P2).** `playbookVerifier.ts:129` `catch {}` swallows any tool-call audit
  error to an empty trail. The prior `id`-alias schema bug (now fixed at `:109-111`) hid here for a
  while. Log the caught error instead of swallowing it.
- **Persisted state transitions (P2, pre-existing Gap A2).** Ch.7 keeps `visitedStates` in memory;
  no `state_transitions` rows persist for resume/audit.
- **`*.set` IPC + `app_settings` (P2).** Settings writes and the `app_settings` table are unwired.

## What is genuinely proven-good (don't relitigate)

Boot chain (main + forked utility stay alive, 0 crashes); SafeWrite zone policy (memos untracked by
design, `commitVault:false`, ADR-0003 §2); render leg (run→memo→MemoViewer, replay-proven); the
unit suite; real xlsx grounding; live lens inference with real citations; live fail-loud on Verifier
contract violation (`run-loop.ts:342` re-throws rather than shipping a fabricated rigor 85).
