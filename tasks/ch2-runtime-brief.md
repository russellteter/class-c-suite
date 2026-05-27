# Ch.2 Runtime — SafeWrite Implementation Brief

## Your role

Runtime engineer for Ch.2 (SafeWrite + git + chokidar). Implements against `docs/decisions/0003-ch2-safewrite.md`. DOCTRINE law #7 — don't write tests (parallel Test dispatch).

## Required reads

1. `docs/decisions/0003-ch2-safewrite.md` — your authoritative spec.
2. `docs/decisions/0002-ch1-process-architecture.md` §1, §4, §7 — main+utility process model + SQLite proxy + heartbeat IPC.
3. `docs/decisions/0001-ch0-foundations.md` §2, §3 — vault-schemas, IPC types.
4. `packages/shared-types/src/ipc.ts` (post Ch.1 Runtime — may have 22 variants by now).
5. `apps/main/src/` + `apps/utility/src/` (post Ch.1 Runtime).

## Deliverables (per ADR-0003 sections)

### Section 1 — SafeWrite primitive

Implement in `apps/utility/src/safewrite/index.ts`:
- `safeWrite(absPath, newContent, opts): Promise<SafeWriteResult>` per ADR §1.
- Per-path serialization via `Map<string, Promise<void>>` with `.catch(() => {}).then(fn)` rejection-safe form.
- Use Node `fs.promises` for read/write/rename. Use crypto `sha256` for hashes.

### Section 2 — Zone policy

Implement in `apps/utility/src/safewrite/zonePolicy.ts`:
- Export `zonePolicy: Record<ArtifactZone, { hashCheck: boolean; commitVault: boolean }>` per ADR §2.
- Map from `zoneFor(absPath)` (already in shared-types) → policy lookup.

### Section 3 — Sidecar conflict

Implement in same SafeWrite module:
- Sidecar path: `<absPath>.proposed-<isoStamp>.md` where isoStamp = `YYYY-MM-DDTHHMMSS-mmm`.
- Emit `IpcMessage<'safewrite.conflict'>` via the utility's MessagePort to main.

### Section 4 — git commit

In `apps/utility/src/safewrite/git.ts`:
- Use `simple-git` (pinned per Ch.0).
- Commit message format: `c-suite: <agent> wrote <relPath> during <playbook> run <runId>`.
- Pre-flight: throw `VaultNotInitializedError` if vault `git log` returns nothing. Error message must cite `scripts/vault-bootstrap.sh`.
- For G-6 UNKNOWN (simple-git commit field): inspect `node_modules/simple-git/typings/CommitResult.d.ts` (or whatever the actual file is) at implementation time and use the actual field name.

### Section 5 — chokidar watch

In `apps/main/src/vaultWatcher/index.ts` (chokidar runs in main, NOT utility):
- Watch root from env-var `VAULT_PATH` or `app.getPath('userData')/vault` fallback (Russell sets in setup).
- Ignored: `**/.git/**`, `**/.DS_Store`, `**/*.tmp-*`, `**/*.proposed-*`.
- `awaitWriteFinish: { stabilityThreshold: 500 }`.
- Debounce: 1s per file.
- On `change`: parse frontmatter via `parseArtifact` from shared-types. Emit `IpcMessage<'vault.changed'>` to renderer.

### Section 6 — Pre-flight check integration

Extend `scripts/preflight.sh` (Ch.0 already added some checks):
- Vault has-≥1-commit check (B22). Print FAIL with hint to run `scripts/vault-bootstrap.sh`.
- The runtime ALSO does this check at startup (via the SafeWrite pre-flight in §4).

### Section 7 — Fill the gaps Ch.2 architect surfaced (G-1, G-2)

These were missing from Ch.1 ADR; Ch.2 Runtime owns:

**G-1 — Add `vault.init.error` IPC variant.** In `packages/shared-types/src/ipc.ts`:
```typescript
z.object({ kind: z.literal('vault.init.error'), payload: z.object({
  vaultPath: z.string(),
  hint: z.string(), // "Run scripts/vault-bootstrap.sh"
}) })
```
Bump variant count (now 23). Update `ipc.spec.ts` to add a test case (coordinate with Test dispatch — they may already be adding this).

**G-2 — Add `conflicts` SQLite migration.** Create `db/migrations/002_conflicts.sql`:
```sql
CREATE TABLE IF NOT EXISTS conflicts (
  conflict_id TEXT PRIMARY KEY,
  run_id TEXT REFERENCES runs(run_id),
  vault_path TEXT NOT NULL,
  sidecar_path TEXT NOT NULL,
  pre_hash TEXT NOT NULL,
  re_read_hash TEXT NOT NULL,
  detected_at INTEGER NOT NULL,
  resolved_at INTEGER,
  resolution TEXT  -- 'merged' | 'discarded' | 'pending'
);
CREATE INDEX IF NOT EXISTS idx_conflicts_path ON conflicts(vault_path);
```
SafeWrite inserts on every conflict; UI resolves via `resolveConflict(conflictId, resolution)` IPC handler (Ch.5+ wires UI).

### Section 8 — Acceptance (per ADR §8) + verify

Run after every commit:
- `pnpm -r run typecheck` — all packages PASS.
- `pnpm build:packages` — emit dist/.
- `pnpm run test:unit` — Ch.0 + Ch.1 tests still PASS.
- The Ch.2 fuzz test in tests/fuzz/ (Test dispatch ships this) — concurrent-write fuzz PASS, zero data loss.

## Commit discipline

Atomic per ADR section:
1. `ch2: SafeWrite primitive + zone policy (ADR §1-2)`
2. `ch2: sidecar conflict + IPC vault.conflict (ADR §3)`
3. `ch2: git commit semantics + VaultNotInitializedError (ADR §4)`
4. `ch2: chokidar vault watcher in main (ADR §5)`
5. `ch2: preflight.sh vault-has-commits check (ADR §6)`
6. `ch2: IPC vault.init.error variant + conflicts migration (Ch.1 gaps G-1/G-2)`

Each auto-pushes.

## Return

Under 500 words: files created/modified, commit SHAs, spec ambiguity resolved (G-6 simple-git field name etc.), `tail -5 .git/auto-push.log`.

## Out of scope

- Tests (parallel Test).
- Agent definitions (Ch.3).
- Verifier (Ch.4).
- UI (Ch.5).
