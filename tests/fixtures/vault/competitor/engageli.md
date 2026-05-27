---
competitor: Engageli
threat_level: Medium-High → High (post-Ed-exit window)
last_updated: 2026-05-21
last_signal: 2026-05-21 (Pass 3 red-team Attack 2)
sources: [class-gtm-strategy-2026 investigation, adversarial/INDEX.md]
---

## What we know

**Profile.** Engageli is a virtual-classroom platform competitor in the Higher Ed + corporate L&D adjacent space. Founded 2020-2021; well-funded ($30M+ Series A, Benchmark + Tiger backed historically). Probably ~$50M+ ARR. Sells direct + via partners. AI-native messaging in product positioning is plausible based on category trajectory.

**Why Engageli matters more now (post-/deep run):**
1. **Class's Helmer Power analysis (POS-014) shows Class's only real Power is Switching Costs in the $100K+ tier.** Engageli targets the same tier. If Engageli moves price-aggressively on Class's $100K+ accounts (Curtin, RMIT, UNSW Sydney, Edinburgh, Sheffield, Norwegian Univ Sci&Tech), the only Power Class has gets neutralized.
2. **Ed Miller exit creates a hire-target opportunity for Engageli** (Pass 3 red-team Attack 2). Ed knows Class's customer list, renewal calendar, top-account risk profile, pricing model, and the $1.76M Q4 named-account pipeline (KPMG Canada $615K + CVS Health $486K + VPS Learning $343K + Wells Fargo $314K). California limits non-compete enforceability. Engageli has motive.
3. **Class has zero competitive intel.** `MainCompetitors__c` custom field in Salesforce has ZERO records across all 1,579 closed opps LTM. The 20 "Lost to Competitor" deals ($1.36M LTM, 10% of lost-$) have no competitor coded. We do not know what % of those losses went to Engageli specifically.

## Recent signals

- **2026-05-21**: Class /deep run completed. Concurrent org-map investigation surfaced Ed Miller's exit (30-45 days). Engageli risk elevated.
- **Slack search 2026-05-21**: Zero hits in 90 days for "Engageli" / "Top Hat" / "Docebo" / "competitor" / "competitive" — Class is not discussing competitive intel in searchable channels. Either it's happening in DMs / 1:1s / quarterly business reviews not visible to Slack search, OR it's not happening systematically.
- **Brightdata weekly scan (assumed running, not verified this session)** — adversarial/INDEX.md states "Weekly Brightdata scan" but no recent file updates visible in this session's investigation.

## Risk vectors (Pass 3 red-team-aligned)

1. **Engageli hires Ed Miller** within 90 days of his Class exit. Brings Class customer relationships and intel. Probability: 30-40% conditional on Ed's job search activity.
2. **Engageli launches AI-native product messaging** that Class cannot match (POS-014 + WS-08 confirms Class has no AI feature strategy). Probability: 60-70% based on category trajectory.
3. **Engageli wins the Q4 named accounts** (KPMG Canada, CVS Health, Wells Fargo) where Class is in Qualified Opportunity / Quote in Review. Per Pass 2 CRO lens, only Wells Fargo is in Best Case — the other three are competitive bake-offs. Probability: 25-40% per named account.
4. **Engageli surfaces Class's pricing leak** (PM-013) via reseller channel or RFP cross-reference. Probability: 20-30% in 6-12 months.
5. **Engageli + Anthology partnership** that targets Class's Collab → Class migration cohort with switching-cost relief. Probability: 10-20%.

## Counter-positioning

Class's defensible counter-position vs Engageli:
1. **"Layer on Zoom + Teams"** — Class is the only platform that runs natively on both Zoom (via ICS) AND Microsoft Teams. Engageli runs on its own stack. For customers who already pay for Zoom or Teams, Class lets them keep the relationship.
2. **Integration depth at $100K+ tier** — Class has deep integrations with LMS (Canvas, Blackboard, D2L), SSO (Okta, Microsoft), and identity providers. Engageli's integration story is less mature.
3. **Pricing model post-May-2026** — Class's instructor + learner pricing aligns with cost drivers. Engageli's pricing is opaque/unclear from public sources.

## Open monitoring items

1. **Set up Engageli LinkedIn alert** for any Class employee profile views post-Ed-exit
2. **Run targeted Brightdata scan** for Engageli + Class on the Q4 named accounts (KPMG Canada / CVS / Wells Fargo / VPS Learning)
3. **`MainCompetitors__c` SF field instrumentation** — make it required on Closed Lost deals ≥$25K per Pass 2 CMO ask
4. **Engageli press releases / funding news** Q3 watch — capital raise would signal aggressive expansion
5. **Engageli hiring of any current or former Class employee** — flag immediately

## Related
- POS-014: Helmer Powers thin — Engageli specifically threatens the Switching Costs Power
- PM-012: Ed exit destabilizes GTM team — Engageli hire risk
- PM-013: Pricing anchoring leaks — Engageli could weaponize
- WS-08: Product AI repositioning — Engageli is the AI-native competitor we cannot match
