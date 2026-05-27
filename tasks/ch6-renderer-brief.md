# Ch.6 Renderer Builder Brief

You are the Renderer sub-agent for C-Suite Phase 2 Ch.6. The contract is `docs/decisions/0008-write-backs-and-iterative-feedback.md`. The approved UI variants are in `~/Desktop/csuite-ch6-design/APPROVED.md` (the design gate captured Russell's variant picks; orchestrator wrote that file post-approval). Read both before you write code.

## You operate under DOCTRINE
- Truth over completion appearance.
- No shortcuts — verify before claiming done. Run the renderer; click through the flows.
- Cite everything.
- You are NOT the agent who will grade your work.

## Scope (yours alone — non-overlapping with Runtime / Test / Dev-Script briefs)

Three new screens under `apps/renderer/src/screens/`. Match the variant Russell approved per screen.

1. **`WritebackPane.tsx`**
   - Subscribes to IPC `writeback.proposed`, `writeback.committed`, `writeback.rejected`, `writeback.iteration.completed`.
   - Local state: list of `WritebackDraft[]` from IPC events, filtered to `status: 'proposed' | 'iterating'`.
   - Per row: artifact-type icon + artifact-id + one-sentence description + diff badge (lines added/removed from `diffAgainstActive`, or "NEW ARTIFACT" if `isNew`) + 4 action buttons.
   - Button click handlers send the corresponding IPC up: Accept → `writeback.accept(writebackId)`, Edit → `writeback.edit(writebackId)`, Reject → opens rationale modal then `writeback.reject(writebackId, rationale)`, Conversation → opens `ConversationPane` for this writeback (in-app routing, not new window).
   - Filter/sort affordances per ADR §3.6 + approved variant.

2. **`ConversationPane.tsx`**
   - Subscribes to IPC `writeback.iteration.requested`, `writeback.iteration.completed`, `writeback.iteration.cap_reached` for the open `writebackId`.
   - Renders iteration history from `writebacks.iteration_history_json` (fetched via a new IPC request/response `writeback.history.get(writebackId)` — add this IPC variant if not already in the Runtime sub-agent's scope; coordinate via the ADR's IPC section before adding).
   - Typed-feedback textbox at the bottom. On submit emits `writeback.iterate.requested(writebackId, feedback)`.
   - At `iteration_count >= 3` (from latest `writeback.iteration.cap_reached`), renders the 3-button cap surface: Commit / Reject / Escalate-full-rerun.

3. **`AcceptedHistory.tsx`**
   - Per-artifact revision log. Subscribes to historical `writeback.committed` events filtered to `artifact_id`.
   - Fetches initial history via new IPC `writeback.committed.history.get(artifactId)`.
   - Renders inline diffs (one per commit, newest first).
   - Read-only.

## Shared components (under `apps/renderer/src/components/`)

- `DiffView.tsx` — renders a unified diff string with +/- lines colored via `--color-success` / `--color-error`. Monospace. Reused across all three screens.
- `ArtifactTypeIcon.tsx` — one SVG per `ArtifactType`. Use the design tokens.
- `IterationCapSurface.tsx` — the 3-button surface (used by `ConversationPane`).
- `RejectionRationaleModal.tsx` — used by `WritebackPane`.

All screens import Zod schemas from `@c-suite/shared-types` and parse every IPC payload via `IpcMessage.parse()`. Invalid payloads log to console + drop; do not crash the UI.

## Design tokens

Use the CSS variables from `apps/renderer/src/design/tokens.css` (Ch.0 ships them). If any token is missing for a Ch.6 need, add it to `tokens.css` matching the values in `docs/architecture/ui.md` §design-tokens.

## Wiring

- Add the three screens to `apps/renderer/src/App.tsx` routing. `WritebackPane` lands in the home-screen sidebar (or wherever Russell's approved variant calls for it). `ConversationPane` opens modal-style or right-pane per approved variant. `AcceptedHistory` opens from the active artifact's page in the memo viewer / decision-log entry (Ch.7 will wire those entry points; Ch.6 ships the screen + makes it openable via a test route at minimum).

## Forbidden inferences (Audit/QA will REOPEN)

- Hardcoding any data the IPC stream should provide.
- Polling for state. Use IPC events + request/response IPC patterns. Per `~/.claude/rules/no-polling-agents.md` (if applicable here too): React effects subscribe; do not setInterval-poll.
- Inventing new IPC variants not in ADR §3.3 without coordinating with the Runtime sub-agent (use the shared ADR file + an ADR amendment if the contract needs to change).
- Cross-screen state via global mutable singletons. Use IPC events or scoped React context.
- Writing your own tests. The Test sub-agent handles them.

## What "done" looks like

- All three screens render in the running app via `pnpm dev` (Dev-Script sub-agent ships that).
- `pnpm typecheck` green; `pnpm lint` green.
- Cold-launch of `pnpm dev`; navigate to WritebackPane; the screen renders the empty state ("No proposed write-backs") gracefully when no IPC events have arrived.
- Atomic commits per concept. Conventional message format. No Claude attribution.

## Report-back format (under 250 words)

- Commits made (SHA + first-line).
- Confirmation `pnpm typecheck && pnpm lint` is green.
- Variant per screen you implemented (matches APPROVED.md).
- Any contract ambiguity resolved via decide-and-log.
- Any blocker + three approaches tried.

DO NOT write tests. DO NOT mark the chapter closed.
