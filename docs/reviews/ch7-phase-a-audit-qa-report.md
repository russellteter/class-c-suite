# Ch.7 Phase A — Audit/QA Report

**Date:** 2026-05-27
**Auditor:** EvidenceQA sub-agent (independent)
**Scope:** Phase A — framework helpers + 3 novel-structure playbooks (stakeholder_1_1, pre_mortem, quick_read) + open_qa + home + Open Q&A bar + 185 specs
**Verdict:** CONCERN-CLOSE

## Summary

All 185 Phase A specs pass with zero new failures (pre-existing 80 failures are entirely better-sqlite3 ABI, all in pre-Ch.7 spec files). Typecheck is exit-0 across all 9 workspace packages. The four framework helpers (evaluatePrereqs, playbookRouter, stakeholderSkeleton, decomposer) each have live importers. The five playbook modules export `runPlaybook` with correct `PlaybookModule` shape. The four new IPC variants are present in `ipc.ts` without touching existing variant shapes. The B3 invariant holds — zero reasoning-trace reads in Phase A code. Three CONCERN-level gaps found: (1) `PlaybookId` naming split between renderer HomeTypes/ipc.ts (LONG names) and shared-types/playbook.ts (SHORT canonical names) — documented in playbook.ts:6-8 but no Phase B TODO was filed in HomeTypes.ts; (2) auto-approve countdown per Decision 6 is absent from `PlanApproval.tsx` (AC-12 partial); (3) `workstream_amounts_mirror` source is mentioned in ADR-0009 §11.2 and §13.3 but not referenced in the IPC wiring code — documented only as a generic `home.workstreams` TODO. None of these block Phase B dispatch; all are Phase B wiring work.

## AC-by-AC verdict

| AC | Verdict | Evidence |
|---|---|---|
| AC-1 | PASS | All 5 Phase A modules export `runPlaybook: PlaybookModule['runPlaybook']`. cash-lever:368, stakeholder-1-1/index.ts:89, pre-mortem/index.ts:38, quick-read/index.ts:72, open-qa/index.ts:55 |
| AC-2 | PASS | run-loop.ts:63-101 switches on `knownCh7Ids` Set and calls `routeToPlaybook`; Phase B IDs throw per router:30-35 |
| AC-3 | PASS | stakeholder_1_1: LENSES=['COS']:14; pre_mortem: LENSES=[]:34; quick_read: LENSES=['CEO','CFO','CRO','CMO','CPO','COS']:47; open_qa: dynamic per decomposer:96 |
| AC-4 | PASS | evaluatePrereqs.ts covers all 9 PlaybookIds with correct block/degrade/proceed logic; 34 tests pass (brief said 28 — spec has 34, all green) |
| AC-5 | PASS | stakeholder-1-1/index.ts:128-146: missing file → createStakeholderSkeleton → stamp STAKEHOLDER_SKELETON; skeleton written to `<vault>/stakeholders/_skeleton-<slug>.md` |
| AC-6 | PASS | quick-read/index.ts:130: `rigorScore: null`, `proposedWritebacks: []`; stamp QUICK_READ:129 |
| AC-7 | PASS | pre-mortem/index.ts:169: `stamps: ['ADVERSARIAL_ONLY', ...]`; only RedTeam + Steelman dispatched:47+60 |
| AC-8 | PASS | decomposer.ts:30-36: `/\bwhat\s+should\s+i\s+do\s+about\s+(the\s+)?cash\b/i` routes to cash_lever; open-qa/index.ts:115-123: rigor capped at 85; rigorRawScore present; open-qa.spec.ts:132-134 asserts both values |
| AC-9 | PASS | Home.tsx:line 246 (WorkstreamRail), 252 (OpenDecisionsList), line ~200 (WritebacksCounter), 178 (cost meter), 309 (8 tiles), 369 (JobsStrip); empty states present |
| AC-10 | PASS | useKeyboardShortcuts.ts:Cmd+1..8 + Cmd+/ + Cmd+R; 185 specs include keyboard-shortcuts suite (all pass) |
| AC-11 | CONCERN | useHomeData.ts:45 listens for `home.workstreams` IPC (not yet wired); ADR §13.3 requires `workstream_amounts_mirror` SQLite table as source — nowhere explicitly named in IPC TODO comment (says "when Runtime exposes it" without naming the table). Documented as TODO ch7-phase-b but the table name is absent from the TODO text. Low risk given Phase B wires runtime → renderer. |
| AC-12 | CONCERN | App.tsx:126 wires tile click → plan-approval; PlanApproval.tsx has no auto-approve countdown. ADR-0009 §12.4 requires 10s countdown for open_qa; §11.3 row implies per-playbook countdowns. App.tsx:49 TODOs "replace with real plan" but countdown itself is absent with no TODO comment acknowledging the omission. |
| AC-13 | PASS | `grep -rn "thinking\|chain_of_thought\|reasoning_trace" apps/utility/src/playbooks/` returns zero hits. B3 invariant preserved. |

## Issues found

1. **Dual PlaybookId namespace — HomeTypes.ts uses LONG names, shared-types/playbook.ts uses SHORT names** (CONCERN — Medium)
   - `HomeTypes.ts:8-17`: `PlaybookId` type uses `'cash_lever_vs_trough'`, `'stakeholder_1on1_prep'`, etc. (LONG names from ipc.ts legacy enum).
   - `shared-types/playbook.ts:14-23`: `PlaybookId` type uses `'cash_lever'`, `'stakeholder_1_1'`, etc. (SHORT canonical names per ADR-0009 §3.2).
   - `playbook.ts:6-8` documents the split and says "Phase B should reconcile them" but `HomeTypes.ts` has no corresponding TODO.
   - Impact: when Phase B wires `playbook.invoke` IPC through the full stack, LONG → SHORT mismatch will cause a runtime dispatch failure unless reconciled first. The `useKeyboardShortcuts.ts` sends LONG names; `routeToPlaybook` in run-loop expects SHORT names.
   - Fix path: file a TODO in `HomeTypes.ts` comment pointing to `playbook.ts:6-8`; Phase B must reconcile before wiring `playbook.invoke` through to `startRun()`.

2. **Auto-approve countdown absent from PlanApproval — AC-12 partial** (CONCERN — Medium)
   - `apps/renderer/src/screens/PlanApproval.tsx`: no `useEffect`/`setTimeout` countdown logic anywhere.
   - ADR-0009 §12.4 specifies "10s auto-approve countdown" for open_qa plan-approval; §11.3 implies per-playbook variants (30s for stakeholder_1_1/quick_read per §6/§10, universal-manual for others).
   - `App.tsx:49` has a TODO for real plan from IPC but no mention of countdown.
   - Impact: functional gap — plan-approval will hang waiting for manual approval even when the ADR specifies auto-approve. Low risk for Phase A (playbooks not fully end-to-end dispatched yet), but if not addressed before Phase B ships the full flow Russell will notice.
   - Fix path: add countdown logic to PlanApproval (or a wrapper in App.tsx) accepting a `countdownSeconds: number | null` prop; per-playbook values from ADR-0009 §6/§9/§10/§12.4. Add TODO comment in App.tsx:stubPlanFromPlaybook.

3. **`workstream_amounts_mirror` table name absent from IPC TODO** (CONCERN — Low)
   - `useHomeData.ts:45`: TODO says "wire home.workstreams variant when Runtime exposes it" without naming the table that Runtime should query.
   - ADR-0009 §11.2 + §13.3 specifies the source as `workstream_amounts_mirror` SQLite (B12 mitigation).
   - Impact: Phase B Runtime sub-agent may wire from wrong source without this context. The TODO is functional but incomplete.
   - Fix path: append `// source: workstream_amounts_mirror SQLite (ADR §13.3 + B12 mitigation)` to the TODO comment at useHomeData.ts:45.

4. **evaluatePrereqs spec has 34 cases, not 28 as stated in audit brief** (informational — no action)
   - Brief states "Verify against evaluatePrereqs.spec.ts (28 cases)." Actual spec has 34 passing tests. Not a defect — more coverage is better. Noting for accuracy.

## Spot-checks

- **Typecheck:** `pnpm -r typecheck` exit-0. All 9 packages clean. No new errors introduced by Phase A.
- **Vitest:** `pnpm vitest run tests/unit/playbooks/ tests/unit/renderer/` → 185 passed / 0 failed. Full suite: 1041 passed / 80 failed (all pre-existing better-sqlite3 ABI failures in non-Phase-A spec files).
- **Wire-up greps:**
  - `from '@c-suite/shared-types/playbook'`: 12 hits across Phase A modules + helpers. Every module has at least one import.
  - `evaluatePrereqs`: 5 live call sites (pre-mortem:44, quick-read:76, open-qa:100, stakeholder-1-1:95, + run-loop via playbookRouter chain).
  - `decompose`: live importer in open-qa/index.ts:71.
  - `routeToPlaybook`: live importer in run-loop.ts:71.
  - `createStakeholderSkeleton`: live importer in stakeholder-1-1/index.ts:137.
  - `import.*Home` in App.tsx: confirmed at App.tsx:12.
- **B3 invariant:** Zero hits for `thinking|chain_of_thought|reasoning_trace` in `apps/utility/src/playbooks/`. Invariant preserved.
- **Variant alignment:** Home.tsx:2 declares "Variant B (dense rail)"; CSS Grid 280px | 1fr | 240px layout at line 5; sticky left rail; 4×2 tile grid at Home.tsx:283. Tiles Variant A (uniform 4×2 with ⌘1..⌘8) confirmed by TILE_CATALOGUE array (8 entries) + keyboardHint fields. Open Q&A Variant A (inline on home) confirmed by OpenQABar component at Home.tsx:line ~370 (rendered inline, not in a modal).
- **IPC additions (ADR-0009 §6):** All 4 variants present in ipc.ts:268-300 (`playbook.routed`, `playbook.prereq.blocked`, `playbook.prereq.degraded`, `playbook.stakeholder.skeleton_created`). No existing variant shapes modified.
