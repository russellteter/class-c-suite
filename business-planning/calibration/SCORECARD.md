# Calibration Scorecard

**Purpose:** Track whether Claude's predictions hold up — and use the feedback to improve confidence calibration on future positions. Full design in `../Strategic_AI_Conviction_Backbone.md`.

Recomputed weekly via Monday scheduled task.
Last recompute: 2026-05-21 (initial — no data yet)

## Status

| Bucket | Count |
|---|---|
| Total predictions logged | 5 (pre-seeded) |
| Resolved | 0 |
| Open | 5 |
| Ambiguous | 0 |

## Brier-band performance

| Confidence band | N resolved | Actual hit rate | Calibration |
|---|---|---|---|
| 80-100% | — | — | — |
| 60-80%  | — | — | — |
| 40-60%  | — | — | — |
| 20-40%  | — | — | — |
| 0-20%   | — | — | — |

## Patterns

(No data yet — initial scorecard. Patterns emerge after ~10 resolved predictions.)

## Adjustments applied to new positions

(No adjustments yet — initial scorecard.)

## Open predictions (active monitoring)

| ID | Linked position | Claim summary | Confidence | Resolution date |
|---|---|---|---|---|
| PRED-001 | POS-003 | Barclays releases ≥$1.5M from BACA by July 15 | 70 | 2026-07-15 |
| PRED-002 | POS-003 | Top-8 AR pull collects ≥$1.0M by July 20 | 65 | 2026-07-21 |
| PRED-003 | POS-003 | AP deferral generates ≥$500K W30 contribution | 75 | 2026-07-26 |
| PRED-004 | POS-004 | Intl HED Q3 renewal cohort closes ≥90% gross retention | 60 | 2026-10-15 |
| PRED-005 | POS-005 | Chasen does not counter COO comp below floor | 55 | at-counter |

## Discipline

1. Every position with a forward measurable claim spawns at least one prediction in `predictions/`.
2. Monday sweep resolves any prediction with `resolution-date <= today`. Russell calls TRUE / FALSE / AMBIGUOUS.
3. Scorecard auto-recomputed weekly.
4. New position confidence is shown explicitly: "Instinct: X; Calibration adjustment: Y; Stated: Z."
5. Resolved predictions archive to `resolved/`.
