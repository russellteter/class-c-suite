# Ch.2 Test — TDD Brief (SafeWrite + fuzz)

## Your role

Test author for Ch.2. Write tests against ADR-0003 §8 acceptance criteria. DOCTRINE law #7 — no production code (Runtime dispatch).

## Required reads

1. `docs/decisions/0003-ch2-safewrite.md` — your spec (Section 8 acceptance table is your test surface).
2. `docs/decisions/0002-ch1-process-architecture.md` §3 (supervisor) + §7 (heartbeat IPC) for IPC patterns.
3. `tests/unit/ipc.spec.ts` (Ch.0) — extend the IPC discriminated-union tests with the new `vault.init.error` variant (G-1) and `safewrite.conflict` if not already covered.

## Test files to write

### `tests/unit/safewrite.spec.ts` (ADR §8 rows AC-2, AC-3, AC-4, AC-6, AC-7)

- Happy path: `safeWrite(path, content, {commitVault: true, zone: 'position'})` writes file, emits no conflict, returns `{result: 'ok', sha, commitSha}`.
- Conflict: pre-hash ≠ re-read-hash → returns `{result: 'conflict', sidecarPath, preHash, reReadHash}`; sidecar exists at `<path>.proposed-YYYY-MM-DDTHHMMSS-mmm.md`; original file untouched.
- Agent-exclusive zone (`prediction`, `memo`, `handoff`): hash-check skipped; atomic-rename direct.
- Sidecar filename regex: `.proposed-\d{4}-\d{2}-\d{2}T\d{6}-\d{3}\.md$`.
- `VaultNotInitializedError` raised on empty git vault; error message cites `vault-bootstrap.sh`.
- git commit format: `c-suite: <agent> wrote <relPath> during <playbook> run <runId>`.

### `tests/fuzz/safewrite-concurrent.spec.ts` (ADR §8 row AC-1 — the keystone)

Per ADR §6 (fuzz design). N=20 writers over 5000ms.

Invariants (assert ALL):
1. File at `<path>` has coherent YAML frontmatter at test end.
2. Exactly one `.proposed-*` sidecar per detected conflict.
3. No content from any writer silently dropped (every writer's content either landed in `<path>` or in a sidecar).
4. `git log --oneline | wc -l` count = successful C-Suite SafeWrite count.
5. No `.tmp-*` files remain in vault.
6. Sidecar timestamps are unique (no two sidecars share an isoStamp).
7. SafeWrite per-path queue drains within 10s after writers stop.
8. `safewrite.conflict` IPC events delivered in chronological order.

Test timeout: 30s. Run on a tmpdir vault, not Russell's real vault.

### `tests/unit/vaultwatcher.spec.ts` (ADR §8 rows AC-5, AC-8)

- chokidar 1s debounce: rapid 5 writes within 500ms → exactly 1 `vault.changed` event.
- chokidar ignores: write to `.git/HEAD`, `.DS_Store`, `*.tmp-foo`, `*.proposed-X.md` → zero events.
- chokidar parses frontmatter via parseArtifact: write a known POS-001 fixture → emitted event includes parsed structured payload (not raw markdown).

### `tests/unit/preflight-vault-commits.spec.ts` (Section 6)

- Empty vault git → preflight fails with non-zero exit + hint to vault-bootstrap.sh.
- Vault with ≥1 commit → preflight passes vault-init section.

### Update `tests/unit/ipc.spec.ts`

Add tests for the new `vault.init.error` variant (G-1). 3 cases: valid parse, invalid (missing payload), invalid (wrong payload shape).

## Discipline

- TDD: tests describe intended behavior. Will fail until Runtime ships.
- Mock Electron's `app.getPath` for vaultwatcher tests.
- Use temp dirs for git tests (each test isolates its own vault).
- Use vitest `concurrent: false` for the fuzz test (resource-intensive).

## Return

Under 500 words: test files created, fuzz invariant list verified, coverage estimate, commit SHAs.

## Out of scope

- Production code.
- ADR modification.
- Ch.1+/Ch.3+ test scope.
