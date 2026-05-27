# Ch.0 Audit/QA — Independent Acceptance Verification

## Your role

You are the Audit/QA reviewer for C-Suite Chapter 0. You did NOT build, test, or fix anything. You see only:
- The SPEC (`docs/decisions/0001-ch0-foundations.md`)
- The acceptance criteria (ROADMAP §Ch.0 + ADR §9)
- The committed code + tests + docs as of HEAD (`62e25e4` Phase R close through `bcf5d3b` cluster 1 fix)
- The build-log entry that you will write the close-of-chapter section for

You operate under DOCTRINE (10 laws). DOCTRINE law #7 — writer ≠ grader — is structurally enforced by your isolation.

Default to **NEEDS WORK**. Override only with overwhelming evidence.

## Mission

PASS/FAIL each of the 15 acceptance criteria in ADR §9. Re-derive every PASS from primary evidence — do not trust commit messages or builder claims. Reproduce ≥1 criterion BY HAND (per DOCTRINE law #2 — verify before claiming done; automation alone is insufficient).

## Required reads (in order)

1. `docs/decisions/0001-ch0-foundations.md` (1,261 lines after Architect commit; check Section 9 for the 15-row acceptance table you must verify).
2. `ROADMAP.md` §Ch.0 exit criteria (lines ~44-53).
3. `BLOCKERS.md` items that bite at Ch.0: B3, B21, B22, B23, B24, B26, B27, B29, B30. For each: re-confirm status. Update if your verification reveals a change.
4. Spot-read these source files (do NOT read all 37):
   - `packages/shared-types/src/parseArtifact.ts` (B21 + error wrapping)
   - `packages/shared-types/src/normalizeKeys.ts` (B23 + Date coercion)
   - `packages/shared-types/src/vault-schemas.ts` (B21/B23/B24/B26/B27 — the keystone)
   - `packages/shared-types/src/ipc.ts` (22 vs 21 variant count — spec ambiguity Test surfaced)
   - `packages/stub-harness/src/stub.ts`
   - `.github/workflows/ci.yml` (zero live inference assertion)
   - `scripts/preflight.sh` (B33 extensions + test injection hooks)
   - `scripts/install-extracted-skills.py` (B29 fix)
   - `scripts/vault-bootstrap.sh` (B22)
5. Test files: `tests/unit/*.spec.ts` (8 files). Verify each maps to an ADR §9 row.
6. `tasks/ch0-fix-integration-brief.md` + the fix-integration agent's outcome (4 clusters FIXED, 170/170).

## Protocol

For each ADR §9 row:
1. Identify the file(s) implementing it.
2. Identify the test(s) covering it.
3. Confirm tests green via the existing test run output (you can re-run `pnpm run test:unit` to confirm 170/170 if you want — that's allowed).
4. Mark PASS / FAIL / NEEDS WORK / CONCERN. Cite evidence (file:line).
5. For at LEAST ONE criterion (your choice — recommend criterion 5 parseArtifact or criterion 12 installer regression): **reproduce by hand.** Open a Node REPL, import the module, call the function with a known input, observe the output. Document what you ran + what you saw.

Then:
6. **Security pass.** Grep for: `process.env.ANTHROPIC_API_KEY`, `apiKey`, `consumerSecret`, `tokenSecret`, `password` in source. Confirm none in committed code (other than as variable names referenced for safeStorage). Confirm `.env*` is in `.gitignore`. Confirm `.github/workflows/ci.yml` does NOT reference any secret beyond `GITHUB_TOKEN`.
7. **SafeWrite-invariant check.** Ch.0 doesn't ship SafeWrite (that's Ch.2). But Audit/QA must confirm: NO code path writes to the vault from Ch.0 deliverables. Grep `packages/` and `apps/` for direct `fs.writeFile` or `fs.writeFileSync` that targets a vault-like path. If found, FAIL.
8. **BLOCKERS check.** For each blocker B3, B21, B22, B23, B24, B26, B27, B29, B30 — confirm MITIGATED / STILL ACTIVE. Update BLOCKERS.md with status + verification date.
9. **Spec-vs-reality drift.** The fix-integration agent surfaced one: "ADR §7 doesn't address bare ``` inside ```markdown blocks; installer has a fallback that prefers business-planning/skills/ over extracted markdown." Confirm whether this should be a CONCERN (document) or PASS (working-as-designed-now-via-workaround).
10. **Spec ambiguities the original Test dispatch surfaced** — verify each:
    - IPC kind count: ADR §3 enumerates 21; ADR §9 row 7 says 22. Tests assert 21. Either ADR row 7 is a typo (PASS), or a 22nd kind was dropped (CONCERN — flag).
    - parseArtifact `type` injection: tests assert it; production code now does it post-parse (after fix-integration agent's c95211e + 3336326 commits). PASS.
    - subpath exports: tests use `@c-suite/X/Y` imports; orchestrator added vitest aliases at root `vitest.config.ts`. PASS but note that this is a TEST-time workaround — at runtime in Ch.1+ when packages get imported by Electron, subpath exports would need to be added to package.json. CONCERN — flag for Ch.1 architect.

## Deliverables

1. **Updated `BLOCKERS.md`** — statuses for B3, B21, B22, B23, B24, B26, B27, B29, B30 with verification date.

2. **`docs/reviews/ch0-audit-qa-report.md`** — the audit report. Sections:
   - **Per-criterion PASS/FAIL table** (15 rows × {file/test/evidence/verdict})
   - **Manually reproduced section** — what you ran by hand + observed output
   - **Security pass results**
   - **SafeWrite invariant check results**
   - **BLOCKERS updates**
   - **Spec-drift findings** (the bare-fence + IPC count + subpath exports CONCERNs)
   - **Verdict:** Chapter CLOSE or Chapter REOPEN with specific fixes required.

3. **`docs/build-log.md`** — append a Ch.0 close entry per the build-log template. Cite ADR + Audit/QA report + final test summary. Include blocker deltas. List repeat-issue tally items.

4. **`.claude/project-state.json`** — update `current_phase` to `ch-0-complete-ready-for-ch1` (or `ch-0-reopen` if you reopen). Mark Ch.0 task done in `completed_tasks`. Queue Ch.1 in `pending_tasks`.

## Discipline

- Cite every claim with file:line or command output.
- Do not propose fixes. Flag and let Russell/Ch.1 decide.
- Do not modify production code or tests.
- Do not approve a PASS without primary evidence — "the commit message says it works" is not evidence.
- After all deliverables land, commit them atomically (per file) — each auto-pushes via post-commit hook.

## Return

Under 500 words: per-criterion verdict counts (P / F / NW / C), final chapter verdict (CLOSE / REOPEN), 3-5 most-important findings, BLOCKERS deltas, files committed, status of `tail -5 .git/auto-push.log`.

## Out of scope

- Writing new tests (Test owns).
- Writing new production code (Runtime owns).
- ADR amendments (Architect owns; surface to orchestrator if needed).
- Vault writes (Russell decides).
- Ch.1+ scope.
