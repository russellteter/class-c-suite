# Investigation: class-gtm-strategy-2026

**Workstream tags:** WS-09 GTM Refinement (primary); WS-02 ARR Retention, WS-08 Product Repositioning, WS-12 M&A Optionality (secondary)
**Mode:** /deep — 5-pass loop, v2.1 disciplines
**Opened:** 2026-05-21
**Closed:** 2026-05-21
**Owner:** Russell Teter (COO-elect)
**Sensitivity:** HIGH (planned pricing moves, segment exits, partnership negotiations, GTM-leader critiques, Ed Miller exit not yet public)
**Cross-reference:** [[class-org-institutional-read]] (concurrent — defer people profiling there)

## Topic
Build the system's own informed read of Class's GTM strategy as it actually stands today, 2025/2026. ICP / motion / portfolio / positioning / performance / energy. WS-09 GTM Refinement depends on WS-08 product repositioning. The system had no canonical GTM strategy doc — scattered across Salesforce, Drive, Slack, the marketing site, and people's heads.

## Outcome — six-bullet summary

1. **Class is a leakage-containment business in managed-runoff mode.** $17.55M LTM renewals vs $963K LTM new business + $1.0M expansion. New biz + expansion covers 53% of expected churn at 79.1% GDR. The motion is sound for runoff + M&A positioning, but cannot reverse the cliff independently. (POS-015)

2. **Forward HED has been exited; the trailing book is in managed-runoff.** Zero marketing dollars/demand-gen to HED. Marketing focuses on 4 named ICPs (Healthcare VILT, Enterprise Learning, Training Providers, K12 Virtual Schools) with a Credit Union swap candidate. POS-004 superseded by POS-012.

3. **2026 pricing model rolled out May 1, 2026.** Portfolio GM 48.1% → 64.5% (+16.4 pts); Corporate GM 45% → 82.7% (+37.7 pts — corporate book deeply under-monetized). 80% of customers priced below new list (median 94% gap — anchoring strategy). 66 underwater accts ($1.3M ARR) losing $1.27M/yr. Tier 9-11 EDU compresses to 49% GM. Government FedRAMP = Corporate × 1.25.

4. **Ed Miller exits in 30-45 days.** Russell assumes the entire revenue function. Collapses WS-03 + WS-09 + WS-10. Retention conversations with Daniel/Sabina/Massimo/Kendall must land by 2026-06-04 (POS-016, PM-012). Massimo expensive-to-fire trap (~$70K severance, 26 weeks Italian law) constrains INTL restructuring for 6-12 months.

5. **Q3 FY26 is the primary cash event, not W30.** $9.83M renewing at last year's 75.7% Q3 GDR + 92 zero-usage accts ($1.86M, likely Q3-clustered) + Tier 9-11 EDU compression = $2.4-3.4M conservative churn. AR pull-forward consumed for W30 unavailable for Q3. POS-013, PM-011.

6. **Class has Helmer Switching Costs only in $100K+ tier and Cornered Resource in 2 active INTL AMs (Emmanuel + Niko); everything else thin. (Note 2026-05-26: original "4-5 INTL AMs" framing reflected Pass 2 SF Owner.Name pull; Armanda, Petya, Fiona confirmed terminated.)** Strategic frame: managed-runoff + M&A optionality by Q4. Tactical actions (4-ICP focus, pricing anchoring, Russell takes Ed's function, Q3 contingency planning) make the strategic exit credible to an acquirer. POS-014.

## Pass record

### Pass 1 — Bootstrap (2026-05-21)
- Foundational reads: class-gtm-data skill (canonical analytics), class_gtm_roster + class_financial_state_may_2026 memories, Strategic_AI_Operating_Model v1+v2, WS-09 + POS-004 + investigations/class-org-institutional-read Pass 1 cross-reference
- Connector pulls: SF (pipeline summary, segment summary, won/lost LTM by ICP/Type/LossReason/LeadSource/Country/Contract Type/Owner — 8 queries), Drive (29 ICP/pricing/positioning files), Slack (pricing operations + renewals signals)
- Outputs: `context_bundle.md` (4000 words)

### Pass 2 — Five-lens synthesis (2026-05-21)
Single batched Agent call with CEO/CFO/CRO/CMO/Chief of Staff lens prompts. Each agent read context_bundle + POS-004 + WS-09. Outputs at `pass2_ceo.md`, `pass2_cfo.md`, `pass2_cro.md`, `pass2_cmo.md`, `pass2_cos.md`. Reconciliation in `pass2_reconciliation.md`.

Convergent core: leakage-containment business; forward pipeline pivoted from HED; Q3 cliff is primary cash event; pricing operations broken; customer proof missing in net-new ICPs; marketing attribution unmeasurable; WS-08 dark.

### Step 2 — Russell's answers (2026-05-21)
Twelve clarifying questions across two rounds. Russell's answers in `step2_russell_answers.md`. Material findings: HED exit already executed at marketing/demand-gen level; **Ed Miller exits in 30-45 days, Russell takes the revenue function**; 2026 pricing model rolled out May 1; **Credit Unions emerging organically** with 4 named customers in flight; **AI product strategy null** (Russell wants Claude to help develop vision); Manila contractors are CS not sales; **Massimo expensive-to-fire trap**; underwater + large-HED repricing strategy queued as follow-on deep deliverables.

### Pass 3 — Red-team + Steelman (2026-05-21)
Single batched Agent call. Red-team surfaced 8 attack vectors (3 Severity-5 clustered in Q3 window: cliff compound default, Ed exit adverse selection, zero-usage Q3 clustering). Steelman recommended hybrid candidate-2+candidate-4: renewal-only mode + M&A positioning by Q4. Helmer Power audit found Switching Costs only in $100K+ tier + Cornered Resource in 4-5 INTL AMs (revised 2026-05-26 to 2 active: Emmanuel + Niko). Resolution protocol in `pass3_resolution.md` — three ACCEPT, three ACKNOWLEDGE-PARTIAL, no outright rejects.

### Pass 4 — Deliverables (2026-05-21)
- **Cowork artifact `class-gtm-map`** — live single-page dashboard with refreshable SF data
- **Memory file** `class_gtm_strategy_2026.md` (companion to class_gtm_data skill)
- **5 new positions** (POS-012 through POS-016)
- **POS-004 supersession** (now status: superseded by POS-012)
- **3 new pre-mortems** (PM-011, PM-012, PM-013)
- **WS-09 update** YELLOW → ORANGE, Russell-led post-Ed, 60-day decision queue
- **WS-08 update** YELLOW → RED, vision-development phase, unlinked from WS-09
- **Adversarial competitor-watch** Engageli risk elevated post-Ed-exit window

### Pass 5 — Memory writes + summary (2026-05-21)
- `class_gtm_strategy_2026.md` memory + MEMORY.md index entry
- 5 predictions: PRED-007 (Q3 GDR), PRED-008 (zero-usage Q3 clustering), PRED-009 (INTL AM retention), PRED-010 (FY26 new biz + expansion), PRED-011 (GTM team retention post-Ed)
- positions/README.md + pre-mortems/INDEX.md + workstreams/DASHBOARD.md updated
- This investigation log finalized
- Six follow-on /deep deliverables queued (see Summary)

## Six queued follow-on /deep deliverables

1. **AI Product Strategy vision** (Q9 — Russell's explicit ask)
2. **Training Provider promotion campaign organization** (Q10)
3. **Underwater + Large-HED repricing business plan** (Q11 + Q12 — 66 underwater + Tier 9-11 EDU)
4. **INTL Org Redesign post-Ed exit** (Q7 — Massimo/Sabina/European footprint, after Ed exits)
5. **Credit Union ICP commit decision** (Q8 — swap with Enterprise Learning)
6. **Manila BPO customer-support capacity audit** (Q6 — CFO-flavored ops)

## Files index

- `context_bundle.md`
- `pass2_ceo.md` / `pass2_cfo.md` / `pass2_cro.md` / `pass2_cmo.md` / `pass2_cos.md`
- `pass2_reconciliation.md`
- `step2_russell_answers.md`
- `pass3_redteam.md` / `pass3_steelman.md`
- `pass3_resolution.md`
- `deliverables/2026-05-21_class-gtm-strategy-2026/class-gtm-map.html` (Cowork artifact source)

Positions: POS-012 / POS-013 / POS-014 / POS-015 / POS-016 (new) + POS-004 (superseded)
Pre-mortems: PM-011 / PM-012 / PM-013 (new)
Predictions: PRED-007 / PRED-008 / PRED-009 / PRED-010 / PRED-011
Memory: `class_gtm_strategy_2026.md`
Cowork artifact: `class-gtm-map`
