# Ch.6 Dev Script Builder Brief

You are the Dev-Script sub-agent for C-Suite Phase 2 Ch.6. Single deliverable: `pnpm dev` from the repo root launches the full Electron app (main + utility sidecar + renderer) so Russell can visually review against the stub harness. Contract: `docs/decisions/0008-write-backs-and-iterative-feedback.md` §3.7.

## You operate under DOCTRINE
- Truth over completion appearance.
- No shortcuts — actually launch the script; observe each process starts cleanly.
- Cite everything (commands you ran, output you saw).

## Scope

1. **Root `package.json`** — add `concurrently` to `devDependencies` and a `dev` script:

   ```jsonc
   "scripts": {
     // ... existing scripts ...
     "dev": "concurrently -k -n main,utility,renderer -c blue,magenta,green \"pnpm --filter @c-suite/main dev\" \"pnpm --filter @c-suite/utility dev\" \"pnpm --filter @c-suite/renderer dev\""
   }
   ```

2. **`apps/main/package.json`** — ensure a `dev` script exists that launches Electron in dev mode against the project entry point. Default candidate: `"dev": "electron . --inspect=5858"`. Verify the entry point in `apps/main/package.json` `main` field; if Electron needs a different bootstrap (e.g. `electron-forge start` if Ch.0 wired Forge), use that instead. Document what you chose.

3. **`apps/utility/package.json`** — ensure a `dev` script that runs the utility process in watch mode against the stub-harness defaults. Default candidate: `"dev": "tsx watch src/index.ts"`. Verify the entry point.

4. **`apps/renderer/package.json`** — ensure a `dev` script. If the renderer is Vite-wired: `"dev": "vite"`. If it's a non-Vite React app (Ch.5 may not have wired Vite yet): ship a stub `"dev": "echo 'renderer dev server: open Electron main to see the rendered UI'"` so `pnpm dev` does not crash.

5. **Smoke-launch verification.** From a fresh shell at the repo root:
   - Run `pnpm install` (in case `concurrently` needs to install).
   - Run `pnpm dev`.
   - Observe: all three named processes (main, utility, renderer) print startup logs without crashing.
   - Confirm the Electron window appears (you cannot SEE the window in cloud env — but you can confirm the process started and did not crash within 10 seconds via the process log).
   - Kill the script with Ctrl+C and verify clean shutdown (concurrently's `-k` flag propagates SIGINT to all children).

## Forbidden inferences

- Do not add new build tooling that wasn't already in Ch.0 (no Vite if not already wired; no Forge if not already wired; no esbuild if not already there). The goal is the minimum dev-script wiring on top of the existing Ch.0 stack.
- Do not touch any production source file. `apps/main/src/*`, `apps/utility/src/*`, `apps/renderer/src/*` are out of scope.
- Do not run live MCP calls. The utility process must default to `STUB_MODE=replay` (or the project's equivalent) for local dev. If that env var isn't wired, document it as a Ch.7 polish item.

## What "done" looks like

- Root `pnpm dev` runs without errors.
- All three process logs appear, named, color-coded.
- No console errors in the first 10 seconds.
- `pnpm install` cleanly resolves `concurrently` (commit the lockfile change per `~/.claude/rules/commit-lockfile-with-manifest.md`).
- Atomic commits: one for root package.json + lockfile, one for each per-app package.json that changed. Conventional message format. No Claude attribution.

## Report-back format (under 200 words)

- Commits made.
- Output of `pnpm dev | head -30` (the first 30 lines so the orchestrator can confirm clean launch).
- Per-app `dev` script you chose + why (especially if you swapped from the default candidates above).
- Any blocker + three approaches tried.

DO NOT touch production source. DO NOT mark the chapter closed.
