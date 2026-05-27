# Ch.7 Final Audit/QA Brief

You are the **independent** Audit/QA sub-agent for C-Suite Phase 2 Ch.7 **final close**. You did NOT write any of the Ch.7 code — that's structural per DOCTRINE law #7.

The contract is `docs/decisions/0009-ch7-playbooks-home.md`. Variant picks at `docs/decisions/0009-design-gate-approved.md`. The Phase A audit already closed at `docs/reviews/ch7-phase-a-audit-qa-report.md` (CONCERN-CLOSE; 2 of 3 issues fixed in audit-fix commit). **This final audit reaches verdict on the full chapter.**

## Working directory
`/Users/russellteter/Claude Code Projects/c-suite/` (quote — has spaces).

## Ch.7 surface (what you're auditing)

### Phase A (already audited — re-check did not regress)
- Framework helpers (`evaluatePrereqs`, `decompose`, `playbookRouter`, `createStakeholderSkeleton`).
- 3 novel-structure playbooks: `stakeholder_1_1`, `pre_mortem`, `quick_read`.
- `open_qa` decomposer + cap-clamping.
- Home screen rewrite (Variant B dense rail), 6 leaf components, 2 hooks, App.tsx routing.
- 185 Phase A specs (passing).

### Phase B (new — primary audit focus)
- 4 homogeneous playbooks: `gtm_realloc` (e6f676a), `strategic_option` (30659ea), `board_narrative` (020b9d2), `restructure_decision` (2a2c13a).
- Router wiring (b5985fa) — replaces all Phase B `throw` stubs.
- RedTeam prompt parameterization (e51438d) — `{{redteam_mode}}` branch with three modes.
- 187 Phase B specs (passing).

### Phase A audit-fix (since Phase A audit closed)
- Short PlaybookId names landed across renderer + tests (single audit-fix commit).
- workstream_amounts_mirror named in useHomeData TODO.

## Acceptance criteria from ADR-0009 §15 (audit each — full set this time)

Verify each AC PASS / CONCERN / REOPEN with file_path:line evidence and test name:

- **AC-1**: Each of 8 playbook modules (`cash-lever` + 7 new) exports `runPlaybook` matching §3.1 shape.
- **AC-2**: `apps/utility/src/orchestrator/run-loop.ts` switches on `playbook_id` and dispatches the correct module. No remaining `throw "not yet implemented"` in router.
- **AC-3**: Each playbook fires the correct lens set per §3.2 table.
- **AC-4**: `evaluatePrereqs` correctly returns block / degrade / proceed per Phase R Decision 4 matrix.
- **AC-5**: `stakeholder_1_1` with missing target file creates a skeleton at `<vault>/stakeholders/_skeleton-<slug>.md` via SafeWrite.
- **AC-6**: `quick_read` bypasses Verifier (`shipStatus: 'quick'`); writebacks disabled.
- **AC-7**: `pre_mortem` runs Red-Team + Steelman only; ADVERSARIAL_ONLY stamp present.
- **AC-8**: `open_qa` deterministic-first-pass routes regex-matching prompts to playbooks; LLM decomposer handles the rest; rigor clamped to 85; both displayed + raw scores visible.
- **AC-9**: Home screen renders all 6 sections from §11.1 — empty states where data unavailable.
- **AC-10**: Cmd+1..Cmd+8 and Cmd+/ work.
- **AC-11**: Workstream mini-view reads from `workstream_amounts_mirror` (or stubbed via IPC pending Ch.10/Ch.8 wire — document TODO).
- **AC-12**: Tile click → plan-approval (with the playbook's auto-approve countdown per Decision 6). **The Phase A audit flagged the countdown gap as issue #2 — that is now a known follow-up tracked outside this audit. If it's still missing, mark AC-12 as CONCERN (not REOPEN) and reference the existing follow-up.**
- **AC-13**: No reasoning-trace coupling — Verifier-blindness invariant from B3 preserved across all new playbooks. Grep `apps/utility/src/playbooks/` for `thinking | chain_of_thought | reasoning_trace`.

## Phase B specific spot-checks (new to this audit)

1. **`strategic_option` + `restructure_decision` heavy Red-Team pass.** Verify Red-Team is dispatched AFTER the Synthesizer (against the synthesized memo), NOT against lens outputs. The B3 invariant must hold across this Red-Team hook — Red-Team input is `{ synthesizedMemo, originalPrompt }` only.
2. **`restructure_decision` CPO-conditional logic.** Verify the role-keyword match works for the 6 documented cases (CTO, VP Eng, VP Product, product manager → CPO added; CFO, SVP Sales → CPO NOT added). Read the implementation; confirm the keyword set.
3. **`board_narrative` handoff CTA.** Verify the memo footer string contains "Draw up for Cowork" + "class-brand-presentations".
4. **RedTeam prompt parameterization.** Verify `{{redteam_mode}}` template variable is present with three branches; `pre_mortem` mode preserves existing framing.
5. **PlaybookId namespace.** Verify the audit-fix landed correctly: renderer + Phase A/B playbooks use short names. Identify any legacy long-name usages remaining and confirm they're in the deferred-migration scope (classify-playbook, run-plan-builder, safewrite, ipc.ts, writeback-engine/deriveTopic).

## Audit method

1. **Read every Phase B playbook file** + the router + the RedTeam prompt.
2. **Run `pnpm vitest run`.** Expect ~1,211 passing / 80 pre-existing failures / 0 todos. If the Phase A/B spec count drops, REOPEN.
3. **Run `pnpm -r typecheck`.** Verify exit-0 clean.
4. **Wire-up greps:**
   - `grep -rn "from '@c-suite/shared-types/playbook'"` ≥1 hit per Phase B module.
   - `grep -rn "throw.*not yet implemented\|throw.*Phase B"` apps/ — expect zero.
   - `grep -rn "reasoning_trace\|chain_of_thought\|thinking_trace" apps/utility/src/playbooks/` — expect zero.
5. **Re-verify Phase A audit findings** — short PlaybookId names landed everywhere they should have; workstream_amounts_mirror named in TODO.
6. **Russell-context skim.** Read the 4 Phase B playbook outputs (memo template structures) — do they read like memos Russell would actually use? E.g., does `board_narrative` produce a structure that flows to PowerPoint via Cowork? Does `restructure_decision` distinguish lawsuit / morale / customer risk in the Red-Team section?

## Verdict format

Output `docs/reviews/ch7-final-audit-qa-report.md` with this structure:

```markdown
# Ch.7 Final — Audit/QA Report

**Date:** <ISO date>
**Auditor:** EvidenceQA sub-agent (independent)
**Scope:** Full Ch.7 — 8 V1 playbooks + Open Q&A + home + design-system inheritance + 372 Ch.7 specs (185 Phase A + 187 Phase B)
**Verdict:** PASS | CONCERN-CLOSE | REOPEN
**Prior Phase A audit:** docs/reviews/ch7-phase-a-audit-qa-report.md (CONCERN-CLOSE)
**Phase A follow-ups:** PlayApproval countdown (issue #2, tracked outside this audit)

## Summary
<one paragraph>

## AC-by-AC verdict
| AC | Verdict | Evidence |
|---|---|---|
| AC-1 | PASS / CONCERN / REOPEN | file_path:line + spec name |
| ... | ... | ... |

## Phase B specific findings
1. <if any>

## Issues found
1. <issue with file_path:line + impact + recommended fix>
2. ...

## Spot-checks summary
- Typecheck: <result>
- Vitest: <result>
- Wire-up greps: <result>
- B3 invariant: <result>
- Variant alignment: <result>

## Phase 2 close recommendation
<green-light Ch.8 dispatch / hold-until-fix / REOPEN>
```

Then commit the report file with `ch.7 audit: final report — <verdict>`. No Claude attribution.

## What you don't do

- Write code. If you find a bug, REOPEN with a specific fix path.
- Write tests.
- Audit Ch.6 or earlier chapters.

## Report-back (≤250 words)

- Verdict + count of PASS / CONCERN / REOPEN per AC.
- Top 3–5 issues if any.
- Recommendation for Ch.7 close + Ch.8 dispatch.
