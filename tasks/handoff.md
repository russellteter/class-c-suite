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

## NEXT — WF-1 remainder (patches in flight), then the program

**U1 DONE (2075448) — Option C shipped.** pre_mortem got dedicated `RedTeam.preMortem.prompt.md` +
`Steelman.preMortem.prompt.md` + local zod schemas producing the failureModes/defense shapes the
memo-builder reads (the shared six-lens schemas didn't fit adversarial-only pre_mortem). LIVE = two
sequential RealClaudeClient generations, validated + fail-loud; replay keeps the literals. FULL
GATE-3 proven (real inference → Verifier → CLEAN 7749-char memo, novel failure modes, persisted).

**WF-1 remainder — patches delivered** (`wf1-remainder-patches`, run `wf_e77eae0c-0dc`; result JSON
at `.../tasks/w674ytjk4.output`, 8 patches with exact old/new edits + adversarial verdicts).

BATCH 1 APPLIED + committed (the 3 O3-independent fixes; typecheck-clean, replay-safe, reviewed):
U6 (board covenant→UNKNOWN), O5 (cash_lever fail-loud on Verifier violation when live), DF
(PlanApproval cancel auto-approve countdown on manual Approve + at-most-once guard — stops the
double-fire; 10/10 countdown tests green). DF live-confirmation = next pre_mortem/gtm run shows ONE
run.start; a discriminating regression test is a noted follow-up.

**O3 DONE (918f1e8) — 2026-05-29 session 2.** The 6 lens prompts (CEO/CFO/CRO/CMO/CPO/COS) +
Synthesizer are schema-aligned to their zod `outputSchema`, honest under empty grounding (no hardcoded
Class financials/entities — all stripped to UNKNOWN-on-source), and WIRED: new `agents/agentPrompts.ts`
`loadAgentPrompt(role)` + `dispatch.ts` loads it and injects role+runId before `onSubagentStop`. Proven
live: `quick_read` (dispatchLens×6) all schema-valid + entity-clean + honest (CFO emits UNKNOWN not
invented numbers); Synthesizer via `tests/e2e/live-synthesizer-isolation.mjs` (fed 6 real lens outputs →
SynthesizerOutputSchema PASS). Authored/graded by the `o3-lens-prompt-authoring` workflow; the live run
caught a COS "Chasen" leak the grader missed. Full build-log entry: "O3 DONE" section.

NOW UNBLOCKED — the dependent WF-1 remainder patches (the O2+U4/U3/U2 edits are in the WF-1 result JSON
`.../tasks/w674ytjk4.output`, ready to apply; U5 needs re-derivation):
- **O2+U4** open_qa: real model client + real Synthesizer merge (currently does its own inline synth).
- **U3** quick_read: stop overwriting the real dispatchLens output with the templated stub (CONFIRMED
  live this session — quick_read's memo still shows "Operational lens: execution feasibility is high…"
  stub text even though the 6 lens dispatches now return real schema-valid output).
- **U2** stakeholder_1_1: use the COS output it currently discards.
- **U5** gtm_realloc: honest-UNKNOWN for the hardcoded ROI/pipeline (the workflow's STUBBED_SOURCES
  patch was judged INCORRECT — do the cash_model-style honest-UNKNOWN instead).
Each needs a STUB_MODE=live confirm. Two NEW items surfaced by O3:
- **Verifier-prompt hygiene (next):** `Verifier.prompt.md` still hardcodes "Chasen" — the grader's own
  prompt carrying entities partially defeats fabrication detection. Strip it (handle carefully; it's on
  the proven GATE-3 path).
- **Grounding gap (WF-2/Ch.7):** `buildLensBundle` returns `contextDocuments:[]` — the six-lens path has
  no vault/financial grounding + no tools, so live lens output is honestly UNKNOWN-heavy (correct, not a
  bug). Wiring vault/connector data into `contextDocuments` is the real next leg for grounded memos.
- **Latency:** Synthesizer live call took 628s this session (generic run-loop dispatches lenses
  SEQUENTIALLY); SUSPECT Max-subscription throttling in a heavy session — re-measure clean before
  treating as a perf blocker. quick_read (parallel) is ~110s.

### Original U1 options (kept for reference — Option C was taken)
  - (C, shipped) pre_mortem-specific real inference producing the existing failureModes/defense shapes.
  - (B) Reuse lens-challenge RedTeam/Steelman, adapt the memo-builder. (A) New registry agents+schemas.

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
0. **ABI STATE: left at ABI-130 (app-runnable, proof-ready)** — session 2 ran `npx vitest` (flips to
   137) then `pnpm rebuild:electron` back to 130. RULE: `npx vitest` flips better-sqlite3 to Node-137;
   run `pnpm rebuild:electron` before ANY app/e2e/live proof if you've run vitest since, or you'll eat a
   `firstWindow timeout` (app launches, no window). `pnpm --filter @c-suite/utility build` does NOT flip it.
1. `cd "/Users/russellteter/Claude Code Projects/c-suite"` (branch main). Read this file +
   `docs/WORKFLOW_PROGRAM.md` + `docs/build-log.md` 2026-05-29 entries (incl. the "O3 DONE" section) +
   `tasks/lessons.md`. **U1 + O3 are DONE** — resume-recipe step 3 below (U1) is historical.
2. `git status` — only the pre-existing non-mine files should be dirty (CLAUDE.md M,
   build/entitlements.mac.plist D, .playwright-mcp/, csuite-home.png, several tasks/*-brief.md,
   vite.preview.config.ts, build/config.gypi, thoughts/...yaml). Leave them.
3. Decide U1 (recommend Option C), implement in `pre-mortem/index.ts`, rebuild
   (`pnpm --filter @c-suite/utility build` then `pnpm rebuild:electron`), prove with
   `PLAYBOOK_KEY=pre_mortem node tests/e2e/live-engine-proof.mjs`. Then continue the WF-1 remainder
   + the workflow program. Keep the no-background-commit control.
