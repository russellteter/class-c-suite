# B45 Diagnostic + Fix Brief — Utility Process Crash-Loop Under `pnpm dev`

> Focused mini-session before Ch.7 entry. Diagnose then fix. Auto-mode: decide-and-log, no questions to Russell. Commit + push at the end.

## Goal
Make `pnpm dev` from the repo root produce a stable, non-crashing utility process so the Electron app can run end-to-end during Ch.7 build. **Definition of done:** the supervisor reports `utility process started`, no `crash` rows land in `process_events` for at least 30 seconds, and the `__port_init` handshake completes (utility logs `utility IPC port initialized`).

## Repo
`/Users/russellteter/Claude Code Projects/c-suite/`. Path has spaces — quote it.

## Symptom (verbatim from handoff)
- `pnpm dev` launches Electron + main + DB + migrations + vault watcher + scaffold window cleanly.
- Main forks utility via `utilityProcess.fork('apps/utility/dist/index.js')`. Utility starts then crashes within ~150ms.
- Supervisor restarts 6× then halts.
- First crash emits one stderr line that hints at ESM module resolution; subsequent crashes log exit code 1 with no stderr.
- Standalone `node apps/utility/dist/index.js` is not a useful test because `process.parentPort` is Electron-only.

## Why this matters
- Blocks Ch.7 runtime work — no utility = no scheduler, no lens dispatch, no writebacks end-to-end.
- Was missed by Ch.0–5 audits because none of them launched the app under Electron's runtime (CI ran under plain Node where the existing pre-compiled `better-sqlite3` binary matched). Treat the fix as belt-and-suspenders: instrumentation now will save the next chapter from the same blind spot.

## Required reading (before any code change)
1. `BLOCKERS.md` §B45 (lines 455–465) and §B44 (lines 448–453) — full mitigation hypotheses.
2. `thoughts/shared/handoffs/general/2026-05-27_19-25_ch6-close.yaml` — `blockers:` and `findings:` sections.
3. `apps/main/src/supervisor.ts` — current stderr capture at line 97.
4. `apps/utility/src/index.ts` — utility entrypoint (load-bearing imports at lines 13–17).
5. `apps/utility/src/orchestrator/run-loop.ts` — line 15 (`@c-suite/stub-harness/stub`) and line 16 (`@c-suite/writeback-engine`) are the suspect transitive imports.
6. `packages/writeback-engine/src/index.ts` line 8 — `import type Database from 'better-sqlite3'` (type-only; should be erased, but verify the compiled JS).
7. `packages/stub-harness/package.json` — confirms `./stub` subpath export.
8. `apps/utility/package.json` + `apps/utility/tsconfig.build.json` — confirm output module format (ESM).
9. `pnpm-workspace.yaml` + root `package.json` — `onlyBuiltDependencies` is at workspace root now (Ch.6 move).

## Diagnostic plan — execute in order
### Step 1. Tighten supervisor instrumentation (always-on, ship it)
Edit `apps/main/src/supervisor.ts` to:
- Pipe utility stdout in addition to stderr. Currently only stderr is captured; some Node ESM failures log to stdout under certain Electron builds.
- Buffer the full stderr/stdout output per child (don't log only the first chunk — accumulate until exit) and log the buffer with the exit row in `process_events`.
- Add a one-shot environment dump: on `forkUtility`, also fork with env var `UTILITY_DIAG=1`. Inside `apps/utility/src/index.ts`, the **very first** statement (before the import block) should be a synchronous `process.stderr.write` of `{ nodeVersion: process.version, modules: process.versions.modules, electron: process.versions.electron, execPath: process.execPath }` — JSON-encoded one line. This proves whether the utility is running Electron's bundled Node and which ABI it expects.
- Surface the buffered diagnostic to renderer via a new `utility.crash.diagnostic` IPC variant. (Add to `packages/shared-types/src/ipc.ts`. Renderer can ignore for now — log only.)

### Step 2. Reproduce the crash with the new instrumentation
- From repo root: `pnpm build` (or `pnpm build:soft` if B44's tsc errors block; the workspace already ships `build:soft`).
- Then `pnpm dev`. Capture full main + utility stderr+stdout. Wait for the 6× restart halt. Read `process_events` rows from SQLite at `~/Library/Application Support/c-suite/runtime.db` (or wherever `app.getPath('userData')` resolves to).
- **Expected output:** the first-chunk environment dump line + the actual crash stack.

### Step 3. Classify root cause
Compare against the three hypotheses (in priority order):

| # | Hypothesis | Evidence to confirm |
|---|-----------|---------------------|
| H1 | ESM import resolution fails for a `@c-suite/*` workspace package because the compiled output uses a path the utility runtime can't resolve (extension drift, `paths` mapping not honored at runtime, subpath export mismatch). | Stack mentions `ERR_MODULE_NOT_FOUND` or `Cannot find module`. The failing specifier is one of `@c-suite/stub-harness/stub`, `@c-suite/writeback-engine`, `@c-suite/shared-types/*`. |
| H2 | `better-sqlite3` native binding ABI mismatch between the utility's Node and the pre-compiled `.node` file (Electron 33 ABI 130 vs whatever Electron's bundled Node thinks it is). | Stack mentions `dlopen`, `node-gyp`, `NODE_MODULE_VERSION`, or `Cannot find module '...better_sqlite3.node'`. **Important:** the utility's `import type Database from 'better-sqlite3'` is type-only and should NOT load the native binding. If it does, the compiled JS has a stray runtime `import` — verify against `apps/utility/dist/orchestrator/run-loop.js`. |
| H3 | Pre-existing B44 type errors (`run-loop.ts` lines 15, 121, 151) emitted invalid JS that crashes at module-init time. | The stack points to a line inside `run-loop.js` early in its module evaluation — e.g. a reference to an unresolved import binding. |

Run a grep on the compiled output:
```sh
grep -rn "require\|import " apps/utility/dist/orchestrator/run-loop.js | head -20
grep -rn "better-sqlite3" apps/utility/dist/ | head -20
grep -rn "require\|from " apps/utility/dist/index.js | head -20
```

### Step 4. Apply the smallest fix that resolves the actual cause

**If H1 (ESM resolution drift):**
- Confirm the failing specifier and inspect both ends: the importer's compiled `import` statement and the importee's `package.json` exports field + actual `dist/` files.
- Most likely fix: align the `exports` map on the workspace package, OR rewrite the offending import to use the package's main entry (e.g. drop `/stub` subpath and re-export from the package's `index.ts`).
- If `paths` mapping in `tsconfig.json` was relied on at runtime, replace with workspace-protocol resolution (pnpm handles this when the package is declared as a `workspace:*` dependency in the importer's `package.json`).

**If H2 (ABI mismatch on better-sqlite3 inside utility):**
- First: confirm whether the utility actually imports the runtime native binding. If the only references are `import type`, they should be erased — investigate why a runtime require exists. Possible: a transitive dependency of `@c-suite/writeback-engine` pulls it in. (Inspect `packages/writeback-engine/dist/index.js`.)
- Fix path A (preferred per handoff): route utility's DB access through main's already-open handle via IPC. Eliminate utility's direct dep entirely. This may be larger than the scope here — if so, fall back to fix path B.
- Fix path B: rebuild better-sqlite3 for the exact ABI Electron's utility process uses. Add `electron-rebuild` to the `pnpm dev` predev hook for the utility package. Verify the rebuilt `.node` is the one actually loaded (it will live under `node_modules/better-sqlite3/build/Release/`).
- Fix path C (minimum scope to unblock dev): ensure the utility's `better-sqlite3` import is fully erased — verify with `grep "better-sqlite3" apps/utility/dist/**/*.js` returns zero hits. If it does, the `import type` is failing to erase, possibly because of a `tsconfig.build.json` `isolatedModules` or `verbatimModuleSyntax` setting.

**If H3 (B44 emitting bad JS):**
- Fix the 3 TS errors per the Ch.3 contract (also closes B44):
  - Line 15: `@c-suite/stub-harness/stub` — confirm the subpath export is correct, otherwise switch to `@c-suite/stub-harness` (main export).
  - Line 121, 151: RunEvent discriminated-union narrowing — add proper type guards so the union narrows correctly.
- Remove `build:soft` (`tsc || true`) from the utility and main package.json once `tsc` is exit-0 clean.

### Step 5. Verify
- Re-run `pnpm dev` from a fresh shell. Watch for the utility to print `utility process started` AND `utility IPC port initialized` AND no crash row landing in `process_events` for 30 seconds.
- Run `pnpm vitest run tests/unit/writeback-engine/` — should remain 68/68 green.
- Type-check: `pnpm -r typecheck` (or per-package as needed). Should be exit-0 clean if you also fixed B44.

### Step 6. Document
- Update `BLOCKERS.md`: mark B45 MITIGATED (with the root-cause sentence + the fix's commit SHA). If you also fixed B44, mark it CLOSED.
- Append a `docs/build-log.md` entry: `B45 fix — <root cause> — <one-line fix>`.
- Auto-push happens via the post-commit hook. Verify with `git log -1 origin/main` after the final commit.

## Constraints
- Auto-mode: do not ask Russell questions. Pick the smallest fix that resolves the observed cause and ship it.
- No destructive git. No `--no-verify`. No skipping the post-commit hook.
- One concept per commit. Format: `b45: <what> — <why>`. No Claude attribution lines.
- Stay within the diagnostic + fix scope. Do NOT start Ch.7 SPEC. Do NOT refactor unrelated code.
- If the diagnostic reveals a deeper architecture issue (e.g. utility process model needs to change), STOP and write a one-page finding to `docs/research/B45-findings.md`. Do not start a redesign.

## Report back (≤300 words)
- Root cause classified (H1 / H2 / H3 / new).
- Evidence cited with file:line + stderr snippet.
- Fix applied + commit SHAs.
- Verification results.
- Whether B44 was also closed (or remains open).
- Anything next-session should know.
