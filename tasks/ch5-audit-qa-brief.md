# Ch.5 Audit/QA — Independent Acceptance Verification (FIRST USABLE PRODUCT)

## Your role

Independent Audit/QA for Ch.5 (Cash lever first end-to-end slice). DOCTRINE law #7. Default NEEDS WORK.

**This is the chapter that closes Phase 1.** After Ch.5: Russell can ask "should we shift our W30 trough mitigation..." and get a sourced rigor-scored memo in the vault.

## Required reads

1. `docs/decisions/0006-ch5-cash-lever-slice.md` — SPEC + 12 ACs.
2. All prior ADRs (0001-0005) — Ch.5 integrates everything.
3. Production:
   - `apps/utility/src/playbooks/{classifier,runPlanBuilder}.ts`
   - `apps/utility/src/playbooks/cash-lever/index.ts`
   - `apps/renderer/src/screens/{Home,PlanApproval,RoundTable,MemoViewer}.tsx`
   - 8 mockups at `~/Desktop/cstuite-design-step-{1-8}.html`.
4. Tests: `tests/e2e/cash-lever-stub.spec.ts` + `tests/unit/{playbook-classifier, run-plan-builder, click-claim-tool-call, draft-path, round-table-honest-signal, degraded-mode, mockup-generator}.spec.ts`.

## Protocol

- AC-1: E2E stub-harness run goes through all 14 RunState transitions. Memo lands in test vault.
- AC-7: Click-any-claim → tool-call result panel. Reproduce BY HAND: open a memo file with a citation, manually call `queryToolCallBySourceId`, verify it returns the JSON.
- AC-8: DRAFT path — rigor 65 → `.draft.md` suffix + amber banner.
- AC-9: Honest-signal contract — `—` until Verifier scores; no animation theater.
- AC-11: 8 mockup files exist at `~/Desktop/`; use design tokens from `ui.md`.
- AC-12: Degraded mode (AWS SSO expired) → run completes with `degraded_sources: ['aws']` flag.
- AC-10: No MCP calls fire before `run.plan.approved` IPC.

Verify the 5 ADR-0006 UNKNOWNs are resolved or deferred (AWS account count, NetSuite TBA tokens, cash model xlsx path/schema/lever rows).

## Deliverables

1. `docs/reviews/ch5-audit-qa-report.md`.
2. `BLOCKERS.md` status updates.
3. `docs/build-log.md` Ch.5 close entry + Phase 1 close summary.
4. `.claude/project-state.json` → `phase-1-complete-pending-ultrareview` (or reopen).

Commit atomically.

## Return

Under 500 words: verdict counts, CLOSE/REOPEN, top findings, BLOCKERS deltas, commit SHAs, `tail -5 .git/auto-push.log`.
