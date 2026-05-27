# The C-Suite

> A single-user macOS menubar application that operationalizes Russell Teter's Strategic AI Operating Model. The brain works in Cowork today; this is the body.

## Status

**Build phase: pre-execution.** The doc-set and architecture specs are committed. The next action is `/goal` running Phase R (deep research) before any production code is written. See `ROADMAP.md`.

## What's in this repo

```
c-suite/
├── PURPOSE.md          ← the why; the 8 V1 outcomes
├── DOCTRINE.md         ← operating laws (non-negotiable)
├── ROADMAP.md          ← chapter sequence + gates + exit criteria
├── BLOCKERS.md         ← living blocker register
├── RESEARCH.md         ← Phase R deep-research protocol
├── CLAUDE.md           ← project-level instructions for Claude Code
├── README.md           ← (this file)
├── fixtures/           ← install fixtures (skill bodies + extracted-skills snapshot)
│   ├── _extracted_skills_for_c_suite.md
│   └── skills/         ← 6 operating-logic skill bodies (full-text, for installer)
└── docs/
    ├── architecture/   ← six implementation-grade specs
    │   ├── runtime.md
    │   ├── data.md
    │   ├── mcp.md
    │   ├── ui.md
    │   ├── prompts.md
    │   └── delivery.md
    ├── research/       ← Phase R outputs (created during /goal Phase R)
    └── build-log.md    ← per-loop ledger
```

## How to drive the build

1. **Read** `PURPOSE.md` to understand what we're building and why.
2. **Install hooks (fresh clones only):** `./scripts/install-hooks.sh` — enables the tracked auto-push hook at `hooks/post-commit`. Idempotent.
3. **Run pre-flight:** `./scripts/preflight.sh` — verifies vault path / git-init / iCloud-sync / tools / skills / hooks / remote. Exits non-zero on blockers. Run BEFORE the orchestrator so Phase R doesn't waste hours discovering environment problems. Add `--fix-hooks` to auto-install the post-commit hook.
4. **Run the orchestrator.** Russell drives the build with what he calls `/goal`. That literal command may be:
   - **(Recommended for V1)** Use the `loop` skill in self-paced mode against a canonical "execute next unit" prompt that points at this doc-set. One-liner:

     ```
     /loop Read CLAUDE.md and follow the §"How /goal runs" loop contract.
     Pick the next incomplete unit from ROADMAP.md (Phase R first, then chapters in
     dependency order). Run the unit's ritual per docs/architecture/delivery.md
     §per-chapter-ritual. Use docs/agents/dispatch-templates.md to dispatch sub-agents.
     Update docs/build-log.md + BLOCKERS.md + .claude/project-state.json at every
     transition. Stop when V1-done or at a hard gate per DOCTRINE.md §operating-mode-override.
     ```

   - **Alternative:** `superpowers:subagent-driven-development` pointed at `ROADMAP.md`.
   - **Alternative:** a custom slash command at `~/.claude/commands/goal.md` you write to wrap the loop above.

   The doc-set is orchestrator-agnostic — whatever drives it must read `PURPOSE.md → DOCTRINE.md → ROADMAP.md → BLOCKERS.md → RESEARCH.md`, run Phase R first, then iterate chapters per `docs/architecture/delivery.md`.
5. **Use `/agents`** to see active sub-agents and their status.
6. **Use `/ultrareview`** for a multi-agent review of the work-in-progress branch (Russell's general highest-level review command).

## Operating mode

Russell has stated: "I don't need to review anything ever." The orchestrator operates autonomously under `DOCTRINE.md`. Hard gates remain only at:
- On-Mac verification (cloud cannot self-verify menubar / hotkey / notifications / sleep-wake survival).
- Genuine product-shape forks where downstream rework would otherwise propagate.
- Destructive or external actions not pre-authorized.

**GitHub auto-sync is mandatory.** Every commit pushes to `origin/main` via the tracked post-commit hook at `hooks/post-commit`. The repo's `core.hooksPath` is set to `hooks` so the tracked file is canonical (survives fresh clones once `./scripts/install-hooks.sh` runs once). Failures log to `.git/auto-push.log` — diagnose, do not bypass.

## The eight V1 outcomes (from PRD §4)

V1 ships when these are demonstrably true through actual use:

1. Russell opens the C-Suite instead of Cowork for strategic investigations.
2. Every memo carries a rigor score + traceable evidence chain (click any claim → tool-call result).
3. The compounding loop runs visibly — proposed write-backs surface; Russell accepts/edits/rejects/iterates; library grows.
4. Vault is canonical and concurrent-edit safe (Obsidian + C-Suite + Cowork same files, no data loss).
5. Autonomy runs unattended (5 scheduled jobs migrate from Cowork).
6. Product feels native (menubar, hotkey, notifications, sleep-wake survival).
7. Cowork `/deep` remains usable as fallback.
8. Decisions hand off to execution via "Draw up for Cowork."

## License

Private. Russell-only. Not for distribution.
