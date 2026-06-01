# Handoff — 2026-06-01 · Cash Lever reliability CLOSED (4/4) + vetted follow-up specs

## What was done
- **Reliability characterized — open thread #1 CLOSED.** Ran the live `cash_lever` harness 3 more times
  (resume-recipe next step): **4/4 consecutive `shipped_clean`, rigor 90–92** (all real Opus, none the 85
  fallback), all reached `handoff`, all grounded in 10 real lever rows. Runs `a9d30924` (90), `82650c08` (91),
  `e439c7fa` (91) + baseline `f617c0ed` (92). Synth 366–722s — none near the 25m ceiling; no stalls/retries/
  failures. Per-run data: `tasks/reliability-runs.md`. Method: serial (one Electron lock/DB/budget), each run
  bg + DB-verified + log preserved to `/tmp/live-run-N.log`.
- **Synth size is the real remaining issue (not reliability):** structured output is consistently 34.9–38.3KB.
- **Design-research workflow (`wf_4f03e8a0`, 6 agents, adversarially verified)** → vetted specs in
  **`tasks/followup-specs.md`**. Verifiers caught 2 build-breaking bugs in the raw specs (see below).
- **cash_model honesty question RESOLVED (artifact-verified, NOT a DOCTRINE violation)** + corrected the
  misleading CLAUDE.md gotcha + backlog P1. Surfaced a NEW real latent gap (below).
- No source changed — the 4/4 result stays attached to commit `9b5db30`.

## Current state
- **Working:** live cash_lever ships clean reliably (4/4). Boot/persist/render/unit-suite/SafeWrite green.
- **Vetted, ready to implement (`tasks/followup-specs.md`):**
  1. **Synth-size Tier 1** (prompt-only cap to ≤12 positionMetadata entries; ~24% projected cut — must be
     live-measured). **Do NOT add Tier 2 `.max(16)`** — it's below the measured baseline (22/23/24/20) and would
     fail every clean run; any cap must sit above 24 (`calibrate-guards-against-measured-baseline`).
  2. **Ch.5 degrade-on-empty-grounding stamp** — the genuine honesty fix (below).
  3. **cash_model un-stub** (small; drops dead-code liability; fix 2 named tests in `stub-guard.spec.ts`).
  4. **Telemetry writers** (largest; the `lastUsage` Verifier fix is MANDATORY — the obvious approach throws
     `VerifierOutputContractViolation` on every live run). `cost_usd` stays NULL (Max-sub OAuth, never fabricate).
- **NEW latent honesty gap:** Ch.5 grounding swallows a read failure → `[]` (`run-loop.ts:242-244`), so a
  missing/renamed xlsx would ship an **ungrounded memo CLEAN at rigor 90+**. Fix = stamp DEGRADED on empty
  grounding (don't throw). `tasks/followup-specs.md` Thread 3(d).
- **cash_model NOT "DEGRADED-eligible":** cash_lever is excluded from `KNOWN_CH7_PLAYBOOK_IDS` (`run-loop.ts:39`),
  takes the Ch.5 grounding path, never hits the stub guard. The guard/`STUBBED_SOURCES`/`stubCashModelQuery` are
  dead code on the interactive path (live only via cron `mondayTripwire.ts:168`). Verified: 4 runs `tool_calls=0`,
  0 stub strings, real-model citations.

## Open threads (priority order — see `tasks/followup-specs.md`)
1. Synth-size Tier 1 (recipe's "then tackle synth-size") → edit prompt → live-verify reduction + still-clean.
2. Ch.5 degrade-on-empty-grounding stamp (Thread 3d) — real honesty gap.
3. cash_model un-stub (Thread 3b).
4. Telemetry writers (Thread 2).
5. Other 7 V1 outcomes (other playbooks) live; `resumeRun` post-synth resume (still a fan-out-only skeleton).

## Next step
Implement Synth-size Tier 1 (the smallest, vetted, recipe-next change): edit the 2 lines in
`apps/utility/src/prompts/Synthesizer.prompt.md` per `tasks/followup-specs.md` Thread 1, **then
`pnpm --filter utility build`** (prompts are read from `dist/prompts/` — the build copies src→dist via
`copy-utility-assets.mjs`; editing src WITHOUT rebuilding makes the live run test the STALE dist prompt and
report a false "cap didn't work"), run the live harness ONCE, and measure the new Synthesizer
`length(structured_output_json)` + positionMetadata count + confirm `shipped_clean` at rigor ~90.

**UX-scope caveat (clarify the actual target first):** Tier 1 trims `positionMetadata` — INTERNAL structured
data that feeds the Verifier; Russell never reads it. It cuts the structured-JSON size (~38KB→~30KB) and synth
run-time/token-budget, but the **`memoMarkdown` Russell actually reads (10–13KB) is UNCHANGED**. So Tier 1 fixes
"runs take too long / token budget," NOT "the memo is too long to read." If the real complaint is memo reading
length, that's a SEPARATE prose-length prompt change (cap section paragraph counts) — not this ticket.

## Resume recipe
1. `cd "/Users/russellteter/Claude Code Projects/c-suite"` — read `docs/build-log.md` (last 2 entries) +
   `tasks/followup-specs.md` + `tasks/reliability-runs.md`.
2. Ensure vite up: `curl -s -o /dev/null -w '%{http_code}' http://localhost:5273` (else `pnpm dev` / `bash tests/e2e/run.sh`).
3. Live run: `pkill -9 -f electron@33.4.11; sqlite3 "$HOME/Library/Application Support/@c-suite/main/runtime.db" -cmd "PRAGMA busy_timeout=8000" "UPDATE runs SET status='failed' WHERE status='in_progress'"; node tests/e2e/live-cash-real-vault.mjs` (~16–34min; bg it). **Copy `/tmp/live-cash-real-vault.log` → `/tmp/live-run-N.log` after each run — the harness truncates its own log at launch.**
4. Verify: `sqlite3 "$DB" "SELECT substr(run_id,1,8),status,rigor_score FROM runs WHERE playbook='cash_lever' ORDER BY started_at DESC LIMIT 1"`; synth size/duration via `SELECT agent_role,(completed_at-started_at),length(structured_output_json) FROM agent_invocations WHERE run_id LIKE 'XXXX%'`. `started_at`/`completed_at` are SECONDS.
