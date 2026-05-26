---
id: PM-013
slug: pricing-anchoring-leaks-renewal-narrative-breaks
title: 2026 pricing model anchoring leaks via reseller/Carahsoft/migration channels; renewal narrative breaks within 6-12 months
created: 2026-05-21
probability: 40
impact: Medium-High
related-positions: [POS-013, POS-015]
related-workstreams: [WS-02, WS-09]
authored-by: claude-pass3-redteam-attack-3
---

## Scenario
The 2026 pricing model anchoring strategy depends on existing customers NOT seeing the gap between their current contracted rate and the new list price (median gap 94% per the Pricing Consolidation Analysis). The anchoring strategy breaks the moment new pricing leaks via: (a) **VPS Learning + other resellers** publishing or talking about Class list price publicly; (b) **Carahsoft / GSA government channel pricing** (publicly posted by definition — Government FedRAMP is Corporate × 1.25); (c) **Collab→Class migration cases** where customers see they're being asked to pay 3x list and then "negotiated down" to current+ rates (this IS the leak — 70% discount workarounds tell every customer involved exactly what the gap is); (d) **Glassdoor / employee Slack** if any rep references the new pricing in cross-customer conversations; (e) **RFP cycles** where multiple customers (RMIT, UNSW, Curtin in same RFP timing) compare quotes. Within 6-12 months, enough customers know the gap that the anchoring strategy's renewal-retention effect inverts — customers see they've been overpaying and accelerate exit conversations or demand parity.

## Early-warning signals
1. Any customer (especially Tier 9-11 EDU or top-20 ARR) sends a written reference to the new pricing in a renewal conversation
2. Public posting of new pricing on Class's site or partner sites (current /pricing page, government Carahsoft posting, reseller portal)
3. Glassdoor review references Class's pricing model
4. Two or more customers in the same vertical/region negotiate renewal with reference to "we know what others are paying"
5. Reseller (VPS, eLearning Media, LABASAD, ABASAD) requests pricing transparency for end-customer presentations
6. Renewal-AM team starts seeing identical objection language across multiple accounts ("the price has changed?")
7. A consultant or sales-intelligence vendor publishes a Class pricing benchmarking report

## Preventive mitigation
1. **Internal-only pricing classification.** The 2026 pricing model docs are marked Confidential. Reinforce in writing to Sales + Marketing + Renewals that the new model is NOT customer-facing for grandfathered accounts.
2. **Renewal AM enablement on anchoring vocabulary.** Per Pass 2 CMO lens — train Emmanuel, Niko, Robert, etc. on framing: "you're grandfathered at favorable rates" without referencing the new list specifically. Russell-Sabina-Kendall co-deliver enablement.
3. **Reseller agreement language review.** VPS Learning, eLearning Media, LABASAD, ABASAD agreements specify what end-customer can see. Tighten if leakage risk material.
4. **Government channel separation.** Carahsoft/GSA public pricing is unavoidable but framed as government-specific (the 25% premium becomes the lever).
5. **Collab→Class migration playbook overhaul.** The current 70% discount workaround IS the leak. The playbook should: (a) avoid showing the new list price to migrating customers; (b) frame migration as "your service continues with new infrastructure" not "your price is changing"; (c) absorb migration cost into a multi-year deal extension at a blended rate.
6. **Underwater accounts handling per POS-013 + queued deep deliverable.** The 66 underwater accounts that need repricing introduce the most direct leak risk — handled together.

## Response playbook (if scenario triggers)
1. **Acknowledge openly with affected accounts.** Don't deny — pivot to "your grandfathered rate IS your value." Frame the gap as a service guarantee.
2. **Accelerate the most vulnerable repricing conversations** to pre-empt customer-driven inquiry. The first wave of conversations gets to set the framing; subsequent ones inherit it.
3. **Activate "service tier" reframe.** The new pricing is for net-new; the old pricing is "grandfathered service tier" — a benefit, not an oversight.
4. **Cancel any net-new "promotional" offering** that would create cross-comparison opportunities (Russell's Q10 Training Provider promotion campaign needs anchoring-leak risk assessment as part of the deep deliverable).
5. **Bring Marketing into rapid-response mode.** Craft a positioning piece on "why your existing rate is fair" that AMs can share if confronted.

## Related
- POS-013: Q3 FY26 cliff (anchoring leak accelerates Q3 churn)
- POS-015: Runoff math (anchoring break removes one of the few defenses)
- Adversarial competitor-watch (Engageli/Anthology may seek to surface Class pricing in competitive deals)
- The queued "Underwater + Large-HED repricing" deep deliverable specifically must address anchoring-leak risk as a planning constraint
