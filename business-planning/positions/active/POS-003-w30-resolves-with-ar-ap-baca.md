---
id: POS-003
slug: w30-resolves-with-ar-ap-baca
title: The W30 trough resolves with AR pull-forward + AP deferral + BACA release, not headcount or infra cuts
status: active
confidence: 80
created: 2026-05-19
last-updated: 2026-05-21
last-retested: 2026-05-21
supersedes: null
superseded-by: null
authored-by: claude-pass2-cfo-lens
decision-this-supports: DEC-002
predictions-spawned: [PRED-001, PRED-002, PRED-003]
source: Cash Lever Model v5 sheet 07_Weekly_Engine + memory class_restricted_cash.md
---

## Claim
The W30 trough resolves operationally with three concurrent levers: (a) AR pull-forward on top-8 invoices ($1.4M targeted), (b) AP deferral on non-critical vendors ($600K targeted), (c) BACA $2.5M restricted-cash release request to Barclays. Together they clear the trough with margin. Headcount and infra cuts contribute zero to W30.

## Evidence
- Cash Lever Model v5, sheet `07_Weekly_Engine` — three-lever stack mathematically clears the trough by ~$650K with execution discipline.
- Memory `class_restricted_cash.md` — BACA facility documents permit release with covenant-compliance evidence.
- Top-8 AR concentration analysis: $1.4M pullable within timing window per CSM team.

## Dependencies
- POS-001 (AWS isn't a near-term lever — confirms what's NOT in the stack)
- POS-002 (headcount isn't a near-term lever — same)
- POS-006 (severance spread-mode binds the headcount question)
- PRED-001 (Barclays approves BACA release by July 15)

## Counter-evidence (would force revision)
- Barclays denies BACA release or delays >30 days
- Top-3 AR customers stretch their own AP and refuse early payment
- Auditor flags AP deferral as going-concern signal (would force reversal)
- One or more top-8 AR pulls trigger renewal-cycle damage

## Operating implication
The W30 question is operational, not structural. Execute the three-lever stack with weekly tracking against the Cash Lever Model `07_Weekly_Engine` sheet. Hold Holdco bridge optionality (DEC-002 Option 4) in reserve, unspoken, as the tripwire response if BACA release is denied.
