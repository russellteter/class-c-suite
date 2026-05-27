# ADR-0008 — Write-backs + Iterative Feedback (Ch.6)

**Status:** Accepted
**Date:** 2026-05-27
**Owner:** /goal Phase 2 — Ch.6 architect
**Builds on:** ADR-0004 (Ch.3 runtime spine), ADR-0006 (Ch.5 first slice), ADR-0007 (committed-pipeline), data.md, runtime.md, prompts.md, ui.md
**Closes:** ROADMAP.md §Ch.6 acceptance criteria; PRD §5 principles 8–9; PRD §6 "Auto-draft write-backs + iterative feedback."
**Reopens / verifies:** B22 (vault commits — preflight confirms green; close at Ch.6 boundary).

---

## 1. Problem

After a memo ships (clean OR draft), Russell needs the system to do the compounding-loop work: surface what should update in the institutional library. PRD §6:

> "Verifier identifies new positions/decisions/predictions/pre-mortem updates/stakeholder updates/workstream advances derivable from each shipped memo. Each surfaces in review pane with diff against any existing artifact. Accept flips proposed → active via SafeWrite + git commit. Edit opens the markdown directly for hand-editing. Reject captures rationale to archived-proposals log. Typed feedback re-runs only the contested lens with original context + feedback + prior draft; Verifier re-gates. N=3 iteration cap surfaces 'commit, reject, or escalate to full re-run.' Iteration history persists as a thread on the artifact (revision log)."

Today (post-Ch.5): the orchestrator transitions `shipped-clean → write-back-proposed → review` per `state-machine.ts`; `WritebackDraftSchema` (`packages/shared-types/src/writeback.ts`) is a 4-field stub; the SQLite `writebacks` table from `data.md` is not yet migrated; no review-pane UI exists; the per-writeback typed-feedback loop has no engine.

## 2. Decision

Ship Ch.6 as five bound contracts: (a) writeback authorship rule, (b) sidecar storage convention, (c) per-writeback iteration semantics distinct from run-level iteration, (d) schema conforming verbatim to the existing vault Bases-queryable frontmatter, (e) typed feedback re-running only the contested lens(es) with original context + feedback + prior draft.

### 2.1 Authorship — Synthesizer proposes; engine drafts; Verifier may gate but never authors

**Lock.** The Synthesizer authors the "proposed write-backs" section of its structured output (already specified in `apps/utility/src/prompts/Synthesizer.prompt.md` lines 15–17). The write-back engine consumes that list and renders sidecar files. The Verifier remains structurally blind to lens reasoning traces per the B3 keystone — it grades the memo + the proposed writebacks' citation discipline against the audit trail, but it never authors proposals.

**Why this matters.** The /goal directive's wording — "Verifier identifies new positions/..." — is inherited from a brief that pre-dates the B3 fix. Authoring proposals from inside the Verifier would re-introduce reasoning-trace coupling and silently break the AC-2 lens-isolation invariant. ADR-0008 reads `Synthesizer authors → engine renders → Verifier grades` as canonical.

### 2.2 Sidecar storage — `.draft-<runId>.md` (collision-free with SafeWrite conflict sidecars)

**Lock.** Proposed writebacks land at: `<vault>/<zone>/<artifact-id>.draft-<runId>.md`.

**Why `.draft` not `.proposed`.** `packages/vault-writer/src/safeWrite.ts:226` already uses `.proposed-<ISO>.md` for SafeWrite hash-mismatch conflict sidecars. Two different concepts under the same filename suffix is a hazard: a future operator (Russell, an automation script, an Audit pass) cannot tell at-a-glance whether a `.proposed-…` file is a "write-back to review" or a "concurrent-write conflict to merge." `.draft-<runId>.md` distinguishes them deterministically.

**Format.** Same as the active file (markdown with YAML frontmatter). The frontmatter declares `status: proposed`, carries the proposed values, and includes a `proposed_by: { run_id, agent, playbook }` block. The body of the draft mirrors what the active artifact's body would become after acceptance.

**Lifecycle.**
- `proposed` (default at write).
- `accepted` → atomic SafeWrite copies content to active path (stripping `.draft-<runId>` suffix), commits via vault git, deletes draft file.
- `edited` → opens the draft for hand-edit in Obsidian / editor; on save, treated as accepted with the edited content.
- `rejected` → archived to `<vault>/_archived-proposals/<artifact-id>-<runId>-rejected.md` with the rejection rationale prepended.
- `iterating` → engine re-dispatches contested lens; new draft overwrites the existing `.draft-<runId>.md` (one draft per writeback at a time; iteration history persists in SQLite, not in extra sidecars).

**.gitignore implication.** Vault `.gitignore` already excludes `*.proposed-*` (SafeWrite conflict sidecars are local-only). Ch.6 leaves `*.draft-*` UN-ignored — write-back proposals are part of the institutional change history and must commit to vault git when SafeWrite-written. The audit trail benefits from seeing every proposal even if rejected.

### 2.3 Two iteration counters — distinct loops, distinct caps, distinct IPC events

**Lock the distinction.** B38 (shipped) added a **run-level** iteration counter at `RunState.review.iteration` and an IPC event `run.iteration.cap_reached`. Ch.6 adds a **per-writeback** iteration counter at `writebacks.iteration_count` and a new IPC event `writeback.iteration.cap_reached`. Both caps are N=3 by independent decision (Phase R Decision 3 + ADR-0008 below).

**When each fires.**
- **Run-level (`run.iteration.cap_reached`).** Fires when Russell has cycled the entire `review → write-back-proposed → review` loop three times without committing — i.e., he keeps requesting a full re-draft of the memo + all writebacks. The cap forces "commit, reject, or restart the run." Already shipped in `state-machine.ts:260-285`.
- **Per-writeback (`writeback.iteration.cap_reached`).** Fires when Russell has provided typed feedback on **one specific writeback** three times. Each round re-dispatches only the contested lens(es), re-synthesizes, and re-grades. The cap forces "accept this writeback as-is, reject it, or escalate it to a full re-run of the originating run."

**Counters are independent.** Russell may iterate writeback A three times (hits per-writeback cap) while writeback B sits at zero iterations. The run-level counter only advances on full review-cycle restarts.

### 2.4 Schema — verbatim to vault Bases frontmatter; no new fields invented

**Lock.** Every per-artifact-type drafter MUST produce frontmatter that conforms to the schemas documented in `<vault>/VAULT_GUIDE.md` §3. Specifically:

- **kebab-case fields** for `positions/`, `decisions/`, `pre-mortems/`.
- **snake_case fields** for `workstreams/`, `calibration/predictions/`, `adversarial/financial-tripwires/`.
- **`tags:`** must include the structural taxonomy already enforced by `scripts/vault-tag-backfill.ts`: `#type/<type>`, `#status/<status>`, `#confidence/<bucket>`, `#health/<status>`, `#impact/<level>`, `#probability/<bucket>`, `#state/<state>`, `#reversibility/<dir>`, `#phase/<phase>`, `#category/<category>` — whichever apply to the artifact type. Drafters call the same tag-derivation logic from `scripts/vault-tag-backfill.ts` (extract a pure function into `packages/vault-writer/src/deriveTags.ts`) so the tag set never drifts from the backfill script's notion of correctness.
- **`related:`** is the canonical wikilink set. Drafters emit `related:` entries for every cross-referenced artifact, using the full-filename target (no alias in frontmatter). Drafters call the same wikilink-resolution logic from `scripts/vault-wikilink-backfill.ts` (extract into `packages/vault-writer/src/resolveWikilinks.ts`).
- **Typed link fields** per type: e.g., `predictions-spawned: [PRED-NNN, …]` on Position; `linked-positions: [POS-NNN, …]` on Decision; `related-positions: [POS-NNN, …]` on Pre-Mortem; `depends_on: [WS-NN, …]` on Workstream.
- **Body wikilinks** in any prose use the aliased form `[[POS-003-w30-resolves-with-ar-ap-baca|POS-003]]`. Drafters call `scripts/vault-inbody-link-fixup.ts` logic (extract into `packages/vault-writer/src/aliasInBodyIds.ts`) so the prose conforms before SafeWrite.
- **YAML quoting rule.** Any value containing `:`, `—`, `()`, or other YAML-sensitive characters is double-quoted. Drafters use `js-yaml`'s `dump()` with `forceQuotes: false` + a post-check that re-parses the emitted YAML — if parsing fails, the drafter quotes the offending values and re-emits.

**No new schema fields.** If a writeback drafter wants to express something not capturable in the existing schemas, the drafter writes the information into the body of the artifact (rationale prose), not the frontmatter. New frontmatter fields require a schema migration per `VAULT_GUIDE.md` §12 — out of Ch.6 scope.

### 2.5 Typed feedback — contested-lens-only re-dispatch with original context + feedback + prior draft

**Lock.** When Russell submits typed feedback on a specific writeback, `iterateOnWriteback(writebackId, feedbackText)`:

1. Identifies the contested lens(es) from the writeback's `proposed_by.lensesContributing` list + the feedback text (a keyword classifier maps feedback phrases to lenses; default falls back to "all lenses that contributed evidence to this writeback").
2. Re-builds the context bundle for each contested lens: original `ContextBundle` from the originating run + a new `feedback` field (`{ russellFeedback: string, priorDraft: string, source_id: 'russell_feedback_<ts>' }`) + the prior draft of the writeback.
3. Re-dispatches contested lens(es) via the existing `dispatchLens` path — same lens isolation guards apply.
4. Re-runs the Synthesizer with all lens outputs (re-dispatched + non-contested unchanged).
5. Re-runs the Verifier against the re-drafted memo + the writeback subset.
6. Overwrites the `.draft-<runId>.md` sidecar with the new content; appends to `writebacks.iteration_history_json`; increments `iteration_count`; emits `writeback.iteration.completed`.
7. If `iteration_count >= 3` after the increment, the next user-initiated `iterateOnWriteback` call throws `WritebackIterationCapReached` and emits `writeback.iteration.cap_reached`.

**Why contested-lens-only.** Re-running every lens for every feedback round wastes tokens (PRD §6 cost discipline) and risks lens isolation: the non-contested lens outputs are the stable foundation the writeback was derived from, and re-running them invites drift. Contested-only re-dispatch is the cheapest and most-traceable feedback unit.

## 3. Contracts (binding — sub-agents do not infer; pin here)

### 3.1 Zod schemas (deltas to `packages/shared-types/src/writeback.ts`)

```ts
// packages/shared-types/src/writeback.ts
import { z } from 'zod';

export const ArtifactType = z.enum([
  'position',
  'decision',
  'prediction',
  'pre-mortem-update',
  'stakeholder-update',
  'workstream-advance',
]);
export type ArtifactType = z.infer<typeof ArtifactType>;

export const WritebackStatus = z.enum([
  'proposed', 'accepted', 'edited', 'rejected', 'iterating',
]);
export type WritebackStatus = z.infer<typeof WritebackStatus>;

export const ProposedBy = z.object({
  runId: z.string(),
  agent: z.literal('Synthesizer'),         // authorship lock per §2.1
  playbook: z.string(),
  lensesContributing: z.array(z.string()),  // AgentRole names whose evidence backs this writeback
  proposedAt: z.number(),                   // epoch ms
});
export type ProposedBy = z.infer<typeof ProposedBy>;

export const WritebackDraftSchema = z.object({
  writebackId: z.string(),                  // uuid
  runId: z.string(),
  artifactType: ArtifactType,
  artifactId: z.string(),                   // POS-NNN, DEC-NNN, etc.; existing-id if update, next-available if new
  isNew: z.boolean(),                       // true if this would create the artifact; false if it updates an existing one
  draftPath: z.string(),                    // absolute path to <vault>/<zone>/<id>.draft-<runId>.md
  activePath: z.string(),                   // absolute path the writeback would become on accept
  proposedBody: z.string(),                 // full markdown (frontmatter + body) of the proposed file
  proposedFrontmatter: z.record(z.unknown()), // parsed frontmatter object for diff rendering
  diffAgainstActive: z.string().nullable(), // unified diff string vs current active file; null if isNew
  description: z.string(),                   // one-sentence "what this writeback changes"
  proposedBy: ProposedBy,
  status: WritebackStatus,
  iterationCount: z.number().int().min(0),  // per-writeback (§2.3); defaults 0
});
export type WritebackDraft = z.infer<typeof WritebackDraftSchema>;

export const IterationHistoryEntry = z.object({
  iterationNumber: z.number().int().min(1).max(3),
  requestedAt: z.number(),
  russellFeedback: z.string(),
  contestedLenses: z.array(z.string()),
  priorDraftPath: z.string(),                // path to the snapshot taken before this iteration
  newDraftPath: z.string(),                  // the .draft-<runId>.md after this iteration
  verifierScoreBefore: z.number().nullable(),
  verifierScoreAfter: z.number().nullable(),
});
export type IterationHistoryEntry = z.infer<typeof IterationHistoryEntry>;
```

### 3.2 SQLite migration (new file: `db/migrations/005_writebacks.sql`)

Implements the `writebacks` table from `data.md` lines 334-345 with the additive columns Ch.6 needs:

```sql
CREATE TABLE IF NOT EXISTS writebacks (
  writeback_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(run_id),
  artifact_type TEXT NOT NULL,              -- ArtifactType enum (Zod-validated app-side)
  artifact_id TEXT NOT NULL,                -- POS-NNN / DEC-NNN / etc.
  is_new INTEGER NOT NULL,                  -- 1 = new artifact; 0 = update
  draft_path TEXT NOT NULL,                 -- .draft-<runId>.md absolute path
  active_path TEXT NOT NULL,                -- where it lands on accept
  description TEXT NOT NULL,                -- one-sentence summary
  proposed_by_json TEXT NOT NULL,           -- ProposedBy serialized
  proposed_at INTEGER NOT NULL,
  decided_at INTEGER,
  status TEXT NOT NULL DEFAULT 'proposed',  -- WritebackStatus enum
  iteration_count INTEGER NOT NULL DEFAULT 0,
  iteration_history_json TEXT,              -- IterationHistoryEntry[] serialized; null until first iteration
  rejection_rationale TEXT,                 -- populated when status='rejected'
  committed_path TEXT,                      -- populated when status='accepted' (== active_path normally)
  committed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_writebacks_run ON writebacks(run_id);
CREATE INDEX IF NOT EXISTS idx_writebacks_status ON writebacks(status);
CREATE INDEX IF NOT EXISTS idx_writebacks_artifact ON writebacks(artifact_type, artifact_id);
```

Migration is idempotent (`CREATE TABLE IF NOT EXISTS`). The migration runner advances `schema_version` to 5.

### 3.3 IPC variants (additions to `packages/shared-types/src/ipc.ts`)

Existing variants used: `writeback.proposed`, `writeback.committed`, `run.iteration.cap_reached`, `vault.commit.failed`. Ch.6 adds:

```ts
// New IPC variants (renderer-bound)
{ kind: z.literal('writeback.iteration.requested'),
  payload: z.object({ writebackId: z.string(), russellFeedback: z.string(),
                      requestedAt: z.number() }) },

{ kind: z.literal('writeback.iteration.completed'),
  payload: z.object({ writebackId: z.string(), iterationNumber: z.number(),
                      newDraftPath: z.string(), verifierScoreAfter: z.number().nullable(),
                      completedAt: z.number() }) },

{ kind: z.literal('writeback.iteration.cap_reached'),
  payload: z.object({ writebackId: z.string(),
                      surfaceChoices: z.array(z.enum(['commit', 'reject', 'escalate-full-rerun'])) }) },

{ kind: z.literal('writeback.rejected'),
  payload: z.object({ writebackId: z.string(),
                      rationale: z.string(),
                      archivedPath: z.string(), rejectedAt: z.number() }) },

{ kind: z.literal('writeback.edited'),
  payload: z.object({ writebackId: z.string(),
                      editedPath: z.string(),    // path opened for hand-edit (the draft path)
                      editedAt: z.number() }) },
```

`writeback.proposed` and `writeback.committed` keep their existing payload shapes from Ch.3 (no breaking change).

### 3.4 Engine API (`packages/writeback-engine/src/index.ts` — new package)

```ts
export async function draftWritebacks(args: {
  runId: string;
  memo: { markdown: string; citations: Citation[]; rigorScore: number };
  synthesizerProposals: SynthesizerProposedWriteback[];  // from Synthesizer structured output
  vaultRoot: string;
  db: Database;
  emitIpc: (m: IpcMessage) => void;
}): Promise<WritebackDraft[]>;
// For each Synthesizer proposal: pick artifact-id (next available if isNew; otherwise the cited
// existing id), render frontmatter via vault-writer/deriveTags + resolveWikilinks, build
// proposedBody via the type-specific template (positions/decisions/predictions/pre-mortem-updates/
// stakeholder-updates/workstream-advances), compute diff vs active file (null if isNew),
// SafeWrite to <vault>/<zone>/<id>.draft-<runId>.md (commitVault=true), insert writebacks row,
// emit writeback.proposed IPC. Returns the list. On any per-writeback failure, log + skip that
// writeback (do not fail the whole batch); attach error to the WritebackDraft.description.

export async function acceptWriteback(writebackId: string, deps: EngineDeps): Promise<void>;
// Read the .draft-<runId>.md, SafeWrite to the active_path (commitVault=true), unlink the
// draft, update writebacks row (status='accepted', committed_at, committed_path), emit
// writeback.committed IPC. On SafeWrite conflict at active_path (someone else wrote
// concurrently), surface safewrite.conflict IPC and leave the writeback in 'proposed' for
// Russell to re-review against the changed-on-disk state.

export async function rejectWriteback(writebackId: string, rationale: string, deps: EngineDeps): Promise<void>;
// Move .draft-<runId>.md to <vault>/_archived-proposals/<artifact-id>-<runId>-rejected.md
// (prepend rationale as a markdown blockquote before the original frontmatter), SafeWrite the
// archive file (commitVault=true), update writebacks row (status='rejected', rejection_rationale,
// decided_at), emit writeback.rejected IPC.

export async function editWriteback(writebackId: string, deps: EngineDeps): Promise<{ editPath: string }>;
// Returns the draft path. The UI is expected to open the editor on this path. On save (detected
// via chokidar in apps/main), the engine calls acceptWriteback() with the new content.
// emit writeback.edited IPC.

export async function iterateOnWriteback(args: {
  writebackId: string;
  russellFeedback: string;
  deps: EngineDeps & { dispatchLens: DispatchLensFn; synthesize: SynthesizeFn; verify: VerifyFn };
}): Promise<WritebackDraft>;
// Per §2.5: identify contested lenses, re-dispatch with feedback + prior draft, re-synth, re-verify,
// overwrite draft sidecar, append iteration history, increment iteration_count, emit
// writeback.iteration.requested + writeback.iteration.completed (or .cap_reached if count >= 3
// after increment).
```

### 3.5 Per-artifact-type drafters (`packages/writeback-engine/src/drafters/*.ts`)

One module per `ArtifactType`. Each exports `draft(proposal, context) -> { proposedBody, proposedFrontmatter, activePath, artifactId, isNew }`. The drafter:

1. Reads the existing artifact at `activePath` if `!isNew`; otherwise picks next available ID by globbing the zone.
2. Merges Synthesizer-proposed values into the frontmatter, preserving existing values for fields the Synthesizer did not propose changes to.
3. Calls `deriveTags()` and `resolveWikilinks()` so tags + `related:` stay current.
4. Renders the body per type-specific template (see `packages/writeback-engine/src/templates/<type>.ts`).
5. Returns the proposed bundle for the engine to SafeWrite.

Each drafter has a `.spec.ts` that asserts: (a) Bases-queryable frontmatter (no schema regression), (b) idempotency (running the drafter twice with same input produces byte-equal output), (c) correct kebab/snake convention per type, (d) `related:` field present and resolvable.

### 3.6 Renderer screens (`apps/renderer/src/screens/`)

Three new screens, all bound to IPC events; no polling:

- `WritebackPane.tsx` — list of `writeback.proposed` events (filter: `status='proposed' | 'iterating'`). Each row: artifact type + id + description + diff badge (lines added/removed) + Accept/Edit/Reject/Conversation buttons.
- `ConversationPane.tsx` — opened per-writeback. Shows iteration history (from `writebacks.iteration_history_json`) as a thread; typed feedback textbox at the bottom; on submit emits `writeback.iteration.requested` to utility process. At `iteration_count >= 3`, renders the three surface choices from `writeback.iteration.cap_reached`.
- `AcceptedHistory.tsx` — opened per-artifact (e.g. from a Position page). Shows the revision log: list of `writeback.committed` events for this `artifact_id` over time, with diff inline. Read-only.

Renderer imports the shared-types Zod schemas and parses every IPC payload; invalid payloads log + drop, do not crash.

### 3.7 Root `pnpm dev` script

Add to root `package.json`:

```jsonc
"scripts": {
  // ... existing scripts ...
  "dev": "concurrently -k -n main,utility,renderer -c blue,magenta,green \"pnpm --filter @c-suite/main dev\" \"pnpm --filter @c-suite/utility dev\" \"pnpm --filter @c-suite/renderer dev\""
}
```

Each app gets a per-package `dev` script (`apps/main/package.json`, `apps/utility/package.json`, `apps/renderer/package.json`) that launches its dev server (e.g. `electron .` for main with `--inspect`, `tsx watch` for utility, Vite dev server for renderer if applicable). Add `concurrently` to root `devDependencies`. `pnpm dev` from the repo root brings the full app up so Russell can visually review Ch.6 design gates running against the stub harness.

If the renderer is not yet Vite-wired at Ch.6 entry (Ch.5 may have it as a static React app), the renderer `dev` script can be a stub that prints "renderer dev server pending Ch.7 polish" — `pnpm dev` still launches main + utility usefully.

### 3.8 State-machine integration

`apps/utility/src/orchestrator/state-machine.ts` already transitions `shipped-clean → write-back-proposed → review`. Ch.6 changes:

- The `shipped-clean → write-back-proposed` transition now calls `draftWritebacks()` and stores the returned `WritebackDraft[]` in the run-state's `drafts` field (already typed in `run-state.ts`).
- The `review → write-back-proposed` transition (Russell-driven full re-cycle) is the existing B38 run-level path — unchanged. Counter advances; cap at 3.
- New events: `writeback.iterate.requested(writebackId, feedback)` enters per-writeback iteration; `writeback.accept(writebackId)`, `writeback.reject(writebackId, rationale)`, `writeback.edit(writebackId)` are terminal transitions for individual writebacks within the `review` state. The state machine does NOT advance out of `review` until all writebacks are accepted/edited/rejected OR Russell explicitly ends review.

## 4. Acceptance criteria (Ch.6 close gate)

Audit/QA re-derives PASS/FAIL per criterion (NEVER the builder). Each criterion has a BY-HAND reproduction step.

| # | Criterion | BY-HAND reproduction |
|---|---|---|
| 1 | Synthesizer-proposed writebacks per memo (no Verifier authorship) | Run stub harness; grep `apps/utility/src/agents/verifier-runner.ts` for any "proposeWriteback" or equivalent — must be absent. Synthesizer.prompt.md retains the proposed-writebacks structured output section. |
| 2 | Each writeback surfaces in review pane with diff vs existing | Launch `pnpm dev`; trigger stub Cash-lever run; open WritebackPane; confirm each proposal renders with a diff (or "NEW ARTIFACT" badge if `isNew`). |
| 3 | Accept → SafeWrite + git commit | Click Accept on a writeback; `git -C <vault> log -1` shows the structured commit message; active file content matches the proposal. |
| 4 | Edit opens markdown directly | Click Edit; the .draft-<runId>.md path is exposed (open-with default editor or `obsidian open` URI); on file save (chokidar detects), engine acceptWriteback with new content. |
| 5 | Reject → archived-proposals log | Click Reject; enter rationale; file moves to `<vault>/_archived-proposals/` with rationale prepended; writebacks row status='rejected'; vault git commit. |
| 6 | Typed feedback re-runs contested lens only + Verifier re-gates | Submit typed feedback on a writeback; verify in tool_calls table that only contested lens(es) re-dispatched; new Verifier score recorded; iteration_history_json appended; new draft on disk. |
| 7 | Per-writeback N=3 cap UX | Submit 3 rounds of feedback on the same writeback; 4th attempt throws `WritebackIterationCapReached`; `writeback.iteration.cap_reached` IPC surfaces commit/reject/escalate buttons. |
| 8 | Iteration history persists as thread on artifact | ConversationPane renders the 3-entry iteration history in chronological order with each round's feedback + new Verifier score. |
| 9 | Schema conforms to vault Bases frontmatter | For each artifact type, parse the proposed sidecar through the existing `_bases/<type>.base` filter — proposal appears in the proposed-status view. `pnpm tsx scripts/vault-tag-backfill.ts --dry-run` reports zero changes needed on accepted files. |
| 10 | `pnpm dev` launches main + utility + renderer | Cold-clone the repo; `pnpm install && pnpm dev`; confirm three named processes (main, utility, renderer) start without error. |
| 11 | Sidecar suffix is `.draft-<runId>.md` (not `.proposed-…`) | Trigger stub run; `ls <vault>/positions/active/*.draft-*` shows new file; `ls <vault>/positions/active/*.proposed-*` is unchanged (= SafeWrite conflict sidecars, if any). |
| 12 | Two distinct iteration counters | `state-machine.ts` retains B38 `run.iteration.cap_reached` path unchanged; writebacks table `iteration_count` advances independently; respective IPC events fire on respective caps. |

**Reproduce ≥1 criterion BY HAND** is non-negotiable (per delivery.md §Audit ritual).

## 5. Sub-agent contract pins (for the parallel build dispatch)

Per `~/.claude/rules/wire-new-helpers.md` + `~/.claude/rules/verify-live-endpoints-before-done.md` + the prior-pain rule on parallel-agent API drift. The Runtime / Renderer / Test sub-agents work from this ADR as the only shared contract. Sub-agent briefs at `tasks/ch6-{runtime,renderer,test,dev-script}-brief.md` reference this ADR by section — the briefs do not restate the contract.

**Forbidden inferences (will be REOPENed by Audit/QA):**
- Inventing a new frontmatter field on any artifact type.
- Using `.proposed-<runId>.md` (collides with SafeWrite).
- Authoring proposals in the Verifier.
- Combining the two iteration counters into one.
- Skipping SafeWrite for any writeback file operation.
- Writing tests in the same agent that wrote the engine code (Writer ≠ grader; Test sub-agent is separate).

## 6. Non-goals (deferred to later chapters)

- **Bases view for `_proposed-writebacks/`** — render the queue inside Obsidian. Out of Ch.6 scope; lives at Ch.7 home-screen polish (a count tile is sufficient).
- **Cowork-side write-back authoring.** Cowork `/deep` still writes via its own pattern; this ADR governs C-Suite writebacks only.
- **Cross-writeback dependency resolution.** If two proposed writebacks reference each other (e.g. a new Position cited by a new Prediction), Ch.6 lets Russell accept them in any order; ordering optimization is a Ch.12 polish item.
- **Auto-acceptance heuristics.** Every writeback requires explicit Russell action. PRD §5 locks the human gate.

## 7. Consequences

- The vault begins accumulating `.draft-<runId>.md` sidecars during normal use. The maintenance scripts (`vault-tag-backfill`, `vault-wikilink-backfill`, `vault-inbody-link-fixup`) ignore `.draft-*` files (add the pattern to each script's glob exclusions during build).
- Bases views for each artifact type may want a `status: proposed` filter to separate proposals from active artifacts. Out of Ch.6 ADR scope but flagged for the Ch.6 design gate (mockup 1 — WritebackPane — uses a SQLite-backed query, not a Bases query, so Bases authoring is not required here).
- The `_archived-proposals/` directory is new. Add to `VAULT_GUIDE.md` Section 2 as part of Ch.6 close.
- Drafter modules become the canonical place to apply vault frontmatter conventions in code. Future schema changes propagate by editing the drafter + the corresponding template + the corresponding Base + `VAULT_GUIDE.md` Section 3 (per §12 migration discipline).

## 8. Verification

- Unit: `packages/writeback-engine/tests/*.spec.ts` covers each drafter + each engine function + the iteration semantics (10+ tests per drafter; 20+ for engine).
- Integration: `tests/integration/ch6-writeback-lifecycle.spec.ts` drives a stub-harness run end-to-end (draft → propose → iterate → accept), asserts every IPC event in order, asserts vault git commits land with the expected message format.
- Stub harness: `packages/stub-harness/fixtures/cash-lever-with-writebacks/` captures Synthesizer-proposed writebacks + Verifier scores for a known Cash-lever run; the lifecycle integration test replays this fixture.
- BY-HAND: Audit/QA picks one criterion from §4, walks through it manually on Russell's Mac via `pnpm dev`.

## 9. References

- ROADMAP.md §Ch.6 — exit criteria source.
- docs/architecture/data.md lines 334-345 (writebacks table), lines 397-454 (write-back engine pseudocode), lines 419-454 (iterateOnWriteback prior).
- docs/architecture/runtime.md lines 99-119 (state-machine review/feedback states).
- docs/architecture/prompts.md lines 15-17 (Synthesizer authors proposed writebacks).
- docs/architecture/ui.md §screen inventory lines 80-93 (Write-back review pane, Conversation pane, Accepted history).
- docs/decisions/0004-ch3-runtime-spine.md (state-machine semantics).
- docs/decisions/0006-ch5-first-end-to-end-slice.md (Cash-lever run shape).
- docs/decisions/0007-committed-pipeline-definition.md (any Synthesizer proposals touching pipeline numbers respect this).
- BLOCKERS.md B38 (run-level cap, shipped) — distinct from per-writeback cap added here.
- BLOCKERS.md B39 (vault.commit.failed surfacing, shipped) — Ch.6 SafeWrite calls bubble the failure event.
- `<vault>/VAULT_GUIDE.md` §3 (frontmatter schema), §4 (linking), §5 (Bases), §8 (maintenance scripts).
- packages/shared-types/src/run-state.ts — `review.iteration` (run-level, B38).
- packages/vault-writer/src/safeWrite.ts:226 — existing `.proposed-<ISO>.md` SafeWrite conflict sidecar (collision avoided per §2.2).

---

## 10. Russell approval delta — 2026-05-27 (design gate post-submission)

Russell approved variant **A** for all three screens (dense list / linear timeline / collapsed list). He attached three WritebackPane refinements:

### 10.1 Topic column

Add `topic: string` to `WritebackDraftSchema`. Drafters compute it once with this priority:

1. If the proposed artifact has `linked-workstreams: [WS-NN, …]` (kebab for decisions/pre-mortems) or `linked_workstreams: [WS-NN, …]` (snake for workstreams/predictions), read `<vault>/workstreams/WS-NN-*.md` frontmatter `title:` and use that.
2. Else, map the originating playbook to a topic label:
   - `cash_lever` → `"Cash"`
   - `weekly_cash_forecast` → `"Cash"`
   - `gtm_reallocation` → `"GTM"`
   - `strategic_option` → `"Strategy"`
   - `board_narrative` → `"Board"`
   - `quick_read` → `"Quick"`
   - `pre_mortem` → `"Adversarial"`
   - `stakeholder_1on1_prep` → `"Stakeholder"`
   - `open_qa` → `"Ad-hoc"`
3. Else `"General"`.

Runtime drafters write `topic` into the SQLite `writebacks` row (add column in migration 005) and into the IPC `writeback.proposed` payload. Renderer displays as a pill column between Artifact-Type icon and Description.

### 10.2 Row-expand-on-click

WritebackPane rows are collapsed by default (single line). Clicking the row (or a chevron at the right edge) expands inline to show: full description + diff preview (first 12 diff lines, monospace, `--color-success` / `--color-error`) + lenses-contributing pills + "Open full conversation" link. Re-clicking collapses. Multiple rows expandable simultaneously. Expand state is renderer-local (does not persist across reloads at Ch.6; Ch.7 polish may persist if needed).

### 10.3 Description font + line-height

Description column uses `--text-xs` (11px) + `--leading-tight` (1.25), not `--text-sm` (13px) + `--leading-normal`. More characters per row, fewer ellipsis truncations.

### 10.4 Schema deltas (binding additions to §3)

`packages/shared-types/src/writeback.ts`:
```ts
export const WritebackDraftSchema = z.object({
  // ... all existing fields from §3.1 ...
  topic: z.string(),  // §10.1 derivation
});
```

`db/migrations/005_writebacks.sql` (§3.2): add column
```sql
topic TEXT NOT NULL DEFAULT 'General',
```

IPC `writeback.proposed` payload (additive): `topic: string`. Existing consumers ignore unknown fields per Zod `.passthrough()`; safe to add.

### 10.5 Acceptance addition

ADR §4 acceptance table gains row 13: "WritebackPane row carries Topic pill derived per §10.1; row expand-on-click shows full diff preview + lenses-contributing." BY-HAND reproduction: launch `pnpm dev`, run stub Cash-lever, observe a position-writeback row carries `Cash` pill (from playbook map since no linked-workstream on a brand-new position), and a workstream-advance row carries the actual workstream title.
