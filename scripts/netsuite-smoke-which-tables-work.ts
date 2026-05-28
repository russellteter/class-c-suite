#!/usr/bin/env npx tsx
// scripts/netsuite-smoke-which-tables-work.ts
// Probes SuiteQL accessibility for a set of common tables against prod account 603734.
// Reads TBA credentials from NETSUITE_* env vars (same as apps/main/.env.local).
//
// Usage:
//   source apps/main/.env.local && npx tsx scripts/netsuite-smoke-which-tables-work.ts
//
// Output: table-by-table PASS/BLOCKED/ERROR with HTTP status + error detail.
// Results written to docs/research/netsuite-current-state.md.

import crypto from 'crypto';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

// ── TBA credential read ───────────────────────────────────────────────────────

const accountId = process.env['NETSUITE_ACCOUNT_ID'];
const consumerKey = process.env['NETSUITE_CONSUMER_KEY'];
const consumerSecret = process.env['NETSUITE_CONSUMER_SECRET'];
const tokenId = process.env['NETSUITE_TBA_TOKEN_ID'];
const tokenSecret = process.env['NETSUITE_TBA_TOKEN_SECRET'];

if (!accountId || !consumerKey || !consumerSecret || !tokenId || !tokenSecret) {
  console.error('ERROR: Missing NETSUITE_* env vars. Run: source apps/main/.env.local');
  process.exit(1);
}

// ── HMAC-SHA256 OAuth 1.0a (same logic as tba-auth.ts) ───────────────────────

function buildAuthHeader(method: string, url: string): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const realm = accountId!;

  const params: Record<string, string> = {
    oauth_consumer_key: consumerKey!,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA256',
    oauth_timestamp: timestamp,
    oauth_token: tokenId!,
    oauth_version: '1.0',
  };

  // Build signature base string
  const sortedParams = Object.keys(params)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k]!)}`)
    .join('&');

  const signingKey = `${encodeURIComponent(consumerSecret!)}&${encodeURIComponent(tokenSecret!)}`;
  const baseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
  const signature = crypto.createHmac('sha256', signingKey).update(baseString).digest('base64');

  return (
    `OAuth realm="${realm}",` +
    `oauth_consumer_key="${consumerKey}",` +
    `oauth_token="${tokenId}",` +
    `oauth_signature_method="HMAC-SHA256",` +
    `oauth_timestamp="${timestamp}",` +
    `oauth_nonce="${nonce}",` +
    `oauth_version="1.0",` +
    `oauth_signature="${encodeURIComponent(signature)}"`
  );
}

// ── Table probe list ───────────────────────────────────────────────────────────
// Format: [tableName, simpleSelectQuery, category]
// Known-blocked (role perm denied): account, department, classification, employee, accountingperiod
// Expected working: transaction, subsidiary
// Additional common tables to probe:

const PROBES: Array<[string, string, 'expected-pass' | 'expected-blocked' | 'unknown']> = [
  // Expected to pass (confirmed working in prior session)
  ['transaction', 'SELECT id, trandate, tranid FROM transaction FETCH NEXT 1 ROWS ONLY', 'expected-pass'],
  ['subsidiary', 'SELECT id, name FROM subsidiary FETCH NEXT 1 ROWS ONLY', 'expected-pass'],

  // Expected blocked (role permission denied per BLOCKERS B1)
  ['account', 'SELECT id, acctnumber, acctname FROM account FETCH NEXT 1 ROWS ONLY', 'expected-blocked'],
  ['department', 'SELECT id, name FROM department FETCH NEXT 1 ROWS ONLY', 'expected-blocked'],
  ['classification', 'SELECT id, name FROM classification FETCH NEXT 1 ROWS ONLY', 'expected-blocked'],
  ['employee', 'SELECT id, firstname, lastname FROM employee FETCH NEXT 1 ROWS ONLY', 'expected-blocked'],
  ['accountingperiod', 'SELECT id, periodname FROM accountingperiod FETCH NEXT 1 ROWS ONLY', 'expected-blocked'],

  // Unknown — probe to expand working set
  ['vendor', 'SELECT id, entityid FROM vendor FETCH NEXT 1 ROWS ONLY', 'unknown'],
  ['customer', 'SELECT id, entityid FROM customer FETCH NEXT 1 ROWS ONLY', 'unknown'],
  ['item', 'SELECT id, itemid FROM item FETCH NEXT 1 ROWS ONLY', 'unknown'],
  ['invoice', 'SELECT id, tranid FROM transaction WHERE type = \'CustInvc\' FETCH NEXT 1 ROWS ONLY', 'unknown'],
  ['journalentry', 'SELECT id, tranid FROM transaction WHERE type = \'Journal\' FETCH NEXT 1 ROWS ONLY', 'unknown'],
  ['currency', 'SELECT id, symbol, name FROM currency FETCH NEXT 1 ROWS ONLY', 'unknown'],
  ['location', 'SELECT id, name FROM location FETCH NEXT 1 ROWS ONLY', 'unknown'],
  ['budgetcategory', 'SELECT id, name FROM budgetcategory FETCH NEXT 1 ROWS ONLY', 'unknown'],
  ['billingaccount', 'SELECT id FROM billingaccount FETCH NEXT 1 ROWS ONLY', 'unknown'],
  ['rolepermissions', 'SELECT role, permkey FROM rolepermissions WHERE role = 1028 FETCH NEXT 5 ROWS ONLY', 'unknown'],
];

// ── Probe runner ──────────────────────────────────────────────────────────────

interface ProbeResult {
  table: string;
  query: string;
  category: string;
  status: 'PASS' | 'BLOCKED' | 'ERROR';
  httpStatus: number;
  rowCount?: number;
  errorCode?: string;
  errorMsg?: string;
}

async function probeTable(
  table: string,
  query: string,
  category: string,
): Promise<ProbeResult> {
  const url = `https://${accountId}.suitetalk.api.netsuite.com/services/rest/query/v1/suiteql`;
  const auth = buildAuthHeader('POST', url);

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
        Prefer: 'transient',
      },
      body: JSON.stringify({ q: query }),
      signal: AbortSignal.timeout(15_000),
    });

    if (resp.ok) {
      const data = await resp.json() as { count?: number; items?: unknown[] };
      return {
        table,
        query,
        category,
        status: 'PASS',
        httpStatus: resp.status,
        rowCount: data.count ?? data.items?.length ?? 0,
      };
    }

    const text = await resp.text();
    let errorCode = String(resp.status);
    let errorMsg = text;
    try {
      const errObj = JSON.parse(text) as { title?: string; o_error?: { code: string; message: string } };
      errorCode = errObj?.o_error?.code ?? errorCode;
      errorMsg = errObj?.o_error?.message ?? errObj?.title ?? text;
    } catch { /* leave as raw text */ }

    // NetSuite reports role permission denied as 400 "INVALID_RECORD_TYPE" or "Record X not found"
    const isPermDenied =
      resp.status === 400 &&
      (errorMsg.toLowerCase().includes('not found') ||
        errorMsg.toLowerCase().includes('invalid_record_type') ||
        errorMsg.toLowerCase().includes('insufficient permission'));

    return {
      table,
      query,
      category,
      status: isPermDenied ? 'BLOCKED' : 'ERROR',
      httpStatus: resp.status,
      errorCode,
      errorMsg: errorMsg.slice(0, 200),
    };
  } catch (err) {
    return {
      table,
      query,
      category,
      status: 'ERROR',
      httpStatus: 0,
      errorMsg: String(err).slice(0, 200),
    };
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nNetSuite table accessibility probe — account ${accountId}\n`);
  console.log(`Probing ${PROBES.length} tables...\n`);

  const results: ProbeResult[] = [];

  for (const [table, query, category] of PROBES) {
    process.stdout.write(`  ${table.padEnd(22)}`);
    const r = await probeTable(table, query, category);
    results.push(r);
    const icon = r.status === 'PASS' ? '✓' : r.status === 'BLOCKED' ? '✗' : '!';
    const detail =
      r.status === 'PASS'
        ? `HTTP ${r.httpStatus}, ${r.rowCount} row(s)`
        : `HTTP ${r.httpStatus} — ${r.errorCode}: ${(r.errorMsg ?? '').slice(0, 80)}`;
    console.log(`${icon}  ${r.status.padEnd(8)} ${detail}`);
    // Small delay to avoid overwhelming the API
    await new Promise((res) => setTimeout(res, 300));
  }

  const passing = results.filter((r) => r.status === 'PASS');
  const blocked = results.filter((r) => r.status === 'BLOCKED');
  const errored = results.filter((r) => r.status === 'ERROR');

  console.log(`\nSummary: ${passing.length} PASS / ${blocked.length} BLOCKED / ${errored.length} ERROR\n`);

  // ── Write docs/research/netsuite-current-state.md ──────────────────────────

  const now = new Date().toISOString().slice(0, 10);
  const passRows = passing
    .map((r) => `| \`${r.table}\` | PASS | ${r.rowCount} row(s) returned | — |`)
    .join('\n');
  const blockRows = blocked
    .map((r) => `| \`${r.table}\` | BLOCKED | HTTP ${r.httpStatus} — ${r.errorCode} | Grant View in Lists tab |`)
    .join('\n');
  const errRows =
    errored.length > 0
      ? errored
          .map((r) => `| \`${r.table}\` | ERROR | HTTP ${r.httpStatus} — ${(r.errorMsg ?? '').slice(0, 60)} | Investigate |`)
          .join('\n')
      : '| — | — | — | — |';

  const md = `# NetSuite Current Table Accessibility State

> Generated: ${now}
> Account: ${accountId}
> Source: \`scripts/netsuite-smoke-which-tables-work.ts\`

## Accessible Tables (PASS)

| Table | Status | Evidence | Action |
|---|---|---|---|
${passRows || '| — | — | — | — |'}

## Blocked Tables (role permission denied)

| Table | Status | Evidence | Action Required |
|---|---|---|---|
${blockRows || '| — | — | — | — |'}

## Error / Undetermined

| Table | Status | Evidence | Action |
|---|---|---|---|
${errRows}

## metaDataProvider Research Finding

**Context7 confirmed (2026-05-28):** The \`metaDataProvider\` option is a SuiteScript N/query module
parameter only — not available as an HTTP header on the REST \`/services/rest/query/v1/suiteql\`
endpoint. The REST endpoint only accepts \`Prefer: transient\`.

- \`SUITE_QL\` (default): query fails with HTTP 400 if the role lacks permission on any referenced table.
- \`STATIC\`: query proceeds but silently omits data for unauthorized fields/records.

**Critical finding:** \`STATIC\` is only settable from SuiteScript server-side code (N/query module),
not via REST HTTP headers. There is **no REST API workaround** that bypasses role permission without
a NetSuite admin granting the View permission. The \`metaDataProvider=STATIC\` path is not accessible
from the C-Suite app's TBA REST integration.

**Conclusion:** Brian must grant View on account/department/classification/employee/accountingperiod
(see \`docs/external/brian-netsuite-role-perms-request.md\`). No alternative technical path exists.

## Degraded-mode client hardening

\`isNetSuiteTableReadable(table)\` added to \`apps/utility/src/mcp/netsuite/client.ts\`:
- Probes each table on first call; caches result per table name for the client instance lifetime.
- Seeds with the 5 known-blocked tables as BLOCKED on construction (cold-start, no round-trip needed).
- Playbooks call \`isNetSuiteTableReadable\` before querying; if false, emit \`DegradationWarning\`
  via the existing \`PlaybookResult.degradationWarnings\` field.

## Next step

Send \`docs/external/brian-netsuite-role-perms-request.md\` to Brian. Once perms land,
re-run this script to verify all 5 blocked tables flip to PASS.
`;

  const outPath = resolve(process.cwd(), 'docs/research/netsuite-current-state.md');
  writeFileSync(outPath, md, 'utf8');
  console.log(`Results written to: ${outPath}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
