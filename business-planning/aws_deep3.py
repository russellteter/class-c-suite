#!/usr/bin/env python3
"""Class daily by linked account + map slide names to accounts."""
import subprocess, json
from collections import defaultdict

AWS = '/opt/homebrew/bin/aws'
OUT = '/Users/russellteter/Documents/Claude/Projects/Business Planning/aws_data'

def run(cmd, timeout=90):
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0: return {'_error': r.stderr.strip()}
    try: return json.loads(r.stdout)
    except: return {'_raw': r.stdout}

print("[A] Pulling daily Class costs by linked account, Mar 1 - May 21...")
chunks = [('2026-03-01','2026-03-15'),('2026-03-15','2026-03-29'),
          ('2026-03-29','2026-04-12'),('2026-04-12','2026-04-26'),
          ('2026-04-26','2026-05-10'),('2026-05-10','2026-05-21')]
all_daily = []
for s, e in chunks:
    data = run([AWS,'ce','get-cost-and-usage','--time-period',f'Start={s},End={e}',
                '--granularity','DAILY','--metrics','UnblendedCost',
                '--group-by','Type=DIMENSION,Key=LINKED_ACCOUNT','--profile','class'])
    if data.get('_error'):
        print(f"  ERR {s}->{e}: {data['_error'][:100]}")
        continue
    all_daily.append(data)

# Account name map (built from prior pull)
NAMES = {
  '801209164548':'bb-collab-stage-prod','421879804649':'bb-master-payer-collab',
  '534043937800':'collab-cost-engine-1','604924297407':'bb-foundations-realtime-media-prod',
  '901815150899':'bb-foundations-collab-session-prod','520314695264':'bb-collab-dev-test',
  '133281126571':'collab-cost-engine-3',
  '209504901337':'pod-2-sa-east-1-prod','223874782320':'pod-4-us-east-1-prod',
  '339936864690':'pod-9-us-east-1-prod','916490377371':'pod-5-us-east-1-prod',
  '924452390524':'pod-3-eu-central-1-prod','166358034877':'data-prod',
  '948135652681':'class-cost-engine-1','850687828897':'integration',
  '783411846536':'ClassEDU-master','228727124109':'pod-1-ca-central-1-prod',
  '834267657997':'ClassEDU-Production','115977872103':'pod-10-us-east-1-prod',
  '517753580724':'core-services-prod','311033282749':'global-production',
  '326592173513':'pod-6-eu-central-1-d6','438038674556':'recording-prod',
  '136906334466':'class-rtc-prod','971611553307':'pod-2-ap-southeast-2-prod',
  '906267470234':'pod-1-us-east-2-hipaa',
}

acct_daily = defaultdict(dict)
for data in all_daily:
    for r in data.get('ResultsByTime', []):
        day = r['TimePeriod']['Start']
        for g in r['Groups']:
            acct = g['Keys'][0]
            cost = float(g['Metrics']['UnblendedCost']['Amount'])
            acct_daily[acct][day] = cost

with open(f'{OUT}/class_acct_daily.json','w') as f:
    json.dump({k: v for k,v in acct_daily.items()}, f)

print(f"\n[B] CLASS — daily avg pre-Apr-9 vs post-Apr-16 (gap = migration window):")
print(f"  {'Account':<35}{'Pre-Apr-9 $/d':>15}{'Post-Apr-16 $/d':>17}{'Delta/d':>12}{'Delta/mo':>14}")
print("-"*95)
results = []
for acct, days in acct_daily.items():
    pre = [c for d,c in days.items() if d < '2026-04-09']
    post = [c for d,c in days.items() if d >= '2026-04-16']
    if not pre or not post: continue
    pre_avg = sum(pre)/len(pre); post_avg = sum(post)/len(post)
    delta = post_avg - pre_avg
    results.append((acct, pre_avg, post_avg, delta))
results.sort(key=lambda x: abs(x[3]), reverse=True)
for r in results[:15]:
    name = NAMES.get(r[0], r[0])
    print(f"  {name[:34]:<35}${r[1]:>13,.2f}${r[2]:>15,.2f}${r[3]:>10,.2f}${r[3]*30:>12,.2f}")

# Class totals daily pre vs post
print(f"\n[C] CLASS — TOTAL daily avg pre-Apr-9 vs post-Apr-16:")
all_pre = []; all_post = []
for acct, days in acct_daily.items():
    for d, c in days.items():
        if d < '2026-04-09': all_pre.append(c)
        elif d >= '2026-04-16': all_post.append(c)
# Sum by date instead
totals_by_date = defaultdict(float)
for acct, days in acct_daily.items():
    for d, c in days.items():
        totals_by_date[d] += c
pre_t = [c for d,c in totals_by_date.items() if d < '2026-04-09']
post_t = [c for d,c in totals_by_date.items() if d >= '2026-04-16']
print(f"  Pre-Apr-9 daily avg:   ${sum(pre_t)/len(pre_t):>10,.2f} (n={len(pre_t)} days)")
print(f"  Post-Apr-16 daily avg: ${sum(post_t)/len(post_t):>10,.2f} (n={len(post_t)} days)")
print(f"  Monthly delta:         ${(sum(post_t)/len(post_t) - sum(pre_t)/len(pre_t))*30:>10,.2f}")

# Same for Collab
print(f"\n[D] COLLAB — TOTAL daily avg pre-Apr-16 vs post-Apr-16:")
with open(f'{OUT}/collab_acct_daily.json') as f:
    collab_d = json.load(f)
totals_by_date = defaultdict(float)
for acct, days in collab_d.items():
    for d, c in days.items():
        totals_by_date[d] += c
pre_t = [c for d,c in totals_by_date.items() if d < '2026-04-16']
post_t = [c for d,c in totals_by_date.items() if d >= '2026-04-16']
print(f"  Pre-Apr-16 daily avg:   ${sum(pre_t)/len(pre_t):>10,.2f} (n={len(pre_t)} days)")
print(f"  Post-Apr-16 daily avg:  ${sum(post_t)/len(post_t):>10,.2f} (n={len(post_t)} days)")
print(f"  Monthly delta:          ${(sum(post_t)/len(post_t) - sum(pre_t)/len(pre_t))*30:>10,.2f}")

# Combined daily
print(f"\n[E] COMBINED (Class + Collab) — total daily, last 21 days vs pre-migration baseline:")
class_by_date = defaultdict(float)
for acct, days in acct_daily.items():
    for d, c in days.items(): class_by_date[d] += c
combined = defaultdict(float)
for d, c in class_by_date.items(): combined[d] += c
for d, c in totals_by_date.items(): combined[d] += c

all_dates = sorted(combined.keys())
# Most recent 14 days (post-stabilization)
recent14 = all_dates[-14:]
recent_avg = sum(combined[d] for d in recent14)/len(recent14)
# Pre-migration baseline = first 14 days of data (early March)
early14 = all_dates[:14]
early_avg = sum(combined[d] for d in early14)/len(early14)
print(f"  Early Mar (pre-migration) daily avg: ${early_avg:>10,.2f}  (=${early_avg*30:>10,.2f}/mo)")
print(f"  Last 14 days daily avg:              ${recent_avg:>10,.2f}  (=${recent_avg*30:>10,.2f}/mo)")
print(f"  Monthly improvement (combined):      ${(recent_avg-early_avg)*30:>10,.2f}")
