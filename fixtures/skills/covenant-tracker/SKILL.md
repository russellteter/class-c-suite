---
name: covenant-tracker
description: Track Class's Barclays facility covenants against live NetSuite data and surface tripwire proximity. Wraps the $25M term + $5M revolver + $1.4M PIK facility terms with current leverage ratio, FCCR, and customer-concentration tests. Returns GREEN/YELLOW/RED per covenant with the actual current value vs. threshold and the days to next test date. Trigger phrases include "covenant check", "are we within covenants", "tripwire scan", "Barclays covenant status", "FCCR", "leverage ratio", or any variation asking about facility compliance. Auto-runs Monday 6am ET via scheduled task. Layers ON TOP of the NetSuite MCP and the weekly-cash-forecast skill.
---

# covenant-tracker

Codifies the Barclays facility covenant terms and runs a live compliance check against NetSuite data. This is the early-warning system for PM-001 (Barclays calls the loan).

## Status: PARTIAL — facility terms not yet machine-readable

The actual Barclays credit agreement covenant definitions, test dates, and thresholds need to be locked into this file before the skill is fully operational. Until then, the skill operates against **assumed values** (flagged as such) and produces a directional reading, not a definitive covenant compliance statement.

**To complete this skill:** Russell or CFO inputs the actual credit agreement covenant terms (verbatim from the facility doc) into the "Locked Facility Terms" section below. After that, the skill produces real compliance readings.

## Required reading before execution

1. Memory: `class_debt_structure.md` — $30M facility composition, ~$200-210K/mo cash interest
2. Memory: `class_restricted_cash.md` — BACA $2.5M restricted, Coso-TD $3.245M
3. Memory: `class_financial_state_may_2026.md` — ARR cliff context, monthly burn
4. Adversarial: `adversarial/financial-tripwires/barclays-leverage-covenant.md` — current band definitions
5. Pre-mortem: `pre-mortems/PM-001-barclays-calls-loan.md` — escalation playbook
6. Memory: `netsuite_class_gotchas.md` — SuiteQL patterns

## Locked Facility Terms (TO BE CONFIRMED FROM CREDIT AGREEMENT)

```
Facility composition:
- $25M Term Loan
- $5M Revolver (fully drawn per memory)
- $1.4M PIK accrual
Total exposure: ~$31.4M

Cash interest: ~$200-210K/month per memory

Covenants (ASSUMED — confirm with CFO from facility doc):
- Total Debt / TTM Adjusted EBITDA ≤ 4.5x  [ASSUMED]
- Fixed Charge Coverage Ratio ≥ 1.10x      [ASSUMED]
- Minimum Liquidity ≥ $1.5M                [ASSUMED — may be BACA-inclusive]
- Maximum Customer Concentration < 50%      [ASSUMED — relevant given 47.9% Intl HED]
- Reporting: monthly financials, quarterly compliance certificate

Test dates: quarterly (typical for term loans)

Restricted cash treatment:
- $2.5M BACA — Barclays-controlled, requires release approval
- $3.245M Coso-TD — likely Knox escrow, status TBD

Cross-default triggers, equity-cure provisions, material adverse change clauses: TO BE EXTRACTED FROM FACILITY DOC
```

**Once Russell confirms these terms, the skill produces actual compliance readings instead of directional ones.**

## Execution steps

### Step 1: Pull current financial state from NetSuite

```sql
-- TTM revenue
SELECT SUM(t.foreigntotal) AS ttm_revenue
FROM transaction t
WHERE t.type IN ('CustInvc', 'CashSale')
  AND t.trandate >= TO_DATE('YYYY-MM-DD', 'YYYY-MM-DD')  -- 365 days ago
  AND t.trandate <= CURRENT_DATE
  AND t.status NOT IN ('Voided')

-- TTM operating expense (for EBITDA derivation — adjust per credit agreement add-backs)
SELECT SUM(tl.foreignamount) AS ttm_opex
FROM transactionline tl
JOIN transaction t ON tl.transaction = t.id
JOIN account a ON tl.account = a.id
WHERE a.accttype IN ('OthExp', 'Expense', 'COGS')
  AND t.trandate >= TO_DATE('YYYY-MM-DD', 'YYYY-MM-DD')
  AND t.trandate <= CURRENT_DATE

-- Current cash position (unrestricted)
SELECT SUM(tl.foreignamount) AS current_cash
FROM account a
JOIN transactionline tl ON tl.account = a.id
WHERE a.accttype = 'Bank'
  AND a.acctname NOT LIKE '%BACA%'
  AND a.acctname NOT LIKE '%Restricted%'
```

### Step 2: Pull Salesforce customer concentration

```sql
SELECT
  Account.Name,
  SUM(Amount) AS arr_proxy
FROM Opportunity
WHERE StageName = 'Closed Won'
  AND CloseDate = LAST_N_DAYS:365
GROUP BY Account.Name
ORDER BY SUM(Amount) DESC
LIMIT 20
```

Compute top-1 concentration %, top-5 concentration %, top-10 concentration %.

### Step 3: Compute covenant ratios

**Adjusted EBITDA** = TTM revenue - TTM cash opex + permitted add-backs (stock-based comp, one-time costs per facility doc — get from CFO).

**Leverage ratio** = (Term + Revolver + PIK) / TTM Adjusted EBITDA

**FCCR** = (Adjusted EBITDA - capex) / (interest + scheduled principal + scheduled lease payments) — use prior quarter actuals.

**Liquidity** = unrestricted cash (excluding BACA + Coso-TD).

**Customer concentration** = top customer ARR / total ARR.

### Step 4: Report by tripwire band

For each covenant, compute current value, compute headroom vs threshold, classify band:

```
Covenant Tripwire Status — {date}

[1] Leverage Ratio (Total Debt / Adj EBITDA)
    Threshold: ≤ 4.5x  [ASSUMED — confirm]
    Current:   {X.X}x
    Headroom:  {Y%} below threshold
    Band:      {GREEN <3.5x | YELLOW 3.5-4.0x | RED 4.0-4.4x | BREACH >4.5x}

[2] Fixed Charge Coverage Ratio
    Threshold: ≥ 1.10x  [ASSUMED — confirm]
    Current:   {X.XX}x
    Headroom:  {Y%} above threshold
    Band:      {GREEN >1.30x | YELLOW 1.20-1.30x | RED 1.10-1.20x | BREACH <1.10x}

[3] Minimum Liquidity
    Threshold: ≥ $1.5M  [ASSUMED — confirm; may be BACA-inclusive]
    Current:   ${X.XM}
    Headroom:  $Y above threshold
    Band:      {GREEN >$3M | YELLOW $2-3M | RED $1.5-2M | BREACH <$1.5M}

[4] Customer Concentration
    Threshold: < 50% top-1  [ASSUMED — confirm]
    Current:   {top-1 customer} at {X}%
    Notable:   Intl HED segment concentration at {Y}% (memory: 47.9% as of May 2026)
    Band:      {GREEN <35% | YELLOW 35-45% | RED 45-49% | BREACH >50%}

Days to next quarterly test: {N}
Last compliance certificate filed: {date}

Composite tripwire status: {worst of the four bands}

Source citations:
- NetSuite SuiteQL, pulled {timestamp}
- Salesforce SOQL, pulled {timestamp}
- Facility terms per memory `class_debt_structure.md` (some thresholds ASSUMED)
```

### Step 5: Action triggers

| Composite band | Action |
|---|---|
| GREEN | Log to scorecard; no action |
| YELLOW | Pre-emptive lender call within 5 business days (CFO + Russell) |
| RED | Workout-team brief drafted + waiver prep + counsel engaged |
| BREACH | Execute PM-001 response playbook within 4 hours |

If band is YELLOW or worse:
- Write or update position about covenant pressure
- Flag in `workstreams/WS-06-barclays-relationship.md` as `next_milestone`
- Add to next board pre-read draft

### Step 6: Write to adversarial library

Update `adversarial/financial-tripwires/barclays-leverage-covenant.md` with the current value and timestamp. Append to a running log.

## Hard rules

- Always footnote which thresholds are ASSUMED vs CONFIRMED
- Always cite source connectors and timestamps
- Never report a covenant value without naming the calculation methodology (TTM start/end dates, add-backs included)
- If facility terms haven't been locked, the report is "directional" not "compliance"
- Composite band = worst of all four (never average)
- Tripwire crossings trigger memory writes immediately, even outside Monday scan

## Day Zero (skill activation)

Russell or CFO inputs the verbatim covenant definitions from the Barclays credit agreement into the "Locked Facility Terms" section. After that, every Monday 6am run produces real compliance readings. Until then, runs are directional.
