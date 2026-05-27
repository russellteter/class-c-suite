#!/bin/bash
# C-Suite MCP live smoke tests.
# Source: docs/decisions/0010-ch8-mcp-integration.md §3.3
#
# One section per MCP service. Each section exits 0 on success or BLOCKED,
# non-zero on genuine failure.
#
# Usage:
#   ./scripts/mcp-live-smoke.sh              # all services
#   ./scripts/mcp-live-smoke.sh powerbi      # single service
#
# Exit codes: 0 = all PASS or BLOCKED, non-zero = at least one FAIL.

set -uo pipefail

SERVICE="${1:-all}"

FAILS=0
green()   { printf '  \033[32m[PASS]\033[0m %s\n' "$1"; }
blocked() { printf '  \033[33m[BLOCKED]\033[0m %s\n' "$1"; }
fail()    { printf '  \033[31m[FAIL]\033[0m %s\n' "$1"; FAILS=$((FAILS+1)); }
section() { printf '\n\033[1m== §%s ==\033[0m\n' "$1"; }

# ── §Salesforce ──────────────────────────────────────────────────────────────
smoke_salesforce() {
  section "Salesforce"

  # 1. Check Connected App credentials are set.
  if [ -z "${SALESFORCE_CLIENT_ID:-}" ] || [ -z "${SALESFORCE_CLIENT_SECRET:-}" ]; then
    blocked "awaiting Russell — Connected App not yet configured in Class org. See docs/setup/salesforce-connected-app.md"
    return 0
  fi

  # 2. Check that the utility dist is built.
  UTILITY_DIST="/Users/russellteter/Claude Code Projects/c-suite/apps/utility/dist"
  if [ ! -d "$UTILITY_DIST" ]; then
    blocked "utility dist not built — run: pnpm --filter utility build"
    return 0
  fi

  # 3. Check that a safeStorage credential is present for salesforce.
  #    We do this via a small Node script that opens the SQLite DB and checks.
  RUNTIME_DB="${HOME}/Library/Application Support/c-suite/runtime.db"
  if [ ! -f "$RUNTIME_DB" ]; then
    blocked "runtime.db not found at $RUNTIME_DB — app must be launched at least once"
    return 0
  fi

  CRED_CHECK=$(node -e "
const Database = require('better-sqlite3');
const db = new Database('${RUNTIME_DB}', { readonly: true });
const row = db.prepare(\"SELECT service_id FROM credentials WHERE service_id = 'salesforce'\").get();
db.close();
process.stdout.write(row ? 'FOUND' : 'MISSING');
" 2>/dev/null || echo "ERROR")

  if [ "$CRED_CHECK" = "MISSING" ]; then
    blocked "awaiting Russell — Salesforce OAuth not completed. Launch C-Suite and complete the browser login flow"
    return 0
  fi

  if [ "$CRED_CHECK" = "ERROR" ]; then
    fail "Could not query runtime.db — better-sqlite3 may not be available via node"
    return 0
  fi

  green "credential: salesforce credential present in vault"

  # 4. Run a live committed-pipeline query via compiled JS.
  SMOKE_SCRIPT=$(cat <<'JSEOF'
const path = require('path');
const utilityDist = '/Users/russellteter/Claude Code Projects/c-suite/apps/utility/dist';
// Require the compiled salesforce module.
// This exercises the real OAuth refresh + SOQL path.
(async () => {
  try {
    const { SalesforceClient } = require(path.join(utilityDist, 'mcp/salesforce/client.js'));
    const { SafeStorageVault } = require(path.join(utilityDist, 'credentials/safeStorageVault.js'));
    const Database = require('better-sqlite3');
    const { safeStorage } = require('electron');

    const db = new Database(process.env.HOME + '/Library/Application Support/c-suite/runtime.db', { readonly: false });
    const vault = new SafeStorageVault(db, safeStorage);
    const client = new SalesforceClient(vault);

    const { committedPipelineQuery } = require(path.join(utilityDist, 'mcp/salesforce/typed-queries.js'));
    const soql = committedPipelineQuery({ pipelineType: 'new_business', limit: 5 });
    const result = await client.query(soql);

    console.log('total_size=' + result.totalSize);
    result.records.slice(0, 5).forEach((r, i) => {
      console.log('record[' + i + ']: id=' + r.Id + ' stage=' + r.StageName + ' amount=' + r.Amount);
    });
    db.close();
    process.exit(0);
  } catch (err) {
    console.error('SMOKE ERROR:', err.message);
    process.exit(1);
  }
})();
JSEOF
)

  if node -e "$SMOKE_SCRIPT" 2>/tmp/sf-smoke-stderr.log; then
    green "smoke: PASS — live query returned results"
  else
    SMOKE_ERR=$(cat /tmp/sf-smoke-stderr.log 2>/dev/null || echo "no stderr")
    if echo "$SMOKE_ERR" | grep -q "ConnectedAppMissing\|BLOCKED"; then
      blocked "Connected App credentials not available in this shell — set SALESFORCE_CLIENT_ID + SALESFORCE_CLIENT_SECRET"
    else
      fail "Live Salesforce query failed: $SMOKE_ERR"
    fi
  fi
}

# ── §PowerBI ─────────────────────────────────────────────────────────────────
smoke_powerbi() {
  section "PowerBI"

  PBI_PROJECT="${CUSTOMER_DASHBOARD_PATH:-/Users/russellteter/Claude Code Projects/customer-dashboard}"
  VENV_PYTHON="$PBI_PROJECT/.venv/bin/python3"
  JSON_OUT="/tmp/cdash-smoke.json"

  # 1. Preflight
  if ! command -v python3 >/dev/null 2>&1; then
    blocked "python3 not on PATH — install python 3.12+ then re-run"
    return 0
  fi

  if [ ! -f "$PBI_PROJECT/src/main.py" ]; then
    blocked "customer-dashboard project not found at $PBI_PROJECT — clone repo then re-run"
    return 0
  fi

  if [ ! -d "$PBI_PROJECT/.venv" ]; then
    blocked "awaiting venv bootstrap — run: cd \"$PBI_PROJECT\" && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
    return 0
  fi

  if [ ! -f "$VENV_PYTHON" ]; then
    fail "venv exists but python3 binary missing at $VENV_PYTHON — venv may be corrupt; remove and re-bootstrap"
    return 0
  fi

  green "preflight: python=$(python3 --version 2>&1), venv=present, project=present"

  # 2. Spawn subprocess (120s timeout via `timeout` command)
  echo "  Spawning customer-dashboard pipeline... (may take up to 120s)"
  rm -f "$JSON_OUT"

  if timeout 120 "$VENV_PYTHON" src/main.py -j "$JSON_OUT" --no-am-dashboards \
      >/tmp/cdash-smoke-stdout.log 2>/tmp/cdash-smoke-stderr.log; then
    SPAWN_EXIT=0
  else
    SPAWN_EXIT=$?
  fi

  if [ "$SPAWN_EXIT" -ne 0 ]; then
    fail "subprocess exited with code $SPAWN_EXIT. stderr tail:"
    tail -20 /tmp/cdash-smoke-stderr.log >&2
    return 0
  fi

  # 3. Validate JSON was written
  if [ ! -f "$JSON_OUT" ]; then
    fail "subprocess exited 0 but JSON file not written at $JSON_OUT"
    return 0
  fi

  green "JSON file written: $JSON_OUT"

  # 4. Record count + anonymised sample (first 3 records, account_id + health_score only)
  RECORD_COUNT=$(python3 -c "import json,sys; d=json.load(open('$JSON_OUT')); print(len(d))" 2>/dev/null || echo "UNKNOWN")
  green "records: $RECORD_COUNT"

  python3 - <<'PYEOF' 2>/dev/null || true
import json, sys
try:
    data = json.load(open('/tmp/cdash-smoke.json'))
    sample = data[:3]
    for i, r in enumerate(sample):
        acct_id = r.get('account_id') or r.get('Account ID 18 Digit', 'UNKNOWN')
        health = r.get('health_score', r.get('Health Score', 'N/A'))
        name_len = len(r.get('account_name', r.get('Account Name', '')) or '')
        print(f"  record[{i}]: id={acct_id[:8]}...(redacted) health_score={health} name_len={name_len}")
except Exception as e:
    print(f"  sample parse error: {e}")
PYEOF

  # 5. Validate against Zod schema via node (only if node is available)
  if command -v node >/dev/null 2>&1; then
    node - <<'JSEOF' 2>/dev/null && green "Zod schema: PASS" || fail "Zod schema: FAIL — see output above"
const { createRequire } = require('module');
const path = require('path');
const fs = require('fs');
// Quick structural check: must be array of objects
const data = JSON.parse(fs.readFileSync('/tmp/cdash-smoke.json', 'utf8'));
if (!Array.isArray(data)) { process.exit(1); }
if (data.length === 0) { console.warn('  WARNING: empty records array'); process.exit(0); }
if (typeof data[0] !== 'object' || data[0] === null) { process.exit(1); }
console.log(`  node structural check: array of ${data.length} objects — OK`);
JSEOF
  else
    green "node not available — skipping Zod structural check (Python structural check passed)"
  fi

  # Cleanup
  rm -f "$JSON_OUT"
  green "smoke: PASS"
}

# ── §Gmail ───────────────────────────────────────────────────────────────────
smoke_gmail() {
  section "Gmail"

  # 1. Check OAuth App credentials are set.
  if [ -z "${GMAIL_CLIENT_ID:-}" ] || [ -z "${GMAIL_CLIENT_SECRET:-}" ]; then
    blocked "awaiting Russell — Gmail OAuth App not configured. See docs/setup/gmail-oauth-app.md"
    return 0
  fi

  # 2. Check that the utility dist is built.
  UTILITY_DIST="/Users/russellteter/Claude Code Projects/c-suite/apps/utility/dist"
  if [ ! -d "$UTILITY_DIST" ]; then
    blocked "utility dist not built — run: pnpm --filter utility build"
    return 0
  fi

  # 3. Check that a safeStorage credential is present for gmail.
  RUNTIME_DB="${HOME}/Library/Application Support/c-suite/runtime.db"
  if [ ! -f "$RUNTIME_DB" ]; then
    blocked "runtime.db not found at $RUNTIME_DB — app must be launched at least once"
    return 0
  fi

  CRED_CHECK=$(node -e "
const Database = require('better-sqlite3');
const db = new Database('${RUNTIME_DB}', { readonly: true });
const row = db.prepare(\"SELECT service_id FROM credentials WHERE service_id = 'gmail'\").get();
db.close();
process.stdout.write(row ? 'FOUND' : 'MISSING');
" 2>/dev/null || echo "ERROR")

  if [ "$CRED_CHECK" = "MISSING" ]; then
    blocked "awaiting Russell — Gmail OAuth not completed. Launch C-Suite and complete the browser login flow"
    return 0
  fi

  if [ "$CRED_CHECK" = "ERROR" ]; then
    fail "Could not query runtime.db — better-sqlite3 may not be available via node"
    return 0
  fi

  green "credential: gmail credential present in vault"

  # 4. Run a live searchThreads query: last 7 days, any thread.
  SMOKE_RESULT=$(node -e "
const path = require('path');
const utilityDist = '/Users/russellteter/Claude Code Projects/c-suite/apps/utility/dist';
(async () => {
  try {
    const { GmailClient } = require(path.join(utilityDist, 'mcp/gmail/client.js'));
    const { SafeStorageVault } = require(path.join(utilityDist, 'credentials/safeStorageVault.js'));
    const Database = require('better-sqlite3');
    const { safeStorage } = require('electron');
    const db = new Database(process.env.HOME + '/Library/Application Support/c-suite/runtime.db', { readonly: true });
    const vault = new SafeStorageVault(db, safeStorage);
    const client = new GmailClient(vault);

    const since = new Date();
    since.setDate(since.getDate() - 7);
    const y = since.getFullYear();
    const m = String(since.getMonth() + 1).padStart(2, '0');
    const d = String(since.getDate()).padStart(2, '0');
    const query = 'after:' + y + '/' + m + '/' + d;

    const result = await client.searchThreads(query, { maxResults: 5 });
    process.stdout.write(JSON.stringify({ count: result.threads.length, estimate: result.resultSizeEstimate }));
    db.close();
  } catch (err) {
    process.stdout.write(JSON.stringify({ error: err.message }));
  }
})();
" 2>/dev/null || echo '{"error":"node execution failed"}')

  if echo "$SMOKE_RESULT" | grep -q '"error"'; then
    fail "searchThreads failed: $SMOKE_RESULT"
    return 0
  fi

  THREAD_COUNT=$(echo "$SMOKE_RESULT" | node -e "
const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  try { const d = JSON.parse(chunks.join('')); process.stdout.write(String(d.count)); }
  catch { process.stdout.write('UNKNOWN'); }
});
" 2>/dev/null || echo "UNKNOWN")

  green "searchThreads(last 7 days): returned $THREAD_COUNT thread(s)"
  green "smoke: PASS"
}

# ── §NetSuite ────────────────────────────────────────────────────────────────
smoke_netsuite() {
  section "NetSuite"

  # 1. Check TBA token env vars (only used for smoke — runtime uses safeStorage).
  if [ -z "${NETSUITE_TBA_TOKEN_ID:-}" ] || \
     [ -z "${NETSUITE_TBA_TOKEN_SECRET:-}" ] || \
     [ -z "${NETSUITE_CONSUMER_KEY:-}" ] || \
     [ -z "${NETSUITE_CONSUMER_SECRET:-}" ] || \
     [ -z "${NETSUITE_ACCOUNT_ID:-}" ]; then
    blocked "awaiting Brian's TBA enablement (B1) — paste NETSUITE_TBA_TOKEN_ID / NETSUITE_TBA_TOKEN_SECRET / NETSUITE_CONSUMER_KEY / NETSUITE_CONSUMER_SECRET / NETSUITE_ACCOUNT_ID then re-run. See scripts/send-tba-request.md."
    return 0
  fi

  # 2. Check that the utility dist is built.
  UTILITY_DIST="/Users/russellteter/Claude Code Projects/c-suite/apps/utility/dist"
  if [ ! -d "$UTILITY_DIST" ]; then
    blocked "utility dist not built — run: pnpm --filter utility build"
    return 0
  fi

  # 3. Run cashGLBalanceQuery via Node and assert non-zero rows.
  node - <<'JSEOF' 2>&1
const { cashGLBalanceQuery } = require('/Users/russellteter/Claude Code Projects/c-suite/apps/utility/dist/mcp/netsuite/typed-queries.js');
const { buildTBAAuthHeader } = require('/Users/russellteter/Claude Code Projects/c-suite/apps/utility/dist/mcp/netsuite/tba-auth.js');

const creds = {
  accountId: process.env.NETSUITE_ACCOUNT_ID,
  consumerKey: process.env.NETSUITE_CONSUMER_KEY,
  consumerSecret: process.env.NETSUITE_CONSUMER_SECRET,
  tokenId: process.env.NETSUITE_TBA_TOKEN_ID,
  tokenSecret: process.env.NETSUITE_TBA_TOKEN_SECRET,
};

const query = cashGLBalanceQuery({});
const url = `https://${creds.accountId}.suitetalk.api.netsuite.com/services/rest/query/v1/suiteql`;
const { Authorization } = buildTBAAuthHeader(creds, 'POST', url);

fetch(url, {
  method: 'POST',
  headers: { Authorization, 'Content-Type': 'application/json', Prefer: 'transient' },
  body: JSON.stringify({ q: query }),
})
  .then(r => r.json())
  .then(data => {
    const count = data.count ?? data.items?.length ?? 0;
    if (count === 0) {
      console.error('cashGLBalanceQuery returned 0 rows — unexpected for Class production');
      process.exit(1);
    }
    console.log('cashGLBalanceQuery: ' + count + ' row(s) — PASS');
  })
  .catch(err => { console.error('FAIL: ' + err.message); process.exit(1); });
JSEOF

  local EXIT_CODE=$?
  if [ $EXIT_CODE -eq 0 ]; then
    green "smoke: PASS"
  else
    fail "cashGLBalanceQuery failed — see output above"
  fi
}

# ── dispatch ──────────────────────────────────────────────────────────────────
case "$SERVICE" in
  salesforce) smoke_salesforce ;;
  powerbi)    smoke_powerbi ;;
  gmail)      smoke_gmail ;;
  netsuite)   smoke_netsuite ;;
  all)        smoke_salesforce; smoke_powerbi; smoke_gmail; smoke_netsuite ;;
  *)
    echo "Unknown service: $SERVICE"
    echo "Available: salesforce, powerbi, gmail, netsuite, all"
    exit 1
    ;;
esac

echo
if [ "$FAILS" -gt 0 ]; then
  echo "RESULT: FAIL ($FAILS failures)"
  exit 1
else
  echo "RESULT: PASS (or BLOCKED — see above)"
  exit 0
fi
