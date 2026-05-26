# C-Suite — Product Vision & Specification

**Working product name:** C-Suite (conceptually: Russell's "C-Suite Team")
**Owner:** Russell Teter
**Builder:** Claude Code
**Status:** Vision and design principles locked 2026-05-26. Build mandate active.
**Companion doc:** `C_Suite_CLAUDE.md` — the build mission brief for Claude Code.

This document is the product spec. It defines what we're building, why, what success looks like, and the design principles that bound every implementation decision. It does NOT prescribe the implementation. The how — stack details, code structure, build sequence — is Claude Code's job to determine through its own discovery and planning phase.

---

## 1. The product in one paragraph

The C-Suite is a desktop application Russell uses as his personal strategic command center. He poses business questions to it — strategic, operational, financial, organizational, stakeholder-related — and the system runs a disciplined multi-lens investigation (CEO, CFO, CRO, CMO, CPO, Chief of Staff perspectives in parallel), red-teams the synthesis, grades the output against rigor gates, and produces an executive memo Russell uses to make actual decisions. Outputs compound back into the institutional intelligence layer — positions, decisions, predictions, pre-mortems — that already exists as markdown files in the project vault. Russell iterates on proposed write-backs through a typed-feedback loop: he types reactions, clarifications, additional context, or pushback on a draft artifact, and the relevant lens re-runs with that feedback in context, producing a revised draft for another review cycle until the artifact is committable. The product surfaces the existing Strategic AI Operating Model that runs today in Cowork, makes the work visible while it accumulates, runs scheduled autonomy (tripwire scans, cash forecasts, renewal sweeps, morning briefs), and gates output quality so what reaches Russell is informed, sourced, and decision-ready — not slop.

## 2. The vision — what success looks like 3-6 months in

Russell wakes up, summons the C-Suite, and within 30 seconds sees the state of every workstream he's running, every tripwire's proximity to its threshold, what changed overnight across cash and pipeline, and the decisions waiting on him. He poses a question — "should we restructure GTM around the post-Ed configuration?" — and watches six lens agents fan out across his vault and his connected MCPs, hitting Salesforce, NetSuite, AWS, Chorus, Gmail. Each lens surfaces its position, its evidence, its risks, and what it needs from the others. A red-team agent stress-tests the synthesis. A verifier grades it. Six minutes later a memo lands in his vault with a rigor score, proposed write-backs to his position library and decision log, and a one-paragraph summary appended to the relevant workstream's notes log. Russell reviews the proposed write-backs, accepts the ones that hold up, edits two, rejects one. The system's institutional memory grows. The next time he asks a related question, that memory loads automatically into the bootstrap context.

By month three, the position library has 40-60 active positions, the decision log shows outcomes resolving on prior decisions, the calibration scorecard reveals where Claude has been reliable and where it hasn't, and the rigor score formula has been tightened from 70 to 80 based on first-month audit findings. By month six, Russell can ask "what did Claude believe in May about the July trough, and was it right?" — and the answer is in the library, dated, confidence-stamped, and traceable to the originating run.

The product is not a chatbot with personas. It is the operationalization of Russell's existing institutional intelligence in a form he can see, control, and trust.

## 3. The problem this solves

The Strategic AI Operating Model already exists. It runs in Cowork. It has shipped two completed `/deep` investigations and produced 13 active positions, 7 active decisions, 12 workstream files, 13 pre-mortems, 13 stakeholder models, and a calibration scorecard. The intellectual chassis works. The compounding loop runs.

But it's invisible during runs. Russell can't watch a `/deep` unfold. He can't intervene mid-stream. Agents have no identity. The knowledge base doesn't visualize. Scheduled jobs fire but their outputs scatter across Cowork artifacts that Russell has to remember to open. The memo lands but the proposed positions/decisions don't auto-draft. The library accumulates but the visualization stays in markdown.

Worse, every comparable product Russell could buy (Journey AI, AI Board of Advisors, Personal Board AI, Custom GPT executive coaches, Manus, Devin) has either died, stalled, or is selling a persona prompt over a base model with no data, no memory, no tools. The category is a graveyard for generic versions because the moat in this kind of product is institutional state, not model quality. Russell has the state. No product on the market would.

The gap is a body for the existing brain. The C-Suite is that body.

## 4. What "done" looks like — V1 outcome criteria

V1 ships when these outcomes are demonstrably true. These are outcome criteria, not task lists. Claude Code decides what tasks produce these outcomes.

**Russell uses the C-Suite as his primary surface for strategic investigations.** When a strategic question lands on his desk, he opens the C-Suite rather than starting a Cowork session. The 8 V1 playbooks cover the recurring question patterns he actually runs. Open Q&A handles everything else with a clear quality signal that distinguishes ad-hoc decomposition from playbook-grade output.

**Every memo carries a rigor score and a traceable evidence chain.** No number reaches Russell without a source citation. No memo ships clean without passing the rigor gates. Memos that fail the gates ship as DRAFT with explicit failure reasons. Russell can click any claim in any memo and see the underlying tool-call result that produced it.

**The compounding loop runs visibly.** Every run produces proposed positions, decisions, predictions, pre-mortem updates, stakeholder updates, workstream advances — auto-drafted from the memo's findings, surfaced in a review pane, accepted/edited/rejected by Russell. Accepted artifacts flip from proposed to active. The position library grows. The decision log accumulates outcomes. The calibration scorecard updates.

**The vault is canonical and concurrent-edit safe.** The C-Suite and Obsidian both operate over the same files in `/Documents/Claude/Projects/Business Planning/`. Russell can have Obsidian open while the C-Suite writes. No data loss. No silent overwrites. Conflicts surface as sidecar `.proposed-<timestamp>.md` files Russell can merge.

**Autonomy runs unattended.** The five scheduled jobs that previously ran in Cowork (Monday morning tripwire + cash forecast, Monday morning stakeholder refresh, Sunday evening renewal + Chorus sweep, Sunday evening dashboard regenerate + memory consolidation, daily morning brief) run inside the C-Suite on the same cron. Their outputs surface to the home screen. Russell can sleep, travel, miss a day — the system stays current.

**The product feels native.** It lives in the menubar, summons via global hotkey, surfaces native macOS notifications when a tripwire flips or a memo is ready, and survives Mac sleep/wake without manual restart.

**The Cowork-based `/deep` mode stays usable as a fallback.** Russell isn't trapped in the C-Suite if it has a bug or he wants to test something outside it. Both surfaces read and write the same vault files.

**Decisions don't dead-end at "answered." They hand off to execution.** Russell can take any committed decision, any accepted position, any shipped memo, and trigger a one-click "Draw up for Cowork" handoff. The resulting execution brief contains everything Cowork needs to begin project planning, business plan drafting, process documentation, ownership assignment, and the actual execution work — without Russell having to re-derive context. The C-Suite produces conclusions; the brief makes them actionable; Cowork delivers the work.

If those eight outcomes are true, V1 ships. If they're not, V1 isn't done — regardless of how much code has been written.

## 5. Non-negotiable design principles

These are the locked design decisions from the discovery and hardening phase. Each is non-negotiable because each prevents a specific failure mode that has killed comparable products. Claude Code can vary the implementation freely as long as the principle holds. If Claude Code believes a principle should be changed, surface that to Russell via clarifying question — do not change it unilaterally.

**The vault is the single source of truth.** The C-Suite reads and writes the existing files in `/Documents/Claude/Projects/Business Planning/`. No separate database. No cached mirror. No parallel state. The same files Obsidian opens are the files the C-Suite operates on.

**The vault is git-tracked with auto-commit on every C-Suite write.** Institutional state is the asset; losing it is catastrophic. Every C-Suite write to the vault triggers a `git add` + `git commit` with a structured message (`c-suite: <agent> wrote <file> during <playbook> run <run_id>`). This produces a complete audit trail of every machine-driven change, makes `git log` the institutional change history, and makes `git checkout` the disaster recovery path. The vault's git repo is separate from any code repo and is gitignored from anything else. Russell occasionally commits his own manual edits with descriptive messages. Push to a private remote (GitHub private repo, or a self-hosted git server) on a configurable cadence for off-machine backup.

**Lens agents run parallel-independent. Mid-run inter-agent collaboration is rejected.** The 90%+ performance gain in production multi-agent systems comes from spreading reasoning across independent context windows. Inter-agent dialogue introduces specification drift and premature consensus — 41.8% of multi-agent failures per the MAST taxonomy. The six lenses see the same context bundle but never each other's intermediate work. Reconciliation happens in the Synthesizer, after the lenses complete.

**Plan-approval gates every run.** Before any agent fires, the orchestrator builds a run plan — which lenses, which MCPs, expected source types, expected output shape — and Russell approves, edits, or cancels. No agent work begins without approval. This prevents wasted compute on misspecified queries and creates a paper trail for what was actually intended.

**Chief of Staff splits into Synthesizer and Verifier — never one agent.** Production research shows that critics in shared context rubber-stamp; the agent that drafts cannot be the agent that grades. The Synthesizer drafts memo prose. The Verifier enforces claim-source binding, per-lens coverage floors, red-team schema completeness, calibration freshness, and computes the rigor score. They are structurally separate agents with separate prompts.

The Verifier's input contract is non-negotiable: the Verifier must receive (a) the Synthesizer's draft memo, (b) the full structured output of every lens that contributed to the memo, (c) the complete tool-call audit trail with citation IDs and retrieved excerpts for every source claim, (d) the metadata of every position the memo cites (id, current confidence, last-retested date, supersession status), (e) the Red-Team and Steelman outputs in full. Without this input contract, the Verifier cannot actually verify — it would be grading prose against itself rather than grading claims against their underlying evidence. The runtime architecture must structure data so the Verifier receives this contract on every run.

**Source citation is required on every claim.** Every numerical or named-entity claim in a memo carries a `source_id` linking to a specific tool-call result. Unverified claims get stripped or visibly flagged. This is the highest-leverage anti-slop discipline — every other failure mode (false precision, sycophancy, hallucination, role drift) is downstream of "model said it confidently and nothing checked."

**Rigor score gates memo quality.** Every memo gets a 0-100 rigor score from the Verifier. The threshold for clean shipment is 70 at V1. Memos below 70 ship as DRAFT with failure reasons visible. A first-month audit reviews every memo that shipped at 70-84 to determine whether the rigor threshold should be tightened. This is the self-calibrating discipline that prevents the score from becoming theater.

**Auto-draft write-backs with human approval gate.** After every full run, the Verifier identifies new positions, decisions, predictions, pre-mortem updates, stakeholder updates, and workstream advances derivable from the memo. These auto-draft as proposed files. Russell accepts/edits/rejects each. Approved artifacts flip from proposed to active. This is how the compounding loop runs — humans gate quality; the system handles the drafting.

**Proposed write-backs support iterative feedback, not just accept/edit/reject.** Russell can type natural-language feedback on any proposed artifact — reactions, clarifications, corrections, additional context, pushback on a claim, sourcing he wants the agents to incorporate. The system captures the feedback as a new context augmentation, identifies which lens(es) produced the contested claims, and re-runs only those lenses with the original context bundle plus the feedback plus the prior draft. The result is a revised proposed artifact, returned to Russell for another review cycle. Iteration history is preserved as a thread attached to the artifact so the evolution of a position or decision is traceable months later. Russell's feedback is logged as its own source type (`source: russell_feedback_<timestamp>`) and becomes part of the audit trail. The Verifier still gates the revised output against rigor — feedback does not bypass rigor; it adds context the agents reason over. This turns write-back from one-shot drafting into a real reasoning partnership.

**Concurrent-edit safety is required, not optional.** The C-Suite and Obsidian both operate over the same files. Without atomic writes and hash-checks before write, agent writes will silently overwrite Russell's in-progress Obsidian edits. The pattern is: read content, compute hash, run agent work, re-check hash before write, sidecar to `.proposed-<timestamp>.md` on conflict, atomic rename for the actual write. Agent-exclusive zones (predictions, investigations, deliverables, memos) skip the hash-check; shared zones do not.

**UI substance ribbon is paired with any visual agent representation.** Every agent node in the UI displays a substance ribbon showing source count, verified citation ratio, and coverage percentage in real time. The visual representation is honest to what the agent is actually doing. Animation theater without substance signals is the failure mode that killed Devin's trust loop.

**Memos do not auto-distribute.** The C-Suite writes memos to the vault and renders them in the UI. Russell decides whether to share via Slack, Gmail, PDF export, or hand-copy. The product does not send messages on his behalf — same financial-action discipline that prevents the system from executing trades or transfers.

**Russell decides; the system implements.** When the system encounters a substantive ambiguity (not implementation noise — a real product or decision choice), it surfaces the question to Russell rather than guessing. Plan-approval is the structural commitment to this. Mid-run clarifying-question popups are not — those indicate a weak plan-approval step.

**The C-Suite does strategic analysis and decision-making; execution work hands off to Cowork.** The C-Suite produces investigations, positions, decisions, predictions, pre-mortems, stakeholder context, and the calibrated reasoning that informs choices. Once a decision is committed — Russell has accepted the proposed write-back, the position is active, the memo has shipped clean — the *next step* of actually executing on that decision (writing the project plan, drafting the business plan, building the process documentation, the comms rollout, the owner-and-timeline allocation) is Cowork's job, not the C-Suite's. The two surfaces operate in a deliberate division of labor: the C-Suite informs *what* to do and *why*; Cowork drives *how* to do it. A handoff capability bridges them — see §6. This division exists because the C-Suite is built for parallel-lens analysis with rigor gates, and Cowork is better suited for sequential, detailed execution drafting with broader skill access. Forcing one surface to do both produces mediocre output on both fronts.

**Open Q&A always carries a quality signal.** Memos produced through ad-hoc orchestration (Open Q&A mode rather than a playbook) carry a "DECOMPOSED AD-HOC" stamp. Open Q&A memos cannot claim clean status above 85 regardless of the rigor formula. This prevents the open mode from being treated as playbook-grade output.

## 6. The product surface — V1 scope

**Six C-level lens agents.** The C-Suite extends the original five-lens framing from `Strategic_AI_Operating_Model.md` (§2) with a sixth role — Chief Product Officer — because product strategy is too central to a SaaS company in turnaround to not have its own dedicated lens. The six:

- **CEO** — frames everything in terms of board narrative, strategic optionality (recap/sale/wind-down/turnaround), covenant management with Barclays, Holdco and investor relations. North star: the story that survives a board meeting.
- **CFO** — quantifies everything in dollars and dates. Cash, runway, working capital, unit economics, covenant compliance. North star: the W30 trough and the next 13 weeks of cash.
- **CRO** — pipeline, retention, renewal risk, ARR trajectory, customer-facing implications. Names specific accounts. North star: the ARR cliff and the renewal book.
- **CMO** — brand, market positioning, customer perception, internal comms to employees, external comms to customers during a crisis. North star: the company doesn't broadcast that it's dying.
- **CPO** — product strategy, roadmap, feature prioritization, build-vs-buy, technical debt, AI-native repositioning, platform decisions, competitive product positioning. North star: whether what Class is building is what the market actually wants — and whether the product can carry the company through the turnaround. This is the lens that closes the gap between "we're surviving financially" and "we're surviving as a product." Critical for WS-08 (AI-native repositioning, currently RED), any playbook touching product roadmap, board narrative prep, and strategic option evaluation (because "turnaround via repositioning" vs. "wind-down" is fundamentally a product-viability question).
- **Chief of Staff** — execution sequencing, decision rights, who-does-what-by-when, political dynamics, what's at risk of falling through the cracks. North star: nothing important is dropped. (The Chief of Staff also splits operationally into Synthesizer + Verifier downstream of the lens fan-out — see §5.)

The CPO lens's prompt does not yet exist in the operating model documentation (which still defines five lenses at the v1 doctrine level). Claude Code constructs the CPO system prompt during build, modeling structure after the existing five-lens prompts in `Strategic_AI_Invocation_Guide.md` and grounding the CPO's content in the turnaround doctrine library's SaaS-Specific Turnaround Patterns and AI-Native Operations sections (`turnaround_operating_library.md`).

**Eight named playbooks ship at V1.** Each playbook is a defined investigation pattern with hard-coded orchestration: which lenses fire, which MCPs they hit, what artifacts they read from the vault, what output shape they produce, what write-back types they generate. The playbooks at V1:

1. **Cash lever vs. trough analysis** — the W30-style question. CFO + Chief of Staff. Outputs a trough analysis with three lever options and tripwire flags.

2. **GTM resource reallocation** — pipeline + headcount + comp model. CRO + CFO + CMO + CPO + Chief of Staff. (CPO included because GTM reallocation depends on what product the company is selling and how it's positioned — selling a repositioned AI-native platform demands different GTM than selling the legacy VILT product.) Outputs a reallocation memo.

3. **Strategic option evaluation** — recap/sale/wind-down/turnaround. CEO + CFO + CPO + Chief of Staff. (CPO required because every strategic option resolves to a product-viability question: turnaround requires the product can carry a recovery, sale requires the product is worth more to an acquirer than to current investors, wind-down acknowledges the product can't compete. Without the CPO lens, strategic option evaluation is a financial exercise that hand-waves the underlying asset.) Heavy red-team. Higher rigor threshold (80, not 70). Outputs three options with decision tree.

4. **Stakeholder 1:1 prep** — single-agent fast lane. Chief of Staff only. Reads stakeholder model + recent activity. Outputs hot buttons, what NOT to bring up, open commitments, talking points.

5. **Board narrative / deck prep** — all six lenses. Outputs narrative spine, slide skeleton, anticipated questions.

6. **Should we fire / restructure X person** — Chief of Staff + CFO (add CPO if the person is in product, engineering, or technical-strategy roles). Heavy red-team. Higher rigor threshold (80). Outputs decision memo with implications, sequencing, comms plan.

7. **Pre-mortem on a proposed action** — adversarial-first. Red-Team + Steelman primary; lenses skipped. Outputs failure modes, early-warning signals, mitigation, response playbook.

8. **Quick multi-lens read** — all six lenses, no red-team, no Verifier gate. Stamped "QUICK READ" — for prep before a call where six angles in 90 seconds matter more than rigor. Write-back disabled.

**Open Q&A handles everything else.** Free-form question; orchestrator decomposes ad-hoc; produces a memo stamped "DECOMPOSED AD-HOC" that visually distinguishes from playbook-grade output.

**Five MCPs at V1.** Salesforce, AWS (both `class` and `collab` profiles, always summed), Gmail, NetSuite, Chorus. The full Cowork connector roster (Slack, Drive, Common Room, ZoomInfo, Daloopa, Linear, Brightdata, etc.) defers to V1.5+. Russell can paste Cowork-side query results into the Open Q&A surface during V1 if a deferred connector is needed.

**Supplementary data source — Class product usage via PowerBI.** Beyond the five V1 MCPs, the C-Suite must leverage Russell's existing `customer-dashboard-poc` Claude Code project (located at `/Users/russellteter/Claude Code Projects/customer-dashboard-poc/` or wherever Claude Code finds it during Phase 0). That project already has working PowerBI connections to Class's product usage data — engagement metrics, feature adoption, customer activity patterns. This data is critical for any customer-facing decision: renewal risk, churn analysis, segment health, expansion potential, GTM reallocation, retention strategy. Customer-related playbooks (especially renewal risk if added back to V1.5, GTM reallocation, strategic option evaluation, and any board narrative that touches retention) rely on this data being accessible. Without it, the CRO and CPO lenses reason over Salesforce CRM signal alone and miss the actual product-usage substrate. Claude Code resolves the integration approach during Phase 0 — see CLAUDE.md additional decision #9. The integration is required at V1, not deferred.

**Five scheduled autonomy jobs migrate from Cowork.** Monday 6am ET financial tripwire scan + weekly cash forecast. Monday 7am ET stakeholder activity refresh. Sunday 6pm ET renewal forecast + Chorus call intelligence sweep. Sunday 8pm ET workstream dashboard regenerate + memory consolidation. Daily 6am ET morning brief. These run inside the C-Suite and surface to the home screen.

**The home screen shows operational state in one glance.** Today's date and W30 trough proximity, workstream dashboard mini-view, top open decisions, count of proposed write-backs awaiting review, latest scheduled job outputs, the eight playbook tiles, an Open Q&A bar.

**Every proposed write-back has a conversation pane attached.** Russell can Accept (artifact flips to active), Edit (open the markdown directly for hand-editing), Reject (rationale captured to the archived-proposals log), or type natural-language feedback that triggers an iterative re-run. Iteration threads are persisted with the artifact's history — when a position commits to active, its prior drafts and the feedback that shaped them remain visible through the artifact's revision log.

**Execution handoff to Cowork — the "Draw up for Cowork" capability.** Every shipped memo, every committed decision, every accepted proposed write-back carries a "Draw up for Cowork" action in the UI. When Russell triggers it, a dedicated Handoff Agent produces a structured execution brief — written in a format Cowork can pick up and run with — and lands it as a markdown file in `/Business Planning/handoffs/<date>-<slug>.md`. The brief includes: the decision being executed (with link back to the originating memo and any cited positions), the rationale chain (why this choice over alternatives), the specific deliverables Cowork should produce (project plan, business plan, process documentation, communications artifacts, owner-and-timeline assignments, whatever is appropriate to the decision), the relevant stakeholder context (who needs to be involved, who has decision rights, who needs comms), the workstream context (which workstreams the execution touches, what depends on it), the constraints and risk flags (budget, timing, dependencies, known tripwires), and the acceptance criteria (what "done" looks like for the execution work). Russell then opens Cowork, finds the brief in `/handoffs/`, and Cowork runs the actual execution work — the detailed project planning and documentation work that Cowork is better suited for than the C-Suite's parallel-lens analysis loop. Resulting project plans, business plans, and process docs return to the same vault, so the C-Suite's next runs see what was actually executed. This closes the loop end-to-end: strategic analysis produces decisions; the handoff translates decisions into actionable execution briefs; Cowork delivers the work; the institutional state grows with both the analysis AND the execution. Without this capability, the C-Suite produces conclusions that dead-end at "answered" — which is exactly the failure mode every "AI advisor" product hits when it can't bridge from insight to delivery.

**Output format and brand standards.** Every output the C-Suite produces follows a consistent, branded format — never raw or unstyled. The discipline maps to Russell's existing Cowork brand skills:

- **Memos** (the primary output of every run) — branded markdown using a standard memo template (header with rigor score and status badges, executive summary, lens positions section, decisions and proposed write-backs, citation footnotes). Prose runs through `russell-voice` discipline for personal-facing content and `class-brand-voice` for company-facing or externally-shareable content. Both voice rule sets are baked into the Synthesizer's prompt.
- **Proposed write-back artifacts** (positions, decisions, predictions, pre-mortems, stakeholder updates, workstream updates) — standard markdown with the universal frontmatter schema, consistent body structure per artifact type. Templates live in a `C_Suite_templates/` directory or equivalent location Claude Code chooses, and the Verifier checks proposed artifacts against the template before draft.
- **Polished non-markdown artifacts** (Excel financial models, PowerPoint board decks, branded PDFs for external sharing, Word documents) — the C-Suite does NOT produce these directly. They flow through the Cowork execution handoff path, which has native access to the existing `class-brand-document`, `class-brand-excel`, `class-brand-presentations`, `class-ppt-cyan-light`, `class-brand-voice`, and related skills. When a playbook's output would naturally be a polished artifact (e.g., Board narrative prep produces a deck skeleton that needs to become an actual PowerPoint; Cash lever analysis produces a financial model that needs to become Excel), the C-Suite's memo includes an explicit recommendation to hand off via "Draw up for Cowork" with the specific brand skill named in the handoff brief.
- **Handoff briefs themselves** — branded markdown using a standard template that lists the appropriate Cowork brand skill(s) Cowork should invoke for the resulting polished artifacts. The Handoff Agent populates this section based on the requested deliverable type.

The principle: the C-Suite is opinionated about format consistency. Outputs that look ad-hoc, unstyled, or formatted differently from one run to the next are themselves a slop signal — they make it harder for Russell to scan the corpus over time and harder to share artifacts with stakeholders. Brand consistency is institutional discipline, not decoration.

**The C-Suite is single-user.** Russell only. Mac only. macOS menubar app. Always-on. Summonable via global hotkey. Native notifications for tripwire flips, memo completion, run errors.

## 7. What's locked vs. what's open

To make the boundary clear for Claude Code's discovery phase:

**Locked (do not change without explicit Russell approval):**
- The product is single-user, macOS, menubar-resident.
- The vault is the existing `/Business Planning/` folder. Single source of truth.
- Agent topology: 6 lenses (CEO/CFO/CRO/CMO/CPO/COS) + Synthesizer + Verifier + Red-Team + Steelman. Parallel-independent fan-out.
- Run pattern: plan-approval → fan-out → red-team → synthesize → verify → ship/DRAFT → propose write-backs.
- 8 V1 playbooks (the ones in §6) plus Open Q&A.
- 5 V1 MCPs (Salesforce, AWS, Gmail, NetSuite, Chorus).
- 5 scheduled autonomy jobs migrate from Cowork.
- Rigor gates are non-skippable; rigor score formula with ≥70 threshold and first-month audit.
- Auto-draft + human approval gate for write-backs.
- Concurrent-edit safety pattern (atomic writes + hash-check + sidecar on conflict).
- Cowork `/deep` remains functional as a fallback.
- All 12 design principles in §5.

**Open (Claude Code determines through its own discovery):**
- Specific stack choices: language(s), framework(s), package manager, build tools, UI library, state management, animation library, charting/graph library.
- Process architecture: how the Electron main process, sidecar (if any), and renderer interact. IPC mechanism. Streaming protocol.
- How MCPs are wired and authenticated. Credential storage. OAuth handling per service.
- How the round-table UI is rendered. Specific component library. Animation patterns.
- How the substance ribbon updates in real time. Event streaming.
- How the rigor score formula is implemented in code. The formula's outputs are locked; the implementation is open.
- The exact frontmatter schema beyond `type:` and `id:`. Claude Code can propose richer schema if it improves Bases/Dataview queries.
- How the scheduler runs (node-cron, BullMQ, OS-level launchd, custom).
- How proposed write-backs are persisted before approval (sidecar files, draft database, status flags — Claude Code decides).
- The exact run-history UI. Memo viewer details. Write-back review pane layout.
- How the iterative feedback loop is implemented at the UI and runtime level — conversation pane layout, how feedback is captured into the re-run context bundle, how iteration history is structured in the vault and the artifact's revision log, whether to allow unbounded multi-turn iteration on a single artifact or to surface a "commit-or-reject after N rounds" nudge if a draft keeps cycling without converging.
- Build sequencing and timeline. Claude Code produces a development plan during its discovery phase.
- Test strategy. Test fixtures. CI setup (if any).
- Repository structure and code organization.

**Out of scope for V1:**
- Multi-user. Multi-tenant. Hosted/SaaS deployment.
- Cross-Claude Spine integration (multi-project intelligence across Class + Locality + Apply).
- Mobile companion.
- Auto-distribution of memos to Slack/Gmail.
- Voice interface.
- Real-time collaboration with other humans.
- Connectors beyond the 5 V1 MCPs.
- Replacing Cowork entirely.

## 8. What this product is NOT

It is not a chatbot with six personas. The lens framing is a discipline that produces structured, sourced positions — not a roleplay layer.

It is not an autonomous decision-maker. Russell decides; the system informs. The product produces memos, proposed write-backs, and scheduled briefs. It does not commit, execute, send, or transact.

It is not a replacement for Claude's existing operating model. It is a visualization, control, and autonomy layer over the operating model that already runs in Cowork. The model is the brain. The C-Suite is the body.

It is not a generic productivity tool. Russell's institutional state (positions, decisions, workstreams, stakeholders, calibration history, turnaround doctrine library, six months of memory) is the moat. The C-Suite is built specifically to operationalize that state.

It is not a SaaS product. Single-user, local, Russell's only. If it eventually becomes a commercial offering through Locality AI, that's a V3+ decision, not V1.

## 9. The compounding loop — how the system gets smarter

The C-Suite isn't just a runtime. It's the surface that runs the compounding loop of the Strategic AI Operating Model. Every successful run:

- Writes a memo with cited evidence to the vault.
- Drafts proposed positions, decisions, predictions, pre-mortem updates.
- Russell reviews each proposed artifact. Some he accepts immediately. Others he iterates on through typed feedback — the relevant lens re-runs with his additional context, produces a revised draft, and the cycle continues until the artifact is committable. The library grows with artifacts refined through reasoning partnership, not one-shot drafts.
- Committed decisions and shipped memos that need execution generate Cowork handoff briefs via the "Draw up for Cowork" action. Cowork picks up the brief and drives the actual project planning, business planning, process documentation, and ownership work. The resulting execution artifacts return to the same vault so the next C-Suite run sees what was actually executed against prior decisions.
- Predictions resolve over time; calibration scorecard updates.
- Stakeholder models accumulate recent-activity context from the weekly refresh.
- Workstream notes logs accumulate one-paragraph run summaries.
- The post-run critique pass (built into the Verifier) scores the run's rigor, flags the weakest pass, proposes improvement.

By month three, lens agents reading their bootstrap context bundle pull in materially more institutional state than they did at V1 launch. By month six, the calibration scorecard reveals where the system has been overconfident (and corrects), where positions have superseded prior beliefs, where pre-mortems caught threats before they materialized.

The C-Suite's value is not in any single run. It is in the compounding effect of every run feeding the next.

## 10. References — required context for the build

These files contain the institutional context the C-Suite operationalizes. Claude Code must read them before building. They are in `/Users/russellteter/Documents/Claude/Projects/Business Planning/`:

- `Strategic_AI_Operating_Model.md` — the v1 constitution. 5 lenses. 5-pass loop. Connector playbook.
- `Strategic_AI_Operating_Model_v2.md` — conviction backbone, stakeholder/workstream/adversarial layers.
- `Strategic_AI_Invocation_Guide.md` — exact prompt templates per lens and mode.
- `Strategic_AI_Connector_Playbook.md` — connector routing, SuiteQL/SOQL patterns, data-quality discipline.
- `Strategic_AI_Conviction_Backbone.md` — schema for positions, decisions, calibration, pre-mortems.
- `Strategic_AI_Stakeholder_Workstream_Adversarial.md` — schemas for stakeholders, workstreams, adversarial library.
- `turnaround_operating_library.md` — the doctrine library lens agents draw on for citations.
- `SESSION_START_PROTOCOL.md` — Russell's session-start discipline.
- `positions/README.md`, `decisions/INDEX.md`, `workstreams/DASHBOARD.md`, `stakeholders/INDEX.md`, `pre-mortems/INDEX.md`, `calibration/SCORECARD.md` — the index files for each artifact type.
- `C_Suite_CLAUDE.md` — the build mission brief, including the explicit discovery-phase mandate.

The auto-memory at `/Users/russellteter/Library/Application Support/Claude/.../memory/MEMORY.md` and its linked files contain Russell's role context, the Class financial state, the GTM roster, the AWS configuration, the COO leverage doctrine, the CFO severance policy. Read these too.

Additional code and skill resources outside the vault:

- **`customer-dashboard-poc`** — Russell's existing Claude Code project with working PowerBI connections to Class product usage data. Located at `/Users/russellteter/Claude Code Projects/customer-dashboard-poc/` or wherever Claude Code discovers it. Required for customer-facing playbooks at V1. Investigate during Phase 0 Track E and additional decision #9.
- **Existing Cowork brand skills** (read these before authoring the C-Suite's memo templates and output discipline): `class-brand-document`, `class-brand-excel`, `class-brand-presentations`, `class-ppt-cyan-light`, `class-brand-voice`, `russell-voice`, `class-content-writer`, `class-content-qa`. Skill content lives in Russell's Claude environment under the plugin skills directory. The C-Suite memo templates and Synthesizer/Verifier prompts must encode the brand patterns these skills define so outputs are consistent regardless of which surface produced them.

---

*The companion document `C_Suite_CLAUDE.md` is the build mission brief. It directs Claude Code through a discovery phase before any code is written, and defines the operating disciplines Claude Code carries throughout the build.*
