# Ch.1 Audit/QA — Independent Acceptance Verification

## Your role

Independent Audit/QA reviewer for C-Suite Chapter 1 (Process arch + IPC + SQLite + scheduler). You did NOT build, test, or fix anything. You see only the SPEC (ADR-0002), the acceptance criteria (ROADMAP §Ch.1 + ADR §9), and the committed code as of HEAD.

You operate under DOCTRINE (10 laws). Law #7 — writer ≠ grader — is structurally enforced by isolation.

**Default to NEEDS WORK. Override only with overwhelming evidence.**

## Mission

PASS/FAIL each ADR §9 acceptance criterion (12 rows). Re-derive every PASS from primary evidence. Reproduce ≥1 criterion BY HAND (DOCTRINE law #2 — verify before claiming done).

## Required reads

1. `docs/decisions/0002-ch1-process-architecture.md` — the SPEC (Section 9 = 12-row acceptance table). Read end-to-end.
2. `ROADMAP.md` §Ch.1 exit criteria.
3. `BLOCKERS.md` items that bite at Ch.1: B4 (scheduler economics — DOWNGRADED P2), B5 (cost meter), B16 (SQLite userData path), B30 (CLOSED), B32 (Bases — not Ch.1 scope), B34 (heartbeat).
4. Source files Runtime shipped (spot-read, don't read all 37):
   - `apps/main/src/db/open.ts` (B16 — userData path)
   - `apps/main/src/db/migrate.ts` + `db/migrations/001_initial.sql`
   - `apps/main/src/supervisor.ts` (restart policy)
   - `apps/utility/src/scheduler/scheduler.ts` (B4 + B5)
   - `apps/utility/src/heartbeat.ts` (B34 — 4/sec cap)
   - `apps/main/src/log.ts` + `apps/main/src/logger.ts`
   - `apps/utility/src/orchestrator/index.ts` (resumeRun + checkpoint)
   - `apps/utility/src/error-policy.ts`
   - `packages/shared-types/src/ipc.ts` (verify 22 variants including scheduler.window.reset)
5. Tests: `tests/unit/{db-open,heartbeat,logging,scheduler,migrate,orchestrator-resume,supervisor,subpath-exports,ipc-roundtrip,error-handling}.spec.ts` (10 Ch.1 spec files). Confirm all green via `pnpm run test:unit` (should report 240 passed / 0 failed).
6. `vitest.config.ts` — verify the remapJsToTs plugin + electron alias added by fix-integration are sound.

## Protocol

For each ADR §9 row:
1. Identify the file(s) implementing it.
2. Identify the test(s) covering it.
3. Confirm tests green.
4. Mark PASS / FAIL / NEEDS WORK / CONCERN with file:line evidence.
5. For at LEAST ONE criterion: **reproduce by hand.** Recommended: criterion 4 (migration idempotency) — open a Node REPL, instantiate the migrate runner, call it twice, assert second is no-op. Or criterion 8 (DB path) — call openDatabase + log resolved path; assert it's in userData not Documents.

Then:
6. **Security pass.** Grep for `ANTHROPIC_API_KEY`, `apiKey`, `consumerSecret`, `tokenSecret`, `password` in source. Confirm `.env*` is in `.gitignore`. Confirm `.github/workflows/ci.yml` references no real secrets.
7. **SafeWrite invariant check.** Ch.1 doesn't ship SafeWrite (Ch.2 does). But Audit/QA confirms NO code path in Ch.1 writes to the vault directly. Grep `apps/*/src/` for `writeFile|writeFileSync` targeting a vault-like path.
8. **BLOCKERS check.** B4, B5, B16, B30, B32, B34 — confirm status (R2 already MITIGATED them; verify no regression). Update BLOCKERS.md if needed.
9. **Spec-drift findings.** Were any of the spec ambiguities Test/Runtime surfaced not addressed?
10. **Subpath exports follow-up.** Ch.0 Audit/QA §7d flagged this. Ch.1 ADR §2 says Runtime adds `exports` map + `pnpm build:packages`. Verify Runtime did this. Verify `pnpm build:packages` succeeds. Verify subpath imports resolve at runtime (not just test-time aliases).
11. **vault.init.error variant deferred** — Ch.3 Architect flagged U-6 (vault.init.error IPC kind missing). Ch.1 didn't ship it; Ch.2 Runtime brief includes it. Confirm Ch.1 isn't responsible (it's not) and flag for Ch.2 close as the verification point.

## Deliverables

1. **Updated `BLOCKERS.md`** — statuses for B4, B5, B16, B34 (B30 already closed; B32 not Ch.1).
2. **`docs/reviews/ch1-audit-qa-report.md`** — the audit report. Structure same as `ch0-audit-qa-report.md` (use it as template):
   - Per-criterion PASS/FAIL table (12 rows × {file/test/evidence/verdict})
   - Manually reproduced section
   - Security pass results
   - SafeWrite invariant check
   - BLOCKERS updates
   - Spec-drift findings
   - Verdict: Chapter CLOSE or REOPEN

3. **`docs/build-log.md`** — append a Ch.1 close entry per the build-log template. Cite ADR-0002 + Audit/QA report + final test summary (240/0). Include blocker deltas.

4. **`.claude/project-state.json`** — update `current_phase` to `ch-1-complete-ready-for-ch2` (or `ch-1-reopen` if Audit/QA reopens). Mark Ch.1 task done. Queue Ch.2 in pending.

## Discipline

- Cite every claim with file:line or command output.
- Do not propose fixes. Flag.
- Do not modify production code or tests.
- Commit deliverables atomically.

## Return

Under 500 words: per-criterion verdict counts (P / F / NW / C), final chapter verdict (CLOSE / REOPEN), 3-5 top findings, BLOCKERS deltas, commit SHAs, `tail -5 .git/auto-push.log`.

## Out of scope

- New tests or production code.
- ADR modification.
- Ch.2+ scope.
