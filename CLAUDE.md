# CLAUDE.md — Project Instructions (C-Suite)

> Project-level instructions for Claude Code working in this repo. Loaded automatically at session start in addition to `~/.claude/CLAUDE.md`.

## What this project is

The C-Suite: a single-user macOS menubar application that operationalizes Russell Teter's Strategic AI Operating Model. The complete product spec is `business-planning/C_Suite_PRD.md`. The original build mission brief is `business-planning/C_Suite_CLAUDE.md`. Both are the source of truth; this file is the operating runbook.

## Read order at session start

If you are `/goal` or any sub-agent of `/goal`, read these in order before any action:

1. **`PURPOSE.md`** — the why and the 8 V1 outcomes.
2. **`DOCTRINE.md`** — operating laws. **Non-negotiable.**
3. **`ROADMAP.md`** — chapter sequence + gates + exit criteria.
4. **`BLOCKERS.md`** — what could kill the build; check current status before each chapter.
5. **`RESEARCH.md`** — the Phase R protocol; run this before any chapter is coded.
6. **`docs/architecture/*.md`** — implementation contracts (six files).
7. **`docs/build-log.md`** — the living ledger; every loop reads + writes here.
8. **`business-planning/C_Suite_PRD.md`** — the locked product spec.
9. **`business-planning/C_Suite_CLAUDE.md`** — the original build mission brief.

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
| Source-of-truth PRD | `business-planning/C_Suite_PRD.md` (mirror in this repo) |
| Build mission brief | `business-planning/C_Suite_CLAUDE.md` (mirror) |
| Doc-set spine (read in order) | `PURPOSE.md`, `DOCTRINE.md`, `ROADMAP.md`, `BLOCKERS.md`, `RESEARCH.md` |
| Architecture specs | `docs/architecture/*.md` |
| Build ledger | `docs/build-log.md` |
| Phase R outputs | `docs/research/*.md` |
| Auto-push log | `.git/auto-push.log` |
| GitHub remote | `https://github.com/russellteter/class-c-suite.git` |

## Note on path with spaces

The repo path contains spaces. In shell commands, quote it: `cd "/Users/russellteter/Claude Code Projects/c-suite"`. In Node/Python code, handle correctly.

---

**Source of truth.** When this file and the source PRD/CLAUDE.md disagree, the source documents win. This file is the operating runbook; the source documents are the spec.
