---
id: POS-001
slug: aws-90day-ceiling-12pct
title: AWS 30% cost reduction is infeasible in 90 days; achievable ceiling is ~12%
status: active
confidence: 75
created: 2026-05-19
last-updated: 2026-05-21
last-retested: 2026-05-21
supersedes: null
superseded-by: null
authored-by: claude-pass2-cfo-lens
decision-this-supports: DEC-004
predictions-spawned: [PRED-007, PRED-008]
source: aws_data/*.json + class-aws-connector skill + Cash Lever Model v5 sheet 03_AWS_DeepDive
---

## Claim
AWS infrastructure cost cannot be reduced 30% within 90 days without service degradation. Achievable ceiling is approximately 12% from reserved-instance optimization, idle-resource sweeps, and S3 lifecycle policies. Anything beyond requires architectural change with engineering capacity Class doesn't have during the renewal cycle.

## Evidence
- AWS Cost Explorer pull, May 2026: ~73% of class-org spend covered by reserved-instance commitments through Q3.
- Class engineering capacity: 6 senior engineers, 4 booked on renewal-critical features through Q3.
- Comparable SaaS benchmark: similar $35M-ARR companies cut ~14% in 6 months with dedicated cost-engineering pods; Class has none.
- File: `outputs/aws_data/svc_class.json`, `outputs/aws_data/ri_class.json`

## Dependencies
- POS-006 (engineering capacity locked through renewal cycle)

## Counter-evidence (would force revision)
- A third-party FinOps engagement funded and onboarded in <30 days
- Discovery of >$50K/mo in idle Dev/Staging environments not yet counted
- Chasen approves degraded p95 latency in non-customer-facing services

## Operating implication
Stop modeling AWS cuts >12% in the cash plan. The W30 trough cannot be solved through infrastructure reduction. See POS-003 for the lever stack that actually works.
