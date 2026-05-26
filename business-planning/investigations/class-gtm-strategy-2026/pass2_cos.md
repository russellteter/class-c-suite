# Pass 2 — Chief of Staff Lens
**Investigation:** class-gtm-strategy-2026
**Date:** 2026-05-21
**Primary workstream:** WS-09 GTM Refinement (YELLOW, owner "Russell + Top AE")
**Secondary tags:** WS-08 (Product AI Repositioning), WS-02 (ARR Retention), WS-12 (M&A Optionality)
**Lens framing:** Watkins 100-day plan applied to a COO-elect entering a YELLOW GTM workstream while the CFO seat runs cash defense.

---

## 1. Position — the political reality of GTM ownership

**GTM is already owned, and the owner is not Russell.** Ed Miller is the de facto CRO per Salesforce user titles, owns Sales + Marketing + Renewals + CS as a vertical stack, and is the only C-table sponsor of any customer-facing function. The three quota carriers (Daniel, Massimo, Clayton) and the renewal SVP (Sabina) all functionally roll up to him. Marketing has no CMO — Kendall Woodard runs execution as "Creative Director, Brand and Customer Marketing" reporting to Ed; Dalton (the only named SDR) reports to Ed; "Vivek" runs the marketing-ops integration stack (HubSpot, Chorus, RingLead, Wrike) and is not even on the 41-person roster. Russell's direct GTM footprint today is the partnership/channel motion — 11 Partner Reseller accounts owned in SF, Clayton Coyne reporting up through BD&Ops rather than into Ed's stack, and VPS Learning ($343K Q4) being the largest live channel deal. WS-09's stated owner is "Russell + Top AE," but the workstream as written — *segment focus, pricing model review, motion redesign* — sits squarely inside Ed's operating P&L. **What Russell is stepping into as COO is not GTM ownership but GTM architecture** — the operating-system layer beneath Ed's revenue motion: ICP framework reconciliation (two overlapping taxonomies in SF), pricing operations (Order Form Generator caps, Collab→Class migration math, multi-currency overrides), attribution plumbing (62% NULL LeadSource, zero MainCompetitors__c records), and the WS-08↔WS-09 sequencing problem (AI repositioning has to land before motion can be locked, and the Slack 90-day scan shows zero AI-strategy discussion happening in searchable channels). The political reality: if Russell tries to own GTM strategy, he collides with Ed; if he tries to own only channel, WS-09 sits orphaned between two C-table seats. The COO-elect's correct posture is **architect of the motion, not driver of the motion** — own the framework, the pricing operating model, and the WS-08/WS-09 critical path; defer quota, territory, and seller management to Ed.

---

## 2. Top 3 risks from the Chief-of-Staff lens

**Risk A — WS-08 must land before WS-09 can move, and WS-08 is dark.** The seed note is correct: most reorgs fail because GTM motion isn't redesigned before structural change. Class's specific version of this is worse — WS-09 depends on WS-08 (AI repositioning) per the workstream metadata, and the Slack 90-day scan returned **zero** results on "AI repositioning / AI-native / AI strategy." The repositioning exists on paper (workstream YELLOW, owner CPO) and not in motion. If Russell sequences WS-09 motion redesign in front of WS-08 product narrative, he ships a pricing model and segment strategy that the product can't back up — and the Healthcare ICP Round 2 work (already missing customer proof — Russell asked for healthcare quotes and got silence) becomes a campaign for a product story that hasn't been written. *Mitigation: force a 30-day deadline on WS-08 v1 narrative before WS-09 motion lock.*

**Risk B — The Russell/Ed boundary on GTM strategy is undefined and the COO-elect comp negotiation (WS-10) is in flight.** Right now WS-09's "Russell + Top AE" ownership reads like a placeholder — "Top AE" almost certainly means Massimo (single largest revenue producer at $2.55M LTM) but is undocumented. As COO-elect, Russell will sit organizationally adjacent to Ed, not above him, and Ed already runs the entire customer-facing P&L. If Russell takes WS-09 as a Russell-led initiative without explicit CEO arbitration, he creates a peer turf conflict at the exact moment his comp package is being negotiated — and Chasen's posture in WS-10 will be read as a signal of where the GTM decision rights actually sit. The COO comp negotiation and the GTM ownership question are the same conversation. *Mitigation: get the decision-rights map signed by Chasen before the offer letter lands — see §5.*

**Risk C — Healthcare ICP / Training Provider pivot is mid-execution with broken plumbing and no proof.** The active forward motion is 933 Healthcare VILT accounts + 1,390 Corp Training Co accounts + the Training Providers campaign Kendall just shipped (webpage, email copy, one-pager). The book hasn't caught up — 82% of the existing renewal book is UNTAGGED in the new ICP framework, and legacy ICP HED is generating $6.5K across 29 open opps (avg $224 per opp). The new motion has process gaps everywhere: pricing operations escalations are the daily Slack friction (Sabina + Niko + Russell), Healthcare ICP Round 2 went through v5 → v16 in two weeks, no published healthcare customer proof, MainCompetitors__c never populated, HubSpot at 249,650 of 250,000 cap. **Russell-flagged "Rogers, Cerifi, Tecnic dropped, next 3 largest corp customers in Possible Drop"** — the corporate segment is leaking exactly as the pivot tries to point at it. Dropped-ball risk is concentrated at the marketing-ops + pricing-ops layer because there is no operational owner — Vivek runs the integration stack as an undocumented dependency, and there is no Sales Ops sponsor at the C-table. *Mitigation: this is precisely what Russell should own in his first 60 days — the operating layer beneath the motion, not the motion itself.*

---

## 3. What Russell needs — by C-suite role

**From CEO (Chasen) — by 2026-06-04:** A 60-minute decision-rights meeting. Output: a one-page RAPID/DACI on WS-09 signed by Chasen and Ed, explicitly naming Russell as Architect/Recommender on motion design + pricing operating model + ICP framework, and Ed as Decider on quota, territory, and seller management. **This must close before the COO offer letter is countersigned** — the comp package and the decision-rights map are the same negotiation. Failure mode: comp signed without decision-rights clarity, Russell starts as COO with overlapping mandate.

**From CFO (acting/external) — by 2026-06-11:** A board-grade artifact closing Open Follow-Up #1 from the May 18 board prep doc — the NRR number Russell flagged as undelivered to the board. Specifically: an NRR computation reconciled to the canonical class-gtm-data (FY25 76.9% Combined, 71.5% Class-only) with the segmentation cuts the board will ask for (NA vs Intl, Class vs Collab, by ICP). This is also the input to the WS-09 segment-concentration decision — you cannot decide "concentrate or diversify" without the NRR number per segment.

**From CRO (Ed) — by 2026-06-18:** A jointly-signed pricing operating model memo. Inputs: 5 active pricing docs (Class Pricing 2025 deck, License Tiers sheet, Niko's deal spreadsheet, Carahsoft/GSA, Class Pricing & COGS April 9). Decision: canonical source-of-truth, OF-Generator discount-cap policy, Collab→Class migration pricing rule (the 3x list-jump / 70% workaround problem), multi-currency override workflow. Russell drafts; Ed countersigns. This is the artifact that closes the daily Slack pricing-escalation drag and creates the operational foundation under WS-09.

**From CMO (vacant — surfaced to Chasen) — by 2026-06-25:** Russell raises the structural question directly to Chasen: is the absence of a CMO a deliberate stance or a vacancy? If deliberate, Kendall needs an explicit interim "Head of Marketing" title and a seat at the WS-09 motion review. If a vacancy, it goes into WS-03 as a defined role — and the Healthcare ICP pivot validates the urgency. Either way, Vivek and the Global Sales Ops Manager need to surface onto the cost model in the next 30 days; they are load-bearing and invisible.

---

## 4. Quantitative anchor — execution velocity

**Healthcare ICP Round 2 list iterations in 14 days: v5 → v12 → v14 → v15 → v16 (5 named versions, ~1 iteration every 2.8 days).** This is high-velocity tactical motion with no published customer proof underneath it and no segment-NRR data to validate the target. Compare to: **Board prep Open Follow-Ups closed in last 7 days: 0 of 8.** Russell flagged eight items he personally owes the board (NRR computation, Q4 concentration mitigation plan, retention bridge to 90%, channel forecast, pricing rollout status, attribution fix, Top-5 risk plans, and the international/domestic retention gap explanation). Zero have closed since the May 18 board meeting. **Velocity is high on the wrong layer (campaign iteration) and zero on the layer the COO-elect actually owns (board-facing operating-model artifacts).** This is the single sharpest diagnostic of the 60-day plan: re-allocate from campaign iteration into operating-model deliverables.

---

## 5. Decision-rights — the one call Chasen has to sign before the COO offer lands

**The decision:** *Does WS-09 GTM Refinement run as a Russell-led architectural workstream (motion design, ICP framework, pricing operating model, attribution plumbing) feeding Ed's execution, or as an Ed-led revenue workstream that Russell supports on channel and operations?* This is binary, it cannot be split, and the COO offer letter prices differently against each.

**RAPID:**
- **Recommend:** Russell + Ed jointly (forced co-recommendation surfaces the boundary)
- **Approve:** Board (informational — this is a CEO call, not a board call, but board should be notified given WS-09 is on the dashboard)
- **Perform:** Russell on architecture (ICP, pricing OS, attribution), Ed on execution (quota, territory, sellers), Kendall on marketing exec, Sabina on renewals
- **Input:** Ed (executes the motion), Sabina (carries the renewal book), Massimo as Top AE (largest individual revenue producer), CPO (WS-08 dependency)
- **Decide:** **Chasen.** Single decider. No splitting.

**Timeline:** Decision by 2026-06-04. Signed one-pager by 2026-06-11. COO offer letter countersigned only after the one-pager is in writing — the comp package, the title, and the decision-rights map are one negotiation, not three.

**Defer-to-Ed list (Russell explicitly does NOT own these):** quota setting, territory assignment, AE hiring/firing, individual deal pricing approvals above policy, renewal forecast commitments, individual rep performance management.

**Own list (Russell explicitly DOES own these as COO):** the ICP framework reconciliation (two taxonomies → one), the pricing operating model (canonical source, discount policy, migration rule, multi-currency workflow), attribution plumbing (LeadSource, MainCompetitors__c, HubSpot cap), the partnership/channel P&L, the WS-08↔WS-09 sequencing gate, and the eight Open Follow-Ups from the May 18 board prep doc that are still open.

**Walk-away condition:** If Chasen refuses to put the boundary in writing before the offer countersigns, that is the signal — Russell's walk-away leverage activates not because of comp but because the role doesn't exist as advertised. The MIP cap of ~$675K is worth nothing if WS-09 sits in someone else's swim lane and Russell is accountable for outcomes he cannot direct.
