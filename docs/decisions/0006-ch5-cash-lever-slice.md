# ADR-0006 — Ch.5: First End-to-End Slice (Cash Lever Playbook)

**Status**: Accepted  
**Date**: 2026-05-27  
**Author**: Backend Architect (Ch.5)  
**Grader**: Audit/QA (Ch.5 — separate per DOCTRINE law #7)  
**Depends on**: ADR-0001 (Ch.0 foundations), ADR-0002 (Ch.1 process arch), ADR-0003 (Ch.2 SafeWrite), ADR-0004 (Ch.3 runtime spine), ADR-0005 (Ch.4 prompts + rigor)  
**Implements**: ROADMAP §Ch.5 exit criteria  
**Addresses**: BLOCKERS B1 (NetSuite TBA — UNKNOWN), B19 (SF stage labels), B20 (Renewal_Date__c), B32 (AWS SSO)

---

## Context

Ch.4 locked the Verifier prompts, rigor scoring functions, and canary fixture. Every chapter before Ch.5 has been theoretical: ADRs, prompts, schemas, and test-stub harnesses. Ch.5 is the first gate where the full stack — real Salesforce + AWS Cost Explorer + NetSuite SuiteQL + cash model file → CFO + COS lenses → Synthesizer → Verifier → SafeWrite → vault git commit — runs as a single coherent operation.

The goal is usable product in Russell's hands. After Ch.5 ships: Russell types a strategic cash question, approves the run plan, watches real lens agents work in the round-table UI, reads a memo in the vault, and clicks any sourced claim to see the raw tool-call result.

This ADR is SPEC ONLY. Runtime, Test, and UI agents read this as their implementation contract. No production code ships here.

The cash lever playbook is the correct first slice because: (1) it exercises all four MCP services (Salesforce, AWS, NetSuite, cash model file), (2) it requires the full orchestration path (fan-out → adversarial → synthesis → verification → SafeWrite), and (3) it exercises the most complex UI surface (round-table with real IPC events). Succeeding here means every other playbook is a variation on a proven pattern.

---

## Section 1 — Cash Lever Playbook Spec

### 1.1 Question form

The canonical Ch.5 demonstration question:

> "Should we shift our W30 trough mitigation from line-of-credit draw to deferred AWS spend?"

Any question decomposed into a cash lever strategy belongs to this playbook. The orchestrator's `classifyPlaybook()` function matches on question semantics against the playbook registry; Cash lever is keyed on concepts `{cash, trough, W30, line-of-credit, AWS spend, deferred, leverage}`.

### 1.2 Lenses that fire

Per PRD §6 + Phase R Decision 4, the Cash lever playbook fires:

| Lens | Role | Required | Source |
|---|---|---|---|
| **CFO** | Cash position, covenant, LoC vs deferred-spend tradeoff | Required | `apps/utility/src/prompts/cfo.prompt.md` |
| **COS** | Operational risk, execution feasibility of deferred AWS spend | Required | `apps/utility/src/prompts/cos.prompt.md` |
| CEO | Strategic framing of the tradeoff | Optional — fires if question explicitly asks "what should we do" | `apps/utility/src/prompts/ceo.prompt.md` |
| CRO | Pipeline risk — what does committed pipeline say about whether we need the LoC | Optional — fires if question mentions revenue or pipeline | `apps/utility/src/prompts/cro.prompt.md` |
| CMO | Market signal — AWS spend deferral as signal to employees or customers | Skip in Ch.5 (low marginal signal for cash-specific question) | — |
| CPO | Product delivery risk of deferred AWS spend | Optional — fires if question mentions product or delivery risk | `apps/utility/src/prompts/cpo.prompt.md` |

**Default for Ch.5 demo question**: CFO + COS only. Red-Team and Steelman dispatch after both lens outputs complete (per ADR-0004 §agent dispatch sequence).

### 1.3 MCP queries

Each query emits a `source_id` referenced in the memo as `[^source-id]`. The Verifier grades every source claim against the actual tool-call result stored in SQLite.

#### Salesforce — committed pipeline

**Query builder**: `committedPipelineQuery({ includeRenewals: true })`  
**Purpose**: CFO lens — 90-day likely cash inflow from committed + late-stage pipeline  
**Source**: `docs/architecture/mcp.md` §Salesforce typed SOQL builder  
**R1 correction (B19)**: Stage labels patched from spec-original to verified R1 values.

```typescript
committedPipelineQuery({
  stagesIn: [
    // New-business committed (R1 verified 2026-05-26)
    'Verbal Agreement', 'Verbal Approval', 'Contracting', 'Quote in Review', 'Negotiation',
    // Renewal-pipeline late (R1 verified)
    'Renewal Quote Sent', 'Qualified Renewal',
  ],
  activeAm: true,
})
```

Returns: `{ id, name, amount, closeDate, stageName, account.name, accountManager.name }[]`  
Cited as: `[^sf-pipeline-<run-ts>]`

#### AWS Cost Explorer — spend trajectory

**Query builder**: `awsSpendSummary({ months: 6 })`  
**Purpose**: CFO lens — monthly spend for `class` + `collab` profiles; basis for "how much is deferrable"  
**Source**: `docs/architecture/mcp.md` §AWS  
**UNKNOWN (B32 / account-count)**: Exact account count across `class` + `collab` profiles unknown until Russell runs `aws sso login && aws organizations list-accounts`. The query sums cost by service across all accounts under each profile; if SSO is expired the call degrades gracefully (Decision 5: flag `auth_expired: aws`, skip AWS lens section, surface re-login prompt in plan-approval screen).

```typescript
awsSpendSummary({ months: 6, profiles: ['class', 'collab'] })
```

Returns: `{ month, service, totalCost, currency }[]` summed across both profiles  
Cited as: `[^aws-spend-<run-ts>]`

#### NetSuite — cash position

**Query builder**: `cashPositionQuery()` — 24-month bank/asset transaction history  
**Purpose**: CFO lens — current cash runway; context for LoC vs deferral decision  
**Source**: `docs/architecture/mcp.md` §NetSuite SuiteQL builder  
**R1 verified (2026-05-26)**: Live SuiteQL works; monthly cash nets confirmed ($-6.5M to +$21.7M range observed). Subsidiaries: Class Technologies Inc. (1), Class Parent Holdco LLC (2), Ele-Class Parent Holdco LLC (3), Consolidated (-2).  
**UNKNOWN (B1)**: For Ch.5 Phase R / Synthesizer-stage research: queries run via the loaded `mcp__claude_ai_Class_Technologies_NetSuite__*` MCP. For the standalone Electron app's runtime: requires TBA tokens (Brian's outstanding task, BLOCKERS B1). Ch.5 stub test uses mock fixture; live test requires B1 resolved.

```typescript
cashPositionQuery()
// Returns: { month, netAmount, acctType, acctNumber }[]
// Consolidated across subsidiaries; foreigntotal for FX-correct cash
```

Cited as: `[^ns-cash-<run-ts>]`

#### Cash model — lever rows

**Source**: `Class_Cash_Lever_Model_v5_2026-05-18.xlsx` in vault  
**Vault path**: `UNKNOWN` — must resolve to exact path under `/Users/russellteter/Documents/Claude/Projects/Business Planning/` at Ch.5 runtime. Surface for Russell to confirm via Day-Zero form or first-run prompt.  
**Parser concern (surfaced to Russell)**: The xlsx contains merged cells in the lever-row table. The parser must handle merged-cell spans. `xlsx` npm package with `cellMerges` detection is the implementation approach; verify at Ch.5 runtime.  
**Purpose**: CFO lens — the specific lever rows (LoC draw amount, AWS spend deferral capacity, cash release from each) provide the quantitative basis for the recommendation  
**Read method**: `readXlsxLeverRows(vaultPath)` utility in `apps/utility/src/data/cash-model.ts`

```typescript
// Returns: { leverName, currentValue, adjustedValue, cashImpact, notes }[]
// Exact lever-row schema TBD pending xlsx inspection at Ch.5 runtime.
readXlsxLeverRows(resolvedVaultPath)
```

Cited as: `[^cash-model-<run-ts>]`

### 1.4 Degraded-mode matrix (Decision 4)

| Condition | Behavior |
|---|---|
| NetSuite unreachable (TBA not provisioned or network timeout) | **Block** — CFO lens cannot run without cash position. Plan-approval screen shows blocker banner: "NetSuite unreachable — resolve before running." |
| AWS SSO expired | **Degrade** — skip AWS section in CFO analysis, flag `degraded: aws` in memo header. CFO lens continues on SF + NS + cash model alone. |
| Salesforce auth expired | **Block** (same as GTM rule from Decision 4) — surface re-consent prompt; do not run partial. |
| Cash model xlsx not found | **Degrade** — CFO runs without lever-row quantification; flags "cash model unavailable — lever rows not quantified" in memo. |
| Cash data >24h stale | Do not block; render "stale by N hours" banner in memo header. |

### 1.5 Memo output

Written by SafeWrite (ADR-0003 §1) to:

```
{vault}/memos/{YYYY-MM-DD}-cash-lever-{slug}.md
```

Where `slug` is a 3-word kebab summary of the question (generated by Synthesizer). Example: `2026-05-27-cash-lever-loc-vs-deferred-aws.md`

If SafeWrite concurrent-write check detects a conflict: writes `.proposed-{ts}.md` sidecar (Decision 1).  
Git commit fires via post-SafeWrite hook. Commit message: `memo: cash lever — {slug} ({rigorStatus})`.

---

## Section 2 — UI Screens (Design Gate Contracts)

Ch.5 covers mockup steps 1–8 per `docs/architecture/ui.md` §12-step sequence. The 8 HTML mockups are generated by Ch.5 Runtime via `html-driven-codev` skill, written to `~/Desktop/cstuite-design-step-{N}.html`.

**Design gate decision (per DOCTRINE operating-mode override + Decision 6):** Mockup approval uses auto-approve with 60-second countdown (the meta-decision about whether to review mockup designs is distinct from the per-playbook plan-approval UX, which requires manual approval for cash lever). If Russell does not intervene during the countdown, mockups are auto-approved and logged. Russell can override at Ch.5 boundary by editing this ADR.

| Step | Screen | File | Status |
|---|---|---|---|
| 1 | Design-system sheet | `cstuite-design-step-1.html` | Generated by Ch.5 Runtime |
| 2 | Home (stub) | `cstuite-design-step-2.html` | Generated by Ch.5 Runtime |
| 3 | Plan-approval | `cstuite-design-step-3.html` | Generated by Ch.5 Runtime |
| 4 | Round-table — quiet | `cstuite-design-step-4.html` | Generated by Ch.5 Runtime |
| 5 | Round-table — mid-run | `cstuite-design-step-5.html` | Generated by Ch.5 Runtime |
| 6 | Round-table — synthesis | `cstuite-design-step-6.html` | Generated by Ch.5 Runtime |
| 7 | Memo viewer — clean | `cstuite-design-step-7.html` | Generated by Ch.5 Runtime |
| 8 | Memo viewer — DRAFT | `cstuite-design-step-8.html` | Generated by Ch.5 Runtime |

---

## Section 3 — Plan-Approval Screen Contract

**Source**: `docs/architecture/ui.md` §plan-approval + Phase R Decision 6  
**Cash lever mode**: Universal manual approval — NO countdown (Decision 6 locked; high-stakes cash decision).

### 3.1 What renders in the plan-approval screen

| Field | Value rendered | Source |
|---|---|---|
| **Question** | Verbatim user input | `runState.question` |
| **Playbook** | "Cash Lever vs Trough Analysis" | `runState.playbook` |
| **Lenses to fire** | CFO (required), COS (required), [optional lenses if triggered] | `runPlan.lenses[]` |
| **MCPs to call** | Salesforce Pipeline, AWS Cost Explorer, NetSuite Cash, Cash Model xlsx | `runPlan.mcpCalls[]` |
| **Estimated tokens** | Computed via `scheduler.canDispatch()` pre-check | `scheduler.estimate()` |
| **Estimated cost** | `estimatedTokens × cost-per-token` | derived |
| **Expected memo path** | `{vault}/memos/{date}-cash-lever-{slug}.md` (slug TBD post-approval) | `runPlan.memoPath` |
| **Degraded-mode warnings** | Banner if any MCP is currently unreachable | `runPlan.degradations[]` |

### 3.2 Action buttons

| Button | IPC emitted | Behavior |
|---|---|---|
| **Approve** | `run.plan.approved` | Orchestrator transitions to `fan-out` state |
| **Edit** | `run.plan.edit` | Opens inline editor for lenses list (add/remove optional lenses) |
| **Cancel** | `run.plan.cancelled` | Orchestrator transitions to `idle`; no MCP calls made |

### 3.3 Scheduler pre-check

Before plan-approval renders, `scheduler.canDispatch({ planId })` runs:
- If token budget would exceed `config.maxTokensPerRun`: blocks with "run would exceed token budget" warning.
- If cumulative-daily cost would exceed `config.dailyCostCap`: blocks with "daily cost cap reached."
- Both are surfaced as non-dismissable banners; Edit or Cancel are the only actions.

---

## Section 4 — Round-Table Screen Contract

**Source**: `docs/architecture/ui.md` §round-table honest-signal contract  
**Key law**: Every visual element bound to a real IPC event. No animation theater.

### 4.1 Node layout for cash lever (CFO + COS default)

```
[ CFO node ]  [ COS node ]  [ (CEO node — dim) ]  [ (CRO node — dim) ]
                    ↓ (edges animate on tool-call in-flight)
            [ Red-Team node ]  [ Steelman node ]
                    ↓
              [ Synthesizer node ]
                    ↓
               [ Verifier node ]
```

Optional-but-not-firing nodes render as dim/inactive. Prevents layout shift when an optional lens fires.

### 4.2 IPC bindings — complete map

| Visual element | IPC event binding | State: active | State: idle |
|---|---|---|---|
| Lens node pulse | `agent.start` → on; `agent.complete` → off | Pulsing ring in `--color-purple-500` | Static node border |
| Edge CFO/COS → orchestrator | `agent.tool.pre` → animated; `agent.tool.post` → static | Animated dash in purple | Static edge |
| Substance ribbon `sources: N` | `tool_calls` count per agent (live increment) | Integer counting up | `—` |
| Substance ribbon `verified: X/N` | `verifier.score` event (per-source PASS count) | "4/6", "2/4", etc. | `—` until Verifier runs |
| Substance ribbon `coverage: P%` | `verifier.score` event (coverage metric) | "82%", "61%", etc. | `—` until Verifier runs |
| Synthesizer node lit | `synthesizer.draft` event | Gold pulse | Static |
| Verifier node color | `verifier.score` value | Green (≥70), Amber (50-69), Red (<50) | Gray |
| DRAFT banner | `memo.status === 'draft'` | Visible amber banner | Hidden |
| Heartbeat "thinking" | Ch.1 ADR §7 heartbeat; 250ms throttle | Dot animation | No animation |
| Cost meter (header strip) | `token.count` live event | Live token count | Frozen at last value |

### 4.3 Animation theater rule

`—` (em-dash) is the default for every uncomputed metric. Never show `0` or `Pending…` for metrics that haven't computed yet. `sources: 0` is ambiguous (did the lens find nothing, or has it not started?). `sources: —` is honest.

### 4.4 250ms throttle

The heartbeat from Ch.1 ADR §7 drives the "thinking" indicator. IPC events may arrive faster than render cycles. The renderer throttles visual updates to 250ms (4 frames/sec for status; full-rate for tool-call edges which are one-shot events and should render immediately).

---

## Section 5 — Memo Viewer Screen Contract

**Source**: `docs/architecture/ui.md` §memo viewer + ROADMAP §Ch.5 exit criteria ("Click any claim → see tool-call result")

### 5.1 Memo rendering

Memo markdown stored in vault renders as styled HTML in the memo viewer. Design tokens from `docs/architecture/ui.md` §design tokens apply.

Header strip:

```
[ Rigor badge: CLEAN 87 | DRAFT amber ]   [ Date ]   [ Playbook: Cash Lever ]   [ Cost: $0.84 ]
```

Rigor badge color:
- `--color-rigor-clean` (gold) when score ≥ 70 and `memo.status === 'clean'`
- `--color-rigor-draft` (amber) when `memo.status === 'draft'`
- `--color-rigor-fail` (red) when Verifier hard-failed

### 5.2 Click-any-claim → tool-call result panel

**This is the core PRD §4 outcome 2 requirement.** Every quantitative or named-entity claim in the memo that carries a `[^source-id]` footnote renders as a hyperlinked citation button inline in the text.

Rendering contract:

```
"The committed pipeline for the next 90 days totals $4.2M [^sf-pipeline-2026-05-27]"
                                                          ↑ rendered as clickable badge
```

Click behavior:
1. Side panel slides in (80vw remaining for memo, 20vw for panel).
2. Panel header: tool name, service, timestamp, run ID.
3. Panel body: `tool_calls.result_json` from SQLite — full JSON, syntax-highlighted, copyable.
4. Panel shows: tool args + response + any error (if the source is a degraded/failed call, it shows the error honestly).

SQLite read: `SELECT result_json, tool_name, tool_args, completed_at FROM tool_calls WHERE source_id = ?`

### 5.3 DRAFT path

When `memo.status === 'draft'` (rigor score < 70):

1. Amber `DRAFT` banner at top of memo — full-width, dismissable only after Russell explicitly acknowledges.
2. Expandable "Why draft?" panel showing Verifier's `failure_reasons[]` in plain language.
3. Memo is still readable and full-featured — all citations work, all claims present. DRAFT is a signal, not a gate.
4. SafeWrite writes to vault as `.draft.md` suffixed file; no `.md` clean-memo path until rigor ≥ 70 or Russell explicitly promotes.

**Source**: `docs/architecture/data.md` §SafeWrite DRAFT path (BLOCKERS B8 mitigation).

### 5.4 Failure-reason panel format

Each Verifier failure reason renders as:

```
• [UNSOURCED CLAIM] "AWS spend is growing 30% YoY" — no tool call returned this figure.
• [COVERAGE GAP] CFO lens only cited 4 of 6 required sources.
• [STALE SOURCE] NetSuite cash data is 26 hours old (threshold: 24h).
```

---

## Section 6 — Home Screen (Stub Contract)

**Source**: `docs/architecture/ui.md` §home screen inventory + ROADMAP §Ch.5 exit criteria

Ch.5 ships a functional stub. Full home ships in Ch.7.

### 6.1 8 Playbook tiles

| Tile | Status in Ch.5 | Label |
|---|---|---|
| Cash Lever vs Trough | **Functional** | Clickable; launches flow |
| Stakeholder 1:1 Prep | Coming Ch.7 | Dimmed; tooltip "Coming in Chapter 7" |
| Quick Multi-Lens Read | Coming Ch.7 | Dimmed |
| Pre-mortem on Proposed Action | Coming Ch.7 | Dimmed |
| GTM Resource Reallocation | Coming Ch.7 | Dimmed |
| Strategic Option Evaluation | Coming Ch.7 | Dimmed |
| Board Narrative Prep | Coming Ch.7 | Dimmed |
| Restructure Decision | Coming Ch.7 | Dimmed |

### 6.2 Open Q&A bar

Single text input below the 8 tiles. Functional in Ch.5. When text is submitted:

1. Orchestrator runs `classifyPlaybook(question)`.
2. If matches a known playbook: route to that playbook's plan-approval screen.
3. If no match: route to ad-hoc decomposition path; memo stamps `AD-HOC`.

Open Q&A bar plan-approval mode: 10-second auto-approve countdown (Decision 6).

### 6.3 Stub elements (present but empty in Ch.5)

- Tripwire proximity strip: renders with "—" values until Ch.10.
- Cost meter: renders with live token count (wired from Ch.1) but no cumulative-daily until Ch.10.
- Job-status strip: absent until Ch.10.
- Recent memos: absent until Ch.7.

---

## Section 7 — End-to-End Flow

The orchestrator routes via the Ch.3 ADR-0004 RunState machine. For the cash lever playbook:

```
Step 1  Russell types question → Home screen → submits via tile or Open Q&A bar
Step 2  classifyPlaybook() identifies "Cash lever vs trough"
Step 3  buildRunPlan(): lenses=[CFO, COS], mcps=[SF, AWS, NS, cash-model], 
        memoPath=computed, tokenEstimate=computed
Step 4  Plan-approval screen renders; Russell reviews and clicks Approve
        → IPC: run.plan.approved
Step 5  Orchestrator transitions to fan-out state
        → CFO + COS agents dispatch in parallel via Agent SDK
        → Each agent: tool calls fire (SF pipeline, AWS spend, NS cash, xlsx lever rows)
        → IPC: agent.start, agent.tool.pre, agent.tool.post, agent.complete per agent
Step 6  Red-Team agent dispatches after both lens outputs complete
        → Red-Team challenges: cash model assumptions, pipeline reliability
Step 7  Steelman agent dispatches
        → Steelman defends the stronger case for deferred AWS vs LoC draw
Step 8  Synthesizer dispatches with {CFO output, COS output, Red-Team, Steelman, context}
        → Produces memo markdown with [^source-id] citations
        → IPC: synthesizer.draft
Step 9  Verifier dispatches with VerifierInput (ADR-0005 §Verifier input contract)
        → Grades per-claim, coverage, sourcing
        → IPC: verifier.score { score, status, failureReasons }
Step 10 Rigor score routes:
        → score ≥ 70: memo.status = 'clean'; SafeWrite to vault/{date}-cash-lever-{slug}.md
        → score < 70:  memo.status = 'draft'; SafeWrite to vault/{date}-cash-lever-{slug}.draft.md
Step 11 Git commit fires via post-SafeWrite hook
        → Commit: "memo: cash lever — {slug} ({CLEAN|DRAFT})"
Step 12 Round-table transitions to complete; verifier node colors with rigor signal
Step 13 Memo viewer opens automatically (or user clicks notification)
Step 14 Russell clicks a claim badge → side panel shows raw tool-call result_json
```

---

## Section 8 — Acceptance Criteria

| # | Criterion | Pass condition | Test location |
|---|---|---|---|
| AC1 | E2E stub test fires end-to-end | `tests/e2e/cash-lever.spec.ts` runs green; all 4 MCPs mocked; memo lands in test-vault path | CI |
| AC2 | Live test: real Salesforce | `committedPipelineQuery()` with R1-verified stage labels returns non-empty result against `classedu.my.salesforce.com` | Russell runs on Mac |
| AC3 | Live test: real AWS | `awsSpendSummary({ months: 6 })` returns spend data for `class` + `collab` profiles (requires valid SSO session) | Russell runs on Mac |
| AC4 | Live test: real NetSuite | `cashPositionQuery()` returns ≥12 months of data against Class production MCP | Russell runs on Mac (requires B1 resolved for Electron path) |
| AC5 | Live test: cash model xlsx parsed | `readXlsxLeverRows()` returns ≥1 lever row from vault xlsx; merged-cell handling verified | Russell runs on Mac |
| AC6 | Full run memo lands in vault | `vault/memos/{date}-cash-lever-*.md` or `.draft.md` exists after live run | Russell runs on Mac |
| AC7 | Click-any-claim → tool-call result | Click on `[^sf-pipeline-*]` badge in memo viewer opens side panel with non-empty `result_json` | Russell manual verify |
| AC8 | DRAFT path visible | Fixture run with forced rigor=65 shows amber DRAFT banner + expandable failure-reasons panel | `tests/e2e/cash-lever-draft.spec.ts` |
| AC9 | Round-table substance ribbon real-time | `sources: N` increments live as tool calls complete; `verified: —/—` until Verifier fires; final value matches Verifier output | E2E test with event assertion |
| AC10 | Plan-approval manual gate enforced | No MCP calls are made before `run.plan.approved` IPC is received; cancel aborts cleanly | `tests/unit/plan-approval.spec.ts` |
| AC11 | 8 UI mockups generated | `~/Desktop/cstuite-design-step-{1..8}.html` all exist post Ch.5 Runtime execution | Ch.5 Runtime |
| AC12 | Degraded-mode: AWS SSO expired handled | With AWS SSO expired, run completes with `degraded: aws` flag in memo; no crash; plan-approval shows warning | `tests/e2e/cash-lever-degraded.spec.ts` |

---

## Section 9 — Alternatives Considered + UNKNOWNs

### Alternatives considered

**Auto-trigger on cash-position threshold.** The Cash lever playbook could fire automatically when NetSuite cash drops below a configurable threshold (e.g., <60 days runway). Rejected for Ch.5: this is Ch.10 autonomy territory. Manual trigger only in Ch.5 ensures Russell stays in control during the first live slice. Autonomy threshold trigger is explicitly parked in `ROADMAP.md` §Ch.10.

**Collapse CFO + COS into a single "finance" lens.** The PRD defines six distinct C-suite lenses for good reason: each voice is structurally different. Merging CFO + COS would lose the operational feasibility check (COS's domain) and conflate strategic finance judgment (CFO) with delivery risk. Rejected.

**Run all 6 lenses for cash lever question.** Over-specced for a cash-specific question. CMO and CPO signals are low-value for "LoC vs deferred AWS spend." Runs faster with CFO + COS + optional CRO. Optional lenses are in the plan schema if question framing expands scope.

**Use PowerBI for CRO health signal.** R0 readout (`docs/research/R0-customer-dashboard-readout.md`) documents the PowerBI subprocess pattern but also notes B2 (PowerBI signals per playbook need confirmation). For the cash lever question, CRO health reads from Salesforce `Customer_Health_Level__c` + `Renewal_at_Risk__c` (R1 verified fields). PowerBI is reserved for richer customer-health signals in later playbooks.

### UNKNOWNs

| UNKNOWN | ID | Impact | Resolution path |
|---|---|---|---|
| AWS account count + exact profile structure | B32 | `awsSpendSummary` may need to enumerate sub-accounts; profile names beyond `class` + `collab` unknown | Russell runs `aws sso login && aws organizations list-accounts`; report to Ch.5 Runtime |
| NetSuite TBA tokens | B1 | Required for standalone Electron app's MCP calls; not blocking Phase R / Claude Code session use | Brian issues TBA tokens; Russell provisions in Settings |
| Cash model xlsx exact vault path | — | `readXlsxLeverRows()` needs resolved path | Russell confirms via Day-Zero form or first-run prompt |
| Cash model xlsx lever row schema | — | Parser must handle merged cells; exact column structure unknown until file is inspected | Ch.5 Runtime inspects file; surfaces schema in AC5 |
| Exact 8 lever rows in xlsx | — | CFO lens quantitative basis depends on these | Ch.5 Runtime parser extracts; surfaces for Russell review |

---

## Section 10 — Surfaced to Audit/QA + Russell

1. **Mockup approval gate**: Russell has stated decide-and-log default (DOCTRINE operating-mode override). The 8 mockups auto-approve with 60-second countdown unless Russell explicitly intervenes. Russell ratifies this at Ch.5 boundary; if he wants to review mockups interactively instead, he edits Section 2 of this ADR before Ch.5 Runtime runs.

2. **Cash model xlsx parsing**: The exact lever rows and their schema are unknown until the file is inspected. The Ch.5 Runtime agent must: (a) locate the file in vault, (b) parse it with merged-cell handling, (c) surface the extracted rows for Russell's review before the first live run (AC5). If merged cells are malformed or the row structure differs from expected, the cash model source degrades gracefully per Section 1.4.

3. **NetSuite B1 blocker**: The live AC4 test requires TBA tokens. Audit/QA should mark AC4 as "BLOCKED: B1" until Brian provisions the tokens. The E2E stub test (AC1) does not require this.

---

## Section 11 — Decision 6 Auto-Approve Override

There are two distinct "approval" concepts in Ch.5 that must not be conflated:

**Meta-decision: mockup design approval.** The 8 HTML mockups that Ch.5 Runtime generates represent UI design choices. Under DOCTRINE operating-mode override, Russell has opted for "decide and log" as default. The mockup gate uses 60-second auto-approve countdown. If Russell does not intervene, the design proceeds. This is a build-process decision, not a product runtime decision.

**Product runtime: plan-approval gate for Cash lever runs.** Per Phase R Decision 6, the Cash lever vs Trough playbook has **universal manual approval — no countdown**. This is locked because (a) it involves potentially triggering a LoC draw vs deferring AWS spend decisions — high-stakes, (b) the PRD mandates plan-approval as a trust mechanism (PRD §3 locked principle: "no action without plan approval"), and (c) Decision 6 explicitly calls this out.

These two approvals are structurally separate. The build-process auto-approve does not override the product-runtime plan-approval gate. The plan-approval screen renders with Approve / Edit / Cancel and no countdown for all cash lever runs.

**Stub test bypass**: In `tests/e2e/cash-lever.spec.ts`, the plan-approval step is stubbed via IPC injection (`ipcMain.emit('run.plan.approved', ...)`). This is test infrastructure only; the production code path requires the human-click event.

---

## Dependencies

| Chapter | What Ch.5 consumes |
|---|---|
| Ch.1 (ADR-0002) | Heartbeat IPC (250ms throttle for round-table "thinking" indicator); cost-meter event stream |
| Ch.2 (ADR-0003) | `SafeWrite()` function; sidecar `.proposed-{ts}.md` conflict pattern; git post-write hook |
| Ch.3 (ADR-0004) | RunState machine (`fan-out`, `idle`, `complete`); `canDispatch()` scheduler; Agent SDK dispatch harness; IPC event bus |
| Ch.4 (ADR-0005) | CFO + COS + Red-Team + Steelman + Synthesizer + Verifier prompt files; `rigorScore()` pure function; `buildVerifierInput()` assembler; `VerifierInput` schema |

## What Ch.6 inherits from Ch.5

- Memo format with `[^source-id]` citations (write-back review pane reads the same memo)
- SafeWrite vault path convention (write-back engine writes to same vault root)
- RunState machine (iterative feedback re-run is a RunState sub-cycle)
- Substance ribbon IPC event pattern (write-back review pane adds no new event types)
