# Phase 0 Kickoff Prompt for Claude Code

**Use:** Paste this verbatim into a new Claude Code session at the start of the build. It's self-contained — Claude Code reads it, opens the right files, and runs Phase 0 without further prompting from Russell until it returns with an architecture proposal.

---

## The prompt to paste

```
You're Claude Code. I'm Russell Teter. You're the primary builder of a personal
desktop application called the C-Suite. Before writing a single
line of code, you run a structured discovery and planning phase.

Start here, in this order:

1. Read this file end to end:
   /Users/russellteter/Documents/Claude/Projects/Business Planning/C_Suite_PRD.md

   This is the product specification. Locked design decisions are in §5
   (non-negotiable principles) and §7 (locked/open/out-of-scope boundary).
   Outcome-based completion criteria are in §4. Required context is in §10.

2. Read this file end to end:
   /Users/russellteter/Documents/Claude/Projects/Business Planning/C_Suite_CLAUDE.md

   This is your mission brief. §2 defines the two-phase mandate — Phase 0 is
   yours to run, Phase 1 is build after I approve your architecture proposal.
   §3 lists what's locked vs. what's yours to decide. §4 lists my operating
   disciplines. §5 specifies when to engage me vs. when to decide on your own.
   §6 is the map of institutional context you need to internalize.

3. Read the institutional context listed in PRD §10 and CLAUDE.md §6 — the
   Strategic AI Operating Model documents, the existing positions/decisions/
   workstreams/pre-mortems/stakeholders artifacts, my auto-memory directory at
   /Users/russellteter/Library/Application Support/Claude/local-agent-mode-sessions/.../memory/MEMORY.md
   and its linked files. You cannot design over this corpus without
   internalizing what's there. Glob the operating-model artifact directories
   (positions/, decisions/, workstreams/, stakeholders/, pre-mortems/,
   calibration/, adversarial/, investigations/, deliverables/) so you see
   what actually exists, not just the index files.

4. Run Phase 0 per CLAUDE.md §2. Five parallel research tracks (institutional
   context, Claude Agent SDK current state + auth + billing, process and UI
   architecture, Obsidian and concurrent-edit safety, MCP wiring per service).
   Ten additional design decisions to resolve. Explicit exit criteria for
   each track. Use sub-agents where it accelerates the work. Pull live
   information from the web — the technology landscape moves; don't rely on
   what you knew from training.

5. Do not start writing code. Do not propose a specific stack until you've
   actually investigated the current SDK state. Do not assume the
   prescriptions in the operating-model history are current — they were
   first-pass guesses and may be stale. The decisions are yours to make
   through your own investigation, bounded by the locked design principles
   in the PRD.

6. When you have substantive questions for me during Phase 0, use the
   structured AskUserQuestion pattern: one question per round by default,
   2-4 multiple-choice options, recommended option labeled, with explicit
   trade-offs in each option's description. Tool, not text. Never list
   questions as prose bullets for me to answer in prose.

7. Operating disciplines from CLAUDE.md §4 apply during discovery too:
   - Direct, no hedge, no AI-tells, no preambles that restate the question.
   - Cite sources for every factual claim in the architecture proposal.
   - Confirm before expensive actions.
   - Surgical edits, never rebuilds.
   - Verify before claiming done.

8. The goal is clear: PRD §4 has seven outcome-based "done" criteria. The
   build is done when those outcomes are demonstrably true, not when a task
   list is checked off. Your development plan should sequence work against
   those outcomes.

When Phase 0 is complete and all exit criteria are met, return to me with:
(a) your architecture proposal, with rationale for each major decision and
notes on what you considered and rejected, and
(b) your development plan, with sequencing tied to PRD §4 outcomes, honest
effort estimates, top risks, and mitigations.

I approve, edit, or send you back for more discovery. Only then do you start
Phase 1.

Confirm you've read both docs and are starting Phase 0. Then go.
```

---

## Notes for Russell

**When to paste:** When you open the new Claude Code session in `/Users/russellteter/Claude Code Projects/c-suite/`. (The `c-suite/` subdirectory needs to exist before you start — `mkdir "/Users/russellteter/Claude Code Projects/c-suite"`. The parent `Claude Code Projects/` already exists alongside your other Claude Code work including `customer-dashboard-poc`. Note the space in the path — quote it in shell commands.)

**What to expect after paste:** Claude Code will likely confirm the docs are read, then either start Phase 0 directly or ask a 1-2 clarifying questions if anything in the docs is ambiguous. Phase 0 will probably take 4-8 hours of Claude Code's compute time (parallel sub-agents on the five tracks plus the ten decisions). Don't expect to see architecture proposal + dev plan immediately — give it space to actually investigate.

**Watch for:** Claude Code skipping ahead and proposing code before it has run Phase 0 completely. If you see scaffolding commands, stop and remind it that the exit criteria in CLAUDE.md aren't met.

**Don't:** paste this into Claude.ai or Cowork. It's specifically structured for Claude Code's environment with full filesystem access.

**Vault git init:** before Claude Code starts writing to the vault, manually run `cd "/Users/russellteter/Documents/Claude/Projects/Business Planning" && git init` if you haven't already. This is the precondition for the auto-commit-on-write principle in PRD §5.

---

*Phase 0 kickoff prompt locked 2026-05-26.*
