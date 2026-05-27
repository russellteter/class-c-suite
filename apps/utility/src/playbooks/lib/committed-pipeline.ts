// apps/utility/src/playbooks/lib/committed-pipeline.ts
// Source: docs/decisions/0007-committed-pipeline-definition.md
// B6 / UNIT-7 polish 2026-05-27 — Russell's corrected "committed pipeline" definition.
//
// Locks the two stage sets discovered via LIVE Salesforce SOQL on 2026-05-27.
// Replaces the prior S4+S5 / "Commit + Best Case" forecast-category filter.

/**
 * Locked stage values for Type='New Business' opportunities where
 * Stage_2_Bump_Date__c IS NOT NULL — i.e., the canonical new-biz stage set.
 *
 * Discovery query (org: classedu.my.salesforce.com, ran 2026-05-27):
 *   SELECT StageName, COUNT(Id)
 *   FROM Opportunity
 *   WHERE Type = 'New Business' AND Stage_2_Bump_Date__c != null
 *   GROUP BY StageName
 *
 * Observed (count in parens):
 *   Discovery (5), Evaluation (53), Quote in Review (12),
 *   Qualified Opportunity (70), Negotiation (6), Closed Won (879),
 *   Closed Lost (5691)
 *
 * Closed Won / Closed Lost are retained: an opp that historically progressed
 * past Stage-2 and is now terminal still belongs to the new-biz pipeline by
 * lineage. Callers that need OPEN committed pipeline must additionally filter
 * IsClosed = false at query time.
 */
export const NEW_BIZ_COMMITTED_STAGES: readonly string[] = Object.freeze([
  'Discovery',
  'Evaluation',
  'Quote in Review',
  'Qualified Opportunity',
  'Negotiation',
  'Closed Won',
  'Closed Lost',
]);

/**
 * Renewal-specific stage values: the StageName values that appear under
 * Type = 'Renewal' but do NOT appear in the new-biz set above.
 *
 * Discovery query (ran 2026-05-27):
 *   SELECT StageName, COUNT(Id)
 *   FROM Opportunity
 *   WHERE Type = 'Renewal'
 *   GROUP BY StageName
 *
 * Observed for Type='Renewal' (count in parens):
 *   Renewal Quote Sent (50), Outreach (35), Qualified Renewal (515),
 *   Verbal Approval (15), Contracting (6), Engagement (34),
 *   Closed Won (23710), Closed Lost (8925)
 *
 * The set below excludes 'Closed Won' / 'Closed Lost' which overlap with the
 * new-biz stage set (per spec: "renewal-specific stages = renewal-set minus
 * overlap with new-biz"). Callers that need ALL renewal stages including
 * terminal must check both sets.
 */
export const RENEWAL_COMMITTED_STAGES: readonly string[] = Object.freeze([
  'Renewal Quote Sent',
  'Outreach',
  'Qualified Renewal',
  'Verbal Approval',
  'Contracting',
  'Engagement',
]);

/**
 * Minimal Opportunity shape required by isCommittedOpp.
 * Salesforce returns these as the literal Type and StageName fields.
 */
export interface OpportunityForCommitCheck {
  Type: string | null | undefined;
  StageName: string | null | undefined;
}

/**
 * Branches on opp.Type and tests membership in the appropriate locked stage set.
 *
 * For Type='New Business': membership in NEW_BIZ_COMMITTED_STAGES is the
 * static approximation of "has Stage_2_Bump_Date__c set." Callers that need
 * exact bump-date semantics must include the field in their SOQL projection
 * and filter accordingly.
 *
 * For Type='Renewal': membership in RENEWAL_COMMITTED_STAGES.
 *
 * Any other Type, or missing StageName, returns false.
 */
export function isCommittedOpp(opp: OpportunityForCommitCheck): boolean {
  if (!opp.StageName) return false;

  if (opp.Type === 'New Business') {
    return NEW_BIZ_COMMITTED_STAGES.includes(opp.StageName);
  }
  if (opp.Type === 'Renewal') {
    return RENEWAL_COMMITTED_STAGES.includes(opp.StageName);
  }
  return false;
}
