---
id: PM-005
slug: aws-audit-overage
probability: 20
impact: medium
last-reviewed: 2026-05-21
related-positions: [POS-001]
related-workstreams: [WS-04, WS-01]
depends-on: []
---

## Scenario
AWS account review surfaces $300-600K of usage outside the EDP (Enterprise Discount Program) commit, billed retroactively at on-demand rates. Hits cash at the wrong moment.

## Early-warning signals
- AWS account team requests a "commitment review" meeting (unprompted)
- CUR (Cost and Usage Report) data shows on-demand drift in regions outside primary
- Service-level spend in regions not covered by EDP terms
- New AWS account team rep assigned (rotation often surfaces audit cycle)

## Mitigation (preventive)
- Monthly CUR review (already in class-aws-connector skill recovery procedure)
- EDP coverage report quarterly
- Budget alerts at 80/90/100% of commit
- Tag enforcement on new resources to ensure billing attribution

## Response playbook
- Negotiate retroactive coverage via EDP true-up (lower effective rate)
- If denied, restructure as multi-year commit extension at lower rate (longer commitment = better rate)
- If both denied, identify $X in idle resources to immediately decommission as offset
- Notify CFO and Barclays only if material to monthly reporting
