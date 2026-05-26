# Pre-Mortem Library Index

**Purpose:** Failure-mode catalog. Each pre-mortem describes a scenario, its probability and impact, concrete early-warning signals, preventive mitigation, and the response playbook if it happens anyway. Full design in `../Strategic_AI_Conviction_Backbone.md`.

Last reviewed: 2026-05-22
Active pre-mortems: 13

## Active pre-mortems

| ID | Title | Probability | Impact | Related positions |
|---|---|---|---|---|
| PM-001 | Barclays calls the loan / covenant trip | 15% | Existential | POS-003, POS-006 |
| PM-002 | Top federal customer non-renews | 25% | High | POS-004 |
| PM-003 | Key engineering lead resigns mid-crisis (Scott Perian) | 30% | High | POS-007 |
| PM-004 | International HED segment collapses | 20% | Existential | POS-004 |
| PM-005 | AWS audit finds uncommitted overage | 20% | Medium | POS-001 |
| PM-006 | May 10 cash forecast has major methodology error | 10% | Existential | POS-002, POS-003 |
| PM-007 | Chasen exits or is replaced before recap closes | 15% | High | POS-005 |
| PM-008 | Daniel Hansen voluntary exit (or forced behavioral) | 25% | High | POS-007 |
| PM-009 | Abhinav Khawarey sole-PM SPOF materializes | 15% | Medium | POS-007 |
| PM-010 | Ed exit triggers Sabina exit cascade | 35% | High | POS-007, POS-005, DEC-007 |
| PM-011 | Q3 FY26 renewal cliff materially worse than modeled (75% baseline → 65-72% compound default) | 35% | High | POS-013, POS-015 |
| PM-012 | Ed Miller exit destabilizes Daniel/Sabina/Massimo/Kendall before retention conversations land | 25% | High | POS-014, POS-016 |
| PM-013 | 2026 pricing model anchoring leaks via reseller/Carahsoft/migration; renewal narrative breaks 6-12mo | 40% | Medium-High | POS-013, POS-015 |

## Discipline
1. Every Pass 3 red-team finding involving an external party gets filed as either a new pre-mortem or an update to an existing one.
2. Quarterly review: walk every pre-mortem. Update probability based on signals observed (or not observed).
3. Monday tripwire scan (financial-tripwires only) catches early-warning signals.

## File naming
`PM-NNN-short-slug.md` — three-digit zero-padded ID.
