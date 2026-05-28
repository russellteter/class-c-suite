# CCC Design System — Complete Inventory
**Generated:** 2026-05-28  
**Source truth:** `/Users/russellteter/Desktop/CCC-Design-System/` (13 files)  
**Target app:** `/Users/russellteter/Claude Code Projects/c-suite/apps/renderer/src/`

---

## SOURCE FILES CONFIRMED (13)

| # | File | Size | Role |
|---|---|---|---|
| 1 | `README.md` | 6.4 KB | Overview + brand color anchors + anti-patterns |
| 2 | `01-tokens.md` | 6.9 KB | Full token reference (both layers) |
| 3 | `02-typography.md` | 4.4 KB | Type families, scale, tracking, tabular-nums |
| 4 | `03-components.md` | 14.7 KB | All named component classes with CSS |
| 5 | `04-layout.md` | 6.6 KB | App shell, CCC grid, scroll lesson |
| 6 | `05-motion.md` | 5.3 KB | Easing curves, durations, animations |
| 7 | `06-patterns.md` | 8.6 KB | 14 editorial micro-patterns |
| 8 | `07-implementation-guide.md` | 10.8 KB | Port paths A/B + testing checklist |
| 9 | `assets/preview.html` | 11.2 KB | Self-contained rendered preview |
| 10 | `source-css/ccc-scoped.css` | 119.3 KB | CCC editorial full stylesheet (3,159 lines) |
| 11 | `source-css/glassmorphic.css` | 8.7 KB | Class Glassmorphic component layer |
| 12 | `source-css/modals.css` | 8.5 KB | Modal system (`at-modal-*` prefix) |
| 13 | `source-css/panels.css` | 13.4 KB | Slide-out panels (`at-pp-*` prefix) |
| 14 | `source-css/toasts.css` | 1.8 KB | Toast notifications (`at-toast-*` prefix) |
| 15 | `source-css/typography.css` | 855 B | Body + heading type styles |
| 16 | `source-css/ccc-body-template.html` | 3.1 KB | Markup skeleton/conventions |
| 17 | `snippets/tokens-minimal.css` | 2.4 KB | Drop-in minimal token set |
| 18 | `snippets/components-essentials.css` | 5.9 KB | Drop-in essential components |
| 19 | `snippets/QUICK-START.md` | 4.5 KB | 5-minute port guide |

> Note: Physical count is 19 files across subdirectories; the brief's "13" reflects the top-level .md files + key source-css files as a subset. All 19 are captured below.

---

## 1. DESIGN TOKENS

### 1.1 Color Tokens

#### Layer A: Class Glassmorphic (`:root`)
Source: `source-css/glassmorphic.css`

**Brand palette**
| Token | Hex | Role |
|---|---|---|
| `--navy` | `#0A1849` | Primary brand anchor, dark text |
| `--navy-mid` | `#1a2a5e` | Mid navy |
| `--purple` | `#4739E7` | Primary action, focus ring, accent |
| `--purple-dark` | `#3730a3` | Button hover, darker purple |
| `--gold` | `#FFBA00` | Highlight, attention, tab active |
| `--success` | `#059669` | Positive status |
| `--error` | `#DC2626` | Negative status |
| `--warning` | `#D97706` | Caution status |
| `--muted` | `#6B7280` | Muted labels |

**Neutral text scale**
| Token | Hex |
|---|---|
| `--text-strong` | `#111827` |
| `--text-mid` | `#4b5563` |
| `--text-soft` | `#9ca3af` |

**Surface + border**
| Token | Hex |
|---|---|
| `--border` | `#e5e7eb` |
| `--surface-white` | `#ffffff` |
| `--surface-subtle` | `#fafafa` |
| `--surface-gray` | `#f3f4f6` |

**Semantic tinted backgrounds**
| Token | Hex |
|---|---|
| `--bg-purple` | `#EDECFD` |
| `--bg-light` | `#EDECFD` |
| `--bg-surface` | `#F8F7FF` |
| `--bg-surface-alt` | `#F0EFFE` |

**Glass surface**
| Token | Value |
|---|---|
| `--glass-bg` | `rgba(255, 255, 255, 0.95)` |
| `--glass-border` | `rgba(71, 57, 231, 0.08)` |
| `--glass-blur` | `12px` |

**ui.md aliases (added in renderer `glassmorphic.css` extension)**
| Token | Hex |
|---|---|
| `--color-navy-900` | `#0a1849` |
| `--color-gold-500` | `#c9a14b` |
| `--color-purple-500` | `#4739e7` |
| `--color-navy-700` | `#182a6b` |
| `--color-navy-500` | `#2a3f8a` |
| `--color-purple-400` | `#6a5cf0` |
| `--color-rigor-clean` | `var(--color-gold-500)` |
| `--color-rigor-draft` | `#d6883a` |

---

#### Layer B: CCC Editorial Sharp (`.ccc-root`)
Source: `source-css/ccc-scoped.css`

**Navy scale**
| Token | Hex |
|---|---|
| `--navy-900` | `#0A1849` |
| `--navy-800` | `#0E2060` |
| `--navy-700` | `#1A2C7A` |
| `--navy-600` | `#334693` |

**Purple scale**
| Token | Hex |
|---|---|
| `--purple-800` | `#241D74` |
| `--purple-700` | `#352BAD` |
| `--purple-600` | `#4739E7` |
| `--purple-500` | `#6C61EC` |
| `--purple-400` | `#9188F1` |
| `--purple-200` | `#DAD7FA` |
| `--purple-100` | `#EDECFD` |
| `--purple-50` | `#F4F4FE` |

**Yellow scale**
| Token | Hex |
|---|---|
| `--yellow-500` | `#FFBA00` |
| `--yellow-300` | `#FFD54F` |
| `--yellow-700` | `#CC9500` |

**Surface tokens**
| Token | Hex |
|---|---|
| `--cream` | `#FAF8F4` |
| `--paper` | `#FFFFFF` |

**Neutral scale**
| Token | Hex |
|---|---|
| `--gray-900` | `#1A1A1F` |
| `--gray-700` | `#4B4D52` |
| `--gray-500` | `#7A7C83` |
| `--gray-300` | `#D5D5D8` |
| `--gray-200` | `#E8E8E8` |
| `--gray-100` | `#F2F2F2` |
| `--gray-50` | `#F8F8FA` |

**Semantic status triplets**
| Token | Hex | Use |
|---|---|---|
| `--ok` | `#00B1A2` | Success (teal, differs from Glass) |
| `--ok-soft` | `#E6FFF9` | Success background |
| `--ok-ink` | `#005E54` | Success text |
| `--warn` | `#FFBA00` | Warning |
| `--warn-soft` | `#FFF7E0` | Warning background |
| `--warn-ink` | `#7A5A00` | Warning text |
| `--err` | `#DC2626` | Error |
| `--err-soft` | `#FFECEC` | Error background |
| `--err-ink` | `#991B1B` | Error text |
| `--info` | `#4739E7` | Info |
| `--info-soft` | `#EDECFD` | Info background |
| `--info-ink` | `#241D74` | Info text |

**Geo pills**
| Token | Hex |
|---|---|
| `--dom` | `#DAD7FA` |
| `--dom-ink` | `#241D74` |
| `--intl` | `#E6FFF9` |
| `--intl-ink` | `#005E54` |
| `--global` | `#FFF7E0` |
| `--global-ink` | `#7A5A00` |

**Source integration colors (HubSpot / Outreach / SFDC)**
| Token | Hex |
|---|---|
| `--hs` | `#FF7A59` |
| `--hs-soft` | `#FFE4DA` |
| `--hs-ink` | `#A93D1F` |
| `--or` | `#5B3FE4` |
| `--or-soft` | `#E2DCFF` |
| `--or-ink` | `#241D74` |
| `--sfdc` | `#0176D3` |
| `--sfdc-soft` | `#D9EBFF` |
| `--sfdc-ink` | `#003E6B` |

**Timeline line colors**
| Token | Hex |
|---|---|
| `--task-line` | `#FFBA00` |
| `--event-line` | `#DC2626` |
| `--cm-line` | `#4739E7` |

---

### 1.2 Spacing Scale

#### CCC Editorial (`--sp-*`)
| Token | Value |
|---|---|
| `--sp-1` | `4px` |
| `--sp-2` | `8px` |
| `--sp-3` | `12px` |
| `--sp-4` | `16px` |
| `--sp-5` | `24px` |
| `--sp-6` | `32px` |
| `--sp-7` | `48px` |
| `--sp-8` | `64px` |

Glass layer uses Tailwind default scale via utility classes (no named CSS variables).

---

### 1.3 Border-Radius Tokens

#### Class Glassmorphic (soft, rounded)
| Token | Value | Use |
|---|---|---|
| `--radius-sm` | `8px` | Inputs, small components |
| `--radius-md` | `12px` | Mid-size cards |
| `--radius-lg` | `16px` | `.glass-card` primary surface |
| `--radius-pill` | `20px` | Badges, progress bars |

#### CCC Editorial (sharp)
| Token | Value | Use |
|---|---|---|
| `--r-0` | `0` | Flush/table cells |
| `--r-sm` | `2px` | Buttons, cards, sub-cards, KPI strip |
| `--r-md` | `4px` | Secondary containers |
| `--r-pill` | `999px` | Geo/source pills, count chips only |

---

### 1.4 Shadow / Elevation Tokens

#### Class Glassmorphic (purple-tinted)
| Token | Value |
|---|---|
| `--glass-shadow` | `0 4px 6px -1px rgba(71,57,231,0.06), 0 2px 4px -1px rgba(71,57,231,0.04), inset 0 1px 0 rgba(255,255,255,0.9)` |
| `--glass-shadow-hover` | `0 12px 24px -4px rgba(71,57,231,0.12), 0 4px 8px -2px rgba(71,57,231,0.06), inset 0 1px 0 rgba(255,255,255,0.9)` |

#### CCC Editorial (navy-tinted)
| Token | Value |
|---|---|
| `--shadow-1` | `0 1px 2px rgba(10,24,73,0.06)` |
| `--shadow-2` | `0 2px 8px rgba(10,24,73,0.08)` |
| `--shadow-3` | `0 12px 32px rgba(10,24,73,0.12)` |
| `--shadow-purple` | `0 8px 24px rgba(71,57,231,0.18)` |

---

### 1.5 Typography Tokens

#### Font Families
| Token | Value | Layer |
|---|---|---|
| `--font-sans` (Glass) | `'Inter', system-ui, sans-serif` | Body, UI labels |
| `--font-display` (Glass) | `'Plus Jakarta Sans', system-ui, sans-serif` | Headings h1/h2/h3 |
| `--font-mono` (Glass) | `'SF Mono', 'Fira Code', 'Cascadia Code', monospace` | Code |
| `--font-sans` (CCC) | `'Inter','Inter Display',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif` | Body |
| `--font-mono` (CCC) | `'JetBrains Mono','SF Mono',Consolas,monospace` | Eyebrow labels, tabular data |

#### Font Sizes (CCC `--fs-*`)
| Token | Value | Canonical use |
|---|---|---|
| `--fs-mono-xs` | `10px` | Eyebrow labels, KPI sub-labels, breadcrumbs |
| `--fs-xs` | `11px` | Dense metadata |
| `--fs-sm` | `13px` | Body |
| `--fs-md` | `14px` | Card titles |
| `--fs-lg` | `16px` | Sub-card metric values |
| `--fs-xl` | `20px` | Header h1 |
| `--fs-2xl` | `28px` | Scope titles |
| `--fs-3xl` | `40px` | Large displays |
| `--fs-display` | `56px` | Hero display |

#### Glassmorphic heading scale (from `typography.css`)
| Element | Font | Size | Weight | Line-height |
|---|---|---|---|---|
| `body` | `--font-sans` | `13px` | 400 | `1.5` |
| `h1` | `--font-display` | `26px` | 800 | `1.2` |
| `h2` | `--font-display` | `20px` | 700 | `1.3` |
| `h3` | `--font-display` | `16px` | 700 | `1.4` |

#### Letter-spacing (CCC)
| Token | Value | Use |
|---|---|---|
| `--tracking-tight` | `-0.02em` | All body text inside `.ccc-root` |
| `--tracking-tighter` | `-0.03em` | Compact UI variants |
| `--tracking-display` | `-0.04em` | Large headings |
| `--tracking-wide` | `0.06em` | Monospaced stamps + uppercase labels |
| `--tracking-eyebrow` | `0.14em` | The signature eyebrow pattern |

#### KPI value style
- `font-size: 26px`, `font-weight: 600`, `letter-spacing: -0.01em`, `line-height: 1.15`
- `font-variant-numeric: tabular-nums`, `font-feature-settings: "tnum","ss01"`

---

### 1.6 Motion Tokens

#### Class Glassmorphic
| Token | Value |
|---|---|
| `--transition-fast` | `120ms ease` |
| `--transition-standard` | `200ms ease` |

#### CCC Editorial (inline values, no named tokens)
| Duration | Use |
|---|---|
| `0.12s cubic-bezier(0.16, 1, 0.3, 1)` | Button hover, KPI tint, tree row |
| `0.15s cubic-bezier(0.16, 1, 0.3, 1)` | Sub-card hover border + shadow |
| `0.2s cubic-bezier(0.16, 1, 0.3, 1)` | Accent strip scaleX slide-in |
| `0.25s cubic-bezier(0.16, 1, 0.3, 1)` | Toast fade-in |
| `300ms ease` | Progress bar fill |
| `1.5s ease infinite` | Skeleton shimmer cycle |
| `2s ease-in-out infinite` | Phase pulse |

**The CCC signature easing:** `cubic-bezier(0.16, 1, 0.3, 1)` — fast attack, soft settle.

---

## 2. COMPONENTS

### 2.1 Class Glassmorphic Components (unscoped)

Source: `source-css/glassmorphic.css`

| Class | Description | Key Styles |
|---|---|---|
| `.glass-surface` | Tinted surface (sidebar panel) | `bg: --bg-surface`, `border-right: 1px solid --glass-border` |
| `.glass-card` | Premium translucent card | `bg: rgba(255,255,255,0.95)`, `border-radius: 16px`, `backdrop-filter: blur(12px)`, `box-shadow: --glass-shadow` |
| `.glass-card:hover` | Card hover lift | `translateY(-1px)`, `box-shadow: --glass-shadow-hover` |
| `.glass-card--selected` | Selected card state | `border-color: --purple`, `box-shadow: 0 0 0 1px --purple + --glass-shadow-hover` |
| `.glass-btn-primary` | Primary gradient button | `bg: linear-gradient(135deg, --purple 0%, --purple-dark 100%)`, `border-radius: 8px`, `padding: 10px 20px`, `font-weight: 600`, `box-shadow: 0 2px 4px rgba(71,57,231,0.3)` |
| `.glass-btn-secondary` | Ghost/outline button | `bg: --glass-bg`, `color: --purple`, `border: 1px solid rgba(71,57,231,0.15)` |
| `.glass-badge` | Base pill badge | `font-size: 9px`, `font-weight: 700`, `letter-spacing: 0.5px`, `text-transform: uppercase`, `padding: 3px 8px`, `border-radius: 20px` |
| `.glass-badge--purple` | Purple badge | `bg: #EDECFD`, `color: --purple` |
| `.glass-badge--success` | Success badge | `bg: --bg-success`, `color: --success` |
| `.glass-badge--error` | Error badge | `bg: --bg-error`, `color: --error` |
| `.glass-badge--warning` | Warning badge | `bg: --bg-warning`, `color: --warning` |
| `.glass-badge--navy` | Navy badge | `bg: --bg-surface-alt`, `color: --navy` |
| `.glass-badge--gold` | Gold badge | `bg: #FFF8E7`, `color: --color-gold-500` |
| `.glass-input` | Text input | `bg: --glass-bg`, `border: 1px solid rgba(71,57,231,0.12)`, `border-radius: 8px`, `padding: 8px 12px` |
| `.glass-input:focus` | Input focus ring | `border-color: --purple`, `box-shadow: 0 0 0 3px rgba(71,57,231,0.1)` |
| `.glass-table` | Data table | `border-collapse: collapse`, purple-gradient zebra stripe |
| `.glass-table th` | Table header | `font-size: 10px`, `text-transform: uppercase`, `letter-spacing: 0.5px` |
| `.skeleton` | Loading shimmer | `background-size: 200% 100%`, `animation: shimmer 1.5s ease infinite` |
| `.progress-bar` | Progress container | `height: 6px`, `border-radius: 20px` |
| `.progress-bar__fill--primary` | Purple fill | `linear-gradient(90deg, #4739E7, #6366f1)` |
| `.progress-bar__fill--success` | Green fill | `linear-gradient(90deg, #059669, #34d399)` |
| `.progress-bar__fill--warning` | Amber fill | `linear-gradient(90deg, #D97706, #fbbf24)` |
| `.progress-bar__fill--error` | Red fill | `linear-gradient(90deg, #DC2626, #f87171)` |
| `.phase-node__circle--pulsing` | Active step pulse | `animation: phase-pulse 2s ease-in-out infinite` |
| `.cli-command-card` | CLI card hover | navy-tinted shadow on hover |
| `.draft-banner` | Draft state banner | gold/amber gradient bg, bold text, flex layout |

---

### 2.2 Modal System (`modals.css`, `at-modal-*` prefix)

Source: `source-css/modals.css`

| Class | Key Styles |
|---|---|
| `.at-modal-overlay` | `position: fixed; inset: 0; z-index: 200; bg: rgba(10,8,32,0.45); backdrop-filter: blur(3px)` |
| `.at-modal-dialog` | `bg: --glass-bg; border-radius: --radius-lg (16px); max-width: 520px; max-height: 90vh` |
| `.at-modal-header` | `padding: 20px 24px 16px; border-bottom: 1px solid --glass-border` |
| `.at-modal-title` | `font-family: --font-display; font-size: 17px; font-weight: 700` |
| `.at-modal-close` | `border-radius: --radius-sm; hover: bg --bg-surface-alt` |
| `.at-modal-body` | `padding: 20px 24px; gap: 20px` |
| `.at-modal-label` | `font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase` |
| `.at-modal-select` / `.at-modal-input` | `border-radius: --radius-sm; bg: --bg-surface; focus: purple border + ring` |
| `.at-modal-check-label:has(input:checked)` | `border-color: --purple; bg: rgba(71,57,231,0.06)` |
| `.at-modal-seq-list` | `max-height: 150px; overflow-y: auto` |
| `.at-modal-footer` | `padding: 16px 24px 20px; border-top: 1px solid --glass-border` |
| `.at-modal-btn-cancel` | `bg: transparent; color: --muted; hover: color --navy` |
| `.at-modal-btn-launch` | `bg: --purple; color: #fff; font-weight: 700; hover: --purple-dark + translateY(-1px)` |
| `.at-lens-badge` | `border-radius: --radius-pill; bg: rgba(71,57,231,0.08); font-size: 11px` |
| `.at-shortcuts-overlay` | `z-index: 400; backdrop-filter: blur(2px)` |
| `.at-shortcuts-sheet` | `border-radius: 12px; width: 360px; box-shadow: 0 16px 48px rgba(0,0,0,0.22)` |
| `.at-shortcuts-key` | `bg: #f3f4f6; border: 1px solid #e5e7eb; border-bottom-width: 2px; font-family: ui-monospace` |

---

### 2.3 Panel System (`panels.css`, `at-pp-*` prefix)

Source: `source-css/panels.css`

| Class | Key Styles |
|---|---|
| `.at-pp-overlay` | `position: fixed; z-index: 150; backdrop-filter: blur(2px)` |
| `.at-pp-panel` | `position: fixed; right: 0; width: 450px; z-index: 151; bg: #fff` |
| `.at-pp-header` | `padding: 14px 20px; bg: --surface-subtle; border-bottom: 1px solid --border` |
| `.at-pp-title` | `font-family: --font-display; font-size: 15px; font-weight: 700` |
| `.at-pp-segment-badge` | `font-size: 10px; border-radius: 100px; bg: --bg-light; color: --purple` |

---

### 2.4 Toast System (`toasts.css`, `at-toast-*` prefix)

Source: `source-css/toasts.css`

| Class | Key Styles |
|---|---|
| `.at-toast-container` | `position: fixed; top: 56px; right: 16px; z-index: 9999; flex-column; gap: 8px; max-width: 380px` |
| `.at-toast` | `border-radius: 8px; backdrop-filter: blur(12px); animation: at-toast-in 0.2s ease-out` |
| `@keyframes at-toast-in` | `from: opacity:0, translateX(24px); to: opacity:1, translateX(0)` |
| `.at-toast--success` | `bg: rgba(20,83,45,0.85); border: rgba(74,222,128,0.4); color: #d1fae5` |
| `.at-toast--error` | `bg: rgba(127,29,29,0.9); border: rgba(248,113,113,0.4); color: #fee2e2` |
| `.at-toast--warning` | `bg: rgba(120,53,15,0.85); border: rgba(251,191,36,0.4); color: #fef3c7` |
| `.at-toast--info` | `bg: rgba(30,58,138,0.85); border: rgba(96,165,250,0.4); color: #dbeafe` |

**Conflict note:** `toasts.css` uses dark glassmorphic backgrounds (Tailwind green/red/yellow/blue transparent with blur). The CCC editorial layer prescribes a different toast style — navy bg `#0A1849` with colored left-border (3px), opacity fade (no slide-in), bottom-right placement. These are two incompatible toast systems.

---

### 2.5 CCC Editorial Components (`.ccc-root` scoped)

Source: `source-css/ccc-scoped.css`

| Class | Description | Key Styles |
|---|---|---|
| `header.top` | Navy editorial header | `bg: --navy-900; color: #fff; position: relative` |
| `header.top::after` | Gradient underline | `height: 2px; background: linear-gradient(90deg, --purple-600 0%, --purple-400 50%, --yellow-500 100%)` |
| `.tabs` | Tab bar (inside header) | `display: flex; padding: 0 48px; border-top: 1px solid rgba(255,255,255,0.04)` |
| `.tab` | Inactive tab | `color: rgba(255,255,255,0.5); border-bottom: 2px solid transparent; padding: 12px 16px` |
| `.tab.on` | Active tab | `color: #fff; border-bottom-color: --yellow-500; font-weight: 600` |
| `.filters` | Filter bar | `bg: --paper; border-bottom: 1px solid --gray-200; padding: 12px 48px` |
| `.filters label` | Filter eyebrow label | monospace 10px uppercase `0.14em` tracking |
| `.seg` | Segmented control | `display: inline-flex; bg: --gray-100; border-radius: 2px; padding: 2px; gap: 1px` |
| `.seg button.on` | Active segment | `bg: --navy-900; color: #fff; font-weight: 600` |
| `.kpi-strip` | KPI row grid | `display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 1px; bg: --gray-200; overflow: clip` |
| `.kpi` | Single KPI cell | `bg: --paper; padding: 16px 16px 24px; transition: background 0.12s` |
| `.kpi:hover` | KPI hover tint | `bg: --purple-50` |
| `.kpi .lbl` | KPI eyebrow label | monospace 10px 500 weight uppercase `0.14em` tracking gray-500 |
| `.kpi .val` | KPI value | `font-size: 26px; font-weight: 600; letter-spacing: -0.01em; tabular-nums` |
| `.kpi .val.zero` | Zero value | `color: --gray-300` |
| `.kpi .info` | Tooltip trigger | 14px circle, `cursor: help`; hover inverts to navy |
| `.sub-cards` | Card grid | `display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px` |
| `.sub-card` | Campaign/event card | `bg: --paper; border: 1px solid --gray-200; border-radius: 2px; padding: 16px 24px; cursor: pointer` |
| `.sub-card::before` | Accent strip | `height: 2px; bg: --purple-600; transform: scaleX(0); origin: left` |
| `.sub-card:hover::before` | Strip reveal | `transform: scaleX(1)` |
| `.sub-card .name` | Card title | `font-weight: 700; font-size: 14px; color: --navy-900; letter-spacing: -0.02em` |
| `.sub-card .meta` | Card eyebrow | monospace 10px uppercase `0.14em` tracking |
| `.sub-card .nums` | 4-col metric grid | `grid-template-columns: repeat(4, 1fr); gap: 12px; tabular-nums` |
| `.sub-card .sparkline` | 5-cell funnel bar | `grid-template-columns: repeat(5, 1fr); gap: 2px; height: 24px` |
| `.tree-pane` | Left sidebar | `bg: --paper; border-right: 1px solid --gray-200; width: --tree-w (288px)` |
| `.tree-section h3` | Sidebar section label | monospace 10px uppercase eyebrow with `::before` 16px divider |
| `.bucket-row` | Sidebar row | `border-left: 2px solid transparent; padding: 6px 24px; transition: 0.1s` |
| `.bucket-row:hover` | Sidebar hover | `bg: --purple-50` |
| `.bucket-row.selected` | Selected row | `bg: --purple-100; border-left-color: --purple-600; font-weight: 600` |
| `.bucket-row .count` | Count chip | `bg: --gray-100; border-radius: 2px; font-mono; tabular-nums` |
| `.bucket-row.selected .count` | Selected count | `bg: --purple-600; color: #fff` |
| `.breadcrumb` | Breadcrumb trail | monospace 10px uppercase `0.14em`, `::before` 24px purple-600 divider |
| `.toast` (CCC) | CCC toast variant | `position: fixed; bottom: 24px; right: 24px; bg: --navy-900; opacity:0; border-left: 3px solid --purple-600; transition: opacity 0.25s` |
| `.toast.show` | Toast visible | `opacity: 1` |
| `.toast.err` | Error toast | `border-left-color: --err` |
| `.toast.ok` | Success toast | `border-left-color: --ok` |
| `.pill.dom` / `.intl` / `.global` | Geo pills | `bg: --dom/--intl/--global; color: --dom-ink/etc; font-mono 10px` |
| `.btn` (CCC) | CCC primary button | `bg: --purple-600; border-radius: 2px; padding: 8px 16px; font-weight: 600; font-size: 13px` |
| `.btn.ghost` | Ghost button | `bg: transparent; color: rgba(255,255,255,0.75); border: 1px solid rgba(255,255,255,0.16)` |
| `.tree-resize` | Drag handle | `width: 1px; bg: --gray-200; cursor: col-resize; hover: purple-600, width: 3px` |
| `.eyebrow` | Standalone eyebrow | monospace 10px 500 uppercase `0.14em`, `::before` 16px gray-300 divider |
| `.stamp` | Timestamp monospace | `font-mono 10px; color: rgba(255,255,255,0.5); tabular-nums; uppercase; letter-spacing: 0.06em` |

---

### 2.6 Snippets Components (`snippets/components-essentials.css`)

| Class | Description |
|---|---|
| `.eyebrow` | Standalone eyebrow label (cross-project drop-in) |
| `.btn` | Primary button with CCC sharp styling |
| `.btn.ghost` | Ghost transparent button |
| `.seg` / `.seg button` / `.seg button.on` | Segmented control |
| `.editorial-header` | Navy header with gradient underline + stamp |
| `.kpi-strip` / `.kpi` / `.kpi .val` / `.kpi .sub` | KPI strip (no ccc-root dependency) |
| `.sub-card` (with `::before` accent) | Campaign card |
| `.pill.success` / `.warning` / `.error` / `.info` | Status pills (4 variants) |

---

## 3. LAYOUT PRIMITIVES

Source: `04-layout.md`, `source-css/ccc-body-template.html`

### 3.1 App Shell (Glassmorphic)
```
.app-shell          → display: flex; flex-direction: row; height: 100vh; overflow: hidden
.app-shell-main     → flex: 1; display: flex; flex-direction: column; overflow: auto; min-width: 0
```
Two-column: navigation dock (left) + scrollable main column (right).

### 3.2 CCC Root Layout
```
.ccc-root           → height: 100%; overflow: hidden; display: flex; flex-direction: column
```
Three vertical regions stacked:
1. `header.top` — fixed-height navy header
2. `.filters` — eyebrow filter bar
3. `main` — the scroll region (CSS grid)

### 3.3 CCC Main Grid (3-column)
```css
.ccc-root main {
  flex: 1;
  display: grid;
  grid-template-columns: var(--tree-w, 288px) 1px 1fr;
  grid-template-rows: minmax(0, 1fr);   /* CRITICAL — prevents scroll trap */
  overflow: hidden; min-height: 0;
  background: var(--gray-50);
}
```
- Column 1: sidebar (`--tree-w` default 288px, user-resizable)
- Column 2: 1px drag handle (`.tree-resize`)
- Column 3: content pane (`1fr`)

### 3.4 Responsive Breakpoints (KPI strip)
| Viewport | KPI columns |
|---|---|
| ≥ 1381px | 7 |
| 901–1380px | 4 |
| ≤ 900px | 2 |

### 3.5 Scroll Safety Rules (from 5-PR regression fix)
1. **`grid-template-rows: minmax(0, 1fr)`** on the grid container to allow child `overflow:auto` to activate
2. **`overflow: clip` not `overflow: hidden`** on rounded containers that forward wheel events
3. **One scroll context per region** — no nested `overflow: hidden` without explicit height
4. Never use JS to manually scroll; if needed, the layout is wrong

### 3.6 CCC Body Template Skeleton (from `ccc-body-template.html`)
```
<div class="ccc-root">
  <header class="top">
    <div class="row1"> [h1, .sub, .spacer, .right([.stamp, .btn.ghost×2])] </div>
    <div class="tabs"> [.tab.on × 3] </div>
  </header>
  <div class="filters">
    <label>Period</label>
    <div class="seg"> [button×5] </div>
  </div>
  <main>
    <aside class="tree-pane" /> 
    <div class="tree-resize" />
    <section class="content-pane view active"> [.kpi-strip, .sub-cards] </section>
  </main>
  <div class="toast" id="toast" />
</div>
```

### 3.7 Editorial Details
- **Noise overlay:** `.ccc-root::before` — inline SVG fractal noise, `opacity: 0.018`, `mix-blend-mode: overlay`, `pointer-events: none`, `z-index: 1000`
- **Selection color:** `.ccc-root ::selection { background: --yellow-500; color: --navy-900 }`
- **`box-sizing: border-box`** applied to all `.ccc-root` descendants
- **`color-scheme: light`** required to prevent native dark-mode form control bleed

---

## 4. PATTERN LIBRARY (06-patterns.md)

14 editorial micro-patterns:

| # | Pattern | Description |
|---|---|---|
| 1 | **Eyebrow label with leading divider** | Mono 10px, uppercase, 0.14em tracking, `::before` 16px gray-300 line. Variants: dark surface (white 40%), breadcrumb (purple-600), newly-detected (yellow-500). The 50% of CCC visual identity. |
| 2 | **Header gradient underline** | `::after` on `header.top`: 2px bar `linear-gradient(90deg, --purple-600 → --purple-400 → --yellow-500)`. Color sequence is a brand contract. |
| 3 | **Hover accent strip (`::before` slide-in)** | `transform: scaleX(0) → scaleX(1)`, `transform-origin: left`, `0.2s cubic-bezier(0.16,1,0.3,1)`. Works on KPI cells, sub-cards, list rows, tabs. |
| 4 | **Selection state via left-edge accent** | `border-left: 2px solid --purple-600` + `bg: --purple-100` + `font-weight: 600` + count chip inversion. Three simultaneous selection signals. |
| 5 | **Tabular numerics everywhere** | `font-variant-numeric: tabular-nums; font-feature-settings: "tnum","ss01"` on every numeric cell. |
| 6 | **`overflow: clip` not `overflow: hidden`** | Rounded containers that forward wheel events must use `clip`. `hidden` creates scroll context and captures wheel events. |
| 7 | **Tooltip via `[data-tip]`** | Pure CSS, no JS: `content: attr(data-tip)` on `::after`. Navy bg, 260px wide, `border-radius: 2px`. Not WCAG keyboard-accessible — use only for ⓘ informational hints. |
| 8 | **Source-colored tag triplet** | `--name` (strong), `--name-soft` (90% white tinted bg), `--name-ink` (accessible dark text). Triplet guarantees WCAG AA by construction. |
| 9 | **Subtle SVG noise overlay** | 1.8% opacity fractal noise, `mix-blend-mode: overlay`, `pointer-events: none`, `position: fixed`. Transforms screen→paper feel. |
| 10 | **Stamp / timestamp in monospace** | Mono 10px, rgba(255,255,255,0.5), uppercase, `letter-spacing: 0.06em`, tabular-nums. "System data, not user data" signal. |
| 11 | **Segmented control** | 2px container padding + 1px gap + navy active inversion. Industry-standard; cleanly minimal. |
| 12 | **Numeric grid inside a card** | 4-column eyebrow-label-above-value grid. `border-top: 1px solid --gray-200`, tabular-nums. Reads as "stats panel" without visual separators. |
| 13 | **Empty / zero state coloring** | Zero: `color: --gray-300` (keep weight). Unknown/pending: `—` em-dash in `--gray-300`. Two distinct empty states, color-disambiguated. |
| 14 | **Five-cell sparkline (funnel)** | 5-col grid 24px tall, bars bottom-aligned, color sequence purple-200→purple-400→purple-600→navy-700→ok-teal. Reusable for any 3–6-step staged metric. |

---

## 5. VOICE / MOTION PRINCIPLES

### 5.1 Motion Philosophy (from `05-motion.md`)

**Easing curve hierarchy:**
- `cubic-bezier(0.16, 1, 0.3, 1)` — CCC default. Fast attack, soft settle. The brand-differentiated easing.
- `ease` — Glass default. Gentler in/out for cards, badges.
- `ease-in-out` — Infinite loops only (pulse, shimmer).

**Duration palette (use max 3):**
- 120ms: micro-interactions (input focus, chip hover, button state)
- 150–200ms: component state (card hover, accent strip)
- 250ms: overlay transitions (toast fade)
- 1500ms+: loading/ambient animations (shimmer, pulse)

**Hover patterns:**
1. Lift: `translateY(-1px)` + shadow growth (Glass cards + buttons)
2. Tint: `background → purple-50` in 120ms (CCC KPI cells, tree rows)
3. Accent strip: `scaleX(0→1)` at 200ms CCC easing (cards, list items)

**Avoid:**
- Bouncy easing (`cubic-bezier(.68,-.55,.27,1.55)`)
- `translateY` > 1px
- Layout-changing hover animations (margin/padding/width change)
- Entrance animations on initial page load

### 5.2 Accessibility Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
Blanket override — must be included in project entry CSS.

### 5.3 Focus Ring
```css
*:focus        { outline: none; }
*:focus-visible { outline: 2px solid var(--purple, #4739E7); outline-offset: 2px; }
```
Mouse users: no ring. Keyboard users: clear 2px purple ring, 2px offset.

### 5.4 Voice / Brand Copy Constraints (from README anti-patterns)
- No gradient-faded hero text
- No em-dashes in user-facing copy (use commas or periods)
- No nested scrolling containers
- Accessible name and visible button text must match (Playwright `getByRole({name})` compatibility)

---

## 6. THEMES

The design system is **light-mode only**. There is no formal dark/high-contrast theme in the source CSS.

### 6.1 What Exists
- `color-scheme: light` set on `.ccc-root` — forces native controls to light mode
- `--glass-bg: rgba(255,255,255,0.95)` — always white-based
- `--paper: #FFFFFF` / `--cream: #FAF8F4` — always light surfaces
- `--navy-900: #0A1849` on the app header (dark surface, but not a "dark theme" — just the header)

### 6.2 What Would Need to Change for Dark Mode
The following tokens would need dark-mode variants (none are defined in source):
- All `--paper` / `--cream` / `--gray-50` surfaces
- All `--glass-bg` values
- All `--gray-*` text scales
- `--text-strong` / `--text-mid` / `--text-soft`
- `--border` / `--glass-border`

The renderer's `tokens.css` (see Gap Analysis below) implements a **de facto dark theme** using a separate token vocabulary (`--color-navy-900` as background, `--color-text-primary: #f5f3ff`), but this is not formally bridged to the design system's CCC/Glass tokens.

---

## 7. GAP ANALYSIS

### 7.1 Renderer Token System (Current State)

**File:** `apps/renderer/src/design/tokens.css`

The renderer ships its own independent token set under `:root` using a different naming convention (`--color-*`, `--space-*`, `--text-*`, `--leading-*`, `--motion-*`, `--shadow-*`). Key values:

| Renderer token | Value | DS equivalent | Match? |
|---|---|---|---|
| `--color-navy-900` | `#0a1849` | `--navy` / `--navy-900` | ✓ Same hex |
| `--color-navy-700` | `#182a6b` | `--navy-700: #1A2C7A` | ✗ Different (#182a6b vs #1A2C7A) |
| `--color-gold-500` | `#c9a14b` | `--gold: #FFBA00` | ✗ Completely different (muted gold vs saturated gold) |
| `--color-purple-500` | `#4739e7` | `--purple: #4739E7` | ✓ Same |
| `--color-success` | `#4fae6a` | `--ok: #00B1A2` (CCC) or `--success: #059669` (Glass) | ✗ Third value |
| `--color-error` | `#ff5c5c` | `--err: #DC2626` | ✗ Different |
| `--color-warning` | `#e9a840` | `--warn: #FFBA00` | ✗ Different |
| `--radius-sm` | `3px` | `--radius-sm: 8px` (Glass) or `--r-sm: 2px` (CCC) | ✗ Conflicts both |
| `--radius-md` | `8px` | `--radius-md: 12px` (Glass) or `--r-md: 4px` (CCC) | ✗ Conflicts both |
| `--text-sm` | `13px` | `--fs-sm: 13px` (CCC) | ✓ Same value, different name |
| `--space-4` | `16px` | `--sp-4: 16px` (CCC) | ✓ Same value, different name |

**Renderer also imports** `apps/renderer/src/styles/glassmorphic.css` — a verbatim copy of the design system's `source-css/glassmorphic.css` PLUS additional tokens appended at the end:
```css
--color-navy-900: #0a1849;
--color-gold-500: #c9a14b;        /* NOTE: different gold than DS --gold: #FFBA00 */
--color-purple-500: #4739e7;
--color-navy-700: #182a6b;        /* NOTE: different from DS --navy-700: #1A2C7A */
--color-navy-500: #2a3f8a;
--color-purple-400: #6a5cf0;
--color-rigor-clean: var(--color-gold-500);
--color-rigor-draft: #d6883a;
```

---

### 7.2 Renderer Styles Directory (Current State)

Only **2 CSS files** in `apps/renderer/src/styles/`:
- `glassmorphic.css` — DS Glass layer (verbatim + extensions)
- `typography.css` — DS typography (verbatim copy)

**Missing from renderer `styles/`:**
- `modals.css` — not imported (modal-style components written ad-hoc in screens)
- `panels.css` — not imported
- `toasts.css` — not imported
- `ccc-scoped.css` — not imported (no CCC Editorial layer present)

---

### 7.3 Screen Styling Approach

All screens in `apps/renderer/src/screens/` use **inline `style={{}}` props** referencing `tokens.css` variables. Example from `Home.tsx`:
```jsx
style={{ background: 'var(--color-navy-900)', fontFamily: '-apple-system, "SF Pro Display", "Inter", system-ui, sans-serif' }}
```

**Observations:**
- Hardcodes `SF Pro Display` as first font choice — not in design system
- References `--color-navy-700` (renderer value: `#182a6b`) not `--navy-mid` (DS value: `#1a2a5e`)
- No use of `.glass-card`, `.glass-btn-primary`, `.glass-badge`, or any DS class names in Home.tsx (inline styles only)
- No use of CCC editorial classes anywhere in renderer

---

### 7.4 Gaps: EXISTS vs MISSING vs CONFLICTS

#### EXISTS in Renderer (aligned)
- `glassmorphic.css` loaded with Glass tokens under `:root`
- `typography.css` loaded (verbatim match)
- `tokens.css` with dark-theme token set
- `--navy` / `--purple` brand anchors at correct hex values
- Shimmer keyframe (`@keyframes shimmer`) present in `glassmorphic.css`
- Phase pulse animation present
- `glass-card`, `glass-btn-primary`, `glass-badge-*` classes defined (available but not used in screens)

#### MISSING (defined in DS, absent from renderer)
1. **CCC Editorial layer entirely** — no `ccc-scoped.css`, no `.ccc-root` scope, no CCC components. The KPI strip, sub-cards, sidebar tree, breadcrumb, filter bar, and all CCC patterns are absent.
2. **`modals.css`** — `at-modal-*` classes not available; modals likely recreated ad-hoc
3. **`panels.css`** — `at-pp-*` classes not available
4. **`toasts.css`** — `at-toast-*` classes not available; toast system undefined
5. **Spacing tokens `--sp-*`** — CCC spacing scale absent; renderer uses `--space-*` with same values but incompatible names
6. **`--fs-*` type scale** — CCC font-size tokens absent; renderer uses `--text-*` scale
7. **`--tracking-*` tokens** — no letter-spacing tokens in renderer; eyebrow pattern (`0.14em`) must be hardcoded inline
8. **`prefers-reduced-motion` global override** — not present in renderer CSS
9. **`:focus-visible` purple ring** — renderer uses `box-shadow: var(--focus-ring)` (purple-500 glow) which is functionally equivalent but different visual
10. **Noise overlay (`.ccc-root::before`)** — absent
11. **Selection color (`::selection` yellow-500 + navy)** — absent
12. **`overflow: clip` discipline** — not documented or enforced in renderer

#### CONFLICTS (value mismatches)
1. **Gold token**: DS `--gold: #FFBA00` (saturated) vs renderer `--color-gold-500: #c9a14b` (muted). Same semantic role, different colors — will produce visible brand inconsistency.
2. **Radius naming collision**: `--radius-sm: 8px` (DS Glass) vs `--radius-sm: 3px` (renderer `tokens.css`). Both are in `:root`. Since `tokens.css` and `glassmorphic.css` both declare `--radius-sm`, load order determines which wins. Last import wins — if `tokens.css` loads after `glassmorphic.css`, all Glass components using `--radius-sm` render at 3px instead of 8px.
3. **`--radius-md`**: DS Glass `12px` vs renderer `8px`
4. **Navy-700 divergence**: DS `#1A2C7A` vs renderer `#182a6b`
5. **Success color**: DS Glass `#059669`, DS CCC `#00B1A2`, Renderer `#4fae6a` — three different greens for "success"
6. **Toast system incompatibility**: `toasts.css` uses dark glassmorphic variant (dark transparent bg + blur + slide-in animation); CCC prescribes navy opaque + left-border + opacity-only fade. Two incompatible implementations.
7. **Font-mono**: DS Glass specifies `'SF Mono', 'Fira Code', 'Cascadia Code'` but DS CCC specifies `'JetBrains Mono', 'SF Mono', Consolas'`. Renderer `glassmorphic.css` retains Glass mono stack — JetBrains Mono (required for eyebrow pattern) is never loaded.

---

### 7.5 Top 5 Gaps (Priority for TRACK 6)

1. **`--radius-sm` collision breaks Glass components.** `tokens.css` (3px) and `glassmorphic.css` (8px) both declare `--radius-sm` in `:root`. Load-order conflict silently overrides the Glass radius system. Must be resolved by either namespacing renderer tokens or removing the duplicate declaration.

2. **Gold color divergence is a brand error.** `--gold: #FFBA00` (DS) vs `--color-gold-500: #c9a14b` (renderer). The W30 trough chip in `Home.tsx` uses `rgba(201,161,75,0.12)` — a hardcoded muted gold — instead of the DS saturated yellow. This is a visible off-brand color on the primary screen.

3. **No modal/panel/toast CSS classes loaded.** All three overlay systems (`at-modal-*`, `at-pp-*`, `at-toast-*`) are defined in the DS source CSS but not imported into the renderer. Any overlay UI is implemented ad-hoc without the design system's established patterns.

4. **JetBrains Mono never loaded.** The CCC eyebrow pattern (the "50% of visual identity") requires JetBrains Mono. No `<link>` or `@import` for this font exists in the renderer. The eyebrow pattern is impossible to implement correctly with the current setup.

5. **Three incompatible success colors across the codebase.** `#059669` (Glass), `#00B1A2` (CCC), `#4fae6a` (renderer `tokens.css`). Status feedback — the most user-facing semantic color — is visually inconsistent depending on which component renders it. A single `--color-success` must be aligned before the UI overhaul ships.

---

*End of CCC Design System Inventory — 2026-05-28*
