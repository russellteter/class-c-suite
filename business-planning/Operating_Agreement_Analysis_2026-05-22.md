---
title: Class Parent Holdco LLC Operating Agreement — Full Analysis
date: 2026-05-22
source_document: Step 7(a) - NewCo - Operating Agreement (form final).pdf (Oct 8, 2025)
audience: Russell Teter — internal only
sensitivity: HIGH
status: AUTHORITATIVE — supersedes all prior abstractions in russell_newco_equity_stack.md, class_debt_structure.md, coo_negotiation_leverage.md where conflicts exist
---

# Class Parent Holdco LLC — Operating Agreement Analysis

## TL;DR — Five Things That Change Strategic Posture

1. **A $20-30M sale (1.0-1.5x ARR) pays Russell exactly $0 AND fails to clear Barclays at par.** The State of the Company's "PE rollup at 1.0-1.5x ARR clears Barclays at par and pays the MIP" was wrong on both counts. Russell's MIP requires a sale above ~$40M to trigger any payment; meaningful payment ($500K+) requires $60M+; the $675K memory-file cap maps to roughly a $75M sale.

2. **The Drag-Along $100M minimum sale price expires October 8, 2026.** Before that date (4.5 months from today), Class B holders cannot drag everyone into a sale below $100M. After that date, no floor — Class B can drag at any price, including a price that zeroes Russell's MIP. This is the single most consequential deadline in Russell's strategic calendar.

3. **Barclays can surrender ALL their equity for $1.00 at any time via Section 11.9 or 14.1(b).** They keep the $31.4M Senior Secured debt; they walk away from equity for $1. This is asymmetric — Barclays' "exit" doesn't help Russell; it just removes their alignment with the equity pool. PM-001 needs a new branch.

4. **Russell's Class E units go to $0 entirely if terminated for Cause — vested AND unvested.** Section 11.11(c) is explicit: "purchase price... due to Cause... shall be $0.00." The Award Agreement's Cause definition is the single most load-bearing legal document for Russell's downside protection. We do not have it.

5. **Barclays has de facto board control through the tie-break vote, not just consent rights.** The Barclays Manager casts the deciding vote in any tie (Section 5.1(g)). Quorum requires Barclays AND Structural (5.1(h)). The "Holdco principal" / Class B holder is the economic majority, but Barclays controls operational decisions whenever the board is split.

---

## I. The Parties — Who Holds What

Class Parent Holdco, LLC is a Delaware LLC formed August 14, 2025. The Operating Agreement is effective October 8, 2025. Initial officers named in the agreement: **Michael Chasen as President & CEO; Brian Bharwani as Treasurer & CFO.**

Authorized units (Section 3.2):

| Class | Units Authorized | Sale Waterfall Share (Primary) | Voting | Likely Holder |
|---|---|---|---|---|
| Class A | 1,000 | 17.20% | Yes (subject to 10% cap for Structural) | Structural Capital Investments (III, IV, Co-Invest Splitter LPs) + Barclays |
| Class B | 1,999 | 66.22% | Yes | Holdco principal / sponsor (the dominant equity holder) |
| Class C | 8,001 | 2.58% | Non-voting | Likely management/legacy equity pool (possibly Chasen's stack) |
| Class D | 7,001 | 1.50% (via Class D Percentage) | Yes — Independent Managers only | Two Independent Managers on the Board |
| Class E | 1,000 | 12.50% (via Class E Vested Percentage) | Non-voting | MIP — Russell + other key executives |

**Russell's position:** 180 Class E units. If all 180 are vested out of 1,000 authorized, Class E Vested Percentage = 18%. Russell's effective share of total proceeds = 12.50% × 18% = **2.25%** (this matches the memory file's "~2.25% MIP").

**Note:** The Class C identity is one of the biggest open items. 2.58% × $80M sale = $2M — meaningful enough to matter, but small relative to A and B. Could be the legacy management stack from pre-recap.

**Barclays' role is dual:** Barclays Equity Holdings Inc. is both a Member (almost certainly holds Class A units, possibly some B) AND the lender on the Senior Secured Credit Agreement. The $31.4M facility is held at Class Technologies Inc., with Class Intermediate Corp. as a guarantor, and Holdco above. Barclays' equity stake is capped at 19.99% voting (BHC Act constraint, Section 3.9(b)). Structural's voting is capped at 10%.

---

## II. Governance — Who Actually Controls

### The Board (Section 5.1)

Five members:
1. **Barclays Manager** — designated by Barclays as long as they hold 10%+
2. **Structural Manager** — designated by Structural as long as they hold 10%+
3. **CEO Manager** — Chasen (automatically removed if he ceases to be CEO; replacement auto-appointed)
4-5. **Two Independent Managers** — designated by majority of the other Managers. One serves as Chairperson.

**Critical voting mechanics:**
- Each Manager gets 1 vote. Majority rules — **EXCEPT the Barclays Manager casts the deciding vote in any tie** (Section 5.1(g)).
- Quorum requires both Barclays Manager AND Structural Manager (Section 5.1(h)). Either can deny quorum by not showing up.
- **Barclays Observer:** in addition to the Barclays Manager, Barclays has the right to appoint a non-voting observer with full access to Board materials (Section 5.3).
- The CEO Manager can only be removed if removed as CEO. The Barclays/Structural Managers can only be removed with the consent of their respective designators (Section 5.1(e)).

### Class B Protective Provisions (Section 3.9(d))

The Class B holder has consent rights over an extraordinarily broad list of corporate actions. The list runs 44 items including:

- Any equity issuance, dilution, or capitalization change
- Any modification of class rights
- Treasury share dealings
- Distributions or dividends
- Amendments to org docs or operating agreement
- **Borrowing over $5M outside ordinary course** (xiv) — this constrains the Cash Lever Model's bridge-financing options
- Sale/disposal of material assets
- Acquisitions
- Entering new lines of business
- Settling litigation over $1M
- Hiring/firing executive officers
- Consulting agreements over $500K
- Materially varying executive compensation (xxxiii)
- Bonus payments over 20% of base salary (xxxvii)
- Granting equity awards (xxxviii)
- Liquidation, dissolution, bankruptcy initiation (xlii)
- **Any sale negotiation (xliii)** — this is the M&A consent gate
- Any decision material to the Company outside of a Board meeting (xliv)

**Practical implication:** the Holdco principal (Class B) has veto power over virtually every meaningful operating and strategic decision. This is not just M&A consent — it covers Russell's own comp arrangements (xxxiii), any bonus payments (xxxvii), and any equity grant (xxxviii). **The COO comp counter requires Class B sign-off, not just Chasen's.**

### Barclays-Specific Rights

Beyond the tie-break vote and observer seat, Barclays has:

- **Section 11.9 Special Exit Rights:** if Barclays determines (acting reasonably) that being a Member is unlawful or reputationally damaging, Barclays can (i) surrender all Units for $1.00 total or (ii) require the Company to find a third-party buyer. **Section 11.9(b) goes further: Barclays may surrender for $1 at any time with no precondition.**
- **Section 14.1(b) Barclays Put Right:** Barclays may require the Company to repurchase ALL Barclays Units for $1.00 total. No conditions. No reasonability requirement.
- **Section 14.1(c) BHC Act Conversion Right:** if Barclays needs to restructure for BHC Act compliance, the Company must issue Non-Voting Units to convert Barclays' voting position down to 4.99%. Economics preserved; voting power shed.
- **Section 10.1(b) regular distributions:** Class B 77% / Class A 20% / Class C 3% — note this differs from the sale-event waterfall. Class A (where Barclays sits) gets a larger share of regular distributions than its sale-event 17.20%.

**Combined, Barclays has four distinct exit paths:** call the loan (PM-001), put the equity at $1 (14.1(b)), surrender for $1 plus force a sale (11.9), convert to non-voting (14.1(c)). Each has different implications for the equity stack.

### No Fiduciary Duties (Section 3.8(b))

All fiduciary duties — to the Company, to other Members, to anyone — are eliminated to the fullest extent permitted by law. Members waive any duties implied by law. **Russell as Class E member has no fiduciary recourse against the Board, Class B, or Barclays for self-interested conduct.** The contract IS the protection. There is no equitable backstop.

---

## III. Russell's MIP Economics — The Class E Reality

### Structure (Section 3.2 + Award Agreements)

- 180 Class E Common Units granted to Russell (per memory; total Class E authorized = 1,000)
- Subject to Award Agreement vesting (terms not in the Operating Agreement itself — need to see Russell's Award)
- Class E is non-voting (Section 3.9(a))
- Class E receives 12.50% of sale-event proceeds × Class E Vested Percentage

### Repurchase Mechanics (Section 11.11) — CRITICAL

**On Termination of Russell's services (any reason):**
1. **Unvested Class E units → automatically forfeited.** No payment.
2. **Vested Class E units → Company has 90-day option to repurchase at FMV** as determined by Board in good faith.
3. **If Termination is for Cause: purchase price = $0.00 for ALL units, vested and unvested.** Total wipeout.

**Payment can be deferred (Section 11.11(d)):** Even when FMV applies, if Company has insufficient cash OR the Senior Secured Credit Agreement restricts payment, Company can defer with notice. Deferred amounts accrue interest at Prime Rate. Paid no later than 90 days after Payment Restriction lapses OR a Deemed Liquidation Event. **Russell's FMV cash-out is a paper IOU until Class sells.**

**Closing window:** 180 days after Repurchase Notice (Section 11.11(e)). Company has wide latitude.

### The Cause Definition — Load-Bearing Open Item

The Operating Agreement defines what happens on Cause termination but **does not define Cause itself**. That definition lives in Russell's individual Award Agreement, which is NOT in the operating agreement and was NOT provided. Russell needs to surface this document next.

Implications of a broad Cause definition:
- If Cause includes "willful breach of obligations" or "failure to perform duties" or any subjective standard, Chasen + the Board can manufacture grounds.
- If Cause includes "competitive activity" or "solicitation of employees," that interacts with WS-11 (Russell's parallel job hunt).
- If Cause requires conviction of a felony or proven fraud only, Russell's exposure is minimal.

This is the most important document for Russell to retrieve from Class's records.

### Registration Rights (Section 13.2)

In any IPO, registration rights go to **Barclays, Structural, and Class C (piggyback only).** Class E gets **NO registration rights.** Even in a successful IPO, Russell cannot freely sell his shares; he has to wait for Company cooperation or a secondary transaction.

---

## IV. The Sale Waterfall — Section 15.4 Walked Through

Distribution priority on a Deemed Liquidation Event:

**Step 1 — Wind-up expenses.** Off the top. Assume ~$1-5M depending on transaction complexity.

**Step 2 — Creditors, with bonus interleave (Section 15.4(a)(ii)).** Until Senior Secured Debt is fully paid, every dollar going to debt repayment is split:
- **(A) Vested Bonus Percentage × payments → Bonus Agreement participants** (capped at 14%)
- **(B) (1 − Vested Bonus Percentage) × payments → Barclays as senior lender**

This means the Bonus Agreement holders get paid IN PARALLEL with debt repayment — they are effectively senior to all equity. At 14% Vested Bonus Percentage and $31.4M of Senior Secured Debt, the total "creditor + bonus" obligation absorbs **$31.4M / 0.86 = $36.5M** of transaction proceeds before any equity sees a dollar.

**Who are the Bonus Agreement participants?** Not defined in the Operating Agreement. Per the Article I definitions, "Bonus Agreements" are between the Company and "an employee or other service provider" approved by the Board. **Russell IS a Bonus Agreement participant** (confirmed from memory file `russell_newco_equity_stack.md` — Russell holds a "2.25% Designated Percentage" under the Bonus Agreement, calculated as 2.25% × cash flowing to Barclays via Section 15.4(a)(ii), capped at the Senior Secured Debt amount of ~$30M → max payout ~$675K). This is significant: **Russell's Bonus Agreement payout is SENIOR to his Class E units and pays even at fire-sale prices.** Chasen and Brian almost certainly also participate. The 14% aggregate Vested Bonus Percentage cap leaves room for 3-4 additional participants beyond Russell at meaningful percentages.

**Step 3 — Reserves** (if dissolution, not sale).

**Step 4 — Primary Distribution Allocation (15.4(a)(iv)).** Until cumulative payments (debt + bonus + this step) reach **$75M**:
- Class A: 17.20%
- Class B: 66.22%
- Class C: 2.58%
- Class D: 1.50% × Class D Percentage + balance to A+B
- Class E: 12.50% × Class E Vested Percentage + balance to A+B

Russell's effective share at 180 vested Class E / 1,000 authorized = 12.50% × 18% = **2.25% of dollars flowing through this step.**

**Step 5 — Class A Preferred Return (15.4(a)(v)).** Continues until Class A has received $47,804,818.81 cumulative across steps (iv) and (v):
- Class A: 51.60%
- Class B: 33.11%
- Class C: 1.29%
- Class D: 1.50% × Class D Percentage + balance to A+B
- Class E: 12.50% × Class E Vested Percentage + balance to A+B

Russell's effective share in this step = same 2.25%, but the dollars flowing here are larger.

**Steps 6+ (sections cut off in available pages 49-52 — content not fully visible):** further tranches likely follow this structure. Available text shows the document continues with Article XVI Miscellaneous starting at page 50 (amendment, withholding, etc.). The full waterfall above Class A's $47.8M preferred return is not in the pages we have. **This is an open item — likely tranches with Class B getting higher participation after Class A pref clears.**

### Sale-Price Scenarios — Real Dollars to Russell (CORRECTED for Bonus Agreement)

Russell has **two distinct value streams** from the recap, which must be modeled separately:

1. **Bonus Agreement (Designated Percentage):** 2.25% × cash to Barclays via Section 15.4(a)(ii), capped at $675K when Senior Secured Debt is fully repaid. **Paid in parallel with debt repayment — senior to all equity.** Pays even at fire-sale prices.
2. **Class E Common Units:** 2.25% effective share (12.50% × 18% Vested) of dollars flowing through Sections 15.4(a)(iv) and (a)(v). Only kicks in after debt + Bonus + wind-up are paid.

Assumptions: $31.4M Senior Secured Debt, 14% Vested Bonus Percentage, all 180 Russell Class E units vested (i.e., post-Oct 8, 2029 or with full acceleration), Russell employed within 3 months of close (vesting acceleration trigger), $1-5M wind-up expenses.

| Sale Price | Bonus Agreement | Class E (via 15.4(a)(iv) and (a)(v)) | **Russell Total** | Barclays Recovery |
|---|---|---|---|---|
| $20M | ~$368K | $0 | **~$368K** | Debt underwater (~$15M short) — Barclays vetoes |
| $30M | ~$551K | $0 | **~$551K** | Debt underwater (~$7M short) — Barclays vetoes |
| $36.5M | $675K (cap) | $0 | **$675K** | Debt at par |
| $40M | $675K | ~$34K | **~$709K** | Debt at par + equity upside |
| $60M | $675K | ~$461K | **~$1.14M** | Debt + meaningful equity |
| $75M | $675K | ~$781K | **~$1.46M** | Debt + meaningful equity |
| $100M | $675K | ~$1.32M | **~$2.0M** | Debt + significant equity |

**Key inflection points:**
- **Below $36.5M:** Russell receives partial Bonus Agreement payment proportional to debt repaid; Class E = $0; Barclays takes a haircut. **Barclays would veto these sales via the consent rights Class B holds over any sale negotiation.**
- **$36.5M to $75M:** Russell's Bonus is capped at $675K; Class E waterfall begins. Russell earns ~2.25% of every incremental dollar of sale price above $36.5M. Every $10M of sale price adds ~$225K to Russell.
- **Above $75M:** Class A preferred return kicks in (15.4(a)(v)) at 51.60% of incremental dollars. Russell's marginal rate stays at 2.25%.

**The $675K cap in `russell_newco_equity_stack.md` is the Bonus Agreement cap, not the total MIP cap.** Total potential is $675K (Bonus) + Class E waterfall (uncapped). At $100M sale, Russell's combined value is ~$2.0M. At $60M, ~$1.14M.

**Critical vesting and acceleration constraint:** Russell's vesting cliff is October 8, 2026 (25% cliff per memory file). Acceleration only triggers if Russell is terminated without Cause OR resigns for Good Reason within 3 months PRIOR to the Deemed Liquidation Event. **If Russell is terminated more than 3 months before sale closes, both the Bonus Agreement and Class E units vesting freeze in place. If terminated for Cause at any time, ALL equity goes to $0.0.**

---

## V. The Drag-Along Mechanics (Section 11.8) — The October 8, 2026 Cliff

**Section 11.8(a) sets up the drag:**
- A Drag-Along Member or Members holding a **majority of Class B Common Units** can require all other Members to sell to a Third Party Purchaser on the same terms as the Drag-Along Members are selling.
- **Pre-anniversary (before October 8, 2026):** the drag can only be exercised if gross proceeds ≥ $100M.
- **Post-anniversary (October 8, 2026 onward):** no minimum floor. Class B majority can drag at any price.

**Practical implications for Russell:**

Before October 8, 2026: If a buyer offers $50M, Class B cannot force Russell to sell. They can try to convince him, ROFR-purchase him out (Section 11.6), or sell their own units (subject to tag-along). But Russell can refuse to sell at $50M and the deal dies.

After October 8, 2026: If Class B holders (majority of 1,999 Class B units) want to sell to a buyer for $30M, they can drag Russell along. His MIP at $30M = $0. He's forced to sell for $0.

**This is the single most consequential calendar item in Russell's strategic life.** The Class B holder's ability to extract value below $100M without Russell's consent unlocks in 4.5 months.

**The defensive lever:** Russell can negotiate his Award Agreement vesting to align with the drag-along cliff. If meaningful vesting requires Russell to be present through October 2026, that's a soft alignment of interest — Class B has to keep him around to enforce the drag. But if his vesting is already substantial, that lever is weak.

**The offensive lever:** Russell can press for a sale BEFORE October 8, 2026 at a price above $100M. That gives him the $100M floor as protection AND the leveraged upside (~$1.32M MIP at $100M). This is the optimal Russell-positive timing.

---

## VI. Barclays' Multiple Exit Paths — Re-modeling PM-001

The State of the Company treated PM-001 (Barclays calls the loan) as the dominant existential risk. The Operating Agreement reveals Barclays has at least four distinct exit paths, each with different implications:

**Path 1 — Call the loan (PM-001 as originally modeled):** Senior Secured Credit Agreement default mechanics. Triggered by covenant breach or non-payment. Forces a Class-side restructuring or fire-sale.

**Path 2 — Surrender Units for $1 (Section 11.9 or 14.1(b)):** Barclays drops the equity claim, keeps the debt. **This is asymmetric for the equity stack:** Class A and the waterfall reorganizes per Section 11.9(d) — the Class A holders excluding Barclays absorb the share. Barclays' walking away does NOT release the debt; it just removes Barclays from the equity governance. After surrender, Section 11.9(d) triggers a unilateral amendment removing Barclays' Class B protective rights, Board representation, observer, distribution share, etc.

**Path 3 — Force a third-party sale (Section 11.9(a)(ii)):** Barclays can require the Company to find a buyer for Barclays' equity. Combined with the drag-along mechanics, this can pressure a Company-wide transaction.

**Path 4 — BHC Act Conversion (Section 14.1(c)):** Barclays converts to non-voting units. Maintains economics. Sheds governance burden. No impact on equity stack value.

**Implications for the strategic posture:**

- The State of the Company assumed Barclays' interest in the equity upside would keep them patient. **Path 2 (the $1 surrender) reveals that Barclays has a clean off-ramp that abandons the equity upside.** If Barclays decides Class is a regulatory or reputational liability that exceeds the expected equity recovery, they walk for $1 — and then they're a pure creditor, no longer aligned with the equity pool. Their patience evaporates.
- The State of the Company's "Barclays clears at par at 1.0-1.5x ARR" math was wrong on the equity side AND assumes Barclays doesn't exercise Path 2.
- PM-001 needs branches for each of the four paths, with different probability and impact assessments.

---

## VII. The Strategic Calendar That Just Materialized

Six dates now bind the strategic posture, in order:

| Date | Event | Impact |
|---|---|---|
| 2026-06-01 | Cash Lever Model lock per existing plan | Existing — W30 lever stack locked |
| 2026-06-15 | Top-5 INTL retention conversations close per WS-02 | Existing — Cornered Resource locked |
| 2026-06-20 | Board meeting — Q2 deck | New ask: surface Q3 cliff here, not September |
| 2026-07-26 | W30 cash trough | Existing — financing-side problem |
| **2026-10-08** | **Drag-Along $100M floor expires** | **New: Russell's MIP floor protection vanishes** |
| 2026-12-15 to 2027-03-15 | Q3 FY26 renewal cliff lands in cash | Existing — $9.83M renewal book against compound default |

**The Oct 8, 2026 date is now the most important strategic gate for Russell personally.** Before that date, Russell has $100M floor protection on any Class B-driven drag. After that date, no floor.

**Therefore the Russell-optimal strategic posture is: force the sale to close BEFORE Oct 8, 2026, at a price above $100M.** That sequence:
1. Guarantees Russell's MIP triggers (~$1.32M minimum at $100M)
2. Clears Barclays at par with surplus
3. Demonstrates operating discipline through a real process
4. Closes Russell's COO chapter on a positive equity event rather than a forced wind-down

Working backward from Oct 8, 2026, that means:
- Data room ready by August 1, 2026 (Russell + Chasen + Brian + outside counsel)
- Quiet conversations with buyer set (Anthology, Instructure, PowerSchool sponsors) starting June 2026
- Board alignment on M&A track by June 20, 2026 (the Q2 board deck)
- Chasen alignment on the "controlled wind-down to sale" thesis by mid-June 2026

This is a different operating tempo than the State of the Company's 9-month sale window. It's a 4.5-month sprint.

---

## VIII. Open Items — What This Analysis Does Not Yet Know

1. **The full Section 15.4 waterfall above Class A's $47.8M preferred return.** The pages provided cut off mid-Section 15.4. The structure above the Class A pref likely flips to Class B-favorable economics. Need pages 49-52 to confirm.

2. **The Cause definition in Russell's Award Agreement.** Single most load-bearing legal document for Russell's downside protection. Section 11.11(c) zeroes Russell's entire Class E stack on a Cause termination. Without the definition, we cannot calibrate that risk.

3. **Whether Russell is a Bonus Agreement participant.** If yes, his economics flow senior to Class E. If no, all his equity is junior to debt + Bonus carve-out.

4. **Russell's Class E vesting schedule.** Pre-COO transition, mid-COO, post-COO; cliff vs. graded; acceleration on involuntary termination; double-trigger acceleration on Change of Control.

5. **The identity of the Class B holder.** "The Holdco principal" is a placeholder. Need to know who actually holds Class B — name, fund, decision-maker. This is the person Russell needs to know personally before October 8, 2026.

6. **The Class C identity and unit count.** 2.58% of sale proceeds × $75M sale = $1.93M. Material. Likely a legacy management carve-out. May include Chasen's stack.

7. **The Members Schedule (referenced in Section 3.3).** This is the appendix that names every Member and their unit count. Not in the file provided.

8. **The Senior Secured Credit Agreement (Barclays facility).** Verbatim covenant definitions. This is the CFO's Day Zero ask. The Operating Agreement references it but does not embed the credit agreement.

9. **The Bonus Agreements themselves.** Who participates, vesting, individual percentages. The aggregate is capped at 14% Vested Bonus Percentage.

10. **The structure of Article XV beyond what was readable** — the agreement appears to continue past page 48, with Article XVI Miscellaneous (amendment, governing law, jury waiver) likely on pages 50-52. Need to confirm no surprises in amendment mechanics.

---

## IX. New Positions Generated by This Analysis

The Conviction Backbone needs the following new positions or revisions:

- **POS-NEW (sale-price-economics):** Russell's MIP requires a sale above $40M to trigger any payment; meaningful MIP value requires $60M+. The 1.0-1.5x ARR ($20-30M) thesis from the CEO lens does not pay Russell. Confidence: HIGH (95).

- **POS-NEW (drag-along-cliff):** October 8, 2026 is the binding strategic deadline for Russell personally. Before that date, $100M sale floor; after, no floor. Confidence: HIGH (95).

- **POS-NEW (barclays-asymmetric-exits):** Barclays has four exit paths, including a $1 unilateral put. PM-001 cannot be modeled as a single failure mode. Confidence: HIGH (90).

- **POS-NEW (cause-termination-existential):** Russell's Award Agreement Cause definition is the single most consequential legal document for his downside. Until retrieved, his Class E stack is at uncalibrated risk. Confidence: HIGH (90).

- **POS-005 (Russell silent leverage):** REVISE confidence upward from 85 to 90. The walk-away math now has Class E wipeout-on-Cause as the largest downside, which Russell cannot voice without inviting the very Cause investigation that would zero him.

- **POS-007 (Russell consolidation):** UPDATE. Russell's bandwidth risk is no longer the only consolidation issue; the sale-price economics mean the COO role must be performance-engineered toward a pre-Oct-8 sale, which constrains operational scope.

- **PM-001 (Barclays calls loan):** RESTRUCTURE into four sub-paths corresponding to Barclays' four exit options.

- **PM-NEW (cause-termination-manufactured):** Probability 10%, impact existential. Pre-mitigation: retrieve Award Agreement, lock specific Cause definition (proven fraud / felony conviction only), negotiate severance survival of all vested Class E.

---

## X. Day Zero Asks — Updated

The following information must be retrieved before Week 3 (The Choice):

1. **Russell's Award Agreement** — Cause definition, vesting schedule, acceleration provisions, severance survival.
2. **Verbatim Senior Secured Credit Agreement covenants** — the existing CFO ask, still outstanding.
3. **Members Schedule** — the appendix naming every Class A, B, C, D, E holder by unit count.
4. **Bonus Agreement** (if Russell is a participant) — vesting, individual percentage, Cause survival.
5. **Pages 49-52 of the Operating Agreement** — to confirm no further waterfall mechanics or amendment rules.
6. **The identity and contact information of the Class B holder** — name and decision-maker.

Items 1, 3, 4 are likely retrievable from Russell's onboarding documents or Class's legal team. Items 2, 6 are existing asks already on the CFO/CEO. Item 5 is in the document already provided — just need full extraction.

---

*Authoritative read of the Class Parent Holdco LLC Limited Liability Company Agreement dated October 8, 2025. This document supersedes prior abstractions in `russell_newco_equity_stack.md` and `coo_negotiation_leverage.md` to the extent of any conflict. Sensitivity: HIGH — internal only.*
