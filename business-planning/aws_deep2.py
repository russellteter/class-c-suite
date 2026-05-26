#!/usr/bin/env python3
"""Get linked account names via CE dimension values, then daily trends."""
import subprocess, json
from collections import defaultdict

AWS = '/opt/homebrew/bin/aws'
OUT = '/Users/russellteter/Documents/Claude/Projects/Business Planning/aws_data'

def run(cmd, timeout=90):
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        return {'_error': r.stderr.strip()}
    try: return json.loads(r.stdout)
    except: return {'_raw': r.stdout}

# Get LINKED_ACCOUNT dimension VALUES (which include names in attributes)
for prof in ('class','collab'):
    print(f"\n[A] Linked account names: {prof}")
    data = run([AWS,'ce','get-dimension-values',
                '--time-period','Start=2026-04-01,End=2026-05-01',
                '--dimension','LINKED_ACCOUNT',
                '--profile',prof])
    if data.get('_error'):
        print(f"  ERR: {data['_error'][:120]}")
        continue
    vals = data.get('DimensionValues', [])
    with open(f'{OUT}/accounts_{prof}.json','w') as f: json.dump(data, f)
    for v in vals:
        attr = v.get('Attributes',{})
        print(f"  {v.get('Value'):<14} {attr.get('description', attr.get('Description',''))[:50]}")

# Daily cost trend by LINKED_ACCOUNT for COLLAB, March 1 - May 20
# (limit 14 days per CE call for daily, so do it in chunks)
print("\n[B] Pulling daily cost by linked account for COLLAB (chunks of 14 days)...")
chunks = [
    ('2026-03-01','2026-03-15'),
    ('2026-03-15','2026-03-29'),
    ('2026-03-29','2026-04-12'),
    ('2026-04-12','2026-04-26'),
    ('2026-04-26','2026-05-10'),
    ('2026-05-10','2026-05-21'),
]
all_daily = []
for s, e in chunks:
    data = run([AWS,'ce','get-cost-and-usage',
                '--time-period',f'Start={s},End={e}',
                '--granularity','DAILY','--metrics','UnblendedCost',
                '--group-by','Type=DIMENSION,Key=LINKED_ACCOUNT',
                '--profile','collab'])
    if data.get('_error'):
        print(f"  ERR {s}->{e}: {data['_error'][:100]}")
        continue
    all_daily.append(data)

with open(f'{OUT}/daily_collab.json','w') as f: json.dump(all_daily, f)

# Aggregate: for each linked account, get daily series
acct_daily = defaultdict(dict)
for data in all_daily:
    for r in data.get('ResultsByTime', []):
        day = r['TimePeriod']['Start']
        for g in r['Groups']:
            acct = g['Keys'][0]
            cost = float(g['Metrics']['UnblendedCost']['Amount'])
            acct_daily[acct][day] = cost

# Print top accounts with daily pre-Apr-16 vs post-Apr-16 avg
print(f"\n[C] Collab linked-account daily avg pre-Apr-16 vs post-Apr-16:")
print(f"  {'Account':<16}{'Pre-Apr-16 daily avg':>22}{'Post-Apr-16 daily avg':>24}{'Delta/day':>14}{'Delta/mo':>14}")
print("-"*90)
results = []
for acct, days in acct_daily.items():
    pre = [c for d,c in days.items() if d < '2026-04-16']
    post = [c for d,c in days.items() if d >= '2026-04-16']
    if not pre or not post: continue
    pre_avg = sum(pre)/len(pre)
    post_avg = sum(post)/len(post)
    delta = post_avg - pre_avg
    results.append((acct, pre_avg, post_avg, delta, delta*30))
# Sort by absolute delta descending
results.sort(key=lambda x: abs(x[3]), reverse=True)
for r in results[:15]:
    print(f"  {r[0]:<16}${r[1]:>20,.2f}${r[2]:>22,.2f}${r[3]:>12,.2f}${r[4]:>12,.2f}")

# Save aggregated for next step
with open(f'{OUT}/collab_acct_daily.json','w') as f:
    json.dump({k: v for k,v in acct_daily.items()}, f)
print(f"\n[D] Saved {len(acct_daily)} accounts to collab_acct_daily.json")
