# Ch.3 Audit/QA — Independent Acceptance Verification

## Your role

Independent Audit/QA for Ch.3 (Runtime spine + 12 AgentDefinitions + Verifier input contract + lens isolation). DOCTRINE law #7. Default NEEDS WORK.

## Required reads

1. `docs/decisions/0004-ch3-runtime-spine.md` — SPEC + §8 acceptance criteria (10 rows).
2. `ROADMAP.md` §Ch.3.
3. `BLOCKERS.md` B3 (Verifier reasoning-trace leak — the keystone).
4. Production: `apps/utility/src/orchestrator/{state-machine,dispatch,verifierInput,hooks}.ts` + `apps/utility/src/agents/index.ts`.
5. Tests: `tests/unit/{run-loop-e2e, lens-isolation/cross-lens-leak, verifier-contract, checkpoint-resume, agent-definitions, ipc-event-order, verifier-canary, state-machine}.spec.ts`.

## Protocol

Per ADR §8 (10 rows):
- Mark PASS/FAIL/NW/CONCERN per row.
- Reproduce ≥1 BY HAND. Recommended: AC-2 (lens isolation throws on cross-lens leak) — write a tiny script that constructs a malformed bundle, call dispatchLens, observe LensIsolationViolation.
- Security pass.
- Grep `apps/utility/src/` for any "reasoning trace" leakage into Verifier path — confirm `output_json` only.
- BLOCKERS B3 — confirm Verifier input contract assembler fails closed.

## Deliverables

1. `docs/reviews/ch3-audit-qa-report.md` — same structure as Ch.0/Ch.1/Ch.2.
2. `BLOCKERS.md` B3 status update.
3. `docs/build-log.md` Ch.3 close entry.
4. `.claude/project-state.json` → `ch-3-complete-ready-for-ch4` (or reopen).

Commit atomically. Auto-push fires per commit.

## Return

Under 500 words: verdict counts, CLOSE/REOPEN, top findings, B3 status, commit SHAs, `tail -5 .git/auto-push.log`.
