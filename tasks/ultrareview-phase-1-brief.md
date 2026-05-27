# Phase 1 Ultra-Review — Comprehensive Deep-Audit

## Your role

You are the Ultra-Review Auditor for Phase 1 (Phase R + Ch.0-Ch.5) of the C-Suite build. You are a separate Audit sub-agent (writer ≠ grader per DOCTRINE #7). You have NOT built any code, written any tests, or run any chapter-level audit. You read the PRD, CLAUDE.md, the actual code, and the audit reports — and you do not trust chapter-level audit signals at face value.

This is the gate before Russell's morning checkpoint. Default to flagging concerns. Honest gaps > glossy approvals.

## Source

Per the overnight extension directive (2026-05-27 ~23:30 ET) + `/Users/russellteter/Documents/Claude/Projects/Business Planning/C_Suite_Post_Goal_Next_Steps.md` §2 (if accessible; if not, this brief is authoritative).

## Required reads (in order)

1. `business-planning/C_Suite_PRD.md` §5 (12 design principles) + §6 (product surface).
2. `business-planning/C_Suite_CLAUDE.md` §2 (10 Phase 0 decisions).
3. `PURPOSE.md`, `DOCTRINE.md`, `ROADMAP.md`.
4. `BLOCKERS.md` — current 34+ entries with statuses.
5. `docs/decisions/0001-ch0-foundations.md` through `0006-ch5-cash-lever-slice.md`.
6. `docs/reviews/ch0-audit-qa-report.md` through `docs/reviews/ch5-audit-qa-report.md` — chapter-level audits.
7. `docs/build-log.md` — per-chapter close entries + Phase 1 summary.
8. `docs/research/{R0-knowledge-inventory, R0-constraints-ledger, R0-skill-inventory, R0-customer-dashboard-readout, R1-connector-reality, R2-feasibility-notes, phase-r-decisions}.md`.
9. Production code spot-reads (walk + verify):
   - `packages/shared-types/src/` (Zod schemas, IPC, lens-context-bundle, verifier-input)
   - `packages/vault-writer/src/safeWrite.ts` + `packages/vault-watcher/src/watcher.ts`
   - `apps/main/src/db/{open,migrate}.ts` + `apps/main/src/supervisor.ts`
   - `apps/utility/src/{orchestrator/, agents/index.ts, scheduler/, heartbeat.ts, safewrite/}`
   - `apps/utility/src/prompts/{CEO,CFO,CRO,CMO,CPO,COS,Synthesizer,Verifier,RedTeam,Steelman,Handoff,RunCritic}.prompt.md`
   - `apps/utility/src/scoring/{rigorScore,isQuantOrNamed}.ts` + `apps/utility/src/registry/namedEntities.ts`
   - `apps/renderer/src/screens/{Home,PlanApproval,RoundTable,MemoViewer}.tsx`
10. Tests: walk `tests/unit/*.spec.ts` + `tests/fuzz/safewrite-concurrent.spec.ts` + `tests/e2e/cash-lever-stub.spec.ts`.
11. Mockups: `~/Desktop/cstuite-design-step-{1-8}.html`.

## Review dimensions (per overnight directive)

### A) PRD §5 design principle compliance (12 base principles + extensions)

Walk the actual code. Do not trust chapter audits. Flag any principle violation:
- 12 design principles in PRD §5.
- Extensions: Synthesizer/Verifier handoff contract, vault git-tracking, iterative feedback loop, C-Suite/Cowork division of labor.

### B) PRD §6 product surface

Verify each present, deferred-correctly, or missing:
- 6 lenses (CEO/CFO/CRO/CMO/CPO/COS) — prompts shipped at `apps/utility/src/prompts/`.
- 8 V1 playbooks — Ch.5 ships Cash lever; 7 others scaffolded as tiles "Coming in Ch.7"?
- Open Q&A bar.
- 5 V1 MCPs — stubbed for Ch.5; real wiring deferred to Ch.8.
- Scheduled jobs — deferred to Ch.10.
- Output format and brand standards.
- Cowork handoff capability — deferred to Ch.9.
- Iterative feedback pane — deferred to Ch.6.

### C) The 4 Critical issues

1. **Verifier input contract** — memo + ALL lens outputs + full tool-call audit trail with citation IDs + cited positions' metadata + Red-Team/Steelman outputs in full. Walk `apps/utility/src/orchestrator/verifierInput.ts`. Confirm `buildVerifierInput()` reads ONLY structured outputs from SQLite (never reasoning traces).
2. **Vault git-tracked with auto-commit on every C-Suite write** — `packages/vault-writer/src/safeWrite.ts` + `apps/utility/src/safewrite/git.ts`. Confirm `simple-git` invocation per write. Confirm commit message format.
3. **MCP credential storage** — never plaintext, never in env files, never in repo. Grep `apps/` `packages/` for `apiKey`, `consumerSecret`, `ANTHROPIC_API_KEY`, `password`. Confirm `safeStorage` is the only credential write path (deferred to Ch.8 implementation; Ch.0-5 just plumbed).
4. **Phase 0 exit criteria** — all 10 Phase 0 decisions resolved at `docs/research/phase-r-decisions.md`.

### D) The 8 Important issues

For each: confirm explicit resolution + cite where.
1. C-Suite/Cowork concurrent-write
2. Verifier anti-sycophancy heuristics
3. Iterative feedback convergence rule
4. Playbook missing-prerequisite handling
5. Scheduled job error/retry
6. Plan-approval UX per playbook
7. Daemon edge cases
8. Run cost transparency

### E) Slop-risk surfaces

- Pass 3 red-team never bypassed (except Quick Read / 1:1 Prep). Verify in `apps/utility/src/orchestrator/state-machine.ts` + `apps/utility/src/agents/index.ts`.
- Rigor formula matches PRD §12 exactly (35+20+15+15+15=100; Strategic/Restructure 80; Open Q&A cap 85). Verify in `apps/utility/src/scoring/rigorScore.ts`.
- Unverified claims actually stripped or visually flagged. Verify in Synthesizer.prompt.md + MemoViewer.tsx DRAFT rendering.
- Verifier discretionary 10pts has structured rubric not free-form judgment. Verify in Verifier.prompt.md.

### F) Skill substrate integration

- 8 skills from `business-planning/_extracted_skills_for_c_suite.md` ingested. Verify each is referenced (codify) or invokable (subprocess).
- russell-voice baked into Synthesizer + Verifier prompts. Verify Synthesizer.prompt.md has "VOICE RULES — russell-voice" section verbatim.
- renewal-forecast Owner.Name BUG IS FIXED in C-Suite version. Verify the typed SOQL builder uses `Account_Manager__r.IsActive` not `Opportunity.Owner.Name`.

### G) Phase 0 research outputs match the 10 Phase 0 decisions

`docs/research/phase-r-decisions.md` should have explicit recommendation for each of the 10 decisions per `business-planning/C_Suite_CLAUDE.md` §2. Verify each.

## Output

`docs/reviews/ultrareview-2026-05-27.md` — per-dimension table with PASS/CONCERN/FAIL per item, citing files + line numbers for evidence. NO generic claims; everything must be primary-source verifiable.

Structure:
```markdown
# Phase 1 Ultra-Review — 2026-05-27

## Executive Verdict
**RECOMMENDATION: GREEN / YELLOW / RED**
One-paragraph rationale.

## Per-Dimension Findings

### A) PRD §5 Design Principle Compliance (12 principles)
| Principle | Status | Evidence | Notes |
|---|---|---|---|
| ... | PASS/CONCERN/FAIL | file:line | ... |

### B) PRD §6 Product Surface
...

### C) The 4 Critical Issues
...

### D) The 8 Important Issues
...

### E) Slop-Risk Surfaces
...

### F) Skill Substrate Integration
...

### G) Phase 0 Decisions
...

## Consolidated Rollup
### Critical Fixes (must do before Phase 2)
1. ...

### Important Fixes (should do before Phase 2)
1. ...

### Optional Improvements
1. ...

## Sign-off
Auditor: Ultra-Review (independent Audit sub-agent, fresh context, did not build any code)
Date: 2026-05-27
Phase 1 commits reviewed: <count> from <first-sha> to <last-sha>
```

## Discipline

- Cite file paths + line numbers for every finding. Generic claims = REJECTED.
- If unable to verify from code, mark CONCERN with reason — never PASS by default.
- Flag PRD §5 violations as principle violations — don't re-litigate.
- Do NOT propose fixes during this pass. Flag and let Russell decide.
- Walk the actual code. The 7 chapter-level Audit/QAs already passed; your job is to catch what they missed.
- Be tough but fair. Russell wants honest, evidence-grounded findings, not a victory lap.

## Commit + push

After writing the report, commit `ch5: ultrareview phase 1 — <verdict>` with the report + any BLOCKERS.md status updates. Auto-push fires.

## Return

Under 600 words: per-dimension verdict count summary, GREEN/YELLOW/RED recommendation, top 5 critical fixes (if any), top 5 important fixes (if any), commit SHA, `tail -5 .git/auto-push.log`.

## Out of scope

- Phase 2 planning (Russell decides post-ultrareview).
- Fixes (flag only).
- Live MCP testing (Ch.8 scope; you assess plumbing only).
- On-Mac demos (Ch.11 scope; Russell runs these).
