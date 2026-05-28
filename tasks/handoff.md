# Handoff — B47 Phase 1: live-mode stub guard (2026-05-28)

## This session (Phase 1 — shipped)
- **Live-mode stub guard landed.** Every playbook now exports `STUBBED_SOURCES: readonly StubbedSource[]` (single source of truth for what it fabricates). `apps/utility/src/orchestrator/stubGuard.ts` REFUSES any playbook with non-empty `STUBBED_SOURCES` under `STUB_MODE=live` (throws `StubbedSourceLiveError`); `ALLOW_STUBBED_LIVE=1` downgrades to a loud warn + merges into `degraded_sources` (honest-degradation pattern). replay/record unaffected.
- Wired via `runPlaybookGuarded()` at all 3 call sites: run-loop early-return (line ~103), open_qa redirect (~130), and mondayTripwire's dynamic cash-lever import.
- Current `STUBBED_SOURCES`: cash_lever=`['salesforce','aws','netsuite','cash_model']`; the 7 Phase A/B playbooks=`['verifier_rigor']`; quick_read=`[]` (Verifier bypass by design).
- `synthesizer_writebacks` deliberately NOT in the guard vocab — empty writebacks = honest emptiness, not a fabrication (deferred Finding 3).
- Test: `tests/unit/orchestrator/stub-guard.spec.ts` (25 cases) — guard behavior + registry integrity + anti-rot (a `[]` playbook must contain no `stub*Query` / hardcoded rigorScore) + dynamic-import path. 30/30 pass with mondayTripwire; 66/66 orchestrator+jobs no regressions; typecheck clean.

## CORRECTED facts (the prior recipe was stale)
- **Verifier is ALREADY wired in the generic run-loop path** (run-loop.ts:218-231 via `modelClientFromEnv()`). The prior recipe's "wire real Verifier — replace stub in run-loop.ts:200-206" is a NO-OP — do not chase it.
- The REAL remaining Verifier gap: the **Ch.7 early-return path (run-loop.ts ~84-146) does NOT run the Verifier** — it trusts `playbookResult.rigorScore`, where 8 playbooks live. Phase 2 wires the Verifier there (ONE site), then deletes the 7 hardcoded `rigorScore = NN` placeholders. Do NOT edit 7 playbooks to call runVerifier.

## Next step → Phase 2
Read `tasks/b47-phase2-data-wire-brief.md` (architectural directives up front). In order: (1) Verifier in early-return path; (2) cash-lever → real `ctx.deps` with honest degradation. Defer Findings 3 (Synthesizer) + 5 (jobs). cash-lever live-verification is gated on Russell connecting NetSuite OAuth + AWS SSO.

---

# Handoff — Finishing-touches multi-track session (2026-05-28)

## What was done
- **Ch.7 assembly leg built** (was never done): `apps/renderer/vite.config.ts`, real `index.html` entry, dev/build scripts, `main.ts` dev/prod load, `electron-builder.yml` renderer-dist. App now bundles + renders.
- **NetSuite migrated TBA → OAuth 2.0/PKCE** on hosted MCP (public client, scope `mcp`, redirect `localhost:8765`). 105 tests.
- **Google Workspace output surfaces** (Docs/Sheets/Slides/Drive wrappers, `OutputSurface` type, ADR-0016).
- **CCC "Editorial Sharp" redesign** of Home/RoundTable/MemoViewer (validated ~9/10; baseline in `docs/design-system/baseline/`).
- **B47 keystone:** real `RealClaudeClient` on `@anthropic-ai/claude-agent-sdk` + Max subscription (`CLAUDE_CODE_OAUTH_TOKEN`); NO API key (`ANTHROPIC_API_KEY` stripped). `modelClientFromEnv()` factory.
- **Pre-commit credential scanner** (`hooks/pre-commit`, not husky — preserves auto-push); history scan clean.
- **Chapter ritual amended** to require INTEGRATION PROOF (populated-state demo + screenshot).
- **Audit:** `docs/reviews/mock-reliance-audit-2026-05-28.md` (B47).

## Current state
- Typecheck clean (9 workspaces). Full suite **1932 pass / 94 fail** — all 94 are the known `better-sqlite3` ABI mismatch under plain Node (pass under Electron). Zero new regressions.
- Real inference wired but **playbook DATA is still stubbed** — cash-lever et al. fabricate tool-call data. Do NOT trust `STUB_MODE=live` playbook output as real yet.
- All work committed + pushed to `origin/main` (commits 20b6eb7 → c522428, ~18 commits).

## Files touched
`git log --oneline c838a2a..HEAD`. `git status`: only scratch untracked (`.playwright-mcp/`, `tasks/*-brief.md`, `preview.html`, `vite.preview.config.ts`) + pre-existing `CLAUDE.md` mod.

## Open threads (B47 follow-up = the real product work)
Per audit Findings 2–5: wire real Verifier (delete hardcoded `rigorScore` placeholders), real Synthesizer write-back proposals, real playbook MCP data (`cash-lever/index.ts:37` fabricates AWS data), real scheduled-job sources. FIRST: add a runtime guard that refuses/warns when `STUB_MODE=live` runs a still-stubbed-data playbook.

## Russell actions (none block code)
1. NetSuite: create OAuth Integration Record → `NETSUITE_OAUTH_CLIENT_ID` in `apps/main/.env.local` → in-app Connect → revoke old TBA `2b80c7a9` + rm `~/mcp-servers/netsuite-mcp`.
2. Google: re-consent 4 new scopes on first launch.
3. Real inference: `claude setup-token` → `CLAUDE_CODE_OAUTH_TOKEN` in `.env.local`, ensure `ANTHROPIC_API_KEY` unset.
4. Capture Electron Home screenshot (Ch.7 AC-4); run 8 Ch.11 on-Mac demos.

## Next step
Start the **B47 data-wiring session**: real Verifier + Synthesizer + playbook MCP data + the live-mode stub-data guard.

## Resume recipe
1. `git pull` then `pnpm install`.
2. Read `tasks/handoff.md` + `docs/reviews/mock-reliance-audit-2026-05-28.md` (Findings 2–5).
3. Verify state: `pnpm typecheck` (clean) and `npx vitest run` (94 ABI fails expected).
4. Begin in `apps/utility/src/orchestrator/run-loop.ts` (wire real Verifier — replace stub) and `apps/utility/src/playbooks/cash-lever/index.ts:37` (real `ctx.deps.aws` call).
