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
├── business-planning/  ← mirror of the source-of-truth PRD/CLAUDE/operating model
│   ├── C_Suite_PRD.md
│   ├── C_Suite_CLAUDE.md
│   ├── Strategic_AI_Operating_Model.md
│   ├── (... full institutional context corpus ...)
│   ├── positions/  decisions/  workstreams/  stakeholders/
│   ├── pre-mortems/  calibration/  adversarial/  investigations/
│   └── deliverables/
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
2. **Run `/goal`** — it reads the doc-set, runs Phase R, then chapters in dependency order, looping until V1-done or a hard gate.
3. **Use `/agents`** to see what sub-agents `/goal` has dispatched and their status.
4. **Use `/ultrareview`** when you want a multi-agent review of the work-in-progress branch (Russell's general highest-level review command).

## Operating mode

Russell has stated: "I don't need to review anything ever." `/goal` operates autonomously under `DOCTRINE.md`. Hard gates remain only at:
- On-Mac verification (cloud cannot self-verify menubar / hotkey / notifications / sleep-wake survival).
- Genuine product-shape forks where downstream rework would otherwise propagate.
- Destructive or external actions not pre-authorized.

GitHub auto-sync is mandatory — every commit pushes to `origin/main` via a post-commit hook.

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
