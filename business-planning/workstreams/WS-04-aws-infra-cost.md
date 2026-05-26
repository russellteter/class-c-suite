---
workstream_id: WS-04
title: AWS / Infrastructure Cost Optimization
owner: Technical lead + Russell
phase: execution
status: YELLOW
status_criteria:
  green: "AWS spend tracking ≤90% of monthly forecast"
  yellow: "Spend within 90-100% of forecast"
  red:   "Spend >100% of forecast or RI coverage drops"
cash_impact:
  amount_usd: "~$30-40K/mo achievable from 12% reduction (POS-001 ceiling)"
  direction: positive
  timing: "phased through Q3"
arr_impact:
  amount_usd: 0
  direction: neutral
  timing: n/a
people_involved: ["Technical lead", Russell, "AWS account team"]
depends_on: []
depended_on_by: [WS-01]
next_milestone: "Lock identified cuts by 2026-06-05"
next_milestone_date: 2026-06-05
decisions_pending:
  - "Idle dev/staging environment sweep approval"
  - "S3 lifecycle policy aggressive vs conservative"
linked_positions: [POS-001]
linked_decisions: []
last_updated: 2026-05-21
---

## Summary
AWS CLI configured for both `class` and `collab` profiles. POS-001 caps 90-day savings at ~12%. Class side ~50 accounts, collab side ~15. Not a near-term cash lever for W30 but a sustained monthly contribution into the FY27 burn picture. weekly-cash-forecast skill pulls AWS data into the model every Monday.

## Active Workstream Notes
- 2026-05-21: AWS billing access verified both profiles. Cash Lever Model v5 sheet 03_AWS_DeepDive holds the targeted cut list.
