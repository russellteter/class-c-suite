# Ch.5 Architect — First End-to-End Slice (Cash Lever Playbook) SPEC

## Your role

Architect for C-Suite Chapter 5 — the first usable product milestone. Cash lever playbook runs end-to-end against real Salesforce + AWS + cash-model data. Memo writes to vault via SafeWrite + git. Click-any-claim → tool-call result. DRAFT path visible. DOCTRINE law #7 — SPEC only.

This is the gate where the architecture stops being theoretical and Russell can actually use the C-Suite for the next strategic question.

## Required reads

1. `ROADMAP.md` §Ch.5 (lines ~110-122) — exit criteria.
2. `business-planning/C_Suite_PRD.md` §6 — Cash lever playbook outputs + Open Q&A capability.
3. ADRs 0001-0005 — all chapter contracts you build on.
4. `docs/architecture/ui.md` — design tokens, screen inventory, round-table honest-signal contract, 12-step mockup gate.
5. `docs/architecture/mcp.md` — Salesforce + AWS query patterns (R1-verified).
6. `docs/research/R1-connector-reality.md` — verified SF schema + SuiteQL patterns.
7. `docs/research/phase-r-decisions.md` §Decision 4 — playbook precondition matrix (Cash lever block-and-surface on NetSuite/AWS unreachable).
8. `docs/research/R0-customer-dashboard-readout.md` — PowerBI subprocess pattern (Cash lever does NOT use PowerBI; reads CRO health from Salesforce + AWS spend from cost-explorer).

## Deliverables

ONE ADR at `docs/decisions/0006-ch5-cash-lever-slice.md`. Sections:

### Section 1 — Cash lever playbook spec

What the user types: "Should we shift our W30 trough mitigation from line-of-credit draw to deferred AWS spend?"

Lenses that fire: **CFO + COS** (per PRD §6 + Phase R Decision 4). CRO/CEO/CMO/CPO optional based on question framing.

MCP queries:
- Salesforce: `committedPipelineQuery({ includeRenewals: true })` — what's the next 90 days' likely cash.
- AWS Cost Explorer: monthly spend trajectory class + collab summed (R1 patch — account count UNKNOWN until Russell runs `aws sso login` + `list-accounts`).
- NetSuite SuiteQL: `cashPositionQuery()` — 24-month bank/asset transactions.
- Cash model: read `Class_Cash_Lever_Model_v5_2026-05-18.xlsx` lever rows from vault.

Cite each tool call with `source_id`. Verifier grades. Memo writes to `vault/memos/<date>-cash-lever-<slug>.md`.

### Section 2 — UI screens (4 screens — Design Gate ritual)

Per `docs/architecture/ui.md` §12-step mockup sequence (steps 1-4 land in Ch.5):

| Step | Screen | Mockup path | Status |
|---|---|---|---|
| 1 | **Design-system sheet** | `~/Desktop/cstuite-design-step-1.html` | Mockup needed |
| 2 | **Home (stub)** | `~/Desktop/cstuite-design-step-2.html` | Mockup needed |
| 3 | **Plan-approval** | `~/Desktop/cstuite-design-step-3.html` | Mockup needed |
| 4 | **Round-table — quiet state** | `~/Desktop/cstuite-design-step-4.html` | Mockup needed |
| 5 | **Round-table — mid-run** | `~/Desktop/cstuite-design-step-5.html` | Mockup needed |
| 6 | **Round-table — synthesis stage** | `~/Desktop/cstuite-design-step-6.html` | Mockup needed |
| 7 | **Memo viewer — clean** | `~/Desktop/cstuite-design-step-7.html` | Mockup needed |
| 8 | **Memo viewer — DRAFT** | `~/Desktop/cstuite-design-step-8.html` | Mockup needed |

**Design gate decision (per DOCTRINE operating-mode override):** Russell has stated decide-and-log default. Per ROADMAP, UI mockup approval is a "Design gate" — surface as `html-driven-codev`. Under the override, mockups are still generated (`html-driven-codev` skill) but auto-approved with a 60-second countdown unless Russell explicitly intervenes. Document this in §11 (Russell ratifies the auto-approve at Ch.5 boundary; if he doesn't, the mockups present to him on launch and he approves there).

### Section 3 — Plan-approval screen contract

Per `docs/architecture/ui.md` §plan-approval. Per Phase R Decision 6 — Cash lever has universal manual approval (no countdown). Russell reviews:
- Lenses to fire (CFO + COS confirmed).
- MCPs that will be called (SF + AWS + NetSuite + cash model file).
- Estimated tokens (computed via scheduler `canDispatch()`).
- Expected memo location.

On approve: emit `run.plan.approved` IPC. Orchestrator transitions to `fan-out`.

### Section 4 — Round-table screen contract

Per `docs/architecture/ui.md` §round-table honest-signal contract. The most visible UI surface; the substance-ribbon contract:
- Lens nodes pulse on `agent.start`, off on `agent.complete`.
- Substance ribbon shows `sources: N` (live tool-calls count), `verified: —/—` until Verifier scores, `coverage: —%`.
- Heartbeat from Ch.1 ADR §7 drives the "thinking" indicator (250ms throttle).
- No animation theater — every visual element bound to a real IPC event.

### Section 5 — Memo viewer screen contract

Per `docs/architecture/ui.md` §memo viewer. CRITICAL: click-any-claim → tool-call result (PRD §4 outcome 2).

Implementation: each markdown claim with a `[^source-id]` footnote renders as a hyperlinked button. Click opens a side panel showing `tool_calls.result_json` for that call (from SQLite). Visible JSON, copyable, with tool args + timestamp.

DRAFT banner if `memo.status === 'draft'`. Failure reasons in expandable panel.

### Section 6 — Home (stub) — 8 playbook tiles + Open Q&A bar

Per `docs/architecture/ui.md` §home. Ch.5 ships a STUB version: 8 playbook tiles (only Cash lever is functional), Open Q&A bar (functional — decomposes ad-hoc). Other tiles show "Coming in Ch.7."

### Section 7 — End-to-end flow

The orchestrator routes (Ch.3 ADR §RunState machine) the cash lever run:

```
1. Russell types question → home → submit
2. Orchestrator: bootstrap state; build context bundle for CFO + COS lenses.
3. Plan-approval screen renders; Russell approves.
4. Fan-out: CFO + COS dispatch in parallel via stub-harness (CI) or real Agent SDK (live).
5. Red-Team + Steelman: dispatch sequentially after lenses.
6. Synthesizer: dispatch; produces memo markdown.
7. Verifier: dispatch with VerifierInput (Ch.3 ADR §5).
8. Rigor score lands; shipped-clean or shipped-draft.
9. Memo writes to vault via SafeWrite (Ch.2 ADR §1) + git commit.
10. Round-table closes; memo viewer opens.
11. Russell clicks a claim → tool-call result panel.
```

### Section 8 — Acceptance criteria (10-12 rows)

- E2E test: Cash lever playbook fires end-to-end on stubs (`tests/e2e/cash-lever.spec.ts`).
- Live test (Russell runs on his Mac): real SF + AWS + NetSuite → memo lands in vault.
- Click-any-claim → tool-call result panel renders.
- DRAFT path visible when rigor < 70.
- Round-table updates in real time as lens events fire.
- 4-8 mockups generated; auto-approved per Decision 6 + Doctrine override.

### Section 9 — Considered alternatives + UNKNOWN

E.g., should Cash lever auto-trigger on cash-position threshold (Ch.10 autonomy territory — keep manual in Ch.5).

### Section 10 — Surfaced to Audit/QA + Russell

- Whether Russell wants to review mockups before they ship vs auto-approve.
- The exact 8 lever rows from the cash model xlsx (parser may need to handle merged cells; surface for Ch.5 Runtime).

### Section 11 — Considered: Decision 6 auto-approve override

Per DOCTRINE override + Phase R Decision 6 default ("universal manual approval (no countdown)" for Cash lever): document the design — Cash lever requires manual approval in production. Under autonomous build (this ADR), the test-stub path bypasses approval. The mockup gate decision-and-log is a meta-decision separate from the Cash-lever-specific gate.

## Discipline

- SPEC only.
- Cite ADRs + ui.md + R1 reports.
- The 8 mockups will be GENERATED by Ch.5 Runtime via `html-driven-codev` skill (not by you).
- Resilience: write scaffold early.
- After writing ADR-0006, return structured summary <500 words: ADR path, 4-screen contract, e2e flow steps, acceptance criteria summary, UNKNOWN items.
- Sonnet OK.

## Out of scope

- Other 7 playbooks (Ch.7).
- Write-back engine (Ch.6).
- Cowork handoff (Ch.9).
- Autonomy (Ch.10).
- Packaging (Ch.11).
