# Ch.7 Phase A — Intermediate Audit/QA Brief

You are the **independent** Audit/QA sub-agent for C-Suite Phase 2 Ch.7 **Phase A**. You did NOT write any of the code you are auditing — that's structural. Per DOCTRINE law #7: writer ≠ grader.

The contract is `docs/decisions/0009-ch7-playbooks-home.md`. Variant picks at `docs/decisions/0009-design-gate-approved.md`. This audit gates Phase B dispatch — if you REOPEN, Phase B does not start until the fix lands.

## Working directory
`/Users/russellteter/Claude Code Projects/c-suite/` (quote — has spaces).

## Phase A surface (what you're auditing)
- **Runtime sub-agent commits** (9): `f3ca983` → `c8778e3`. Files under `apps/utility/src/playbooks/{lib,stakeholder-1-1,pre-mortem,quick-read,open-qa,cash-lever}/`, `packages/shared-types/src/playbook.ts`, `packages/shared-types/src/ipc.ts`, `apps/utility/src/orchestrator/run-loop.ts`.
- **Renderer sub-agent commits** (5): `7af1ceb` → `878b623`. Files under `apps/renderer/src/screens/{Home.tsx, Home.fixtures.ts}`, `apps/renderer/src/components/{PlaybookTile, OpenQABar, WorkstreamRail, OpenDecisionsList, WritebacksCounter, JobsStrip, HomeTypes}.tsx`, `apps/renderer/src/hooks/{useHomeData, useKeyboardShortcuts}.ts`, `apps/renderer/src/App.tsx`.
- **Tests sub-agent commits** (10 initial + 12 fill-in): 185 specs across 12 files in `tests/unit/playbooks/` + `tests/unit/renderer/`.

**Phase B (out of scope for this audit):** `gtm_realloc`, `strategic_option`, `board_narrative`, `restructure_decision`. The audit is intermediate — Phase B dispatches after this audit closes.

## Acceptance criteria from ADR-0009 §15 (audit each)

Verify each AC PASS / CONCERN / REOPEN with file_path:line evidence and test name. For Phase A scope, AC subset:

- **AC-1** (Phase A subset): `stakeholder_1_1`, `pre_mortem`, `quick_read`, `open_qa`, `cash_lever` modules each export `runPlaybook` matching §3.1 shape.
- **AC-2** (partial): `apps/utility/src/orchestrator/run-loop.ts` switches on `playbook_id` and dispatches the correct module. Phase A playbooks tested; Phase B may throw "not yet implemented" — that's expected.
- **AC-3** (Phase A subset): Each Phase-A playbook fires correct lens set per §3.2 (COS-only / 0 lenses / 6 lenses / dynamic).
- **AC-4**: `evaluatePrereqs` correctly returns block / degrade / proceed per Phase R Decision 4 matrix. Verify against `evaluatePrereqs.spec.ts` (28 cases).
- **AC-5**: `stakeholder_1_1` with missing target file creates a skeleton at `<vault>/stakeholders/_skeleton-<slug>.md` via SafeWrite.
- **AC-6**: `quick_read` bypasses Verifier; writebacks disabled.
- **AC-7**: `pre_mortem` runs Red-Team + Steelman only; ADVERSARIAL_ONLY stamp present.
- **AC-8**: `open_qa` deterministic-first-pass routes "what should I do about cash" → `cash_lever`; LLM decomposer handles the rest; rigor clamped to 85; both displayed + raw scores visible.
- **AC-9**: Home screen renders all 6 sections from §11.1 — empty states where data unavailable.
- **AC-10**: Cmd+1..Cmd+8 and Cmd+/ work (assert via the keyboard-shortcuts spec).
- **AC-11**: Workstream mini-view reads from `workstream_amounts_mirror` (or stubbed via IPC pending Phase B; document the TODO).
- **AC-12**: Tile click → plan-approval (with the playbook's auto-approve countdown per Decision 6).
- **AC-13**: No reasoning-trace coupling — Verifier-blindness invariant from B3 preserved across all new playbooks. Spot-check via grep for `thinking | chain_of_thought | reasoning_trace` in Phase A code.

## Audit method (be specific)

1. **Read every Phase A file referenced above.** Cite line numbers in every claim.
2. **Run `pnpm vitest run`.** Verify the 185 Phase A specs pass (zero new failures vs the pre-existing 80 better-sqlite3 ABI failures).
3. **Run `pnpm -r typecheck`.** Verify exit-0 clean.
4. **Verify wire-up grep checks:**
   - `grep -rn "from '@c-suite/shared-types/playbook'"` ≥1 hit per Phase A module.
   - `grep -rn "evaluatePrereqs\|decompose\|routeToPlaybook\|createStakeholderSkeleton"` confirm each helper has live importers.
   - `grep -rn "import.*Home" apps/renderer/src/App.tsx` confirm Home is the default route.
5. **Check the variant approval** — Home Variant B (dense rail), Tiles Variant A (uniform 4×2 with Cmd+1..Cmd+8), Open Q&A Variant A (inline). Read `Home.tsx` + visual layout markers — does the implementation reflect the chosen variants?
6. **Check the 6 spec-gap decisions** in ADR-0009 §13 — are they implemented?
   - §13.1 (invocation: Cmd+1..Cmd+8 + Cmd+/) — `useKeyboardShortcuts.ts`.
   - §13.2 (data substrate with placeholders for Ch.10) — `useHomeData.ts` + `JobsStrip.tsx`.
   - §13.3 (workstream mini-view from SQLite mirror) — IPC stub OK if documented.
   - §13.4 (stakeholder-skeleton fallback) — `stakeholder-1-1/index.ts` + `stakeholderSkeleton.ts`.
   - §13.5 (quick-read: no rigor score, only token meter) — `quick-read/index.ts`.
   - §13.6 (Open Q&A: capped + raw both displayed) — `open-qa/index.ts` + `PlaybookResult` schema.
7. **Check IPC additions** — `packages/shared-types/src/ipc.ts` carries the 4 new variants from ADR-0009 §6 / brief §6 (`playbook.routed`, `playbook.prereq.blocked`, `playbook.prereq.degraded`, `playbook.stakeholder.skeleton_created`). Confirm no existing variant shape was modified.
8. **B3 invariant spot-check** — grep `apps/utility/src/playbooks/` for any read of lens-reasoning traces. Should find zero.
9. **Pre-existing 80 failures** — confirm they all match the better-sqlite3 ABI pattern AND none of them landed in Phase A's new spec files. If a Phase A spec is in the failing set, that's a REOPEN.

## What you don't do
- You don't write code. If you find a bug, REOPEN with the specific fix path. The original sub-agent's chapter close fixes it (or a follow-up commit).
- You don't write tests.
- You don't audit Phase B (it doesn't exist yet).
- You don't audit Ch.6 or earlier chapters.

## Verdict format

Output `docs/reviews/ch7-phase-a-audit-qa-report.md` with this structure:

```markdown
# Ch.7 Phase A — Audit/QA Report

**Date:** <ISO date>
**Auditor:** EvidenceQA sub-agent (independent)
**Scope:** Phase A — framework helpers + 3 novel-structure playbooks (stakeholder_1_1, pre_mortem, quick_read) + open_qa + home + Open Q&A bar + 185 specs
**Verdict:** PASS | CONCERN-CLOSE | REOPEN

## Summary
<one paragraph>

## AC-by-AC verdict
| AC | Verdict | Evidence |
|---|---|---|
| AC-1 | PASS / CONCERN / REOPEN | file_path:line + spec name |
| ... | ... | ... |

## Issues found
1. <issue with file_path:line + impact + recommended fix>
2. ...

## Spot-checks
- Typecheck: <result>
- Vitest: <result>
- Wire-up greps: <result>
- B3 invariant: <result>
- Variant alignment: <result>
```

Then commit the report file with `ch.7 audit: phase-a report — <verdict>`. No Claude attribution.

## Report-back (≤200 words)
- Verdict + count of PASS / CONCERN / REOPEN per AC.
- Top 3–5 issues if any.
- Phase B dispatch recommendation: green-light or hold-until-fix.
