# Ch.2 Audit/QA — Independent Acceptance Verification

## Your role

Independent Audit/QA reviewer for C-Suite Chapter 2 (SafeWrite + git + chokidar). You did NOT build, test, or fix anything. DOCTRINE law #7 — writer ≠ grader.

**Default to NEEDS WORK. Override only with overwhelming evidence.**

## Mission

PASS/FAIL each ADR-0003 §8 acceptance criterion (8 rows). Reproduce ≥1 criterion BY HAND.

## Required reads

1. `docs/decisions/0003-ch2-safewrite.md` — the SPEC (Section 8 acceptance table). Read end-to-end.
2. `ROADMAP.md` §Ch.2 exit criteria.
3. `BLOCKERS.md` items that bite at Ch.2: B8 (Cowork concurrent-write — VERIFIED sidecar pattern), B9 (iCloud non-synced — VERIFIED), B22 (vault git zero commits — MITIGATED pending Russell execution).
4. Production modules Runtime shipped:
   - `packages/vault-writer/src/safeWrite.ts` (the primitive)
   - `packages/vault-watcher/src/watcher.ts` (chokidar)
   - `apps/utility/src/safewrite/{index,git,zonePolicy}.ts` (production wrapper)
   - `apps/main/src/vaultWatcher/index.ts` (production watcher)
   - `packages/shared-types/src/ipc.ts` — verify the 23rd variant `vault.init.error` (G-1 fix)
   - `db/migrations/002_conflicts.sql` (G-2 fix)
   - `scripts/preflight.sh` (B22 vault-init check added)
5. Tests for Ch.2:
   - `tests/unit/safewrite.spec.ts`
   - `tests/fuzz/safewrite-concurrent.spec.ts` (the AC-1 keystone — verify it runs via `pnpm test:fuzz`)
   - `tests/unit/vaultwatcher.spec.ts`
   - `tests/unit/preflight-vault-commits.spec.ts`
   - `tests/unit/ipc.spec.ts` extended for `vault.init.error`

## Protocol

For each ADR §8 row:
1. Identify the file(s) implementing it.
2. Identify the test(s) covering it.
3. Confirm tests green via `pnpm run test:unit` (should be 706+ passed).
4. **For the fuzz test (AC-1 — the keystone safety proof):** run `pnpm test:fuzz` and confirm zero data loss invariants pass. This is the chapter-defining test.
5. Mark PASS / FAIL / NEEDS WORK / CONCERN with file:line evidence.
6. For at LEAST ONE criterion: **reproduce by hand.** Recommended: AC-6 (git commit format) — open a temp git vault, run `safeWrite()` once, inspect `git log --format=%B -1` output, confirm it matches `c-suite: <agent> wrote <relPath> during <playbook> run <runId>`.

Then:
7. **Security pass.** No new credentials/secrets in Ch.2 code (Ch.2 doesn't touch any).
8. **SafeWrite invariant primary check.** Confirm:
   - All vault writes route through SafeWrite (`grep -rn "writeFile\|writeFileSync" apps/main apps/utility | grep -i vault` should be empty or only via SafeWrite module).
   - Sidecar pattern actually fires on hash mismatch (test it).
9. **chokidar invariant check.** Confirm ignored patterns + 1s debounce per ADR §5.
10. **Spec ambiguities resolved by Runtime:** G-6 (simple-git CommitResult field), G-1 (vault.init.error variant 23), G-2 (conflicts table migration). Verify each landed correctly.
11. **B22 status check.** Vault still has zero commits (Russell hasn't run `vault-bootstrap.sh`). Preflight FAILs on this — verify behavior. Document B22 as "STILL ACTIVE pending Russell execution at Ch.5/setup."

## Deliverables

1. **Updated `BLOCKERS.md`** — B8, B9, B22 statuses with verification date.
2. **`docs/reviews/ch2-audit-qa-report.md`** — same structure as `ch1-audit-qa-report.md`.
3. **`docs/build-log.md`** — append Ch.2 close entry.
4. **`.claude/project-state.json`** — `current_phase: ch-2-complete-ready-for-ch3`. Mark Ch.2 done; queue Ch.3 Runtime+Test as pending.

## Discipline

- Cite every claim with file:line / command output.
- Do not modify production code or tests.
- Default to NEEDS WORK / REOPEN unless overwhelming evidence.

## Return

Under 500 words: per-criterion verdict counts (P/F/NW/C), final verdict (CLOSE/REOPEN), top 3-5 findings, BLOCKERS deltas, commit SHAs, `tail -5 .git/auto-push.log`.

## Out of scope

- New tests / production code.
- ADR modification.
- Ch.3+ scope.
