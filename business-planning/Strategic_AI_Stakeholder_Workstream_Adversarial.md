# Strategic AI — Stakeholder, Workstream, and Adversarial Layers

**Companion to:** `Strategic_AI_Operating_Model_v2.md`
**Purpose:** Three sophistication layers that harden the v1 Pass 1-5 architecture into a continuously updated, multi-actor, multi-front, adversarially-aware operating system.

---

## ARTIFACT 1: STAKEHOLDER MODELS

The system must think *about* people and entities, not just *for* Russell. Decisions in a turnaround are never abstract — they land on specific people with specific patterns, fears, and leverage. A maintained model of each one removes guesswork from every Pass 2 reconciliation.

### Path & Index Structure

```
Business Planning/stakeholders/
├── INDEX.md                                    # master index, updated weekly
├── internal-exec-board/
│   ├── chasen-LASTNAME-ceo.md
│   ├── board-member-1.md
│   ├── board-member-2.md
│   ├── board-member-3.md
│   └── holdco-principal.md
├── external-capital/
│   ├── barclays-primary.md
│   ├── barclays-workout-team.md
│   └── holdco-counsel.md
├── customers-top-arr/
│   ├── customer-01-INTL-HIGHER-ED.md           # 47.9% concentration cohort
│   ├── customer-02-INTL-HIGHER-ED.md
│   └── ... (top 10)
├── customers-at-risk/
│   ├── risk-01.md
│   └── ... (top 5)
├── internal-dependencies/
│   ├── roxana-LASTNAME.md
│   ├── kendall-LASTNAME.md
│   ├── clayton-LASTNAME.md
│   ├── technical-lead.md
│   └── top-ae.md
├── vendors/
│   ├── aws.md
│   ├── zoom.md
│   └── anthology.md
└── competitors/
    ├── engageli.md
    ├── top-hat.md
    └── competitor-3.md
```

### INDEX.md schema

```markdown
# Stakeholder Index
Last refresh: YYYY-MM-DD HH:MM (auto-updated by weekly scan)

## Flag Legend
- [HOT]  = activity in last 7 days
- [WARM] = activity in last 30 days
- [COLD] = no signal in 30+ days
- [!!]   = unresolved commitment from Russell
- [??]   = unresolved commitment TO Russell

## Internal Exec / Board
| Stakeholder | Role | Flag | Last touch | Open items |
| Chasen [LASTNAME] | CEO | [HOT] [!!] | 2026-05-20 | COO offer terms |
...
```

### Stakeholder file schema

```markdown
---
canonical_name: "Chasen [LASTNAME]"
role: "CEO, Class Technologies"
organization: "Class Technologies, Inc."
relationship_to_russell: "boss"
decision_rights:
  - "Approves Russell's COO comp package"
  - "Final sign-off on all org changes"
  - "Owns board narrative; Russell drafts, Chasen edits"
  - "Co-decision on Barclays comms (with CFO)"
last_refreshed: "YYYY-MM-DD"
flag: "HOT"
---

# Communication Style
[2-4 lines, cited from observed Slack/email/meeting patterns]

# What They Care About (3-5 things)
1. ...

# Hot Buttons
- ...

# What NOT To Do
- ...

# Last Known Status
- YYYY-MM-DD: [event/comm]

# Open Commitments
## From me to them:
- [ ] ...
## From them to me:
- [ ] ...

# Intel Signals
- ...

# Linked Memories
- [memory key 1](../../memory/...)
```

### Discipline: weekly 5-minute refresh

Monday 7:00 AM scheduled task:
1. Scan Gmail for messages to/from each stakeholder's known email(s) past 7 days
2. Scan Slack for DMs/mentions past 7 days
3. Scan Calendar for meetings held or scheduled
4. Update `last_known_status` and `flag`
5. Append new signals to `intel_signals`
6. Regenerate INDEX.md table

### Worked example — Chasen (CEO)

```markdown
---
canonical_name: "Chasen [LASTNAME]"
role: "CEO, Class Technologies"
organization: "Class Technologies, Inc."
relationship_to_russell: "boss"
decision_rights:
  - "Approves Russell's COO comp package and offer letter"
  - "Final sign-off on all org changes and severance decisions"
  - "Owns board narrative; Russell drafts, Chasen edits"
  - "Co-decision authority on Barclays comms with CFO"
  - "Sole approver of M&A overtures"
last_refreshed: "2026-05-21"
flag: "HOT"
---

# Communication Style
Short-form, action-oriented Slack DMs preferred over email. Email is for board/legal/external. In meetings processes verbally — talks through decisions out loud, uncomfortable with long silence. [PLACEHOLDER — confirm from 30-day comm scan.]

# What They Care About
1. Surviving July 26 trough without breaching Barclays
2. Preserving Holdco's optionality on a sale path
3. Board confidence — never being surprised on a board call
4. Not losing key technical talent before product repositioning lands
5. Personal financial outcome tied to Newco MIP and Holdco equity

# Hot Buttons
- Surprises in board materials he hasn't pre-read
- Severance decisions presented without legal review
- Anything that reads as Russell going around him to the board
- Public-facing comms (LinkedIn, press) without his sign-off

# What NOT To Do
- Don't surface a hard problem in a group setting before 1:1 framing
- Don't put dollar figures in writing before he's seen the model
- Don't draft Barclays correspondence without CFO loop-in
- Don't volunteer optimism — he reads it as naive

# Last Known Status
- 2026-05-20: 1:1 — discussed COO offer terms, no resolution; asked for "one more week"
- 2026-05-18: Reviewed cash model; signed off on May 18 NetSuite baseline
- 2026-05-15: Board prep — accepted Russell's slide 16 framing of W30 trough

# Open Commitments
## From me to him:
- [ ] Revised cash lever scenarios with severance-timing overlay (due 2026-05-25)
- [ ] Stakeholder list for Barclays workout-team outreach (due 2026-05-23)
## From him to me:
- [ ] COO comp counter (verbal "one more week" on 2026-05-20)
- [ ] Decision on Holdco principal intro (pending since 2026-05-12)

# Intel Signals
- 2026-05-19: Increased frequency of calls with Holdco counsel (3x in past week per calendar) — suggests sale-path conversation accelerating

# Linked Memories
- coo_negotiation_leverage.md
- russell_newco_equity_stack.md
- cfo_severance_policy.md
- finance_cash_forecast_authoritative.md
```

### Other worked examples available

Full worked templates exist in this design for: Barclays primary contact, top-ARR Intl HED customer template, Roxana (internal dependency). All follow the same schema; placeholders mark where real data fills in via ingestion.

---

## ARTIFACT 2: MULTI-FRONT WORKSTREAM TRACKER

A turnaround is parallel by nature. Cash, ARR, org, infrastructure, lender, board, product, GTM, personal comp, personal exit-option all move at once.

### Path & Structure

```
Business Planning/workstreams/
├── DASHBOARD.md                            # master view, auto-regenerated
├── WS-01-cash-defense.md
├── WS-02-arr-retention.md
├── WS-03-org-redesign.md
├── WS-04-aws-infra-cost.md
├── WS-05-working-capital.md
├── WS-06-barclays-relationship.md
├── WS-07-board-holdco-narrative.md
├── WS-08-product-ai-repositioning.md
├── WS-09-gtm-refinement.md
├── WS-10-russell-coo-comp.md
├── WS-11-russell-job-hunt.md
└── WS-12-ma-optionality.md
```

### Workstream file schema

```markdown
---
workstream_id: "WS-01"
title: "Cash Defense / July 26 Trough"
owner: "Russell (with CFO)"
phase: "execution"          # discovery | planning | execution | monitoring | wrap
status: "RED"               # GREEN | YELLOW | RED
status_criteria:
  green: "Trough cash >$500K projected; no covenant pressure"
  yellow: "Trough $250-500K; covenant cushion <20%"
  red:   "Trough <$250K or covenant cushion <10%"
cash_impact:
  amount_usd: "+$X to +$Y range across levers"
  direction: "positive"
  timing: "must land before W30"
arr_impact:
  amount_usd: "neutral, downside if customer-impacting cuts made"
  direction: "neutral/negative"
  timing: "n/a"
people_involved:
  - "CFO"
  - "Roxana"
  - "AWS owner"
  - "AR lead"
depends_on: []
depended_on_by:
  - "WS-03 (severance timing keyed to cash availability)"
  - "WS-06 (Barclays — trough drives covenant conversation)"
next_milestone: "Lock final lever stack by 2026-06-01"
next_milestone_date: "2026-06-01"
decisions_pending:
  - "Whether to defer AP beyond contractual terms with top 3 vendors"
  - "Whether to draw remaining revolver capacity pre-trough"
linked_positions: [POS-002, POS-003]
linked_decisions: [DEC-002]
last_updated: "2026-05-21"
---

# Summary
[2-3 line description]

# Active Workstream Notes
[Append-only log of substantive updates]
```

### Discipline: cross-front tagging

Every `/deep` topic declares primary + secondary workstream IDs at start. Pass 2 reconciliation has a **mandatory cross-front check**: "What other workstreams does this position affect? For each, what is the second-order impact on cash, ARR, people, or lender posture?"

Pass 5 updates `last_updated` and `next_milestone` on touched workstreams.

### The 12 core workstreams (seed summaries)

**WS-01 — Cash Defense / July 26 Trough.** RED. Russell + CFO. Single-most-time-critical. W30 trough $111,766. Levers: AWS, AR, AP, restricted-cash. Severance-timing constraint = employee cuts don't help July. Drives WS-03, WS-06.

**WS-02 — ARR Retention / Renewal Risk.** YELLOW. Head of CS (Russell oversees). ARR cliff $35.85M → $20.57M is existential. 47.9% Intl HED concentration is structural risk. Top-5 at-risk need named owner + 90-day plan. Depends on WS-08.

**WS-03 — Org Redesign / Right-Sizing.** YELLOW. Russell. 41 GTM employees today. Constraint: CFO severance policy (spread-mode 2-12 weeks) means cuts don't relieve July. Cuts time to land savings starting Q4. Depends on WS-01, WS-09.

**WS-04 — AWS / Infrastructure Cost Optimization.** YELLOW. Technical lead + Russell. AWS CLI configured. Highest-velocity July-trough lever. Depends on nothing; feeds WS-01.

**WS-05 — AR/AP Working Capital Release.** YELLOW. CFO + Controller. AR acceleration targets with discount logic; AP deferral with top vendors. Stale NS AP entries need clean-up first. Feeds WS-01.

**WS-06 — Barclays Relationship / Covenant Management.** YELLOW. CFO (Russell shadow). $30M facility. $2.5M BACA restricted. Anticipatory reporting cadence + covenant tripwire watch. Depends on WS-01; influences WS-12.

**WS-07 — Board Narrative / Holdco Relationship.** GREEN. CEO (Russell drafts). Slide-16 W30 framing accepted in May. Monthly cadence. Holdco principal gatekeeps M&A. Depends on every other workstream; influences WS-10.

**WS-08 — Product Strategy & AI-Native Repositioning.** YELLOW. CPO/Product lead (Russell partners). Story that turns ARR cliff into re-expansion. AI-native vs legacy synchronous-class incumbent narrative. 6-12mo lead time. Feeds WS-02, WS-09.

**WS-09 — GTM Refinement.** YELLOW. Russell + top AE/CRO. Segment focus (concentrate or diversify from Intl HED?), pricing review, motion design. Depends on WS-08, WS-03. Most reorgs fail because GTM motion isn't redesigned first.

**WS-10 — Russell's COO Comp Negotiation.** YELLOW. Russell solo. 180 Class E units + 2.25% MIP (~$675K cap). $0 without sale. Good Reason narrow; Cause broad; Barclays 3rd-party beneficiary. Personal but touches everything — leverage is real walk-away, so WS-11 is functionally a dependency.

**WS-11 — Russell's Parallel Job-Hunt.** GREEN (private). Russell solo confidential. Walk-away leverage is silent — never spoken. Active enough to be credible without becoming flight-risk signal internally. Maintains optionality, informs WS-10.

**WS-12 — M&A Optionality / Strategic Alternatives.** YELLOW. CEO + Holdco principal. Optionality preservation is Chasen's stated care. Increased Holdco-counsel call frequency (Chasen file intel signal) suggests path acceleration. Russell's role: ready data room + credible buyer-side narrative. Depends on WS-06, WS-02, WS-08.

### DASHBOARD.md (auto-regenerated)

```markdown
# Workstream Dashboard
Last regen: 2026-05-21

| ID    | Title                      | Owner       | Phase      | Status | Next milestone        |
| WS-01 | Cash Defense / July 26     | Russell+CFO | execution  | RED    | 2026-06-01 lock levers|
| WS-02 | ARR Retention              | Head CS     | planning   | YELLOW | Top-5 plans by 06-15  |
| WS-03 | Org Redesign               | Russell     | planning   | YELLOW | Slate to CEO 06-10    |
| WS-04 | AWS Infra Cost             | Tech lead   | execution  | YELLOW | Lock cuts by 06-05    |
| WS-05 | AR/AP Working Capital      | CFO         | execution  | YELLOW | AR pull by 06-15      |
| WS-06 | Barclays Relationship      | CFO+Russell | monitoring | YELLOW | Monthly report 06-01  |
| WS-07 | Board/Holdco Narrative     | CEO+Russell | execution  | GREEN  | Q2 deck by 06-20      |
| WS-08 | Product AI Repositioning   | CPO         | discovery  | YELLOW | Strategy v1 07-15     |
| WS-09 | GTM Refinement             | Russell+AE  | planning   | YELLOW | Motion v1 by 07-01    |
| WS-10 | Russell COO Comp           | Russell     | execution  | YELLOW | Chasen counter +1wk   |
| WS-11 | Russell Job Hunt           | Russell     | execution  | GREEN  | Apply daily briefing  |
| WS-12 | M&A Optionality            | CEO+Holdco  | discovery  | YELLOW | Holdco intro pending  |

## Cross-Front Heat Map
WS-01 ←→ WS-03 (severance timing)
WS-01 ←→ WS-06 (trough → lender)
WS-02 ←→ WS-08 (retention needs repo story)
WS-03 ←→ WS-09 (org follows GTM, not vice versa)
WS-10 ←→ WS-11 (leverage track)
WS-06 ←→ WS-12 (lender consent on M&A)
```

---

## ARTIFACT 3: THE ADVERSARIAL LAYER

Persistent, growing library of external threats. Beyond Pass 3 red-team-in-the-moment — institutional memory of every adversarial finding.

### Path & Structure

```
Business Planning/adversarial/
├── INDEX.md
├── competitor-watch/
│   ├── engageli.md
│   ├── top-hat.md
│   └── [add as identified]
├── regulatory-watch/
│   ├── fedramp-cost-vs-benefit.md
│   ├── state-edu-data-regs.md
│   ├── gdpr-uk-eu.md
│   └── employment-law-czech-uk.md
├── financial-tripwires/
│   ├── barclays-leverage-covenant.md
│   ├── cash-trigger-levels.md
│   ├── nrr-thresholds.md
│   └── customer-concentration.md
├── customer-defections/
│   ├── pattern-downsize-to-non-renewal.md
│   ├── pattern-quiet-exit.md
│   └── pattern-public-criticism.md
└── internal-defection-risk/
    ├── flight-risk-model.md
    └── [per-person risk files for top 5 dependencies]
```

### Discipline

Every Pass 3 red-team finding involving an external party gets filed during Pass 5. Library grows continuously.

**Monday 6:00 AM scheduled task** scans `financial-tripwires/`:
1. Pull current cash, leverage, NRR, concentration from NS/Finance model
2. Compare against each tripwire's threshold
3. Within 15% → YELLOW; within 5% → RED
4. Post results to top of Workstream Dashboard

### Worked example: competitor-watch/engageli.md

```markdown
---
competitor: "Engageli"
last_refreshed: "2026-05-21"
threat_level: "MEDIUM-HIGH"
overlap_with_class:
  - "Synchronous virtual classroom"
  - "Higher-ed customer base"
  - "LMS integrations"
---

# Why They Matter
Direct overlap in synchronous virtual classroom for higher ed. Recently funded [PLACEHOLDER — Brightdata scan for round size/date]. Co-founded by Coursera founder — gives them edu-narrative oxygen Class struggles to match.

# What They Do Better (Honestly)
- AI-native positioning landed earlier in market narrative
- Cleaner higher-ed brand
- Funding runway not visibly constrained

# What Class Does Better
- Deeper Zoom-platform integration history
- Larger installed base in international higher ed
- Production-grade reliability at scale

# Live Threats to Track
- [ ] Targeting our top-5 at-risk customer list?
- [ ] Pricing posture: undercut on renewal or hold premium?
- [ ] Channel partner overlap (LMS vendors)

# Recent Signals
- [PLACEHOLDER — weekly Brightdata]

# Discovery Questions
- Has any at-risk customer mentioned them in QBR notes?
- Has any churned customer landed there?

# Linked Workstreams
- WS-02, WS-08, WS-09
```

### Worked example: regulatory-watch/fedramp-cost-vs-benefit.md

```markdown
---
regulation: "FedRAMP Authorization"
applicability: "U.S. federal customers; some state EDU prefers"
status: "NOT PURSUED — under review"
last_refreshed: "2026-05-21"
---

# The Question
Does pursuing FedRAMP Moderate (or higher) open enough new revenue to justify spend and timeline, given July trough and ARR cliff?

# Cost Reality
- 12-24 month timeline typical
- $500K-$2M+ all-in (auditors, 3PAO, control implementation, ongoing ConMon)
- Engineering opportunity cost during product repositioning (WS-08)

# Benefit Reality
- Opens federal civilian and DoD-adjacent education segments
- Some state higher-ed systems treat as tiebreaker
- Brand signal on enterprise security maturity

# The Adversarial View
Pursuing FedRAMP in current cash state is **almost certainly wrong**. 2027+ payoff against 2026 survival question. Cost of doing badly (failed audit, public posture of overreach) worse than not doing.

# Tripwire That Would Change This
- Single federal/state contract >$3M ARR makes it a condition of award
- Acquirer due-diligence (WS-12) flags as gating

# Linked Workstreams
- WS-08, WS-12
```

### Worked example: financial-tripwires/barclays-leverage-covenant.md

```markdown
---
tripwire: "Barclays Leverage Covenant"
metric: "Total Debt / TTM Adjusted EBITDA"
threshold: "[CONFIRM from credit agreement; assume 4.5x until verified]"
current_value: "[PULL FROM FINANCE MODEL]"
last_refreshed: "2026-05-21"
---

# Why This Matters
A covenant breach isn't a default in itself — it shifts the relationship and triggers waiver economics (fees, equity-cure question, reporting acceleration). With ARR cliff and Adj-EBITDA basis declining, leverage ratio mechanically deteriorates even if debt stays flat.

# Calculation Notes
- Adjusted EBITDA add-backs per credit agreement
- TTM, not annualized — quarterly cliff timing matters

# Tripwire Bands (assumed 4.5x covenant)
| Band   | Threshold | Action |
| GREEN  | <3.5x     | Standard reporting |
| YELLOW | 3.5-4.0x  | Pre-emptive lender call |
| RED    | 4.0-4.4x  | Workout-team brief + waiver prep |
| BREACH | >4.5x     | Equity cure / waiver / default mode |

# Cross-References
- WS-06, WS-01, WS-12
```

### Worked example: customer-defections/pattern-downsize-to-non-renewal.md

```markdown
---
pattern: "Downsize → Non-renewal"
observed_signal_lead_time: "9-15 months before final non-renewal"
relevance_to_class: "HIGH — higher ed renewal cycles are annual; signal is detectable"
---

# The Pattern
Customer reduces seat count, license tier, or active-product footprint at one renewal cycle. They frame as "right-sizing." Following cycle, they non-renew entirely. The downsize was the silent exit.

# Why It's Dangerous
- Looks like partial win (some ARR preserved)
- CSM celebrates the save; internal alarm doesn't fire
- Buying committee has already begun evaluating alternatives

# Early Detection Signals
- Reduced seat utilization in months leading up to renewal
- CSM contact-frequency drops
- New stakeholder appears late-stage (procurement/finance, not original sponsor)
- Quiet RFP activity — competitor name surfaces without prompt

# Counter-Plays
- Treat every downsize as yellow flag, not save
- Trigger executive-sponsor outreach immediately
- Map full buying committee
- Pre-build renewal narrative 6+ months out

# Cross-References
- WS-02; flag any customer that has downsized in last 18 months
```

---

## HOW THESE THREE LAYERS REINFORCE THE V1 PASS 1-5 LOOP

**Pass 1 (Bootstrap)** auto-reads more than generic memory. Based on the topic's declared workstream tag(s), Pass 1 ingests: relevant workstream file (status, dependencies, next milestone), stakeholder models of every person named, and adversarial files cross-referenced. Bootstrap goes from "what does Russell know?" to "what does Russell know, who's involved, what are their patterns, what's already in motion, and what could go wrong?"

**Pass 2 (Reconciliation)** gains mandatory cross-front check: "What other workstreams does this position affect? Second-order impact?" Workstream dependency graph forces this. Stakeholder hot-buttons appear here — a position triggering a known hot button in a key approver gets flagged or restructured.

**Pass 3 (Red Team)** draws from adversarial library instead of red-teaming from scratch. New findings file back to library.

**Pass 4 (Polish)** uses stakeholder models to tune delivery. Same recommendation framed differently for Chasen (short, no surprises) than for Barclays (formal, base-case-only). Stakeholder file is the style guide.

**Pass 5 (Memory)** does three things instead of one: writes headline finding (v1 behavior), updates `last_known_status` and `intel_signals` on every stakeholder touched, updates `next_milestone` and `last_updated` on every workstream advanced. System maintains itself.

**Three scheduled tasks** keep the layers fresh:
- Monday 6:00 AM — financial-tripwire scan
- Monday 7:00 AM — stakeholder 7-day activity refresh
- Weekly — competitor-watch Brightdata scan

Net effect: Pass 1 starts smarter, Pass 2 catches more cross-front impacts, Pass 3 is institutional rather than improvisational, Pass 4 lands in audience's preferred shape, and Pass 5 makes the next Pass 1 even smarter. The operating model becomes self-reinforcing — exactly what a one-person turnaround command center needs.
