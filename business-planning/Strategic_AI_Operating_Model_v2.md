# Strategic AI Operating Model — v2 Hardening Extension

**Extends:** `Strategic_AI_Operating_Model.md` (v1 constitution)
**Created:** 2026-05-21
**Status:** Active — these layers go live alongside the v1 architecture, not in place of it.
**Premise:** v1 built the chassis (five C-level lenses, five-pass recursive loop, memory + connector spine). v2 hardens that chassis into something that can carry the real weight of the Class turnaround — informed opinions held with calibrated confidence, awareness of every Claude project and company knowledge surface, the expert frameworks a turnaround COO actually draws on, and adversarial discipline built into the system.

---

## 1. What v2 adds (in one sentence per layer)

- **Cross-Claude Knowledge Spine** — a master index that catalogs every Claude project, session, memory, file, and company data surface, with continuous ingestion of Slack/Gmail/Drive into a single structured intelligence stream.
- **Turnaround Operating Library** — the codified expert frameworks (Grove, Helmer, Christensen, McKinsey, Watkins, Hastings, restructuring-advisor playbooks, edtech-specific patterns) that Claude draws on to think like a turnaround COO, not a generic analyst.
- **Conviction Backbone** — four artifacts (Position Library, Decision Log, Calibration Tracker, Pre-Mortem Library) that convert analysis into accumulating institutional conviction tested by outcome.
- **Stakeholder + Workstream + Adversarial Layers** — maintained models of the 30+ people and entities Russell operates against; a parallel-track view of the 12 turnaround workstreams running concurrently; a continuously-growing catalog of competitor moves, regulatory exposures, financial tripwires, and defection patterns.

Each layer is implementable today as folder scaffolding plus operating discipline. Each layer plugs into a specific point in the v1 Pass 1–5 loop and makes that pass measurably stronger.

The four layers together transform the system from "Claude with good context" into "an institutional intelligence that compounds." Run 30 of v2 is materially different from run 1 because the libraries have accumulated, the calibration has tightened, the stakeholder models have filled in, and the adversarial catalog has grown.

---

## 2. Layer 1: Cross-Claude Knowledge Spine

Full design in `Strategic_AI_Cross_Claude_Spine.md`. Synthesis:

The spine lives at `/Users/russellteter/Documents/Claude/Projects/_spine/` — outside any single project so it's shared across Class, Apply, Locality, and any future Claude project Russell creates. It contains six components.

**The Knowledge Inventory** (`_spine/INVENTORY.md`) — a master catalog of every knowledge source Russell has, by domain. Class memories, the Cash Lever Model, NetSuite, Salesforce, AWS profiles, Class Slack/Gmail/Drive, Apply project artifacts, Locality artifacts, calendar, prior session transcripts. Each entry names location, content, the MCP/tool to access it, refresh cadence, and cross-links. Regenerated nightly. Read by every Claude session at start — so no Claude session begins blind to what exists.

**Cross-Project Memory Bridging** uses a `project::slug` namespace in memory frontmatter. A `_spine/MEMORY_INDEX.md` consolidates every memory across every project. When the Apply project asks "what comp floor should I set?" it can read `class::coo-leverage` because the Class memory is tagged `visibility: cross-project`. A `_spine/CONFLICTS.md` flags inconsistencies (Class memory says Russell is 100% focus through Q3; Locality memory says deliver client work weekly — the conflict surfaces for arbitration rather than silently coexisting).

**Continuous Ingestion of Slack/Gmail/Drive** — the highest-leverage piece. Today these are searched on demand; the spine ingests them on a schedule into a structured intelligence stream at `_spine/intelligence/YYYY-MM-DD.jsonl`. Each line is a typed signal: `decision`, `commitment`, `risk`, `signal`, `customer_event`, `competitor_event`. Each carries participants, entities, source pointer, and links to relevant memory. Five scheduled tasks drive the ingestion: Gmail morning at 6am, Slack exec-channel hourly during business hours, Slack weekly decision-extractor Sunday evening, Drive nightly diff scan, session-close ledger update. Watermarks at `_spine/watermarks/*.json` prevent re-processing.

**Session Transcript Indexing** — `_spine/SESSION_LEDGER.md` catalogs every prior Cowork session with topic, conclusions, files produced, and related prior sessions. Pass 1 of every `/deep` run greps the ledger for entities in the current query. The "have we discussed this before?" reflex is built in. Prevents Claude from re-walking ground we already covered or contradicting prior analysis.

**Identity Resolution Layer** — `_spine/identities/{canonical_id}.md` files unify the four ghosts: Chasen-the-Gmail-address, Chasen-the-Slack-user, Chasen-the-Salesforce-owner, Chasen-in-board-minutes. Each identity file lists canonical name, all aliases (emails, Slack IDs, SFDC user IDs, NS employee IDs, Drive owner IDs), primary system of record, recent activity links, sensitivity, and a pointer to the relevant memory. Critically: when a query mentions an identity, Claude resolves to canonical_id first, then pulls signal across all systems with the alias union. The same identity discipline applies to companies (Class, Holdco, Barclays, top customers, competitors).

**The Master Knowledge Spine Cowork Artifact** — a live dashboard pinned in Cowork. Top zone: today's three digest cards (Gmail morning, Slack overnight, Drive diffs). Then active projects with memory and session counts. Then top identities by recent touch frequency. Then a scrollable intelligence stream. Then conflicts needing arbitration. Then ingestion health (watermark freshness — red if stale). Russell opens this artifact and sees the state of every knowledge surface in one screen.

**Why this layer matters most.** Slack, Gmail, and Drive collectively contain the actual record of how Class is dying and what's being decided about it. Searching them ad-hoc means Claude is reactive — Russell has to know to ask. Continuous structured ingestion means Claude is proactive — Russell asks "what should I know?" and Claude answers from a pre-built intelligence layer.

---

## 3. Layer 2: Turnaround Operating Library

Full library in `turnaround_operating_library.md`. Synthesis:

This is the reference library Claude consults during Pass 1 bootstrap on any strategic question. It codifies the frameworks and case studies an expert turnaround COO would draw on, with each entry explicitly mapped to Class's situation. Eight sections.

**Strategic Framing Frameworks** — Grove's Strategic Inflection Point (Class has already passed its), Hamilton Helmer's 7 Powers (the only available power for Class is Switching Costs — lean hard there, abandon competition on open dimensions), Christensen Disruption (is Class being disrupted from below by AI-native platforms — likely yes), McKinsey Three Horizons (Horizon-1 defense is the only realistic mode), BCG Growth-Share as a product-line portfolio frame, Stockdale Paradox (confront brutal facts AND retain faith), Drucker's "what business are we really in?" forcing question.

**Turnaround Doctrine** — Watkins 100-day plan, cash-is-king discipline (DSO/DPO/working-capital), the stabilize-restructure-reposition-grow sequence, Diamond/Voss negotiation frameworks (replacing the misleading "Trump negotiation" lore), burning-platform communication doctrine, cut-once-deep vs. death-by-a-thousand-cuts, Hastings qualified-talent thesis, covenant-relief playbook, 13-week cash forecast as a standard, no-surprises board operating cadence, when to bring in a Chief Restructuring Officer (not yet — keep a shortlist warm).

**SaaS-Specific Turnaround Patterns** — Rule of 40 inversion (opinionated take: stop reporting it internally, it's demoralizing and not actionable in decline), Bessemer benchmarks, Net Revenue Retention as the single survival metric for mature SaaS, expand-vs-new-logo reallocation in late-stage decline, Patrick Campbell / Madhavan Ramanujam pricing thesis (pricing is the highest-leverage lever), Land-and-Expand reversal patterns, PLG as CAC compression, "concentrate-then-decide" — the playbook of doubling down on the most defensible segment.

**Turnaround Case Studies** — Apple 1997 (radical SKU reduction → focus), Netflix Qwikster reversal (admitting strategic mistakes publicly), Microsoft/Nadella (culture-first), Domino's 2009 (admit the product), Best Buy under Joly (Renew Blue human-side restructuring), IBM/Gerstner ("the last thing IBM needs is a vision" — operating-discipline-first), Adobe subscription transition, Slack post-Glitch repositioning, plus two edtech cases: Coursera enterprise pivot and the Instructure/PowerSchool PE-rollup dynamics.

**Edtech-Specific Market Patterns** — the 2024-2026 edtech contraction cycle, Higher Ed budget crunch lag effects, the "AI eats LMS" thesis, video-platform commodification (Zoom/Teams/Meet), FedRAMP cost-vs-benefit (opinionated verdict: not now).

**COO Operating Doctrines** — CEO/COO partnership patterns (Iger/Eisner, Cook/Jobs, Nadella/Hood, Collison/Mahdavi), RAPID/DACI decision rights frameworks, the operating cadence rhythm, Grove 1:1 disciplines, Bezos skip-level intel, team-I-have-vs-team-I-need gap analysis, performance management under decline.

**AI-Native Operations** — the user specifically called this out. Section ranks where AI is highest-leverage at a SaaS company in turnaround (CS automation, sales prospecting, content marketing, code review, customer support), build-vs-buy decisions (default: buy, don't build infrastructure during cash crisis), centralize-vs-distribute AI team structure, 30-day deployment discipline, 90-day ROI measurement, specific tool shortlists.

**How to use the library** — five operating disciplines: cite frameworks by name when applying; apply case studies as analogies with the lesson called out; build conviction by citing (opinions backed by frameworks are credible); flag where conventional wisdom doesn't apply to Class; be opinionated.

**Why this layer matters.** A Pass 2 CFO lens that says "we should cut headcount" is a opinion. A Pass 2 CFO lens that says "we should follow the cut-once-deep doctrine — single major reduction with full counsel review, not staged cuts that compound severance-timing problems and signal panic — Reed Hastings argued this in his qualified-talent thesis at Netflix" is conviction backed by doctrine. The library makes the difference.

---

## 4. Layer 3: Conviction Backbone

Full design in `Strategic_AI_Conviction_Backbone.md`. Synthesis:

The conviction backbone is four interlocking artifacts that convert analysis into tested, calibrated, accumulating institutional belief.

**The Position Library** (`positions/`) — every substantive position Claude takes lives here as a file. Schema includes the claim, confidence (0-100 with explicit semantics), evidence, dependencies on other positions, counter-evidence that would force revision, last-updated date, supersedes/superseded-by links, and the decision it supports. Active positions live in `positions/active/`. Superseded positions move to `positions/superseded/` (never deleted — audit trail). Monthly library audit retests every active position against current data; failed retests get superseded.

The discipline: every Pass 2 lens that takes a stance writes a position. Every Pass 3 red-team finding that survives modifies a position. Every Pass 5 memory write that is a *belief* (not a fact) becomes a position rather than a project memory. Pre-seeded positions from what we already know: POS-001 "AWS 30% cut infeasible in 90 days, ceiling ~12%" (confidence 75), POS-002 "July trough is headcount-irrelevant" (confidence 90), POS-003 "W30 resolves with AR pull + AP defer + BACA release" (confidence 80), POS-004 "International Higher Ed at 47.9% is the #1 survivability risk" (confidence 70), POS-005 "Russell's leverage is silent" (confidence 85), POS-006 "CFO spread-mode severance is legally required, not preference" (confidence 80).

**The Decision Log** (`decisions/`) — every major decision Russell or the exec team makes gets captured. Schema includes context, options considered (with pros/cons/why-rejected for each), rationale, assumptions that must hold, reversibility (Bezos one-way vs two-way door), confidence at time of decision, tripwires that would force reversal, eventual outcome, outcome-confidence-delta, and retrospective lesson. Every `/deep` run that produces a recommendation drafts a decision log entry that Russell accepts/modifies/rejects.

Pre-seeded decisions: DEC-001 COO compensation proposal sent to Chasen, DEC-002 W30 lever stack (AR + AP + BACA, not headcount or AWS), DEC-003 May 18 cash model methodology (build from NetSuite not from prior board deck — already resolved correctly), DEC-004 defer broader workforce action until post-renewal-cycle.

**The Calibration Tracker** (`calibration/`) — every position with a forward measurable claim spawns predictions in `calibration/predictions/`. Each prediction has a resolution date and criterion. The `calibration/SCORECARD.md` is recomputed weekly: for each confidence band (0-20%, 20-40%, ..., 80-100%), what fraction of predictions in that band actually resolved true? Brier-score-equivalent. Patterns surface — for instance: "Slight overconfidence on Barclays-dependent predictions; subtract 10 points from confidence on any future position that hinges on Barclays cooperation."

The system improves its own confidence calibration over time, transparently and auditably. When Claude states a confidence on a new position, it's shown in two numbers: the instinct, the calibration adjustment, and the stated number after adjustment.

**The Pre-Mortem Library** (`pre-mortems/`) — failure mode catalog. Each pre-mortem describes the failure scenario in one paragraph, assigns probability and impact, lists concrete early-warning signals, specifies preventive mitigation, and contains a response playbook. Pre-seeded for Class: PM-001 Barclays calls the loan, PM-002 top federal customer non-renews, PM-003 key engineering lead resigns mid-crisis, PM-004 International HED segment collapses, PM-005 AWS audit finds uncommitted overage, PM-006 the May 10 cash forecast turns out to have a major error, PM-007 Chasen exits or is replaced.

**How the four reinforce each other.** Positions support decisions. Decisions spawn predictions. Predictions resolve and the calibration scorecard updates. Future positions get confidence adjustments before being written. Pre-mortems describe position failures and their tripwires force position retests. Six months from now, Russell can ask "what did Claude believe in May about the July trough, and was it right?" and the answer is in the library, dated and confidence-stamped.

**Why this layer matters.** Right now Claude does analysis. Russell needs Claude to have *opinions* — informed, defensible, tested by outcome. Without the conviction backbone, every session restarts at "well, here are some considerations." With it, Claude says "I believe X with 75% confidence, here's the evidence, here's what would change my mind, last retested two weeks ago, supports decision DEC-002, spawned predictions PRED-001 and PRED-002 both still open."

---

## 5. Layer 4: Stakeholder + Workstream + Adversarial

Full designs in `Strategic_AI_Stakeholder_Workstream_Adversarial.md`. Synthesis:

**Stakeholder Models** (`stakeholders/`) — maintained models of the 30+ people and entities Russell operates against. Categories: internal exec/board (Chasen, board members, Holdco principal), external capital (Barclays primary contact + workout team, Holdco counsel), top-ARR customers (top 10, especially the International Higher Ed concentration cohort), at-risk customers (top 5 in the renewal-risk cohort), internal dependencies (top 5 people Russell most depends on — Roxana, Kendall, Clayton, technical lead, top AE), vendors (AWS, Zoom, Anthology), competitors (Engageli, Top Hat, others as identified).

Each model captures: canonical name + role + organization, relationship to Russell, decision rights this person has over Russell's work, communication style (cited from observed patterns), the 3-5 things they consistently care about, hot buttons (what triggers them), what NOT to do, last known status with recent activity, open commitments (in both directions), intel signals, linked memories. A weekly scheduled task scans Gmail/Slack/Calendar for activity involving each stakeholder and updates `last_known_status` and `flag` (HOT/WARM/COLD) fields. Pre-built example files exist for Chasen, Barclays primary, an International Higher Ed customer template, and Roxana.

**Multi-Front Workstream Tracker** (`workstreams/`) — the twelve turnaround tracks Russell is running in parallel: WS-01 Cash Defense / July 26 Trough (RED), WS-02 ARR Retention (YELLOW), WS-03 Org Redesign (YELLOW), WS-04 AWS / Infra Cost (YELLOW), WS-05 AR/AP Working Capital (YELLOW), WS-06 Barclays Relationship (YELLOW), WS-07 Board / Holdco Narrative (GREEN), WS-08 Product / AI-Native Repositioning (YELLOW), WS-09 GTM Refinement (YELLOW), WS-10 Russell's COO Comp Negotiation (YELLOW), WS-11 Russell's Parallel Job-Hunt (GREEN private), WS-12 M&A Optionality (YELLOW).

Each workstream file has: owner, phase, status (with explicit GREEN/YELLOW/RED criteria), cash impact estimate, ARR impact estimate, people involved, dependencies on / depended on by, next milestone with date, decisions pending, linked positions, linked decisions, summary, and an append-only notes log. `workstreams/DASHBOARD.md` is auto-regenerated and shows the matrix plus the cross-front heat map (e.g., WS-01 ↔ WS-03 via severance timing; WS-01 ↔ WS-06 via trough driving lender conversation).

The discipline: every `/deep` topic gets tagged to its primary and secondary workstream IDs at the start. Pass 2 reconciliation has a *mandatory* cross-front check: "What other workstreams does this position affect? For each, what is the second-order impact on cash, ARR, people, or lender posture?" The workstream dependency graph forces this analysis instead of leaving it to memory.

**The Adversarial Layer** (`adversarial/`) — a persistent, growing library of external threats. Subfolders: `competitor-watch/` (one file per tracked competitor, refreshed weekly via Brightdata), `regulatory-watch/` (FedRAMP, state EDU regs, GDPR, Czech/UK employment law), `financial-tripwires/` (Barclays leverage covenant, cash trigger levels, NRR thresholds, customer concentration), `customer-defections/` (pattern library — downsize-to-non-renewal, quiet exit, public criticism), `internal-defection-risk/` (flight-risk model + per-person risk files for top 5 dependencies).

A Monday 6:00am scheduled task scans `financial-tripwires/` against current Finance model data. Anything within 15% of a threshold gets flagged YELLOW; within 5% gets RED. Results post to the Workstream Dashboard.

The discipline: every Pass 3 red-team finding that involves an external party files into the appropriate adversarial subfolder during Pass 5. The library compounds rather than rebuilding each session.

**How these three layers reinforce v1's Pass 1-5 loop.**

Pass 1 (Bootstrap) reads more than generic memory. Based on the topic's workstream tag(s), Pass 1 now ingests the relevant workstream file, every stakeholder model of every person named, and adversarial files cross-referenced. Bootstrap goes from "what does Russell know?" to "what does Russell know, who's involved, what are their patterns, what's already in motion, and what could go wrong?"

Pass 2 (Reconciliation) gains a mandatory cross-front check + stakeholder hot-button check. A position that triggers a known hot button in a key approver gets flagged or restructured before it leaves Pass 2.

Pass 3 (Red Team) draws from the adversarial library instead of red-teaming from scratch. New findings file back into the library.

Pass 4 (Polish) uses stakeholder models to tune delivery. Same recommendation gets framed differently for Chasen (short, no surprises, action-oriented) than for Barclays (formal, base-case-only). The stakeholder file is the style guide for the audience.

Pass 5 (Memory) does three things: writes the headline finding (v1 behavior), updates `last_known_status` and `intel_signals` on every stakeholder touched, and updates `next_milestone` on every workstream advanced. The system maintains itself.

**Why this layer matters.** A turnaround is parallel by nature. Cash, ARR, org, infrastructure, lender, board, product, GTM, personal comp, and personal exit-option all move at once. Without the workstream tracker, cross-front impacts surface only when they explode. Without stakeholder models, every comms decision restarts at zero. Without the adversarial library, red-teaming is improvisational rather than institutional.

---

## 6. The new top-of-stack directory structure

After v2, the `Business Planning/` folder picks up the following new subdirectories. Each gets a top-level index file (README.md or INDEX.md or DASHBOARD.md) that's the entry point.

```
Business Planning/
├── Strategic_AI_Operating_Model.md             [v1]
├── Strategic_AI_Operating_Model_v2.md          [this file]
├── Strategic_AI_Invocation_Guide.md            [v1]
├── Strategic_AI_Stack_Inventory.md             [v1]
├── Strategic_AI_Connector_Playbook.md          [v1]
├── Strategic_AI_Knowledge_Base_Audit.md        [v1]
├── Strategic_AI_Cross_Claude_Spine.md          [v2 new — full spine design]
├── Strategic_AI_Conviction_Backbone.md         [v2 new — full conviction design]
├── Strategic_AI_Stakeholder_Workstream_Adversarial.md [v2 new]
├── turnaround_operating_library.md             [v2 new — reference library]
├── SKILL.md                                    [updated to v2]
├── positions/                                  [v2 new]
│   ├── README.md
│   ├── active/
│   └── superseded/
├── decisions/                                  [v2 new]
│   ├── INDEX.md
│   └── [DEC-NNN files]
├── calibration/                                [v2 new]
│   ├── SCORECARD.md
│   ├── predictions/
│   └── resolved/
├── pre-mortems/                                [v2 new]
│   ├── INDEX.md
│   └── [PM-NNN files]
├── stakeholders/                               [v2 new]
│   ├── INDEX.md
│   ├── internal-exec-board/
│   ├── external-capital/
│   ├── customers-top-arr/
│   ├── customers-at-risk/
│   ├── internal-dependencies/
│   ├── vendors/
│   └── competitors/
├── workstreams/                                [v2 new]
│   ├── DASHBOARD.md
│   └── [WS-NN files]
├── adversarial/                                [v2 new]
│   ├── INDEX.md
│   ├── competitor-watch/
│   ├── regulatory-watch/
│   ├── financial-tripwires/
│   ├── customer-defections/
│   └── internal-defection-risk/
├── investigations/                             [v1 — created on first /deep]
└── deliverables/                               [v1 — created on first /deep]
```

The cross-Claude spine lives one level UP from any single project:

```
/Users/russellteter/Documents/Claude/Projects/_spine/
├── INVENTORY.md
├── MEMORY_INDEX.md
├── SESSION_LEDGER.md
├── CONFLICTS.md
├── identities/
│   ├── chasen.md
│   ├── class.md
│   ├── barclays.md
│   ├── holdco.md
│   └── [cust-* and comp-*]
├── intelligence/
│   └── YYYY-MM-DD.jsonl
├── digests/
│   └── [gmail|slack|drive]-YYYY-MM-DD.md
├── watermarks/
│   ├── gmail.json
│   ├── slack.json
│   ├── drive.json
│   └── sessions.json
└── artifact_id.txt    [the Cowork artifact UUID]
```

---

## 7. The v2 Day-One bootstrap addendum

When Russell triggers "Run Day One bootstrap" after v2 lands, the sequence extends:

1-9. v1 sequence runs first (see `Strategic_AI_Operating_Model.md` §8).

10. Create `_spine/` directory and scaffold files. Write `INVENTORY.md` from a one-time inventory walk. Write `MEMORY_INDEX.md` from existing memory. Write empty `SESSION_LEDGER.md` and `CONFLICTS.md`.

11. Write the six core identity files: chasen, class, barclays, holdco, russell-self, plus one customer template.

12. Register the five scheduled ingestion tasks: spine.gmail.morning (6am daily), spine.slack.exec.hourly (9-18 business hours), spine.slack.decisions (Sunday 6pm weekly), spine.drive.diff (7am daily), spine.session.close (nightly 11pm sweep + on-session-end).

13. Run the one-time backfill: ingest last 30 days of Slack/Gmail/Drive into the intelligence stream, then advance watermarks.

14. Run the session-close job once across all prior sessions to populate the ledger.

15. Create the "Knowledge Spine" Cowork artifact (separate from the v1 "Strategic Operating Dashboard"). Store its ID at `_spine/artifact_id.txt`.

16. Inside `Business Planning/`, create the new subdirectories with their seed index files.

17. Pre-seed the Position Library with the six known positions (POS-001 through POS-006). Pre-seed the Decision Log with the four known decisions (DEC-001 through DEC-004). Pre-seed the Pre-Mortem Library with the seven scenarios (PM-001 through PM-007). Pre-seed the twelve workstream files (WS-01 through WS-12) with the seed summaries.

18. Pre-seed stakeholder models for Chasen, Barclays-primary, one International Higher Ed customer template, and Roxana (rest will fill in via the weekly refresh).

19. Schedule the v2 weekly jobs: Monday 6am financial-tripwire scan, Monday 7am stakeholder activity refresh, Weekly competitor-watch Brightdata scan, weekly calibration scorecard recompute.

20. Return an updated welcome screen that lists the v2 layers, the count of pre-seeded artifacts in each, and the recommended first `/deep` topics — same as v1 but with each topic now landing into a known workstream.

---

## 8. The invocation surface after v2

The five v1 modes (`/deep`, `/quick`, `/continue`, `/post-mortem`, Scheduled) all still work. v2 adds three more:

- **`/audit-positions`** — runs the monthly library audit. Walks every active position, retests against current data, flags positions that need confidence adjustment or supersession.

- **`/tripwire-scan`** — runs the financial-tripwire scan against current data. Returns RED/YELLOW/GREEN per tripwire with the actual current value vs. threshold. Auto-runs Monday 6am via scheduled task; manual trigger when something feels off.

- **`/stakeholder-refresh [name]`** — runs the weekly activity refresh against a single stakeholder. Useful before a 1:1 or a major conversation.

The default v1 invocations (`/deep`, `/quick`, `/continue`) are also v2-aware. They auto-read the relevant stakeholder models, workstream files, and adversarial entries during Pass 1. They write back during Pass 5. Russell's typing surface doesn't change; the depth of context does.

---

## 9. Why these four layers are the right four

The user asked: how does this become an *expert-level* operating partner? The four layers are organized around the four things "expert" means in practice:

1. **Expert knows what's already known.** The Cross-Claude Spine ensures Claude is aware of every conversation, file, and signal that has ever touched Russell's Claude. No more "let me re-derive from scratch."

2. **Expert draws on doctrine.** The Turnaround Operating Library codifies the frameworks an expert turnaround COO actually uses. Citations and analogies aren't decorative — they're how expert thinking compounds.

3. **Expert holds calibrated opinions.** The Conviction Backbone makes the system's beliefs explicit, tested, and improved by outcome. Without it, every session restarts at "well, here are some considerations."

4. **Expert is situationally aware.** The Stakeholder + Workstream + Adversarial layers mean every recommendation lands in a specific political and operational context, with a specific audience, in a specific moment, against specific threats.

Strip any one layer and the system regresses. Spine without library = informed but not expert. Library without conviction = expert but uncommitted. Conviction without stakeholders = committed but tone-deaf. Stakeholders without workstreams = aware but uncoordinated. Together they form an institutional intelligence that can carry the weight of a real turnaround.

---

## 10. What's still missing after v2 (the v3 backlog)

To be honest about scope — even with v2 the system has gaps:

- **No real product instrumentation.** Without Amplitude/Mixpanel/Pendo, Claude can't see who's actually using the platform vs. renewing on inertia. POS-004's confidence stays at 70 until we close this.
- **No call intelligence.** Gong/Chorus is still the single biggest CRO gap. Renewal-risk signals live in calls.
- **No payroll MCP.** Rippling integration would close the NetSuite payroll blind spot and let severance be modeled live.
- **No covenant tracker as a custom skill.** Should be authored once we have the Barclays facility terms confirmed in machine-readable form.
- **No agent observability.** When a `/deep` run produces a bad answer, there's no automatic flag for review — the post-mortem mode is manual.

These are the v3 backlog. Worth installing in order: Rippling (highest cash-defense leverage), Gong (highest retention leverage), product telemetry (highest strategy leverage), then the custom skills (covenant-tracker, weekly-cash-forecast, renewal-forecast).

---

## 11. The Day Two

Day One stands up the scaffold. Day Two is when Russell starts using it. Sequence:

- Morning of Day Two: open the Knowledge Spine artifact. Read the overnight digest. Look at the workstream dashboard. Note any tripwires that flipped overnight.
- Pick the highest-stakes investigation. Invoke `/deep` on it.
- During the run, watch the position library and decision log populate.
- After the run, review the deliverable. Update the decision log entry to `approved` or `modified` or `rejected`.
- The day's work flows through the system rather than around it.

Six months in, the position library has 60-80 active positions, the decision log has 40-60 entries with outcomes filled in, the calibration scorecard shows where Claude is reliable and where it's not, the workstream dashboard shows what's moved, the stakeholder models have rich activity history, and the adversarial library has caught threats before they materialized. The system has institutional memory in a way a single human in a turnaround simply cannot.

That's the goal. v2 is the architecture that makes it possible.
