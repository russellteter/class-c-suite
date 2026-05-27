# /goal Prompt v1 — Phase R through First End-to-End Slice (Ch.5)

> Copy the block below verbatim into a fresh Claude Code session at `/Users/russellteter/Claude Code Projects/c-suite/`. Pair with **auto-mode ON** (`/auto` or settings) so per-tool approvals don't break the loop. Per `~/.claude/CLAUDE.md`, `/goal` requires Claude Code v2.1.139+, workspace trust accepted, hooks not disabled.
>
> **Scope.** Phase R + Chapters 0-5. Lands a working Cash-lever playbook producing a sourced rigor-scored memo in the vault — the "First usable product" milestone per `ROADMAP.md` §sequencing-law. Estimated 100-300 turns. Bounded at 300 turns with progress report. After Ch.5 closes, run `/goal` again with the [Ch.6+ prompt](#future-goal-prompts) for write-backs + remaining chapters.
>
> **Why this scope (not "ship V1").** Haiku evaluates the condition vs the transcript every turn. A condition like "V1 ships" requires Haiku to judge eight on-Mac demos it can't run — too distant. Per-unit "COMPLETE" reports the orchestrator emits as it goes are transcript-evaluable. Ch.5 is also a natural Russell-review boundary (first time the product actually works).

---

## The prompt — copy from here

```
/goal You are the autonomous build orchestrator for the C-Suite at /Users/russellteter/Claude Code Projects/c-suite — Russell Teter's single-user macOS Electron menubar app that operationalizes his Strategic AI Operating Model. Russell has pre-authorized full autonomy under DOCTRINE.md ("I don't need to review anything ever") and GitHub auto-sync via the tracked hooks/post-commit hook.

BOOTSTRAP (first turn, in order):
1. Read PURPOSE.md, DOCTRINE.md, ROADMAP.md, BLOCKERS.md, RESEARCH.md, CLAUDE.md.
2. Read docs/architecture/{runtime,data,mcp,ui,prompts,delivery}.md and docs/agents/dispatch-templates.md.
3. Read docs/research/R1-connector-reality.md (Salesforce + NetSuite already verified live).
4. Read docs/build-log.md, .claude/project-state.json, tasks/handoff.md to load prior state.
5. Run ./scripts/preflight.sh. Fix any FAIL before proceeding (warns are OK).

LOOP:
- Pick next incomplete unit from ROADMAP.md (Phase R first; then Ch.0-5 in dependency order).
- Run the per-chapter ritual from docs/architecture/delivery.md: SPEC (ADR via docs/decisions/ template) → [design gate via html-driven-codev for UI screens] → parallel build (sub-agents per docs/agents/dispatch-templates.md; ≤3 concurrent; Sonnet default, Opus only for architecture-across-many-files) → integrate → test against stub-harness (zero live inference in CI) → independent Audit/QA (NEVER the same sub-agent that built) → docs → atomic commits (auto-pushed).
- After EVERY unit closes, EMIT explicitly in chat: "[UNIT-NAME] COMPLETE: build-log entry at <path>; Audit/QA verdict PASS; <one-line summary>." The Haiku evaluator reads these reports — without them, completion is invisible.
- Update docs/build-log.md, .claude/project-state.json, BLOCKERS.md at every unit boundary.
- For Phase R: dispatch parallel research sub-agents per RESEARCH.md (R0-Spine, R0-Vault, R0-Skills, R0-Code, R1-Connectors-remaining, R2-Adversarial). Resolve the 10 additional Phase 0 decisions from business-planning/C_Suite_CLAUDE.md §2. Send the NetSuite TBA request to Brian early via scripts/send-tba-request.md.
- DECIDE-AND-LOG for any ambiguity that isn't a hard gate (DOCTRINE operating-mode override).

HARD GATES (only these pause the loop; everything else: decide-and-log):
1. Ch.11 on-Mac demos — surface to Russell; cloud cannot run menubar/hotkey/notification/sleep-wake/notarized-DMG verification. NOT in this /goal's scope.
2. Genuine product-shape forks that would propagate downstream rework — use html-driven-codev for UI mockups (ui.md §12-step); otherwise decide-and-log.
3. Destructive / external actions not pre-authorized — no force-push to main, no hard reset, no comms on Russell's behalf.

COMPLETION CONDITION (Haiku judges from THIS transcript):
Goal MET when transcript contains explicit "[UNIT] COMPLETE" reports for ALL of:
(a) Phase R — citing each of the 8 RESEARCH.md §phase-r-exit-gate criteria as MET.
(b) Chapter 0 (Foundations) — typecheck/lint/CI green with zero live inference.
(c) Chapter 1 (Process / IPC / SQLite / Scheduler) — IPC round-trip + supervised utilityProcess restart + scheduler caps + idempotent migrations.
(d) Chapter 2 (SafeWrite + git) — specifically including "concurrent-write fuzz: zero data loss verified" and "one sidecar per conflict."
(e) Chapter 3 (Runtime spine) — specifically "lens isolation proven (assertion throws on cross-lens leak)" and "Verifier input contract assembler fails closed when any input missing."
(f) Chapter 4 (Prompts + rigor + Verifier) — specifically "planted-claim canary test PASS (Verifier flags unsourced quantitative claim)" and "12-case rigor formula table PASS."
(g) Chapter 5 (first E2E slice — Cash lever playbook) — specifically "real run produced rigor-scored memo in vault via SafeWrite; click-any-claim → tool-call-result verified."
(h) Final transcript turn shows `tail -5 .git/auto-push.log` output with all recent commits "push OK."

OR stop after 300 turns and emit a punch list (units done, units in-progress, blockers added/upgraded, recommended next /goal scope).

CRITICAL CONSTRAINTS (Audit/QA REOPENs any chapter violating these):
- PRD §5 (12 design principles) + PRD §6 (product surface) — non-negotiable.
- Vault SafeWrite mandatory for shared zones (positions/decisions/workstreams/stakeholders/pre-mortems).
- Writer ≠ grader structural separation (DOCTRINE #7) — Audit/QA dispatched as separate sub-agent.
- Verifier MUST be blind to lens reasoning traces (BLOCKERS B3 — canary fixture at tests/fixtures/canary-memo.md is the permanent regression guard).
- No secrets in plaintext; safeStorage only (DOCTRINE #10).
- Auto-push hook must keep firing — if .git/auto-push.log shows FAILED, diagnose root cause immediately.
- DOCTRINE law #9: reality contradicting the plan → UPDATE the plan + BLOCKERS; never plow ahead on stale premise.
- BLOCKERS B19/B20: real Salesforce stage labels + Renewal_Anniversary_Date__c field — typed SOQL builders use the verified-live values per docs/research/R1-connector-reality.md, NOT the original spec assumptions.

If interrupted (Ctrl+C / /goal clear / session close), next /goal resumes from .claude/project-state.json + docs/build-log.md without re-doing completed work.
```

## Future /goal prompts

Once Ch.5 ships clean (Russell verifies the first usable memo), run `/goal` again with scope **Ch.6 through Ch.10** (write-backs + all playbooks + MCPs + Cowork handoff + autonomy). A separate prompt file `scripts/goal-prompt-v2.md` will be written during the Ch.5 close-out commit by the orchestrator. The final `/goal` for **Ch.11** (packaging + the 8 on-Mac demos) requires Russell to run the demos in person — that one stops at the hard gate.

## Sanity checks before pasting

| Check | How |
|---|---|
| Auto-mode is ON | Look for the auto-mode indicator; if not, `/auto` to toggle |
| In the right working dir | `pwd` should print `/Users/russellteter/Claude Code Projects/c-suite` |
| Workspace trust accepted | First-time-in-this-folder dialog handled |
| Hooks not disabled | `settings.json` doesn't set `disableAllHooks` |
| Preflight green | `./scripts/preflight.sh` returns OK (or only WARNs) |
| Skills installed | `russell-voice`, `class-brand-voice`, `weekly-cash-forecast`, `covenant-tracker`, `renewal-forecast`, `call-intelligence`, `system-check`, `class-aws-connector`, `run-critique` all show in Skill tool listing |
| Auto-push working | `tail -3 .git/auto-push.log` shows recent `push OK` |

## If something goes wrong

- `/goal` (no args) — show current status: condition, time elapsed, turns, evaluator's last reason.
- `/goal clear` — cancel the active goal without ending the session.
- Ctrl+C — interrupt the current turn (the goal stays active; next turn resumes the loop unless you clear).
- `--resume <session-id>` reload — the goal carries over (per `/goal` docs); counters reset.

## Why this prompt is shaped the way it is

- **Bootstrap reads ARE explicit** so a fresh-session Claude has zero context drift from the doc-set scaffold.
- **The "[UNIT] COMPLETE" emit pattern** is critical — Haiku CAN'T inspect the filesystem to verify chapter completion, only what's in the transcript. The orchestrator's own explicit completion reports are the evidence.
- **The 8 listed sub-conditions** (a)-(h) are each transcript-evaluable. None require Haiku to "go look at" anything outside the conversation.
- **Hard gates are minimized** to honor Russell's "no review" override while preserving the three boundaries the cloud genuinely can't cross.
- **Critical constraints surface the keystone safety invariants** (SafeWrite, Verifier isolation, canary, secrets, auto-push, plan-reality reconciliation). Audit/QA reopens any chapter that violates them.
- **The B19/B20 callouts** prevent the orchestrator from regenerating obsolete-spec SOQL queries — these are the corrections that came out of yesterday's live verification.
- **300-turn cap** is conservative-aggressive: enough room to land Ch.5 even with hiccups; not so much that a runaway burns days unnoticed.
