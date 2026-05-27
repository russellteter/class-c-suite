# Ch.7 Final — Audit/QA Report

**Date:** 2026-05-27
**Auditor:** EvidenceQA sub-agent (independent)
**Scope:** Full Ch.7 — 8 V1 playbooks + Open Q&A + home + design-system inheritance + 372 Ch.7 specs (185 Phase A + 187 Phase B)
**Verdict:** REOPEN
**Prior Phase A audit:** docs/reviews/ch7-phase-a-audit-qa-report.md (CONCERN-CLOSE)
**Phase A follow-ups:** PlanApproval countdown (issue #2, tracked outside this audit)

## Summary

Phase A holds: 185 specs pass, short PlaybookId names are in place, workstream_amounts_mirror TODO is documented. All four Phase B playbook modules are implemented with correct lens sets, B3 invariant, CPO conditional logic, board_narrative Cowork CTA, and RedTeam prompt parameterization. The playbookRouter resolves all 8 IDs without throwing. However, the run-loop `knownCh7Ids` guard (run-loop.ts:67–69) was never updated to include Phase B IDs — `gtm_realloc`, `strategic_option`, `board_narrative`, and `restructure_decision` fall through to the Ch.5 state-machine path, which never calls `routeToPlaybook` for them. Phase B modules exist, tests pass standalone, but no Phase B playbook is reachable end-to-end from `startRun`. This is the `wire-new-helpers` failure pattern. The fix is surgical (4 IDs added to the set), but it gates Ch.8's integration work.

## AC-by-AC verdict

| AC | Verdict | Evidence |
|---|---|---|
| AC-1 | PASS | All 8 modules export `runPlaybook` matching §3.1. `export const runPlaybook: PlaybookModule['runPlaybook']` confirmed in gtm-realloc/index.ts:140, strategic-option:~170, board-narrative:~180, restructure-decision:~195. |
| AC-2 | REOPEN | `playbookRouter.ts` resolves all 8 IDs (no throw). But `run-loop.ts:67–69` `knownCh7Ids` contains only `['pre_mortem','quick_read','stakeholder_1_1','open_qa']`. Phase B IDs skip the early-return block and enter the Ch.5 state-machine path (run-loop.ts:117+) which never invokes `routeToPlaybook`. Stale comment at run-loop.ts:66 reads "Phase B playbooks: throw (not yet implemented)" — predates the router-wiring commit b5985fa. |
| AC-3 | PASS | Lens sets per §3.2: gtm_realloc → CRO/CFO/CMO/CPO/COS (index.ts:31); strategic_option → CEO/CFO/CPO/COS (index.ts:32); board_narrative → CEO/CFO/CPO/CMO/COS/CRO (verified via file); restructure_decision → COS/CFO+CPO conditional (index.ts:36). All match ADR table. |
| AC-4 | PASS | `evaluatePrereqs` block/degrade/proceed matrix unchanged from Phase A audit. All Phase B modules import and call it. |
| AC-5 | PASS | `stakeholder_1_1` skeleton creation via SafeWrite confirmed in Phase A audit; no regression in audit-fix commit. |
| AC-6 | PASS | quick-read/index.ts:6 comment + line 128 `stamps: ['QUICK_READ']`, shipStatus: 'quick', writebacks disabled. |
| AC-7 | PASS | pre-mortem/index.ts:51 `stamps: ['ADVERSARIAL_ONLY', 'DRAFT']`; line 169 `stamps: ['ADVERSARIAL_ONLY', passed ? 'CLEAN' : 'DRAFT']`. Red-Team + Steelman only. |
| AC-8 | PASS | open_qa decomposer: regex-matching routes to playbooks, LLM fallback, rigor clamped to 85. Confirmed in Phase A audit; no regression. |
| AC-9 | PASS | Home screen 6 sections rendered with short PlaybookId names (Home.tsx:35–42). 8 playbook tiles listed with ordinal→Cmd mapping. Empty states where data unavailable confirmed in useHomeData. |
| AC-10 | PASS | useKeyboardShortcuts.ts:29–51: Cmd+1..8 dispatch via `ORDINAL_TO_PLAYBOOK`, Cmd+/ focus Open Q&A bar, Cmd+R refresh. |
| AC-11 | PASS | useHomeData.ts:37–38: `// TODO ch7-phase-b: wire home.workstreams variant when Runtime exposes it. // Source: workstream_amounts_mirror SQLite table (ADR-0009 §13.3 + B12 mitigation)`. Stubbed correctly, TODO documented per brief. |
| AC-12 | CONCERN | PlanApproval countdown gap carried forward from Phase A audit issue #2. Tracked as known follow-up outside this audit per brief instructions. |
| AC-13 | PASS | `grep -rn "reasoning_trace\|chain_of_thought\|thinking_trace" apps/utility/src/playbooks/` — zero hits. B3 invariant holds across all Phase B modules. RedTeam receives `{ synthesizedMemo, originalPrompt }` only (strategic-option:306, restructure-decision:274). |

## Phase B specific findings

1. **strategic_option + restructure_decision Red-Team B3 invariant**: PASS. Both call `runHeavyRedTeam(runId, draftMemo, input.prompt)` after synthesizer completes. Function signature takes `synthesizedMemo + originalPrompt` only. Comment in both files: "B3 invariant — memo input only." No lens transcripts passed.

2. **restructure_decision CPO-conditional logic**: PASS. `PRODUCT_ROLE_KEYWORDS` = `['product','engineering','technical','cto','vp eng','vp product']` (index.ts:42–49). `resolveActiveLenses` uses `lower.includes(kw)` so "product manager" → matches 'product'; "VP Eng" → matches 'vp eng'. "CFO" and "SVP Sales" match no keyword. All 6 ADR-0009 §8 cases covered.

3. **board_narrative Cowork CTA**: PASS. board-narrative/index.ts:256–260: memo footer contains "Draw up for Cowork", "class-brand-presentations" skill name, and invocation instruction.

4. **RedTeam prompt parameterization**: PASS. `apps/utility/src/prompts/RedTeam.prompt.md:3` — `{{redteam_mode}}` present with three branches: `pre_mortem` (default, receives lens outputs), `strategic_option` (synthesizedMemo only, B3), `restructure_decision` (synthesizedMemo only, B3, three mandatory risk categories). pre_mortem framing preserved.

5. **PlaybookId namespace**: PASS. Short names used in renderer/src/screens/Home.tsx:35–42, useKeyboardShortcuts.ts, and all Phase A/B playbook files. No legacy long-name strings found in source. dist/ files contain stale content (pre-rebuild expected artifact).

## Issues found

1. **AC-2: Phase B playbooks unreachable via startRun — run-loop knownCh7Ids not updated**
   `apps/utility/src/orchestrator/run-loop.ts:67–69` — `knownCh7Ids` contains only 4 Phase A IDs. Phase B IDs fall through to Ch.5 state-machine at line 117, which does not call `routeToPlaybook`. Router commit b5985fa wired `playbookRouter.ts` but missed the run-loop guard. Pattern: `~/.claude/rules/wire-new-helpers.md` — helper shipped, zero reachable call sites from production entry point.
   **Fix:** Add `'gtm_realloc','strategic_option','board_narrative','restructure_decision'` to `knownCh7Ids`; update stale comment at line 66; add run-loop-level integration assertions confirming Phase B IDs enter the early-return path.
   **Priority:** Critical — blocks all Phase B end-to-end usage.

2. **AC-2: Stale comment at run-loop.ts:66**
   `apps/utility/src/orchestrator/run-loop.ts:66` — "Phase B playbooks: throw (not yet implemented)." Predates b5985fa and is now false. Misleads future readers that Phase B dispatch is deferred.
   **Fix:** Update comment to reflect Phase B modules are live; update `knownCh7Ids` per issue #1.
   **Priority:** Medium (part of the same fix as issue #1).

3. **AC-12: PlanApproval countdown not implemented (CONCERN — known follow-up)**
   Tile click → plan-approval route works; auto-approve countdown per Decision 6 is absent. Carried from Phase A issue #2 with explicit brief instruction to mark CONCERN, not REOPEN.
   **Priority:** Low (tracked outside this audit).

4. **Vitest count: 81 failures vs. expected 80**
   Brief expects "~80 pre-existing failures." Actual: 81 unique-de-duped = 80. The raw output shows 81 due to one test file running twice (safewrite.spec.ts). Not a regression — count within tolerance.
   **Priority:** Low/informational.

## Spot-checks summary

- **Typecheck:** `pnpm -r typecheck` — exit 0, all 9 workspace projects clean.
- **Vitest:** 1210 passing / 81 reported (80 de-duped) failing / 16 skipped. No Phase B spec regressions. 80 pre-existing failures match expected profile.
- **Wire-up greps:**
  - `grep "from '@c-suite/shared-types/playbook'"` — 2 hits per Phase B module (PlaybookInput + DegradedSource). PASS.
  - `grep "throw.*not yet implemented|throw.*Phase B"` in `apps/utility/src/` — zero hits. Router source is clean. PASS (dist/ hits are stale artifacts).
  - `grep "reasoning_trace|chain_of_thought|thinking_trace"` in `apps/utility/src/playbooks/` — zero hits. PASS.
- **B3 invariant:** PASS. Both heavy-Red-Team modules receive `{ synthesizedMemo, originalPrompt }` only. RedTeam.prompt.md confirms mode-conditional input contracts.
- **Variant alignment:** PASS. Designs from 0009-design-gate-approved.md match implementation: Variant B dense rail home, 8 tiles short names, CTA footer in board_narrative.

## Phase 2 close recommendation

**Hold until fix. REOPEN.**

The single blocker is surgical: 4 IDs added to `knownCh7Ids` + comment update + one run-loop dispatch assertion. All Phase B playbook logic, tests, and router resolution are correct. Once the run-loop guard is updated and a test verifies Phase B IDs enter the early-return path, re-audit can be a targeted spot-check (not full re-run).

**Ch.8 dispatch: hold.** Ch.8 will build against Phase B integration. Dispatching against a broken production entry point would require immediate hotfixes in Ch.8 — dispatch after the knownCh7Ids fix is verified.

**Recommended fix commit:** `ch.7 fix: add Phase B ids to run-loop knownCh7Ids + update stale comment`
