# Ch.7 Design Gate — APPROVED

**Submitted:** 2026-05-27 (in-chat approval; server submit failed with "Failed to fetch")
**Approves:** ADR-0009 (Ch.7 — eight playbooks + Open Q&A + home full-data)

## Variant picks

| Surface | Variant | Notes |
|---|---|---|
| Home | **B** (dense rail) | Cockpit layout — left rail keeps workstreams + decisions + writebacks always visible; right column holds cost meter + scheduled-jobs strip. |
| Playbook tiles | **A** (uniform 4×2) | ⌘1–⌘8 muscle memory requires stable ordinal positions. Freshness dots (green / amber / gray) carry recency signal without layout disruption. |
| Open Q&A | **A** (inline on home) | Zero-friction ad-hoc surface. Modal pattern (B) added an extra click/keystroke for a surface used multiple times per session. |

## §1 Refinements (none requested)

Russell approved the sub-agent's recommendations as-submitted. No layout, vocabulary, or interaction tweaks captured. If anything surfaces during Phase A build, capture as a follow-up commit against the renderer brief, not as an ADR amendment.

## §2 Implementation contracts inherited

ADR-0009 §11 (home layout + data substrate) and §13 (locked spec gaps) are unchanged. The Renderer sub-agent reads this APPROVED.md plus ADR-0009 §11 and §13 — no third spec source.

## §3 What happens next

Orchestrator dispatches Ch.7 **Phase A** in parallel per ADR-0009 §14:
- **Runtime sub-agent** — framework helpers (`evaluatePrereqs`, `decomposer`, playbook-router in `run-loop.ts`) + the 3 novel-structure playbooks (`pre_mortem`, `quick_read`, `stakeholder_1_1`) + `open_qa` module.
- **Renderer sub-agent** — home full-data implementing Variant B (dense rail) + uniform 4×2 playbook tiles (Variant A) with ⌘1–⌘8 + inline Open Q&A bar (Variant A) + plan-approval wiring per tile click.
- **Tests sub-agent** — specs for framework helpers + the 3 Phase-A playbooks + home RTL.

After Phase A lands: intermediate EvidenceQA audit, then Phase B (the 4 homogeneous playbooks — `gtm_realloc`, `strategic_option`, `board_narrative`, `restructure_decision`).
