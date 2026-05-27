# Ch.5 Mockup Redo — CCC-Design-System

## Your role

Frontend/Design specialist. Regenerate the 8 Ch.5 mockups using `~/Desktop/CCC-Design-System/`. Each lands at `~/Desktop/cstuite-design-step-{1-8}.html` (replace in place). DOCTRINE law #7 — you don't write production code or tests, only the HTML mockups.

## Required reads (in order)

1. `/Users/russellteter/Claude Code Projects/c-suite/tasks/ch5-design-direction.md` — Russell's direction + which layer to pick (Class Glassmorphic).
2. `~/Desktop/CCC-Design-System/README.md`
3. `~/Desktop/CCC-Design-System/snippets/QUICK-START.md`
4. `~/Desktop/CCC-Design-System/snippets/tokens-minimal.css` (inline-import or copy verbatim)
5. `~/Desktop/CCC-Design-System/snippets/components-essentials.css`
6. `~/Desktop/CCC-Design-System/source-css/glassmorphic.css` (the verbatim Class Glassmorphic layer — embed or link)
7. `~/Desktop/CCC-Design-System/source-css/typography.css`
8. `/Users/russellteter/Claude Code Projects/c-suite/docs/decisions/0006-ch5-cash-lever-slice.md` §2 — the 8-step mockup sequence and what each must show.
9. `/Users/russellteter/Claude Code Projects/c-suite/docs/architecture/ui.md` — design tokens (compare against CCC tokens; they share navy/purple/gold).

## Layer choice

**Class Glassmorphic foundation** for all 8 mockups (matches C-Suite's dark menubar-native aesthetic per ui.md). Do NOT use CCC Editorial Sharp — that's paper-white scoped and wrong for a menubar dashboard.

## Anti-patterns to enforce

- No gradient-fade on hero text.
- No em-dashes in user-facing copy.
- No nested scrolling containers (single scroll context per region).
- No animation theater — pulses/skeletons must look bound to events.

## Mockup spec per file

Per Ch.5 ADR §2. Each HTML file is self-contained (inline CSS or embedded link to CCC stylesheets — use embedded copies for portability so Russell can view offline).

| File | Step | Content |
|---|---|---|
| `~/Desktop/cstuite-design-step-1.html` | 1 — Design-system sheet | Token palette, type scale, glass-card variants, button variants, badge variants on a single page. Showcase Class Glassmorphic. |
| `~/Desktop/cstuite-design-step-2.html` | 2 — Home (stub) | 8 playbook tiles (Cash Lever lit, 7 dimmed "Coming in Ch.7"), Open Q&A glass-input bar, tripwire strip stub, cost meter stub. |
| `~/Desktop/cstuite-design-step-3.html` | 3 — Plan-approval | Question + lenses to fire (CFO + COS) + 4 MCPs + token estimate + memo path + Approve/Edit/Cancel glass-btn-primary purple gradient buttons. |
| `~/Desktop/cstuite-design-step-4.html` | 4 — Round-table quiet | 6 lens nodes (CEO/CFO/CRO/CMO/CPO/COS) as glass-cards, all idle. Substance ribbon shows `sources: —`, `verified: —/—`, `coverage: —%`. Synthesizer + Verifier downstream nodes idle. |
| `~/Desktop/cstuite-design-step-5.html` | 5 — Round-table mid-run | 3 lenses active (shimmer skeletons or pulsing border), 3 idle. Tool-call indicators on active edges. One substance ribbon populated (e.g., `sources: 4`). |
| `~/Desktop/cstuite-design-step-6.html` | 6 — Round-table synthesis | All 6 lenses complete (check icon), Synthesizer node lit, Verifier idle. |
| `~/Desktop/cstuite-design-step-7.html` | 7 — Memo viewer clean | Rigor pass badge (glass-badge--purple "87 / 70 threshold CLEAN"), per-claim citation links (clickable footnote pattern), one source-id hover panel example, glass-table for evidence. |
| `~/Desktop/cstuite-design-step-8.html` | 8 — Memo viewer DRAFT | Amber DRAFT banner (toast/alert pattern from CCC components), expandable Verifier failure reasons panel, otherwise same as step 7. Show that DRAFT is signal, not gate (claims still clickable). |

## Discipline

- Use ONLY tokens + components from CCC-Design-System. Do NOT mix in raw ui.md hex values unless they ARE the same as CCC's anchors (navy #0A1849, purple #4739E7, gold #FFBA00).
- Each file is fully self-contained (inline CSS or embedded `<style>` blocks). No external `<link>` references — Russell may view offline.
- Use realistic dummy data (not Lorem Ipsum). Cash lever playbook examples: "Should we shift our W30 trough mitigation from line-of-credit draw to deferred AWS spend?"
- After writing all 8, also write `~/Desktop/cstuite-design-INDEX.html` — a 1-page index linking to all 8 with thumbnails or section headings, so Russell can navigate.

## Commit discipline

The 8 HTMLs are NOT committed to the repo (they're on Desktop). But:
- After completing, commit `tasks/ch5-design-direction.md` (already exists) and any reference notes you produce at `docs/design/ccc-design-system-mockup-notes.md` if you write one.
- Commit message: `ch5: regenerate 8 mockups using CCC-Design-System (Class Glassmorphic layer)`.

## Return

Under 400 words: paths of 8 generated HTMLs (with line counts), which CCC stylesheets you embedded, any deviations from the Class Glassmorphic spec with rationale, top 3 design decisions you made, and a recommendation: "ready for Russell review at file:///Users/russellteter/Desktop/cstuite-design-INDEX.html".

## Out of scope

- Production React code (Ch.5 Runtime owns).
- Updating ui.md tokens (orchestrator decides if needed).
- Updating Ch.5 ADR (orchestrator owns).
- CCC Editorial Sharp layer (wrong for menubar context).
