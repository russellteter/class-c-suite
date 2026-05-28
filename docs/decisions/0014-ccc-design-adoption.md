# ADR-0014: CCC Design System Adoption — Renderer Token Strategy + Gap Resolutions

## Status

`accepted`

## Date

2026-05-28

## Context

The renderer (`apps/renderer/src/`) ships three competing styling vocabularies that have drifted apart:

1. **`design/tokens.css`** — a de-facto dark-theme token set under `:root` using `--color-*`, `--space-*`, `--text-*`, `--radius-*` names. All 11 screens consume it via inline `style={{}}` props.
2. **`styles/glassmorphic.css`** — a verbatim copy of the Class Glassmorphic layer (`.glass-card`, `.glass-badge-*`, `.glass-btn-*`) plus appended `--color-*` aliases.
3. **`styles/typography.css`** — verbatim copy of the Glass type layer.

The CCC Design System at `/Users/russellteter/Desktop/CCC-Design-System/` (the editorial sharp layer in `ccc-scoped.css` + the Glass component layer) is the source of truth Russell wants adopted. The inventory (`docs/design-system/inventory.md`) catalogs the full token/component surface and flags 5 conflicts that block a clean adoption. This ADR fixes the strategy and resolves all 5 before any screen is rewritten.

Bearing constraints: PRD §5 brand contract (navy/purple/gold anchors, the eyebrow pattern as "50% of visual identity"); DOCTRINE law #6 (creativity within guardrails — locked principles override); the scroll-safety lessons baked into `04-layout.md`.

## Decision

Adopt CCC as the renderer's visual system using **vanilla CSS custom properties driven directly from CCC tokens — no Tailwind, no utility-class reskinning**. Keep two coexisting, namespaced token layers (CCC editorial `--*` / `--r-*` / `--sp-*` / `--fs-*` and Glass `--radius-*` / glass component vars) rather than merging them into one vocabulary. Delete the renderer's competing `tokens.css` color/radius declarations that collide with either layer. Migrate in dependency order: foundational tokens → primitives → composite components → screens. Resolve the 5 inventory gaps as specified in "Gap resolutions" below.

## Rationale

- **Vanilla CSS variables, not Tailwind.** Every CCC source file is already authored as plain CSS with custom properties. A Tailwind reskin would require re-encoding the entire token set into a config, lose the `.ccc-root` scoping discipline, and break the verbatim-port path (`07-implementation-guide.md` Port A). DOCTRINE law #5 (use the toolbox) and minimal-blast-radius both favor porting the source CSS as-is.
- **Two namespaced layers, not one merged vocabulary.** CCC editorial (sharp, 2px radius, cream paper, navy-tinted shadow) and Class Glassmorphic (soft, 16px radius, translucent, purple-tinted shadow) are deliberately different visual registers in the source. Merging them would force one aesthetic to win globally; keeping both scoped lets a screen choose register per region (e.g. an editorial KPI strip with a glass substance ribbon). The collision risk is only at shared names, which the gap resolutions eliminate.
- **CCC wins value conflicts.** Where renderer `tokens.css` invented third values (gold `#c9a14b`, success `#4fae6a`), the CCC source value is canonical because CCC is the system being adopted. The renderer's invented values were never brand-sanctioned.

## Considered options

- **Option A** (chosen) — Port CCC source CSS verbatim into `styles/`, namespace the two layers, delete colliding renderer tokens — chosen because it preserves the source design intent with minimal re-encoding and lets screens mix registers.
- **Option B** — Reskin via Tailwind config encoding CCC tokens as theme values — rejected because it discards the `.ccc-root` scope, requires re-authoring 3,159 lines of source CSS into utility classes, and the renderer ships zero Tailwind today (net-new dependency for no gain).
- **Option C** — Collapse everything into one flat token set (one radius scale, one success color, one shadow system) — rejected because it erases the deliberate editorial-vs-glass register distinction the source encodes, forcing every screen into a single aesthetic.

## Gap resolutions

| # | Gap | Resolution | Mechanism |
|---|---|---|---|
| 1 | **`--radius-sm` collision** (renderer `3px` vs Glass `8px`) | Namespace, do not merge. CCC editorial keeps `--r-sm:2px / --r-md:4px / --r-pill:999px`; Glass keeps `--radius-sm:8px / --radius-md:12px / --radius-lg:16px / --radius-pill:20px`. **Delete** the renderer `tokens.css` `--radius-sm:3px` and `--radius-md:8px` declarations entirely. | Editing `design/tokens.css`: remove the two radius lines; screens that referenced `--radius-sm` resolve to the Glass `8px` (or migrate to `--r-sm` if editorial). Load `glassmorphic.css` after any residual `tokens.css`. |
| 2 | **Gold divergence** (DS `#FFBA00` vs renderer `#c9a14b`) | `#FFBA00` (saturated CCC) wins. Delete `--color-gold-500:#c9a14b` and the `#FFF8E7` muted-gold badge background. | `Home.tsx` W30 chip moves from `rgba(201,161,75,…)` to `rgba(255,186,0,0.12)` bg + `--gold` ink. `.glass-badge--gold` bg becomes `rgba(255,186,0,0.12)`. |
| 3 | **modal/panel/toast CSS unimported** | Import CCC `source-css/modals.css` and `panels.css` verbatim into `apps/renderer/src/styles/`. For the toast conflict, adopt the **CCC editorial toast** (navy `#0A1849` bg + 3px colored left-border + opacity-only fade, bottom-right) and drop the dark-glass slide-in variant. | The editorial toast matches the adopted layer; the glass-toast version has zero current call sites. `CatchupToast`/`TripwireBanner` re-style to `.toast` + `.toast.ok/.err`. |
| 4 | **JetBrains Mono never loaded** | Add Google Fonts `<link>` for JetBrains Mono to `apps/renderer/index.html`. Set `--font-mono: 'JetBrains Mono','SF Mono',Consolas,monospace` in both layers. | The eyebrow pattern ("50% of visual identity") requires JetBrains Mono; without it the signature mono eyebrow renders in SF Mono and loses the brand tell. |
| 5 | **Three success colors** (Glass `#059669`, CCC `#00B1A2`, renderer `#4fae6a`) | `#00B1A2` (CCC teal) wins. Migrate Glass `--success` and renderer `--color-success` to the teal triplet (`--success:#00B1A2`, `--success-soft:#E6FFF9`, `--success-ink:#005E54`). | CCC is the adopted system; teal also differentiates "success" from the warning/gold that already lives at `#FFBA00`, removing the green-vs-yellow ambiguity in status feedback. |

## Component naming conventions

- **CCC editorial layer:** unprefixed semantic classes inside a `.ccc-root` scope — `.eyebrow`, `.kpi-strip`/`.kpi`, `.sub-card`, `.tree-pane`/`.bucket-row`, `.editorial-header`, `.seg`, `.pill`, `.btn`/`.btn.ghost`, `.stamp`, `.breadcrumb`, `.toast`.
- **Class Glassmorphic layer:** `glass-` prefix — `.glass-card`, `.glass-badge--{purple,success,error,warning,navy,gold}`, `.glass-btn-primary`/`.glass-btn-secondary`, `.glass-input`, `.glass-table`.
- **Overlay systems:** keep source prefixes — modals `at-modal-*`, panels `at-pp-*`. Toast uses the unprefixed CCC `.toast`.
- **Tokens:** CCC editorial `--{navy,purple,gold}`, `--r-*`, `--sp-*`, `--fs-*`, `--tracking-*`; Glass `--radius-*`, `--glass-*`. Renderer `--color-*`/`--space-*`/`--text-*` are deprecated — migrate screens off them as each is touched; do not add new `--color-*` references.

## Migration order

1. **Foundational tokens** — port `tokens-minimal.css` superset into `styles/tokens-ccc.css`; delete colliding renderer declarations (gaps 1, 2, 5); wire JetBrains Mono (gap 4). Add `prefers-reduced-motion` global override + `:focus-visible` purple ring + `::selection` gold.
2. **Primitives** — eyebrow, button, segmented control, pill, badge, KPI cell, sub-card, input. Import modal/panel/toast CSS (gap 3).
3. **Composite components** — KPI strip, tree-pane sidebar, substance ribbon, lens-node grid, citation-badge memo body, tool-call panel.
4. **Screens** — rewrite the 3 hero screens (Home, RoundTable, MemoViewer) per the chosen mockup direction, then the remaining 8.

## Consequences

- Positive: one sanctioned brand color per role; the eyebrow pattern becomes renderable; modal/panel/toast UIs stop being ad-hoc; editorial and glass registers coexist without collision.
- Negative / costs: two token layers raise the learning curve for which to reach for; screens currently on `--color-*` need a touch-as-you-go migration; the renderer entry must guarantee `glassmorphic.css` load order.
- Follow-up: the **mockup gate** (`~/Desktop/csuite-design-{home,roundtable,memo}.html`) must be resolved — Russell picks one direction per screen — before the screen-rewrite cascade runs. Migration-order steps 1–3 can begin in parallel since they are direction-agnostic.
- Reversibility: medium — token deletions and font wiring are trivial to revert; once screens are rewritten to a chosen direction, reverting the visual direction is a re-design, not a config flip.

## Affected artifacts

- `apps/renderer/src/design/tokens.css` — delete `--radius-sm:3px`, `--radius-md:8px`, `--color-gold-500:#c9a14b`, migrate `--color-success` to teal.
- `apps/renderer/src/styles/glassmorphic.css` — `--success` to teal, `--gold` confirmed `#FFBA00`, `--font-mono` to JetBrains stack, gold badge bg.
- `apps/renderer/src/styles/{tokens-ccc,modals,panels,toasts}.css` — new ports from CCC source.
- `apps/renderer/index.html` — JetBrains Mono `<link>`.
- `apps/renderer/src/screens/{Home,RoundTable,MemoViewer}.tsx` — rewrite after mockup gate.
- Related ADRs: ADR-0008/0009 (prior design gates), ADR-0013 (Vite assembly leg this unblocks).

## Tripwires

- A status badge renders three different greens across screens → gap 5 migration incomplete; revisit.
- The W30 chip or any gold element still renders muted `#c9a14b` → gap 2 incomplete.
- Eyebrow labels render in SF Mono / proportional digits → JetBrains Mono not loaded (gap 4).
- A Glass `.glass-card` renders with a 3px radius → `tokens.css` radius collision still live (gap 1); check load order.

---

**Author / agent role:** UI Designer (design-adoption gate)
**Reviewed by Audit/QA in chapter ritual step 6:** pending mockup-gate resolution
