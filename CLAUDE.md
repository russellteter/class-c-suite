# CLAUDE.md — Project Instructions (C-Suite)

> Project-level instructions for Claude Code working in this repo. Loaded automatically at session start in addition to `~/.claude/CLAUDE.md`.

## What this project is

The C-Suite: a single-user macOS menubar application that operationalizes Russell Teter's Strategic AI Operating Model. The complete product spec is `/Users/russellteter/Documents/Claude/Projects/Business Planning/C_Suite_PRD.md`. The original build mission brief is `/Users/russellteter/Documents/Claude/Projects/Business Planning/C_Suite_CLAUDE.md`. Both are the source of truth; this file is the operating runbook.

## Commands

```bash
pnpm dev                      # Electron app (main + renderer); dev:full adds utility
pnpm --filter utility build   # Compile apps/utility (tsc) — needed before live smoke
npx vitest run                # Full unit suite
npx vitest run tests/unit/mcp/netsuite/   # Scope to one area
./scripts/mcp-live-smoke.sh all           # Live 6-connector smoke (salesforce/powerbi/gmail/netsuite/aws/chorus)
pnpm typecheck                # tsc --noEmit across workspaces
pnpm --filter @c-suite/main build         # Rebuild main (tsc) — app runs from dist/; do after editing apps/main/src
bash tests/e2e/run.sh                     # Real-Electron smoke: frees single-instance lock, starts vite :5273, drives the app
node tests/e2e/render-leg-proof.mjs       # Prove run→memo→render e2e (prereq: vite :5273; pkill -f electron@33.4.11 between runs)
node tests/e2e/live-cash-real-vault.mjs   # LIVE grounded cash_lever run → real Opus-verified memo in the vault (proven 2026-05-31: f617c0ed, rigor 92). Sets STUB_MODE=live + real VAULT_PATH itself; ~20-34min (synth is slow). Prereq: vite :5273; between runs pkill -f electron@33.4.11 AND clear stale in_progress rows (UPDATE runs SET status='failed' WHERE status='in_progress') so boot-resume gives one run the full token budget.
```

## Architecture (pnpm monorepo)

- `apps/main/` — Electron main process (BrowserWindow, IPC router, tray, supervises utility)
- `apps/renderer/` — React UI (11 screens under `src/screens/`); entry `src/index.tsx`
- `apps/utility/` — forked agent runtime: playbooks, MCP clients (`src/mcp/*`), orchestrator
- `packages/` — shared-types, vault-writer, vault-watcher, writeback-engine, stub-harness

## Read order at session start

If you are `/goal` or any sub-agent of `/goal`, read these in order before any action:

1. **`PURPOSE.md`** — the why and the 8 V1 outcomes.
2. **`DOCTRINE.md`** — operating laws. **Non-negotiable.**
3. **`ROADMAP.md`** — chapter sequence + gates + exit criteria.
4. **`BLOCKERS.md`** — what could kill the build; check current status before each chapter.
5. **`RESEARCH.md`** — the Phase R protocol; run this before any chapter is coded.
6. **`docs/architecture/*.md`** — implementation contracts (six files).
7. **`docs/build-log.md`** — the living ledger; every loop reads + writes here.
8. **`/Users/russellteter/Documents/Claude/Projects/Business Planning/C_Suite_PRD.md`** — the locked product spec.
9. **`/Users/russellteter/Documents/Claude/Projects/Business Planning/C_Suite_CLAUDE.md`** — the original build mission brief.

If you are a Russell-initiated task that is not `/goal`, read this file plus whatever is relevant to the task.

## Auto-mode operating override

Russell has explicitly stated: **"I don't need to review anything ever."** This modifies the original ultraplan's gate model. See `DOCTRINE.md` "Operating-mode override." In short:

- Default to "decide and log" — not "ask Russell."
- Hard gates remain only at: (a) on-Mac verification, (b) genuine product-shape forks that would propagate downstream rework, (c) destructive/external actions Russell didn't pre-authorize.
- **GitHub auto-sync is mandatory.** Post-commit hook at `.git/hooks/post-commit` pushes every commit. Do not bypass with `--no-verify` or remove the hook.

## How `/goal` runs

**On "/goal" as a literal command.** Russell will drive the build with an autonomous orchestration command he calls `/goal`. That literal command may be: (a) a custom slash command he installs in `~/.claude/commands/`, (b) the `superpowers:subagent-driven-development` skill pointed at `ROADMAP.md`, (c) the `loop` skill driving a "read doc-set → pick next chapter → execute ritual → update build-log" prompt with self-pacing, or (d) any equivalent autonomous orchestrator. **The doc-set is orchestrator-agnostic.** Throughout this file, "`/goal`" refers to whatever Russell uses as the autonomous driver. The contract below is what any such orchestrator must do — what command name fires it is Russell's choice.

`/goal` runs an autonomous self-correcting loop with hard gates:

```
read ROADMAP + build-log
   → pick next incomplete unit (Phase R first; then chapters in dependency order)
      → run the unit's ritual (spec → build → test → independent audit)
         → update build-log + BLOCKERS + (if reality diverged) the plan itself
            → loop
```

Sequencing law: **prove the catastrophic-risk core early** — deep research → SafeWrite → runtime spine → Verifier rigor — and land a usable end-to-end slice ASAP (Chapter 5).

Definition of done: each chapter is done when Audit/QA marks every acceptance criterion PASS. V1 is done when all eight on-Mac outcome demos pass (`ROADMAP.md` Ch.11). The loop terminates on V1-done or when blocked awaiting a hard gate.

## Doctrine summary (read full version in `DOCTRINE.md`)

1. Truth over the appearance of completion — say UNKNOWN if you don't know.
2. No shortcuts to please — verify before claiming done.
3. Persistence — three approaches before declaring impossible.
4. Cite everything — file path + line, tool result, doc URL.
5. Use the full toolbox — `context7`, `firecrawl`, `github-search`, Russell's skills.
6. Creativity within guardrails — locked principles override.
7. Writer ≠ grader — structural separation.
8. Self-improvement — codify after 3 repeats.
9. Live-corrected learning — update the plan, don't ignore it.
10. Safety & reversibility — no secrets in plaintext, no destructive git.

## Russell's writing rules (apply to every artifact)

- Direct. Specific. Active voice. Start with the answer. End when done.
- No "great question," "you're absolutely right," "let me know if you need anything else."
- No em-dashes as drama. No AI-tells. No hedges. No preambles.
- **No emojis** in code, comments, commits, product copy.
- Cite sources for any factual claim.
- See `~/.claude/rules/stop-slop-writing.md` for the full ruleset.

## Commit + push discipline

- Atomic, narrow, well-described. One concept per commit.
- Format: `<scope>: <what changed> — <why>`. Body for context when useful.
- **No Claude attribution** (`Co-Authored-By: Claude` etc.) — Russell's preference.
- The post-commit hook auto-pushes to `origin/main`. Failures logged to `.git/auto-push.log` — diagnose, don't bypass.

## Tool defaults

- **`context7`** for current library/SDK docs (Electron, Claude Agent SDK, etc.).
- **`firecrawl`** for web search and best-practice research (replaces WebFetch/WebSearch).
- **`github-search`** for code patterns.
- **`Explore` sub-agent** for codebase breadth lookups.
- **`Plan` sub-agent** for multi-step architectural decisions.
- **`html-driven-codev`** for UI mockup gates.
- **`superpowers:test-driven-development`** for feature builds.
- **`superpowers:systematic-debugging`** for bugs.
- **`superpowers:verification-before-completion`** before any "done" claim.

## File paths

| What | Where |
|---|---|
| Repo root (this working dir) | `/Users/russellteter/Claude Code Projects/c-suite/` |
| Vault (read/write target for the product) | `/Users/russellteter/Documents/Claude/Projects/Business Planning/` |
| Source-of-truth PRD | `<vault>/C_Suite_PRD.md` (canonical; B28 polish 2026-05-27 deleted the repo mirror) |
| Build mission brief | `<vault>/C_Suite_CLAUDE.md` (canonical; B28 polish deleted the repo mirror) |
| Install fixtures | `fixtures/skills/` + `fixtures/_extracted_skills_for_c_suite.md` (formerly under `business-planning/`) |
| Doc-set spine (read in order) | `PURPOSE.md`, `DOCTRINE.md`, `ROADMAP.md`, `BLOCKERS.md`, `RESEARCH.md` |
| Architecture specs | `docs/architecture/*.md` |
| Build ledger | `docs/build-log.md` |
| Phase R outputs | `docs/research/*.md` |
| Auto-push log | `.git/auto-push.log` |
| GitHub remote | `https://github.com/russellteter/class-c-suite.git` |

## Note on path with spaces

The repo path contains spaces. In shell commands, quote it: `cd "/Users/russellteter/Claude Code Projects/c-suite"`. In Node/Python code, handle correctly.

## Gotchas

- **ESM extensions:** source imports use `.js` even for `.ts`/`.tsx` files (Node16 ESM). Vite/vitest configs carry a `.js`→`.ts(x)` resolver plugin to compensate.
- **better-sqlite3 ABI:** ~80 vitest "failures" are a native-module ABI mismatch under plain Node — production runs under Electron's ABI where it's fine. Not real failures. `npx vitest` flips the native module to the Node ABI and breaks the app; if you ran it, `pnpm rebuild:electron` before launching.
- **Main runs from `dist/`:** `apps/main` loads `dist/index.js`. After editing `apps/main/src/**`, run `pnpm --filter @c-suite/main build` (tsc, ABI-safe) or the running app uses stale code. The renderer is live via the Vite dev server (HMR) — no rebuild needed.
- **Renderer render paths:** `index.html` wires `src/index.tsx` (not a placeholder); dev loads the Vite dev server on :5273, prod/packaged loads built `dist/index.html` via `loadFile` (`main.ts:90/99`). The dev render path is proven via real-app e2e; the packaged `vite build` path is wired but unexercised.
- **memos untracked by design:** SafeWrite only git-commits zones with `commitVault: true`; the `memo` zone is `commitVault: false` (`apps/utility/src/safewrite/zonePolicy.ts`, ADR-0003 §2). Memo files land on disk but are NOT versioned — expected, not a failure.
- **macOS smoke:** `scripts/mcp-live-smoke.sh` needs `gtimeout` (coreutils); it shims `timeout`/`gtimeout`.
- **Synthesizer is slow, not hung:** a live Synthesizer call legitimately takes 9-17 min — it emits a 30-38KB memo (measured 546s/1027s completions). Don't read synth silence as a stall; the role-aware `RealClaudeClient` timeout (Synth 25m / Verifier 20m / others 8m) covers it. First live grounded+verified memo shipped 2026-05-31: `f617c0ed`, rigor 92 CLEAN. (Follow-up: the 38KB synth is too large — trim for UX.)
- **`runs.started_at` is SECONDS via `unixepoch()`, not ms:** query with `datetime(started_at,'unixepoch','localtime')`; dividing by 1000 yields a bogus 1970 date. Same for `agent_invocations` timestamps.
- **`STUB_MODE` defaults to `live` in the forked utility** (`apps/main/src/supervisor.ts:73`, `?? 'live'`); `CLAUDE_CODE_OAUTH_TOKEN` is loaded from `apps/main/.env.local` by `loadEnv.ts`. The real app runs real inference by default — CI/vitest set `STUB_MODE=replay`. cash_lever still guard-refuses live unless `ALLOW_STUBBED_LIVE=1` only while `cash_model` stays stubbed (`cash-lever/index.ts:396`).
- **`resumeRun` is a skeleton:** it only re-dispatches incomplete lenses from the `fan-out` state (`apps/utility/src/orchestrator/index.ts`); it does NOT drive verifier/ship from a post-synth state, so crash-resume of a near-done run won't finish it.

---

**Source of truth.** When this file and the source PRD/CLAUDE.md disagree, the source documents win. This file is the operating runbook; the source documents are the spec.
