# ADR-0007 — Committed-pipeline definition (Russell-corrected; live SOQL)

**Status:** Accepted
**Date:** 2026-05-27
**Owner:** /goal polish UNIT-7
**Supersedes:** Implicit S4+S5 ("Commit + Best Case") forecast-category filter that prior playbook stubs assumed.

## Context

Multiple playbooks (Cash lever, GTM reallocation, Strategic option, Board narrative, Renewal forecast) need a single canonical filter for "committed pipeline." The original v1 operating-model implicitly used Salesforce forecast categories — Stage 4 (Commit) + Stage 5 (Best Case). Russell corrected this during polish UNIT-7:

> "For Opportunity.Type = 'New Business': committed = rows where Stage_2_Bump_Date__c IS NOT NULL. The stage values that appear under that filter are the canonical new-biz stages. For Opportunity.Type = 'Renewal': committed = the stage values that do NOT appear in the new-biz set above. Those are the renewal-specific stages."

## Decision

1. Lock two stage-set constants discovered via **live** Salesforce SOQL against `classedu.my.salesforce.com` on **2026-05-27** (org alias `class-prod`).
2. Export a typed function `isCommittedOpp(opp)` that branches on `opp.Type` and tests membership in the appropriate set.
3. Every playbook that previously filtered "Commit + Best Case" calls `isCommittedOpp()` instead.

## Discovery queries (verbatim)

**SOQL A — New Business committed:**

```sql
SELECT StageName, COUNT(Id)
FROM Opportunity
WHERE Type = 'New Business' AND Stage_2_Bump_Date__c != null
GROUP BY StageName
```

Result (StageName / count):

| StageName | Count |
|---|---|
| Discovery | 5 |
| Evaluation | 53 |
| Quote in Review | 12 |
| Qualified Opportunity | 70 |
| Negotiation | 6 |
| Closed Won | 879 |
| Closed Lost | 5691 |

**SOQL B — Renewal stages (all):**

```sql
SELECT StageName, COUNT(Id)
FROM Opportunity
WHERE Type = 'Renewal'
GROUP BY StageName
```

Result (StageName / count):

| StageName | Count |
|---|---|
| Renewal Quote Sent | 50 |
| Outreach | 35 |
| Qualified Renewal | 515 |
| Verbal Approval | 15 |
| Contracting | 6 |
| Engagement | 34 |
| Closed Won | 23710 |
| Closed Lost | 8925 |

**Overlap removed for renewal set:** `Closed Won` and `Closed Lost` appear in both. Per the brief ("renewal-specific stages = renewal-set minus overlap with new-biz"), the renewal set is the 6 stages above with `Closed Won` / `Closed Lost` removed.

## Locked constants

`apps/utility/src/playbooks/lib/committed-pipeline.ts`:

```ts
export const NEW_BIZ_COMMITTED_STAGES = [
  'Discovery', 'Evaluation', 'Quote in Review',
  'Qualified Opportunity', 'Negotiation',
  'Closed Won', 'Closed Lost',
] as const;

export const RENEWAL_COMMITTED_STAGES = [
  'Renewal Quote Sent', 'Outreach', 'Qualified Renewal',
  'Verbal Approval', 'Contracting', 'Engagement',
] as const;
```

## Caveats

1. **Stage membership is a static approximation of the bump-date filter.** Discovery and Closed Lost both have `Stage_2_Bump_Date__c` set historically — they belong to the new-biz progression set by lineage, not by current state. Callers that need *open* committed pipeline must additionally filter `IsClosed = false` at query time.
2. **Renewal terminal stages excluded by spec.** A Renewal opp at `Closed Won` is NOT counted by `isCommittedOpp()` (the overlap-removal rule). Callers that need ALL renewal stages including terminal must check both sets.
3. **Stage labels can drift.** If Salesforce admins rename or split stages, the constants go stale. Re-run the two SOQL queries quarterly (next: 2026-08-27) and update the module + this ADR if the result diverges. The CRO lens prompt cites this ADR as the source.

## Consequences

- Callers stop using forecast-category math (`ForecastCategoryName IN ('Commit', 'Best Case')`) and use `isCommittedOpp()`.
- Pipeline coverage stats become consistent across playbooks (no "Commit + Best Case" vs "Stage 2+ bump" divergence).
- A future Ch.10 scheduler can call `isCommittedOpp()` from any playbook context without re-deriving the stage set.
- The CRO lens prompt (`apps/utility/src/prompts/cro.prompt.md`) explains the filter when synthesizing memos so Russell can trace any committed-pipeline number back to this ADR.

## Verification

- `tests/unit/committed-pipeline.spec.ts` asserts both constants + the function over 20 cases (every locked stage + boundary tests for cross-Type misclassification + null/undefined defenses).
- Live SOQL output captured 2026-05-27 09:30 ET; counts above are the snapshot.

## References

- Polish brief (docs/reviews/ultrareview-2026-05-27.md → UNIT-7).
- B6 (deferred until Day-Zero); this ADR closes the technical surface; Russell's mental-model confirmation remains a Day-Zero item if any future correction.
- Strategic_AI_Connector_Playbook.md (vault) — SOQL pattern reference.
