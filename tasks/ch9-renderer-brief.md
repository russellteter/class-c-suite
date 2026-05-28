# Ch.9 — Renderer Builder Brief (HandoffPreview + 4 CTA placements)

You are the Renderer sub-agent for Ch.9. Contract: `docs/decisions/0011-ch9-cowork-handoff.md` §5 (UI surfaces) + §3 (brief schema for preview rendering).

## Working directory
`/Users/russellteter/Claude Code Projects/c-suite/` (quote — has spaces).

## Scope (yours alone — non-overlapping with Runtime brief)

### 1. HandoffPreview screen — `apps/renderer/src/screens/HandoffPreview.tsx` (new)
Per ADR §5.2.

**Layout:**
- Two columns: left (60%) editable markdown preview, right (40%) metadata panel.
- Header: origin link + handoff ID + "Draw up for Cowork" label.

**Left column — markdown preview:**
- Rendered markdown (use existing markdown renderer from Ch.5/Ch.6 MemoViewer pattern).
- "Edit body" button toggles in-place markdown textarea.
- On Save: update local state (don't write file until "Send to Cowork" clicked).

**Right column — metadata panel:**
- Origin link (clickable → opens originating artifact in vault).
- Selected brand skills (checkbox list — Russell can adjust the agent's picks).
- Filename preview (`<vault>/handoffs/<filename>`).
- **Send to Cowork** button (primary).
- **Cancel** button (secondary).

**IPC handlers:**
- On mount: subscribe to `handoff.preview.ready` IPC. When event arrives, render the brief.
- On "Send to Cowork" click: send `handoff.send` IPC with `{ runId, brief, editedBodyMarkdown }`. On `handoff.sent` reply: close screen + toast "Sent to Cowork."
- On "Cancel" click: send `handoff.cancelled` IPC. Close screen.
- On `handoff.failed` IPC: show error banner + remediation; do NOT close screen.

### 2. "Draw up for Cowork" CTA on 4 existing screens

Per ADR §5.1. Add the CTA button to each:

#### 2a. MemoViewer header (`apps/renderer/src/screens/MemoViewer.tsx`)
- Only when memo has a committed decision (`shipped-clean` status + has accepted decision writebacks). Use existing memo state.
- Button label: "Draw up for Cowork" + small icon.
- On click: send `handoff.preview.requested` IPC with `{ runId, originType: 'memo' | 'decision', originPath, originTitle }`. (Runtime sub-agent's `run-loop.ts` hook listens.)

#### 2b. Decision log entry card (`apps/renderer/src/components/DecisionLogEntry.tsx` or wherever accepted decisions render in `AcceptedHistory.tsx`)
- Same CTA on every accepted decision card.
- On click: same IPC trigger with `originType: 'decision'`.

#### 2c. Accepted position card
- Same CTA on every accepted position card in AcceptedHistory.
- On click: `originType: 'position'`.

#### 2d. Accepted pre-mortem card
- Same CTA.
- On click: `originType: 'pre_mortem'`.

#### NOT on (explicit per ADR §5.1):
- Prediction cards.
- Stakeholder update cards.
- Workstream advance cards.

### 3. "Linked execution" section — `apps/renderer/src/components/LinkedExecution.tsx` (new)
Per ADR AC-11. When a decision (or position/pre-mortem) card has `executed_by` populated, render a "Linked execution" section listing each path as a clickable link. Used by:
- AcceptedHistory decision/position/pre-mortem cards.
- Optionally the MemoViewer if the decision came from a memo.

### 4. App.tsx routing
Add HandoffPreview as a screen reachable via `handoff.preview.ready` IPC event. State machine: idle → preview-open → sending → sent (toast) → idle.

### 5. Renderer specs — `tests/unit/renderer/`
- `HandoffPreview.spec.tsx` — renders brief from fixture; Edit toggle works; Send button fires correct IPC; Cancel does nothing-persisted.
- `DrawUpCTA.spec.tsx` — CTA renders on 4 surfaces; NOT on prediction/stakeholder/workstream cards.
- `LinkedExecution.spec.tsx` — renders when `executed_by` populated; hidden when null.

≥25 specs.

## Forbidden inferences

- Touching apps/utility/ (Runtime sub-agent's scope).
- Inventing new IPC variants (use the 5 the Runtime sub-agent defines).
- Adding CTA to prediction/stakeholder/workstream cards (explicitly forbidden).
- Bypassing the existing design-token system (`apps/renderer/src/design/tokens.css`).
- Auto-sending the brief without Russell's explicit click.

## What "done" looks like

- All files written + `pnpm --filter @c-suite/renderer typecheck` exit-0 clean.
- All existing tests pass.
- ≥25 new specs.
- WCAG AA + `:focus-visible` on every interactive element (the Russell-flagged Ch.6 standard).
- Atomic commits — `ch.9 renderer: <what> — <why>`. No Claude attribution.

## Report-back (≤200 words)
- Commits + first-line.
- Typecheck + vitest results.
- Components written.
- Any IPC variant stubbed (TODO if Runtime hasn't shipped it).
