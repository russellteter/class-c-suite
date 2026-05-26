---
id: POS-004
slug: intl-hed-concentration-survivability-risk
title: International Higher Ed at 47.9% concentration is the single biggest survivability risk
status: superseded
confidence: 70
created: 2026-05-15
last-updated: 2026-05-21
last-retested: 2026-05-21
supersedes: null
superseded-by: POS-012
authored-by: claude-pass2-cro-lens
decision-this-supports: null
predictions-spawned: [PRED-004]
source: Salesforce ARR-by-vertical pull 2026-05 + memory class_financial_state_may_2026.md
supersession-reason: "Class has already exited HED forward investment as of 2026 — zero marketing dollars, no demand-gen. The trailing-book concentration risk POS-004 framed has been replaced by the more accurate runoff math: the retention book is in managed-runoff mode (POS-012), the Q3 FY26 cliff is the primary cash event (POS-013), Class's Helmer Powers are thin (POS-014), and new business covers only 23% of expected churn (POS-015). POS-004 is superseded by POS-012 + POS-013 + POS-014 + POS-015 collectively. Moved to superseded status 2026-05-21."
---

## Claim
At 47.9% ARR concentration, International Higher Education is the single largest existential risk vector to Class. A 25% segment compression (plausible in a single budget cycle — precedent: 2024 EU university procurement freeze affected 3 of Class's top 10) cuts ARR by ~$4.3M, more than any other observable risk vector including a competitive product launch or a single largest customer non-renewal.

## Evidence
- Salesforce ARR-by-vertical pull, May 2026: 47.9% of total ARR in `Account_Vertical_Segment__c = "International Higher Ed"`
- Precedent: 2024 EU university procurement freeze affected 3 of Class's top 10 EU customers (memory + CSM call notes)
- Memory `class_financial_state_may_2026.md` — concentration confirmed as Q2 2026 number

## Dependencies
- None directly; affects every downstream segment-strategy position

## Counter-evidence (would force revision)
- NRR on the segment is currently 108% YTD (offset)
- No observed budget-freeze signals across top accounts as of May 21
- Segment diversification plan in WS-09 GTM successfully reduces concentration to <35% over 12 months

## Operating implication
This is a 70%-confidence position, NOT a 90%. NRR offset is real and segment health today is strong. But the asymmetry is severe — concentration cuts both ways in good times and bad. The medium-term play is diversification through WS-09 (GTM refinement toward K-12 and corporate L&D). The near-term play is heavy executive sponsorship cadence on the segment's top-10 accounts so any signal is caught early (PM-002 + PM-004 cover the downside).

This position cannot move above 70% confidence until product telemetry (Amplitude/Mixpanel/Pendo) gives us segment-level usage signal. That's v3.
