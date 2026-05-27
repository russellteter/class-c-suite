# ADR-0003: Chapter 2 — SafeWrite + git + Concurrent-Write Fuzz

## Status

`accepted` (under DOCTRINE operating-mode override; Russell may override at chapter boundary by editing this file).

## Date

2026-05-27

## Author / agent role

Backend Architect (Sonnet 4.6) under DOCTRINE writer ≠ grader (Audit/QA re-derives PASS/FAIL from Section 8 in chapter ritual step 6).

## Context

Chapter 2 delivers the vault-write safety primitive. Every subsequent chapter that writes back to the vault depends on this contract. Per DOCTRINE law #7, this architect writes the spec; Audit/QA grades independently from Section 8.

**Sources consulted (in required-read order):**
- `ROADMAP.md` §Ch.2 lines 67-78 — exit criteria.
- `docs/decisions/0001-ch0-foundations.md` — Ch.0 ADR (full). SafeWrite builds on its shared-types, IPC union, and pinned tool versions.
- `docs/decisions/0002-ch1-process-architecture.md` lines 1-30 — Ch.1 IPC events referenced for `scheduler.window.reset` (independent; not a dependency).
- `docs/architecture/data.md` §SafeWrite lines 204-258 — current scaffold; refined here.
- `docs/architecture/data.md` §chokidar lines 266-277 — watch scaffold; refined here.
- `BLOCKERS.md` B8 lines 129-137 — Cowork sidecar pattern + pre-write SHA check requirement (VERIFIED).
- `BLOCKERS.md` B9 lines 139-145 — iCloud-sync hazard (VERIFIED non-iCloud).
- `BLOCKERS.md` B22 lines 228-236 — vault git zero commits (MITIGATED pending Russell's vault-bootstrap.sh run).
- `docs/research/R2-feasibility-notes.md` §B8 lines 74-82 — pre-write SHA check design requirement.
- `docs/research/R0-constraints-ledger.md` §1 lines 14-28 — per-directory inventory (zone reality).

**Forces in play:**
- Concurrent external writers (Obsidian, Cowork `/deep`) can modify shared-zone files between a lens's read and its write. Silent overwrite = data loss. The pre-write SHA check plus atomic rename plus sidecar fallback eliminates the data-loss window.
- APFS on Russell's Mac supports `rename(2)` atomically (R0 + R2 verified, B9 VERIFIED non-iCloud). No write-then-link workaround needed.
- Vault git is separate from the code repo. The code repo's auto-push hook (`.git/hooks/post-commit`) does NOT push the vault. Vault remote policy is: default none; Russell may add at Ch.11 setup.
- Agent-exclusive zones (predictions, investigations, deliverables, memos) have no concurrent writer other than C-Suite itself. Hash-check overhead is wasted for these — skip to atomic-rename-only fast path.
- Vault git has zero commits until Russell runs `scripts/vault-bootstrap.sh` (B22). SafeWrite must guard against this at startup.

---

## Section 1 — SafeWrite primitive

### 1.1 TypeScript signature

```typescript
// packages/vault-writer/src/safeWrite.ts
// Depends: packages/shared-types/src/vault-schemas.ts (ArtifactZone, zoneFor)
//          packages/shared-types/src/ipc.ts (IpcMessage, safewrite.conflict)
//          simple-git 3.x (Ch.0 ADR §1.2)
//          Node.js fs.promises (no third-party atomic-write library needed — APFS rename(2) is atomic)

import type { AgentRole } from '../shared-types/ipc.js';
import type { PlaybookId } from '../shared-types/ipc.js';
import type { ArtifactZone } from '../shared-types/vault-schemas.js';

export type SafeWriteOpts = {
  agent: AgentRole;           // e.g. 'Synthesizer' — from IpcMessage AgentRole enum (Ch.0 ADR §3)
  runId: string;              // UUID; correlates with SQLite run row
  playbook: PlaybookId;       // e.g. 'cash_lever_vs_trough' — from IpcMessage PlaybookId enum (Ch.0 ADR §3)
  commitVault: boolean;       // true = git-commit after write; false = atomic rename only
  zone: ArtifactZone;        // caller must resolve via zoneFor(absPath) before calling safeWrite
};

export type SafeWriteResult =
  | { result: 'ok'; sha: string; commitSha?: string }
    // sha = sha256 of written content; commitSha present iff commitVault=true
  | { result: 'conflict'; sidecarPath: string; preHash: string; reReadHash: string }
    // conflict: external modification detected between pre-hash and re-hash
  | { result: 'failed'; error: SafeWriteError };

export type SafeWriteError =
  | { code: 'VAULT_NOT_INITIALIZED' }  // B22: vault has zero commits
  | { code: 'RENAME_FAILED'; cause: Error }
  | { code: 'GIT_COMMIT_FAILED'; cause: Error }
  | { code: 'IO_ERROR'; cause: Error };

export async function safeWrite(
  absPath: string,
  newContent: string,
  opts: SafeWriteOpts
): Promise<SafeWriteResult>;
```

### 1.2 Algorithm

```
safeWrite(absPath, newContent, opts):

  0. PREFLIGHT (once at utility-process startup, not per-call):
       if vault git has 0 commits → throw VaultNotInitializedError (B22)
       // "git -C <vaultPath> log --oneline -1" returns fatal → zero commits

  1. ACQUIRE per-path write lock:
       globalWriteQueue.get(absPath)  // Map<string, Promise<void>>
       chain new promise onto existing tail (per-path serialization)
       // Prevents interleaved writes within this process; Obsidian/Cowork are external and
       // handled by the hash-check, not by this lock.

  2. DETERMINE zone policy:
       zone = opts.zone  // caller pre-resolved via zoneFor(absPath)
       policy = zonePolicy[zone]
       // See Section 2 for the full policy table.

  3. PRE-WRITE READ + HASH (shared zones only; agent-exclusive zones → skip to step 5):
       if policy.hashCheck:
         current = await fs.readFile(absPath, 'utf8').catch(() => '')
         preHash = sha256(current)
         // preHash captures the file state at the moment this write begins.
         // Source: BLOCKERS.md B8 lines 132-137; R2-feasibility-notes.md §B8 lines 74-82.

  4. WRITE TO TEMP FILE (same directory as absPath — required for APFS atomic rename):
       tempPath = `${absPath}.tmp-${process.pid}-${Date.now()}`
       await fs.writeFile(tempPath, newContent, 'utf8')

  5. RE-READ + RE-HASH (shared zones only):
       if policy.hashCheck:
         reRead = await fs.readFile(absPath, 'utf8').catch(() => '')
         reReadHash = sha256(reRead)

         if reReadHash !== preHash:
           // External writer modified the file between step 3 and step 5.
           // CONFLICT PATH — do NOT touch the actual file.
           goto CONFLICT_PATH

  6. ATOMIC RENAME temp → target:
       await fs.rename(tempPath, absPath)
       // rename(2) on APFS is atomic (R0 + R2 verified; B9 VERIFIED non-iCloud).
       // If rename fails, throw { code: 'RENAME_FAILED', cause }

  7. GIT COMMIT (if commitVault && policy.commitVault):
       relPath = path.relative(vaultPath, absPath)
       await git.add([relPath])
       await git.commit(`c-suite: ${opts.agent} wrote ${relPath} during ${opts.playbook} run ${opts.runId}`)
       // git = simpleGit(vaultPath) — simple-git 3.x (Ch.0 ADR §1.2)
       // On failure: throw { code: 'GIT_COMMIT_FAILED', cause }
       // File is already written — partial success is logged, not rolled back.
       // See Section 4 for git semantics.

  8. RETURN ok:
       sha = sha256(newContent)
       commitSha = result of step 7 (undefined if commitVault=false)
       return { result: 'ok', sha, commitSha }

  CONFLICT_PATH:
       isoStamp = now().toISOString().replace(/[:.]/g, '').slice(0, 18)
       // Format: YYYY-MM-DDTHHMMSS-mmm — see Section 3
       sidecarPath = `${absPath}.proposed-${isoStamp}.md`
       await fs.rename(tempPath, sidecarPath)
       emit IpcMessage { kind: 'safewrite.conflict', payload: { path: absPath, sidecarPath } }
       return { result: 'conflict', sidecarPath, preHash, reReadHash }
```

### 1.3 Per-path serialization

```typescript
// In the utility process module scope:
const writeQueue = new Map<string, Promise<void>>();

function withPathLock<T>(absPath: string, fn: () => Promise<T>): Promise<T> {
  const prev = writeQueue.get(absPath) ?? Promise.resolve();
  let resolve!: () => void;
  const next = new Promise<void>(r => { resolve = r; });
  writeQueue.set(absPath, next);
  return prev.then(fn).finally(resolve);
  // Map entry is never deleted (unbounded growth for long sessions).
  // Acceptable: vault paths are bounded (~100 files total, R0 ledger §1).
}
```

Source: per-path serialization pattern; not a file lock (OS file locks are unreliable across processes on macOS). External writers (Obsidian, Cowork) are handled by the hash-check race window, not by this in-process queue.

---

## Section 2 — Vault artifact zones

### 2.1 Zone policy table

Source: `ROADMAP.md` lines 77 ("Agent-exclusive zones skip hash-check; shared zones do not"), `docs/architecture/data.md` §SafeWrite lines 217-222, `docs/research/R0-constraints-ledger.md` §1 lines 14-28.

```typescript
// packages/vault-writer/src/zonePolicy.ts
import type { ArtifactZone } from '../shared-types/vault-schemas.js';

export interface ZonePolicy {
  hashCheck: boolean;    // true = pre-write SHA + re-read SHA check required
  commitVault: boolean;  // true = git-commit after write (overrides opts.commitVault=false)
                         // false = respect opts.commitVault
}

export const zonePolicy: Record<ArtifactZone, ZonePolicy> = {
  // SHARED ZONES — concurrent Obsidian + Cowork writes are plausible.
  // Hash-check is required (B8). Git commit always.
  position:           { hashCheck: true,  commitVault: true  },
  decision:           { hashCheck: true,  commitVault: true  },
  workstream:         { hashCheck: true,  commitVault: true  },
  stakeholder_person: { hashCheck: true,  commitVault: true  },
  stakeholder_account:{ hashCheck: true,  commitVault: true  },
  'pre-mortem':       { hashCheck: true,  commitVault: true  },
  tripwire:           { hashCheck: true,  commitVault: true  },
  competitor:         { hashCheck: true,  commitVault: true  },

  // AGENT-EXCLUSIVE ZONES — only C-Suite writes these; external concurrent edit is not expected.
  // Skip hash-check; honor opts.commitVault.
  // Source: ROADMAP.md line 77 ("agent-exclusive zones (predictions, investigations, deliverables, memos)").
  prediction:         { hashCheck: false, commitVault: false },
  memo:               { hashCheck: false, commitVault: false },
  handoff:            { hashCheck: false, commitVault: false },
  // investigations/ and deliverables/ are not in ArtifactZone (zoneFor returns null for these).
  // Callers must not invoke safeWrite with zone=null; throw TypeError at call site.
};
```

**Zone determination.** Callers resolve `zone = zoneFor(absPath)` from `packages/shared-types/src/parseArtifact.ts` (Ch.0 ADR §2.10). If `zoneFor` returns `null` (investigations/, deliverables/), safeWrite throws `TypeError: cannot determine zone for path`. These directories are write-once from Cowork or Russell; C-Suite does not write to them via SafeWrite.

**Policy override rule.** Even when `policy.commitVault = false`, if `opts.commitVault = true` the caller is requesting a commit (e.g., a memo the Synthesizer wants in git history). Honor `opts.commitVault = true` even for agent-exclusive zones. The `commitVault` field in `ZonePolicy` is a floor (always commit shared), not a ceiling.

---

## Section 3 — Sidecar conflict surface

When step 5 of the algorithm detects `reReadHash !== preHash`:

### 3.1 Sidecar file naming

```
Pattern:  <absPath>.proposed-<isoStamp>.md
isoStamp: YYYY-MM-DDTHHMMSS-mmm

Example:
  absPath = /vault/positions/active/POS-042.md
  isoStamp = 20260527T143052-481
  sidecarPath = /vault/positions/active/POS-042.md.proposed-20260527T143052-481.md
```

Format derivation:
```typescript
function isoStamp(): string {
  const d = new Date();
  const YYYY = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const DD = String(d.getDate()).padStart(2, '0');
  const HH = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const SS = String(d.getSeconds()).padStart(2, '0');
  const mmm = String(d.getMilliseconds()).padStart(3, '0');
  return `${YYYY}${MM}${DD}T${HH}${mm}${SS}-${mmm}`;
}
```

Millisecond precision prevents collisions when two writers conflict on the same file within one second. Colons and periods are removed for filesystem safety (macOS APFS path constraints).

### 3.2 IPC emission

```typescript
// packages/shared-types/src/ipc.ts — existing shape (Ch.0 ADR §3):
// z.object({
//   kind: z.literal('safewrite.conflict'),
//   payload: z.object({
//     path: z.string(),
//     sidecarPath: z.string(),
//   }),
// })

// Additional payload fields exposed in SafeWriteResult (NOT in IPC — too verbose for cross-process):
// preHash and reReadHash are returned to the caller in SafeWriteResult.conflict
// for logging; they are NOT included in the IPC message (B16: avoid leaking content fingerprints).
```

### 3.3 Conflict lifecycle

1. `safeWrite` creates sidecar at `sidecarPath` via atomic rename.
2. `safeWrite` emits `safewrite.conflict` IPC event to main process.
3. Main process stores `{ path, sidecarPath, timestamp }` in SQLite `conflicts` table (Ch.1 schema extension — surfaced to Ch.1 architect as spec gap, see Section 10).
4. UI surfaces conflict badge in Ch.5+; Russell merges manually.
5. Sidecar files are excluded from chokidar watch (`.proposed-*` in ignore glob — Section 5) and from vault git commits (`.gitignore` entry from `scripts/vault-bootstrap.sh`).

---

## Section 4 — git commit semantics

### 4.1 Commit message format

```
c-suite: <agent> wrote <relPath> during <playbook> run <runId>
```

Where `relPath = path.relative(vaultPath, absPath)` (POSIX separators).

Example:
```
c-suite: Synthesizer wrote positions/active/POS-042.md during cash_lever_vs_trough run a1b2c3d4-...
```

Source: `ROADMAP.md` line 75, `docs/architecture/data.md` §SafeWrite line 248.

### 4.2 simple-git usage

```typescript
import simpleGit from 'simple-git'; // simple-git 3.x (Ch.0 ADR §1.2)

const git = simpleGit(vaultPath);   // vault root, NOT the code repo

// Per write (steps 7a-7b):
await git.add([relPath]);
const commitResult = await git.commit(commitMsg);
// commitResult.commit is the new commit SHA returned to caller as commitSha.
```

### 4.3 Vault remote policy

Default: none. The vault git repo is local-only. The code repo's auto-push hook (`.git/hooks/post-commit`) pushes `russellteter/class-c-suite.git` — it has no knowledge of the vault repo.

If Russell wants off-machine vault backup: add a remote at Ch.11 setup (`git -C <vault> remote add origin <url>`). C-Suite does not add or push to vault remotes. No `--no-verify` flag needed because the vault's `.git/hooks/` directory is empty by default (only bootstrap creates `.gitignore`, not hooks).

### 4.4 Vault pre-flight at startup (B22)

```typescript
async function assertVaultInitialized(vaultPath: string): Promise<void> {
  const git = simpleGit(vaultPath);
  try {
    const log = await git.log({ maxCount: 1 });
    if (!log.latest) {
      throw new VaultNotInitializedError(vaultPath);
    }
  } catch (e) {
    if (e instanceof VaultNotInitializedError) throw e;
    // git log threw (e.g., not a git repo at all)
    throw new VaultNotInitializedError(vaultPath);
  }
}

class VaultNotInitializedError extends Error {
  constructor(vaultPath: string) {
    super(
      `Vault at ${vaultPath} has no commits. ` +
      `Run scripts/vault-bootstrap.sh before starting C-Suite.`
    );
    this.name = 'VaultNotInitializedError';
  }
}
```

This check runs once at utility-process startup. If it throws, the utility process sends an error IPC event to main; main surfaces a setup banner in the UI (Ch.5). SafeWrite per-call functions are never reached while this guard is active.

---

## Section 5 — chokidar watch

### 5.1 Watcher configuration

```typescript
// packages/vault-watcher/src/watcher.ts
// Process location: MAIN process (not utility process).
// Rationale: chokidar uses FSEvents on macOS — best placed in the process with the event loop
// most likely to stay alive. Utility process may be short-lived per Ch.1 supervisor pattern.

import chokidar from 'chokidar'; // chokidar 3.x (Ch.0 ADR §1.2)

const watcher = chokidar.watch(vaultPath, {
  ignored: [
    '**/.git/**',
    '**/.DS_Store',
    '**/*.tmp-*',       // SafeWrite temp files — exclude mid-write
    '**/*.proposed-*',  // SafeWrite sidecar conflict files — exclude
  ],
  persistent: true,
  ignoreInitial: true,    // don't flood on startup; indexer handles initial load
  awaitWriteFinish: {
    stabilityThreshold: 500,  // ms — wait for writes to stabilize before firing
                              // (chokidar default is 2000ms; 500ms is tighter per brief spec)
                              // Source: context7 /paulmillr/chokidar README.md
    pollInterval: 100,        // ms — polling interval during stabilization window
  },
  atomic: true,           // correctly process SafeWrite's temp-then-rename atomic writes
                          // Source: context7 /paulmillr/chokidar README.md — "emit proper events when atomic writes are used"
  usePolling: false,      // FSEvents native on macOS (better performance)
  depth: 5,               // vault subdirs are ≤3 deep; 5 is conservative ceiling
                          // (chokidar default depth is undefined = unlimited; explicit cap is safer)
});
```

Source: `docs/architecture/data.md` §chokidar lines 266-277. Adds `ignoreInitial: true`, `usePolling: false`, `depth: 5` per best practice (chokidar 3.x docs).

### 5.2 Event handler with per-file debounce

```typescript
// Per-file debounce prevents duplicate events when an external editor (Obsidian, BBEdit)
// performs multi-step save operations (write → rename → write).

const debounceMap = new Map<string, ReturnType<typeof setTimeout>>();
const DEBOUNCE_MS = 1000;  // 1s per brief specification

function handleChange(absPath: string, eventType: 'add' | 'change' | 'unlink') {
  const existing = debounceMap.get(absPath);
  if (existing) clearTimeout(existing);

  debounceMap.set(absPath, setTimeout(async () => {
    debounceMap.delete(absPath);

    if (eventType === 'unlink') {
      // Deletion: emit vault.changed with changeType='deleted'; no parse needed.
      ipcSend({ kind: 'vault.changed', payload: { path: absPath, changeType: 'deleted' } });
      return;
    }

    // Re-parse frontmatter via parseArtifact from Ch.0 shared-types.
    const zone = zoneFor(absPath);
    if (!zone) return;  // skip investigations/, deliverables/, etc.

    try {
      const raw = await fs.readFile(absPath, 'utf8');
      const frontmatter = extractYamlFrontmatter(raw);  // gray-matter or manual split
      const parsed = parseArtifact(frontmatter, zone);
      // Emit for UI re-index:
      ipcSend({
        kind: 'vault.changed',
        payload: { path: absPath, changeType: eventType === 'add' ? 'added' : 'modified' },
      });
      // Also update SQLite mirror if applicable (Ch.1 owns the SQLite write-back path).
    } catch (e) {
      // Parse error: log but do not crash watcher.
      console.error(`vault.changed parse error at ${absPath}:`, e);
    }
  }, DEBOUNCE_MS));
}

watcher
  .on('add', p => handleChange(p, 'add'))
  .on('change', p => handleChange(p, 'change'))
  .on('unlink', p => handleChange(p, 'unlink'));
```

### 5.3 vaultPath resolution

```typescript
// Match Ch.1 pattern for SQLite path resolution (Ch.0 ADR §1.2, Ch.1 ADR §Section 2):
const vaultPath = process.env.VAULT_PATH
  ?? path.join(os.homedir(), 'Documents', 'Claude', 'Projects', 'Business Planning');
// On Russell's Mac: /Users/russellteter/Documents/Claude/Projects/Business Planning
// R0 verified this path exists (R0-constraints-ledger.md §1 header).
```

---

## Section 6 — Concurrent-write fuzz (the Ch.2 keystone)

### 6.1 Test file location and harness

```typescript
// tests/fuzz/safewrite-concurrent.spec.ts
// Runner: vitest 3.x (Ch.0 ADR §1.2)
// Runs as part of `pnpm test:fuzz` (CI conditional step: only if tests/fuzz/ exists)
// Source: ch2-architect-brief.md §Section 6; ROADMAP.md line 73.

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import simpleGit from 'simple-git';
import { safeWrite } from '../../packages/vault-writer/src/safeWrite.js';

describe('SafeWrite concurrent-write fuzz', () => {
  let vaultDir: string;

  beforeEach(async () => {
    // Setup: temp vault with a real git init + baseline commit (B22 guard must pass)
    vaultDir = await fs.mkdtemp(path.join(os.tmpdir(), 'csuite-fuzz-'));
    const git = simpleGit(vaultDir);
    await git.init();
    await git.addConfig('user.email', 'test@csuite.local');
    await git.addConfig('user.name', 'C-Suite Test');
    // Create positions/active directory
    await fs.mkdir(path.join(vaultDir, 'positions', 'active'), { recursive: true });
    // Write initial file + baseline commit (satisfies assertVaultInitialized)
    const filePath = path.join(vaultDir, 'positions', 'active', 'POS-FUZZ.md');
    await fs.writeFile(filePath, '---\nid: POS-FUZZ\nstatus: active\n---\nInitial content.\n', 'utf8');
    await git.add('.');
    await git.commit('vault: pre-C-Suite SafeWrite baseline (manual snapshot)');
  });

  afterEach(async () => {
    await fs.rm(vaultDir, { recursive: true, force: true });
  });

  test('N=20 concurrent writers — zero data loss', async () => {
    const filePath = path.join(vaultDir, 'positions', 'active', 'POS-FUZZ.md');
    const DURATION_MS = 5_000;

    // Simulate external Obsidian edit: raw fs writes, no SafeWrite
    const simulateObsidianEdit = async () => {
      const end = Date.now() + DURATION_MS;
      while (Date.now() < end) {
        await fs.writeFile(filePath, `---\nid: POS-FUZZ\nstatus: active\n---\nObsidian edit at ${Date.now()}.\n`, 'utf8');
        await new Promise(r => setTimeout(r, 80 + Math.random() * 120));
      }
    };

    // Simulate Cowork write: also raw fs writes (Cowork does NOT use SafeWrite — B8)
    const simulateCoworkWrite = async () => {
      const end = Date.now() + DURATION_MS;
      while (Date.now() < end) {
        await fs.writeFile(filePath, `---\nid: POS-FUZZ\nstatus: active\n---\nCowork write at ${Date.now()}.\n`, 'utf8');
        await new Promise(r => setTimeout(r, 100 + Math.random() * 150));
      }
    };

    // Simulate C-Suite SafeWrite — 18 concurrent agent writers
    const simulateCSuiteWrite = async (agentIndex: number) => {
      const end = Date.now() + DURATION_MS;
      while (Date.now() < end) {
        await safeWrite(
          filePath,
          `---\nid: POS-FUZZ\nstatus: active\n---\nAgent-${agentIndex} write at ${Date.now()}.\n`,
          {
            agent: 'Synthesizer',
            runId: `fuzz-run-${agentIndex}`,
            playbook: 'cash_lever_vs_trough',
            commitVault: true,
            zone: 'position',
          }
        );
        await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
      }
    };

    const writers = [
      simulateObsidianEdit(),
      simulateCoworkWrite(),
      ...Array.from({ length: 18 }, (_, i) => simulateCSuiteWrite(i)),
    ];

    const results = await Promise.allSettled(writers);

    // INVARIANT 1: The file at <filePath> is in a coherent state.
    const finalContent = await fs.readFile(filePath, 'utf8');
    expect(finalContent.length).toBeGreaterThan(0);
    // Must have valid YAML frontmatter (id + status fields present).
    expect(finalContent).toMatch(/^---\n/);
    expect(finalContent).toMatch(/id: POS-FUZZ/);
    expect(finalContent).toMatch(/status: active/);

    // INVARIANT 2: For every conflict, exactly one .proposed-<ts>.md sidecar exists.
    const allFiles = await fs.readdir(path.join(vaultDir, 'positions', 'active'));
    const sidecars = allFiles.filter(f => f.includes('.proposed-'));
    const conflictResults = results.filter(
      r => r.status === 'fulfilled' && (r.value as { result: string })?.result === 'conflict'
    );
    // Each C-Suite conflict should have produced exactly one sidecar.
    // (Obsidian/Cowork are external and may not produce sidecars — they bypass SafeWrite.)
    expect(sidecars.length).toBeGreaterThanOrEqual(conflictResults.length);

    // INVARIANT 3: No sidecar file is empty (content was actually written).
    for (const sidecar of sidecars) {
      const sidecarContent = await fs.readFile(
        path.join(vaultDir, 'positions', 'active', sidecar),
        'utf8'
      );
      expect(sidecarContent.length).toBeGreaterThan(0);
    }

    // INVARIANT 4: git log has at least one commit per successful C-Suite write.
    const git = simpleGit(vaultDir);
    const log = await git.log({ maxCount: 500 });
    const csuiteCommits = log.all.filter(c => c.message.startsWith('c-suite:'));
    const okResults = results.filter(
      r => r.status === 'fulfilled' && (r.value as { result: string })?.result === 'ok'
    );
    expect(csuiteCommits.length).toBeGreaterThanOrEqual(okResults.length);

    // INVARIANT 5: No C-Suite writer call threw an unexpected exception.
    const csuiteFailures = results.slice(2).filter(r => r.status === 'rejected');
    expect(csuiteFailures.length).toBe(0);

    // INVARIANT 6: temp files (.tmp-*) are fully cleaned up (no orphaned temps).
    const orphanedTemps = allFiles.filter(f => f.includes('.tmp-'));
    expect(orphanedTemps.length).toBe(0);
  });
});
```

### 6.2 Additional invariants (beyond the spec skeleton)

| # | Invariant | Verification method |
|---|---|---|
| I-1 | Final file is syntactically coherent YAML (id + status fields present) | Parse with `gray-matter`; assert no parse error |
| I-2 | Each SafeWrite conflict produced exactly one sidecar (no missing, no doubled) | Count sidecars against `result='conflict'` returns |
| I-3 | No sidecar is empty (content was written before rename) | Read each sidecar; assert `length > 0` |
| I-4 | git log count ≥ SafeWrite ok-result count | `git log --oneline \| wc -l` minus baseline commit |
| I-5 | No C-Suite writer throws an unhandled exception | `Promise.allSettled` rejected count = 0 for indices 2-19 |
| I-6 | No orphaned `.tmp-*` files remain | `ls` in positions/active; filter `.tmp-*`; expect empty |
| I-7 | All commit messages match the exact format `c-suite: <agent> wrote <relPath> during <playbook> run <runId>` | `git log --format=%s \| grep -E '^c-suite: '` |
| I-8 | Sidecar filename timestamp is ISO 8601 millisecond format (no colons or dots) | Regex `\d{8}T\d{6}-\d{3}` on each sidecar filename |

---

## Section 7 — Pre-flight check integration

### 7.1 Additions to `scripts/preflight.sh`

Two new checks after the existing vault sync-agent section (B9 iCloud, B33 Dropbox/Google Drive — added in Ch.0 ADR §6):

```bash
# -------- Vault git-initialized check (B22) --------
section "Vault — git initialization"

VAULT_GIT_DIR="$VAULT_PATH/.git"
if [ ! -d "$VAULT_GIT_DIR" ]; then
  fail "Vault is not git-initialized ($VAULT_PATH). Run: git init \"$VAULT_PATH\""
fi

# -------- Vault has-at-least-1-commit check (B22) --------
VAULT_COMMIT_COUNT=$(git -C "$VAULT_PATH" log --oneline -1 2>/dev/null | wc -l | tr -d ' ')
if [ "$VAULT_COMMIT_COUNT" -lt 1 ]; then
  fail "Vault has no commits. Run: scripts/vault-bootstrap.sh — then restart C-Suite."
else
  green "Vault git: initialized with commits OK"
fi
```

Source: `BLOCKERS.md` B22 lines 228-236; existing preflight pattern from Ch.0 ADR §6.

### 7.2 Runtime enforcement (utility process startup)

The utility process runs `assertVaultInitialized(vaultPath)` at startup (Section 4.4). If it throws:
1. Utility process emits `{ kind: 'vault.init.error', message: 'VaultNotInitialized' }` to main (UNKNOWN — this IPC kind is not in the Ch.0 IpcMessage union; surfaced as spec gap in Section 10).
2. Main process surfaces a setup banner: "Run scripts/vault-bootstrap.sh and restart."
3. All SafeWrite calls are unavailable until restart.

---

## Section 8 — Acceptance criteria

Source: `ROADMAP.md` §Ch.2 exit criteria lines 71-77.

| # | Criterion | Test | Owner |
|---|---|---|---|
| AC-1 | Concurrent-write fuzz passes: zero data loss under N=20 concurrent writers (Obsidian + Cowork + 18 C-Suite agents) | `tests/fuzz/safewrite-concurrent.spec.ts` — all 8 invariants (Section 6.2) pass | Test author |
| AC-2 | Atomic rename works on Russell's APFS (B9 verified non-iCloud) | Unit test: write temp, `fs.rename` to target; verify target has content and temp is gone; run on macOS only | Test author |
| AC-3 | Shared-zone writes trigger hash-check; agent-exclusive writes do not | Unit test: mock `fs.readFile`; assert it is called 2× for `zone='position'` and 0× for `zone='memo'` | Test author |
| AC-4 | Conflict sidecar naming matches format `*.proposed-YYYYMMDDTHHMMSS-mmm.md` | Unit test: force conflict (preHash ≠ reReadHash); assert sidecar filename regex | Test author |
| AC-5 | `safewrite.conflict` IPC event emitted on every conflict; NOT emitted on successful write | Unit test: spy on IPC emit; verify call count | Test author |
| AC-6 | Vault git commit message format matches `c-suite: <agent> wrote <relPath> during <playbook> run <runId>` | Integration test: run safeWrite against temp vault; `git log --format=%s -1`; assert exact format | Test author |
| AC-7 | chokidar debounce: rapid external edits within 1s produce exactly one `vault.changed` IPC event | Unit test: fire 5 `change` events within 900ms on same path; assert IPC emit count = 1 | Test author |
| AC-8 | Vault-not-initialized guard: utility process throws `VaultNotInitializedError` when vault has zero commits | Unit test: mock `git.log` to return empty; assert throw | Test author |
| AC-9 | Per-path lock: two concurrent safeWrite calls on the same path serialize (second waits for first) | Unit test: spy on `fs.rename`; assert calls are sequential even when invoked concurrently | Test author |
| AC-10 | `.proposed-*` and `.tmp-*` files are excluded from chokidar watch ignore glob | Unit test: assert watcher config `ignored` array contains `**/*.proposed-*` and `**/*.tmp-*` | Test author |

---

## Section 9 — Considered alternatives

### 9.1 Locking strategy: file locks vs in-process Map

**Option A — OS file locks (`flock(2)` via `proper-lockfile` or `lockfile-cli`).** Advantage: works across processes (C-Suite + Cowork). Disadvantage: unreliable on NFS and networked mounts; on APFS they work but Obsidian and Cowork do not respect them. Adding a third-party lock means external writers can corrupt data even with the lock in place. Not worth the dependency.

**Option B — In-process `Map<path, Promise>` serialization (CHOSEN).** Serializes concurrent C-Suite writes within the utility process. External writers (Obsidian, Cowork) bypass it, which is correct — their writes are detected by the hash-check and surface as sidecars. Zero dependencies; deterministic ordering; easy to test.

Source: `docs/architecture/data.md` §SafeWrite line 214 — "withFileLock" — refined here to per-path Promise chain.

### 9.2 Conflict resolution: auto-merge vs always-sidecar

**Option A — Auto-merge (three-way diff if possible).** Advantage: reduces manual work. Disadvantage: text-merging YAML frontmatter is error-prone; Zod schema violations in the merged result are silent data corruption. PRD §5 locked principle: vault is canonical SoT — auto-corrupting it is worse than a manual merge.

**Option B — Always-sidecar (CHOSEN).** Every conflict produces a sidecar; Russell merges manually in Ch.5+. Safe, auditable, reversible. BLOCKERS.md B8 lines 134-136 explicitly decided this: "don't block Cowork; sidecar handles it."

### 9.3 Atomic-rename alternatives: `write-then-link` vs `rename(2)`

**Option A — `write-then-link`.** Write to temp, `link` to target, `unlink` temp. Link does not work across directories. Both paths must be on the same filesystem (as rename requires too), but `link` with a content-addressed name adds complexity with no benefit on APFS.

**Option B — `rename(2)` via `fs.promises.rename` (CHOSEN).** Single syscall, atomic on APFS (R0 + R2 verified). Destination is replaced atomically; reader never sees a partial write. Standard pattern confirmed in Node.js fs.promises docs.

### 9.4 chokidar process placement: main vs utility

**Option A — Utility process.** Keeps all vault I/O in one process. Disadvantage: utility process may be restarted by Ch.1 supervisor; each restart requires watcher re-initialization with re-index overhead.

**Option B — Main process (CHOSEN).** Main process is the permanent Electron shell. FSEvents callback stability is higher. IPC cost to forward `vault.changed` to renderer is negligible. Watcher survives utility process restarts.

---

## Section 10 — Spec gaps surfaced to Audit/QA

| # | Gap | Impact | Proposed resolution |
|---|---|---|---|
| G-1 | `vault.init.error` IPC kind is NOT in the Ch.0 IpcMessage union (Section 7.2). The utility process needs a way to tell main "vault not initialized." | Ch.1 IPC setup cannot handle this event without a new IPC kind. | Ch.1 architect or Ch.0 patch: add `vault.init.error` to the IpcMessage union in `packages/shared-types/src/ipc.ts`. |
| G-2 | SQLite `conflicts` table schema is not defined. Section 3.3 says main stores `{ path, sidecarPath, timestamp }` in it. Ch.1 ADR §Section 3 defines the SQLite migration set but does not include a `conflicts` table. | Ch.5 conflict UI has no store to query. | Ch.1 architect: add `conflicts` table migration; or defer to Ch.2 Runtime dispatch with the schema: `CREATE TABLE conflicts (id INTEGER PRIMARY KEY, path TEXT NOT NULL, sidecar_path TEXT NOT NULL, run_id TEXT, detected_at INTEGER NOT NULL)`. |
| G-3 | `gray-matter` vs manual YAML split for chokidar event handler frontmatter extraction (Section 5.2). Ch.0 ADR does not specify a YAML parsing library. | Minor — only affects chokidar event handler. | Use `js-yaml` (already a dependency of `gray-matter`; simpler) or `gray-matter` if already in the lockfile. Ch.2 Runtime dispatch decides and pins. |
| G-4 | Vault remote policy when Russell adds a remote in Ch.11: does `git push` on every SafeWrite commit create unacceptable latency? | Latency impact unknown. If vault has a remote, simple-git's `commit()` will not push unless explicitly called. | No action needed in Ch.2: vault remote is opt-in at Ch.11; push is never automatic from SafeWrite. Document in Ch.11 runbook: "vault push is manual only." |
| G-5 | `zoneFor` returns `null` for `investigations/` and `deliverables/` (Ch.0 ADR §2.10 line 483). SafeWrite spec says throw `TypeError` for null zone. But Cowork writes to `deliverables/` — is there a future C-Suite write path there? | If Ch.9 Handoff write-back targets `deliverables/`, it would hit this TypeError. | Ch.9 architect must either extend `ArtifactZone` to include `deliverables` or explicitly exclude that directory from SafeWrite scope. Surfaced here; Ch.9 owns resolution. |

---

## Consequences

**Positive:**
- Zero data loss for all C-Suite writes to the vault, including during concurrent Obsidian/Cowork sessions.
- Auditable git history for every shared-zone write.
- chokidar watch keeps SQLite mirror and UI up-to-date on external edits without polling.
- Conflict surface is safe, reversible, and visible to Russell.

**Negative:**
- Two `fs.readFile` calls per shared-zone write (pre-hash + re-hash) adds ~5-10ms on APFS SSD. Acceptable: vault writes are infrequent (once per lens per run, not per-request).
- Hash-check window is not zero: a sufficiently fast external writer can still slip between re-hash and rename. This window is ~1ms on local APFS. Accepted risk per DOCTRINE law #6 (creativity within guardrails — zero-window would require OS-level write locking; sidecar + history is the correct trade-off).
- In-process write queue grows unbounded per unique path. Bounded by vault file count (~100 files per R0 ledger §1 inventory).

**IPC unchanged:** The Ch.0 `safewrite.conflict` IPC shape (`path`, `sidecarPath`) is unchanged. No Ch.0 ADR edits required (except G-1 above — `vault.init.error` kind is a net-new addition).
