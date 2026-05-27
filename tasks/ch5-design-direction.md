# Ch.5 Design Direction — Use CCC-Design-System (Russell's Mac, 2026-05-27)

## Source

`~/Desktop/CCC-Design-System/` — Russell's documented internal design system extracted from Campaign Intelligence Tool / Campaign Command Center / Contact Enrichment frontend.

## Direction (Russell, 2026-05-27)

The Ch.5 mockups previously generated at `~/Desktop/cstuite-design-step-{1-8}.html` use the navy/gold/purple tokens from `docs/architecture/ui.md` but DO NOT follow the CCC-Design-System patterns. Russell wants the 8 mockups remade using **the CCC-Design-System** as the design language.

## Which layer to use

CCC-Design-System ships **two coexisting layers**:

1. **Class Glassmorphic** (`source-css/glassmorphic.css` + `source-css/typography.css`) — soft purple-tinted glass, rounded radii (8/12/16px), shimmer skeletons, `backdrop-filter: blur(12px)`, gentle shadows. Used app-wide.
2. **CCC Editorial Sharp** (`source-css/ccc-scoped.css`, scoped under `.ccc-root`) — paper-white surfaces, sharp 2-4px corners, navy header with purple→gold gradient accent strip, monospaced eyebrow labels with `0.14em` tracking, fractal-noise SVG overlay for editorial texture.

**For C-Suite, pick Class Glassmorphic as the foundation.** It matches the C-Suite's locked aesthetic (per `docs/architecture/ui.md` line 8: "Dark menubar-native aesthetic. The C-Suite lives in macOS Sequoia 15.x+ menubar"). The glass-card hover lift + purple gradient buttons + purple-tinted glass surfaces fit a dark menubar resident.

CCC Editorial Sharp can be used **only** if a specific screen wants the paper-white editorial feel — but the home screen, plan-approval, round-table, and memo viewer should all be Class Glassmorphic.

## Required reads (for any agent regenerating the mockups)

1. `~/Desktop/CCC-Design-System/README.md` — system overview + which layer to pick.
2. `~/Desktop/CCC-Design-System/01-tokens.md` — colors, type, spacing, radius, shadow, motion tokens.
3. `~/Desktop/CCC-Design-System/02-typography.md` — type scale + tracking + font-feature-settings.
4. `~/Desktop/CCC-Design-System/03-components.md` — button, badge, KPI strip, sub-card, tabs, breadcrumb, toast, table patterns.
5. `~/Desktop/CCC-Design-System/04-layout.md` — app shell + grid + responsive breakpoints + **the drill-in scroll lesson** (no nested scrolling containers).
6. `~/Desktop/CCC-Design-System/05-motion.md` — transitions, easing, hover lifts, shimmer, phase pulse, reduced-motion.
7. `~/Desktop/CCC-Design-System/snippets/QUICK-START.md` — 5-minute port guide.
8. `~/Desktop/CCC-Design-System/snippets/tokens-minimal.css` — drop-in CSS variable block.
9. `~/Desktop/CCC-Design-System/snippets/components-essentials.css` — drop-in essential component classes.
10. `~/Desktop/CCC-Design-System/source-css/glassmorphic.css` — the verbatim Class Glassmorphic stylesheet to embed in mockups.
11. `~/Desktop/CCC-Design-System/source-css/typography.css` — verbatim body + heading type styles.

## Anti-patterns to enforce in the mockups (from CCC-Design-System README)

- **Do not gradient-fade hero text** — banned brand guidance.
- **Do not use em-dashes in user-facing copy** — use commas or periods.
- **Do not nest two scrolling containers** — one scroll context per region.

## What needs to be regenerated

The 8 mockups at `~/Desktop/cstuite-design-step-{1-8}.html` per the Ch.5 ADR §2 sequence:

1. Design-system sheet (token palette + components on one page) — **showcase Class Glassmorphic**
2. Home (stub) — 8 playbook tiles + Open Q&A bar + tripwire strip — **use `.glass-card` tiles + glass-input for Open Q&A**
3. Plan-approval — Approve/Edit/Cancel layout — **glass-card form with glass-btn-primary purple gradient**
4. Round-table — quiet state — 6 lens nodes idle + substance ribbon empty — **glass-card per node**
5. Round-table — mid-run — 3 lenses active, 3 idle, tool-call indicators — **shimmer skeletons on active nodes**
6. Round-table — synthesis stage — lens nodes complete + Synthesizer lit + Verifier idle
7. Memo viewer — clean — rigor-pass badge + per-claim source link + citation hover — **glass-badge--purple for rigor; glass-table for citations**
8. Memo viewer — DRAFT — DRAFT banner + failure reasons expandable panel — **use the toast/alert pattern from CCC components**

Each HTML file should embed the relevant CSS from `~/Desktop/CCC-Design-System/source-css/` (Class Glassmorphic foundation) OR inline-import the tokens + essential components from `snippets/`.

Color anchors (shared by both layers): navy `#0A1849`, purple `#4739E7`, gold `#FFBA00` — same as ui.md tokens. No conflict.

## Reference outputs (do not overwrite blindly)

The existing mockups at `~/Desktop/cstuite-design-step-{1-8}.html` were generated 05:37-05:44 ET using ui.md tokens directly (raw CSS, no design system). Replace them in place.

## Russell's note

"Its on my desktop. folder called. CCC-DEsign-System" — directional. Russell wants the 8 mockups remade with this system. He will review later.
