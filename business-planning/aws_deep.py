#!/usr/bin/env python3
"""Deep AWS dive: linked account names, daily trends, destination accounts."""
import subprocess, json, os
from collections import defaultdict

AWS = '/opt/homebrew/bin/aws'
OUT = '/Users/russellteter/Documents/Claude/Projects/Business Planning/aws_data'

def run(cmd, timeout=60):
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        return {'_error': r.stderr.strip()}
    try: return json.loads(r.stdout)
    except: return {'_raw': r.stdout}

# [A] List org accounts for both profiles (get friendly names)
for prof in ('class','collab'):
    print(f"\n[A] Listing org accounts: {prof}")
    data = run([AWS,'organizations','list-accounts','--profile',prof])
    if data.get('_error'):
        print(f"  ERR: {data['_error'][:120]}")
        continue
    accounts = data.get('Accounts',[])
    print(f"  Found {len(accounts)} accounts")
    with open(f'{OUT}/orgs_{prof}.json','w') as f: json.dump(data, f)
    for a in accounts[:30]:
        print(f"  {a.get('Id'):<14} {a.get('Name','')[:35]:<35} status={a.get('Status')}")
    if len(accounts) > 30:
        print(f"  ... +{len(accounts)-30} more")
