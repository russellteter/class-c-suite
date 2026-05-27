# ADR-0009 — Eight Playbooks + Open Q&A + Home Screen (Ch.7)

**Status:** Accepted
**Date:** 2026-05-27
**Owner:** /goal Phase 2 — Ch.7 architect
**Builds on:** ADR-0004 (Ch.3 runtime spine), ADR-0006 (Ch.5 cash-lever slice), ADR-0008 (Ch.6 writebacks), `docs/architecture/runtime.md`, `docs/architecture/ui.md`, `docs/architecture/prompts.md`, `docs/architecture/data.md`, `docs/research/phase-r-decisions.md`
**Closes:** ROADMAP.md §Ch.7 acceptance criteria; PRD §6 (8 V1 playbooks + Open Q&A + home screen); PRD §4 outcome #1.
**Inherits closed:** B45 (utility crash-loop) and B44 (utility TS errors) closed 2026-05-27. Runtime spine + IPC port handshake confirmed operational.

---

## 1. Problem

Ch.5 shipped one playbook (Cash lever). Ch.6 shipped the write-back loop. Ch.7 must:
1. Add the remaining seven playbooks (GTM realloc, Strategic option, Stakeholder 1:1 prep, Board narrative, Restructure decision, Pre-mortem, Quick multi-lens) plus Open Q&A.
2. Replace the Ch.5 stub home screen with the live operational dashboard (8 playbook tiles + Open Q&A bar + workstream mini-view + decisions strip + writeback count + scheduled-job strip + cost meter).
3. Each playbook fires its correct lenses + threshold + stamp + degraded-mode behavior per Phase R Decision 4.

Today (post-Ch.6): `apps/utility/src/playbooks/cash-lever/` is the inherited shape. `apps/renderer/src/screens/Home.tsx` is a Ch.5 stub. `apps/utility/src/orchestrator/run-loop.ts` (post B44 fix) drives a single-playbook flow but does not switch on `playbook_id`. `WritebackPane` + `ConversationPane` + `AcceptedHistory` (Ch.6) exist standalone — no navigation surface ties them to a playbook tile yet.

## 2. Decision

Ship Ch.7 as **§3 framework + §4–10 per-playbook contracts + §11–12 home + Open Q&A + §13 spec-gap locks**. One ADR; no per-playbook spin-out. Build dispatches as **four parallel sub-agents** matching the Ch.6 split: Runtime (utility-side playbook orchestration), Renderer (home + tile + Open Q&A bar + playbook entry-flows), Tests (specs + integration), Dev-Wiring (any missing dev-script glue surfaced). **Intermediate audit checkpoint after the 3 novel-structure playbooks land (pre-mortem, quick-read, stakeholder-prep) before the 4 homogeneous playbooks** — see §14.

---

## 3. Framework (applies to all 7 remaining playbooks)

### 3.1 Playbook contract (every playbook in `apps/utility/src/playbooks/<id>/index.ts`)

Each playbook directory exposes a single `runPlaybook(input, ctx) → PlaybookResult` function. The shape inherits from `apps/utility/src/playbooks/cash-lever/index.ts`:

```ts
// packages/shared-types/src/playbook.ts (new)
export interface PlaybookContext {
  runId: string;
  db: Database.Database;
  vaultPath: string;
  emit: (msg: IpcMessage) => void;
  // The deps the playbook may need; each playbook declares which it consumes.
  deps: PlaybookDeps;
}

export interface PlaybookDeps {
  salesforce?: SalesforceClient;
  netsuite?: NetSuiteClient;
  aws?: AwsClient;
  gmail?: GmailClient;
  chorus?: ChorusClient;
  powerbi?: PowerBiClient;
  calibration?: CalibrationReader;
}

export interface PlaybookInput {
  playbookId: PlaybookId;
  prompt: string;                       // user's framing
  context?: Record<string, unknown>;    // playbook-specific (target stakeholder, proposed action, etc.)
}

export interface PlaybookResult {
  memoMarkdown: string;
  degradedSources: DegradedSource[];
  lensOutputs: Record<LensRole, unknown>;
  stamps: Stamp[];                      // QUICK_READ | DECOMPOSED_AD_HOC | DRAFT | CLEAN
  rigorScore: number | null;            // null when Verifier was bypassed (quick_read)
  rigorThreshold: number;
  proposedWritebacks: ProposedWriteback[];  // Ch.6 schema; quick_read returns []
}
```

`PlaybookId` is the discriminated union: `'cash_lever' | 'gtm_realloc' | 'strategic_option' | 'stakeholder_1_1' | 'board_narrative' | 'restructure_decision' | 'pre_mortem' | 'quick_read' | 'open_qa'`.

### 3.2 Lens routing — codified, not lens-discovered

Each playbook's lens roster is a **constant** read from `apps/utility/src/playbooks/<id>/index.ts:LENSES`. The orchestrator does not "decide" which lenses fire; the playbook's module declares the set, the orchestrator dispatches. Forks per Phase R Decision 4 prereq matrix happen inside the playbook module, **after** dispatch (each lens degrades if its source is unavailable; the playbook block-rule may short-circuit before dispatch).

| Playbook | Lenses (in dispatch order) | Rigor threshold | Special pipeline |
|---|---|---|---|
| `cash_lever` (Ch.5) | CFO + COS | 70 | Standard |
| `gtm_realloc` | CRO + CFO + CMO + CPO + COS | 70 | Standard |
| `strategic_option` | CEO + CFO + CPO + COS | **80** | Standard + heavy Red-Team |
| `stakeholder_1_1` | COS only | 70 | Single-lens fast lane (no parallel fan-out) |
| `board_narrative` | All six (CEO + CFO + CRO + CMO + CPO + COS) | 70 | Standard |
| `restructure_decision` | COS + CFO (+ CPO if subject's role is product/eng/tech-strategy) | **80** | Standard + heavy Red-Team |
| `pre_mortem` | **lenses skipped**; Red-Team + Steelman primary | 70 | Adversarial-first (see §3.4) |
| `quick_read` | All six | **N/A (Verifier bypassed)** | No Red-Team, no Verifier, no writeback (see §3.5) |
| `open_qa` | Dynamic (orchestrator decomposes ad-hoc; see §12) | **85 (cap, not threshold)** | Ad-hoc decomposition (see §12) |

### 3.3 Stamps — what the memo header shows

Stamps render in the memo header as colored pills. Multiple stamps may co-exist (e.g. `DRAFT + DEGRADED`).

- `CLEAN` — `rigorScore >= rigorThreshold` and no degraded sources. Green.
- `DRAFT` — `rigorScore < rigorThreshold`. Yellow. Reason expandable in memo header.
- `QUICK_READ` — playbook == `quick_read`. Gray. No rigor score shown — only token-meter ribbon. **See §13.5.**
- `DECOMPOSED_AD_HOC` — playbook == `open_qa`. Gray. Rigor capped at 85.
- `DEGRADED` — `degradedSources.length > 0`. Yellow border. Per-source flags inline.
- `STAKEHOLDER_SKELETON` — `stakeholder_1_1` ran against an auto-skeleton (file missing). Yellow. Banner in memo body.
- `ADVERSARIAL_ONLY` — `pre_mortem`. Red border (visible warning that this is a stress-test, not a lens-grounded memo).

### 3.4 `pre_mortem` adversarial-first pipeline

Pre-mortem skips the six-lens fan-out entirely. The runtime dispatches **Red-Team first**, then **Steelman**, then synthesizes the failure-mode memo. No CFO/CRO/CMO/CPO/CEO/COS lens output is read by the Synthesizer. Verifier still runs (grades citation discipline + adversarial-stamp invariant), threshold 70.

Output shape:
- **Failure modes** (ranked by likelihood × severity).
- **Early-warning signals** (each tied to a tripwire condition).
- **Mitigation moves** (per top-3 failure modes).
- **Response playbook** (if the failure manifests, the first-72hr actions).

Citation discipline: every "early-warning signal" claim must cite a source (workstream tripwire, predictions ledger entry, or recent pre-mortem) — Verifier enforces.

### 3.5 `quick_read` no-Verifier pipeline

Quick-read runs all six lenses in parallel, then a **lightweight aggregator** (not the Synthesizer prompt) concatenates lens outputs in a fixed six-section memo. The Verifier is bypassed entirely (`shipStatus` returns `'quick'`). Writebacks are disabled (`proposedWritebacks: []`). Stamp: `QUICK_READ`.

**Rigor display.** Memo header shows the token-meter ribbon only — no rigor score, no breakdown. PRD §6 frames this as "six angles in 90 seconds" — the QUICK_READ stamp itself is the quality signal. **See §13.5 for the explicit no-score decision.**

**Dispatch behavior.** Plan-approval is inline (no plan screen) per Phase R Decision 6. The home tile click → immediate prompt input → immediate fan-out.

### 3.6 Degraded-mode + block rules (Phase R Decision 4 verbatim)

The block/degrade behavior table from `docs/research/phase-r-decisions.md` §Decision 4 is the canonical source. Each playbook's `runPlaybook` calls a shared `evaluatePrereqs(playbookId, deps) → PrereqDecision` helper:

```ts
type PrereqDecision =
  | { kind: 'block'; reason: string; remediation: string }
  | { kind: 'degrade'; flags: DegradedSource[] }
  | { kind: 'proceed' };
```

On `block`: the orchestrator surfaces the reason + remediation on the playbook tile (modal), does not enter a run, returns to home. On `degrade`: the run proceeds; degraded flags propagate into the memo header and `proposedWritebacks` are still allowed (Synthesizer authors them with the degraded context).

### 3.7 Stakeholder-skeleton helper (Decision 4 verbatim)

For `stakeholder_1_1` when the target stakeholder file is missing, the runtime:
1. Auto-drafts a minimal stakeholder skeleton from `{ name, role }` (the playbook input).
2. Writes it to `<vault>/stakeholders/_skeleton-<slug>.md` via SafeWrite (so it lands in vault git as a record).
3. Continues the run with the skeleton as the stakeholder context.
4. Memo header stamps `STAKEHOLDER_SKELETON` + body banner: "Ran against an auto-skeleton — Russell, fill the real stakeholder file before the next 1:1."
5. Proposed writebacks include a `stakeholder-update` proposal pre-populated with the skeleton (Russell can accept-and-edit to fill).

Stale (>30d): no skeleton; the existing file is used + memo header flag: "Stakeholder file last refreshed N days ago."

---

## 4. `gtm_realloc` — GTM Resource Reallocation

**Lenses.** CRO + CFO + CMO + CPO + COS (in that order — CRO leads).
**Threshold.** 70. **Stamps.** CLEAN | DRAFT | DEGRADED.
**Plan-approval.** 30s auto-approve countdown (Decision 6).

**Reads.** Salesforce (committed pipeline, AM activity, deal velocity), NetSuite (current GTM payroll cost), AWS-class+collab (current product usage signals), PowerBI customer-dashboard (engagement + adoption), Gmail (recent exec correspondence on GTM topic if input mentions specific deals).

**Block rules.** Salesforce auth-expired → block + re-consent prompt. Otherwise proceed; flag per-source staleness.

**Output.** Reallocation memo with:
- Current GTM cost vs ROI (per segment).
- Recommended reallocation (specific moves: hire here, sunset there, retrain X, comp-model adjustment).
- Pipeline impact projection (3/6/12 months).
- Risks + early-warning signals.
- Workstream-update proposals (Synthesizer writes one per affected WS).

**Module.** `apps/utility/src/playbooks/gtm-realloc/index.ts`.

---

## 5. `strategic_option` — Strategic Option Evaluation

**Lenses.** CEO + CFO + CPO + COS. **Threshold.** **80.** **Stamps.** CLEAN | DRAFT | DEGRADED.
**Plan-approval.** Universal manual approval, no countdown (Decision 6 — high-stakes).

**Reads.** All MCPs. Block if Salesforce + AWS + cash-data not all available. Heavy Red-Team pass after lens fan-out (Red-Team runs against the synthesized memo, not the lens outputs — preserves B3 lens-isolation invariant).

**Output.** Three options (recap / sale / wind-down / turnaround — Synthesizer picks the three most-relevant given input framing). Per option: decision tree, Russell's exit criteria, prereqs to keep this path live, prereqs to kill it. Final recommendation with confidence.

**Writebacks.** Strategic-option memos generate **prediction** proposals (each option's projected 3-month outcome → predictions ledger) + **decision** proposals if Russell pulls a trigger inside the memo + workstream-update proposals.

**Module.** `apps/utility/src/playbooks/strategic-option/index.ts`.

---

## 6. `stakeholder_1_1` — Stakeholder 1:1 Prep

**Lenses.** COS only. **Threshold.** 70. **Stamps.** CLEAN | DRAFT | DEGRADED | STAKEHOLDER_SKELETON.
**Plan-approval.** 5s auto-approve countdown (Decision 6 — pre-meeting time pressure).

**Reads.** `<vault>/stakeholders/<target>.md` (or skeleton per §3.7), `<vault>/decisions/` filtered to this stakeholder's open commits, Chorus (recent calls involving this stakeholder), Gmail (recent thread digest).

**Output.** Hot buttons, what NOT to bring up, open commitments, talking points (with citations to source decisions / calls / emails), 2-3 strategic questions to ask.

**Single-lens fast lane.** The Run loop branches to a single-COS path (`apps/utility/src/orchestrator/run-loop.ts` switches on `LENSES.length === 1`). The round-table screen renders a single-node mode (one big COS substance ribbon, no fan-out diagram).

**Writebacks.** Stakeholder-update proposals (refresh dates, new hot-buttons learned in prep, etc.) — Ch.6 engine.

**Module.** `apps/utility/src/playbooks/stakeholder-1-1/index.ts`.

---

## 7. `board_narrative` — Board Narrative / Deck Prep

**Lenses.** All six (CEO + CFO + CRO + CMO + CPO + COS). **Threshold.** 70. **Stamps.** CLEAN | DRAFT | DEGRADED.
**Plan-approval.** Universal manual approval, no countdown (Decision 6 — external stakeholder facing).

**Reads.** All MCPs. Block if any of {Salesforce, NetSuite, PowerBI, calibration} unavailable.

**Output.**
- **Narrative spine** (the story Russell should tell the board).
- **Slide skeleton** (12-slide outline with key data per slide; citation per data point).
- **Anticipated questions** (per board member, derived from stakeholder files) + recommended answers.
- **Handoff recommendation.** Memo footer always includes a "Draw up for Cowork" CTA pointing to `class-brand-presentations` skill — PRD §6 explicit.

**Writebacks.** Position-update proposals (positions reframed for board), prediction proposals (anticipated board reactions).

**Module.** `apps/utility/src/playbooks/board-narrative/index.ts`.

---

## 8. `restructure_decision` — Should we fire / restructure X person

**Lenses.** COS + CFO baseline; **+ CPO if subject's role contains 'product' | 'engineering' | 'technical' | 'CTO' | 'VP Eng' | 'VP Product'** (string check on `subject.role`). **Threshold.** **80.** **Stamps.** CLEAN | DRAFT | DEGRADED.
**Plan-approval.** Universal manual approval (Decision 6 — highest-stakes; modify per Russell preference if needed).

**Reads.** Salesforce (subject's contribution if they own pipeline), NetSuite (cash impact of severance + cost-savings + replacement-cost), Gmail (recent comms by/about), Chorus (recent calls subject was on), stakeholder file. Block if Salesforce + NetSuite + cash-model unavailable.

**Output.** Decision memo with:
- **Implications** (financial + organizational + signal-to-team).
- **Sequencing** (announcement order, comms plan, transition cover, severance scope).
- **Comms plan** (specific messages for: subject, direct reports, peer execs, broader team, optional external).
- **Heavy Red-Team** (separate section: what could go catastrophically wrong; the lawsuit risk, the team-morale risk, the customer-disruption risk).

**Writebacks.** Decision proposal (if Russell commits inside the memo), workstream-update (transition-cover WS), position-update (revised position on the role / capability).

**Module.** `apps/utility/src/playbooks/restructure-decision/index.ts`.

---

## 9. `pre_mortem` — Pre-mortem on Proposed Action

**Pipeline.** §3.4. Adversarial-first; lenses skipped; Red-Team + Steelman primary. **Threshold.** 70. **Stamp.** ADVERSARIAL_ONLY + CLEAN | DRAFT.
**Plan-approval.** 30s auto-approve countdown (Decision 6).

**Reads.** Input — the proposed action (Russell provides as `context.proposedAction`). Optional: linked workstreams, linked decisions, calibration ledger (prior similar premortem outcomes).

**Output.** §3.4. Failure modes / early-warning signals / mitigation / response playbook.

**Writebacks.** Pre-mortem-update proposal (new failure modes appended to the canonical pre-mortem corpus per artifact-type rules).

**Module.** `apps/utility/src/playbooks/pre-mortem/index.ts`.

---

## 10. `quick_read` — Quick Multi-Lens Read

**Pipeline.** §3.5. All six lenses, no Red-Team, no Verifier. **Threshold.** N/A. **Stamp.** QUICK_READ.
**Plan-approval.** Inline (no plan screen) — Decision 6 friction-free.

**Reads.** Input prompt + whatever MCPs each lens needs (cached MCP results from last full run are acceptable; quick-read does not block on stale MCPs — flagged but proceeds).

**Output.** Six lens-section memo, no Synthesizer integration, no rigor block. Section order: COS / CFO / CRO / CMO / CPO / CEO. Each section: 3-5 sentences max — terse by design.

**Writebacks.** Disabled (per PRD §6 + §3.5). `proposedWritebacks: []`.

**Module.** `apps/utility/src/playbooks/quick-read/index.ts`.

---

## 11. Home screen — full data contract

### 11.1 Layout (top → bottom)

```
┌──────────────────────────────────────────────────────────────────┐
│  Date + W30 trough-proximity strip                              │
│  Cost meter ribbon (always visible)                              │
├──────────────────────────────────────────────────────────────────┤
│  Open Q&A bar (multiline input + submit)                         │
├──────────────────────────────────────────────────────────────────┤
│  Playbook tiles — 8-tile grid (4×2 desktop, 2×4 narrow)         │
├──────────────────────────────────────────────────────────────────┤
│  Workstream dashboard mini-view  │  Top open decisions (5)      │
│  (status pills for 9 WS)         │  (one-line + zone link)      │
├──────────────────────────────────────────────────────────────────┤
│  Proposed-writebacks counter (link to Ch.6 review pane)         │
├──────────────────────────────────────────────────────────────────┤
│  Scheduled-jobs strip — 5 jobs (last fired / status / degraded) │
└──────────────────────────────────────────────────────────────────┘
```

### 11.2 Data substrate (locked — §13.2)

| Section | Source | Stale behavior |
|---|---|---|
| Date + W30 trough-proximity | Locally computed; W30 trough from `<vault>/positions/POS-007-W30-trough.md` `next-retest-date` field | Real-time |
| Cost meter ribbon | `cost_ledger` table in `runtime.db` (Ch.1) | Real-time |
| Open Q&A bar | Static UI; no data | N/A |
| 8 Playbook tiles | Static + last-run timestamp per playbook from `runs` table | Real-time |
| Workstream mini-view | **`workstream_amounts_mirror` SQLite table** (per B12 + Ch.0 indexer); status pills from `<vault>/workstreams/*.md` frontmatter `phase` + `status` (read via Ch.0 indexer cache) | Cache TTL 60s; manual refresh via tile click |
| Top open decisions (5) | `<vault>/decisions/INDEX.md` filtered to `status: open`, sorted by `last-updated`; via Ch.0 indexer | Cache TTL 60s |
| Proposed-writebacks counter | `writebacks` SQLite table count where `status = 'proposed'` (Ch.6) | Real-time |
| Scheduled-jobs strip | `scheduled_jobs` SQLite table (Ch.10) — **empty until Ch.10 ships; show "Pending Ch.10" placeholder** | Real-time |

### 11.3 Tile interaction (locked — §13.1)

- **Click a tile** → plan-approval screen for that playbook (with the playbook's prompt-input field).
- **Cmd+1 through Cmd+8** → keyboard shortcut to invoke each playbook by ordinal.
- **Cmd+/** → focus the Open Q&A bar.
- **Cmd+R** → manually refresh home data (overrides 60s cache).

### 11.4 Empty / stub states

The Ch.5 Home stub is replaced wholesale. Ch.7 Home renders all sections regardless of data availability:
- Workstream mini-view: if `workstream_amounts_mirror` is empty (no Ch.0 indexer run yet), shows "No workstream data — run preflight."
- Top decisions: if `<vault>/decisions/INDEX.md` is empty/missing, shows "No open decisions."
- Scheduled-jobs strip: shows 5 grayed placeholders labeled "Pending Ch.10."
- Cost meter: shows real cost from Ch.1 (already wired).

---

## 12. Open Q&A — ad-hoc decomposition

### 12.1 Input

A single multiline textbox in the home Open Q&A bar. Submit (`Cmd+Enter`) → orchestrator's ad-hoc decomposer runs.

### 12.2 Decomposition (orchestrator, not a lens)

The ad-hoc decomposer is a deterministic + LLM-assisted classifier:
1. **Deterministic first pass.** If the prompt matches a playbook trigger (regex + keyword: "what should I do about cash" → cash_lever; "prep for 1:1 with <name>" → stakeholder_1_1; etc.), the orchestrator **routes to that playbook** rather than running Open Q&A. Memo stamped CLEAN (not DECOMPOSED_AD_HOC). Russell sees a one-line toast: "Routed to <playbook> based on prompt."
2. **LLM decomposer.** If no playbook match, an Opus-class call decomposes the prompt into: which lenses are relevant (0–6), which MCPs are relevant (0–5), expected output shape (memo / list / table). The decomposer's output is the RunPlan that gets shown in plan-approval.

### 12.3 Run pipeline

Standard pipeline (lens fan-out → Synthesizer → Verifier → memo) but with the dynamic lens set. **Rigor capped at 85** (§13.6). Stamp DECOMPOSED_AD_HOC.

### 12.4 Plan-approval

10s auto-approve countdown (Decision 6). Russell sees the decomposed lens set + MCP set + can override before approving.

### 12.5 Writebacks

Enabled (standard Ch.6 engine).

### 12.6 Module

`apps/utility/src/playbooks/open-qa/index.ts` plus `apps/utility/src/playbooks/lib/decomposer.ts` for the LLM decomposer.

---

## 13. Spec-gap decisions (locked here)

These six gaps were not pre-locked by PRD / ROADMAP / Phase R; ADR-0009 locks them.

### 13.1 Invocation surface — Tiles + Keyboard + Cmd palette

- **Click tile** is the primary surface.
- **Cmd+1 through Cmd+8** invokes playbooks by ordinal (matches tile grid order: cash_lever=1, gtm_realloc=2, strategic_option=3, stakeholder_1_1=4, board_narrative=5, restructure_decision=6, pre_mortem=7, quick_read=8).
- **Cmd+/** focuses Open Q&A bar.
- **Cmd palette (Cmd+K)** deferred to V1.5; tiles + ordinal shortcuts are sufficient for V1.

### 13.2 Home-screen data substrate when Ch.8/Ch.10 not live

**Decision: render real data where available; placeholder per section where not.**
- Workstream + decisions + writebacks counter + cost meter: **live in Ch.7** (sources are Ch.0/Ch.1/Ch.6 SQLite — already shipped).
- Scheduled-jobs strip: **"Pending Ch.10" placeholder** until Ch.10 wires `scheduled_jobs` table.
- MCP-dependent tiles (gtm_realloc, strategic_option, board_narrative, restructure_decision): tile renders + click works + plan-approval shows; **runtime block per §3.6 fires on prereq evaluation** if MCPs not authed. The home tile is not blocked; only the run is. Russell sees the playbook surface complete even before Ch.8 wires real MCPs.

### 13.3 Workstream mini-view source — SQLite mirror (B12)

The home workstream mini-view reads from the `workstream_amounts_mirror` SQLite table (B12 mitigation; Ch.0 indexer populates). **Not direct vault parsing.** Rationale: the mirror is typed (cents-as-integer); home renders every 60s and a per-render vault parse would saturate. Manual `Cmd+R` triggers a fresh indexer pass before re-render.

### 13.4 Stakeholder-prep fallback (Phase R Decision 4 verbatim)

§3.7 codifies the rule verbatim. Skeleton on missing-file; stale-flag at >30d; no block.

### 13.5 Quick-read score display — token meter only, no rigor score

Quick-read memos show:
- **Header.** `QUICK_READ` stamp + token-meter ribbon (input tokens / output tokens / window cap remaining).
- **No rigor score.** Verifier was bypassed by design (PRD §6).
- **No score breakdown panel.** Standard memo viewer hides the rigor breakdown for QUICK_READ runs.

The `QUICK_READ` stamp is itself the quality signal. Rationale: showing a fake "—" rigor score might tempt Russell to read it as "low rigor"; showing nothing forces him to remember this was a quick scan. Memo viewer surfaces the stamp's tooltip: "All six lenses; no Red-Team; no Verifier. For prep before a call when six angles in 90 seconds matter more than rigor."

### 13.6 Open Q&A rigor cap — clamp post-Verifier, display both

The Verifier scores the Open Q&A memo normally (e.g. computes a 91). The orchestrator **clamps to 85 post-Verifier** before the memo is written: `displayedScore = min(verifierScore, 85)`. The memo header shows:
- The **displayed (capped) score** prominently: `85 (capped — DECOMPOSED AD-HOC)`.
- The **raw score** in a smaller secondary line: `raw rigor: 91`.

Rationale: hiding the raw score loses signal Russell sometimes wants ("how rigorous was the decomposition really?"); showing both with the cap explanation reinforces the operating principle without obscuring the underlying quality.

---

## 14. Build sequencing — intermediate audit checkpoint

**Sub-agent dispatch (parallel, post-design-gate):**
1. **Runtime sub-agent** — `apps/utility/src/playbooks/{pre-mortem,quick-read,stakeholder-1-1}/` + the playbook framework helpers (`evaluatePrereqs`, `decomposer`, `playbook-router` switch in `run-loop.ts`). **Phase A — novel-structure playbooks.**
2. **Renderer sub-agent** — home full-data + tile component + Open Q&A bar + tile-click flow → plan-approval → run kickoff.
3. **Tests sub-agent** — specs for the framework helpers + the 3 Phase-A playbooks + home component RTL.
4. **Dev-Wiring sub-agent** — only if Phase-A surfaces any dev-script gap.

**Intermediate audit (after Phase A lands).** Dispatch EvidenceQA sub-agent against the 3 novel playbooks + home + Open Q&A. Cycle CONCERN-fix as needed. **Goal: catch any framework-shape bugs before the homogeneous playbooks pattern-match against them.**

**Phase B — homogeneous playbooks.** Re-dispatch Runtime sub-agent for `{gtm-realloc, strategic-option, board-narrative, restructure-decision}` using the now-audited framework. Tests sub-agent adds specs. Renderer sub-agent only re-invoked if a homogeneous playbook surfaces UI gaps.

**Final audit + close.** Full EvidenceQA pass against all 7 new playbooks + Open Q&A + home. CONCERN-close acceptable per Ch.6 precedent.

---

## 15. Acceptance criteria

- AC-1: Each of 8 playbook modules (`cash-lever` + 7 new) exports `runPlaybook` matching §3.1 shape.
- AC-2: `apps/utility/src/orchestrator/run-loop.ts` switches on `playbook_id` and dispatches the correct module.
- AC-3: Each playbook fires the correct lens set per §3.2; threshold matches the table.
- AC-4: `evaluatePrereqs` correctly returns block / degrade / proceed per Phase R Decision 4 matrix.
- AC-5: `stakeholder_1_1` with missing target file creates a skeleton at `<vault>/stakeholders/_skeleton-<slug>.md` via SafeWrite and continues.
- AC-6: `quick_read` bypasses Verifier (`shipStatus: 'quick'`); writebacks disabled.
- AC-7: `pre_mortem` runs Red-Team + Steelman only; ADVERSARIAL_ONLY stamp present.
- AC-8: `open_qa` deterministic-first-pass routes "what should I do about cash" to `cash_lever`; LLM decomposer handles the rest; rigor clamped to 85; both displayed + raw scores visible.
- AC-9: Home screen renders all 6 sections from §11.1 — empty states where data unavailable.
- AC-10: Cmd+1..Cmd+8 and Cmd+/ work.
- AC-11: Workstream mini-view reads from `workstream_amounts_mirror`; 60s cache; Cmd+R refresh.
- AC-12: Tile click → plan-approval (with the playbook's auto-approve countdown per Decision 6).
- AC-13: No reasoning-trace coupling — Verifier-blindness invariant from B3 preserved across all new playbooks. Spot-check via the canary fixture from Ch.4.

---

## 16. UNKNOWN at write-time

- Specific Cmd+ ordinal conflicts with system or other-app shortcuts — verified at Ch.7 dev smoke (B31 pattern: `globalShortcut.isRegistered()` check; tile-internal shortcuts use renderer key-handlers, not globalShortcut, so conflict surface is smaller).
- Open Q&A LLM decomposer prompt template — drafted in Ch.7 build by the Runtime sub-agent; reviewed by Audit.
- Exact `workstream_amounts_mirror` schema — confirmed against Ch.0 indexer's actual table; if drift, surfaced as a small migration in Ch.7 build.
