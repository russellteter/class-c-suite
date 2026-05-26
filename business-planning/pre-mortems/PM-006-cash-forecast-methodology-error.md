---
id: PM-006
slug: cash-forecast-methodology-error
probability: 10
impact: existential
last-reviewed: 2026-05-21
related-positions: [POS-002, POS-003]
related-workstreams: [WS-01, WS-06, WS-07]
depends-on: []
---

## Scenario
Methodology bug in the May 10 cash forecast (AR aging wrong cutoff date; FX revaluation missed; restricted cash double-counted) means W30 trough is materially different than reported. Either direction is destructive — worse means we missed the real crisis; better means we burned credibility with the board.

## Early-warning signals
- NetSuite reconciliation variance >2% on any single sweep
- Any line item moves by >$200K without business reason
- Discrepancy between Cash Lever Model `07_Weekly_Engine` and NetSuite cash position
- Auditor inquiry on cash methodology

## Mitigation (preventive)
- Monthly reconciliation against NetSuite by independent reviewer (not the model author)
- Document methodology decisions in DEC-003 (already done)
- weekly-cash-forecast skill source-cites every number with timestamps — creates audit trail
- Pre-emptive methodology review with auditor on any major change

## Response playbook
- Immediate disclosure to board with corrected number AND methodology fix
- Re-run lever stack against corrected forecast within 72 hours
- Brief Barclays in same cycle (controlled timing, not reactive)
- Author a `methodology_audit_2026-MM-DD.md` reference memory to prevent recurrence
