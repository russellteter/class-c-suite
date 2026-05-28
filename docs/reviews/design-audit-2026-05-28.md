# Design Audit — TRACK 6 CCC/Variant-A Fidelity
**Date:** 2026-05-28  
**Auditor:** EvidenceQA (independent validator, writer-grader separation)  
**Baseline screenshots:** `docs/design-system/baseline/`  
**Method:** Playwright headless Chromium at 1440×900, computed-style verification via `browser_evaluate`

---

## Methodology

Rendered each screen via the Vite preview server (`vite.preview.config.ts`, port 5174) using test routes added by the builder. Computed styles were extracted with `getComputedStyle` to verify token values — no "looks right" claims.

---

## Per-Screen Scores

### Home (`?screen=home`) — Score: 9/10

**Baseline:** `docs/design-system/baseline/home.png`

**What I see:** Navy header (`rgb(10, 24, 73)` = `--navy` #0A1849 ✓), gradient underline present (purple → purple-400 → gold ✓), three-column body layout (200px tree | 1fr | 168px right rail ✓), 8 playbook tiles in 4×2 grid, left tree rail with eyebrow sections.

**Computed evidence:**
- `getComputedStyle(.cs-header).backgroundColor` = `rgb(10, 24, 73)` — matches `--navy` ✓
- `getComputedStyle(.cs-header, '::after').background` = `linear-gradient(90deg, rgb(71, 57, 231) 0%, rgb(145, 136, 241) 50%, rgb(255, 186, 0)...` ✓ brand contract
- `getComputedStyle(.cs-eyebrow).fontFamily` = `"JetBrains Mono", "SF Mono", Consolas, monospace` ✓
- `document.fonts.check('10px "JetBrains Mono"')` = `true` ✓
- `getComputedStyle(.cs-eyebrow).letterSpacing` = `1.4px` (resolves from `0.14em` at 10px) ✓
- `.cs-pb` (playbook tile): `borderRadius: 2px` = `--r-sm` ✓; `backgroundColor: rgb(255, 255, 255)` = `--paper` ✓
- `c9a14b` rule count in StyleSheets: 1 (from `design/tokens.css` legacy import — see defect D-1)
- `borderRadius === 3px` element count: 0 ✓ (radius collision resolved)

**Issues:**
- The W30 chip in the header correctly uses `rgba(255, 186, 0, 0.14)` ✓
- `design/tokens.css` still defines `--color-gold-500: #c9a14b` but Home does not reference it directly — no visible impact on this screen
- Playbook tiles missing freshness dot in pre-run "never run" state — correct behavior

---

### RoundTable pre-run (`?screen=roundtable`) — Score: 9/10

**Baseline:** `docs/design-system/baseline/roundtable-prerun.png`

**What I see:** Navy header with playbook title + mono stamp, gradient underline, 3-col KPI strip (SOURCES/VERIFIED/COVERAGE), em-dashes for pending values, 3×2 lens node grid, Synthesizer + Verifier footer nodes. Pre-run: all lens circles muted gray except CFO/COS which are highlighted purple (unexpected — may be fixture default).

**Computed evidence:**
- `.cs-kpi-strip` display: `grid`, background: `rgb(232, 232, 232)` = `--gray-200` gap pattern ✓
- `.cs-kpi` cell background: `rgb(255, 255, 255)` = `--paper` ✓
- `.lbl` fontFamily: JetBrains Mono ✓; letterSpacing: 1.4px ✓
- `.val` fontSize: `28px` — spec says 26px (see defect D-2)
- `.cs-node` borderRadius: `2px` = `--r-sm` ✓

**Issues:**
- KPI value font-size is 28px, CCC spec (`--fs-kpi` / inventory §1.5) specifies 26px with `-0.01em` tracking. Minor 2px deviation.

---

### RoundTable mid-run (`?screen=roundtable&state=midrun`) — Score: 9/10

**Baseline:** `docs/design-system/baseline/roundtable-midrun.png`

**What I see:** Header stamp shows "RUNNING", SOURCES shows 7 (not em-dash), "2 TOOL CALLS LIVE" pill visible in KPI strip right, active CFO lens has purple highlight, "RUNNING" label below CFO, inactive lenses muted, Synthesizer shows "Awaiting lens outputs".

**Computed evidence:** Same token checks as pre-run pass. "2 TOOL CALLS LIVE" pill styling not individually probed but visually consistent with CCC pill pattern.

---

### RoundTable complete (`?screen=roundtable&state=complete`) — Score: 9/10

**Baseline:** `docs/design-system/baseline/roundtable-complete.png`

**What I see:** SOURCES: 14, VERIFIED: 12/14, COVERAGE: 86%, Verifier node has teal border, "Verifier · 78/100" in teal ink, "CLEAN" pill in teal.

**Computed evidence:**
- `.cs-pill.success` color: `rgb(0, 94, 84)` = `--success-ink` (#005E54) ✓
- `.cs-pill.success` background: `rgb(230, 255, 249)` = `--success-soft` (#E6FFF9) ✓
- Verifier node borderColor: `rgb(0, 177, 162)` = `--success` (#00B1A2) ✓ (CCC teal, not Glass green)

---

### MemoViewer clean (`?screen=memo-viewer`) — Score: 8/10

**Baseline:** `docs/design-system/baseline/memo-clean.png`

**What I see:** Navy header with filename stamp, "VIEW AS GOOGLE DOC ↗" button (TRACK 5 output surface rendering ✓), "Draw up for Cowork" button visible (DEFECT D-1), breadcrumb eyebrow "Memo · Cash Memo · Clean" in JetBrains Mono ✓, citation badges `[cash-001]` etc in purple-soft bg with purple ink, white paper card with gray-200 border and 2px radius, memo content rendered.

**Computed evidence:**
- `.cs-eyebrow` fontFamily: JetBrains Mono ✓; letterSpacing: 1.4px ✓
- `.cs-cite` backgroundColor: `rgb(237, 236, 253)` = `--purple-soft` (#EDECFD) ✓; color: `rgb(71, 57, 231)` = `--purple` ✓; borderRadius: `2px` ✓
- `.cs-doc` backgroundColor: `rgb(255, 255, 255)` = `--paper` ✓; borderColor: `rgb(232, 232, 232)` = `--gray-200` ✓; borderRadius: `2px` ✓
- `DrawUpCTA` button background: `rgba(201, 161, 75, 0.1)` — WRONG. Source: `apps/renderer/src/components/DrawUpCTA.tsx` line 64: `color: 'var(--color-gold-500)'` + `background: 'rgba(201,161,75,0.10)'` hardcoded. Resolves to muted gold `#c9a14b` from `design/tokens.css` line 16. (Defect D-1)

---

### MemoViewer draft (`?screen=memo-viewer&variant=draft`) — Score: 8/10

**Baseline:** `docs/design-system/baseline/memo-draft.png`

**What I see:** Amber banner "DRAFT — Rigor below 70% threshold" with "Why draft? (2 reasons)" expand button, breadcrumb shows DRAFT status, rigor 61/100, no "Draw up for Cowork" button (correct — no accepted decision in draft state).

**Computed evidence:**
- `.cs-draft` backgroundColor: `rgba(255, 186, 0, 0.12)` = correct saturated gold ✓
- Draft banner left border: `rgb(255, 186, 0)` = `--gold` (#FFBA00) ✓

---

### MemoViewer degraded (`?screen=memo-viewer&variant=degraded`) — Score: 8/10

**Baseline:** `docs/design-system/baseline/memo-degraded.png`

**What I see:** "2 DATA SOURCES UNAVAILABLE" warning banner in gold/amber with TABLE/REASON/REMEDIATION table showing account + department entries, breadcrumb shows CLEAN status (base fixture), memo content below, "Draw up for Cowork" visible (Defect D-1).

**Computed evidence:**
- `.cs-degrade` backgroundColor: `rgb(255, 247, 224)` = `--warning-soft` (#FFF7E0) ✓
- `.cs-degrade` borderColor (left): `rgb(255, 186, 0)` = `--gold` ✓
- `DrawUpCTA` button: still uses `rgba(201, 161, 75, 0.1)` (same defect D-1)

---

## Summary Scores

| Screen | Score |
|---|---|
| Home | 9 |
| RoundTable pre-run | 9 |
| RoundTable mid-run | 9 |
| RoundTable complete | 9 |
| MemoViewer clean | 8 |
| MemoViewer draft | 8 |
| MemoViewer degraded | 8 |
| **Average** | **8.57** |
| **Floor** | **8** |

---

## Defects (REOPEN triggers)

### D-1 — DrawUpCTA: muted gold `#c9a14b` instead of `#FFBA00` (Medium)

**Evidence:** `getComputedStyle(DrawUpCTA button).backgroundColor` = `rgba(201, 161, 75, 0.1)`. Inline style at `apps/renderer/src/components/DrawUpCTA.tsx:64-69` hardcodes `rgba(201,161,75,0.10)`, `rgba(201,161,75,0.30)`, and `color: var(--color-gold-500)` which resolves to `#c9a14b` from `apps/renderer/src/design/tokens.css:16`. Visible on MemoViewer (clean + degraded states) header.

**Selector:** `DrawUpCTA button` (no class, inline styles only)

**Fix:** In `apps/renderer/src/components/DrawUpCTA.tsx`, replace hardcoded `rgba(201,161,75,...)` with `rgba(255,186,0,...)` and replace `var(--color-gold-500)` with `var(--gold)`. Also replace `var(--radius-base)` with `var(--r-sm)` and `var(--text-xs)` with `var(--fs-mono-xs)` (deprecated legacy tokens). OR port the button to a `.cs-btn.gold` variant in `ccc-components.css`.

**Root cause:** `DrawUpCTA.tsx` was not included in the TRACK 6 build migration scope. It still imports `design/tokens.css` (legacy) which retains `--color-gold-500: #c9a14b`.

---

### D-2 — KPI val font-size 28px vs CCC spec 26px (Low)

**Evidence:** `getComputedStyle(.cs-kpi .val).fontSize` = `28px`. CCC inventory §1.5 specifies KPI value style as `font-size: 26px`. Source: `apps/renderer/src/styles/ccc-components.css:331`.

**Selector:** `.cs-kpi .val`

**Fix:** Change `font-size: 28px` to `font-size: 26px` in `ccc-components.css:331`.

---

## Confirmed Passing (ADR-0014 gap resolutions)

| Gap | Check | Result |
|---|---|---|
| Gap 1: radius collision | `borderRadius === 3px` count = 0 | PASS |
| Gap 2: gold `#FFBA00` | W30 chip, draft banner, degrade banner all use `rgba(255,186,0,...)` | PASS (except DrawUpCTA — D-1) |
| Gap 3: modal/panel/toast CSS | `ccc-overlays.css` imported in `index.tsx` | PASS |
| Gap 4: JetBrains Mono | `document.fonts.check('10px "JetBrains Mono"')` = true | PASS |
| Gap 5: teal success `#00B1A2` | Verifier node border + CLEAN pill all = `rgb(0,177,162)` / `rgb(0,94,84)` | PASS |

## Out-of-scope (builder disclosure verified)

Connectors.tsx, TripwireBanner, CatchupToast, JobsStrip confirmed on prior styling. Not scored against hero screens. DrawUpCTA is NOT in that list — it is used on the hero screens and should have been migrated.

---

## Baseline Location

`docs/design-system/baseline/` — 7 PNG files (home, roundtable-prerun, roundtable-midrun, roundtable-complete, memo-clean, memo-draft, memo-degraded)

---

## Verdict

**REOPEN** — Average 8.57/10, floor 8. Meets floor threshold but has 2 defects requiring a targeted builder fix.

Priority fix: D-1 (DrawUpCTA muted gold — brand error visible on two MemoViewer states). D-2 (KPI font-size 2px off) is low priority but listed for completeness. A single targeted builder reopen addressing D-1 alone would bring MemoViewer screens from 8 to 9 and push the average to ~8.86.

After D-1 fix, re-screenshot `memo-clean.png` and `memo-degraded.png` to update baselines.
