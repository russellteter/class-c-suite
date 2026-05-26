#!/usr/bin/env python3
"""Analyze AWS Cost Explorer pulls -> punchline tables for the July trough decision."""
import json, os
from collections import defaultdict

OUT = '/Users/russellteter/Documents/Claude/Projects/Business Planning/aws_data'

def load(name): return json.load(open(f'{OUT}/{name}.json'))

# ---------- 1. Monthly totals + by-service ----------
print("="*80)
print("MONTHLY TOTALS (UnblendedCost) — Class vs Collab")
print("="*80)

def by_month_totals(payload):
    rows = []
    for r in payload['ResultsByTime']:
        m = r['TimePeriod']['Start']
        total = sum(float(g['Metrics']['UnblendedCost']['Amount']) for g in r['Groups'])
        rows.append((m, total))
    return rows

cls_svc = load('svc_class'); col_svc = load('svc_collab')
cls_m = by_month_totals(cls_svc); col_m = by_month_totals(col_svc)

print(f"{'Month':<12}{'Class':>14}{'Collab':>14}{'Combined':>14}")
print("-"*54)
for (m, ct), (_, rt) in zip(cls_m, col_m):
    print(f"{m:<12}{ct:>14,.2f}{rt:>14,.2f}{ct+rt:>14,.2f}")

print()
# ---------- 2. By service: identify top 6 + ICS-relevant services ----------
print("="*80)
print("TOP SERVICES — CLASS (last full month vs Nov 2025 baseline)")
print("="*80)

def svc_table(payload):
    # Build {service: {month: cost}}
    out = defaultdict(dict)
    for r in payload['ResultsByTime']:
        m = r['TimePeriod']['Start']
        for g in r['Groups']:
            svc = g['Keys'][0]
            out[svc][m] = float(g['Metrics']['UnblendedCost']['Amount'])
    return out

cls_t = svc_table(cls_svc); col_t = svc_table(col_svc)

def top_services(t, top=10):
    last = max({m for v in t.values() for m in v})
    return sorted(t.items(), key=lambda kv: kv[1].get(last,0), reverse=True)[:top]

months_class = sorted({m for v in cls_t.values() for m in v})
print(f"Months in data: {months_class}")
print()
print(f"{'Service':<45}" + "".join(f"{m[:7]:>12}" for m in months_class))
print("-"*(45+12*len(months_class)))
for svc, mv in top_services(cls_t, 12):
    row = f"{svc[:44]:<45}" + "".join(f"{mv.get(m,0):>12,.0f}" for m in months_class)
    print(row)

print()
print("="*80)
print("TOP SERVICES — COLLAB")
print("="*80)
months_col = sorted({m for v in col_t.values() for m in v})
print(f"{'Service':<45}" + "".join(f"{m[:7]:>12}" for m in months_col))
print("-"*(45+12*len(months_col)))
for svc, mv in top_services(col_t, 12):
    row = f"{svc[:44]:<45}" + "".join(f"{mv.get(m,0):>12,.0f}" for m in months_col)
    print(row)

# ---------- 3. ICS savings validation: Nov 2025 vs Apr 2026 ----------
print()
print("="*80)
print("ICS MIGRATION VALIDATION — Nov 2025 vs Apr 2026 (full months)")
print("="*80)

ICS_SVCS = ['Amazon Elastic Compute Cloud - Compute','Amazon CloudFront',
            'Amazon Simple Storage Service','EC2 - Other','Amazon Relational Database Service']

def at(t, svc, m): return t.get(svc, {}).get(m, 0)

for label, t in [('Class', cls_t), ('Collab', col_t)]:
    print(f"\n{label}")
    print(f"  {'Service':<48}{'Nov 2025':>14}{'Apr 2026':>14}{'Delta':>14}{'% chg':>8}")
    nov_tot = apr_tot = 0
    for svc in ICS_SVCS:
        n = at(t, svc, '2025-11-01'); a = at(t, svc, '2026-04-01')
        d = a - n
        pct = (d/n*100) if n else 0
        nov_tot += n; apr_tot += a
        print(f"  {svc[:47]:<48}{n:>14,.2f}{a:>14,.2f}{d:>14,.2f}{pct:>7.1f}%")
    delta = apr_tot - nov_tot
    pct = (delta/nov_tot*100) if nov_tot else 0
    print(f"  {'SUBTOTAL (ICS-relevant services)':<48}{nov_tot:>14,.2f}{apr_tot:>14,.2f}{delta:>14,.2f}{pct:>7.1f}%")

# ---------- 4. Total-spend Nov vs Apr (the cleanest ICS test) ----------
print()
print("="*80)
print("TOTAL AWS SPEND — Nov 2025 vs Apr 2026 (CLEAN ICS test)")
print("="*80)
print(f"{'Org':<10}{'Nov 2025':>14}{'Apr 2026':>14}{'Delta':>14}{'% chg':>8}")
for label, m in [('Class', dict(cls_m)), ('Collab', dict(col_m))]:
    n = m.get('2025-11-01',0); a = m.get('2026-04-01',0)
    print(f"{label:<10}{n:>14,.2f}{a:>14,.2f}{a-n:>14,.2f}{(a-n)/n*100 if n else 0:>7.1f}%")
n_tot = dict(cls_m).get('2025-11-01',0) + dict(col_m).get('2025-11-01',0)
a_tot = dict(cls_m).get('2026-04-01',0) + dict(col_m).get('2026-04-01',0)
print(f"{'COMBINED':<10}{n_tot:>14,.2f}{a_tot:>14,.2f}{a_tot-n_tot:>14,.2f}{(a_tot-n_tot)/n_tot*100:>7.1f}%")
print(f"\nBoard deck claimed ~$85,000/month combined savings from ICS migration.")
print(f"Actual delta:    ${a_tot-n_tot:,.2f}/month (negative = savings)")
print(f"Gap to claim:    ${(a_tot-n_tot)-(-85000):,.2f}  ({'savings BELOW claim' if (a_tot-n_tot) > -85000 else 'savings AT OR ABOVE claim'})")

# ---------- 5. AWS forecast ----------
print()
print("="*80)
print("AWS FORECAST — Next 3 months (May 22 - Aug 22, 2026)")
print("="*80)
for prof in ('class','collab'):
    fc = load(f'fc_{prof}')
    print(f"\n{prof.upper()}")
    print(f"  Total forecast (mean):   ${float(fc['Total']['Amount']):>14,.2f}")
    if 'PredictionIntervalLowerBound' in fc['Total']:
        print(f"  Lower (80% confidence):  ${float(fc['Total']['PredictionIntervalLowerBound']):>14,.2f}")
        print(f"  Upper (80% confidence):  ${float(fc['Total']['PredictionIntervalUpperBound']):>14,.2f}")
    print(f"  Monthly breakdown:")
    for r in fc.get('ForecastResultsByTime', []):
        print(f"    {r['TimePeriod']['Start']} -> {r['TimePeriod']['End']}: ${float(r['MeanValue']):,.2f}")

# ---------- 6. Combined forecast ----------
print()
print("="*80)
print("COMBINED AWS FORECAST (mean) — both orgs summed")
print("="*80)
fc_c = load('fc_class'); fc_r = load('fc_collab')
by_m = defaultdict(float)
for r in fc_c.get('ForecastResultsByTime', []):
    by_m[r['TimePeriod']['Start']] += float(r['MeanValue'])
for r in fc_r.get('ForecastResultsByTime', []):
    by_m[r['TimePeriod']['Start']] += float(r['MeanValue'])
total = float(fc_c['Total']['Amount']) + float(fc_r['Total']['Amount'])
print(f"3-month total combined forecast: ${total:,.2f}")
print(f"Per-month average:               ${total/3:,.2f}")
print(f"By period:")
for m in sorted(by_m): print(f"  starting {m}: ${by_m[m]:,.2f}")

# ---------- 7. RI utilization ----------
print()
print("="*80)
print("RESERVED INSTANCE UTILIZATION (last 90 days)")
print("="*80)
for prof in ('class','collab'):
    ri = load(f'ri_{prof}')
    print(f"\n{prof.upper()}")
    util_periods = ri.get('UtilizationsByTime', [])
    if not util_periods:
        print("  (no RIs in this org)")
        continue
    for u in util_periods:
        t = u.get('Total', {})
        period = u.get('TimePeriod',{}).get('Start','?')
        if not t:
            print(f"  {period}: no RI utilization data")
            continue
        util_pct = float(t.get('UtilizationPercentage',0))
        amort = float(t.get('AmortizedFee', 0))
        net_sav = float(t.get('NetRISavings', 0))
        unused_hrs = float(t.get('UnusedHours', 0))
        print(f"  {period}  util={util_pct:>5.1f}%  net_savings=${net_sav:,.2f}  unused_hrs={unused_hrs:,.0f}")

# ---------- 8. SP utilization ----------
print()
print("="*80)
print("SAVINGS PLANS UTILIZATION (last 90 days)")
print("="*80)
for prof in ('class','collab'):
    sp = load(f'sp_{prof}')
    if sp.get('_error'):
        print(f"\n{prof.upper()}: {sp['_error'][:120]}")
        continue
    print(f"\n{prof.upper()}")
    periods = sp.get('SavingsPlansUtilizationsByTime', [])
    if not periods:
        # check top-level Total
        t = sp.get('Total', {}).get('Utilization', {})
        if t:
            print(f"  overall util={float(t.get('UtilizationPercentage',0)):.1f}%  unused=${float(t.get('UnusedCommitment',0)):,.2f}")
        continue
    for p in periods:
        util = p.get('Utilization', {})
        period = p.get('TimePeriod',{}).get('Start','?')
        util_pct = float(util.get('UtilizationPercentage',0))
        unused = float(util.get('UnusedCommitment',0))
        net_sav = float(p.get('Savings',{}).get('NetSavings',0))
        print(f"  {period}  util={util_pct:>5.1f}%  unused_commit=${unused:,.2f}  net_savings=${net_sav:,.2f}")

# ---------- 9. Top linked accounts ----------
print()
print("="*80)
print("TOP LINKED ACCOUNTS — Apr 2026")
print("="*80)
for prof in ('class','collab'):
    la = load(f'la_{prof}')
    apr = next((r for r in la['ResultsByTime'] if r['TimePeriod']['Start']=='2026-04-01'), None)
    if not apr: continue
    print(f"\n{prof.upper()}")
    groups = sorted(apr['Groups'], key=lambda g: float(g['Metrics']['UnblendedCost']['Amount']), reverse=True)[:10]
    for g in groups:
        amt = float(g['Metrics']['UnblendedCost']['Amount'])
        print(f"  {g['Keys'][0]:<20}  ${amt:>14,.2f}")
