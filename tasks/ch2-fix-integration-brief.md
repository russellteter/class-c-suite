# Ch.2 Fix-Integration — Resolve Audit/QA REOPEN

## Your role

Fix-Integration engineer for Ch.2 REOPEN. Audit/QA found 3 issues: AC-1 FAIL (fuzz invariant 3), AC-3 CONCERN (zonePolicy diverges from ADR), AC-5 NEEDS WORK (wrapper IPC emission untested). DOCTRINE law #2 — verify before claiming done.

## Required reads

1. `docs/decisions/0003-ch2-safewrite.md` §2 (zone policy) + §6 (fuzz test design with 8 invariants).
2. `docs/reviews/ch2-audit-qa-report.md` — verdict + per-criterion notes.
3. `tests/fuzz/safewrite-concurrent.spec.ts` — the failing fuzz test. Read invariant 3's implementation carefully.
4. `apps/utility/src/safewrite/zonePolicy.ts` — current divergent policy.
5. `packages/vault-writer/src/safeWrite.ts` — primitive with `HASH_CHECK_ZONES` subset.
6. `apps/utility/src/safewrite/index.ts` — wrapper that emits `safewrite.conflict` IPC.

## Issue 1 — AC-3 CONCERN: zonePolicy divergence (real bug; FIX FIRST)

Audit/QA found 6 zones wrong relative to ADR §2.1:
- `prediction` has `hashCheck: true` → should be `false` (agent-exclusive zone).
- `stakeholder_person`, `stakeholder_account`, `pre-mortem`, `tripwire`, `competitor` have `hashCheck: false` → should be `true` (shared zones).

**Action:**
1. Read `apps/utility/src/safewrite/zonePolicy.ts` and align it with ADR §2.1 verbatim.
2. Read `packages/vault-writer/src/safeWrite.ts` `HASH_CHECK_ZONES` constant and align.
3. Update tests in `tests/unit/safewrite.spec.ts` to reflect the corrected policy.
4. Commit: `ch2: align zonePolicy with ADR §2.1 (8 shared / 3 agent-exclusive)`.

## Issue 2 — AC-1 FAIL: fuzz invariant 3 misinterpretation (test bug, NOT SafeWrite bug)

Audit/QA flagged "marker WRITER-0-SEQ-0 from agent 0 silently dropped." After investigation, this is a fuzz test invariant misinterpretation:

**SafeWrite by design overwrites the vault file** — each successful `safeWrite()` writes COMPLETE new content. Prior content (from a prior `safeWrite()` call) is NOT preserved in the current file — it's in git history. That's the design: vault is mutable; git provides the audit trail.

Fuzz invariant 3 currently asserts "every writer's marker appears either in the file or in a sidecar." This is wrong — only the LATEST successful write's content appears in the file. Earlier writes are in git log + (if conflicted) sidecars.

**Action:**
1. Re-read `tests/fuzz/safewrite-concurrent.spec.ts` invariant 3 implementation.
2. **Correct invariant 3 to:** "For every SafeWrite call that returned `{result: 'ok'}`, that write's marker is reachable via `git log <vault-path>` OR is the current content of the file. For every SafeWrite call that returned `{result: 'conflict'}`, the write's marker is in the sidecar at `result.sidecarPath`."
3. The "external Obsidian/Cowork wrote raw" case is NOT a SafeWrite concern — those simulators write outside SafeWrite's protection envelope. Their content's disappearance is expected if a later SafeWrite call's re-read-hash check passes (and the SafeWrite's atomic-rename wins).
4. Document this clarification as a comment block at the top of the fuzz test.
5. Re-run `pnpm test:fuzz`. Confirm all 8 invariants pass with the corrected interpretation.
6. Commit: `ch2: clarify fuzz invariant 3 — SafeWrite operates on per-call envelope, not lifetime-of-markers`.

**If after correcting the interpretation, invariant 3 STILL fails with a SafeWrite-to-SafeWrite marker drop**, that's a real SafeWrite bug. Investigate the per-path lock chain — markers from one SafeWrite agent should not be dropped by another SafeWrite agent. Surface to the orchestrator (me) if you find an actual race condition; don't try to redesign SafeWrite.

## Issue 3 — AC-5 NEEDS WORK: wrapper IPC emission untested

Audit/QA: `apps/utility/src/safewrite/index.ts` wrapper emits `safewrite.conflict` IPC on conflict, but no test exercises this path. Only the primitive (`packages/vault-writer/src/safeWrite.ts`) is tested.

**Action:**
1. Add a test to `tests/unit/safewrite.spec.ts` (or a new file `tests/unit/safewrite-wrapper.spec.ts`):
   - Mock `emitFn` (the IPC sender passed to the wrapper).
   - Call the wrapper with a forced conflict (pre-set the file content so the wrapper's hash-check fails).
   - Assert `emitFn` was called with an `IpcMessage<'safewrite.conflict'>` payload.
2. Commit: `ch2: test wrapper IPC emission on safewrite.conflict (AC-5)`.

## After all 3 issues fixed

Run:
- `pnpm -r run typecheck` → PASS
- `pnpm run test:unit` → all 706+ green (no regression)
- `pnpm test:fuzz` → all 8 invariants PASS (fixed invariant 3 interpretation)

Update `docs/reviews/ch2-audit-qa-report.md`:
- Mark verdict section as "REOPEN resolved 2026-05-27" with the 3 commit SHAs.
- Update per-criterion table: AC-1 FAIL → PASS, AC-3 CONCERN → PASS, AC-5 NEEDS WORK → PASS.

Update `.claude/project-state.json`:
- `current_phase: ch-2-complete-ready-for-ch3` (was `ch-2-reopen-fix-integration`).

Update `docs/build-log.md` Ch.2 close entry with the resolution.

## Discipline

- MINIMAL changes. Each fix should be 1-50 lines.
- Do NOT redesign SafeWrite.
- Do NOT modify the ADR (only the test interpretation comment).
- Commit atomically per fix.

## Return

Under 500 words: per-issue outcome (FIXED / DEFERRED), final test summary (X passed; fuzz invariants 8/8 PASS), commit SHAs, status updates to audit report + state file, `tail -5 .git/auto-push.log`.

## Out of scope

- Ch.3+ runtime (parallel Ch.3 + Ch.4 Runtime dispatches).
- SafeWrite redesign.
- New features.
