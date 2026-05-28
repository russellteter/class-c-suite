# Ch.9 Final Audit/QA Brief

You are the **independent** Audit/QA sub-agent for Ch.9 close. Both sub-agents (Runtime + Renderer) shipped. Contract: `docs/decisions/0011-ch9-cowork-handoff.md` §7 (13 ACs).

Single audit covers full chapter — small surface, no intermediate needed per ADR §8.

## Working directory
`/Users/russellteter/Claude Code Projects/c-suite/` (quote — has spaces).

## Ch.9 surface

### Runtime sub-agent (commits `5d28f51` + `f9f1137`)
- `packages/shared-types/src/handoff.ts` — schema + types.
- `apps/utility/src/agents/handoff/` — `{index, prompt, runner, slug, skill-selector, writer, indexRegen}.ts` (7 modules).
- `apps/utility/src/watchers/executionLinkback.ts` — chokidar watcher for return loop.
- `packages/shared-types/src/ipc.ts` — 5 new handoff IPC variants.
- `apps/utility/src/orchestrator/run-loop.ts` — buildDeps + handoff imports (note: imports already landed; integration via `apps/utility/src/index.ts` IPC dispatcher).
- `apps/utility/src/index.ts` — `handoff.preview.requested` IPC handler routes to `handleHandoffPreviewRequested()`.
- 113 specs in `tests/unit/agents/handoff/` + `tests/unit/watchers/`.

### Renderer sub-agent (commit `e0e1207`)
- `apps/renderer/src/screens/HandoffPreview.tsx`.
- `apps/renderer/src/components/{DrawUpCTA, LinkedExecution}.tsx`.
- `apps/renderer/src/ipc/handoff.ts` — 5 IPC variant helpers.
- Modified: `MemoViewer.tsx`, `AcceptedHistory.tsx`, `App.tsx`.
- 43 new specs in `tests/unit/renderer/{HandoffPreview, DrawUpCTA, LinkedExecution}.spec.tsx`.

## ADR-0011 §7 ACs (full)

Verify each PASS / CONCERN / REOPEN with file_path:line evidence + spec name:

- **AC-1**: `generateHandoffBrief(input)` produces brief matching §3.1/§3.2. Frontmatter Zod-validates.
- **AC-2**: Handoff agent uses Chief of Staff framing (no new lens role).
- **AC-3**: Brand-skill selection works for 5 heuristic cases (deck → presentations, doc → document, etc.).
- **AC-4**: Brief writes via SafeWrite to `<vault>/handoffs/<YYYY-MM-DD>-<slug>.md`; vault git commits.
- **AC-5**: INDEX.md regenerates from all handoffs/*.md frontmatter on any handoff write.
- **AC-6**: "Draw up for Cowork" CTA appears on 4 UI surfaces (MemoViewer, decision/position/pre-mortem cards in AcceptedHistory). NOT on prediction/stakeholder/workstream.
- **AC-7**: HandoffPreview renders inline preview + editable body + "Send to Cowork" CTA.
- **AC-8**: On send → file writes; on cancel → nothing persists.
- **AC-9**: Link-back watcher detects new files under `<vault>/executions/<decision-id>/` and updates origin's `executed_by`.
- **AC-10**: Link-back idempotent — re-detecting same file doesn't double-append.
- **AC-11**: Origin card surfaces "Linked execution" section when `executed_by` populated.
- **AC-12**: Handoff agent prompt does NOT receive lens reasoning trace (B3 invariant grep).
- **AC-13**: `pnpm vitest run` exit-0 clean for new specs.

## Critical spot-checks

1. **Handoff explicit-trigger guard** — `apps/utility/src/index.ts` IPC handler MUST only fire `generateHandoffBrief` on `handoff.preview.requested`. Confirm NO auto-trigger on `writeback.accepted` or any other event. Read the dispatcher logic.
2. **B3 invariant** — grep `apps/utility/src/agents/handoff/` for `thinking | chain_of_thought | reasoning_trace` — expect zero. Verify the handoff agent's input contract carries only structured artifact data + memo body, NOT lens transcripts.
3. **CTA forbidden surfaces** — grep `apps/renderer/src/` for the DrawUpCTA component import. Confirm it's used in MemoViewer + AcceptedHistory only. Confirm prediction/stakeholder/workstream cards do NOT import or render it.
4. **5 brand-skill IDs closed set** — `apps/utility/src/agents/handoff/skill-selector.ts` should pick from exactly: `class-brand-document`, `class-brand-excel`, `class-brand-presentations`, `class-ppt-cyan-light`, `class-brand-voice`. No invented IDs.
5. **Idempotency of link-back watcher** — read `apps/utility/src/watchers/executionLinkback.ts`. Verify it checks `executed_by` for existing path before appending.
6. **INDEX regeneration** — read `apps/utility/src/agents/handoff/indexRegen.ts`. Verify it's FULL regen (not append-only) so deletions propagate.

## Audit method

1. **Read every Ch.9 file.** Cite line numbers.
2. **Run `pnpm vitest run`.** Confirm Ch.9 specs pass. Capture pass/fail count; compare to ~1860 baseline.
3. **Run `pnpm -r typecheck`.** Exit-0 expected.
4. **Run the wire-up greps from "Critical spot-checks".**

## What you don't do
- Write code. REOPEN with file_path:line if you find a bug.
- Audit beyond Ch.9.

## Verdict format

Output `docs/reviews/ch9-final-audit-qa-report.md`:

```markdown
# Ch.9 Final — Audit/QA Report

**Date:** <ISO>
**Auditor:** EvidenceQA sub-agent (independent)
**Scope:** Full Ch.9 — Handoff agent + brief schema + UI preview + link-back watcher + 156 new specs
**Verdict:** PASS | CONCERN-CLOSE | REOPEN

## Summary
<one paragraph>

## AC-by-AC verdict
| AC | Verdict | Evidence |
|---|---|---|
...

## Issues found
1. <issue with file_path:line + impact + recommended fix>

## Spot-checks summary
- Typecheck: <result>
- Vitest: <result>
- B3 invariant grep: <result>
- CTA forbidden-surfaces grep: <result>
- Explicit-trigger guard: <result>
- Link-back idempotency: <result>

## Ch.10 dispatch recommendation
<green-light / hold-until-fix / REOPEN>
```

Commit with `ch.9 audit: final report — <verdict>`. No Claude attribution.

## Report-back (≤200 words)
- Verdict + AC count.
- Top 3-5 issues.
- Ch.10 dispatch recommendation.
