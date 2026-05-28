// apps/utility/src/mcp/aws/typed-queries.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §6
//
// Pre-built aggregations for the class + collab dual-profile sum.
// All functions enforce the R1-verified rule: always sum both profiles.
// If one is missing, the result carries degraded_sources.

import type { AWSClient, AWSCostResult, AWSOrganizationResult } from './client.js';

// ── Date helpers ─────────────────────────────────────────────────────────────

/** Return ISO date string (YYYY-MM-DD) for today. */
function today(): string {
  return new Date().toISOString().split('T')[0] as string;
}

/** Return ISO date string N months before today. */
function monthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().split('T')[0] as string;
}

// ── 1. totalSpendQuery ────────────────────────────────────────────────────────
// Sum class + collab spend for a given date range.
// Used by board_narrative + cost_overview playbooks.

export interface TotalSpendArgs {
  start?: string; // ISO date (YYYY-MM-DD); defaults to 3 months ago
  end?: string;   // ISO date; defaults to today
}

export async function totalSpendQuery(
  client: AWSClient,
  args: TotalSpendArgs = {}
): Promise<AWSCostResult> {
  const start = args.start ?? monthsAgo(3);
  const end = args.end ?? today();
  return client.getCombinedCost({ start, end });
}

// ── 2. monthlySpendQuery ──────────────────────────────────────────────────────
// Class + collab spend for the current calendar month.

export async function monthlySpendQuery(client: AWSClient): Promise<AWSCostResult> {
  const now = new Date();
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const end = today();
  return client.getCombinedCost({ start, end });
}

// ── 3. combinedOrganizationAccounts ──────────────────────────────────────────
// All accounts from class + collab organizations, merged.
// Used by org-overview playbooks.

export async function combinedOrganizationAccounts(
  client: AWSClient
): Promise<AWSOrganizationResult> {
  return client.getCombinedOrganizationAccounts();
}

// ── 4. yearToDateSpendQuery ───────────────────────────────────────────────────
// Sum YTD spend (Jan 1 → today) across both profiles.

export async function yearToDateSpendQuery(client: AWSClient): Promise<AWSCostResult> {
  const year = new Date().getFullYear();
  const start = `${year}-01-01`;
  const end = today();
  return client.getCombinedCost({ start, end });
}
