# Ch.2 Audit/QA Report — Independent Acceptance Verification

**Auditor:** EvidenceQA (Audit/QA agent, isolated from Build/Test per DOCTRINE law #7)
**Audit date:** 2026-05-27
**ADR under review:** `docs/decisions/0003-ch2-safewrite.md`
**Head commits reviewed:** Ch.2 complete build (SafeWrite + git + chokidar + G-1/G-2/G-6 fixes)
**Test run (unit):** 767 passed / 27 failed (all Ch.5 RED stubs, not Ch.2) / 2 skipped (`pnpm run test:unit`, 2026-05-27)
**Test run (fuzz):** 1 FAILED — Invariant 3 fires (`pnpm test:fuzz`, 2026-05-27)
**Verdict: CHAPTER REOPEN — 8 PASS / 1 FAIL / 2 CONCERN / 1 NEEDS WORK (see §2)**

---

## 1. Per-Criterion PASS/FAIL Table (ADR §8, 10 rows)

| # | Criterion | Implementing file(s) | Test(s) | Verdict | Evidence |
|---|-----------|----------------------|---------|---------|----------|
| AC-1 | Concurrent-write fuzz: 20 C-Suite writers × N=20 ops, all 8 invariants pass | `packages/vault-writer/src/safeWrite.ts` | `tests/fuzz/safewrite-concurrent.spec.ts` | **FAIL** | Invariant 3 fires: `WRITER-0-SEQ-0 from agent 0 silently dropped`. Content written with `result:'ok'` is subsequently overwritten by external simulator with no sidecar produced. See §2. |
| AC-2 | Atomic rename (APFS temp → target); no partial read possible | `packages/vault-writer/src/safeWrite.ts` lines 176-200 | `tests/unit/safewrite.spec.ts` (atomic-rename group) | PASS | `fs.rename(tempPath, filePath)` is APFS-atomic. Temp written to `${filePath}.tmp-<uuid>`. `safeWrite: atomic rename` test group passes. |
| AC-3 | Zone-gated hash check: position/decision/workstream/stakeholder_person/stakeholder_account → hashCheck=true; memo/prediction/handoff → hashCheck=false | `packages/vault-writer/src/safeWrite.ts` (HASH_CHECK_ZONES) + `apps/utility/src/safewrite/zonePolicy.ts` | `tests/unit/safewrite.spec.ts` (zone-policy group) | **CONCERN** | Primitive `HASH_CHECK_ZONES` covers 5 correct zones. BUT `apps/utility/src/safewrite/zonePolicy.ts` DIVERGES from ADR §2.1 on 6 zones: `prediction` = hashCheck:true (ADR says false); `stakeholder_person` / `stakeholder_account` / `pre-mortem` / `tripwire` / `competitor` = hashCheck:false (ADR says true for all 5). Production wrapper uses zonePolicy.ts, not the primitive's set. See §2. |
| AC-4 | Conflict → sidecar at `<basename>.proposed-<ISO-timestamp>.md` | `packages/vault-writer/src/safeWrite.ts` lines 190-197 | `tests/unit/safewrite.spec.ts` (conflict group) | PASS | Sidecar path = `filePath.replace(/\.md$/, '') + '.proposed-' + isoStamp() + '.md'`. Format `YYYY-MM-DDTHHMMSS-mmm`. Tests assert path format and `result:'conflict'` return. |
| AC-5 | `safewrite.conflict` IPC emitted on hash mismatch | `apps/utility/src/safewrite/index.ts` (wrapper, not primitive) | `tests/unit/safewrite.spec.ts` does NOT test IPC emit | NEEDS WORK | IPC emission is in the utility wrapper (`index.ts`) only, not in the primitive. `safewrite.spec.ts` tests the primitive; no test verifies `safewrite.conflict` IPC is actually sent to a renderer. No integration test for the IPC path. |
| AC-6 | Git commit message format: `c-suite: <agent> wrote <relPath> during <playbook> run <runId>` | `packages/vault-writer/src/safeWrite.ts` lines 219-220 + `apps/utility/src/safewrite/git.ts` | `tests/unit/safewrite.spec.ts` (commit-format group) | PASS | **BY-HAND REPRODUCED.** Created temp git vault, called `safeWrite()` with `commitVault:true`, ran `git log --format=%B -1`. Output: `c-suite: EvidenceQA wrote positions/test-position.md during cash_lever_vs_trough run qa-hand-run-001`. Exact match to spec. |
| AC-7 | chokidar: 1s debounce on all events; temp/sidecar/git files ignored | `packages/vault-watcher/src/watcher.ts` | `tests/unit/vaultwatcher.spec.ts` | PASS | `DEBOUNCE_MS = 1000` exported constant. `WATCHER_IGNORED_PATTERNS` = `['**/.git/**', '**/.DS_Store', '**/*.tmp-*', '**/*.proposed-*']`. Static config tests (AC-10b subset) pass. Integration debounce tests pass per prior runs. |
| AC-8 | `VaultNotInitializedError` thrown when vault has zero commits; `vault.init.error` IPC emitted | `packages/vault-writer/src/safeWrite.ts` lines 19-26, 100-110; `apps/utility/src/safewrite/index.ts` G-1 handler | `tests/unit/safewrite.spec.ts` + `tests/unit/preflight-vault-commits.spec.ts` + `tests/unit/ipc.spec.ts` | PASS | `VaultNotInitializedError` thrown on `git log --oneline -1` returning empty. All 5 preflight-vault-commits tests pass. `vault.init.error` IPC variant at `ipc.ts:231-239` (G-1 landed). 5 ipc.spec.ts tests cover it. |
| AC-9 | Per-path Promise serialization: concurrent writes to same path are queued, not racy | `packages/vault-writer/src/safeWrite.ts` lines 50-58 | `tests/unit/safewrite.spec.ts` (path-lock group) | PASS | `writeQueue: Map<string, Promise<void>>`. `withPathLock` chains via `.then(fn).finally(resolve)`. Tests assert serial execution order. |
| AC-10 | chokidar ignores `.git/`, `.DS_Store`, `*.tmp-*`, `*.proposed-*`; exports constants for test assertion | `packages/vault-watcher/src/watcher.ts` lines 16-21, 24 | `tests/unit/vaultwatcher.spec.ts` (static-config group) | PASS | `WATCHER_IGNORED_PATTERNS` and `DEBOUNCE_MS` exported. 6 static-config tests pass asserting each pattern and constant value. |

**Verdict counts: 8 PASS / 1 FAIL (AC-1) / 1 NEEDS WORK (AC-5) / 1 CONCERN (AC-3)**

---

## 2. FAIL / CONCERN / NEEDS WORK Detail

### FAIL — AC-1: Fuzz Invariant 3 fires (keystone safety proof fails)

**File:** `tests/fuzz/safewrite-concurrent.spec.ts`

**Evidence (exact output):**
```
FAIL  tests/fuzz/safewrite-concurrent.spec.ts > SafeWrite concurrent-write fuzz — N=20 writers, zero data loss > N=20 concurrent writers — all 8 invariants pass 7791ms
AssertionError: Invariant 3: marker WRITER-0-SEQ-0 from agent 0 silently dropped:
expected '---\nid: POS-FUZZ\nstatus: active\n---\nWRITER-1-SEQ-3\n' to contain 'WRITER-0-SEQ-0'
```

**Root cause analysis:**

The test tracks all content markers that C-Suite agents attempt to write. When `safeWrite()` returns `result:'ok'`, the content is in the target file. But the external simulator (representing Cowork or direct Obsidian edits) immediately overwrites the target file with its own content via a raw `writeFile()` call — AFTER SafeWrite's conflict detection window has already closed. SafeWrite only creates a sidecar when it DETECTS a conflict during its own pre-hash → temp-write → re-hash window. Once SafeWrite has returned `ok`, it has no mechanism to protect against subsequent external overwrites.

Result: the marker `WRITER-0-SEQ-0` is in neither the final file (overwritten by external simulator) nor any sidecar (no conflict was detected by SafeWrite). Invariant 3 fires.

**Is this a test design flaw or a genuine bug?** This is a **genuine AC-1 failure**. ADR §6.2 defines Invariant 3: "every C-Suite content marker MUST appear in the final file OR a sidecar — no silent drops." This is the zero-data-loss guarantee. The current implementation does not guarantee it against concurrent external writers that operate outside SafeWrite's detection window.

**Why not an automatic CONCERN?** ADR §1.2 describes the hash-check window as the protection mechanism. But the fuzz test simulates the realistic scenario (Cowork edits, direct vault access), and the invariant is in the spec. The keystone test fails. REOPEN is mandatory.

**Responsible party:** Ch.2 architect / fix-integration agent. Options: (a) extend post-write re-read check; (b) flock-based file locking; (c) git-SHA pre-commit verification before rename confirms no external write occurred; (d) document as accepted-risk and weaken Invariant 3 in the ADR (requires ADR amendment — out of scope for QA).

---

### CONCERN — AC-3: Production `zonePolicy.ts` diverges from ADR §2.1 on 6 zones

**File:** `apps/utility/src/safewrite/zonePolicy.ts`

**ADR §2.1 zone table (canonical):**
- `position`, `decision`, `workstream`, `stakeholder_person`, `stakeholder_account`, `pre-mortem`, `tripwire`, `competitor` → hashCheck:true, commitVault:true (shared zones, concurrent-write risk)
- `prediction`, `memo`, `handoff` → hashCheck:false, commitVault:false (agent-exclusive, no concurrent-write risk)

**What `zonePolicy.ts` actually ships:**
- `prediction` → hashCheck:**true** (ADR says false — false positive conflict risk on agent-exclusive zone)
- `stakeholder_person` → hashCheck:**false** (ADR says true — missed conflict protection for shared zone)
- `stakeholder_account` → hashCheck:**false** (ADR says true — missed conflict protection for shared zone)
- `pre-mortem` → hashCheck:**false** (ADR says true — missed conflict protection for shared zone)
- `tripwire` → hashCheck:**false** (ADR says true — missed conflict protection for shared zone)
- `competitor` → hashCheck:**false** (ADR says true — missed conflict protection for shared zone)

**Impact:** 5 shared zones receive no hash-check conflict protection in production. 1 agent-exclusive zone gets false hash checks. The primitive's `HASH_CHECK_ZONES` also only covers 5 zones (missing pre-mortem, tripwire, competitor).

**Why CONCERN not FAIL:** Unit tests test the primitive's behavior with the correct 5 zones and all pass. The zone-policy mismatch is a production divergence that would surface as missed conflict detection in live use, but the test suite doesn't exercise the production wrapper's zone routing directly. Classified as CONCERN because AC-3 unit tests pass against the primitive; the production path is untested.

**Fix required:** `zonePolicy.ts` must align with ADR §2.1. The primitive's `HASH_CHECK_ZONES` should also include pre-mortem, tripwire, competitor.

---

### NEEDS WORK — AC-5: No test verifies `safewrite.conflict` IPC is actually emitted

**File:** `apps/utility/src/safewrite/index.ts` (IPC emission at wrapper layer)

**Evidence:** `safewrite.spec.ts` tests the `packages/vault-writer/src/safeWrite.ts` primitive. The primitive does NOT emit IPC — it only returns `{result:'conflict', sidecarPath}`. The utility wrapper (`apps/utility/src/safewrite/index.ts`) calls `emitFn({ kind: 'safewrite.conflict', ... })` on conflict. No test in the suite exercises the wrapper's IPC emission path. `ipc.spec.ts` validates the `safewrite.conflict` variant shape but does not test that the wrapper actually emits it.

**Impact:** AC-5's acceptance criterion is "safewrite.conflict IPC emitted on hash mismatch." This is partially implemented (shape defined, wrapper has the emit call) but not verified by any test. A regression in the wrapper's emit path would go undetected.

**Fix required:** Add a test to `tests/unit/safewrite.spec.ts` or a new integration test that exercises the utility wrapper's IPC emission on conflict (mock `emitFn`, drive a conflict, assert `safewrite.conflict` payload matches IPC schema).

---

## 3. BY-HAND Reproduction — AC-6 (git commit format)

**Criterion:** `git log --format=%B -1` output must be `c-suite: <agent> wrote <relPath> during <playbook> run <runId>`

**Steps executed:**
1. Created temp git vault via `fs.mkdtemp()` in `/tmp/qa-vault-ac6-*`
2. `git init` → `git add .gitkeep` → `git commit -m "init"` (bootstrap: ≥1 commit so VaultNotInitializedError doesn't fire)
3. `mkdir -p positions/` inside vault (safeWrite calls `simpleGit(path.dirname(filePath))` — parent must exist)
4. Called `safeWrite(filePath, content, { agent: 'EvidenceQA', runId: 'qa-hand-run-001', playbook: 'cash_lever_vs_trough', commitVault: true, zone: 'position' })`
5. Ran `git raw(['log', '--format=%B', '-1'])`

**Result:**
```
SafeWrite result: {"result":"ok","sha":"882acd758ee888cc229ef59f1493df65a945456c4ed1a1e8764d98b15f227a9d","commitSha":"de46391a38c389ccebd41c6bfc2c7b7a71426459"}
Raw commit message: "c-suite: EvidenceQA wrote positions/test-position.md during cash_lever_vs_trough run qa-hand-run-001"
```

**Verdict:** PASS. Exact spec match. macOS `/var` symlink realpath fix (line 215-217 of safeWrite.ts) correctly resolves path before `path.relative()` so relPath is clean.

---

## 4. Security Pass

**Commands run:**
```
grep -rn "writeFile|writeFileSync" apps/main apps/utility | grep -i vault
```

**Result:** CLEAN — no direct vault writes outside SafeWrite module. No new credentials or secrets in Ch.2 code (Ch.2 doesn't touch MCP, auth, or external services). `.env*` patterns in `.gitignore` (verified Ch.1). Ch.2 code scope: vault writes, chokidar watcher, IPC types, migration SQL, preflight script. None introduce secrets.

---

## 5. Spec Ambiguities Resolved by Runtime

| ID | Issue | Resolution | Verdict |
|----|-------|------------|---------|
| G-1 | `vault.init.error` IPC variant (23rd) | `ipc.ts:231-239` — variant landed, shape: `{message: string, vaultPath?: string}`. 5 ipc.spec.ts tests confirm. | PASS |
| G-2 | `conflicts` table SQLite migration | `db/migrations/002_conflicts.sql` — schema complete. Adds `pre_hash`, `re_read_hash`, `resolved_at`, `resolution` beyond ADR proposal — all additive improvements. | PASS |
| G-6 | `simple-git` 3.x `CommitResult.commit` field | `apps/utility/src/safewrite/git.ts` uses `result.commit`. simple-git 3.x typings confirm `CommitResult.commit: string`. Correct field used. | PASS |

---

## 6. B22 Status Check

**B22: Vault git has zero commits — STILL ACTIVE, pending Russell execution.**

`preflight.sh` lines 54-61 verify vault commit count and `fail` with message: "Vault has no commits — run scripts/vault-bootstrap.sh before starting C-Suite (B22)". Behavior confirmed by `tests/unit/preflight-vault-commits.spec.ts` (5 tests, all pass: fails on no .git, fails on zero commits, passes on ≥1 commit).

`scripts/vault-bootstrap.sh` exists and is idempotent (skips if vault already has commits). Russell has NOT run it — vault at `/Users/russellteter/Documents/Claude/Projects/Business Planning/` still has zero commits as of 2026-05-27. B22 remains active until Russell executes `scripts/vault-bootstrap.sh` at Ch.5/setup.

---

## 7. chokidar Invariant Check

**DEBOUNCE_MS:** `1000` (exported constant, `watcher.ts:24`). Matches ADR §5.2 exactly.

**Ignored patterns (ADR §5.3):**
- `**/.git/**` — git internals
- `**/.DS_Store` — macOS metadata
- `**/*.tmp-*` — SafeWrite temp files mid-write
- `**/*.proposed-*` — SafeWrite sidecar conflict files

All 4 patterns present and correct. `awaitWriteFinish` is DISABLED (comment at watcher.ts:97-100 explains: 500ms stability + 1000ms debounce exceeds test budget; debounce alone sufficient). This is an accepted deviation from optimal write-completion signaling; not a spec violation.

---

## 8. Outstanding Items for Ch.2 Fix-Integration

1. **AC-1 (FAIL — blocking REOPEN):** Fuzz Invariant 3 fires. External-write-after-ok silently drops C-Suite content. Ch.2 fix-integration must resolve before CLOSE.
2. **AC-3 (CONCERN):** `zonePolicy.ts` diverges from ADR §2.1 on 6 zones. Align before CLOSE.
3. **AC-5 (NEEDS WORK):** No test for `safewrite.conflict` IPC emission at wrapper layer. Add integration test before CLOSE.
4. **Primitive `HASH_CHECK_ZONES`:** Only covers 5 zones; missing pre-mortem, tripwire, competitor. Align with full ADR §2.1 shared-zone list.

---

[CH-2-AUDIT/QA] REOPEN: 8 PASS / 1 FAIL / 1 NEEDS WORK / 1 CONCERN. AC-1 fuzz keystone fails (Invariant 3). AC-3 zone policy production divergence. AC-5 IPC emission untested. B22 still active pending Russell vault-bootstrap execution. G-1/G-2/G-6 all landed correctly.
