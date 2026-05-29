# Handoff — C-Suite production drive (2026-05-28, late session)

Driving the production plan (`docs/PRODUCTION_PLAN.md`) to a working V1. Full execution
authority granted by Russell — no approval gates; only genuine hard gates (on-Mac, his OAuth
consents, real product-shape forks). Operating model: continuous workflow-driven execution,
**agents edit + report, orchestrator (main thread) reviews + commits serially, only one actor
on `main` at a time** (lesson from the auto-commit incident — see `tasks/lessons.md`).

## Where we are (all committed + pushed)
- **Phase 0 DONE** — DB tests seed from real migrations; drift now fails a test; `tool_calls`
  P0 fixed; DOCTRINE codifies the APP-PROOF gate. Suite was 2068 pass / 0 fail.
- **Phase 1 DONE (code + unit-proven)** — shared `runtime.db` persistence (utility opens its own
  connection via `C_SUITE_DB_PATH`; runs persist; resume-status fix); fabrication killed across
  ALL playbooks; health-score deprecated→raw-usage dormancy; Home missing-table crash fixed
  (migration 008 + `home.workstreams` IPC). Live run-persistence APP-PROOF is BATCHED into Phase 3.
- **Phase 2 connector code DONE** — SF/NetSuite schema-drift advisories (`{expectRows:true}` →
  flag empty-but-expected, never silent); PowerBI `preflight.ts` 4-state classification (8e3dc2e).
- **PowerBI LIVE-VERIFIED (real data)** — reused the working `token.pickle` from
  `dashboards/customer-dashboard-poc/.secrets/` → copied to `customer-dashboard/.secrets/`. A real
  fetch pulled 688 sheet rows / 668 accounts / real names (Pecos Cyber Academy, Rheem, FanDuel) +
  CSVs. No consent needed. Token is self-contained (own client_id+refresh).

Commit chain this session: 06b839f→8e3dc2e (see `git log`). Plan + ledger: `docs/PRODUCTION_PLAN.md`,
`docs/build-log.md`. Phase tasks: TaskList (#7 Phase2, #8 Phase3, #9-11 Phases 4-6, #12 Phase0-tail).

## CRITICAL STATE
- **better-sqlite3 ABI = NODE right now** (Phase 0/unit mode). Before ANY app/e2e/live-Electron
  run: rebuild for Electron 33 ABI. The rebuild tooling is BROKEN — `scripts/rebuild-electron-native.mjs`
  reads `node_modules/electron` (hoisted/absent at root); `electron-rebuild -v 33.4.11 -o better-sqlite3`
  reports complete but the pnpm-hoisted copy stays Node ABI. FIX THIS FIRST in Phase 3 (resolve electron
  from apps/main; confirm the hoisted `.pnpm/better-sqlite3@12.10.0` copy actually switches to ABI 130).
- **PowerBI projectPath**: C-Suite's connector `projectPath` is configurable. BOTH
  `customer-dashboard` (clone, Russell's credentials.json + copied token) and
  `dashboards/customer-dashboard-poc` (original, token) now have a working token. Confirm/point the
  C-Suite connector at one (check `apps/utility/src/mcp/powerbi/subprocess.ts` + buildDeps).
- **CLAUDE_CODE_OAUTH_TOKEN** is stored in `apps/main/.env.local` (gitignored) and live-validated (HTTP 200).
- Pre-existing dirty/untracked (NOT mine, leave): `CLAUDE.md` (M), `build/entitlements.mac.plist` (D),
  `.playwright-mcp/`, `csuite-home.png`, several `tasks/*-brief.md`, `vite.preview.config.ts`, `build/config.gypi`.

## NEXT (Phase 3 — the big batched live pass; needs Electron ABI)
1. **Fix the Electron-ABI rebuild tooling** (above) — gates everything live.
2. **Live run-persistence APP-PROOF**: rebuild electron → launch app → drive Cash Lever → Approve →
   confirm a `runs` row persists in `runtime.db` + memo in vault + survives restart (runs-list shows it).
3. **Live Cash Lever in STUB_MODE=live**: real Claude inference (token ready) + real MCP data →
   sourced memo → Verifier rigor score → SafeWrite. Route cash_lever to its bespoke CFO+COS path; author CPO lens prompt.
4. **NetSuite + Gmail OAuth consents** (in-app, Russell hard gates) once the app runs live.
5. PowerBI: run `./scripts/mcp-live-smoke.sh powerbi` to confirm the C-Suite connector returns the real data end-to-end.
Then Phase 4 (surface integration proofs + write-back loop), Phase 5 (autonomy/native), Phase 6 (8 on-Mac demos = V1 done).

## Resume recipe
1. `cd "/Users/russellteter/Claude Code Projects/c-suite"` (branch main). Read `docs/PRODUCTION_PLAN.md` + the
   `docs/build-log.md` 2026-05-28 entries + `tasks/lessons.md` (control model).
2. Confirm clean tree: `git status` (only the pre-existing non-mine files above should be dirty).
3. Start Phase 3 at step 1 (fix ABI rebuild), then the live pass. Keep the no-auto-commit control.
