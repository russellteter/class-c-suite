# Ch.5 Runtime Continuation — React Screens (after mockups)

## Your role

Frontend engineer for Ch.5. The mockup phase shipped (8 HTMLs at `~/Desktop/cstuite-design-step-{1-8}.html` using CCC-Design-System Class Glassmorphic). Now ship the React screens that the Ch.5 Test TDD-RED tests target. DOCTRINE law #7.

## Required reads

1. `docs/decisions/0006-ch5-cash-lever-slice.md` §4 (UI screens contract).
2. `~/Desktop/CCC-Design-System/source-css/glassmorphic.css` + `typography.css` — production CSS to mirror.
3. `~/Desktop/CCC-Design-System/snippets/tokens-minimal.css` + `components-essentials.css` — drop-in tokens + classes.
4. `docs/architecture/ui.md` — design tokens (palette anchors compatible).
5. `docs/decisions/0001-ch0-foundations.md` §1 — repo skeleton (renderer at `apps/renderer/`).
6. Failing Ch.5 RED tests:
   - `tests/unit/click-claim-tool-call.spec.ts` (memo viewer click handler)
   - `tests/unit/draft-path.spec.ts` (DRAFT banner + suffix)
   - `tests/unit/round-table-honest-signal.spec.ts` (honest-signal contract)
   - `tests/e2e/cash-lever-stub.spec.ts` (E2E)
   - `tests/unit/playbook-classifier.spec.ts` (RED sentinel — already implemented at apps/utility/src/playbooks/classifier.ts, may just need test activation)
   - `tests/unit/run-plan-builder.spec.ts` (same — runtime exists)
   - `tests/unit/mockup-generator.spec.ts` (8 mockups exist now — should pass)

## Deliverables

### Repo skeleton

If `apps/renderer/src/screens/` doesn't exist, create it.

### Section 1 — Class Glassmorphic CSS in renderer

`apps/renderer/src/styles/glassmorphic.css`:
- Copy verbatim from `~/Desktop/CCC-Design-System/source-css/glassmorphic.css`.

`apps/renderer/src/styles/typography.css`:
- Copy verbatim from `~/Desktop/CCC-Design-System/source-css/typography.css`.

Import both in `apps/renderer/src/index.tsx`.

### Section 2 — Home.tsx (per ADR §6)

`apps/renderer/src/screens/Home.tsx`:
- 8 playbook tiles using `.glass-card` (Cash Lever lit; 7 dimmed "Coming in Ch.7" tooltip).
- Open Q&A glass-input bar at top.
- Tripwire strip stub (3 placeholder rows).
- Cost meter showing `windowRemainingTokens / windowCap`.
- Subscribes to IPC: `cost.usage` event updates the meter.

### Section 3 — PlanApproval.tsx (per ADR §3)

`apps/renderer/src/screens/PlanApproval.tsx`:
- Renders the RunPlan: question, lenses, MCPs, token estimate, memo path.
- Approve / Edit / Cancel buttons using `.glass-btn-primary` (purple gradient).
- On Approve: emits `run.plan.approved` IPC.

### Section 4 — RoundTable.tsx (per ADR §4 + honest-signal contract)

`apps/renderer/src/screens/RoundTable.tsx`:
- 6 lens nodes as `.glass-card` (CEO/CFO/CRO/CMO/CPO/COS) — relevant ones lit per playbook.
- Pulse animation tied to `agent.start` / `agent.complete` IPC events.
- Tool-call indicators on edges (animate on `agent.tool.pre` / `agent.tool.post`).
- Substance ribbon: `sources: N` (live count), `verified: X/N` (— until verifier.score), `coverage: P%` (— until verifier.score).
- Synthesizer + Verifier downstream nodes.
- Default for uncomputed metrics: `—` (em-dash literal), NEVER `0` or `Pending`.

### Section 5 — MemoViewer.tsx (per ADR §5 + AC-7 click-claim)

`apps/renderer/src/screens/MemoViewer.tsx`:
- Renders memo markdown.
- Each `[^source-id]` footnote becomes a `<button class="glass-badge--purple">` element.
- Click → IPC `ipc.invoke('tool-call:get', { call_id })` → side panel renders the returned `tool_calls` row JSON.
- DRAFT banner if `memo.status === 'draft'` (amber, `.glass-badge--gold` repurposed or new `.draft-banner` class).
- Expandable failure_reasons panel below banner.

### Section 6 — Wire IPC subscriptions

`apps/renderer/src/ipc/subscriptions.ts`:
- `useRunEvents(runId)` hook subscribes to all run-related IPC events.
- Exports typed event streams to the screens.

### Section 7 — Activate Ch.5 Test files

After React screens ship, the Ch.5 Test agent's TDD-RED tests with `expect(true).toBe(false)` sentinels should be flipped to real assertions. Touch tests/unit/{click-claim-tool-call, draft-path, round-table-honest-signal, playbook-classifier, run-plan-builder, mockup-generator, degraded-mode}.spec.ts to activate the sentinels.

Note: degraded-mode + e2e/cash-lever-stub may need additional production-side wiring (orchestrator integration). Do best-effort; surface remaining gaps.

## Commit discipline

1. `ch5: copy CCC Class Glassmorphic CSS into renderer (glassmorphic.css + typography.css)`
2. `ch5: Home.tsx with 8 tiles + Open Q&A + cost meter (ADR §6)`
3. `ch5: PlanApproval.tsx with Approve/Edit/Cancel (ADR §3)`
4. `ch5: RoundTable.tsx with honest-signal contract (ADR §4 + AC-9)`
5. `ch5: MemoViewer.tsx with click-claim panel + DRAFT path (ADR §5 + AC-7 + AC-8)`
6. `ch5: IPC subscription hooks for renderer screens`
7. `ch5: activate TDD-RED test sentinels (post-Runtime)`

Each auto-pushes.

## Verify before claiming done

- `pnpm -r run typecheck` PASS
- `pnpm build:packages` PASS
- `pnpm run test:unit` — most Ch.5 RED tests now green; document any remaining intentional REDs

## Return

Under 500 words: files created (paths), commit SHAs (last 10), Ch.5 test status (X passed / Y failed after activation), `tail -5 .git/auto-push.log`.

## Out of scope

- E2E test full activation if it requires deep orchestrator integration beyond what Ch.3/Ch.4 ship (surface as "Ch.5 Audit/QA scope").
- Production code outside `apps/renderer/`.
- Other 7 playbooks (Ch.7).
- Live MCP integration (Ch.8 stubs).
