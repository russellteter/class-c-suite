# Ch.6 Design Gate — APPROVED

**Submitted:** 2026-05-27T17:55:44Z
**Run-id at approval:** r-2026-05-27-cash-lever-a4f9

## Variant picks

| Screen | Variant | Notes |
|---|---|---|
| WritebackPane | **A** (dense list) | 3 refinements — see §1 below |
| ConversationPane | **A** (linear timeline) | none |
| AcceptedHistory | **A** (collapsed list, expand-to-diff) | none |

## §1 WritebackPane refinements (Russell-requested, locked)

1. **Topic / Category column.** Each row carries a broader topic so Russell can scan + sort by domain (not only by artifact-type). Topic derived in this priority order: (a) `linked-workstreams[0]` workstream title if present; (b) playbook-derived label (e.g. cash_lever → "Cash"; gtm_reallocation → "GTM"); (c) "General." Render as a pill in a new column between Artifact-Type and Description.
2. **Row-expand-on-click.** Each row is collapsed by default to a single line; clicking the row (or an explicit chevron at the right edge) expands inline to show: full description + inline diff preview (first 12 lines, monospace, +/- color-coded) + lenses-contributing pills + "Open full conversation" link. Re-clicking collapses. Multiple rows can be expanded simultaneously.
3. **Smaller description font.** Description column uses `--text-xs` (11px) instead of `--text-sm` (13px) so more characters fit before truncation. Adjust line-height to `--leading-tight` (1.25) to keep vertical density.

## §2 Contract deltas (ADR-0008 amended, §10 added — see commit)

- Add `topic: string` to `WritebackDraftSchema` (Zod) so the runtime computes once and the renderer never re-derives.
- Runtime drafters populate `topic` from the priority above.
- Renderer adds a `Topic` column + the expand affordance + reduced description font.

## §3 What happens next

Orchestrator dispatches three parallel build sub-agents (Runtime + Renderer + Dev-Script) against the briefs at `tasks/ch6-*-brief.md`. Each brief now references this APPROVED.md for variant-specific implementation details.
