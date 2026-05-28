# Handoff — Make the C-Suite app actually run (2026-05-28)

Trigger: Russell — "nothing really works at all... try to do anything." Prior work verified
connectors in isolation but never drove the assembled app. Two keystone fixes landed; renderer
IPC contract hygiene + E2E proof remain.

## What was done this session
- Diagnosed why the prior session died: extended-thinking 400 (corrupted thinking block after
  interrupt/compaction). That session is unrecoverable by typing; use this one (`d3ceebb0`).
- Fixed boot chain (`3d8fe41`): restored `apps/main/package.json` regression from `269effe`
  (dropped `type:module`/`main`/deps), rebuilt better-sqlite3 for Electron 33 ABI, cleared stale
  single-instance lock, and gave `writeback-engine`/`vault-writer`/`vault-watcher` a `tsc` build +
  `main→dist` (they pointed at raw `.ts` → utility crash-looped → every screen dead).
- Fixed renderer IPC bridge (`872f25a`): preload was ESM under `sandbox:true` → never loaded →
  `window.ipc` absent. Renamed `preload.ts`→`preload.cts` (emits true CommonJS `preload.cjs`).
- Built repeatable Electron E2E harness `tests/e2e/` (playwright `_electron`, drives the REAL
  window). Verified: utility stays alive, `window.ipc` round-trips (`runs:list → array(0)`).
- Ran static IPC audit + live baseline: enumerated all renderer↔shared-types↔main drift.

## Current state
- WORKING: app boots, utility alive (0 crashes), IPC bridge live, all 11 screens render cleanly
  (Home/Connectors/Scheduler screenshots look polished). Both fixes committed + auto-pushed to main.
- NOT working / by design: 8 invoke channels have no main handler (settings, netsuite connect,
  tool-call) — **intentionally deferred to Ch.10** (UI labels them "Pending Ch.10"). `cost.usage`
  only emits during a run, so "USAGE LOADING…" + empty rail at idle is expected (no runs yet).
- NOT fixed yet: 5 renderer-emitted IPC kinds missing from the `ipc.ts` union + 2 `as never` casts
  → runtime ZodErrors (`run.cancelled` reproduced live).

## Files touched
- `git status`: untracked preview harness (`vite.preview.config.ts`, `apps/renderer/preview.html`),
  `csuite-home.png`, `.playwright-mcp/`, `build/config.gypi`, several `tasks/*.md`; modified
  `CLAUDE.md`; deleted `build/entitlements.mac.plist`. None are mine-pending except the resume doc.
- `git diff --stat HEAD~2`: apps/main/package.json, preload.ts→preload.cts, window.ts, 3 package
  pkgs, root package.json, pnpm-lock.yaml, tests/e2e/* (+268/-30).

## Open threads
- A-category IPC fix — DONE + verified + committed (`06b839f`, auto-pushed). Added the 5 kinds to
  `packages/shared-types/src/ipc.ts`, removed both `as never` casts in `PlanApproval.tsx`, dropped
  the unused `plan` field from `run.plan.approved`. Verified: typecheck green, `ipc.spec.ts` 63/63
  (+5 new-kind cases), direct `validateIpc` assertions pass, Electron harness shows the live
  `run.cancelled` ZodError gone (0 pageerrors). No longer an open thread.
- **THE BIG ONE — the run path is UNWIRED (not cred/runtime-gated).** Cash Lever E2E cannot run
  because nothing invokes the orchestrator. Evidence (see build-log 2026-05-28 truth-correction):
  `startRun` has zero production callers (`grep -rn "startRun" apps` → only the def in
  `run-loop.ts:60` + dist); the renderer never emits `run.start`; the utility (`apps/utility/src/index.ts`)
  handles only `__port_init`/`scheduler:reset`/`handoff.preview.requested`; main never relays renderer
  IPC to the utility; and no caller SafeWrites the Synthesizer memo (`transitions.ts:7` defers it,
  `state-machine.ts` carries `memoMarkdown: ''` + only a `memoPath` string). The orchestrator is built
  and unit-tested but never connected. This is a capability build, not a demo run — see Next step.
- Headless `startRun` E2E is ABI-blocked: `better-sqlite3` is built for Electron 33 ABI →
  `ERR_DLOPEN_FAILED` under plain-Node vitest. Drive it under Electron's ABI (`ELECTRON_RUN_AS_NODE`)
  or inside the app, not via `npx vitest`.
- `tests/e2e/cash-lever-stub.spec.ts` is STALE: it imports a nonexistent `runOrchestrator` from
  `apps/main/src/orchestrator/index.js`. The real entry is `startRun` in `apps/utility/src/orchestrator/run-loop.ts`.
- A standalone vite (:5273) may still be running from `tests/e2e/run.sh` — harmless; `pkill -f "electron@33.4.11"; lsof -tiTCP:5273 | xargs kill` to clean.

## Next step (product-shape build — surface to Russell for sequencing)
Wire the run path end-to-end (likely the substance of Ch.11). Four legs, crossing renderer + main + utility + orchestrator:
1. Renderer: emit `run.start` (playbook + question + runId) on plan approval — today it emits only `run.plan.approved`.
2. Main: forward `run.start` to the utility port (add the relay; only `scheduler:reset` is forwarded today).
3. Utility: add a `run.start` handler in `apps/utility/src/index.ts` that calls `startRun(runId, playbookId, question, db, emit)`.
4. Memo surface: assemble the Synthesizer memo and SafeWrite it to the vault (the run-loop computes only a `memoPath` string today), emitting progress/result IPC back to the renderer.
Pairs with the open Ch.7 Vite-assembly leg (`thoughts/.../2026-05-28_05-34_netsuite-wiring-and-frontend-assembly-gap.yaml`).

## Resume recipe
1. `cd "/Users/russellteter/Claude Code Projects/c-suite"` (branch `main`).
2. Read this file + the build-log 2026-05-28 truth-correction entry. (`tasks/resume-2026-05-28_nothing-works.md` has the older boot-chain diagnostic.)
3. Verify app still boots/renders: `bash tests/e2e/run.sh` then `node -e "const r=require('./tests/e2e/report.json');console.log(JSON.stringify(r.summary))"` — expect bridge round-trip ok, 1 console error (font CSP only; run.cancelled ZodError is fixed).
4. Build the run-path legs above (TDD; mind the better-sqlite3 ABI — run integration under Electron, not plain-Node vitest). Do NOT implement the 8 Ch.10 handlers (deferred).
