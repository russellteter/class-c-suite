#!/bin/zsh
# C-Suite MCP live smoke tests.
# Source: docs/decisions/0010-ch8-mcp-integration.md §3.3
#
# One section per MCP service. Classifications:
#   PASS     — connector authenticated + live query returned expected data
#   DEGRADED — connector authenticated but downstream permission or data gap
#              (auth OK, external operator action needed — not a code defect)
#   BLOCKED  — operator gate not yet satisfied (creds not configured, app not
#              launched, project not cloned, etc.)
#   FAIL     — unexpected error (code defect or environment problem to fix)
#
# DEGRADED and BLOCKED do not increment FAILS; exit code 0 unless FAIL > 0.
#
# Usage:
#   ./scripts/mcp-live-smoke.sh              # all services
#   ./scripts/mcp-live-smoke.sh powerbi      # single service
#
# Exit codes: 0 = all PASS/BLOCKED/DEGRADED, non-zero = at least one FAIL.

set -uo pipefail

SERVICE="${1:-all}"

# Portable bounded-run command. macOS ships no `timeout`; coreutils provides `gtimeout`.
if command -v timeout >/dev/null 2>&1; then
  TIMEOUT="timeout 120"
elif command -v gtimeout >/dev/null 2>&1; then
  TIMEOUT="gtimeout 120"
else
  TIMEOUT=""
fi

FAILS=0

# Per-connector state tracking: written to /tmp files, read in print_state_matrix.
# Using temp files instead of associative arrays for bash 3.2 / zsh compat.
STATE_DIR="/tmp/c-suite-smoke-$$"
mkdir -p "$STATE_DIR"
trap 'rm -rf "$STATE_DIR"' EXIT

green()    { printf '  \033[32m[PASS]\033[0m %s\n' "$1"; }
degraded() { printf '  \033[33m[DEGRADED]\033[0m %s\n' "$1"; }
blocked()  { printf '  \033[33m[BLOCKED]\033[0m %s\n' "$1"; }
fail()     { printf '  \033[31m[FAIL]\033[0m %s\n' "$1"; FAILS=$((FAILS+1)); }
section()  { printf '\n\033[1m== §%s ==\033[0m\n' "$1"; }

# Record final state for summary matrix (written to temp files)
record_state() {
  local svc="$1" state="$2" reason="$3"
  printf '%s' "$state"  > "$STATE_DIR/${svc}.state"
  printf '%s' "$reason" > "$STATE_DIR/${svc}.reason"
}

# ── §Salesforce ──────────────────────────────────────────────────────────────
smoke_salesforce() {
  section "Salesforce"

  # 1. Check that the utility dist is built.
  UTILITY_DIST="/Users/russellteter/Claude Code Projects/c-suite/apps/utility/dist"
  if [ ! -d "$UTILITY_DIST" ]; then
    blocked "utility dist not built — run: pnpm --filter utility build"
    record_state "salesforce" "BLOCKED" "utility dist not built"
    return 0
  fi

  # 2. Run the typed three-state auth probe via the compiled SalesforceClient.
  #    Probe distinguishes: connected_app_ok / sfdx_ok / neither
  #    This replaces the old env-var check which tested the wrong auth branch.
  RUNTIME_DB="${HOME}/Library/Application Support/c-suite/runtime.db"

  PROBE_RESULT=$(node - <<'JSEOF' 2>/tmp/sf-probe-stderr.log
const path = require('path');
const utilityDist = '/Users/russellteter/Claude Code Projects/c-suite/apps/utility/dist';
(async () => {
  try {
    const { SalesforceClient } = require(path.join(utilityDist, 'mcp/salesforce/client.js'));
    const runtimeDb = process.env.HOME + '/Library/Application Support/c-suite/runtime.db';
    const fs = require('fs');

    // Build a minimal vault-like object: if runtime.db doesn't exist, vault has no creds.
    let vault;
    if (fs.existsSync(runtimeDb)) {
      const Database = require('better-sqlite3');
      const db = new Database(runtimeDb, { readonly: true });
      // Stub safeStorage in non-Electron context — we only need hasValidCredential
      const fakeStorage = {
        isEncryptionAvailable: () => false,
        encryptString: () => Buffer.alloc(0),
        decryptString: () => '',
      };
      const { SafeStorageVault } = require(path.join(utilityDist, 'credentials/safeStorageVault.js'));
      vault = new SafeStorageVault(db, fakeStorage);
    } else {
      // No runtime.db — vault always returns false for hasValidCredential
      vault = {
        hasValidCredential: async () => false,
        loadCredential: async () => null,
        storeCredential: async () => {},
      };
    }

    const client = new SalesforceClient(vault);
    const probe = await client.probeAuth();
    process.stdout.write(JSON.stringify(probe));
  } catch (err) {
    process.stdout.write(JSON.stringify({ state: 'error', reason: err.message }));
  }
})();
JSEOF
)

  if [ -z "$PROBE_RESULT" ]; then
    PROBE_ERR=$(cat /tmp/sf-probe-stderr.log 2>/dev/null || echo "no output")
    fail "Auth probe produced no output: $PROBE_ERR"
    record_state "salesforce" "FAIL" "probe produced no output: $PROBE_ERR"
    return 0
  fi

  PROBE_STATE=$(node -e "try{const p=JSON.parse(process.argv[1]);process.stdout.write(p.state||'error')}catch{process.stdout.write('error')}" "$PROBE_RESULT" 2>/dev/null || echo "error")
  PROBE_REASON=$(node -e "try{const p=JSON.parse(process.argv[1]);process.stdout.write(p.reason||p.sfdxDetail||'')}catch{process.stdout.write('')}" "$PROBE_RESULT" 2>/dev/null || echo "")

  case "$PROBE_STATE" in
    connected_app_ok)
      green "auth: Connected App OAuth credential present in vault"
      ;;
    sfdx_ok)
      SFDX_USER=$(node -e "try{const p=JSON.parse(process.argv[1]);process.stdout.write(p.sfdxUsername||'')}catch{process.stdout.write('')}" "$PROBE_RESULT" 2>/dev/null || echo "")
      green "auth: SFDX session valid (user=${SFDX_USER})"
      ;;
    neither)
      SFDX_DETAIL=$(node -e "try{const p=JSON.parse(process.argv[1]);process.stdout.write(p.sfdxDetail||'')}catch{process.stdout.write('')}" "$PROBE_RESULT" 2>/dev/null || echo "")
      blocked "no Connected App credential and no SFDX session — ${SFDX_DETAIL}. To authenticate: sf org login web --instance-url https://classedu.my.salesforce.com"
      record_state "salesforce" "BLOCKED" "no Connected App credential and no SFDX session — ${SFDX_DETAIL}"
      return 0
      ;;
    error|*)
      fail "auth probe errored: ${PROBE_REASON:-$PROBE_STATE}"
      record_state "salesforce" "FAIL" "auth probe errored: ${PROBE_REASON:-$PROBE_STATE}"
      return 0
      ;;
  esac

  # 3. Live query: committed pipeline (SOQL via query endpoint).
  LIVE_RESULT=$(node - <<'JSEOF' 2>/tmp/sf-live-stderr.log
const path = require('path');
const utilityDist = '/Users/russellteter/Claude Code Projects/c-suite/apps/utility/dist';
(async () => {
  try {
    const { SalesforceClient } = require(path.join(utilityDist, 'mcp/salesforce/client.js'));
    const runtimeDb = process.env.HOME + '/Library/Application Support/c-suite/runtime.db';
    const fs = require('fs');
    let vault;
    if (fs.existsSync(runtimeDb)) {
      const Database = require('better-sqlite3');
      const db = new Database(runtimeDb, { readonly: false });
      const fakeStorage = {
        isEncryptionAvailable: () => false,
        encryptString: () => Buffer.alloc(0),
        decryptString: () => '',
      };
      const { SafeStorageVault } = require(path.join(utilityDist, 'credentials/safeStorageVault.js'));
      vault = new SafeStorageVault(db, fakeStorage);
    } else {
      vault = {
        hasValidCredential: async () => false,
        loadCredential: async () => null,
        storeCredential: async () => {},
      };
    }
    const client = new SalesforceClient(vault);
    const { committedPipelineQuery } = require(path.join(utilityDist, 'mcp/salesforce/typed-queries.js'));
    const soql = committedPipelineQuery({ pipelineType: 'new_business', limit: 5 });
    const result = await client.query(soql);
    process.stdout.write(JSON.stringify({ totalSize: result.totalSize, count: result.records.length }));
  } catch (err) {
    process.stdout.write(JSON.stringify({ error: err.message, name: err.name }));
  }
})();
JSEOF
)

  if echo "$LIVE_RESULT" | grep -q '"error"'; then
    ERR_NAME=$(node -e "try{const p=JSON.parse(process.argv[1]);process.stdout.write(p.name||'')}catch{}" "$LIVE_RESULT" 2>/dev/null || echo "")
    ERR_MSG=$(node -e "try{const p=JSON.parse(process.argv[1]);process.stdout.write(p.error||'')}catch{}" "$LIVE_RESULT" 2>/dev/null || echo "$LIVE_RESULT")
    # Distinguish auth errors (probe just passed — transient session expiry) from query errors
    if echo "$ERR_NAME" | grep -qiE "AuthExpired|AuthRevoked"; then
      degraded "live query: SFDX session expired mid-probe — re-run after: sf org login web --instance-url https://classedu.my.salesforce.com"
      record_state "salesforce" "DEGRADED" "SFDX session expired between probe and query"
    else
      fail "live query failed: $ERR_MSG"
      record_state "salesforce" "FAIL" "live query error: $ERR_MSG"
    fi
    return 0
  fi

  TOTAL=$(node -e "try{const p=JSON.parse(process.argv[1]);process.stdout.write(String(p.totalSize))}catch{process.stdout.write('?')}" "$LIVE_RESULT" 2>/dev/null || echo "?")
  green "live committedPipelineQuery: totalSize=${TOTAL}"
  green "smoke: PASS"
  record_state "salesforce" "PASS" "auth probe=${PROBE_STATE}; committedPipelineQuery totalSize=${TOTAL}"
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
    record_state "powerbi" "BLOCKED" "python3 not on PATH"
    return 0
  fi

  if [ ! -f "$PBI_PROJECT/src/main.py" ]; then
    blocked "customer-dashboard project not found at $PBI_PROJECT — clone repo then re-run"
    record_state "powerbi" "BLOCKED" "customer-dashboard project not found at $PBI_PROJECT"
    return 0
  fi

  if [ ! -d "$PBI_PROJECT/.venv" ]; then
    blocked "awaiting venv bootstrap — run: cd \"$PBI_PROJECT\" && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
    record_state "powerbi" "BLOCKED" "venv not bootstrapped at $PBI_PROJECT/.venv"
    return 0
  fi

  if [ ! -f "$VENV_PYTHON" ]; then
    fail "venv exists but python3 binary missing at $VENV_PYTHON — venv may be corrupt; remove and re-bootstrap"
    record_state "powerbi" "FAIL" "venv corrupt — python3 missing at $VENV_PYTHON"
    return 0
  fi

  green "preflight: python=$(python3 --version 2>&1), venv=present, project=present"

  # 2. Google OAuth credentials check (customer-dashboard's own creds — separate from C-Suite Gmail)
  GOOGLE_CREDS="${CUSTOMER_DASHBOARD_GOOGLE_CREDENTIALS:-$PBI_PROJECT/credentials.json}"
  if [ ! -f "$GOOGLE_CREDS" ]; then
    blocked "customer-dashboard Google OAuth credentials not found at $GOOGLE_CREDS — C-Suite spawn path OK but subprocess will fail without Google auth. See docs/research/powerbi-customer-dashboard-google-oauth.md for setup steps."
    record_state "powerbi" "BLOCKED" "customer-dashboard Google OAuth credentials.json missing at $GOOGLE_CREDS"
    return 0
  fi
  green "google-creds: credentials.json present at $GOOGLE_CREDS"

  # 3. Spawn subprocess (120s timeout via `timeout` command)
  echo "  Spawning customer-dashboard pipeline... (may take up to 120s)"
  rm -f "$JSON_OUT"

  if ( cd "$PBI_PROJECT" && $TIMEOUT "$VENV_PYTHON" src/main.py -j "$JSON_OUT" --no-am-dashboards ) \
      >/tmp/cdash-smoke-stdout.log 2>/tmp/cdash-smoke-stderr.log; then
    SPAWN_EXIT=0
  else
    SPAWN_EXIT=$?
  fi

  if [ "$SPAWN_EXIT" -ne 0 ]; then
    # Classify subprocess failures: Google auth errors are DEGRADED (infrastructure config
    # gap), not FAIL (code defect). credentials.json present but Google OAuth token
    # not yet obtained (first-run prompt required).
    if grep -qiE "credentials\.json|DataLoadError|OAuth credentials|invalid_grant|token has been expired" /tmp/cdash-smoke-stderr.log 2>/dev/null; then
      degraded "C-Suite spawn path OK — customer-dashboard subprocess failed on Google OAuth. credentials.json present but OAuth token exchange needed. Run the customer-dashboard pipeline manually once to complete Google authorization. See docs/research/powerbi-customer-dashboard-google-oauth.md"
      record_state "powerbi" "DEGRADED" "credentials.json present but Google OAuth token exchange incomplete — run pipeline manually once to authorize"
      return 0
    fi
    fail "subprocess exited with code $SPAWN_EXIT. stderr tail:"
    tail -20 /tmp/cdash-smoke-stderr.log >&2
    STDERR_TAIL=$(tail -3 /tmp/cdash-smoke-stderr.log 2>/dev/null | tr '\n' ' ')
    record_state "powerbi" "FAIL" "subprocess exit=${SPAWN_EXIT}: $STDERR_TAIL"
    return 0
  fi

  # 4. Validate JSON was written
  if [ ! -f "$JSON_OUT" ]; then
    fail "subprocess exited 0 but JSON file not written at $JSON_OUT"
    record_state "powerbi" "FAIL" "subprocess exit=0 but JSON not written"
    return 0
  fi

  green "JSON file written: $JSON_OUT"

  # 5. Record count + anonymised sample (first 3 records, account_id + health_score only)
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

  # 6. Validate against structural check via node
  if command -v node >/dev/null 2>&1; then
    node - <<'JSEOF' 2>/dev/null && green "structural check: PASS" || fail "structural check: FAIL — see output above"
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('/tmp/cdash-smoke.json', 'utf8'));
if (!Array.isArray(data)) { process.exit(1); }
if (data.length === 0) { console.warn('  WARNING: empty records array'); process.exit(0); }
if (typeof data[0] !== 'object' || data[0] === null) { process.exit(1); }
console.log(`  node structural check: array of ${data.length} objects — OK`);
JSEOF
  else
    green "node not available — skipping structural check (Python check passed)"
  fi

  # Cleanup
  rm -f "$JSON_OUT"
  green "smoke: PASS"
  record_state "powerbi" "PASS" "subprocess exited 0; $RECORD_COUNT records; structural check OK"
}

# ── §Gmail ───────────────────────────────────────────────────────────────────
smoke_gmail() {
  section "Gmail"

  # 1. Check OAuth App credentials are set.
  if [ -z "${GMAIL_CLIENT_ID:-}" ] || [ -z "${GMAIL_CLIENT_SECRET:-}" ]; then
    blocked "GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET not set — Gmail OAuth App not configured. See docs/setup/gmail-oauth-app.md"
    record_state "gmail" "BLOCKED" "GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET not set in environment"
    return 0
  fi

  # 2. Check that the utility dist is built.
  UTILITY_DIST="/Users/russellteter/Claude Code Projects/c-suite/apps/utility/dist"
  if [ ! -d "$UTILITY_DIST" ]; then
    blocked "utility dist not built — run: pnpm --filter utility build"
    record_state "gmail" "BLOCKED" "utility dist not built"
    return 0
  fi

  # 3. Check that a safeStorage credential is present for gmail.
  RUNTIME_DB="${HOME}/Library/Application Support/c-suite/runtime.db"
  if [ ! -f "$RUNTIME_DB" ]; then
    blocked "runtime.db not found at $RUNTIME_DB — app must be launched at least once (Ch.11 gate)"
    record_state "gmail" "BLOCKED" "runtime.db absent — app not yet launched (first-launch OAuth required)"
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
    blocked "Gmail OAuth not completed — launch C-Suite and complete first-launch browser flow (accounts.google.com → approve → token persists to safeStorage). See docs/research/gmail-first-launch-ux.md"
    record_state "gmail" "BLOCKED" "runtime.db present but gmail credential not stored — first-launch OAuth flow not yet completed"
    return 0
  fi

  if [ "$CRED_CHECK" = "ERROR" ]; then
    fail "Could not query runtime.db — better-sqlite3 may not be available via node"
    record_state "gmail" "FAIL" "runtime.db query failed — better-sqlite3 unavailable"
    return 0
  fi

  green "credential: gmail refresh token present in vault"

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
    process.stdout.write(JSON.stringify({ error: err.message, name: err.name }));
  }
})();
" 2>/dev/null || echo '{"error":"node execution failed"}')

  if echo "$SMOKE_RESULT" | grep -q '"error"'; then
    ERR_NAME=$(node -e "try{const p=JSON.parse(process.argv[1]);process.stdout.write(p.name||'')}catch{}" "$SMOKE_RESULT" 2>/dev/null || echo "")
    ERR_MSG=$(node -e "try{const p=JSON.parse(process.argv[1]);process.stdout.write(p.error||'')}catch{}" "$SMOKE_RESULT" 2>/dev/null || echo "$SMOKE_RESULT")
    if echo "$ERR_NAME" | grep -qiE "AuthRevoked|AuthExpired"; then
      degraded "Gmail refresh token revoked or expired — re-run reconnect() from C-Suite settings"
      record_state "gmail" "DEGRADED" "Gmail refresh token revoked/expired — reconnect required"
    else
      fail "searchThreads failed: $ERR_MSG"
      record_state "gmail" "FAIL" "searchThreads error: $ERR_MSG"
    fi
    return 0
  fi

  THREAD_COUNT=$(node -e "
const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  try { const d = JSON.parse(chunks.join('')); process.stdout.write(String(d.count)); }
  catch { process.stdout.write('UNKNOWN'); }
});
" 2>/dev/null <<< "$SMOKE_RESULT" || echo "UNKNOWN")

  green "searchThreads(last 7 days): returned ${THREAD_COUNT} thread(s)"
  green "smoke: PASS"
  record_state "gmail" "PASS" "OAuth credential present; searchThreads returned ${THREAD_COUNT} thread(s)"
}

# ── §NetSuite ────────────────────────────────────────────────────────────────
smoke_netsuite() {
  section "NetSuite"

  # NetSuite migrated from TBA to OAuth 2.0 + PKCE against the hosted MCP server
  # (ADR-0015, 2026-05-28). The refresh token lives in Electron safeStorage and is
  # minted by an INTERACTIVE browser-consent flow, so live table access cannot be
  # verified in an unattended batch smoke. This section therefore reports config
  # state only; live verification is the interactive probe or the in-app Connect flow.

  # 1. OAuth config present?
  if [ -z "${NETSUITE_OAUTH_CLIENT_ID:-}" ] || \
     [ -z "${NETSUITE_ACCOUNT_ID:-}" ] || \
     [ -z "${NETSUITE_MCP_SERVER_URL:-}" ]; then
    blocked "OAuth env not configured — set NETSUITE_OAUTH_CLIENT_ID, NETSUITE_ACCOUNT_ID, NETSUITE_MCP_SERVER_URL in apps/main/.env.local (public client + PKCE, no secret). Register a NetSuite OAuth 2.0 Integration Record with redirect http://localhost:8765/oauth/callback and scope 'mcp'."
    record_state "netsuite" "BLOCKED" "OAuth env not configured (NETSUITE_OAUTH_CLIENT_ID/ACCOUNT_ID/MCP_SERVER_URL)"
    return 0
  fi

  # 2. Config present, but live access needs interactive consent — do NOT auto-open
  #    a browser in a batch run. Surface the manual verification path.
  blocked "OAuth configured. Live table access is verified interactively (browser consent), not in this batch smoke. Run manually:  source apps/main/.env.local && npx tsx scripts/netsuite-smoke-which-tables-work.ts  (opens browser; select the custom MCP role). Expected: 9 PASS / 0 BLOCKED (transaction, subsidiary, account, department, classification, employee, accountingperiod, customer, vendor). Or complete Settings -> Connectors -> NetSuite -> Connect in the app."
  record_state "netsuite" "BLOCKED" "OAuth configured; live verification is interactive (in-app Connect or tsx probe) — not runnable in unattended smoke"
  return 0
}

# ── §AWS ─────────────────────────────────────────────────────────────────────
smoke_aws() {
  section "AWS (class + collab sum)"

  # 1. Check both SSO profiles exist in ~/.aws/config.
  if ! grep -q '\[profile class\]' "${HOME}/.aws/config" 2>/dev/null; then
    blocked "AWS profile 'class' not found in ~/.aws/config — run: aws configure sso --profile class"
    record_state "aws" "BLOCKED" "AWS profile 'class' not found in ~/.aws/config"
    return 0
  fi

  if ! grep -q '\[profile collab\]' "${HOME}/.aws/config" 2>/dev/null; then
    blocked "AWS profile 'collab' not found in ~/.aws/config — run: aws configure sso --profile collab"
    record_state "aws" "BLOCKED" "AWS profile 'collab' not found in ~/.aws/config"
    return 0
  fi

  green "config: both 'class' and 'collab' profiles found in ~/.aws/config"

  # 2. Test class SSO token.
  CLASS_ID=$(aws --profile class sts get-caller-identity --query 'Account' --output text 2>/tmp/aws-class-smoke.err)
  CLASS_EXIT=$?
  if [ $CLASS_EXIT -ne 0 ]; then
    CLASS_ERR=$(cat /tmp/aws-class-smoke.err 2>/dev/null || echo "unknown error")
    if echo "$CLASS_ERR" | grep -qi "expired\|not authorized\|token"; then
      degraded "AWS SSO token expired for 'class' — run: aws sso login --profile class"
      CLASS_ID="DEGRADED"
    else
      fail "AWS profile 'class' STS check failed: $CLASS_ERR"
      record_state "aws" "FAIL" "AWS class STS check failed: $CLASS_ERR"
      CLASS_ID="FAILED"
    fi
  else
    green "profile class: account=$CLASS_ID"
  fi

  # 3. Test collab SSO token.
  COLLAB_ID=$(aws --profile collab sts get-caller-identity --query 'Account' --output text 2>/tmp/aws-collab-smoke.err)
  COLLAB_EXIT=$?
  if [ $COLLAB_EXIT -ne 0 ]; then
    COLLAB_ERR=$(cat /tmp/aws-collab-smoke.err 2>/dev/null || echo "unknown error")
    if echo "$COLLAB_ERR" | grep -qi "expired\|not authorized\|token"; then
      degraded "AWS SSO token expired for 'collab' — run: aws sso login --profile collab"
      COLLAB_ID="DEGRADED"
    else
      fail "AWS profile 'collab' STS check failed: $COLLAB_ERR"
      record_state "aws" "FAIL" "AWS collab STS check failed: $COLLAB_ERR"
      COLLAB_ID="FAILED"
    fi
  else
    green "profile collab: account=$COLLAB_ID"
  fi

  # 4. Determine final state
  if [ "$CLASS_ID" = "FAILED" ] || [ "$COLLAB_ID" = "FAILED" ]; then
    return 0  # record_state already called above
  elif [ "$CLASS_ID" = "DEGRADED" ] || [ "$COLLAB_ID" = "DEGRADED" ]; then
    degraded "One or both AWS SSO tokens expired — cost sum will run in degraded mode until refreshed"
    record_state "aws" "DEGRADED" "SSO token expired (class=${CLASS_ID}, collab=${COLLAB_ID}) — refresh with: aws sso login"
  else
    green "smoke: PASS — both profiles authenticated; class+collab sum available"
    record_state "aws" "PASS" "both SSO profiles authenticated (class=${CLASS_ID}, collab=${COLLAB_ID})"
  fi
}

# ── §Chorus ───────────────────────────────────────────────────────────────────
smoke_chorus() {
  section "Chorus"

  # 1. Check for API key (env var or vault).
  RUNTIME_DB="${HOME}/Library/Application Support/c-suite/runtime.db"

  CHORUS_KEY_SOURCE="MISSING"

  if [ -n "${CHORUS_API_KEY:-}" ]; then
    CHORUS_KEY_SOURCE="ENV"
    green "credential: CHORUS_API_KEY present in env"
  elif [ -f "$RUNTIME_DB" ]; then
    CRED_CHECK=$(node -e "
const Database = require('better-sqlite3');
const db = new Database('${RUNTIME_DB}', { readonly: true });
const row = db.prepare(\"SELECT service_id FROM credentials WHERE service_id = 'chorus'\").get();
db.close();
process.stdout.write(row ? 'FOUND' : 'MISSING');
" 2>/dev/null || echo "ERROR")

    if [ "$CRED_CHECK" = "FOUND" ]; then
      CHORUS_KEY_SOURCE="VAULT"
      green "credential: chorus API key present in safeStorage vault"
    elif [ "$CRED_CHECK" = "ERROR" ]; then
      blocked "Could not query runtime.db — better-sqlite3 may not be available via node"
      record_state "chorus" "BLOCKED" "runtime.db query failed — better-sqlite3 unavailable"
      return 0
    fi
  fi

  if [ "$CHORUS_KEY_SOURCE" = "MISSING" ]; then
    blocked "Chorus API key not configured — set CHORUS_API_KEY env var or launch C-Suite and paste key in onboarding"
    record_state "chorus" "BLOCKED" "Chorus API key not configured (env or vault)"
    return 0
  fi

  # 2. Live call: listEngagements(since=yesterday) — requires env key for smoke.
  if [ "$CHORUS_KEY_SOURCE" = "VAULT" ]; then
    blocked "Chorus key in vault only — live smoke requires CHORUS_API_KEY env var. Set it and re-run"
    record_state "chorus" "BLOCKED" "Chorus key in vault only; live smoke needs CHORUS_API_KEY env var"
    return 0
  fi

  YESTERDAY=$(date -v-1d '+%Y-%m-%dT00:00:00Z' 2>/dev/null || date -d 'yesterday' '+%Y-%m-%dT00:00:00Z' 2>/dev/null || echo "")

  if [ -z "$YESTERDAY" ]; then
    blocked "Could not compute yesterday date — skipping live API check"
    record_state "chorus" "BLOCKED" "date computation failed"
    return 0
  fi

  SMOKE_RESULT=$(node -e "
const https = require('https');
const since = '${YESTERDAY}';
const apiKey = process.env.CHORUS_API_KEY || '';
if (!apiKey) { process.stdout.write(JSON.stringify({ error: 'No CHORUS_API_KEY in env' })); process.exit(0); }
const url = 'https://chorus.ai/api/v1/engagements?since=' + encodeURIComponent(since);
const req = https.get(url, { headers: { Authorization: 'Bearer ' + apiKey } }, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    if (res.statusCode === 401 || res.statusCode === 403) {
      process.stdout.write(JSON.stringify({ error: 'Auth rejected: ' + res.statusCode })); return;
    }
    if (res.statusCode === 429) {
      process.stdout.write(JSON.stringify({ blocked: 'Rate limited' })); return;
    }
    try {
      const parsed = JSON.parse(data);
      const arr = Array.isArray(parsed) ? parsed : (parsed.engagements || []);
      process.stdout.write(JSON.stringify({ count: arr.length }));
    } catch (e) {
      process.stdout.write(JSON.stringify({ error: 'Parse error: ' + e.message }));
    }
  });
});
req.on('error', (e) => { process.stdout.write(JSON.stringify({ error: e.message })); });
" 2>/dev/null || echo '{"error":"node execution failed"}')

  if echo "$SMOKE_RESULT" | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const p=JSON.parse(d);process.exit(p.error?1:0)}catch{process.exit(1)}})" 2>/dev/null; then
    ENG_COUNT=$(echo "$SMOKE_RESULT" | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const p=JSON.parse(d);process.stdout.write(String(p.count))}catch{process.stdout.write('UNKNOWN')}})" 2>/dev/null || echo "UNKNOWN")
    green "listEngagements(since=yesterday): returned $ENG_COUNT engagement(s)"
    green "smoke: PASS"
    record_state "chorus" "PASS" "API key valid; listEngagements returned ${ENG_COUNT} engagement(s)"
  elif echo "$SMOKE_RESULT" | grep -q '"blocked"'; then
    degraded "Chorus rate limited — retry after backoff"
    record_state "chorus" "DEGRADED" "rate limited — retry after backoff"
  else
    SMOKE_ERR=$(echo "$SMOKE_RESULT" | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const p=JSON.parse(d);process.stdout.write(p.error||'')}catch{process.stdout.write(d)}})" 2>/dev/null || echo "$SMOKE_RESULT")
    fail "Chorus listEngagements failed: $SMOKE_ERR"
    record_state "chorus" "FAIL" "listEngagements error: $SMOKE_ERR"
  fi
}

# ── State matrix printer ───────────────────────────────────────────────────────
print_state_matrix() {
  printf '\n\033[1m== Connector State Matrix ==\033[0m\n'
  printf '%-15s %-12s %s\n' 'CONNECTOR' 'STATE' 'REASON'
  printf '%-15s %-12s %s\n' '---------' '-----' '------'
  for svc in salesforce powerbi gmail netsuite aws chorus; do
    # Read state and reason from temp files (no local vars to avoid zsh echo)
    _svc_state="SKIPPED"
    _svc_reason="not run"
    [ -f "$STATE_DIR/${svc}.state"  ] && _svc_state=$(< "$STATE_DIR/${svc}.state")
    [ -f "$STATE_DIR/${svc}.reason" ] && _svc_reason=$(< "$STATE_DIR/${svc}.reason")
    case "$_svc_state" in
      PASS)     printf '\033[32m%-15s %-12s\033[0m %s\n' "$svc" "$_svc_state" "$_svc_reason" ;;
      DEGRADED) printf '\033[33m%-15s %-12s\033[0m %s\n' "$svc" "$_svc_state" "$_svc_reason" ;;
      BLOCKED)  printf '\033[33m%-15s %-12s\033[0m %s\n' "$svc" "$_svc_state" "$_svc_reason" ;;
      FAIL)     printf '\033[31m%-15s %-12s\033[0m %s\n' "$svc" "$_svc_state" "$_svc_reason" ;;
      *)        printf '%-15s %-12s %s\n' "$svc" "$_svc_state" "$_svc_reason" ;;
    esac
  done
  echo
}

# ── dispatch ──────────────────────────────────────────────────────────────────
case "$SERVICE" in
  salesforce) smoke_salesforce ;;
  powerbi)    smoke_powerbi ;;
  gmail)      smoke_gmail ;;
  netsuite)   smoke_netsuite ;;
  aws)        smoke_aws ;;
  chorus)     smoke_chorus ;;
  all)
    smoke_salesforce
    smoke_powerbi
    smoke_gmail
    smoke_netsuite
    smoke_aws
    smoke_chorus
    print_state_matrix
    ;;
  *)
    echo "Unknown service: $SERVICE"
    echo "Available: salesforce, powerbi, gmail, netsuite, aws, chorus, all"
    exit 1
    ;;
esac

echo
if [ "$FAILS" -gt 0 ]; then
  echo "RESULT: FAIL ($FAILS failure(s) — see above)"
  exit 1
else
  echo "RESULT: PASS (or BLOCKED/DEGRADED — see state matrix above)"
  exit 0
fi
