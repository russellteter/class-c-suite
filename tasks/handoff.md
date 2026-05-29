# Handoff — C-Suite — 2026-05-29 (session: rendering leg + CLAUDE.md improve + compound-learning)

## What was done
- **Rendering leg DONE + PROVEN** (commit `3ffe0a8`): a produced memo is now visible in the app.
- Main: extended `runs:list` (+`memo_path,rigor_score,finished_at`) + new path-guarded **`memo:read`** channel (vault root replicated textually from `getVaultPath()` to avoid prod drift).
- Renderer: `useRuns.ts` (new); Home tiles show real per-playbook freshness + a **Recent Runs** rail surface → click; `App.handleViewMemo` routes `memo:read` → existing `memo-viewer` screen (killed the dead `vault.openFile` send).
- Proof `tests/e2e/render-leg-proof.mjs` (new, 6/6): Cash Lever→Approve→memo persists→Recent Runs→click→MemoViewer renders. Self-cleaning. typecheck green ×9; main rebuilt (tsc, ABI-130 untouched).
- **Real-app seed (you approved):** seeded `memos/2026-05-29-cash_lever-bb235f24.md` into the REAL vault + removed 2 dead test rows → app shows 1 working clickable Recent Run (smoke 19/19, `home-initial.png`).
- **Retracted an overclaim** (`b84d387`): memos are untracked BY DESIGN (`memo` zone `commitVault:false`, zonePolicy.ts/ADR-0003 §2) — NOT a commit failure.
- CLAUDE.md improved (`8abd049`): main-from-dist + render-paths + memos-untracked gotchas; dropped stale "renderer not assembled" bullet; added e2e/rebuild commands.
- compound-learning (`c9bb662` + global rule): see Open threads.

## Current state
- **Working/proven:** run→persist→list→click→render chain; tiles show real freshness; Recent Runs renders + routes. App boots/navigates all 11 screens (smoke 19/19, 0 page errors).
- **Not / honest gaps:** memo content is a replay PLACEHOLDER (real grounded content = open thread); Recent Runs **live-refresh on completion is wired but UNTESTED** (proof used reload).
- **Deployed:** local only; 6 commits auto-pushed to `origin/main` (0 ahead). ABI Electron-130 (app-runnable).

## Files touched (commits `d72b238..c9bb662`)
handlers.ts +57 · useRuns.ts (new) · Home.tsx +96 · App.tsx +27 · render-leg-proof.mjs (new) · CLAUDE.md · build-log.md · lessons.md · handoff.md. Plus global rule `~/.claude/rules/dont-assert-root-cause-from-a-symptom.md` (not a repo file). Working tree: only unrelated pre-existing files (entitlements D, untracked briefs/png/yaml/preview) — leave them.

## Open threads
- **Real memo content:** one STUB_MODE=live run (throttled) + wire `buildLensBundle` grounding (`contextDocuments:[]`). Placeholders until then.
- **Recent Runs live-refresh** (useRuns on `agent.complete`) is unverified — prove it updates without a reload, or accept reload-on-mount.
- Gap A2 (Ch.7 in-memory `visitedStates` → no persisted transitions); `*.set` IPC writes + `app_settings` table; `connector.netsuite.connect` OAuth; Gap D (connector creds in vault).
- Minor policy Q: should memos be git-versioned? (currently `commitVault:false` by design, ADR-0003 §2).

## Next step
Real memo content: run one **live + grounded** Cash Lever pass so the visible memo carries real findings (the render path is already proven).

## Resume recipe (cold)
1. `cd "/Users/russellteter/Claude Code Projects/c-suite"` (branch `main`). Read this file + `docs/build-log.md` "Phase 1c" entry.
2. ABI guard: if `npx vitest` ran since, `pnpm rebuild:electron`. If you edited `apps/main/src`, `pnpm --filter @c-suite/main build`. Vite up: `pnpm --filter @c-suite/renderer dev` (:5273).
3. Re-prove render leg: `pkill -f "electron@33.4.11"; node tests/e2e/render-leg-proof.mjs` (6/6).
4. For real content: STUB_MODE=live + grounding in `apps/utility/src/orchestrator/run-loop.ts` (`buildLensBundle` contextDocuments). Verify in-app via the smoke + a click.
