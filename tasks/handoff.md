# Handoff — C-Suite Phase 3 (live engine) — 2026-05-29

Driving `docs/PRODUCTION_PLAN.md` + `docs/WORKFLOW_PROGRAM.md` to a working V1, organized into
workflows + serial gates. Full execution authority; control model from `tasks/lessons.md`
(workflow agents return findings / edit-in-worktree, NEVER commit; main thread commits serially).

## Headline: the Phase-3 catastrophic-risk core is PROVEN

A live `pre_mortem` run through the **assembled Electron app** produced a real, rigor-scored,
SafeWritten memo, persisted to `runtime.db` — the full renderer→main→utility→Verifier→vault
round-trip, no mocks. Evidence (this session):
- App boots at **better-sqlite3 Electron ABI 130** in BOTH main and the utilityProcess
  (`UTILITY_DIAG modulesAbi:130`). The handoff's "binary is on Node ABI, fix tooling first" gate
  was STALE — the binary was already 130. Renderer IS assembled (CLAUDE.md "placeholder" note also
  stale; localhost:5273 serves the real screens).
- Live inference works on the Max subscription (Agent SDK + `CLAUDE_CODE_OAUTH_TOKEN`;
  `ANTHROPIC_API_KEY` stripped at the SDK boundary). Proven via `tests/e2e/live-inference-isolation.mjs`.
- Live Verifier produces a real rigor score; proven via `tests/e2e/live-verifier-isolation.mjs`.
- **GATE-3 cheap slice PROVEN:** `tests/e2e/live-engine-proof.mjs` (PLAYBOOK_KEY=pre_mortem) →
  `2026-05-29-pre_mortem-<id>.md`, CLEAN, 2772 chars, run row `shipped_clean` in runtime.db.

## Bugs found + fixed this session (all committed + pushed)

Commit chain: `78b1557` → `f9f5c9f` → `b42fa2b` → `67f9c51` → `6073e8c` → `992e6fa`.
- **Prompt assets** not copied to `dist/` → Verifier ENOENT. Fix: `scripts/copy-utility-assets.mjs`
  (wired into `apps/utility` build). (78b1557)
- **JSON preamble**: Opus Verifier wraps JSON in prose → bare `JSON.parse` threw. Fix: central
  `extractJsonObject` in `RealClaudeClient` (fail-loud preserved) + Verifier prompt hardening. (78b1557)
- **ABI rebuild tooling** (task #4 DONE): two-mode `scripts/rebuild-electron-native.mjs`
  (`pnpm rebuild:electron` / `rebuild:node`), resolves electron from apps/main, canonical pnpm copy,
  load-probe verify. Proven by a live rebuild. (b42fa2b)
- **S2** (`playbookVerifier.ts`): SELECTed non-existent columns → live Verifier scored on an EMPTY
  audit trail. Fixed to real columns. **S1** (`db/tool-calls.ts`): `insertToolCall` omitted
  `agent_role` (NOT NULL) + orphan `invocation_id` → board_narrative discarded real connector data;
  fixed (helper seeds parent `agent_invocations`, agent_role threaded through 10 callsites). (67f9c51)
- **O1** (`dispatch.ts`): `dispatchLens`/`dispatchSynthesizer` passed the raw envelope to
  `onSubagentStop` → threw on every live dispatch. Unwrap `.structuredOutput` (mirrors
  verifier-runner.ts:71). **M1** (`run-loop.ts`): Ch.7 early-return never propagated
  memoMarkdown/memoPath → all 8 Ch.7 memos silently dropped. Now propagated. (6073e8c)

## CRITICAL OPERATING NOTES
- **better-sqlite3 ABI flips to Node 137 after running `npx vitest`** (the DB-test path rebuilds
  it). Symptom: the app launches but no window appears (`firstWindow timeout`) because
  `openDatabase()` throws NODE_MODULE_VERSION 137-vs-130. **ALWAYS run `pnpm rebuild:electron`
  before any app/e2e/live proof if you've run vitest or pnpm install since.** `pnpm --filter
  @c-suite/utility build` (tsc+copy) does NOT flip it.
- **Live-proof recipe:** kill stale electron (`pkill -f electron@33.4.11`), ensure vite on :5273
  (`pnpm --filter @c-suite/renderer dev`), then `PLAYBOOK_TILE=… PLAYBOOK_KEY=… node
  tests/e2e/live-engine-proof.mjs`. A live run is ~3 min (Opus Verifier). `timeout` is absent on
  this Mac — rely on the proof's internal poll + the Bash tool timeout. `sqlite3` CLI reads
  runtime.db ABI-independently.
- pre_mortem has a 30s auto-approve countdown (double-fire risk if a manual click doesn't cancel it);
  board_narrative is manual (no countdown). Harmless to the proof but wastes a live run.

## NEXT — the inference half (U1) is a DESIGN FORK; then the rest of the program

**U1 (real lens inference for pre_mortem) — DECISION NEEDED.** pre_mortem currently hardcodes its
Red-Team/Steelman deliverable; the memo content is real-shaped but not real inference. WF-1 called
U1 "dispatch wiring," but the shared `RedTeamOutputSchema`/`SteelmanOutputSchema` are built for the
**six-lens adversarial-review** context (`challenges:[{targetRole, claim, counterargument}]` /
`steelmen:[{targetRole, bestCaseArgument}]`) — they do NOT fit pre_mortem's **adversarial-only**
model, whose memo-builder consumes `failureModes:[{id, description, likelihood, severity,
earlyWarningSignal, tripwire}]` + a steelman `defense` string. Options:
  - **(C, recommended)** Give pre_mortem its own real inference: 1-2 `RealClaudeClient` calls with
    pre_mortem-specific prompts producing the existing failureModes/defense shapes (keeps the
    memo-builder unchanged; self-contained to `pre-mortem/index.ts`; does NOT need O1/O3 since it
    bypasses the lens-dispatch registry). Author the prompts against PRD §pre-mortem.
  - (B) Reuse the lens-challenge RedTeam/Steelman, feed proposedAction as the single "claim" to
    challenge, adapt the memo-builder to the challenges shape. Forced semantics.
  - (A) New pre_mortem-specific RedTeam/Steelman agents + schemas in the registry. Most work.

**WF-1 produced 21 verified live-path defects → 12 fixes (S1/S2/U1-U6/O1-O6).** Done: S1,S2,O1,M1
(+prompt-assets,JSON). Remaining from WF-1 (full ranked plan in the WF-1 transcript at
`.../subagents/workflows/wf_a7c69958-38b` and the task-notification result): O3 (load real agent
prompts — all 12 are `'STUB — see Ch.4'`; needed for the generic six-lens path + cash_lever/open_qa),
O5 (cash_lever fail-loud on Verifier contract violation, currently keeps fabricated rigor=85), O2
(open_qa real model client), U3 (quick_read stop overwriting real lens output — daily cron
fabrication), U4 (open_qa merge real lens output), U2 (stakeholder_1_1 use the COS output it
discards), U5 (gtm_realloc STUBBED_SOURCES = only the fabricated source), U6 (board_narrative
hardcoded covenant ratio → UNKNOWN). Most are 1-file fixes; each needs a live verification cycle.

**Then the program (`docs/WORKFLOW_PROGRAM.md`):** WF-2 connectors to 100% real (cash_model xlsx;
NetSuite/Gmail OAuth = Russell hard gates) → WF-4 per-screen integration proofs + write-back loop →
WF-5 cron/autonomy/native (sleep-wake, notifications = hard gates) → GATE-6 the 8 on-Mac demos.

Also still open: task #2 restart-survival UI check (relaunch app → nav-history shows a prior run —
data-layer already proven; just the UI render). board_narrative needs authed connectors (SF/NS/PBI)
to produce a memo — it degraded to no-memo in this unauthed env (not a bug; environment).

## Resume recipe
1. `cd "/Users/russellteter/Claude Code Projects/c-suite"` (branch main). Read this file +
   `docs/WORKFLOW_PROGRAM.md` + `docs/build-log.md` 2026-05-29 entries + `tasks/lessons.md`.
2. `git status` — only the pre-existing non-mine files should be dirty (CLAUDE.md M,
   build/entitlements.mac.plist D, .playwright-mcp/, csuite-home.png, several tasks/*-brief.md,
   vite.preview.config.ts, build/config.gypi, thoughts/...yaml). Leave them.
3. Decide U1 (recommend Option C), implement in `pre-mortem/index.ts`, rebuild
   (`pnpm --filter @c-suite/utility build` then `pnpm rebuild:electron`), prove with
   `PLAYBOOK_KEY=pre_mortem node tests/e2e/live-engine-proof.mjs`. Then continue the WF-1 remainder
   + the workflow program. Keep the no-background-commit control.
