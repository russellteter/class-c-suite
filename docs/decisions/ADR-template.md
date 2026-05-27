# ADR-NNNN: <Short Title>

> Architecture Decision Record template. Copy to `ADR-NNNN-<kebab-slug>.md` (next sequential number) when documenting a non-trivial architectural decision. One ADR per chapter at minimum (the chapter's SPEC step writes it); additional ADRs per significant in-chapter decision.

## Status

`proposed` | `accepted` | `superseded by ADR-NNNN` | `deprecated`

## Date

YYYY-MM-DD

## Context

What's the situation? What forces are at play? Which `BLOCKERS.md` items, `ROADMAP.md` chapters, `PURPOSE.md` outcomes, or PRD §5 locked principles bear on this decision? Cite specifically.

## Decision

What did we decide? One paragraph maximum. If the decision is "use X with parameter Y," say that exactly.

## Rationale

Why this and not the alternatives? Reference DOCTRINE laws if they applied (e.g. "DOCTRINE law #6: creativity within guardrails — option B would have crossed a locked principle"). Cite tool results, `context7` docs, `firecrawl` research, BLOCKERS verification, or code as warrants.

## Considered options

Bullet list. For each: what it would have done, what made it worse than the chosen option.

- **Option A** (chosen) — <one line> — chosen because <reason>.
- **Option B** — <one line> — rejected because <reason>.
- **Option C** — <one line> — rejected because <reason>.

## Consequences

What flows from this decision?

- Positive: <load-bearing improvements>
- Negative / costs: <what got worse or harder>
- Follow-up work: <new tasks, blockers added, plan amendments>
- Reversibility: low | medium | high — and what it'd take to reverse if we needed to.

## Affected artifacts

- `<file>` — <what changed>
- `<file>` — <what changed>
- Related ADRs: ADR-NNNN

## Tripwires

What would tell us this decision was wrong? Specific signals:
- `<observable signal>` → revisit this ADR.
- `<observable signal>` → revisit this ADR.

---

**Author / agent role:** (Architect / Runtime / Front-end / etc.)
**Reviewed by Audit/QA in chapter ritual step 6:** YYYY-MM-DD
