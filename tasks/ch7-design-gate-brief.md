# Ch.7 Design Gate Brief — Home + 8 Playbook Tiles + Open Q&A Bar

> Build the html-driven-codev design gate for Ch.7. Mirrors the Ch.6 pattern (which Russell approved on 2026-05-27). Russell picks one variant per surface + may annotate refinements; approval persists as `APPROVED.md`.

## Repo + reference
- Repo: `/Users/russellteter/Claude Code Projects/c-suite/` (quote — path has spaces).
- **Ch.6 reference design (mirror this pattern):** `~/Desktop/csuite-ch6-design/` — see `index.html` (nav), `*-A.html` / `*-B.html` (variant pairs), `approve.html` (form), `server.py` (POST handler → `/tmp/csuite-ch6-decisions.json`), `launch.sh` (one-command start), `APPROVED.md` (post-submission output).
- **Spec source:** `docs/decisions/0009-ch7-playbooks-home.md` §11 (home layout + data substrate) + §13 (locked spec gaps) + ADR list of 8 playbooks in §3.2.
- **Inherit the design system from Ch.6 mockups.** Navy 900 / navy 700 / gold 500 / purple 500 palette. `--color-*` CSS variables verbatim. `-apple-system, 'SF Pro Display'` font stack. 8px radius. Glassmorphic surface layers. Do not invent a new system.

## Deliverable
Build a folder at `~/Desktop/csuite-ch7-design/` containing:

| File | What |
|---|---|
| `index.html` | Nav landing — links to each variant pair + the approve form. Match Ch.6 index.html structure. |
| `home-A.html` | **Home variant A — full data (canvas/grid emphasis).** All 6 home sections from ADR-0009 §11.1 populated with realistic sample data. See §1 below. |
| `home-B.html` | **Home variant B — full data (dense rail emphasis).** Same data but different information density / hierarchy. See §1 below. |
| `tile-A.html` | **8-tile grid variant A — uniform tiles.** All 8 playbook tiles in 4×2 grid; each tile = identical structure (icon + name + last-run + ordinal hint). See §2 below. |
| `tile-B.html` | **8-tile grid variant B — diff-weighted tiles.** Tiles vary in size or visual weight based on usage frequency / criticality. See §2 below. |
| `openqa-A.html` | **Open Q&A bar variant A — single textbox on home.** Inline placement, focus-state expansion, submit affordance. See §3 below. |
| `openqa-B.html` | **Open Q&A bar variant B — modal/sheet on Cmd+/.** Bar collapsed by default; expands to focused modal with decomposer preview. See §3 below. |
| `approve.html` | Multi-question approval form (3 variant picks + free-text refinements field). POST to `/submit`. |
| `server.py` | Local HTTP server: serve folder + POST `/submit` → write `/tmp/csuite-ch7-decisions.json` + write `docs/decisions/0009-design-gate-approved.md` (use repo path, NOT vault). |
| `launch.sh` | One-command: start server, open `http://127.0.0.1:8766/` (use 8766, not 8765 — avoid Ch.6 port collision). |

## §1 Home variants — both must include (full data per ADR-0009 §11)
1. **Top strip:** Today's date (2026-05-27) + W30 trough proximity ("N days to next retest"). + cost meter ribbon (window-remaining tokens, today's spend).
2. **Open Q&A bar.** Placement differs in §3 variants but both home variants must show one inline by default (variant B can show a collapsed version that expands).
3. **8 playbook tiles.** Grid placement; per-tile: ordinal (1–8), name, icon glyph, last-run timestamp (e.g. "Last run 2h ago"), keyboard hint ("⌘1"). See §2 for the variant differences.
4. **Workstream mini-view.** 9 status pills (use real workstream IDs WS-01 through WS-09; mix phase=execution/maintenance, status=GREEN/YELLOW/RED based on plausible values).
5. **Top open decisions (5).** One-line each: ID + title + zone link (e.g. "DEC-005 — Should Class explore strategic-option recap path? → decisions/").
6. **Proposed-writebacks counter.** Card linking to Ch.6 review pane: "3 writebacks awaiting review."
7. **Scheduled-jobs strip (5).** All 5 jobs rendered as grayed placeholders labeled "Pending Ch.10."

Realistic sample data — make it look like a real Russell-context dashboard. Pull names + numbers from `<vault>` files if it helps verisimilitude (you may grep BLOCKERS.md / build-log.md / decisions for plausible content). **Do not fabricate company-specific data Russell wouldn't recognize** — use placeholder names ("Stakeholder X") if uncertain.

## §2 Playbook tile variants
The 8 playbooks (ADR-0009 §3.2):
1. **Cash lever vs trough analysis** — `cash_lever` — 💰
2. **GTM resource reallocation** — `gtm_realloc` — 🎯
3. **Strategic option evaluation** — `strategic_option` — ♟️
4. **Stakeholder 1:1 prep** — `stakeholder_1_1` — 🤝
5. **Board narrative / deck prep** — `board_narrative` — 📊
6. **Should we fire / restructure X person** — `restructure_decision` — ⚖️
7. **Pre-mortem on a proposed action** — `pre_mortem` — 🔍
8. **Quick multi-lens read** — `quick_read` — ⚡

(Don't use emoji in code; use them in the mockup HTML for visual scanning. Russell is fine with emojis in design surfaces, just not in code/commit/product copy.)

- **Variant A (uniform).** All 8 tiles identical size + visual weight; ordinal + icon top-left; name middle; last-run + keyboard hint bottom.
- **Variant B (diff-weighted).** 2× larger tiles for high-frequency playbooks (cash_lever, quick_read, stakeholder_1_1); smaller tiles for high-stakes-rare (strategic_option, restructure_decision, board_narrative). Pre-mortem + gtm_realloc are medium.

## §3 Open Q&A bar variants
- **Variant A — inline on home.** Single multiline textbox right above the playbook tile grid. Always visible. Focus-state expands height. Submit button + Cmd+Enter hint. Below input: a small "decomposer preview" label (empty until Russell types; shows lens + MCP routing as they type per §12.2 LLM decomposer behavior — fake static preview is fine for mockup).
- **Variant B — modal on Cmd+/.** Bar collapsed to a thin pill at the top ("Press ⌘/ for Open Q&A"). On focus / Cmd+/, expands into a centered modal (overlay) with the textbox + decomposer preview + plan-approval countdown preview ("10s auto-approve"). Body content (tiles + dashboard) visible behind a 40% scrim.

## §4 Approval form (`approve.html`)
- 3 radio-group questions (one per surface): pick **A** or **B** for Home, Tiles, Open Q&A.
- Free-text textarea: "Refinements (optional) — anything to tweak in the picked variant."
- **Recommendations.** Pre-select the option you genuinely recommend with a "(Recommended)" badge. Justify the recommendation in a small rationale line next to each option. Russell's Ch.6 pattern: he picked A across with 3 refinements. Don't bias the form — make the recommendations defensible. Suggested defaults if you can't decide: Home A, Tiles A, Open Q&A A — but pick the design that's actually better and back it up.
- POST to `/submit` writes:
  1. `/tmp/csuite-ch7-decisions.json` — `{ home: "A"|"B", tiles: "A"|"B", openqa: "A"|"B", refinements: "..." }`
  2. `docs/decisions/0009-design-gate-approved.md` — markdown table (see Ch.6 `APPROVED.md` for format).
- Confirmation page: "Approved. Server can be killed (Cmd+C in terminal)."

## §5 Constraints
- Self-contained: no external CSS or JS. Inline `<style>` and `<script>`. No fonts beyond system.
- Use the exact `--color-*` token set from `~/Desktop/csuite-ch6-design/index.html` :root. Adding new tokens is OK if needed; don't replace.
- Port 8766. Output JSON at `/tmp/csuite-ch7-decisions.json`. Approved-md at `docs/decisions/0009-design-gate-approved.md` (the repo, **not** the vault — Ch.6 wrote to repo too).
- `launch.sh` must be `chmod +x`'d and must `python3 server.py &` then `sleep 0.5 && open http://127.0.0.1:8766/`.
- Don't auto-open the browser from `server.py` (Russell may not want it). `launch.sh` opens.
- Do **not** start the server yourself in this task — leave that to Russell. Just build the files.

## §6 Quality
- Test each HTML file renders standalone (open in Safari + verify no console errors).
- Test the form POST handler with `curl -X POST http://127.0.0.1:8766/submit -d '{"home":"A","tiles":"A","openqa":"A","refinements":"test"}'` after starting the server (you may briefly start to verify, but kill it before reporting done).
- Mockups should look polished — Russell explicitly praised the Ch.6 mockups for production-grade visuals. Glassmorphic surfaces. Realistic spacing. Hover/focus states present even if static.
- WCAG AA contrast on all text. Focus-visible outlines (Ch.6 brief explicitly required this and Russell flagged it as important).

## §7 Report back (≤200 words)
- Files written (paths).
- Whichever variant you recommend per surface + 1-line rationale each.
- Anything you needed to invent / decide that wasn't in the brief.
- The `launch.sh` invocation Russell should run.

Do **not** auto-commit. Russell may want to inspect before committing the mockup files. The `docs/decisions/0009-design-gate-approved.md` will commit naturally after Russell submits the form (post-commit hook handles it via the orchestrator's follow-up commit).
