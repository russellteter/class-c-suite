# TRACK 1 — Ch.7 Vite-into-Electron assembly leg

You are a senior front-end/Electron engineer. The C-Suite is a pnpm-monorepo Electron app. The 11 React screens in `apps/renderer/src/screens/` are real and unit-tested (+372 specs) but were NEVER bundled into a renderer the Electron main process loads. There is no `vite.config.ts`, `apps/renderer/src/index.tsx` is referenced nowhere, `apps/renderer/index.html` is a static placeholder, and `electron-builder.yml` has no renderer-dist block. Your job: build the assembly leg so the app actually launches and renders.

## Required reading before you touch anything
1. The handoff: `thoughts/shared/handoffs/general/2026-05-28_05-34_netsuite-wiring-and-frontend-assembly-gap.yaml` — read §findings, §failed, §worked, §next, §questions IN FULL. It contains hard-won constraints.
2. `apps/renderer/preview.html` + `vite.preview.config.ts` (repo root) — a WORKING throwaway Vite browser preview built last session that proves the screens render. REUSE its resolver/JSX approach.
3. `apps/renderer/src/index.tsx`, `apps/renderer/src/App.tsx` (or equivalent entry/root), `apps/renderer/package.json`, `apps/renderer/index.html`.
4. `apps/main/src/main.ts` around lines 82-87 (the loadFile call).
5. `vitest.config.ts` (root or renderer) — copy its shared-types path aliases.
6. `electron-builder.yml`.
7. Root `package.json` scripts.

## Hard constraints from the handoff (DO NOT relearn these the hard way)
- DO NOT use `@vitejs/plugin-react@6` — it imports removed `vite/internal` and breaks under vite 7.3.3. Use `tsconfig` `jsx: react-jsx` + let vite/esbuild handle JSX (esbuild JSX, as the preview does).
- The `.js`->`.tsx` resolver plugin MUST be scoped to relative source imports only: `id.startsWith('.') && !importer.includes('node_modules')`. A broad resolver rewrites vite's own `.vite/deps` chunks and breaks the build.
- Reuse shared-types aliases from `vitest.config.ts`.

## Tasks (verbatim from handoff §next)
1. `apps/renderer/vite.config.ts` — the `.js`->`.tsx` resolver (scoped per above) + shared-types aliases + esbuild JSX. Root set to `apps/renderer`, build outDir `dist`.
2. `apps/renderer/index.html` — replace the Ch.6 static placeholder with a real Vite entry that loads `/src/index.tsx`.
3. `apps/renderer/package.json` — real `dev` (`vite`) + `build` (`vite build`) scripts.
4. `apps/main/src/main.ts:82-87` — load the Vite dev server URL in dev (`process.env` gated), built `dist/index.html` in prod. Resolve the CSP-for-dev question: relax strict CSP DEV-ONLY for Vite HMR; PROD CSP stays strict. Document this decision in an ADR (`docs/decisions/0008-csp-dev-relaxation.md` or next free number — check the dir).
5. ROOT `package.json` — add a `dev` script launching main + utility + renderer concurrently. Use `concurrently` (add as devDep; COMMIT package.json + pnpm-lock.yaml together per the lockfile rule). Russell explicitly flagged this gap.
6. `electron-builder.yml` — add a `files` block including the renderer `dist`.

## Acceptance (ALL FOUR required before claiming complete)
1. `pnpm dev` from repo root opens an Electron window.
2. Home screen renders with fixtures.
3. Screenshot the Home screen and commit it to `docs/build-log.md` (add it to `docs/assets/` or similar and reference it). 
4. The screenshot must be captured PROGRAMMATICALLY via Electron's `webContents.capturePage()` API (add a dev-only IPC hook or a `--screenshot` flag to main.ts that captures after the window finishes loading and writes a PNG). DO NOT rely on macOS `screencapture` of a GUI window — a headless/tool-driven agent may lack display/accessibility permissions for that.

## Two end states — pick based on reality (DO NOT loop)
- **(a) Happy path:** `pnpm dev` launches + `capturePage()` writes a PNG showing the Home screen rendered. Commit everything atomically. Report COMPLETE with the screenshot path.
- **(b) If the Electron window genuinely cannot launch or capturePage cannot run in your environment** (display/permission/ABI blocker you cannot resolve in 3 attempts): commit the build-code-complete state (all 6 tasks done, code correct), document EXACTLY what blocks the launch + what you tried, and report `BUILD-COMPLETE-VERIFY-PENDING` so the orchestrator can route it to Russell as hard-gate #3. DO NOT spin trying to force a GUI screenshot.

## Commits
Atomic, narrow, `<scope>: <what> — <why>` format, NO Claude attribution. The post-commit hook auto-pushes. Commit package.json + pnpm-lock.yaml together.

## Report back (under 250 words)
State which end state (a or b), the exact screenshot path if (a), the commits made, and any follow-ups. If (b), the precise blocker + reproduction.
