# Data, Persistence, and Vault Safety

> Zod schemas. SafeWrite. SQLite runtime store. IPC types. Write-back engine. Implementation contract for Chapters 0-3 + 6. Marks `🔍 R0/R1/R2 VERIFY:` where Phase R must confirm against on-disk truth.

## Vault as single source of truth

The vault lives at `/Users/russellteter/Documents/Claude/Projects/Business Planning/` (Russell's Mac). The C-Suite reads and writes the **same files** Obsidian opens. There is no cached mirror, no parallel state. The vault is canonical.

The vault is its own git repo (separate from this code repo). Every C-Suite write triggers a git commit:

```
c-suite: <agent-role> wrote <relative-path> during <playbook> run <run_id>
```

Russell's manual edits in Obsidian commit separately with his own messages. `git log` is the institutional change history.

🔍 R0 VERIFY: confirm the vault is git-initialized. If not, Ch.0 setup initializes it before Ch.2 SafeWrite ships.

🔍 R0 VERIFY: confirm vault is in a non-iCloud-synced location (BLOCKERS B9). If iCloud-synced, Ch.11 setup runbook documents the move.

## Vault artifact zones

Each subdirectory of the vault is one of three zones with different SafeWrite rules:

| Zone | Path examples | Concurrent-edit risk | SafeWrite rule |
|---|---|---|---|
| **Shared zone** | `positions/`, `decisions/`, `workstreams/`, `stakeholders/`, `pre-mortems/` | High — Obsidian + Cowork + C-Suite edit | Full read → sha256 → re-hash → atomic write → sidecar on conflict |
| **Agent-exclusive zone** | `investigations/`, `deliverables/`, `memos/`, `handoffs/`, `predictions/` | Low — only C-Suite writes; humans read | Atomic write only (skip hash-check) |
| **Read-only zone** | `Strategic_AI_*.md`, `turnaround_operating_library.md`, `SESSION_START_PROTOCOL.md`, etc. | None — fixed reference docs | C-Suite never writes |

🔍 R0 VERIFY: the actual zone mapping against what's currently in the vault. Update this table.

## Zod schemas — vault artifacts

These schemas are the **runtime contract.** They must match byte-for-byte the on-disk reality discovered in Phase R R0. The schemas below are starting points derived from the operating-model docs and ultraplan; Phase R replaces with verified shapes.

### Position

```typescript
import { z } from 'zod';

export const PositionFrontmatter = z.object({
  type: z.literal('position'),
  id: z.string(),                                 // e.g. "POS-2026-014"
  title: z.string(),
  confidence: z.number().int().min(0).max(100),
  status: z.enum(['active', 'superseded', 'retired']),
  created: z.string(),                            // YYYY-MM-DD
  last_retested: z.string().optional(),
  evidence: z.array(z.object({
    source_id: z.string(),
    excerpt: z.string().optional(),
    retrieved_at: z.string().optional(),
  })),
  supersedes: z.string().optional(),              // id of prior position
  superseded_by: z.string().optional(),
  correction_log: z.array(z.object({
    date: z.string(),
    change: z.string(),
    rationale: z.string(),
  })).optional(),                                  // ultraplan R0 finding
  linked_positions: z.array(z.string()).optional(), // additive per B13
  predictions_spawned: z.array(z.string()).optional(),
});
```

🔍 R0 VERIFY: every `positions/*.md` file's frontmatter parses against this schema. Update schema to match reality, not aspiration.

### Decision

```typescript
export const DecisionFrontmatter = z.object({
  type: z.literal('decision'),
  id: z.string(),                                 // snake_case per ultraplan R0
  title: z.string(),
  status: z.enum(['active', 'resolved', 'reversed', 'superseded']),
  decided_on: z.string(),                          // YYYY-MM-DD
  reversibility: z.enum(['low', 'medium', 'high']),
  tripwires: z.array(z.object({
    description: z.string(),
    threshold: z.string(),
    triggers_review: z.boolean(),
  })),
  rationale: z.string(),                           // body or summary
  linked_positions: z.array(z.string()).optional(),
  resolved_outcome: z.string().optional(),         // populated when status='resolved'
  executed_by: z.string().optional(),              // path to Cowork handoff or output (Ch.9)
});
```

### Workstream

```typescript
export const WorkstreamFrontmatter = z.object({
  type: z.literal('workstream'),
  id: z.string(),                                 // e.g. "WS-08"
  title: z.string(),
  status: z.enum(['GREEN', 'YELLOW', 'RED']),
  amount_usd: z.string(),                          // FREE TEXT per ultraplan B12 — DO NOT change shape
  dependencies: z.array(z.string()).optional(),
  milestones: z.array(z.object({
    description: z.string(),
    target_date: z.string(),
    status: z.enum(['pending', 'in_progress', 'done', 'slipped']),
  })).optional(),
});
// Runtime mirrors free-text amount → integer cents in SQLite (see schema below).
```

### Stakeholder

```typescript
export const StakeholderFrontmatter = z.object({
  type: z.literal('stakeholder'),
  id: z.string(),
  name: z.string(),
  role: z.string(),
  decision_rights: z.array(z.string()).optional(),
  hot_buttons: z.array(z.string()).optional(),
  what_not_to_say: z.array(z.string()).optional(),
  last_activity: z.string().optional(),           // YYYY-MM-DD
  // Per ultraplan R0: stakeholder frontmatter is lean; many fields optional.
});
```

🔍 R0 VERIFY: every stakeholder file's actual frontmatter. Mark required vs optional based on real corpus.

### Pre-mortem

```typescript
export const PreMortemFrontmatter = z.object({
  type: z.literal('pre-mortem'),
  id: z.string(),
  scenario: z.string(),
  probability: z.number().int().min(0).max(100),
  impact: z.enum(['catastrophic', 'severe', 'significant', 'recoverable']),
  early_warning_signals: z.array(z.string()),
  mitigation: z.array(z.string()),
  response_playbook: z.string().optional(),
});
```

### Prediction (calibration tracking)

```typescript
export const PredictionFrontmatter = z.object({
  type: z.literal('prediction'),
  id: z.string(),
  claim: z.string(),
  confidence: z.number().int().min(0).max(100),
  made_on: z.string(),
  resolves_by: z.string(),
  resolved: z.boolean().default(false),
  outcome: z.enum(['correct', 'incorrect', 'partial', 'unresolved']).optional(),
  brier_contribution: z.number().optional(),       // computed at resolution
  source_run_id: z.string().optional(),
});
```

### Memo

Memos live in `memos/<date>-<playbook>-<slug>.md`. Their frontmatter:

```typescript
export const MemoFrontmatter = z.object({
  type: z.literal('memo'),
  run_id: z.string(),
  playbook: z.string(),
  question: z.string(),
  created: z.string(),
  rigor_score: z.number().int().min(0).max(100),
  rigor_threshold: z.number().int(),               // 70 / 80 / 85 per playbook
  status: z.enum(['clean', 'draft', 'quick_read', 'ad_hoc']),
  failure_reasons: z.array(z.string()).optional(), // populated if DRAFT
  citations: z.array(z.object({
    claim_id: z.string(),
    source_id: z.string(),
    call_id: z.string(),                            // join key to tool_calls table
  })),
  proposed_writebacks: z.array(z.object({
    artifact_type: z.string(),
    draft_path: z.string(),
  })).optional(),
  handoff_path: z.string().optional(),             // populated if Cowork brief was generated
});
```

### Handoff brief

```typescript
export const HandoffFrontmatter = z.object({
  type: z.literal('handoff'),
  id: z.string(),
  decision_id: z.string(),                          // back-link to originating decision
  memo_id: z.string().optional(),                   // or to originating memo
  created: z.string(),
  cowork_brand_skills: z.array(z.string()),         // e.g. ['class-brand-presentations']
  status: z.enum(['drafted', 'sent', 'executed']),
});
```

🔍 R0 VERIFY: schema completeness against every artifact-type in the vault. Add missing schemas (skills file frontmatter? deliverables frontmatter?).

## SafeWrite

The core safety primitive. Implemented as a utility in the utility process. Applies to shared-zone writes; agent-exclusive zones use the atomic-only fast path.

```typescript
async function safeWrite(
  absPath: string,
  newContent: string,
  opts: { agent: AgentRole; runId: string; playbook: PlaybookId; commitVault: boolean }
): Promise<SafeWriteResult> {
  // 1. Acquire per-path lock (serialize writes to same path within process)
  return withFileLock(absPath, async () => {

    // 2. Pre-write read + hash (shared-zone only; agent-exclusive zones skip)
    const zone = zoneFor(absPath);
    let preHash: string | null = null;
    if (zone === 'shared') {
      const current = await fs.readFile(absPath, 'utf8').catch(() => '');
      preHash = sha256(current);
    }

    // 3. Write to temp file in the same directory
    const tempPath = `${absPath}.tmp-${process.pid}-${Date.now()}`;
    await fs.writeFile(tempPath, newContent, 'utf8');

    // 4. Re-read + re-hash (shared-zone only) — detect interleaving edit
    if (zone === 'shared' && preHash !== null) {
      const reReadHash = sha256(await fs.readFile(absPath, 'utf8').catch(() => ''));
      if (reReadHash !== preHash) {
        // 5a. Conflict: write sidecar instead, do NOT touch the actual file
        const sidecar = `${absPath}.proposed-${isoStamp()}.md`;
        await fs.rename(tempPath, sidecar);
        emit('safewrite.conflict', { path: absPath, sidecarPath: sidecar });
        return { result: 'conflict', sidecarPath: sidecar };
      }
    }

    // 5b. No conflict: atomic rename temp → target
    await fs.rename(tempPath, absPath);

    // 6. Git commit (vault git repo, separate from code repo)
    if (opts.commitVault) {
      const relPath = pathRelativeToVault(absPath);
      await gitInVault(['add', relPath]);
      await gitInVault(['commit', '-m',
        `c-suite: ${opts.agent} wrote ${relPath} during ${opts.playbook} run ${opts.runId}`,
        '--no-verify'  // vault may not have hooks; ours auto-pushes the CODE repo only
      ]);
    }
    return { result: 'ok' };
  });
}
```

**Fuzz test (Ch.2 acceptance):** N concurrent writers (simulating Obsidian save + Cowork write + C-Suite write) against the same file path. Expected: zero data loss; one sidecar per conflict; the "winner" of the atomic-rename race writes the file content cleanly; no partial files.

**[R0-Vault + R2 verified 2026-05-26]** Vault is NOT iCloud-synced (`xattr -p com.apple.fileprovider.fpfs#P` returns no such xattr). macOS Sequoia 15.x APFS atomic rename works. B9 clear. Preflight refuses to start if vault is detected inside any sync container (iCloud, Dropbox, Google Drive — R2 Area 4 noted Dropbox/Drive detection gap; Ch.0 preflight extends beyond iCloud).

## chokidar watch

The main process runs chokidar over the vault to detect external edits (Russell + Obsidian + Cowork). Debounced 500ms.

```typescript
const watcher = chokidar.watch(vaultPath, {
  ignored: ['**/.git/**', '**/.DS_Store', '**/*.tmp-*', '**/*.proposed-*'],
  persistent: true,
  awaitWriteFinish: { stabilityThreshold: 500 },
});
watcher.on('change', async (path) => {
  // Re-index frontmatter of changed file; emit to UI for any open viewer.
  const updated = await reIndex(path);
  send('vault.changed', updated);
});
```

## SQLite runtime store

SQLite holds **runtime metadata only** — runs, audit trail, cost ledger, write-back drafts, structured mirrors for autonomy. It is **not** a mirror of the vault content. Vault is canonical for artifacts; SQLite is canonical for runs.

```sql
-- Versioned, idempotent migrations under db/migrations/

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER NOT NULL,
  applied_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS runs (
  run_id TEXT PRIMARY KEY,
  playbook TEXT NOT NULL,
  question TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  current_state TEXT NOT NULL,            -- 'bootstrap' | 'plan-approval' | ... | 'shipped'
  plan_json TEXT,                          -- approved RunPlan
  finished_at INTEGER,
  rigor_score INTEGER,
  rigor_threshold INTEGER,
  status TEXT,                             -- 'in_progress' | 'shipped_clean' | 'shipped_draft' | 'failed' | 'cancelled'
  memo_path TEXT                           -- absolute path once written
);

CREATE TABLE IF NOT EXISTS agent_invocations (
  invocation_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(run_id),
  agent_role TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  structured_output_json TEXT,
  tokens_in INTEGER, tokens_out INTEGER,
  reasoning_tokens INTEGER,
  model TEXT,
  status TEXT                              -- 'in_progress' | 'completed' | 'failed' | 'cancelled'
);

CREATE TABLE IF NOT EXISTS tool_calls (
  call_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(run_id),
  invocation_id TEXT NOT NULL REFERENCES agent_invocations(invocation_id),
  agent_role TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  args_json TEXT NOT NULL,
  result_json TEXT,                        -- FULL result, not summary
  source_id TEXT,
  called_at INTEGER NOT NULL,
  duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_tool_calls_run ON tool_calls(run_id);
CREATE INDEX IF NOT EXISTS idx_tool_calls_call ON tool_calls(call_id);

CREATE TABLE IF NOT EXISTS writebacks (
  writeback_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(run_id),
  artifact_type TEXT NOT NULL,             -- 'position' | 'decision' | 'prediction' | ...
  draft_path TEXT NOT NULL,                -- '.proposed-…' sidecar location
  committed_path TEXT,                     -- final path once accepted
  proposed_at INTEGER NOT NULL,
  decided_at INTEGER,
  status TEXT,                             -- 'proposed' | 'accepted' | 'edited' | 'rejected' | 'iterating'
  iteration_count INTEGER DEFAULT 0,
  iteration_history_json TEXT              -- conversation thread of feedback rounds
);

CREATE TABLE IF NOT EXISTS jobs (
  job_id TEXT PRIMARY KEY,
  job_name TEXT NOT NULL,                  -- 'monday-tripwire' | 'sunday-renewal' | ...
  cron_expr TEXT NOT NULL,
  last_fired_at INTEGER,
  last_finished_at INTEGER,
  last_status TEXT,                        -- 'success' | 'failed' | 'degraded'
  catch_up_pending INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workstream_amounts_mirror (
  -- B12 mitigation: structured mirror of free-text workstream amount_usd
  workstream_id TEXT PRIMARY KEY,
  amount_cents INTEGER,                    -- integer cents; null if unparseable
  raw_text TEXT NOT NULL,
  parse_status TEXT NOT NULL,              -- 'ok' | 'ambiguous' | 'tbd'
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS calibration_window (
  -- Cached calibration metrics for the rigor formula freshness component
  computed_at INTEGER NOT NULL,
  total_predictions INTEGER NOT NULL,
  resolved_predictions INTEGER NOT NULL,
  brier_score REAL,
  stale_count INTEGER                      -- predictions past resolves_by without outcome
);

CREATE TABLE IF NOT EXISTS cost_ledger (
  entry_id TEXT PRIMARY KEY,
  run_id TEXT REFERENCES runs(run_id),
  job_id TEXT REFERENCES jobs(job_id),
  agent_role TEXT,
  model TEXT,
  tokens_in INTEGER, tokens_out INTEGER,
  cost_usd REAL,                            -- nullable: B5 may force token-only mode
  recorded_at INTEGER NOT NULL
);
```

Migrations live in `db/migrations/NNN_<name>.sql`. Versioned; idempotent (`CREATE TABLE IF NOT EXISTS` etc.). On startup, the migration runner advances `schema_version` and applies pending migrations under a transaction.

🔍 R0 VERIFY: any pre-existing SQLite at `c-suite/runtime.db` or similar paths. If yes, decide migration strategy.

## Write-back engine (Ch.6)

After the Verifier ships a memo (clean OR DRAFT), the orchestrator runs the write-back drafter:

```typescript
async function draftWritebacks(runId: string, memo: Memo): Promise<Writeback[]> {
  const drafts: Writeback[] = [];

  // Each artifact type has its own drafter.
  drafts.push(...await draftProposedPositions(memo));
  drafts.push(...await draftProposedDecisions(memo));
  drafts.push(...await draftProposedPredictions(memo));
  drafts.push(...await draftPreMortemUpdates(memo));
  drafts.push(...await draftStakeholderUpdates(memo));
  drafts.push(...await draftWorkstreamAdvances(memo));

  // Persist each as a sidecar: <vault>/<zone>/<id>.proposed-<runId>.md
  for (const d of drafts) {
    await writeAtomicNonShared(d.draftPath, d.markdown);
    await db.run('INSERT INTO writebacks (...) VALUES (...)', d);
    emit('writeback.proposed', d);
  }

  return drafts;
}
```

**Iterative feedback (PRD §5 locked; Phase R decision #3 default N=3):**

```typescript
async function iterateOnWriteback(
  writebackId: string,
  russellFeedback: string
): Promise<Writeback> {
  const wb = await db.get('SELECT * FROM writebacks WHERE writeback_id = ?', writebackId);
  if (wb.iteration_count >= 3) {
    throw new IterationCapReached({ writebackId, surfaceChoice: ['commit', 'reject', 'escalate-full-rerun'] });
  }
  const originalRun = await db.get('SELECT * FROM runs WHERE run_id = ?', wb.run_id);
  const originalBundle = await db.get('SELECT plan_json FROM runs WHERE run_id = ?', wb.run_id);

  // Identify which lens(es) produced contested claims in this artifact.
  const contestedLenses = identifyContestedLenses(wb, russellFeedback);

  // Re-run only those lenses with original context bundle + feedback + prior draft.
  const newOutputs = await dispatchLenses(contestedLenses, {
    ...originalBundle,
    feedback: russellFeedback,           // source_id: 'russell_feedback_<ts>'
    priorDraft: wb.markdown,
  });

  // Synthesizer re-drafts; Verifier re-gates.
  const newDraft = await synthesize(originalRun, newOutputs);
  const verified = await verify(newDraft);

  await db.run(`UPDATE writebacks SET draft_path = ?, iteration_count = iteration_count + 1,
                  iteration_history_json = ? WHERE writeback_id = ?`,
                newDraft.path, appendIteration(wb.iteration_history_json, russellFeedback, newDraft),
                writebackId);

  emit('writeback.proposed', { ...wb, ...newDraft });
  return newDraft;
}
```

**Acceptance flips proposed → active:**

```typescript
async function acceptWriteback(writebackId: string): Promise<void> {
  const wb = await db.get('SELECT * FROM writebacks WHERE writeback_id = ?', writebackId);
  const finalPath = resolveActivePath(wb);   // strips .proposed-<runId> suffix
  const content = await fs.readFile(wb.draftPath, 'utf8');
  await safeWrite(finalPath, content, {
    agent: 'Synthesizer',
    runId: wb.run_id,
    playbook: <from-run>,
    commitVault: true,
  });
  await fs.unlink(wb.draftPath);
  await db.run(`UPDATE writebacks SET committed_path = ?, decided_at = ?, status = 'accepted'
                WHERE writeback_id = ?`, finalPath, Date.now(), writebackId);
  emit('writeback.committed', { runId: wb.run_id, artifactPath: finalPath });
}
```

## IPC type definitions (the discriminated union)

The full IPC schema with Zod validators (excerpt — runtime.md gave the high-level shape):

```typescript
import { z } from 'zod';

export const IpcMessage = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('run.start'), payload: z.object({
    runId: z.string(), playbook: z.string(), question: z.string(),
  })}),
  z.object({ kind: z.literal('run.plan.ready'), payload: z.object({
    runId: z.string(), planJson: z.string(), autoApproveAfterMs: z.number().nullable(),
  })}),
  // ... (all variants from runtime.md)
  z.object({ kind: z.literal('safewrite.conflict'), payload: z.object({
    path: z.string(), sidecarPath: z.string(),
  })}),
  z.object({ kind: z.literal('cost.usage'), payload: z.object({
    runId: z.string().optional(),
    jobId: z.string().optional(),
    tokensIn: z.number(), tokensOut: z.number(),
    windowRemainingTokens: z.number(),
    windowResetsAt: z.number(),
  })}),
]);

export type IpcMessage = z.infer<typeof IpcMessage>;
```

Receivers (main, utility, renderer) validate incoming messages with `IpcMessage.parse()` — invalid messages throw and log.

## Audit-trail durability (B16)

Per BLOCKERS B16: the audit trail contains sensitive SF/NS excerpts in `tool_calls.result_json`. Keep this **in SQLite (local-only)**, not in the vault git repo (which Russell may push to a private GitHub remote for off-Mac backup).

Optional: a "vault audit export" command Russell can invoke that copies redacted excerpts into the vault — gated by Russell, not automatic.

## Open items for Phase R

| Item | Sub-phase | Reference |
|---|---|---|
| Every artifact-type frontmatter schema verified against on-disk reality | R0 | This file's Zod schemas |
| Vault iCloud-sync attribute check | R0 | B9 |
| Vault git repo initialization status | R0 | Vault SOT |
| Pre-existing SQLite or alternative store | R0 | Runtime store init |
| chokidar behavior on macOS Sequoia 15.x + iCloud-synced (if applicable) | R2 | Watcher reliability — R2 verified no issues for non-iCloud vault |
| `rename(2)` atomicity under macOS + iCloud + Time Machine | R2 | SafeWrite assumption |
| stakeholder lean-frontmatter vs design-doc-claim divergence | R0 | StakeholderFrontmatter schema |
| `amount_usd` actual format distribution in workstreams | R0 | B12 parser design |
