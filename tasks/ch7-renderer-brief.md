# Ch.7 Phase A — Renderer Builder Brief (Home + Tiles + Open Q&A)

You are the Renderer sub-agent for C-Suite Phase 2 Ch.7 **Phase A**. The contract is `docs/decisions/0009-ch7-playbooks-home.md` §11 (home full-data) + §12 (Open Q&A) + §13.1 + §13.5 + §13.6. Variant picks at `docs/decisions/0009-design-gate-approved.md`: **Home B (dense rail) + Tiles A (uniform 4×2) + Open Q&A A (inline)**. Mockup reference at `~/Desktop/csuite-ch7-design/{home-B,tile-A,openqa-A}.html`.

## You operate under DOCTRINE
- Truth over completion appearance. UNKNOWN if you don't know.
- Cite every claim with file_path:line.
- WCAG AA contrast + `:focus-visible` outlines on every interactive element (Russell flagged this at Ch.6 — non-negotiable).
- Use the existing design token system at `apps/renderer/src/design/tokens.css` (Ch.6 ship). Do NOT introduce new tokens unless absolutely necessary; if you do, document why in a comment.

## Scope (yours alone — non-overlapping with Runtime / Test briefs)

### 1. Home — `apps/renderer/src/screens/Home.tsx` (rewrite)

Replace the Ch.5 stub wholesale. Implement **Variant B (dense rail)**:

- **Top strip:** today's date (use `new Date()`), W30 trough proximity (read from a new IPC: `home.w30Proximity` — Runtime sub-agent does NOT wire this; you stub the value to "26 days" with a TODO comment; production wiring lands when the Ch.7 runtime exposes the W30 indexer hook), cost meter ribbon (consume the existing `cost.usage` IPC variant — already wired in Ch.1).
- **Layout:** left rail (workstreams mini-view + decisions + writebacks counter), center column (Open Q&A bar + 8 tiles 4×2), right column (cost meter top + scheduled-jobs strip bottom). Use CSS Grid: `grid-template-columns: 280px 1fr 240px` desktop; collapse to single column under 900px (mobile-friendly even though primary surface is desktop).
- **Empty states** per ADR §11.4 — render every section regardless of data; show placeholder copy when empty.

### 2. New components — `apps/renderer/src/components/`

Each component is a new file. All take typed props; no internal IPC subscription (the parent screen subscribes + passes data down). All are testable via React Testing Library (Test sub-agent's scope).

- **`PlaybookTile.tsx`** — props `{ ordinal: 1-8, id: PlaybookId, name, icon (string emoji or ReactNode), lastRunAt: Date | null, freshness: 'green' | 'amber' | 'gray', keyboardHint, onClick }`. Uniform sizing (Variant A). Hover state. Disabled state if a prereq-block message is present (props `{ blocked?: boolean, blockedReason?: string }` — tooltip on hover).
- **`OpenQABar.tsx`** — props `{ value, onChange, onSubmit, decomposerPreview: { lenses: LensRole[], mcps: McpId[] } | null, submitDisabled }`. Multiline textbox; `Cmd+Enter` submits; live preview chip area below input (only renders when decomposerPreview is non-null; in Phase A, parent stubs it to `null` — production preview wiring deferred to Phase B or beyond).
- **`WorkstreamRail.tsx`** — props `{ workstreams: WorkstreamSummary[] }`. Each row: WS ID + status pill (GREEN/YELLOW/RED) + 1-line phase. Empty state copy from ADR §11.4.
- **`OpenDecisionsList.tsx`** — props `{ decisions: DecisionSummary[] }`. 5 rows max; each row: ID + title + click → opens decision file (use existing `vault.openFile` IPC if present, otherwise stub the handler with `console.log` + a TODO).
- **`WritebacksCounter.tsx`** — props `{ count, onClick }`. Card with count + "writebacks awaiting review" + click → navigates to WritebackPane (existing Ch.6 screen).
- **`JobsStrip.tsx`** — props `{ jobs: ScheduledJobStatus[] }`. Always renders 5 slots; show grayed placeholders labeled "Pending Ch.10" when `jobs` is empty.

### 3. Data plumbing — `apps/renderer/src/hooks/`

New hooks (one file each):
- `useHomeData.ts` — subscribes to renderer-side IPC variants for {workstreams, decisions, writebackCount}. Returns memoized object. **For Phase A**: the IPC events may not exist yet (Runtime owns wiring); use the existing IPC bus pattern — if the variant isn't emitted yet, return empty arrays + `null`s. Document each pending wire with a `// TODO ch7-phase-b: wire <variant>` comment.
- `useKeyboardShortcuts.ts` — wires Cmd+1..Cmd+8 to invoke each playbook (call `ipc.send('playbook.invoke', { playbookId })`), Cmd+/ to focus the Open Q&A bar (`document.getElementById('open-qa-input')?.focus()`), Cmd+R to fire `ipc.send('home.refresh')`. Cleanup on unmount. **macOS only** — use `metaKey` not `ctrlKey`.

### 4. App.tsx wiring — `apps/renderer/src/App.tsx`

- Make Home the default route.
- Wire tile-click → plan-approval screen (existing Ch.5 component). Pass `playbookId` as route state.
- Wire Open Q&A submit → plan-approval screen. Pass `prompt` + `playbookId: 'open_qa'`.

### 5. Mocks for dev / Storybook-equivalent

Add `apps/renderer/src/screens/Home.fixtures.ts` exporting sample data for each section. The Test sub-agent will use these in RTL specs. Do NOT use the fixtures in production code paths — only the dev/test path.

## Variant A (Tiles) implementation specifics
- 4 columns × 2 rows on desktop (640px center column width); 2×4 on narrow.
- Tile size: 140px × 110px.
- Visual: icon (24px) top-left, ordinal pill ("⌘1") top-right, name center-aligned, last-run timestamp + freshness dot bottom-left.
- Freshness dot: green if lastRunAt < 24h ago; amber if < 7d; gray otherwise.

## Variant A (Open Q&A) specifics
- Always-visible multiline textbox; min-height 60px, max-height 200px (auto-grow on content); placeholder: "Ask anything (decomposes ad-hoc; ⌘/ to focus)".
- Submit button (right edge) + "⌘⏎" hint.
- Sits between the date-strip and the tile grid (per home-B mockup).

## Variant B (Home) specifics
- See §1 above.
- Left rail is sticky (sticks to top on scroll). Center + right columns scroll independently if content overflows.
- Right column cost meter is fixed-height (120px) at top; jobs strip fills below.

## Forbidden inferences
- Inventing IPC variants the Runtime sub-agent hasn't defined. If you need a value, stub it + `// TODO ch7-phase-b: wire` comment.
- Touching `apps/utility/` files (Runtime sub-agent's scope).
- Writing tests (Test sub-agent's scope).
- Inventing new color tokens (use existing `tokens.css`).
- Reading from vault directly (renderer must use IPC only).
- Implementing Phase B playbook tiles' specific block-reason copy (just render the disabled state from props).

## What "done" looks like
- All files written + `pnpm typecheck` exit-0 clean.
- Existing tests still pass.
- `pnpm dev` starts cleanly + the Home screen renders the new layout (you don't have to start `pnpm dev` — the Runtime / Test sub-agents do their own dev smoke).
- Atomic commits: one concept per commit. `ch.7 renderer: <what> — <why>`. No Claude attribution.

## Report-back format (≤250 words)
- Commits made (SHA + first-line message).
- Components written + props summary.
- Any decision you made not in the brief (component pattern, fixture shape).
- Any IPC variant you stubbed + `TODO` location.
- Any blocker hit + three approaches tried.

DO NOT touch Runtime files. DO NOT write tests. DO NOT close the chapter.
