---
name: renewal-forecast
description: Forecast Class's 90-day rolling renewal book with per-account risk scoring tuned to the Class NRR definition. Pulls Salesforce renewals + Chorus call signal + NetSuite billing history to produce a ranked risk list — gross retention probability per logo, expansion potential, and the lever recommended (executive sponsor, pricing flexibility, technical escalation, churn). Trigger phrases include "renewal forecast", "renewals at risk", "what's our 90-day renewal book", "NRR forecast", "which customers are about to churn", or any variation asking about retention pipeline. Auto-runs weekly Sundays via scheduled task. Layers ON TOP of Salesforce, Chorus, and NetSuite MCPs.
---

# renewal-forecast

The single source of truth for Class's 90-day rolling renewal forecast. Tuned to the Class NRR definition. Combines Salesforce CRM state, Chorus call signal, and NetSuite billing history to produce per-account risk scoring.

## Required reading before execution

1. Memory: `class_financial_state_may_2026.md` — ARR cliff context ($35.85M → $20.57M), 47.9% Intl HED concentration
2. Memory: `class_gtm_roster.md` — CSM coverage by account
3. Position: `POS-004` — Intl HED concentration is #1 survivability risk
4. Pre-mortem: `PM-002` — top federal customer non-renews
5. Pre-mortem: `PM-004` — Intl HED segment collapses
6. Adversarial: `customer-defections/pattern-downsize-to-non-renewal.md` — the most dangerous churn pattern
7. Stakeholders: `customers-top-arr/` and `customers-at-risk/` — current account state

## Class NRR definition (codified)

```
Gross Retention = Renewed ARR / Starting ARR (excludes expansion)
Net Revenue Retention = (Renewed ARR + Expansion ARR - Downsell ARR) / Starting ARR

Renewal stages (Salesforce):
  - Renewal opportunity created at T-180 days
  - S4 = Renewed (committed)
  - S5 = Closed Won (paperwork done)
  - Closed Lost = Non-renewed
  - Downsell = Renewed at lower ARR (counts in NRR, hurts NRR)

ARR rollup:
  - Account.Current_ICP_Tier__c for segment cuts
  - Account.Account_Vertical_Segment__c for vertical cuts
  - Custom ARR fields (NOT Amount — Amount is gross)
```

## Execution steps

### Step 1: Pull the 90-day renewal book from Salesforce

```sql
SELECT
  Opportunity.Id,
  Opportunity.Name,
  Account.Id,
  Account.Name,
  Account.Current_ICP_Tier__c,
  Account.Account_Vertical_Segment__c,
  Opportunity.Amount,
  Opportunity.CloseDate,
  Opportunity.StageName,
  Opportunity.ForecastCategoryName,
  Opportunity.Owner.Name,
  Account.Owner.Name  -- CSM
FROM Opportunity
WHERE Type = 'Renewal'
  AND CloseDate <= NEXT_N_DAYS:90
  AND IsClosed = false
ORDER BY Amount DESC
```

### Step 2: Pull recent activity for each account

For each account in the renewal book, run in parallel:

```sql
-- Last 60 days of SF activity
SELECT WhatId, Subject, ActivityDate, ActivityType
FROM Task
WHERE AccountId = '{account_id}'
  AND ActivityDate >= LAST_N_DAYS:60
ORDER BY ActivityDate DESC

-- Open opportunities and downsells
SELECT Id, Name, StageName, Amount, CloseDate, Type
FROM Opportunity
WHERE AccountId = '{account_id}'
  AND IsClosed = false
```

### Step 3: Pull Chorus call signal for each account

For each account's primary contact (from Salesforce):

```
mcp__chorus__search_calls_by_participant(participant: contact_email, limit: 10)
mcp__chorus__get_engagement_summary(engagement_id)  -- for top 3 most recent
```

Extract per account:
- Number of calls in last 30/60/90 days
- Trend: increasing / stable / declining frequency
- Champion presence: is the original sponsor still on calls?
- New stakeholder appearance: any procurement/finance contact added late-cycle?
- Action items committed and not delivered
- Competitive mentions in `meeting_summary`
- Sentiment cues (decline, frustration, escalation language)

### Step 4: Pull NetSuite billing history for each account

```sql
SELECT
  c.entityid,
  c.companyname,
  EXTRACT(YEAR FROM t.trandate) yr,
  EXTRACT(MONTH FROM t.trandate) mo,
  SUM(t.foreigntotal) billed
FROM transaction t
JOIN customer c ON t.entity = c.id
WHERE c.companyname = '{account_name}'
  AND t.type IN ('CustInvc', 'CashSale')
  AND t.trandate >= TO_DATE('YYYY-MM-DD', 'YYYY-MM-DD')  -- 24 months ago
GROUP BY c.entityid, c.companyname, EXTRACT(YEAR FROM t.trandate), EXTRACT(MONTH FROM t.trandate)
ORDER BY yr, mo
```

Look for: billed trajectory (growing, flat, declining), payment timeliness, any seat-count or license-tier reduction events.

### Step 5: Score per-account renewal risk

For each account, compute a composite score (0-100 = healthy → at-risk):

| Signal | Weight | Bad value |
|---|---|---|
| SF stage progression | 20% | Behind schedule for renewal motion (S2 by T-90, S4 by T-30) |
| Activity frequency | 15% | <2 touches in last 60 days |
| Chorus call frequency trend | 15% | Declining 30%+ vs prior 60-day period |
| Champion presence in calls | 15% | Original sponsor missing from last 2 calls |
| New late-cycle stakeholders | 10% | Procurement/finance contact appears post-T-60 |
| Action item delivery | 10% | >1 committed action item unfulfilled |
| Competitive mentions | 5% | Any competitor named in last 90 days of calls |
| Billing trend (NS) | 10% | Declining ARR over last 12 months |

**Risk bands:**
- 0-25: HEALTHY → low touch, standard renewal motion
- 26-50: WATCH → CSM increases cadence, no escalation
- 51-75: AT-RISK → executive sponsor outreach within 14 days
- 76-100: CRITICAL → immediate Russell-level intervention

### Step 6: Compute aggregate NRR forecast

```
Renewed ARR projection:
  Sum(Amount) where StageName IN ('S4', 'S5') AND ForecastCategoryName IN ('Commit')
  + Sum(Amount × renewal_probability) for at-risk where renewal_probability is derived from risk score
  
Expansion ARR projection:
  Sum(Amount) for upsell/cross-sell opportunities IN ('S4', 'S5') AND ForecastCategoryName IN ('Commit')

Downsell ARR projection:
  Sum(downsell_amount) for opps marked as downsell (lower-than-original ARR renewals)

NRR forecast = (Renewed + Expansion - Downsell) / Starting ARR

Gross retention forecast = Renewed / Starting ARR
```

### Step 7: Segment cuts

Roll up the same numbers by:
- `Account.Account_Vertical_Segment__c` — critical for the 47.9% Intl HED watch
- `Account.Current_ICP_Tier__c` — tier breakdown
- CSM/Owner — performance per CS lead

### Step 8: Report shape

```
90-Day Renewal Forecast — {date}

Aggregate:
  Starting ARR (in window): ${X}
  Projected Renewed ARR:    ${Y} ({Y/X * 100}% gross retention)
  Projected Expansion:      ${Z}
  Projected Downsell:       ${W}
  NRR forecast:             {%}
  
Class NRR target (board): {%} — {GREEN | YELLOW | RED} vs forecast

Segment cuts:
  Intl HED (47.9% concentration): {%} retention forecast — KEY METRIC
  Domestic HED:                   {%}
  Corporate:                      {%}
  Federal/Gov:                    {%}

Top 10 at-risk accounts (ranked by risk × ARR):
| Account | ARR | CloseDate | Risk | Band | Recommended Lever |
| [...]   | [..]| [...]     | 78   | CRITICAL | Russell-level intervention this week |
| [...]   | [..]| [...]     | 62   | AT-RISK  | Exec sponsor email + technical escalation |
...

Comparison to last week:
  NRR forecast delta: ±{%}
  New accounts entered AT-RISK band: {N}
  Accounts exited AT-RISK band: {N}

Source citations:
- Salesforce SOQL pulled {timestamp}
- Chorus engagements pulled {timestamp}  
- NetSuite billing history pulled {timestamp}
```

### Step 9: Update artifacts

- Update `stakeholders/customers-at-risk/` — any account in AT-RISK or CRITICAL gets a stakeholder model file (created or updated)
- Update `workstreams/WS-02-arr-retention.md` `last_updated` + `next_milestone`
- Update `adversarial/customer-defections/` — if any account matches the downsize-to-non-renewal pattern, flag it
- If aggregate NRR forecast crosses a board threshold, write a position update for POS-004
- Spawn predictions in `calibration/predictions/` for any AT-RISK or CRITICAL account: "Account X renews with no downsell by {CloseDate}"

### Step 10: Action items per band

For each AT-RISK and CRITICAL account, generate:
- Recommended next conversation (who calls whom, with what framing)
- Pricing flexibility envelope (if applicable)
- Executive sponsor pairing (Russell, Chasen, board observer)
- Save play estimate (cost vs. likely-retained ARR)

## Hard rules

- Define "committed" stages explicitly every time: S4 + S5 + Commit/Best Case
- Exclude S1/S2 from forecast (pipeline only)
- Cross-check Owner.Name against active 41-person roster (Sharae and Tomas are gone)
- Cite every number with its connector and timestamp
- Risk scoring weights are documented above; if Russell or CFO wants to tune them, edit this skill file
- Chorus signal is AI-summarized — treat "no negative signal" as weak evidence of health, not strong
- Stale AP / billing entries: skip transactions older than 24 months from billing trend analysis

## Day Zero (skill activation)

First run — Russell confirms the Class NRR formula definition, target NRR threshold (board target), and risk-band thresholds. After that, weekly Sunday runs produce the rolling forecast.
