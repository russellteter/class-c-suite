// apps/utility/src/mcp/chorus/typed-queries.ts
// Source: docs/decisions/0010-ch8-mcp-integration.md §8
//
// Pre-built Chorus queries used by playbooks.
// All return types include the B11 confidence cap stamp (sourceConfidenceCap: 69).

import type { ChorusEngagement } from '@c-suite/shared-types/mcp';
import type { ChorusClient } from './client.js';

// ── 1. recentCallsForStakeholderQuery ─────────────────────────────────────────
// Used by: stakeholder_1_1 + restructure_decision playbooks.
// Finds all calls where `stakeholder` was a participant, since `since`.

export interface RecentCallsForStakeholderArgs {
  stakeholder: string;
  since: Date;
}

export async function recentCallsForStakeholderQuery(
  client: ChorusClient,
  args: RecentCallsForStakeholderArgs
): Promise<ChorusEngagement[]> {
  const allCalls = await client.searchCallsByParticipant({ name: args.stakeholder });
  // Filter client-side by date (Chorus search may return broader results).
  return allCalls.filter(call => new Date(call.date) >= args.since);
}

// ── 2. callsByAccountIdQuery ──────────────────────────────────────────────────
// Finds engagements mentioning an account, filtered by date.
// Used by account-level context enrichment in playbooks.

export interface CallsByAccountIdArgs {
  accountId: string;
  since: Date;
}

export async function callsByAccountIdQuery(
  client: ChorusClient,
  args: CallsByAccountIdArgs
): Promise<ChorusEngagement[]> {
  // Search by account ID as participant identifier.
  const allCalls = await client.searchCallsByParticipant({ name: args.accountId });
  return allCalls.filter(call => new Date(call.date) >= args.since);
}
