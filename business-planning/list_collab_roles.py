#!/usr/bin/env python3
"""List available SSO roles on bb-master-payer-collab account."""
import json, glob, subprocess

collab_token = None
for f in glob.glob('/Users/russellteter/.aws/sso/cache/*.json'):
    try:
        with open(f) as fh: data = json.load(fh)
        if data.get('startUrl', '').startswith('https://d-9067b2215a'):
            collab_token = data['accessToken']; break
    except Exception: continue

if not collab_token:
    print("NO_TOKEN"); exit(1)

result = subprocess.run([
    '/opt/homebrew/bin/aws', 'sso', 'list-account-roles',
    '--account-id', '421879804649',
    '--access-token', collab_token,
    '--region', 'us-east-1'
], capture_output=True, text=True)

print(result.stdout if result.returncode==0 else result.stderr)
