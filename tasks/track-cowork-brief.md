# CoWork hand-back bundle — wiring brief (C-Suite V1 Phase 1 / C4 handback half)

Goal: when Russell clicks "Draw up for Cowork" on a memo and then "Send" in the preview, write a real
folder bundle to the vault `handoffs/<slug>/` containing **memo.md + brief.md + continue-prompt.md**, with
**brief.md authored by RealClaudeClient** (not the stub). Today the whole path is dead/stubbed.

Repo root: `/Users/russellteter/Claude Code Projects/c-suite` (path has spaces — quote in shell).
ESM note: source imports use `.js` even for `.ts` files (Node16). Match the surrounding style.

## Current state (verified this session)
- `handoff.preview.requested` is WIRED end-to-end: renderer CTA (`MemoViewer.tsx:126`, `DrawUpCTA.tsx`) →
  `apps/renderer/src/ipc/handoff.ts:99` → main relay (`apps/main/src/ipc/handlers.ts:38` UTILITY_BOUND) →
  `apps/utility/src/index.ts:154-219` builds `HandoffGeneratorInput` → `handleHandoffPreviewRequested`
  (`apps/utility/src/orchestrator/run-loop.ts:452`) → `generateHandoffBrief` → emits `handoff.preview.ready`.
- BUG: `generateHandoffBrief` (`apps/utility/src/agents/handoff/runner.ts:76-87`) param is typed
  `client?: StubClaudeClient` and defaults to `new StubClaudeClient('replay', 'tests/fixtures/stubs')` —
  so the brief is STUB-generated even under live. Must use `modelClientFromEnv()`.
- DEAD: `handoff.send` (renderer `apps/renderer/src/ipc/handoff.ts:57`) is NOT in `UTILITY_BOUND` and has NO
  handler. `writeHandoffBrief` (`apps/utility/src/agents/handoff/writer.ts:36`) has zero prod callers.
  Nothing is written to disk today.

## The four changes

### 1. `apps/utility/src/agents/handoff/runner.ts` — RealClaudeClient for the brief
- Change the import of `StubClaudeClient` (line ~8) to also import the `ModelClient` type and
  `modelClientFromEnv` from `../modelClient.js`.
- Widen the `generateHandoffBrief` `client?` param (line ~78) from `StubClaudeClient` to `ModelClient`.
- Change the default (line ~86) from `new StubClaudeClient('replay', 'tests/fixtures/stubs')` to
  `modelClientFromEnv()`. Both clients share the same `invoke()` signature (realClaudeClient.ts:148), so
  this is type-safe and behavior is unchanged in replay (factory returns StubClaudeClient there).

### 2. `apps/main/src/ipc/handlers.ts:38` — relay handoff.send
- Add `'handoff.send'` to the `UTILITY_BOUND` set so the validated message reaches the utility.

### 3. `apps/utility/src/agents/handoff/writer.ts` — add `writeHandoffBundle`
- Keep the existing `writeHandoffBrief` (flat file). Add a new exported async function:
  `writeHandoffBundle(brief, memoMarkdown: string | null, db): Promise<{ ok: boolean; slug: string; folderPath: string }>`
- Derive `slug` from `brief.frontmatter.filename` without `.md` (reuse `serializeHandoffFile` for brief.md).
- Folder: `path.join('handoffs', slug)` (vault-relative). Write THREE files via the SAME `safeWrite` the
  existing writer uses, all with zone `'handoff'` (zonePolicy: `commitVault:false` — disk only, by design):
  - `handoffs/<slug>/memo.md` = `memoMarkdown` (skip this file if `memoMarkdown` is null; do NOT fail the bundle).
  - `handoffs/<slug>/brief.md` = `serializeHandoffFile(brief)` (frontmatter + bodyMarkdown).
  - `handoffs/<slug>/continue-prompt.md` = a templated CoWork continue prompt (see template below).
- Return `{ ok, slug, folderPath }` (folderPath absolute, for the handoff.sent toast).
- continue-prompt.md template (plain markdown):
  ```
  # Continue in Claude Desktop CoWork

  You are picking up a C-Suite strategic decision. The reconciled 6-lens memo is in `memo.md`; the
  hand-off brief (context, open threads, next actions) is in `brief.md`. Read both, then continue the
  work: <brief.frontmatter.title or origin title>.

  Start by confirming the recommendation in memo.md against any newer information, then take the next
  action the brief identifies.
  ```

### 4. `apps/utility/src/index.ts` — add the `handoff.send` handler
- After the `handoff.preview.requested` block (~line 219), add a handler for `payload.kind === 'handoff.send'`
  (mirror the existing block's structure). Steps:
  - Parse `{ runId, brief, editedBodyMarkdown? }` from payload. `brief` arrives as `unknown` (ipc.ts:341);
    cast to `HandoffBrief` from `@c-suite/shared-types/handoff` (NOT the renderer-local type — the shared
    type has the `fullPath`/`filename` fields the writer needs).
  - If `editedBodyMarkdown` present, override `brief.bodyMarkdown` with it.
  - Read the memo: `SELECT memo_path FROM runs WHERE run_id = ?`. If a path exists, read the file from the
    vault (`path.join(vaultPath, memo_path)`) — same pattern as `handlers.ts:100-131` memo:read. If null/missing,
    pass `null` (bundle still writes brief.md + continue-prompt.md).
  - Call `writeHandoffBundle(brief, memoMarkdown, getSharedDb())`.
  - On success emit `{ kind: 'handoff.sent', payload: { runId, handoffId: brief.frontmatter.id, path: folderPath } }`.
  - On failure emit `{ kind: 'handoff.failed', payload: { runId, reason: String(err) } }`.

## Constraints
- Do NOT run `pnpm --filter utility build` / do NOT touch `dist/` — a live run is in flight and I (the
  orchestrator) own the rebuild. Validate with **`cd apps/utility && npx tsc --noEmit -p tsconfig.json`**
  and `cd apps/main && npx tsc --noEmit -p tsconfig.json` only.
- No new top-level files beyond the bundle outputs. No behavior change in replay/record (gate the
  RealClaudeClient via the existing `modelClientFromEnv()` factory, which returns the stub off-live).
- Do NOT edit: `apps/utility/src/playbooks/open-qa/index.ts`, `apps/utility/src/orchestrator/vaultRetriever.ts`,
  `apps/utility/src/orchestrator/run-loop.ts`, `apps/utility/src/orchestrator/groundingContext.ts` (owned by the open-qa path).

## Report (under 200 words)
List each file changed with the line range, confirm both `tsc --noEmit` pass (utility + main), and note any
gotcha you hit (HandoffBrief type shape mismatch, safeWrite zone signature, slug dedup). Do NOT claim the
bundle works end-to-end — I verify that with a live click + on-disk check after rebuild.
