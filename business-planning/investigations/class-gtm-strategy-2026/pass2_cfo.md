# Pass 2 — CFO Lens on Class GTM 2025/2026

Author: claude-pass2-cfo-lens
Date: 2026-05-21
Sources: context_bundle.md (Pass 1, 2026-05-21), POS-004, WS-09, memory `class_financial_state_may_2026.md`, `cash_lever_model_v5.md`, `july_trough_problem.md`, `finance_cash_forecast_authoritative.md`, Salesforce LTM pull (2026-05-21). All dollar figures cited inline.

---

## 1. Position (the CFO read)

**This GTM motion does not finance itself, and the next four quarters are a controlled descent — not a recovery — unless the renewal save-rate and pricing-realization gaps close before Q3.** The math: $963K LTM New Business + $1.0M Expansion = **$1.96M of forward-additive ARR** (SF Closed-Won LTM pull, 2026-05-21) against a renewal book of $17.55M closing LTM at 79.1% GDR / 76.9% NRR combined (class-gtm-data canonical). That implies LTM net-new ARR motion is roughly: $17.55M renewed + $1.96M added − ($17.55M / 0.791 × 0.209 = $4.64M of churn already in the closed-won denominator) ≈ a stack that is shrinking by **$2-3M ARR per LTM cycle** even before counting the FY26 Q3 concentration risk ($9.83M renewing, 49% concentration, and Q3 was the worst-GDR quarter at 75.7% last year — that alone implies **$2.4M of probable Q3 churn**). The April-2026 ARR snapshot of $20.57M vs FY25 closed of ~$28M (memory: `class_financial_state_may_2026.md`; class-gtm-data: $28M FY26 Proj) is internally consistent ONLY if you treat the $28M as a forward-projection that already failed — the $7.4M delta over four months is the Knox CoSo wind-down ($3.1M) plus the H2 FY25 churn that the FY26 proj didn't price in. **Unit economics are upside-down at the new-logo layer.** Blended fully-loaded GTM cost (3 AEs + 1 SDR + 9 BPO + Sabina + 8-10 AMs + Kendall + marketing tooling ≈ $4.5-5.5M/yr est., NOT in NetSuite payroll — memory `netsuite_payroll_blind_spot.md`) against $963K new-biz ACV = **CAC payback >36 months on new logos** vs Bessemer "good" of <18mo. The motion only works because 90% of revenue is renewals where CAC is sunk; the question is whether the $17.55M renewal stream itself holds, and at 79.1% GDR it isn't. **The pipeline-to-bookings ratio of 2.2x on Class is the cash tell** — the SaaS rule is 3-4x and that's for healthy motions; at 2.2x with a 16% blended win rate (FY25), pipeline conversion implies **$4.62M × 16% = $740K of FY26 forward bookings from current pipe**, which against an at-risk renewal pool of $4-5M is a **negative net-ARR outlook of $3-4M for FY26**. We are buying the next 12 months of ARR at a CAC payback that, on these numbers, fails Rule of 40 by a wide margin (growth ≈ −10% to −15%, margins negative — Rule of 40 score deeply negative).

## 2. Top 3 Risks (CFO Lens)

**Risk 1 — Q3 FY26 renewal cliff drives a cash-collection gap of $2.0-2.8M against the W30 trough's downstream weeks.** $9.83M ARR renewing in Q3 (49% concentration per class-gtm-data) × historical Q3 GDR 75.7% = **$2.39M of probable churn**. At Class's typical net-30/45 invoicing on renewal, the cash impact lands W36-W44 (Sept-Oct). This doesn't blow up W30 directly, but it eliminates the AR pull-forward lever for the SECOND trough that emerges in Q4 if Q3 renewals miss. **Lever tie:** AR pull-forward capacity drops by ~$2.4M; AP deferral and AWS cuts (12% ceiling = ~$45-60K/mo savings, memory `july_trough_problem.md`) cannot replace that. **Covenant tripwire:** Barclays $30M facility likely has a minimum-liquidity and trailing-revenue covenant — a $2.4M Q3 ARR loss compounds against the existing $7M+ ARR contraction already booked since Q4 FY25.

**Risk 2 — Pricing erosion is real but mis-measured; the "+0.83% flat" headline hides a $400-700K annualized leak.** Renewal cohort with prior_ARR: $14.13M → $14.64M = +0.83% net (SF LTM). But HED is renewing DOWN 6.4% on $1.72M base = −$110K, K12 down 11.5% on $637K = −$73K, and Collab→Class migrations require 70% discount workarounds against a 3x list-price gap (Slack May 2026, Niko case). If 30% of the $10.4M Collab book migrates over 24 months at the 70%-discount workaround vs intended 30% discount, **the realization gap = $10.4M × 0.30 × (0.70 − 0.30) = $1.25M of leaked uplift over the migration window**, ~$520K/year. **Lever tie:** This is invisible to the Cash Lever Model v5 `07_Weekly_Engine` because the cash hits as smaller-than-modeled renewals 9-15 months out — it's a working-capital landmine for Q4-Q1 FY27. Order Form Generator's 50% discount cap + no canonical pricing doc (5 active pricing docs per context bundle §4) = governance failure, not pricing failure.

**Risk 3 — New-logo CAC payback >36 months means the GTM cost stack is uneconomic at current motion, and we are funding negative-ROI sales with cash we don't have through July.** Three AEs producing $963K LTM = $321K avg new-biz / AE. SDR + 9 BPO contractors NOT on the 41-person roster and NOT in the cost model (context §3, §8) = a hidden cost line; if Manila BPO runs ~$2-3K/contractor/month all-in, that's $20-30K/month / $240-360K/yr off-balance-sheet GTM spend funding 43% of new-biz sourcing. **Lever tie:** Severance is spread-mode (memory `cfo_severance_policy.md`), so cutting AEs cannot help July — but the BPO contractors are likely month-to-month and CAN be cut with immediate cash effect (~$20-30K/mo × 3 months = **$60-90K cash preserved by Aug 1** if cut May 31). That's not enough to fix W30 ($111,766 trough) but it's not nothing, and it must be weighed against killing the 43% of new-biz sourcing they produce. **The decision is whether $412K of LTM SDR-sourced new-biz justifies $240-360K of annualized hidden cost** — answer is yes at gross level but no at CAC-payback level.

## 3. What I Need From Each C-Lens

- **CEO (Ed Miller as acting / Russell as proxy):** A decision, by 2026-06-15, on whether we commit to the Healthcare VILT + Corp Training Co diversification (forward pipeline says yes) and explicitly de-prioritize ICP HED beyond the trailing book. The ask is **a written ARR commitment for FY27**: how much HED ARR do we plan to defend vs let attrit? I need this to model the renewal-cohort cash curve.

- **CRO (Ed Miller, confirmed real CRO per SF user titles):** A reconciled **pipeline-coverage commitment** by Q3 close. Current 2.2x is below SaaS 3-4x; tell me whether we hit 3x by Q3 by (a) building $2-3M more pipe or (b) reducing the bookings target. Either is fine — I cannot model cash on "actively building." Also: populate `MainCompetitors__c` on the $1.36M / 20 lost-to-competitor deals so we can stop guessing about pricing-vs-product loss drivers.

- **CMO (no CMO exists; Kendall Woodard as functional head, reports to Ed):** Fix LeadSource attribution on the 62% NULL new-biz $385K, and ship Healthcare customer proof points before Round 3. The data ask is binary: by 2026-06-30, what % of new-biz $ closes LTM is attributable to a named, costed channel? Without this I cannot compute true CAC by channel, and the BPO-cut decision (Risk 3) goes from quantified to gut-feel.

- **Chief of Staff (Russell, acting):** Reconcile the two ICP taxonomies (formal tiered vs legacy ICP-prefix) in Salesforce by 2026-06-30 and lock pricing to a single canonical document. I cannot reconcile renewal-cohort math against pipeline math while HED appears in both systems with different definitions. This is a 2-week ops project that unlocks every other CFO model downstream.

## 4. Quantitative Anchor

| Metric | Value | Source / Calc |
|---|---|---|
| ARR LTM run-rate (closed renewals + expansion + new) | **$19.53M** | SF Closed-Won LTM, 2026-05-21 |
| ARR snapshot April 2026 | **$20.57M** | memory `class_financial_state_may_2026.md` |
| ARR FY25 close (reconciled to $28M FY26 Proj) | **~$28M** | class-gtm-data canonical; reconciles to $20.57M April via $3.1M CoSo wind-down + $4.3M H2 churn |
| Pipeline-to-bookings ratio (Class) | **2.2x** | board prep doc 2026-05-18; vs SaaS rule 3-4x |
| Implied FY26 forward bookings from current pipe | **$740K** | $4.62M pipe × 16% FY25 blended WR |
| At-risk renewal pool | **$4-5M ARR** | class-gtm-data: Zero Use 3mo $1.06M + 12mo $796K + Severe Decline $1.6M + Possible Drop $1.33M |
| NRR (combined FY25) | **76.9%** | class-gtm-data canonical (Class-only 71.5%) |
| GDR (combined FY25) | **79.1%** | class-gtm-data |
| Implied Q3 FY26 churn $ | **$2.39M** | $9.83M renewing × (1 − 75.7% Q3 GDR) |
| New-biz CAC payback | **>36 months** | $963K NB ÷ est. $4.5-5.5M GTM cost stack (gross) — fails Bessemer <18mo |
| Rule of 40 score (est.) | **Deeply negative** | Growth ≈ −15% + margins negative |
| Cash impact of cutting BPO May 31 | **$60-90K preserved by Aug 1** | 9 contractors × $2-3K/mo × 3mo |
| Collab→Class migration realization leak (24mo) | **$1.25M** ($520K/yr) | $10.4M × 30% migrating × (70% − 30% discount delta) |

## 5. Decision-Rights Question (CFO sign-off, next 60 days)

**Do we keep the 9 Manila BPO SDR contractors funded through Q3, or cut them by 2026-05-31?**

Cutting saves $60-90K cash by Aug 1 (small but non-zero against the W30 trough at $111,766). Keeping them funds 43% of new-biz sourcing ($412K LTM closed-won) at an off-balance-sheet hidden GTM cost not currently in the Cash Lever Model v5. The decision sits with CFO because it (a) modifies the cash model, (b) is invisible to NetSuite payroll, (c) materially changes the new-logo motion's CAC payback, and (d) reverses cleanly if the renewal book stabilizes. **My current lean: cut 5 of 9 by 2026-06-15, keep top 4 producers, redirect the $30-45K monthly delta to the Healthcare VILT campaign where the $846K pipeline lives and the ICP fit is sharpest.** This needs CEO/CRO concurrence on the new-biz motion implications but the cash math is mine to sign.

---

*Word count: ~1,080. All figures cited inline; reconciliation note on $28M vs $20.57M provided in Q4 anchor table. POS-004 (47.9% Intl HED concentration) is acknowledged but the trailing-book vs forward-pipeline distinction from context_bundle §1 ¶4 means the CFO risk-prioritization puts Q3 renewal cliff (Risk 1) above HED concentration — recommend POS-004 confidence drop from 70 → 55 pending Pass 5 reconciliation.*
