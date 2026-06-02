# Handoff — 2026-06-02 → next · C-Suite V1: wedge proven, dogfood is the last gate

## North star (zoom out)
Every TECHNICAL gate for frozen V1 (vault-grounded strategic decision → 6-lens memo → in-app render with
provenance → CoWork handback) is CLOSED and proven on-Mac. The only thing between "it works" and "Russell
uses it" is **C5 dogfood**: he runs ONE real COO decision through the in-app box this week and can name ≥1
dated vault item that changed his thinking. Two grounded memos already sit in the vault (org, expenses) and
the dated "Vault context used" block already renders, so C5 is meetable now. Today's priorities exist to
RAISE TRUST so he runs a live decision in the app instead of reaching for CoWork — they de-risk the
experience, they do not unblock C5.

## What was done this session
- **C1 CLOSED** — `open-qa/index.ts` `runStrategicGrounded` (live default) ships a real 6-lens memo for any
  strategic decision; proven on both real decisions (org, expenses), rendered in-app.
- **C2 CLOSED** — `orchestrator/vaultRetriever.ts` (BM25×recency) injects top-8 current vault notes + dated
  provenance; port-fidelity gate passes; THE edge.
- **C4 handback CLOSED** — CoWork 3-file bundle proven end-to-end live on BOTH decisions (memo→CTA→preview→
  Send→`handoffs/<slug>/{brief,memo,continue-prompt}.md`; RealClaudeClient brief, 0 stub fingerprints).
- Fixed 5 live-only CoWork bugs tsc missed (IPC `originId`→`originPath`; `maxTurns:1` too tight for Handoff →
  role-aware 6; Handoff prompt markdown→JSON; dropped `runId`; missing frontmatter) — isolated via a new
  standalone harness.
- Settled the double-dispatch (clean run = 1 brief gen; failure-path artifact; ADR-0011 §5.1 holds).
- Docs: CLAUDE.md (+3 harnesses, +3 gotchas), V1_TARGET + build-log (honest burn-down), 2 new global rules.
- Wrote `docs/agentic-pilot-consideration.md` — the durable answer to "should this use real agents."

## Current state — burn-down: 2 fully closed, C4 substantial, C5 ready, C3 partial
- **C1 ✅ · C2 ✅** (fully closed). **C4** = handback + dated-provenance render DONE; render half (clickable
  Sources section) is Phase 2. **C5** READY (no engineering to trigger). **C3** PARTIAL (NetSuite = Phase 4).
- Deployed: nothing remote; runs on-Mac (`pnpm dev`, vite :5273). `STUB_MODE=live` is the app default.
- HEAD `f482c1c` pushed; CLAUDE.md + the two new docs are uncommitted in this session's final commit.

## Today's priorities (ranked — complete the tool for daily use)
1. **[XS, zero-eng] On-Mac visual check** — open both memos (org, expenses), confirm the "Vault context used"
   block shows the correct 2026-06-01 note dates. C5 precondition; if dates are wrong, everything downstream
   is moot.
2. **[S–M] Real clickable dated citations (C4 render half — the moat feature).** Three steps IN ORDER:
   (a) **load-bearing:** retriever emits a `tool_calls` row per injected note (`tool_name='vault.retrieve'`,
   `source_id=slug(path)`, `result_json=excerpt`) via existing `insertToolCall` — the live path writes ZERO
   `tool_calls` today, so fixing the click handler alone returns empty; (b) thread `source_id` onto rendered
   claims; (c) fix the citation-click handler (`handlers.ts:137`, `call_id` vs `source_id`). Step (a) also
   lights up the entire built-but-dark tool-call backbone (`hooks.ts:146` writer, `verifier-assembler.ts:83`
   reader) — foundational for V1 trust AND the V2 agentic pilot.
3. **[S] Synthesizer-size trim** (Tier 1 prompt cap, `tasks/followup-specs.md` Thread 1) — cap
   `positionMetadata` (~52% of output) to ≤12 entries; ~24% runtime cut on the 38KB/34-min worst case.
   Prompt-only; MUST live-measure on one harness run after (don't trust the projection). Reject Tier 2 schema cap.
4. **[S each] Honesty gaps — close before any cash_lever/financial decision (NOT gating the org/expense
   dogfood):** (a) cash_lever degrade-on-empty-grounding stamp (`run-loop.ts:238-257` sets contextDocuments
   only if length>0 → swallows a read failure, ships ungrounded CLEAN; Thread 3d); (b) DEGRADED badge on the
   Home run tile (today DEGRADED is memo-prose only; a "CLEAN" tile can hide a dropped source).

## Top workflows / use-cases
- **PRIMARY (nail this):** real COO decision → vault-grounded 6-lens memo → dated provenance Russell can SEE →
  "Draw up for CoWork" bundle. All gates closed; only the dogfood remains.
- Ready today: **org-restructuring** (surfaces ORG_CHART_BUILD_BRIEF / go-forward-org-structure / names
  Jorge/Clayton/Sabina) and **expense-target** (surfaces the ~$3.8-5.0M EBITDA figure) decisions; CoWork handback.
- NOT ready: **cash-runway / NetSuite board-financials** — SF+AWS+cash-xlsx pull live, NetSuite always
  degrades (OAuth never run, queries unset). Phase 4, and only if a real decision uniquely needs it.

## Agentic architecture (Russell's explicit ask) — see `docs/agentic-pilot-consideration.md`
**Narrow YES, V2.** Do NOT convert the parallel 6-lens fan-out to autonomous agents (PRD line 65 locks
parallel-independent lenses; inter-agent dialogue = 41.8% of MAST failures). Add a bounded plan→act→observe
loop in ONE place: the **CFO lens on cash_lever**, read-only (`ns_runCustomSuiteQL` + `run_soql_query`),
`maxTurns:4`. Key insight: **the tool-call backbone is built-and-dark** — the architecture was designed for
tool-using lenses (`toolAllowlist` field, `hooks.ts` writer, PRD line 19); `allowedTools:[]` was a shipping
shortcut. The loop unlocks live-data verification of synthesized numbers (the memos cite STALE vault figures
today) and per-lens retrieval the fixed top-8 can't. The evidence-chain fix (priority 2a) is deterministic
and closes the PRD's "click any claim → see the source" with zero agent risk — the loop is the upgrade on top.
Hard guardrails: never make the Verifier agentic; read-only only (PRD line 197); no inter-lens looping. Full
pilot sequence + risks in the doc.

## Files touched (this session)
2 commits: `8b47cfb` (C1+C2+C4 close), `f482c1c` (framing correction + expenses proof). Plus uncommitted:
`CLAUDE.md`, `docs/agentic-pilot-consideration.md`, `tasks/handoff.md` (this commit). New global rules:
`~/.claude/rules/{isolate-the-unit-before-rerunning-an-expensive-harness,match-done-label-to-the-criterions-bar}.md`.
`git diff --stat HEAD~2` covers the engine changes (vaultRetriever, open-qa, realClaudeClient, handoff/*, ipc).

## Open threads
- C4 render half (clickable Sources) — priority 2; tool_calls rows are the load-bearing piece.
- Two honesty gaps (priority 4) — close before any financial decision.
- Telemetry dark: `model`/`tokens`/`cost_ledger` have no write sites (use `lastUsage`, NOT the Verifier return
  type — `tasks/followup-specs.md` Thread 2). Off dogfood path; blocks the cost meter.
- B22: vault has zero git commits — memos write fine (commitVault:false), but the first SHARED-zone write
  throws `VaultNotInitializedError`. Run `scripts/vault-bootstrap.sh` before shared-zone production use.

## Next step
Priority 1 (on-Mac visual check of both memos' provenance dates — XS, gates the dogfood), then start
priority 2a (retriever emits `tool_calls` rows): it ships the moat feature AND lights up the backbone the V2
agentic pilot needs. Both are inside frozen V1 scope.

## Resume recipe
1. Read `tasks/handoff.md` → `tasks/V1_TARGET.md` (frozen target + burn-down) → `docs/build-log.md` (2026-06-02
   entry) → `docs/agentic-pilot-consideration.md` (for the V2 agentic question) → `CLAUDE.md` Gotchas.
2. Prep before any e2e: vite :5273 up; `pkill -f electron@33.4.11` between runs; clear stale runs
   (`sqlite3 "$HOME/Library/Application Support/@c-suite/main/runtime.db" "UPDATE runs SET status='failed' WHERE status='in_progress'"`).
3. Priority 1: `pnpm dev`, open both memos, eyeball the "Vault context used" dates. Then priority 2a:
   open `apps/utility/src/playbooks/open-qa/index.ts` `runStrategicGrounded` + `apps/utility/src/db/tool-calls.ts`
   (`insertToolCall`), emit a `vault.retrieve` row per injected note. Re-verify with
   `node tests/e2e/phase1-grounded-decision.mjs "<question>" <tag>` + a `SELECT FROM tool_calls`.
