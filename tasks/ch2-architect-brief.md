# Ch.2 Architect — SPEC Brief (SafeWrite + git)

## Your role

You are the Architect for C-Suite Chapter 2 (SafeWrite + git + concurrent-write fuzz). You operate under DOCTRINE (10 non-negotiable laws). You write SPEC + ADR only.

**Parallel-with-Ch.1 dispatch:** A Ch.1 Architect is running concurrently. You and Ch.1 are independent at the SPEC level — your spec depends only on Ch.0 (vault-schemas, shared types). Do NOT consume Ch.1's ADR. If Ch.1 introduces an IPC event your SafeWrite implementation needs, surface it; the orchestrator will reconcile during INTEGRATE step. The IpcMessage discriminated union from Ch.0 already includes `safewrite.conflict` — use that.

## Required reads (in order)

1. `ROADMAP.md` §Ch.2 (lines ~68-78) — chapter exit criteria.
2. `docs/decisions/0001-ch0-foundations.md` — Ch.0 ADR (shared types, vault-schemas, IPC types). Your spec builds on this.
3. `docs/architecture/data.md` §SafeWrite (lines ~206-258) — current scaffold; refine.
4. `docs/architecture/data.md` §chokidar watch (lines ~266-277).
5. `BLOCKERS.md` B8 (Cowork bypasses SafeWrite — VERIFIED 2026-05-26 sidecar pattern is sufficient), B9 (iCloud — VERIFIED non-iCloud), B22 (vault git zero commits — MITIGATED pending Russell run vault-bootstrap.sh).
6. `docs/research/R2-feasibility-notes.md` §B8 — pre-write SHA check requirement (existing spec has it; verify code matches).
7. `docs/research/R0-constraints-ledger.md` §1 (per-directory inventory) + §5 (git + iCloud verification) for vault zones reality.

## Deliverables

Produce ONE ADR at `docs/decisions/0003-ch2-safewrite.md`. Sections:

### Section 1 — SafeWrite primitive (read → sha256 → work → re-hash → atomic rename → git-commit)

Concrete TypeScript signature + algorithm:

```typescript
type SafeWriteOpts = {
  agent: AgentRole;            // e.g. 'Synthesizer'
  runId: string;
  playbook: PlaybookId;
  commitVault: boolean;        // true for memo/decision/position; false for pure-runtime artifacts
  zone: ArtifactZone;          // determines hash-check vs atomic-only path
};

type SafeWriteResult =
  | { result: 'ok'; sha: string; commitSha?: string }
  | { result: 'conflict'; sidecarPath: string; preHash: string; reReadHash: string }
  | { result: 'failed'; error: SafeWriteError };

async function safeWrite(
  absPath: string,
  newContent: string,
  opts: SafeWriteOpts
): Promise<SafeWriteResult>;
```

Specify the full algorithm with citations to R2 verification of B8 (pre-write SHA check required). Per-path serialization via `Map<path, Promise<void>>` chains.

### Section 2 — Vault artifact zones (shared vs agent-exclusive)

Codify the zone table from `docs/architecture/data.md` §Vault artifact zones. Each zone has:
- **Path patterns** matching `zoneFor()` from Ch.0 shared-types.
- **Hash-check policy:** required for shared zones, skip for agent-exclusive.
- **git-commit policy:** always commit shared-zone writes; commit agent-exclusive writes only when policy says yes.

Provide explicit `zonePolicy: Record<ArtifactZone, { hashCheck: boolean; commitVault: boolean }>` map.

### Section 3 — Sidecar conflict surface

When pre-hash ≠ re-read-hash:
- Write content to `<absPath>.proposed-<isoStamp>.md` instead of `<absPath>`.
- Emit `IpcMessage<'safewrite.conflict'>` with both paths.
- Do NOT touch the actual file.
- Russell merges manually via UI (Ch.5+).

Specify the IsoStamp format (`YYYY-MM-DDTHHMMSS-mmm`, ISO 8601 with millisecond precision).

### Section 4 — git commit semantics

Per `docs/architecture/data.md` §SafeWrite §6:
- Use `simple-git` (pinned per Ch.0 ADR §1.2).
- Commit message format: `c-suite: <agent> wrote <relPath> during <playbook> run <runId>`.
- Vault repo is separate from code repo. The CODE repo's auto-push hook does NOT push the vault. Document vault remote policy (default: none; Russell adds a remote at Ch.11 setup if he wants off-machine backup).
- Pre-flight check at SafeWrite startup: vault has ≥1 commit (B22). If zero, throw `VaultNotInitializedError` directing Russell to `scripts/vault-bootstrap.sh`.

### Section 5 — chokidar watch

Specify:
- Watch root: `vaultPath` (env-resolved via `app.getPath` or env-var per Ch.1 SQLite-path pattern).
- Ignored: `**/.git/**`, `**/.DS_Store`, `**/*.tmp-*`, `**/*.proposed-*`.
- `awaitWriteFinish: { stabilityThreshold: 500ms }`.
- Event handler: re-parse frontmatter via `parseArtifact()` from Ch.0 shared-types; emit `vault.changed` IPC event.
- Debounce per-file: 1s to avoid duplicate events when external editor saves multiple times.

### Section 6 — Concurrent-write fuzz (the Ch.2 keystone)

The acceptance test. Specify the test design:

```typescript
// tests/fuzz/safewrite-concurrent.spec.ts
test('SafeWrite under N=20 concurrent writers — zero data loss', async () => {
  const vault = setupTempVault();
  const path = `${vault}/positions/active/POS-FUZZ.md`;
  await writeInitial(path, '---\nid: POS-FUZZ\nstatus: active\n---\n');

  const writers = [
    simulateObsidianEdit(path, 5_000),   // 5000ms of edits
    simulateCoworkWrite(path, 5_000),    // 5000ms of writes (no SafeWrite)
    ...range(18).map(i => simulateCSuiteWrite(path, `agent-${i}`, 5_000)),
  ];

  const results = await Promise.allSettled(writers);

  // INVARIANTS:
  // 1. The file at <path> is in a coherent state (valid YAML frontmatter, full content).
  // 2. For every conflict, exactly one .proposed-<ts>.md sidecar exists.
  // 3. No content from any writer was silently dropped.
  // 4. git log has one commit per successful C-Suite write.
});
```

Specify additional invariants. The fuzz test is the chapter-close blocker — it must pass.

### Section 7 — Pre-flight check integration

Update `scripts/preflight.sh` to add:
- Vault git-initialized check (already present from Ch.0).
- Vault has-at-least-1-commit check (B22).
- Vault is not under any sync agent (already added Ch.0).

The runtime ALSO does this check at startup. If vault is in a bad state, the utility process refuses to start; main surfaces a setup banner.

### Section 8 — Acceptance criteria (8-10 rows)

Map each ROADMAP §Ch.2 exit criterion to a test. Format `| # | Criterion | Test | Owner |`.

Must include:
- Concurrent-write fuzz PASS (zero data loss; one sidecar per conflict).
- Atomic rename works on Russell's APFS (R2 verified non-iCloud).
- Shared-zone vs agent-exclusive zone policy enforced.
- chokidar debounce works without losing real edits.
- Vault git commit format matches spec.

### Section 9 — Considered alternatives

E.g., locking primitives (file locks vs in-process Map), conflict resolution strategies (auto-merge vs always-sidecar), atomic-rename alternatives (write-then-link).

### Section 10 — Spec gaps surfaced to Audit/QA

Anything you couldn't fully nail down (e.g., vault remote default behavior — none vs prompt-Russell-at-Ch.11).

## Discipline

- SPEC only. No production code.
- Cite Ch.0 ADR + data.md line ranges.
- Resilience pattern: write the ADR file scaffold early (Write tool creates it; you can Edit to fill sections). If your dispatch crashes, the scaffold survives.
- After writing, return structured summary (<500 words): ADR path, SafeWrite signature, zone policy table, fuzz test design highlights, acceptance criteria list.
- Opus 4.7 — architecture justifies Opus.

## Out of scope

- Vault writes (Russell runs vault-bootstrap.sh manually at Ch.2 prep).
- IPC framework (Ch.1).
- Lens / agent definitions (Ch.3).
- UI (Ch.5).
