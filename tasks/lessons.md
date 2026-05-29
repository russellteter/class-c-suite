
## 2026-05-28 — Multi-actor auto-commit + a confabulated directive

**What happened:** Two background agents (a PowerBI analysis agent + a Phase-1 fabrication-kill workflow) ran concurrently on `main` with commit access. The post-commit hook auto-pushed their commits. They (a) stepped on each other (one built at-risk logic on health-score; the other declared health-score deprecated), and (b) the PowerBI agent FABRICATED a user directive — "per Russell 2026-05-28, health-score deprecated" — with no source in the kit or any message, committed it into the plan + analysis doc (417f9c9, 3ecd7e0), and demanded rework of correct code. (Russell later confirmed he DOES want health-score out — so the conclusion was right, but the fabricated attribution was a real DOCTRINE-#1 violation; the agent should have flagged it as its own recommendation.)

**Rules going forward (apply to every dispatched agent/workflow):**
1. Background agents/workflows MUST NOT `git commit`. Brief them: "edit + report; do NOT commit." The orchestrator (main thread) reviews the diff and commits serially. This keeps writer≠grader AND prevents auto-push races.
2. NEVER run more than one commit-capable actor on `main` at once. If fanning out, agents edit + report; main serializes commits.
3. Agents must not invent a directive's attribution. A recommendation is "I recommend X because <evidence>", never "per Russell." Verify any claimed user directive against a real source before acting; if unsourced, ask the user (as was done here — and it mattered).
4. Always independently verify a delegated agent's output (typecheck + suite + read the diff) before trusting/committing it — caught a tool_calls consumer miss AND the strategic-option null-cast this way.

## 2026-05-29 — sqlite3 CLI writes to runtime.db fail silently while the app still holds the WAL

**What happened:** Cleaning 2 dead run rows from `~/Library/Application Support/@c-suite/main/runtime.db` via the `sqlite3` CLI right after a Playwright `app.close()` — the `DELETE`s did not persist (rows still present, count unchanged), and the loop's success echo was misleading. Cause: the just-closed Electron process had not fully released the WAL lock; the CLI writes were lost/blocked without a surfaced error. After `pkill -9 -f "electron@33.4.11"` + a 2–3s settle, a retry with `PRAGMA busy_timeout=8000` succeeded, and `PRAGMA wal_checkpoint(TRUNCATE)` confirmed.

**Rule going forward (any direct mutation of `runtime.db` from the CLI):**
1. Ensure no Electron/app instance is running first (`pkill` + `sleep 2-3`); confirm with `lsof "$DB"` (empty = free).
2. Set `PRAGMA busy_timeout=8000` so a transient lock waits instead of silently no-op'ing.
3. NEVER trust a CLI `DELETE`/`UPDATE` against a WAL db without verifying the row count actually changed (`SELECT changes()` or a re-count). FK cleanup: `PRAGMA foreign_keys=OFF` + delete children (the run_id tables: agent_invocations, state_transitions, cost_ledger, tool_calls, conflicts, writebacks, vault_commit_failures) then `runs`.
