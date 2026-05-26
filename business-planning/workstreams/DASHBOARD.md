# Workstream Dashboard

**Purpose:** A coherent view of the 12 turnaround workstreams running in parallel. Status, ownership, cash impact, ARR impact, dependencies, next milestone. Full design in `../Strategic_AI_Stakeholder_Workstream_Adversarial.md`.

Last regenerated: 2026-05-22 (post class-org-institutional-read /deep run)

## Workstream status

| ID | Title | Owner | Phase | Status | Next milestone |
|---|---|---|---|---|---|
| WS-01 | Cash Defense / July 26 Trough | Russell + CFO | execution | **RED** | 2026-06-01 lock levers |
| WS-02 | ARR Retention / Renewal Risk | Head of CS | planning | YELLOW | Top-5 plans by 2026-06-15 |
| WS-03 | Org Redesign / Right-Sizing | Russell | planning | YELLOW | Slate to CEO by 2026-06-10 |
| WS-04 | AWS / Infrastructure Cost | Tech lead + Russell | execution | YELLOW | Lock cuts by 2026-06-05 |
| WS-05 | AR/AP Working Capital | CFO + Controller | execution | YELLOW | AR pull complete by 2026-06-15 |
| WS-06 | Barclays Relationship | CFO + Russell | monitoring | YELLOW | Monthly report 2026-06-01 |
| WS-07 | Board / Holdco Narrative | CEO + Russell | execution | GREEN | Q2 deck by 2026-06-20 |
| WS-08 | Product / AI-Native Repositioning | Russell (vision phase) → Scott + Chasen | **vision-development** | **RED** | AI vision deliverable by 2026-07-31 |
| WS-09 | GTM Refinement | Russell (lead post-Ed) + Top AE | execution | **ORANGE** | Q3 contingency + Tampa General + Ed retention by 2026-06-04 |
| WS-10 | Russell COO Comp Negotiation | Russell | execution | YELLOW | Chasen counter pending |
| WS-11 | Russell Parallel Job Hunt | Russell | execution | GREEN (private) | Apply daily briefing recurring |
| WS-12 | M&A Optionality | CEO + Holdco | discovery | YELLOW | Holdco intro pending |

## Cross-Front Heat Map

The dependencies that matter — second-order effects that must be considered when any single workstream changes posture:

- **WS-01 ↔ WS-03** — Severance timing. Org changes don't help July trough; cash plan can't assume people-cost savings before Q4.
- **WS-01 ↔ WS-06** — Trough drives the lender conversation. Any WS-01 deterioration directly affects WS-06 posture.
- **WS-02 ↔ WS-08** — Retention needs a credible repositioning story. Customer renewal calls in Q4 are easier if AI-native narrative is real.
- **WS-03 ↔ WS-09** — Org follows GTM, not vice versa. Cutting roles before deciding the new motion is the most common reorg failure.
- **WS-04 ↔ WS-01** — AWS cuts are the highest-velocity July contributor. Lock cuts → feed cash plan.
- **WS-05 ↔ WS-01** — AR/AP working capital release is the July trough's largest single contributor.
- **WS-06 ↔ WS-12** — Lender consent is required for most M&A paths. Barclays posture defines M&A optionality.
- **WS-07 ↔ all** — Board narrative consumes outputs from every other workstream.
- **WS-10 ↔ WS-11** — Russell's negotiation leverage depends on the credibility of the walk-away track.
- **WS-08 ↔ WS-09** — Product positioning and GTM motion design must move together.

## Status criteria (reference)

| Status | Cash + ARR criteria |
|---|---|
| GREEN | Trough cash >$500K projected; covenant cushion >20%; ARR trend stable |
| YELLOW | Trough $250-500K; covenant cushion 10-20%; ARR deteriorating but managed |
| RED | Trough <$250K or covenant cushion <10% or accelerating ARR decline |

## Discipline

1. Every `/deep` topic tags its primary + secondary workstream IDs at start.
2. Pass 2 reconciliation runs mandatory cross-front check: "What other workstreams does this position affect? Second-order impact?"
3. Pass 5 updates `last_updated` and `next_milestone` on every workstream advanced.
4. Dashboard auto-regenerated weekly by scheduled task (Sundays 8pm ET).

## Pre-seeded workstream files (materialized 2026-05-21)

All twelve workstreams are real files in this directory:
- `WS-01-cash-defense.md` (RED)
- `WS-02-arr-retention.md` (YELLOW)
- `WS-03-org-redesign.md` (YELLOW)
- `WS-04-aws-infra-cost.md` (YELLOW)
- `WS-05-working-capital.md` (YELLOW)
- `WS-06-barclays-relationship.md` (YELLOW)
- `WS-07-board-narrative.md` (GREEN)
- `WS-08-product-ai-repositioning.md` (YELLOW)
- `WS-09-gtm-refinement.md` (YELLOW)
- `WS-10-russell-coo-comp.md` (YELLOW)
- `WS-11-russell-job-hunt.md` (GREEN private)
- `WS-12-ma-optionality.md` (YELLOW)

Full schema in `../Strategic_AI_Stakeholder_Workstream_Adversarial.md` (§ARTIFACT 2).
