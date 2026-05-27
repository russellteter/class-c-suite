# Ch.1 Fix-Integration — Activate TDD-Red Tests Against Runtime

## Your role

Fix-Integration engineer for Ch.1. Runtime + Test parallel dispatches both shipped (Runtime: 37 files committed; Test: 10 test files committed). Test files contain TDD-red placeholders (production imports commented out with `// Import is commented out until Runtime ships.`). Activate them.

## Required reads

1. `docs/decisions/0002-ch1-process-architecture.md` — the SPEC. Tests + production must satisfy this.
2. Failing tests (current `pnpm run test:unit` shows 25 failed / 192 passed):
   - `tests/unit/db-open.spec.ts`
   - `tests/unit/heartbeat.spec.ts`
   - `tests/unit/logging.spec.ts`
   - `tests/unit/scheduler.spec.ts`
   - `tests/unit/migrate.spec.ts`
   - `tests/unit/orchestrator-resume.spec.ts`
   - `tests/unit/supervisor.spec.ts`
3. Production modules Runtime shipped (per its commit log):
   - `apps/main/src/db/open.ts`
   - `apps/main/src/db/migrate.ts`
   - `apps/main/src/supervisor.ts`
   - `apps/utility/src/scheduler.ts`
   - `apps/utility/src/heartbeat.ts`
   - `apps/main/src/log.ts` + `apps/main/src/logger.ts` (Runtime split into facade + impl)
   - `apps/utility/src/orchestrator.ts`
   - `apps/utility/src/error-policy.ts` (per Test ambiguity #6)

## Mission

For each failing test file:
1. **Uncomment the production import** (the `// import { X } from '...'` line marked as "commented out until Runtime ships").
2. **Verify the production module exports what the test imports.** If name mismatch (e.g., test wants `migrate`, Runtime exported `runMigrations`), use the Runtime-shipped name and update test imports. Per Test agent's surfaced ambiguity #1: `runMigrations` is the ADR name → use it.
3. **Run the test file** with `pnpm vitest run tests/unit/<file>` to see real failures (not "module not found" — actual assertion failures).
4. **Resolve each assertion failure minimally**: either fix the test to match Runtime's actual API, or surface to me if Runtime's API legitimately violates the ADR.
5. **DO NOT change Runtime's production code** unless it actually violates ADR-0002. If Runtime shipped a divergent API that's still correct per the spec, update the test.

## Specific spec-ambiguity resolutions

From the Test agent's surfaced list (commit `ba8f47c`'s structured summary), Runtime confirmed:

| # | Ambiguity | Resolution |
|---|---|---|
| 1 | `runMigrations` vs `migrate` | Use `runMigrations` (ADR-canonical). Update tests if they expect `migrate`. |
| 2 | `scheduler.window.reset` IPC variant | Runtime added it as variant 22 (commit `e186533`). Tests can import directly. |
| 3 | `loadCompletedInvocations` private | Runtime should export OR tests use the public `resumeRun()` API. Pick whichever Runtime shipped. |
| 4 | `001_initial.sql` placeholder vs Ch.1 DDL | Runtime should have shipped full Ch.1 schema in `001_initial.sql` or a new `002_*.sql`. Verify and align test. |
| 5 | Logger facade `createLogger(process, sink)` | Runtime split into `log.ts` (facade) + `logger.ts` (pino impl). Test should import from `log.ts`. |
| 6 | `error-policy.ts` path | Runtime shipped at `apps/utility/src/error-policy.ts`. Test should match. |

Other resolutions (from Runtime's spec-ambiguity list):
- `contextBridge.exposeInMainWorld('ipc', ...)` (NOT 'csIpc'). Update any test that expects 'csIpc'.
- `better-sqlite3` v12 (not v11). Trivial — tests don't pin a version.
- `MessageChannelMain` port types differ (Electron's MessagePortMain in main; Web MessagePort in utility). Tests likely use Node `worker_threads.MessageChannel` polyfill — fine.

## Discipline

- MINIMAL changes. Each fix should be 1-20 lines.
- Run `pnpm vitest run tests/unit/<file>` after each file's fix; commit only when that file passes.
- DO NOT regress the 192 currently-passing tests.
- DO NOT modify ADR or BLOCKERS.
- Cite the ADR section in commit messages.
- Commit atomically per test file:
  - `ch1: activate db-open test against apps/main/src/db/open.ts (ADR §4.1)`
  - `ch1: activate heartbeat test against apps/utility/src/heartbeat.ts (ADR §7)`
  - `ch1: activate logging test against apps/main/src/log.ts facade (ADR §8)`
  - `ch1: activate scheduler test against apps/utility/src/scheduler.ts (ADR §5)`
  - `ch1: activate migrate test (runMigrations) + 001 full schema (ADR §4)`
  - `ch1: activate orchestrator-resume test (resumeRun API) (ADR §3)`
  - `ch1: activate supervisor test (apps/main/src/supervisor.ts) (ADR §3)`

After all 7 files green, commit `ch1: full test suite green (X passed / 0 failed)`.

Each auto-pushes via the post-commit hook. Run `tail -5 .git/auto-push.log` at end to verify.

## Exit criteria

`pnpm run test:unit` shows `0 failed | XXX passed` (XXX = 220+ now, was 192).

## Return

Under 500 words: per-file outcome (FIXED / PARTIAL / DEFERRED with reason), final test summary, commit SHAs, any spec ambiguity that remains for Audit/QA, `tail -5 .git/auto-push.log`.

## Out of scope

- New features.
- ADR modification.
- New tests (Ch.1 Test is already done).
- Production code outside the modules Runtime shipped.
