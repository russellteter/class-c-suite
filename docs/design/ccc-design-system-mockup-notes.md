# CCC-Design-System Mockup Notes

**Date:** 2026-05-27
**Mockups:** ~/Desktop/cstuite-design-step-{1-8}.html + cstuite-design-INDEX.html

## Stylesheets embedded

Both verbatim from CCC-Design-System:
- `source-css/glassmorphic.css` — tokens, glass-card, glass-btn-primary/secondary, glass-badge, glass-table, skeleton shimmer, progress bars, glass-input, phase-pulse
- `source-css/typography.css` — h1/h2/h3 (Plus Jakarta Sans), body (Inter 13px), code/pre (SF Mono)

Supplemented with: `@media (prefers-reduced-motion: reduce)` block from `snippets/tokens-minimal.css` and `::selection` rule.

No tokens from `source-css/ccc-scoped.css` (Editorial Sharp layer) were used.

## Top 3 design decisions

1. **Light body background, verbatim.** `typography.css` sets `background: var(--bg-light)` (#EDECFD, soft lavender). The C-Suite PRD calls for a "dark menubar-native" aesthetic, but the brief requires verbatim embedding and Russell can adjust the background token in production. The glass-card surfaces (rgba 0.95 white) and navy text render well against the lavender ground.

2. **Phase pulse on active lens cards, not just avatars.** In steps 5 and 6, the active lens card borders pulse (via `animation: phase-pulse` on the border glow) rather than just the avatar circle. This communicates "the whole agent is working" at a glance, not just the icon state. Idle cards use dashed borders at reduced opacity.

3. **DRAFT as signal, not gate.** In step 8, the amber banner, failure reasons panel, and red-highlighted citations all preserve clickability and memo readability. The failure panel is expanded by default so the reasons are immediate, but the memo content below is not dimmed or blocked. This matches the brief's explicit instruction: "DRAFT is signal, not gate."

## Anti-patterns enforced

- No gradient-fade on any heading text. All h1/h2/h3 use solid `var(--navy)`.
- No em-dashes in any user-facing copy. Commas and periods used throughout.
- No nested scrolling containers. Single scroll context (body) per screen.
- No animation theater. Pulses only on cards/nodes that represent live agent activity.
