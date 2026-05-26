# Context Bundle — class-gtm-strategy-2026 (Pass 1)

Compiled 2026-05-21. Sources: Salesforce LTM queries (2026-05-21), Google Drive (board prep doc 2026-05-18, Healthcare ICP brief 2026-05-20, Docebo pricing 2026-05-21, Hubspot pricing 2026-05-20), Slack 90d, class-gtm-data skill (canonical analytics), memory layer, concurrent org-map investigation (Pass 1 cross-reference). Confidence flags HIGH / MEDIUM / LOW per finding.

## 1. The five-paragraph picture (start here)

**Class today is a renewal-dominated, internationally distributed, mid-market SaaS company built around a "layer on top of Zoom and Microsoft Teams" thesis** — engagement, tracking, breakout, reporting that virtual-led-instructor-training (VILT) teams can plug into their existing video stack. The product splits into three lines: **Class** (the engagement platform; ~$14.7M ARR / 444 customers, weighted toward Higher Ed historically, pivoting toward Corp/Healthcare/Training Providers), **Collaborate** (~$10.4M ARR / 379 customers, legacy product, being migrated to Class — and the migration triggers ~3x list-price jumps that require 70% discount workarounds), and **CoSo / Consulting** ($3.1M ARR / 41 accounts, deliberately wound down post-Knox transaction, $0 in Q4 pipeline). Combined: ~$28M FY25 ARR, ~$20.57M as of April 2026 — the $7M+ ARR delta over four months is the cliff (HIGH).

**The motion is overwhelmingly retention, modestly expansion, vanishingly new-logo.** Closed-won LTM splits 89.9% Renewals ($17.55M), 5.1% Expansion ($1.0M), 4.9% New Business ($963K), 0.1% Product Migration ($10K). Three quota-carrying AEs in FY26 — Daniel Hansen (Domestic Corp/Gov, $225K Q2 quota, $338K NB closed LTM), Massimo Gentili (International, $225K Q2 quota, also runs the heaviest renewal book by $), Clayton Coyne (Domestic Education + Channel, $62.5K Q2 quota, the thinnest segment). One SDR (Dalton Mullins). One head of marketing function (Kendall Woodard, "Creative Director, Brand and Customer Marketing"). No CMO. Marketing reports to Ed Miller, the real CRO (HIGH — confirmed from SF user titles, not roster). CS reports under Renewals reports under CRO, with no executive sponsor of customer-facing function at the C-table other than Ed (HIGH).

**The official-narrative read (board prep, May 2026): "we know exactly where the gaps are."** Q2 FY26 forecasting 77% of $950K target ($736K), Class at 63% of target with International at 40% (Class International is two-thirds of the Q2 miss alone). FY26 pipeline $4.62M / 95 opps, 2.2x coverage on Class versus 3-4x industry rule — Russell describes it as "thinner side and we're actively building." Q4 holds 50% of pipeline dollars across 16 opps, with FOUR named accounts (KPMG Canada $615K, CVS Health $486K, VPS Learning $343K, Wells Fargo $314K) totaling $1.76M / 44% of Class pipeline. Gross retention 81% (1H FY26, Class), below SaaS 90% benchmark; **International outperforms Domestic on retention every quarter** (Q1 87% vs 74%, Q2 81% vs 79%). The board narrative leans into stable trend + diversified Q2 + International stickiness, owns the gap to 90% retention and the Q4 concentration, defers on NRR (number not yet calculated for the board — Russell's own open follow-up #1) (HIGH).

**The forward GTM machinery has decisively pivoted, but the existing book hasn't caught up.** Active ICP segmentation in Salesforce is dominated by Healthcare VILT (933 accounts targeted, 42 A+ tier, $846K open pipeline / $141K avg deal), ICP Corp Training Co (1,390 accounts targeted, $863K open / $216K avg — the biggest-deal segment), Training - General (980 accounts), Enterprise Learning (178 accounts, 112 Tier A), K12 Virtual Academy (656 accounts). The legacy "ICP HED" tag (1,055 accounts, 58,203 contacts — by far the largest contact pool) is generating **29 open opps with $6.5K total — averaging $224 per opp**. The book is HED-heavy ($14.7M ARR, ~47.9% concentration); the forward pipeline is Corp / Healthcare / Training-Provider-heavy. The strategy in motion is to grow OUT of the HED dependence, not back into it. POS-004's "Intl HED is the #1 survivability risk" needs sharpening: the risk is mostly trailing-book, not forward-pipeline (MEDIUM — pivot is real, execution thin).

**Operational reality vs official narrative — three meaningful tensions.** (a) Pricing operations are broken at the order-form layer — Order Form Generator caps at 50% discount, multi-currency support is half-built (Sabina repeatedly handling EUR overrides), Collab→Class migrations trigger 3x list-price jumps requiring 70% workarounds (Niko on a real case), "still work to do around getting accurate pricing built into it + uniform/standard discounting policies" (Russell, on the record). (b) Marketing attribution is broken — 62% of new-biz won-$ has NULL LeadSource; MainCompetitors__c custom field has ZERO records across all LTM closed opportunities, so the 20 "Lost to Competitor" deals ($1.36M, 10% of lost-$) are uncoded — competitive intel is unmanaged. (c) The new healthcare motion is in the validation phase — 933 accounts in funnel, Round 2 campaigns running, but Russell asked his marketing team "do we have any healthcare customer quotes we can use?" and reacted 😞 to silence. Class has zero published customer proof in the new target segment.

## 2. ICP picture — who Class actually sells to

**Existing book (Account.Current_ICP__c on closed-won renewals LTM, $14.64M renewable):**
- 82% UNTAGGED — the historical book pre-dates the new ICP framework. Average $27.9K/renewal. (HIGH)
- ICP HED: 64 opps / $1.72M prior → $1.63M new = **−6.4% contraction on renewal** — the segment is renewing DOWN. (HIGH)
- ICP K12: 33 opps / $637K prior → $593K = **−11.5% contraction**. (HIGH)
- Healthcare VILT: 2 renewals / $78K → $93K = +20% (tiny base, but expansion direction). (LOW — n=2)
- Other ICP segments: rounding error on renewal book.

**Open pipeline by ICP (forward motion, $7.4M+ across 330+ opps):**
- ICP Corp Training Co: $863K / 13 opps / avg $216K — **biggest-deal segment**
- Healthcare VILT: $846K / 7 opps / avg $141K — **biggest-deal new motion**
- ICP Corp: $683K / 8 / avg $98K
- Training - General: $109K / 7
- ICP Corp Manufacturing: $89K / 5
- K12 Virtual Academy: $38K / 8
- **ICP HED: $6.5K / 29 opps / avg $224 — micro-deals only**
- Plus untagged: $3.75M / 243 opps / avg $24K

The active ICP framework is **B2B Corporate L&D, Healthcare clinical training, and Training Providers**. K-12 and HED are not where the forward motion is going. (HIGH)

**Geographic distribution (closed won LTM by Account.BillingCountry):**
- US: $7.54M / 39%
- Saudi Arabia: $2.30M / 12% (includes BME Saudi $1.41M legacy AR question)
- UK: $1.48M / 8%
- Australia: $1.35M / 7%
- Spain: $1.04M / 5%
- Canada, Chile, South Africa, France, Brazil, UAE: $400-700K each
- 65+ countries with closed-won deals
- **International ≈ 58% of LTM closed-won dollars**

**Two ICP taxonomies coexist in Salesforce** — the formal tiered ICPs (Training-General, Enterprise Learning, Healthcare VILT, K12 Virtual Academy) AND the legacy "ICP-prefix" set (ICP HED, ICP Corp, ICP K12, ICP Corp Training Co, etc.). The legacy set is largely untiered (1,055 HED, 1,390 Corp Training Co). The formal set has tiers. The two systems aren't reconciled. Healthcare VILT exists in BOTH (untiered 270 + tiered 663). The framework is mid-migration (MEDIUM — work in progress per Russell's notes).

## 3. Motion — how Class sells

**Three quota carriers, no fourth.** Daniel (Corp/Gov, Domestic), Massimo (International — runs his own renewal book + new biz + expansion: 32 NB / $346K + 2 Renewal / $1.4M + 3 Expansion / $811K = **$2.55M total LTM**), Clayton (Channel + Domestic Edu — thinnest at $62.5K Q2 quota, $47K NB LTM, partnership-heavy).

**Renewal team (Sabina Cramer's org), 8-10 AMs covering ~600 opps:**
- Robert Thayer: 143 renewals / $3.24M LTM closed-won — largest renewal book
- Andee Bodenstein: 110 / $2.41M
- Emmanuel Clemot (EMEA): 106 / $2.27M + 8 Expansion / $57K (heaviest customer-facing: 149 events 90d per org-map)
- Nikolaos Galindo (LAC, contractor): 68 / $2.19M + 9 Expansion / $77K (Channel AM LAC role understates true book)
- Holly Hardin: 61 / $1.47M (org-map flagged 0 events / 90d)
- Armanda Sereikaite (LAC): 66 / $1.24M + 7 Expansion / $39K
- Sabina Cramer (SVP): 16 / $563K — carrying some accounts + managing team

**Correction 2026-05-22:** Petya Lolova and Fiona Ong appeared in SF Opportunity.Owner.Name aggregates for LTM closed-won renewals but are no longer at Class — accounts have been reassigned. SF Owner.Name on historical Opportunity records does NOT update on reassignment; cross-check against `Current_Account_Manager` on Account or against User.IsActive for canonical roster of active reps. Renewal team is 7 people total (6 ICs + Sabina SVP), not 8-10.

**SDR funnel (1 named SDR + 9 Manila BPO contractors):** Dalton runs Outreach sequences (40,878 tasks 90d per org-map); BPO contractors (Franklin Lagare, Ernest Mangalas, Kate Nadonga, May Itliong, Johnalle Malones, Ferdinand Buison, Shirley Naval, Cristina Aguilar, Florencia Saa, Hanna Arinque, Catherine Grace, Sherwin Yalong) cumulate ~50K tasks/90d. **NOT on 41-person roster. NOT in cost model.** If cut, the entire bottom of the outbound funnel goes to zero overnight (HIGH).

**Sourced-by attribution on new-biz won LTM ($963K total):**
- SDR (Dalton): 25 opps / $412K = 43%
- NULL/untracked: 32 / $385K = 40%
- Channel: 8 / $156K = 16%
- AE: 1 / $10K = 1%

**The channel motion is alive but thin.** $156K LTM closed-won is real. VPS Learning is a major reseller with 38-month commit / 30% reseller margin / one-signature deal in flight. eLearning Media + LABASAD also active in International (Sabina/Niko workflow). Russell oversees 11 Partner Reseller accounts directly. The channel motion lives at Clayton Coyne (domestic) + Massimo's EU partners + Niko's LAC partners. (HIGH)

**Contract structure (LTM closed-won):**
- Annual: 714 opps / $19.27M / avg 23.6mo (most "annual" deals are 2-year)
- Collab Entitlements/Overages: 21 / $156K / avg 11mo
- Pilot Only: 11 / $76K / avg 9mo
- Multi-Year Installment: 3 / $20K / avg 60mo
- CCU One-Time Services: 1 / $4.7K
- Zoom Only: 2 / $1.2K (legacy)
- Class POC: 6 / $0 (pilots that don't book)

Sales cycle FY25: avg 97 days, lengthening (Q4 was 116 days). Win rate dropped from 22% (Q1) → 11% (Q4) → 16% FY25. Avg deal size declining ($35K → $21K Q-on-Q across FY25 quarters).

## 4. Portfolio + pricing

**Product portfolio: Class + Collaborate + Consulting (CoSo).** Class is the strategic future (engagement layer for Zoom/Teams). Collaborate is being migrated INTO Class — and the migration is creating 3x list-price gaps that require 70% discount workarounds (Niko/Sabina real case, May 2026). Consulting is wound down post-Knox transaction with $0 Q4 pipeline.

**Pricing operations status: mid-rollout, incomplete.** Per Slack May 2026: "Ed has confirmed that the education pricing is finalized and confirmed. The corporate pricing might still need some tweaking" (Sabina). Education pricing rolling out to International resellers first. Russell, on the record: "still work to do around getting accurate pricing built into it + uniform/standard discounting policies." Order Form Generator (Dealhub) caps at 50% discount; needs manual override workflow for special cases. (HIGH)

**Pricing erosion read (renewal cohort with prior_ARR data, LTM):** $14.13M prior → $14.64M new = **+0.83% net** — essentially flat. But this is hiding mix: tagged HED is contracting (−6.4%), tagged K12 contracting (−11.5%), tagged Corp Training Co growing (+5.4%). The aggregate "flat" hides segment-specific erosion (HIGH).

**Class Pricing 2025 deck exists (14.7MB, May 2026). Class Pricing Model - License Tiers (Instructor & Learner Tiers) 2026 Final. PRICING Niko spreadsheet (Niko's deal-specific pricing). Class Pricing & COGS April 9 2026. Carahsoft + GSA pricing for government channel. (HIGH — files identified but not read in full this run; defer to Pass 2 deliverables.)**

## 5. Positioning + messaging

**Public positioning (per board prep doc, healthcare ICP brief, Slack):** Class for Zoom + Class for Microsoft Teams — an "engagement layer" on top of customers' existing video infrastructure. Three core pillars: (a) real-time engagement visibility / instructor experience during live sessions, (b) audit-ready attendance + completion + competency tracking, (c) breakout room management at scale.

**Recent messaging campaigns active:**
- **Training Providers / Professional Training Companies:** "Economic defensibility, positioning Class as the delivery infrastructure that protects a training company's enterprise contracts when clients are scrutinizing every renewal." Assets: webpage (class.com/training-providers/), persona email copy, business case one-pager. Kendall-led. (HIGH — May 2026 active)
- **Healthcare VILT / EHR training:** Three-tier ABM-style campaign on 933 accounts. Core thesis: "EHR training is one of the highest-stakes virtual training programs a health system runs, and most teams are executing it with tools that weren't built for it... [Class] adds what's missing: real-time engagement visibility, role-based breakout management, automated attendance and completion tracking, and audit-ready session documentation." Three personas (Exec Sponsor / Training Manager / Coordinator). Daniel takes meetings sourced. (HIGH — May 2026 active, Round 2)
- **Healthcare ICP Round 1 already executed (May 2026).** Round 2 is the iteration based on Round 1 results — list-building still in progress, freshness of ZoomInfo data flagged as concern.

**Competitive positioning gap:** MainCompetitors__c custom field in Salesforce has ZERO records across all 1,579 closed opps LTM. Competitive intel does not live in CRM. The 20 "Lost to Competitor" deals ($1.36M, 10% of lost-$) have no competitor coded. Engageli and Top Hat are tracked weekly via Brightdata per adversarial INDEX.md but Slack searches across 90 days returned ZERO mentions of competitor names — competitive discussion is not happening in Slack channels searchable by me. (HIGH — significant gap)

## 6. Performance — what's actually working

**Closed Won LTM:** 758 opps / $19.53M
- Renewal $17.55M (90%)
- New Business $963K (5%) — only 66 opps
- Expansion $1.0M (5%) — 32 opps
- Product Migration $10K (0.1%) — 16 opps
- Customer Type breakdown: 732 from existing Customers ($19.04M); 21 Former Customers winback ($392K); 4 Prospects (only 4 truly new logos at Account.Type level, $98K); 1 Partner Reseller; **the discrepancy with 66 "New Business" Type implies most New Business opps go to accounts already classified as Customer at Account level — net-new-logo motion is even thinner than the Opportunity.Type count suggests** (HIGH).

**Loss reasons LTM ($13.17M / 794 opps):**
1. No Decision / Non-Responsive: $3.27M / 25%
2. Other: $2.26M / 17%
3. No Need: $1.63M / 12%
4. No Budget / Lost Funding: $1.59M / 12%
5. **Lost to Competitor: $1.36M / 10% / 20 opps / avg $68K** — competitors only win on larger deals
6. Features/Product Capability: $762K / 6%
7. Timing: $524K / 4%
8. Duplicate Opportunity: $493K
9. Poor Experience: $405K
10. Focused on In Person: $339K
11. **Price: $276K / 2.1% / 17 opps — pricing is NOT the loss driver**

**Counterintuitive read:** 90% of lost-$ goes to "no one" (no decision, no need, no budget, in-person, timing). Only 10% goes to named competitors. The competition is the prospect's status-quo, not Engageli/Top Hat/etc. (MEDIUM — could also reflect under-coding of competitor losses).

**Retention picture (canonical from class-gtm-data):**
- FY25 Combined GDR 79.1%, NRR 76.9% — both well below SaaS median (87.5% / 105%)
- Class-only GDR 74.7%, NRR 71.5% — even weaker than combined
- North America 72.6% GDR vs International 87.0% GDR — **14.4pp gap, NA is the retention crisis**
- Government 82.2% GDR / Higher Ed 79.2% / Corporate 78.3% / K-12 72.5%
- Class <$10K accounts: 41.1% GDR (severe); Class $100K+: 100% GDR (zero churn)
- Q3 concentration: 44% of annual renewal $ in Q3 ($9.37M); Q3 had worst GDR (75.7%)
- FY26 Q3 has $9.83M ARR up for renewal (49% concentration) — same quarter that was worst last year

**FY26 risk indicators (renewal pipeline):**
- Zero Usage 3mo: 56 accounts / $1.06M ARR
- Zero Usage 12mo: 36 accounts / $796K
- Severe Decline: 59 accounts / $1.6M
- Flagged Possible Drop: 49 accounts / $1.33M
- **Combined "at risk" buckets: ~$4-5M ARR** out of $20.32M FY26 renewal book

**Sales KPI trends FY25 → FY26:**
- Win Rate: 22% → 8% (Q3) → 11% (Q4) → recovering; FY25 avg 16%
- Sales Cycle: 91 → 116 days (Q4) — lengthening
- Avg Deal Size: $35K → $21K — declining
- Avg Lost ACV $19K (deals lost are smaller than deals won — losing the smaller fish more often)

## 7. Energy + tensions (qualitative read from Slack + Drive)

**Where energy is going (Slack signal, 90d):**
- **Pricing operations / Order Form Generator workflow** — high volume of escalations, debugging, special-case approvals (Sabina, Niko, Russell). Pricing is the daily friction point. (HIGH)
- **Healthcare ICP Round 2** — heavy iteration (v5 → v12 → v14 → v15 → v16 versions in two weeks). Russell quarterbacking with Kate Bertram, Dalton, Daniel. (HIGH)
- **Training Provider campaign rollout** — Kendall-led, webpage + email + one-pager all shipped. (HIGH)
- **Collab→Class migration pricing problem** — special case workarounds when legacy customers migrate. Recurring issue. (MEDIUM)
- **Reseller / channel pricing** — VPS Learning $343K deal, LABASAD reseller, eLearning Media, ABASAD orders. Active workflow. (MEDIUM)
- **AI / repositioning** — Slack search returned ZERO results on "AI repositioning" / "AI-native" / "AI strategy" in last 90 days. Either the AI conversation isn't happening in searchable channels, or it isn't happening. (HIGH if first; CRITICAL if second — given WS-08 is product AI repositioning)

**Cross-system tensions surfaced:**
- 11 ICP segments in Salesforce, two overlapping taxonomies (formal tiered vs legacy untiered)
- Pricing live in Class Pricing 2025 deck + License Tier sheet + Niko's spreadsheet + Carahsoft + GSA — at least 5 active pricing docs in last 30 days, no canonical
- LeadSource attribution NULL on 62% of new-biz won-$
- MainCompetitors__c never populated — competitive intel orphaned
- HubSpot at 249,650 contacts on a 250K cap (Russell actively choosing 300K tier to avoid auto-upgrade trap)
- Class is itself a Docebo customer for internal L&D (~$22.7K/yr) — and Russell has analyzed that contract carefully (so vendor cost discipline is real and personal)

**Russell-flagged "Rogers, Cerifi, Tecnic dropped, next 3 largest corp customers in Possible Drop"** (Feb 2026, to Ed + Sabina). Top corporate-segment customers churning is the unspoken concentration risk paralleling the HED concentration risk.

## 8. Cross-reference to org-map investigation

- Ed Miller = real CRO (per SF user titles). Owns Sales + Marketing + Renewals + CS as a vertical stack.
- Massimo Gentili = VP International (carries $2.55M LTM closed-won — single biggest revenue producer).
- Daniel Hansen = Director of Sales, Corp/Gov.
- Clayton Coyne = Director, Partnerships and Channel (reports to Russell, not Ed).
- Robert Thayer = largest renewal book ($3.24M LTM, $2.7M qualified). Activity-vs-book ratio low — possibly working through OF Generator vs SF events.
- Holly Hardin = $1.47M LTM renewals despite 0 logged events 90d — same hypothesis (OF-Generator workflow not SF-event-logging).
- Nikolaos Galindo (LAC), Emmanuel Clemot (EMEA), Andee Bodenstein, Petya Lolova, Armanda Sereikaite, Fiona Ong (APAC) — the global renewal AM coverage.
- Dalton Mullins (SDR) + 9 Manila BPO contractors = the outbound funnel layer (49K+ tasks /90d combined).
- "Vivek" runs marketing-ops stack (HubSpot, Chorus, RingLead, Wrike) — not on roster.
- Sales Operations Manager exists in SF user list — not on roster either.
- 11 unaccounted CoSo bodies in roster header (13 stated, 2 listed) — concurrent investigation to clarify.

## 9. Operating-state cross-reference

- **POS-004 (Intl HED concentration = #1 survivability risk, confidence 70):** Forward pipeline data contradicts. Risk is now overwhelmingly trailing-book, not forward-motion. Position needs sharpening or supersession in Pass 5.
- **WS-09 GTM Refinement (YELLOW, owner Russell + Top AE):** This investigation IS the v1 motion answer. Decisions pending include segment concentration, pricing model review, PLG vs enterprise vs hybrid.
- **WS-08 Product AI Repositioning (YELLOW, owner CPO):** Slack returns zero recent AI-strategy discussion — repositioning is on paper, not in motion. Major gap. Will spawn pre-mortem.
- **WS-02 ARR Retention (YELLOW, owner Head of CS):** Top-5 risk plans are the lever; the $4-5M at-risk pool is the target.
- **WS-12 M&A Optionality (YELLOW):** Knox transaction already happened. Consulting wound down. The remaining business is the Class + Collaborate platform. Any further M&A is on Class itself (in or out).
- **DEC-004 (Defer broader workforce action until post-renewal-cycle Q4):** Holds. But if GTM motion needs restructuring, severance timing rules still bind July.

## 10. Open questions seeded for Step 2 clarifying batch
Will draft after Pass 2 reconciliation surfaces the live tensions across lenses.
