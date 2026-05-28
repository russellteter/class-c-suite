#!/usr/bin/env npx tsx
// scripts/netsuite-smoke-which-tables-work.ts
// Probes SuiteQL table accessibility against prod account 603734 via the hosted
// NetSuite AI Connector Service (remote MCP server) using OAuth 2.0 PUBLIC-CLIENT +
// PKCE. Replaces the prior TBA/OAuth1.0a REST probe.
//
// Auth: runs the shared OAuth authorization-code flow once (opens the browser to the
//   NetSuite authorize URL, captures the loopback redirect on
//   http://localhost:8765/oauth/callback), then opens an MCP session and invokes the
//   ns_runCustomSuiteQL tool for each table.
//
// Preconditions (RUSSELL-CREDS-GATED — exits 1 if absent):
//   NETSUITE_ACCOUNT_ID, NETSUITE_OAUTH_CLIENT_ID
//   (optional overrides: NETSUITE_OAUTH_REDIRECT_URI, NETSUITE_MCP_SERVER_URL)
//
// Usage:
//   source apps/main/.env.local && npx tsx scripts/netsuite-smoke-which-tables-work.ts
//
// EXPECTED under OAuth (Russell's user role): all 9 of transaction, subsidiary, account,
//   department, classification, employee, accountingperiod, customer, vendor PASS;
//   BLOCKED list empty. (TBA's integration role could not read the middle five.)

import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { runAuthorizationCodeFlow } from '../apps/utility/src/mcp/oauth/authCodeFlow.js';
import { callNetSuiteTool, TOOL_SUITEQL } from '../apps/utility/src/mcp/netsuite/mcp-transport.js';
import {
  readNetSuiteOAuthEnv,
  buildNetSuiteOAuthConfig,
} from '../apps/utility/src/mcp/netsuite/oauth-config.js';

const env = readNetSuiteOAuthEnv();
if (!env) {
  console.error(
    'ERROR: Missing NETSUITE_OAUTH_CLIENT_ID / NETSUITE_ACCOUNT_ID. ' +
      'Register a NetSuite OAuth 2.0 Public Client Integration Record (redirect URI ' +
      'http://localhost:8765/oauth/callback) and run: source apps/main/.env.local',
  );
  process.exit(1);
}

const accountId = env.accountId;
const config = buildNetSuiteOAuthConfig(env);

const TABLES: string[] = [
  'transaction',
  'subsidiary',
  // Previously blocked under TBA's integration role — expected to flip PASS under OAuth.
  'account',
  'department',
  'classification',
  'employee',
  'accountingperiod',
  'customer',
  'vendor',
];

interface ProbeResult {
  table: string;
  status: 'PASS' | 'BLOCKED' | 'ERROR';
  detail: string;
  rowCount?: number;
}

async function probe(accessToken: string, table: string): Promise<ProbeResult> {
  const query = `SELECT id FROM ${table} FETCH NEXT 1 ROWS ONLY`;
  try {
    const result = await callNetSuiteTool(env!.mcpServerUrl, accessToken, TOOL_SUITEQL, { query });
    const text = result.content?.map((c) => c.text ?? '').join('') ?? '';
    if (result.isError) {
      const lower = text.toLowerCase();
      const blocked = lower.includes('not found') || lower.includes('insufficient permission') || lower.includes('invalid_record_type');
      return { table, status: blocked ? 'BLOCKED' : 'ERROR', detail: text.slice(0, 120) };
    }
    let rowCount: number | undefined;
    try {
      const parsed = JSON.parse(text) as { count?: number; items?: unknown[] };
      rowCount = parsed.count ?? parsed.items?.length;
    } catch { /* leave undefined */ }
    return { table, status: 'PASS', detail: `${rowCount ?? '?'} row(s)`, rowCount: rowCount ?? 0 };
  } catch (err) {
    return { table, status: 'ERROR', detail: String(err).slice(0, 120) };
  }
}

async function main() {
  console.log(`\nNetSuite AI Connector (MCP) table accessibility probe — account ${accountId}`);
  console.log(`MCP server: ${env!.mcpServerUrl}`);
  console.log(`Redirect URI: ${env!.redirectUri}`);
  console.log('Opening browser for OAuth consent (select your custom MCP role, NOT Administrator)...\n');

  const tokenSet = await runAuthorizationCodeFlow(config);
  const accessToken = tokenSet.accessToken;
  console.log('OAuth access token obtained. Probing tables via ns_runCustomSuiteQL...\n');

  const results: ProbeResult[] = [];
  for (const table of TABLES) {
    process.stdout.write(`  ${table.padEnd(22)}`);
    const r = await probe(accessToken, table);
    results.push(r);
    const icon = r.status === 'PASS' ? '✓' : r.status === 'BLOCKED' ? '✗' : '!';
    console.log(`${icon}  ${r.status.padEnd(8)} ${r.detail}`);
    await new Promise((res) => setTimeout(res, 300));
  }

  const passing = results.filter((r) => r.status === 'PASS');
  const blocked = results.filter((r) => r.status === 'BLOCKED');
  const errored = results.filter((r) => r.status === 'ERROR');
  console.log(`\nSummary: ${passing.length} PASS / ${blocked.length} BLOCKED / ${errored.length} ERROR\n`);

  const now = new Date().toISOString().slice(0, 10);
  const passRows = passing.map((r) => `| \`${r.table}\` | PASS | ${r.detail} | — |`).join('\n');
  const blockRows = blocked.map((r) => `| \`${r.table}\` | BLOCKED | ${r.detail} | Grant View on the user's MCP role |`).join('\n');
  const errRows = errored.length > 0
    ? errored.map((r) => `| \`${r.table}\` | ERROR | ${r.detail} | Investigate |`).join('\n')
    : '| — | — | — | — |';

  const md = `# NetSuite Current Table Accessibility State

> Generated: ${now}
> Account: ${accountId}
> Auth: OAuth 2.0 public client + PKCE via NetSuite AI Connector Service (MCP), scope \`mcp\`, Russell's user role
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

## Notes

Under OAuth 2.0 + the NetSuite AI Connector Service the session runs with the user's
custom MCP role (MCP Server Connection + "Log in using OAuth 2.0 Access Tokens" + REST
Web Services), not the limited integration role TBA used. The five tables that returned
HTTP 400 under TBA (account/department/classification/employee/accountingperiod) are
expected to read clean here. If any still BLOCKED, the MCP role lacks View on that table.
`;

  writeFileSync(resolve(process.cwd(), 'docs/research/netsuite-current-state.md'), md, 'utf8');
  console.log('Results written to: docs/research/netsuite-current-state.md');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
