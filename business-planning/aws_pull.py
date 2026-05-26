#!/usr/bin/env python3
"""Pull all AWS Cost Explorer data needed for July-trough analysis."""
import subprocess, json, sys, os
from collections import defaultdict

AWS = '/opt/homebrew/bin/aws'
OUT = '/Users/russellteter/Documents/Claude/Projects/Business Planning/aws_data'
os.makedirs(OUT, exist_ok=True)

def ce(profile, args, timeout=90):
    cmd = [AWS, 'ce'] + args + ['--profile', profile]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        return {'_error': r.stderr.strip(), '_cmd': ' '.join(cmd)}
    return json.loads(r.stdout)

START, END = '2025-11-01', '2026-05-21'

# [1] cost-by-service, monthly, 6 months
args_svc = ['get-cost-and-usage','--time-period',f'Start={START},End={END}',
            '--granularity','MONTHLY','--metrics','UnblendedCost',
            '--group-by','Type=DIMENSION,Key=SERVICE']
for prof in ('class','collab'):
    print(f"[1] cost-by-service: {prof}...", flush=True)
    data = ce(prof, args_svc)
    with open(f'{OUT}/svc_{prof}.json','w') as f: json.dump(data, f)
    print(f"    rows={len(data.get('ResultsByTime',[]))} err={data.get('_error')}", flush=True)

# [2] cost-by-linked-account, monthly, 6 months
args_la = ['get-cost-and-usage','--time-period',f'Start={START},End={END}',
           '--granularity','MONTHLY','--metrics','UnblendedCost',
           '--group-by','Type=DIMENSION,Key=LINKED_ACCOUNT']
for prof in ('class','collab'):
    print(f"[2] cost-by-linked-account: {prof}...", flush=True)
    data = ce(prof, args_la)
    with open(f'{OUT}/la_{prof}.json','w') as f: json.dump(data, f)
    print(f"    rows={len(data.get('ResultsByTime',[]))} err={data.get('_error')}", flush=True)

# [3] AWS forecast next 3 months
F_START, F_END = '2026-05-22', '2026-08-22'
args_fc = ['get-cost-forecast','--time-period',f'Start={F_START},End={F_END}',
          '--metric','UNBLENDED_COST','--granularity','MONTHLY',
          '--prediction-interval-level','80']
for prof in ('class','collab'):
    print(f"[3] forecast: {prof}...", flush=True)
    data = ce(prof, args_fc)
    with open(f'{OUT}/fc_{prof}.json','w') as f: json.dump(data, f)
    print(f"    err={data.get('_error')}", flush=True)

# [4] RI utilization last 90 days
RI_START, RI_END = '2026-02-20', '2026-05-21'
args_ri = ['get-reservation-utilization','--time-period',f'Start={RI_START},End={RI_END}',
          '--granularity','MONTHLY']
for prof in ('class','collab'):
    print(f"[4] RI utilization: {prof}...", flush=True)
    data = ce(prof, args_ri)
    with open(f'{OUT}/ri_{prof}.json','w') as f: json.dump(data, f)
    print(f"    err={data.get('_error')}", flush=True)

# [5] Savings Plans utilization
args_sp = ['get-savings-plans-utilization','--time-period',f'Start={RI_START},End={RI_END}',
          '--granularity','MONTHLY']
for prof in ('class','collab'):
    print(f"[5] SP utilization: {prof}...", flush=True)
    data = ce(prof, args_sp)
    with open(f'{OUT}/sp_{prof}.json','w') as f: json.dump(data, f)
    print(f"    err={data.get('_error')}", flush=True)

print("DONE", flush=True)
