# Ch.7 Phase A — Test Fill-In Brief

You are converting the 183 `it.todo(...)` specs from Phase A into real `it(...)` blocks now that both Runtime and Renderer have shipped their production code.

## Context
- Phase A Runtime done: 9 commits (`f3ca983` → `c8778e3`). Production files exist under `apps/utility/src/playbooks/{lib,stakeholder-1-1,pre-mortem,quick-read,open-qa,cash-lever}` and `packages/shared-types/src/playbook.ts`.
- Phase A Renderer done: 5 commits (`7af1ceb` → `878b623`). Production files exist under `apps/renderer/src/{screens/Home.tsx, components/{PlaybookTile,OpenQABar,WorkstreamRail,OpenDecisionsList,WritebacksCounter,JobsStrip,HomeTypes}.tsx, hooks/{useHomeData,useKeyboardShortcuts}.ts, screens/Home.fixtures.ts}`.
- Phase A Tests previously dispatched (10 commits, `2d5ca42` → `9c9e871`). 183 `it.todo(...)` placeholders — every spec is currently a string description with no body, because the production files didn't exist at write time.
- ADR contract: `docs/decisions/0009-ch7-playbooks-home.md`. Original test brief: `tasks/ch7-test-brief.md`.

## Working directory
`/Users/russellteter/Claude Code Projects/c-suite/` (quote — has spaces).

## Scope
Convert every `it.todo(...)` to a real `it(...)` block with passing assertions. The 13 spec files:

```
tests/unit/playbooks/evaluatePrereqs.spec.ts        (28 cases)
tests/unit/playbooks/decomposer.spec.ts             (13 cases)
tests/unit/playbooks/stakeholderSkeleton.spec.ts    (11 cases)
tests/unit/playbooks/playbookRouter.spec.ts         (11 cases)
tests/unit/playbooks/stakeholder-1-1.spec.ts        (15 cases)
tests/unit/playbooks/pre-mortem.spec.ts             (17 cases)
tests/unit/playbooks/quick-read.spec.ts             (16 cases)
tests/unit/playbooks/open-qa.spec.ts                (11 cases)
tests/unit/renderer/Home.spec.tsx                   (30 cases)
tests/unit/renderer/PlaybookTile.spec.tsx           (9 cases)
tests/unit/renderer/OpenQABar.spec.tsx              (8 cases)
tests/unit/renderer/useKeyboardShortcuts.spec.tsx   (10 cases)
tests/unit/renderer/setup.ts                        (config — leave alone unless it needs fixing)
```

## Rules
- Read the production file before writing each test body. Cite `file_path:line` in spec descriptions where the assertion targets a specific implementation detail.
- One assertion per `it`. If you need multiple, split.
- Use `StubClaudeClient` from `@c-suite/stub-harness/stub` for any LLM call mocking — seed deterministic outputs.
- For renderer specs: React Testing Library + `@testing-library/jest-dom`. Use the `Home.fixtures.ts` exports.
- For utility specs: mock the SafeWrite client + `dispatchLens` + Verifier where called. The brief in `tasks/ch7-test-brief.md` §1–3 lists the specific assertions per spec.
- **All specs must pass `pnpm vitest run` (zero new failures).** If a spec genuinely can't be written because the production behavior is ambiguous, leave it as `it.todo('explain why')` with a one-line reason — but cap this at 5% (≤9 total).
- Do NOT touch production code (`apps/utility/`, `apps/renderer/`, `packages/`).
- Do NOT modify the briefs or ADR.

## Known-pre-existing test failures (DO NOT try to fix)
- 12 test files / 80 tests failing pre-Phase-A from `ERR_DLOPEN_FAILED` (better-sqlite3 ABI mismatch in plain-Node test env). Leave alone — this is environment-level debt tracked outside Ch.7.
- `[RED: Runtime not shipped]` stubs from prior chapters. Out of scope.

## Commits
- Atomic: one commit per spec file ideally. Conventional message `ch.7 tests: <file> — <N todo → N pass>`. No Claude attribution.
- Post-commit hook auto-pushes.

## Report (≤200 words)
- Commits made (SHA + first-line).
- Per-file count: todos converted vs `it.todo` remaining (cap at 9 total).
- `pnpm vitest run` summary: `<passed> / <failed> / <todo>` — confirm zero new failures vs the pre-existing 80.
- Any production-file ambiguity that forced an `it.todo` retention + reason.
