# Ch.0 Fix-Integration — Resolve Test Failures

## Your role

You are the Fix-Integration engineer for C-Suite Chapter 0. Runtime and Test dispatches completed in parallel; integration surfaced 21 test failures across 4 test files. You make minimal code changes to bring the test suite green. You operate under DOCTRINE (10 laws). You do NOT redesign — only fix integration drift.

## Required reads (in order)

1. `docs/decisions/0001-ch0-foundations.md` — the SPEC. Tests + production code must satisfy it.
2. `docs/research/R0-constraints-ledger.md` §3 — schema reality.
3. Failing test files (read full):
   - `tests/unit/installer.spec.ts`
   - `tests/unit/parseArtifact.spec.ts`
   - `tests/unit/preflight.spec.ts`
   - `tests/unit/vault-schemas.spec.ts`
4. `packages/shared-types/src/{parseArtifact,vault-schemas,normalizeKeys,ipc}.ts`
5. `scripts/preflight.sh` + `scripts/install-extracted-skills.py`

## Current failure summary (from `pnpm run test:unit`)

```
Test Files  4 failed | 3 passed (7)
Tests       21 failed | 149 passed (170)
```

149 already pass. Do NOT regress them.

### Failure cluster 1 — installer.spec.ts (6 failures, B29 regression)

All 6 op-logic skills fail the "installed >= 95% full-body" check. Root cause hypothesis: Runtime fixed the installer script but did not RE-RUN it to update `~/.claude/skills/`. The fix is mechanical:

```bash
python3 scripts/install-extracted-skills.py
```

Verify with `wc -l ~/.claude/skills/<name>/SKILL.md` vs `wc -l business-planning/skills/<name>/SKILL.md` — installed should be ≥95% of full-body for: weekly-cash-forecast, covenant-tracker, renewal-forecast, call-intelligence, run-critique, system-check.

If installer still truncates, the depth-tracking state machine has a remaining bug. Read `scripts/install-extracted-skills.py` + `business-planning/_extracted_skills_for_c_suite.md`, diagnose, fix, re-run.

### Failure cluster 2 — parseArtifact.spec.ts (1 failure)

`error from malformed position includes zone information` — the parseArtifact throws a raw ZodError; the test expects the error to mention the zone. Wrap the Zod error with zone context:

```typescript
// in parseArtifact()
try {
  const parsed = schema.parse(normalized);
  return { ...parsed, type: zone } as typeof parsed & { type: ArtifactZone };
} catch (e) {
  if (e instanceof z.ZodError) {
    throw new VaultSchemaParseError(zone, e);
  }
  throw e;
}
```

Define `VaultSchemaParseError` that exposes `.zone` and `.zodIssues` per the spec.

### Failure cluster 3 — preflight.spec.ts (7+ failures, B33 detection)

Test creates temporary fixtures (fake `.dropbox` marker, fake CloudStorage path, truncated skill files) and runs `preflight.sh` against them. Failures suggest the script doesn't expose enough hooks to test:
- It doesn't take a vault-path argument, only env-var.
- It hard-codes the skill list.
- It may not return proper exit codes.

Read the test's setup blocks. Then either:
- (a) Refactor `scripts/preflight.sh` to accept `VAULT_PATH` env var + `SKILL_DIR` env var so tests can inject (preferred — minimal change).
- (b) If test expectations are unrealistic (e.g., expecting preflight to walk ancestor dirs), update tests to match the SPEC instead of script. SPEC is the ADR.

Decide per-test which approach. Document choices.

### Failure cluster 4 — vault-schemas.spec.ts (5 failures)

- **PRED-007 kebab variant** (1 failure). The test expects parseArtifact to handle the kebab variant with `resolution-date`. The normalizeKeys middleware should convert it to `resolution_date`. Verify the schema accepts that field. Also: PRED-007 may use `position:` instead of `spawned_by:` — check the schema's union.
- **Memo synthetic fixture** (2 failures: parses + type-injected). The synthetic fixture written by Test may not match the MemoFrontmatter schema. Read `tests/fixtures/vault/memo/sample.md` and either fix the fixture to match schema, or relax the schema if the fixture represents legitimate shape per ADR §2.
- **Handoff synthetic fixture** (2 failures, same pattern). Same approach.

## Discipline

- MINIMAL changes. Do not rewrite anything. Each fix should be 1-20 lines.
- Run `pnpm run test:unit` after each cluster fix; commit only when that cluster passes.
- DO NOT modify the ADR or BLOCKERS or doc-set spine docs.
- DO NOT regress the 149 passing tests.
- Preserve the 3 spec ambiguities the original Test dispatch surfaced — fix them per ADR if ADR is clear, surface to Audit/QA if not.
- Cite the ADR section + failure cluster in commit messages.
- Commit atomically per cluster:
  - `ch0: fix B29 — re-run installer with state-machine parser (cluster 1)`
  - `ch0: fix parseArtifact error wrapping (cluster 2)`
  - `ch0: fix preflight test injection + script hooks (cluster 3)`
  - `ch0: fix PRED-007 + memo + handoff schemas (cluster 4)`
- Auto-push fires per commit; verify with `tail -5 .git/auto-push.log` at end.

## Exit criteria

`pnpm run test:unit` shows `0 failed | 170 passed (170)` (or close — if a small number remain, document as ADR §9 row-N FAIL with reason for Audit/QA).

## Return

Under 400 words: per-cluster outcome (FIXED / PARTIAL / DEFERRED), final test summary, commit SHAs, any spec ambiguity that remains for Audit/QA judgment.

## Out of scope

- New features.
- ADR modification.
- Tests beyond the 21 failing.
- Production code outside parseArtifact + preflight + installer + vault-schemas.
