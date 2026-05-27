---
name: weekly-cash-forecast
description: Refresh Class's authoritative weekly cash forecast. Locks the May 10 baseline methodology — one command pulls fresh data from NetSuite (cash, AR aging, AP aging by entity), AWS (class + collab profiles), and Salesforce (committed pipeline + at-risk renewals), reconciles against the Cash Lever Model v5 workbook, updates sheet 07_Weekly_Engine, and reports the W30 trough delta vs. prior baseline. Trigger phrases include "refresh the cash forecast", "weekly cash refresh", "what's the W30 trough this week", "update the cash model", or any variation asking for current cash position. Auto-runs Monday 6am ET via scheduled task. Layers ON TOP of class-aws-connector, the NetSuite MCP, and the Salesforce MCP.
---

# weekly-cash-forecast

This skill is the single-command refresh of Class's authoritative weekly cash forecast. It codifies the May 10 baseline methodology that produced the W30 trough of $111,766 on July 26, 2026 (verified against board deck slide 16).

## Required reading before execution

1. Memory: `finance_cash_forecast_authoritative.md` — methodology baseline
2. Memory: `class_cash_model_file.md` — file paths and sheet structure
3. Memory: `cash_lever_model_v5.md` — only touch sheet `07_Weekly_Engine`
4. Memory: `netsuite_class_gotchas.md` — query patterns and quirks
5. Memory: `netsuite_payroll_blind_spot.md` — never derive headcount cost from NS
6. Memory: `class_aws_cli_setup.md` — two profiles, BillingAccess role on class, Billing on collab

## Inputs

- Optional: a date to forecast through (default: 13 weeks from today)
- Optional: a scenario flag (`base` | `stress` | `recovery`) — default `base`

## Execution steps

### Step 1: NetSuite pulls (parallel batch)

Run these in a single tool block via `mcp__c1f73cc9-916c-4b4e-b5fc-db2960d27602__ns_runCustomSuiteQL`:

**Cash by entity (operating + restricted):**
```sql
SELECT
  a.acctname,
  a.subsidiary,
  SUM(tl.foreignamount) AS balance,
  MAX(t.trandate) AS as_of
FROM account a
JOIN transactionline tl ON tl.account = a.id
JOIN transaction t ON tl.transaction = t.id
WHERE a.accttype = 'Bank'
  AND t.trandate <= CURRENT_DATE
GROUP BY a.acctname, a.subsidiary
```

**AR aging by customer (with FX handling):**
```sql
SELECT
  c.entityid,
  c.companyname,
  t.tranid,
  t.trandate,
  t.duedate,
  t.foreigntotal,
  t.currency,
  (CURRENT_DATE - t.duedate) AS days_late
FROM transaction t
JOIN customer c ON t.entity = c.id
WHERE t.type = 'CustInvc'
  AND t.status NOT IN ('Paid In Full', 'Closed')
ORDER BY days_late DESC
```

**AP aging by vendor:**
```sql
SELECT
  v.entityid,
  v.companyname,
  t.tranid,
  t.trandate,
  t.duedate,
  t.foreigntotal,
  t.currency,
  (CURRENT_DATE - t.duedate) AS days_late
FROM transaction t
JOIN vendor v ON t.entity = v.id
WHERE t.type = 'VendBill'
  AND t.status NOT IN ('Paid In Full', 'Closed')
ORDER BY days_late DESC
```

**Stale AP cross-check:** any AP entry >90 days late gets footnoted as "may be stale — verify against bank-feed credits."

### Step 2: AWS pulls (parallel batch)

Run via `mcp__AWS_API_MCP_Server__call_aws`:

```bash
# Refresh SSO if needed (12hr token)
aws sso login --profile class
aws sso login --profile collab

# Current month MTD by service, both profiles
aws ce get-cost-and-usage \
  --time-period Start=$(date -d 'first day of this month' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --profile class

aws ce get-cost-and-usage \
  --time-period Start=$(date -d 'first day of this month' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --profile collab

# 90-day forecast, both profiles
aws ce get-cost-forecast \
  --time-period Start=$(date +%Y-%m-%d),End=$(date -d '+90 days' +%Y-%m-%d) \
  --granularity MONTHLY \
  --metric UNBLENDED_COST \
  --profile class

aws ce get-cost-forecast \
  --time-period Start=$(date +%Y-%m-%d),End=$(date -d '+90 days' +%Y-%m-%d) \
  --granularity MONTHLY \
  --metric UNBLENDED_COST \
  --profile collab
```

Sum class + collab for any "AWS spend" figure. Never report one alone.

### Step 3: Salesforce committed pipeline + renewal risk

```sql
-- Committed pipeline by close week (S4 + S5 + Commit/Best Case only)
SELECT
  CALENDAR_WEEK(CloseDate) week_num,
  CALENDAR_YEAR(CloseDate) year_num,
  StageName,
  ForecastCategoryName,
  SUM(Amount) total_amount,
  COUNT(Id) opp_count
FROM Opportunity
WHERE CloseDate <= NEXT_N_DAYS:90
  AND IsClosed = false
  AND (StageName IN ('S4', 'S5') OR ForecastCategoryName IN ('Commit', 'Best Case'))
GROUP BY CALENDAR_WEEK(CloseDate), CALENDAR_YEAR(CloseDate), StageName, ForecastCategoryName

-- Renewals at risk in next 90 days
SELECT Id, Name, Account.Name, Amount, CloseDate, StageName, Account.Current_ICP_Tier__c
FROM Opportunity
WHERE Type = 'Renewal'
  AND CloseDate <= NEXT_N_DAYS:90
ORDER BY Amount DESC
```

### Step 4: Reconcile to Cash Lever Model v5

Open `Class_Cash_Lever_Model_v5_2026-05-18.xlsx`. **Touch only sheet `07_Weekly_Engine`.**

Update:
- Weekly cash beginning balance from NS bank pull
- AR collections forecast from SF committed pipeline + AR aging waterfall
- AP outflows from AP aging + scheduled vendor payments
- AWS monthly outflow from forecast (class + collab summed)
- Restricted cash positions (BACA + Coso-TD) from memory + NS

### Step 5: Compute the trough

For each forecast week, compute ending cash. Identify the minimum (the trough). Compare against the prior week's reported trough.

**Report shape:**
```
Cash Forecast Refresh — {date}

This week's trough: ${X,XXX} on {week of YYYY-MM-DD} (W{NN})
Prior week's trough: ${Y,YYY} on {same or different week}
Delta: ${Z,ZZZ} ({worsening|improving} by ${diff})

Driver of the delta:
- NetSuite: AR aging worsened/improved by $X
- AWS: spend +/- $X vs forecast
- Salesforce: committed pipeline +/- $X
- AP: deferral capacity {used/available}

Tripwire status:
- W30 trough is now ${X} (board target: >$250K)
- Status: {GREEN/YELLOW/RED}

Source citations:
- NS SuiteQL, pulled {timestamp}
- AWS Cost Explorer, both profiles, pulled {timestamp}
- Salesforce SOQL, pulled {timestamp}
- Cash Lever Model v5, sheet 07_Weekly_Engine, updated {timestamp}
```

### Step 6: Write to position library + memory

If the trough moved >5% vs prior baseline:
- Write or update position POS-003 (W30 resolves via AR + AP + BACA) — adjust confidence if needed
- Update memory: `current_cash_state_{YYYY-MM-DD}.md` with the new snapshot
- Update `workstreams/WS-01-cash-defense.md` `last_updated` and `next_milestone`
- If trough moved into RED tripwire band (<$250K), write a feedback memory flagging immediate escalation

### Step 7: Optional outputs

Based on the topic of invocation:
- If `/quick`: just the report shape above
- If `/deep`: full board-slide refresh via `forecast-deck-creator` skill
- If scheduled (Monday 6am): post results to "Strategic Operating Dashboard" Cowork artifact

## Hard rules

- Every number cites its source connector and timestamp
- Stale AP entries (>90 days late, type-VendBill, status-open) are footnoted, not silently included
- FX handling: pull `foreigntotal` AND `currency`; convert at FX rate on `trandate`
- Never derive headcount cost from NS — use the GTM roster in memory
- Sheet `07_Weekly_Engine` only — never touch other sheets without explicit instruction
- If AWS SSO returns ExpiredToken, refresh via `aws sso login --profile X`, never retry blindly
- If a connector is unavailable, the refresh proceeds with the last known value + an explicit caveat

## Failure modes

- NS SuiteQL timeout → retry with smaller date range
- AWS Cost Explorer 24-48hr lag → state the date range explicitly
- SF "Owner.Name" includes terminated reps → cross-check against 41-person roster
- Cash Lever Model file locked (Excel open elsewhere) → wait + retry, do NOT create a parallel copy
