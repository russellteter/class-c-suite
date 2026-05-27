# Ch.7 Phase B — Runtime Builder Brief (Homogeneous Playbooks)

You are the Runtime sub-agent for C-Suite Phase 2 Ch.7 **Phase B**. The contract is `docs/decisions/0009-ch7-playbooks-home.md` (read §4, §5, §7, §8). The Phase A audit closed CONCERN-CLOSE (`docs/reviews/ch7-phase-a-audit-qa-report.md`) — the framework is now sealed; you pattern-match against it.

**Phase B scope = 4 homogeneous playbooks:**
- `gtm_realloc` (ADR §4) — CRO + CFO + CMO + CPO + COS — threshold 70
- `strategic_option` (ADR §5) — CEO + CFO + CPO + COS — threshold **80** — heavy Red-Team
- `board_narrative` (ADR §7) — all six lenses — threshold 70 — handoff CTA
- `restructure_decision` (ADR §8) — COS + CFO (+CPO if subject in product/eng/tech) — threshold **80** — heavy Red-Team

**Out of scope:** anything in Phase A (already shipped + audited). Renderer changes (Renderer is not re-invoked unless a UI gap surfaces).

## Working directory
`/Users/russellteter/Claude Code Projects/c-suite/` (quote — has spaces).

## You operate under DOCTRINE
- Truth over completion appearance. UNKNOWN if you don't know.
- Cite every claim with file_path:line.
- Pattern-match against `apps/utility/src/playbooks/cash-lever/index.ts` (the framework template) — do NOT reinvent the shape.

## Scope (yours alone — non-overlapping with Tests brief)

### 1. Four playbook modules (one directory each)

Each module lives at `apps/utility/src/playbooks/<kebab-id>/index.ts` and exports:
- `LENSES` constant — exact lens roster per ADR §3.2 table.
- `runPlaybook: PlaybookModule['runPlaybook']` — async function matching `(input, ctx) => Promise<PlaybookResult>`.
- All shape per `packages/shared-types/src/playbook.ts:1-90`. Pattern-match the cash-lever adapter (`apps/utility/src/playbooks/cash-lever/index.ts`).

#### 1a. `apps/utility/src/playbooks/gtm-realloc/index.ts`
- LENSES = `['CRO', 'CFO', 'CMO', 'CPO', 'COS']`. Threshold 70.
- Reads: Salesforce (committed pipeline + AM activity), NetSuite (GTM payroll), AWS class+collab (product-usage signals), PowerBI customer-dashboard, Gmail (recent GTM correspondence — optional).
- evaluatePrereqs: block on Salesforce auth-expired; degrade otherwise.
- Standard pipeline: parallel lens fan-out → Synthesizer → Verifier → memo.
- Memo output per ADR §4: current GTM cost vs ROI + recommended reallocation + pipeline impact projection + risks + workstream-update proposals.
- Stamps: CLEAN | DRAFT | DEGRADED.

#### 1b. `apps/utility/src/playbooks/strategic-option/index.ts`
- LENSES = `['CEO', 'CFO', 'CPO', 'COS']`. Threshold **80**.
- Reads: all MCPs. evaluatePrereqs: block if Salesforce + AWS + cash-data not all available.
- Pipeline: parallel lens fan-out → Synthesizer → **heavy Red-Team pass against the synthesized memo (NOT against lens outputs — preserve B3 invariant)** → Verifier → memo.
- Memo output per ADR §5: three options (recap / sale / wind-down / turnaround — Synthesizer picks three most-relevant given input framing). Per option: decision tree + exit criteria + prereqs to keep live + prereqs to kill. Final recommendation with confidence.
- Writebacks: prediction proposals (per-option 3-month outcome → predictions ledger) + decision proposals (if Russell pulls a trigger inside the memo) + workstream-update proposals. Per ADR §5.
- Stamps: CLEAN | DRAFT | DEGRADED.

#### 1c. `apps/utility/src/playbooks/board-narrative/index.ts`
- LENSES = `['CEO', 'CFO', 'CRO', 'CMO', 'CPO', 'COS']` (all six). Threshold 70.
- Reads: all MCPs. evaluatePrereqs: block if any of {Salesforce, NetSuite, PowerBI, calibration} unavailable.
- Standard pipeline.
- Memo output per ADR §7: narrative spine + slide skeleton (12-slide outline with per-slide data + citation) + anticipated questions (per board member, derived from stakeholder files) + recommended answers. **Memo footer always includes "Draw up for Cowork" CTA pointing to `class-brand-presentations` skill** — PRD §6 explicit.
- Writebacks: position-update proposals (positions reframed for board) + prediction proposals (anticipated board reactions). Per ADR §7.
- Stamps: CLEAN | DRAFT | DEGRADED.

#### 1d. `apps/utility/src/playbooks/restructure-decision/index.ts`
- LENSES = `['COS', 'CFO']` baseline. **Add 'CPO' if `input.context.subject.role` contains any of `['product', 'engineering', 'technical', 'CTO', 'VP Eng', 'VP Product']` (case-insensitive string check).** Threshold **80**.
- Reads: Salesforce (subject's contribution if they own pipeline), NetSuite (cash impact: severance + cost-savings + replacement-cost), Gmail (recent comms by/about), Chorus (recent calls subject was on), stakeholder file for subject.
- evaluatePrereqs: block if Salesforce + NetSuite + cash-model unavailable.
- Pipeline: parallel lens fan-out → Synthesizer → **heavy Red-Team (separate section: lawsuit risk, team-morale risk, customer-disruption risk)** → Verifier → memo.
- Memo output per ADR §8: implications (financial + organizational + signal-to-team) + sequencing + comms plan + heavy Red-Team section.
- Writebacks: decision proposal (if Russell commits inside the memo) + workstream-update (transition-cover WS) + position-update (revised position on the role).
- Stamps: CLEAN | DRAFT | DEGRADED.

### 2. Router registration

`apps/utility/src/playbooks/lib/playbookRouter.ts` — replace each Phase B `throw new Error('Phase B playbook X not yet implemented')` with the actual `runPlaybook` import. Pattern-match against how `cash_lever`, `stakeholder_1_1`, `pre_mortem`, `quick_read`, `open_qa` are wired.

### 3. evaluatePrereqs matrix

`apps/utility/src/playbooks/lib/evaluatePrereqs.ts` — already covers the Phase R Decision 4 matrix (Phase A built this; 28 spec cases pass). Verify the matrix covers each Phase B playbook's prereq decision and emit no new cases unless ADR §3.6 + §4–§8 demand it. If you DO add a case, document why in a code comment.

### 4. Run-loop integration

`apps/utility/src/orchestrator/run-loop.ts` — already switches on `playbook_id` via `routeToPlaybook(...)`. Phase B playbooks inherit the standard pipeline path (lens fan-out → Synthesizer → Verifier). Only `strategic_option` and `restructure_decision` need a hook for the heavy Red-Team pass. Add a small helper inside each of those playbook modules — do NOT modify `run-loop.ts` beyond what's already there unless absolutely necessary.

### 5. Red-Team hook for strategic_option + restructure_decision

The heavy Red-Team pass runs **against the Synthesizer's draft memo**, NOT against lens outputs. Read the Synthesizer's output, dispatch RedTeam lens with that input + the original prompt, append the Red-Team section to the memo. **B3 invariant must hold** — Red-Team input is `{ synthesizedMemo, originalPrompt }`, no lens transcripts.

Use the existing `apps/utility/src/prompts/RedTeam.prompt.md` (Phase A pre-mortem uses it too — confirm it's parameterizable enough; if not, add a `{{redteam_mode}}` template variable: 'pre_mortem' | 'strategic_option' | 'restructure_decision').

## Forbidden inferences (audit will REOPEN if you cross these)

- Patching `cash-lever`, `stakeholder-1-1`, `pre-mortem`, `quick-read`, or `open-qa` internals (Phase A is sealed).
- Modifying `evaluatePrereqs.ts` beyond adding cases per Phase B prereq table.
- Touching renderer code.
- Writing tests.
- Modifying `playbookRouter.ts` outside the four `throw` replacements.
- Touching the Verifier or its prompt.
- Adding new IPC variants (Phase A added enough; if a Phase B playbook truly needs one, surface it in your report-back).
- Long PlaybookId names (audit-fix landed short names — use them).

## What "done" looks like

- 4 playbook modules written + `pnpm typecheck` exit-0 clean across utility + shared-types.
- `playbookRouter.ts` has zero remaining "not yet implemented" throws.
- All existing tests still pass (`pnpm vitest run`). You should not break Phase A's 185 specs or Ch.0–6's specs.
- `grep -rn "from '@c-suite/shared-types/playbook'"` returns ≥1 hit per Phase B module.
- Atomic commits: one playbook per commit + 1 commit for router wiring + 1 for any Red-Team helper. `ch.7: <playbook> playbook — <why>`. No Claude attribution.

## Report-back (≤250 words)

- Commits made (SHA + first-line message).
- Per-playbook: confirmation of LENSES const + threshold + stamp set + writeback types.
- `pnpm typecheck` + `pnpm vitest run` results.
- Any contract ambiguity resolved + the decision.
- Any blocker hit + the three approaches tried.

DO NOT proceed to test writing. DO NOT write Renderer code. DO NOT close the chapter.
