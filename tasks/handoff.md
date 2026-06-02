# Handoff — 2026-06-02 → next · C-Suite V1: 3/5 closed, dogfood is the last gate

## North star (zoom out)
Every V1 criterion that engineering CAN close is now closed. **C1, C2, C4 are fully closed and proven
on-Mac** (vault-grounded strategic decision → 6-lens memo → in-app render with clickable dated Sources →
CoWork handback). **C3 is Phase 4** (NetSuite live financials, off the dogfood path). **C5 is the only thing
between "it works" and "V1 DONE" — and it's Russell's to do, not engineering:** he runs ONE real COO decision
through the in-app box this week and can name ≥1 dated vault item that changed his thinking. Three grounded
memos + two CoWork bundles already sit in the vault; the dated, now-CLICKABLE "Vault context used" Sources
section renders. C5 is meetable today. Remaining engineering (priorities below) RAISES TRUST for the dogfood;
it does not unblock C5.

## What was done this session (C4 render half — commit `5d7a481`)
Closed C4's render half: **clickable dated vault Sources**, the a→b→c chain the prior handoff scoped.
- **(a)** `runStrategicGrounded` (`open-qa/index.ts`) emits one `vault.retrieve` `tool_calls` row per injected
  note (`source_id=vault-N`, `result_json={path,title,date,excerpt}`, `agent_role='Retriever'`) via
  `insertToolCall` — the live path wrote ZERO before, so the click backbone was built but dark. This ALSO
  lights up the Verifier audit trail (`playbookVerifier` reads tool_calls) — V2-agentic-pilot foundation.
- **(b)** `renderVaultProvenance` threads a `[^vault-N]` badge onto each Sources line; `MemoViewer` already
  renders `[^id]` as a clickable badge. One generator (`vaultSourceId`) for both row + marker → no drift.
  Short indexed token (NOT `slug(path)`): the badge prints it, and the org corpus has two `context_bundle.md`.
- **(c)** `tool-call:get` now resolves **run-scoped** (`WHERE run_id=? AND source_id=?`) — `vault-N` repeats
  across runs, so unscoped would surface a stale run's excerpt (C2's promise). `invokeToolCallGet(runId,…)` +
  `MemoViewer` thread `memo.runId`.
- Hardened `phase1-grounded-decision.mjs`: page-independent wait loop (a renderer blip during the 9-17min
  synth must not abort a healthy run — it did the first attempt) + a citation-click assertion.

## Proof (live, run `0da8991c` — NOT tsc)
shipped_clean **rigor 83** (baseline 80/80 — 8 new Verifier entries did NOT regress) · 8 `vault.retrieve` rows
landed · memo Sources section rendered 8 `[^vault-N]` badges · in-app click on `[^vault-1]` resolved to the
`go-forward-org-structure.md` excerpt (live-DOM asserted + screenshot `phase1-c4render-org2-citation.png`).
Mechanics also unit-checked (source_id↔marker align, valid result_json) + run-scoped SQL verified vs real rows.

## Current state — burn-down: 3/5 fully closed
- **C1 ✅ · C2 ✅ · C4 ✅** (vs the V1_TARGET bar). **C5 READY** (dogfood — no eng gate). **C3 PARTIAL** (Phase 4).
- **Precision (`match-done-label`):** C4 closes against the FROZEN V1_TARGET bar = click-any-**SOURCE**. The
  PRD's click-any-**CLAIM** (inline prose citations on synthesized claims) stays **Phase 2** — the Synthesizer
  can't reliably emit the post-hoc `vault-N` slugs. Don't relabel this as the full PRD aspiration.
- HEAD: `5d7a481` (code) + a docs commit pushed. Runs on-Mac (`pnpm dev`, vite :5273). `STUB_MODE=live` default.

## Next priorities (ranked — all RAISE TRUST; none gate C5)
1. **[S] Synthesizer-size trim** (`tasks/followup-specs.md` Thread 1) — cap `positionMetadata` (~52% of the
   38KB output) to ≤12 entries; ~24% runtime cut on the 34-min worst case. Prompt-only; MUST live-measure on
   one harness run after (don't trust the projection). Reject the Tier 2 schema cap.
2. **[S each] Honesty gaps — close before any cash_lever/financial decision** (NOT gating the org/expense
   dogfood): (a) cash_lever degrade-on-empty-grounding stamp (`run-loop.ts:238-257` sets contextDocuments only
   if length>0 → swallows a read failure, ships ungrounded CLEAN; `tasks/followup-specs.md` Thread 3d); (b)
   DEGRADED badge on the Home run tile (today DEGRADED is memo-prose only; a "CLEAN" tile can hide a dropped source).
3. **[V2, not V1] Agentic pilot** — the evidence-chain backbone is now LIT (this session did the deterministic
   half the pilot's step 1 required). The bounded CFO-lens-on-cash_lever plan→act→observe loop is the upgrade
   on top. Full sequence + guardrails in `docs/agentic-pilot-consideration.md`. Do NOT start without Russell's go.

## Top workflows / use-cases
- **PRIMARY (nail this — it's now fully wired):** real COO decision → vault-grounded 6-lens memo → dated,
  CLICKABLE provenance Russell can SEE → "Draw up for CoWork" bundle. Every gate closed; only the dogfood remains.
- Ready today: **org-restructuring** + **expense-target** decisions (grounding proven, both render clickable Sources).
- NOT ready: **cash-runway / NetSuite board-financials** (NetSuite OAuth never run; Phase 4).

## Open threads
- C4 click-any-CLAIM (inline prose citations) = Phase 2 (Option B; model-reliability dependent).
- Honesty gaps (priority 2) — close before any financial decision.
- Telemetry dark: `model`/`tokens`/`cost_ledger` have no write sites (`tasks/followup-specs.md` Thread 2).
- B22: vault has zero git commits — memos write fine (commitVault:false), but the first SHARED-zone write
  throws `VaultNotInitializedError`. Run `scripts/vault-bootstrap.sh` before shared-zone production use.
- Echo watch: grounded runs now rank prior memos/handoffs (the corpus grows with each run). Rigor stayed 83;
  watch if memos crowd out source notes.

## Next step
V1 engineering is essentially done (3/5 closed; C3=Phase 4; C5=Russell's use). The highest-value engineering
left is priority 1 (synth-trim — a real UX win on the 34-min worst case) then priority 2 (honesty gaps). The
dogfood (C5) needs no code. The agentic pilot (priority 3) is V2 and needs Russell's explicit go.

## Resume recipe
1. Read `tasks/handoff.md` → `tasks/V1_TARGET.md` (frozen target + 3/5 burn-down) → `docs/build-log.md`
   (2026-06-02 C4-render entry) → `docs/agentic-pilot-consideration.md` (V2) → `CLAUDE.md` Gotchas.
2. Prep before any e2e: vite :5273 up; `pkill -f electron@33.4.11` between runs; clear stale runs
   (`sqlite3 "$HOME/Library/Application Support/@c-suite/main/runtime.db" "UPDATE runs SET status='failed' WHERE status='in_progress'"`).
   If you ran `npx vitest` (flips better-sqlite3 to Node ABI), `pnpm rebuild:electron` before launching the app.
3. For priority 1 (synth-trim): `tasks/followup-specs.md` Thread 1 → cap `positionMetadata` in the synth prompt
   → re-run `node tests/e2e/phase1-grounded-decision.mjs "<question>" <tag>` and MEASURE the runtime + rigor delta.
