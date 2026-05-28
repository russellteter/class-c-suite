# ADR 0013 — Ch.7 Vite-into-Electron Assembly

**Status:** Accepted  
**Date:** 2026-05-28  
**Chapter:** 7 (Vite + React assembly leg)

## Context

The 11 React screens in `apps/renderer/src/screens/` were unit-tested but never bundled. `apps/renderer/index.html` was a static Ch.6 scaffold placeholder. There was no `vite.config.ts`, no real dev/build scripts in renderer `package.json`, and `electron-builder.yml` had no files block for renderer assets. The app could not launch.

## Decisions

### 1. Vite without @vitejs/plugin-react

`@vitejs/plugin-react@6.x` imports removed `vite/internal` API — incompatible with vite 7.3.3. JSX is handled instead by esbuild via `tsconfig jsx: react-jsx` + `esbuild.jsxImportSource: react` in `vite.config.ts`. This matches the working preview config from the last session.

### 2. .js → .tsx resolver scoped to relative source imports

The resolver plugin rewrites `.js` → `.ts`/`.tsx` only when `id.startsWith('.')` and `!importer.includes('node_modules')`. A broad resolver rewrites Vite's own `.vite/deps` chunks (real `.js` files) and breaks the build.

### 3. Dev mode: load Vite dev server URL; prod: load built dist

`main.ts` gates on `!app.isPackaged && (NODE_ENV === 'development' || VITE_DEV === '1')` to load `http://localhost:5173` in dev. Prod loads `apps/renderer/dist/index.html`. The main dev script sets both env vars.

### 4. CSP relaxation dev-only

Prod CSP is unchanged: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'`.

Dev CSP adds `http://localhost:5173` to `script-src` and `ws://localhost:5173 http://localhost:5173` to `connect-src` to allow Vite HMR. `unsafe-inline` is added to `script-src` for dev only (Vite injects inline module scripts). Gated identically to the URL load decision above — prod is never touched.

### 5. Screenshot capture via --screenshot flag

A `--screenshot=<path>` argv flag in `main.ts` triggers `webContents.capturePage()` after a 1.5s post-load delay (React mount + fixture hydration). Writes PNG to the given path, then quits. Headless-safe — no macOS Screen Recording permission required.

### 6. Root dev script

`package.json` root already had `concurrently` + `dev`/`dev:full` scripts. Main's dev script now sets `VITE_DEV=1 NODE_ENV=development` before `electron .`. Vite starts first (no extra deps needed) because the main build step (utility + tsc) takes several seconds.

## Consequences

- `pnpm dev` from repo root opens an Electron window loading from the Vite dev server.
- `pnpm --filter @c-suite/renderer build` produces `apps/renderer/dist/` for production packaging.
- `electron-builder` packages both `apps/main/dist/` and `apps/renderer/dist/`.
- No `@vitejs/plugin-react` dep in the tree — future upgrades won't hit the plugin compatibility cliff.
