# Handoff — 2026-06-02 → next · C-Suite V1: 3/5 closed; priority 1 (synth-trim) DONE

## What was done this session
- **Priority 1 (Synthesizer-size trim, Thread 1) SHIPPED + live-measured.** Prompt-only edit to
  `apps/utility/src/prompts/Synthesizer.prompt.md` (lines 39 + 176): `positionMetadata` mirrors EXACTLY the
  positions cited in `memoMarkdown`, capped at 12, with a load-bearing lower bound (every cited `positionId`
  gets an entry → protects Verifier citation-resolution).
- Rejected the Tier 2 schema `.max()` cap per spec (sits below measured baseline → would block good runs).
- Verified the premise before writing (advisor): positionId tokens (`CFO-p1`) DO appear literally in the memo
  body, so the cap filter is real (not a phantom that zeroes the array).
- Built utility, confirmed **dist == src** (the stale-prompt trap), then ran ONE live grounded harness run.
- Corrected the record twice (advisor caught both): attribution + the "quality held" overclaim (see below).
- Recorded Russell's product-shape call: **keep the shorter memo** (open question closed).

## Current state — burn-down unchanged: 3/5 fully closed
- **C1 ✅ · C2 ✅ · C4 ✅** (vs V1_TARGET). **C5 READY** (dogfood, Russell's use, no eng gate). **C3 PARTIAL** (Phase 4).
- Synth-trim is live in the default strategic path. Run `40489d03` vs baseline `0da8991c` (same question):
  synth output **45,577→33,296 B (−27% total)**, positionMetadata **18→12**, rigor **83→83**, `shipped_clean`,
  **0 citation gaps**, memo structurally complete (7 sections, 4 falsifiers, grounded on 8 notes, click resolves).
- **Attribution (don't misread):** the cap itself bought only −6,236 B ≈ **14% of total (~half the −27%)** and
  UNDERSHOT the 24% projection; memo prose (−3,379) + other fields (−2,666) made up the rest.
- Memo prose shrank 23% (14,764→11,385) as a side effect — lands inside the spec's normal 10-13KB range; the
  14.8KB baseline was the high outlier. "Verifier-clean" ≠ proof depth was preserved; Russell chose keep.
- HEAD == origin/main == `07dbb05`. Runs on-Mac (`pnpm dev`, vite :5273). `STUB_MODE=live` default.

## Files touched (commits 048af74, 592f778, 07dbb05 — all pushed)
- `apps/utility/src/prompts/Synthesizer.prompt.md` (+4/-2): the cap + exact-mirror + lower bound.
- `docs/build-log.md` (+77): 2026-06-02 synth-trim entry with corrected attribution + decision record.
- (dist is gitignored; rebuilt locally. Pre-existing untracked `D build/entitlements.mac.plist` is NOT this session.)

## Open threads (priority 2 is next; none gate C5)
- **Priority 2 — honesty gaps (close before any cash_lever/financial decision):** (a) cash_lever
  degrade-on-empty-grounding stamp — `run-loop.ts:242-244` swallows a read failure → `[]` → ships ungrounded
  CLEAN; spec `tasks/followup-specs.md` Thread 3(d): stamp DEGRADED, don't throw. (b) DEGRADED badge on the
  Home run tile (today DEGRADED is memo-prose only). Both are `[S]`, prompt/code-local.
- **Thread 3(b)** un-stub cash_model (drop dead-code liability; fix 2 named tests) and **Thread 2** telemetry
  writers (largest surface; the `lastUsage` Verifier fix is mandatory — see Thread 2).
- **V2, needs Russell's go:** agentic pilot (`docs/agentic-pilot-consideration.md`).
- Decouple fallback for memo depth (cite ≤12 positionIds but keep fuller prose) is UNTESTED — only if dogfood reads thin.

## Next step
Priority 2(a): the cash_lever degrade-on-empty-grounding stamp (genuine honesty gap, independent of un-stub).
Spec is `tasks/followup-specs.md` Thread 3(d). Stamp DEGRADED on empty grounding; do NOT throw (grounding never blocks).

## Resume recipe
1. Read `tasks/handoff.md` → `tasks/followup-specs.md` (Thread 3d, then Thread 2) → `CLAUDE.md` Gotchas
   (cash_lever path, RealClaudeClient JSON/maxTurns, synth-is-slow, started_at-is-seconds).
2. Prep before any e2e: vite :5273 up; `pkill -f electron@33.4.11` between runs; clear stale runs
   (`sqlite3 "$HOME/Library/Application Support/@c-suite/main/runtime.db" "UPDATE runs SET status='failed' WHERE status='in_progress'"`).
   If you ran `npx vitest` (flips better-sqlite3 ABI), `pnpm rebuild:electron` before launching.
3. For Thread 3(d): open `apps/utility/src/orchestrator/run-loop.ts:242` (the grounding `[]`-swallow), add the
   degrade stamp, `pnpm --filter utility build`, then live-verify a no-xlsx cash_lever run ships DEGRADED (not CLEAN).
4. After any prompt/utility edit MUST `pnpm --filter utility build` (live tests dist/, not src/).
