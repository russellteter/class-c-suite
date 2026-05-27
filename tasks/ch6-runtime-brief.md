# Ch.6 Runtime Builder Brief

You are the Runtime sub-agent for C-Suite Phase 2 Ch.6. The contract is `docs/decisions/0008-write-backs-and-iterative-feedback.md` (read it fully before you write any code). This brief assigns scope; it does not restate the contract.

## You operate under DOCTRINE
- Truth over completion appearance. Say UNKNOWN if you don't know.
- No shortcuts. Verify before claiming done.
- Persistence — three approaches before declaring impossible.
- Cite everything. file_path:line.
- You are NOT the agent who will grade your work. Structure outputs so the Audit/QA sub-agent can verify each claim against its source.

## Scope (yours alone — non-overlapping with Renderer / Test / Dev-Script briefs)

1. **New package: `packages/writeback-engine/`**
   - `src/index.ts` — exports `draftWritebacks`, `acceptWriteback`, `rejectWriteback`, `editWriteback`, `iterateOnWriteback` matching ADR §3.4 signatures byte-for-byte.
   - `src/drafters/{position,decision,prediction,preMortemUpdate,stakeholderUpdate,workstreamAdvance}.ts` — one per `ArtifactType` per ADR §3.5.
   - `src/templates/<type>.ts` — markdown rendering of frontmatter + body per type, respecting the kebab/snake convention per `<vault>/VAULT_GUIDE.md` §3.
   - `src/deriveTags.ts` — pure function that takes `(artifactType, frontmatterValues)` and returns the structural tag set (`#type/*`, `#status/*`, `#confidence/*`, `#health/*`, `#impact/*`, etc.). Extract the existing logic from `scripts/vault-tag-backfill.ts`.
   - `src/resolveWikilinks.ts` — pure function that takes `(idArray, vaultRoot)` and returns the canonical full-filename wikilinks for the `related:` array. Extract from `scripts/vault-wikilink-backfill.ts`.
   - `src/aliasInBodyIds.ts` — pure function that takes `(bodyText, vaultRoot)` and converts bare `POS-NNN` / `DEC-NNN` / etc. references in prose to `[[full-filename|POS-NNN]]` aliased wikilinks. Extract from `scripts/vault-inbody-link-fixup.ts`.
   - `src/diff.ts` — produces a unified diff string between current active artifact and proposed artifact for `WritebackDraft.diffAgainstActive`.
   - `package.json` follows the pattern of `packages/vault-writer/package.json`; this package depends on `@c-suite/shared-types`, `@c-suite/vault-writer`, `js-yaml`, and the existing SQLite wrapper.

2. **Migration: `db/migrations/005_writebacks.sql`** — per ADR §3.2 verbatim. Idempotent. Advances `schema_version` to 5.

3. **Zod schemas: `packages/shared-types/src/writeback.ts`** — replace the current 4-field stub with the full schemas from ADR §3.1. Keep the existing `WritebackDraft` type name (downstream `run-state.ts` imports it). Add new schemas `ArtifactType`, `WritebackStatus`, `ProposedBy`, `IterationHistoryEntry`.

4. **IPC: `packages/shared-types/src/ipc.ts`** — add the 5 new variants from ADR §3.3 (`writeback.iteration.requested`, `writeback.iteration.completed`, `writeback.iteration.cap_reached`, `writeback.rejected`, `writeback.edited`). Do NOT modify the existing `writeback.proposed` / `writeback.committed` payload shapes.

5. **State-machine integration: `apps/utility/src/orchestrator/state-machine.ts`** — per ADR §3.8. Wire the new `writeback.iterate.requested`, `writeback.accept`, `writeback.reject`, `writeback.edit` events as terminal transitions within `review`. Do NOT touch the B38 run-level cap path — that stays as-is.

6. **Wire the engine into the run loop: `apps/utility/src/orchestrator/run-loop.ts`** — on `shipped-clean | shipped-draft`, call `draftWritebacks(...)` with the Synthesizer's `proposedWritebacks` structured-output field and emit each `writeback.proposed` IPC event. Per `~/.claude/rules/wire-new-helpers.md`: grep `from '@c-suite/writeback-engine'` across `apps/` before marking your work done; confirm at least one production importer exists.

7. **Synthesizer structured-output: `apps/utility/src/prompts/Synthesizer.prompt.md`** — the prompt already references "proposed write-backs section" at lines 15-17. Confirm the schema in `packages/shared-types/src/synthesizer-output.ts` (or wherever it lives) carries a `proposedWritebacks: SynthesizerProposedWriteback[]` field; if not, add it. Each `SynthesizerProposedWriteback` has: `artifactType: ArtifactType`, `targetArtifactId: string | null` (null = create new), `proposedFrontmatterPatch: Record<string, unknown>`, `proposedBodyPatch: string`, `lensesContributing: AgentRole[]`, `oneSentenceDescription: string`.

## Forbidden inferences (Audit/QA will REOPEN if you cross these)

Per ADR §5:
- Inventing any new frontmatter field on any artifact type. Use only fields documented in `<vault>/VAULT_GUIDE.md` §3.
- Using `.proposed-<runId>.md` for writeback drafts. The suffix is `.draft-<runId>.md`. `.proposed-…` belongs to SafeWrite conflict sidecars.
- Authoring proposals in the Verifier. Synthesizer authors; engine renders.
- Combining the two iteration counters. Run-level (B38, shipped) and per-writeback (new) are independent.
- Skipping SafeWrite for any writeback file operation. All vault writes go through `packages/vault-writer/src/safeWrite.ts`.
- Writing your own tests. The Test sub-agent (separate, briefed at `tasks/ch6-test-brief.md`) writes them.

## What "done" looks like

- All files above written + typecheck-clean (`pnpm typecheck`).
- All existing tests still pass (`pnpm test:unit`) — you should not break Ch.0-5 tests.
- `grep -rn "from '@c-suite/writeback-engine'"` returns at least one hit in `apps/utility/src/`.
- The new migration applies cleanly on a fresh DB and is a no-op on a DB already at schema_version 5.
- New `WritebackDraft` import path works in `packages/shared-types/src/run-state.ts` without breaking the existing import line.
- You committed atomically: one commit per concept (migration, schemas, engine package skeleton, each drafter, IPC wiring, run-loop integration, state-machine integration). Conventional message format `<scope>: <what changed> — <why>`. No Claude attribution.

## Report-back format (under 250 words)

- List of commits you made (SHA + message first line).
- Confirmation `grep -rn "from '@c-suite/writeback-engine'"` shows live importers.
- Confirmation `pnpm typecheck` is green.
- Any contract ambiguity you resolved via decide-and-log + the decision.
- Any blocker you hit + the three approaches you tried before flagging it.

DO NOT proceed to UI work. DO NOT write tests. DO NOT mark the chapter closed.
