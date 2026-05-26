---
id: POS-013
slug: q3-fy26-primary-cash-event
title: Q3 FY26 is Class's primary cash event of the year, not W30
status: active
confidence: 80
created: 2026-05-21
last-updated: 2026-05-21
last-retested: 2026-05-21
supersedes: null
superseded-by: null
authored-by: claude-pass2-cfo-lens + pass3-redteam-attack-1+attack-7
decision-this-supports: DEC-NEW-q3-contingency-2026
predictions-spawned: [PRED-007, PRED-008]
source: class-gtm-data skill key-numbers.md (Q3 FY26 ARR up for renewal $9.83M / 49% concentration); class-gtm-data retention-deep-dive.md (Q3 GDR historical 75.7%); class-gtm-data FY26 renewal risk indicators (Zero Usage 3mo 56 accts $1.06M, Zero Usage 12mo 36 accts $796K, Severe Decline 59 accts $1.6M, Flagged Possible Drop 49 accts $1.33M); SF pipeline LTM (Qualified Renewal 515 / $15.24M open)
---

## Claim
The Class cash event that determines FY27 viability is not the W30 trough on July 26, 2026 ($111,766 — a passable trough). It is Q3 FY26 (Jan-Mar 2026) — $9.83M in renewals coming due at last year's 75.7% Q3 GDR, against a backdrop of 92 zero-usage accounts ($1.86M ARR) likely Q3-clustered. Modeled probable Q3 churn is $2.39M; the compound-default scenario (zero-usage + Tier 9-11 EDU compression + WS-08 dark + Ed exit timing) drives a conservative re-estimate to $2.9-3.4M. The Q3 churn lands as cash in W36-W44, and it eats the AR pull-forward lever that is currently scheduled to solve W30.

## Evidence
- class-gtm-data: Q3 FY26 ARR up for renewal = $9.83M of $20.32M annual = 49% concentration in a single quarter
- class-gtm-data Q3 FY25 GDR was 75.7% (worst quarter), accounting for 51% of all FY25 annual churn $
- FY26 risk indicators: 56 accounts Zero Usage 3mo ($1.06M), 36 Zero Usage 12mo ($796K), 59 Severe Decline ($1.6M), 49 Flagged Possible Drop ($1.33M)
- 75.7% × $9.83M = $7.44M retained → $2.39M probable churn (modeled baseline)
- 65% retention floor (compound-default scenario) × $9.83M = $6.39M retained → $3.44M churn
- Tier 9-11 EDU accounts (RMIT, UNSW Sydney, Edinburgh, Sheffield, Curtin, Norwegian Univ Sci&Tech, etc.) compress to ~49% gross margin at current rates per 2026 Pricing Consolidation Analysis — they are losing money at current prices and may be the underwater-account candidates for accelerated repricing or soft-landing
- Russell answer Q11/Q12 confirms the underwater + large-HED repricing question is critical and unresolved

## Dependencies
- Cash Lever Model v5 has W30 modeled at $111,766 — Q3 cash impact NOT modeled in 07_Weekly_Engine
- AR pull-forward lever (scheduled for July trough) is the same lever needed for Q3 cliff — cannot use twice
- BACA $2.5M restricted-cash release is a one-time event — cannot solve both W30 AND Q3

## Counter-evidence (would force revision)
- Q1 FY26 actual GDR comes in materially above 80.1% early-read by mid-June
- Zero-usage account list shows <50% Q3 concentration (i.e. spreads across quarters)
- Successful repricing of underwater accounts produces incremental cash by end of Q3
- A material strategic-acquirer engagement closes by Q3-end with cash bridge

## Operating implication
Three immediate actions follow:

1. **Q3 contingency planning gets elevated to a parallel workstream alongside W30 cash defense.** WS-02 (ARR Retention) goes from YELLOW to ORANGE in the dashboard. The "next milestone" is no longer "Top-5 plans by 2026-06-15" — it's "Top-30 Q3 zero-usage triage by 2026-06-15, lever sequencing locked by 2026-06-30."

2. **The AR pull-forward lever must be modeled twice** — once for W30, once for Q3 — and the order matters. AR consumed for W30 is unavailable for Q3.

3. **The board narrative for the June board meeting needs Q3 cliff visibility.** The May deck shows W30 but does not show Q3. If the board only sees W30, the W30 win in late July triggers false confidence; the Q3 reveal in October is then the worst possible cadence.

## Predictions spawned

**PRED-007:** Q3 FY26 actual GDR will land between 70% and 78%. Resolution date: 2026-10-15. Resolution criterion: class-gtm-data Q3 FY26 GDR closed-quarter number.

**PRED-008:** Of the 92 zero-usage accounts as of May 2026, ≥55% will be in Q3 FY26 renewal cohort. Resolution date: 2026-07-15 (cohort identification complete). Resolution criterion: SF query of zero-usage accounts joined to renewal date.
