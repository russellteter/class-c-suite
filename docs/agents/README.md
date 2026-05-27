# Sub-Agent Dispatch Templates

This directory holds **prompt templates** the orchestrator (`/goal` or equivalent) copies and customizes when dispatching sub-agents per chapter. Templates bake in:

- The `DOCTRINE.md` preamble (10 laws).
- Output-format expectations (structured summary with citations, not raw transcript).
- Role-specific responsibilities + handoff format.
- Recommended `Agent({subagent_type: ...})` mapping where a global agent fits the role.

## Usage

When dispatching a sub-agent:

1. Open `dispatch-templates.md`.
2. Copy the section for the role (Architect, Front-end, Audit/QA, etc.).
3. Fill in chapter-specific context (the SPEC, the acceptance criteria, the file list).
4. Pass as the `prompt` argument to the Agent tool, with `subagent_type` per the template's recommendation.
5. **Writer ≠ grader (DOCTRINE law #7):** the Audit/QA sub-agent must NEVER be the same as the builder for that chapter. Dispatch separately, with no shared context beyond the spec and the artifact under review.

## Default model

**Sonnet 4.6 unless otherwise noted.** Per `~/.claude/CLAUDE.md`: subagents default to Sonnet (~3-5× cheaper than Opus; quality gap negligible for TDD-bounded work). Opus 4.7 only for: Architect across many files, ambiguous multi-step decomposition, Verifier production runs.

## File

- [`dispatch-templates.md`](./dispatch-templates.md) — all 9 role templates.
