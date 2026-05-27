---
tripwire_id: TW-FIN-001
title: Barclays leverage covenant proximity
category: financial
source: Barclays facility covenant package (term + revolver)
owner: CFO + Russell
scan_cadence: Weekly Monday 6:07am ET via class-tripwire-and-cash-monday
escalation: GREEN (>20% cushion) → YELLOW (10-20%) → RED (<10%) → BREACH (covenant tripped)
last_updated: 2026-05-26
---

## Trigger
Class's leverage ratio (Net Debt / TTM EBITDA) approaches the Barclays-set maximum.

## Threshold
Covenant maximum: **4.5x** (assumed — confirm against current Barclays facility agreement at next CFO sync; this is a placeholder until ratified).

## Current scan
The covenant-tracker skill pulls TTM EBITDA from NetSuite and computes Net Debt from current cash + revolver draw + term-loan balance. Result reported as ratio with cushion %.

## Action when fired
- **YELLOW (10-20% cushion):** CFO drafts a covenant compliance memo for the next monthly Barclays reporting cycle. Russell briefs Chasen.
- **RED (<10% cushion):** Immediate trajectory review. AP deferral and AR pull-forward levers reviewed for FCCR impact. Pre-emptive Barclays conversation about waiver or amendment.
- **BREACH:** Activates PM-001 (Barclays calls the loan). Russell + CFO + Chasen + Holdco within 24 hours. Lender notice within 5 business days per facility terms.

## History
- 2026-05-26: Tripwire authored as part of remediation of 2026-05-26 test-run findings. Placeholder threshold pending confirmation against actual Barclays facility document.

## Related
- [[PM-001]] — Barclays calls the loan / covenant trip
- [[POS-003]] — W30 resolves via AR + AP + BACA
- [[POS-017]] — Cash through next-trough secured
- [[WS-06]] — Barclays relationship workstream
