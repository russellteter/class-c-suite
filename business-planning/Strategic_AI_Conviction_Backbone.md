# Strategic AI — Conviction Backbone

**Companion to:** `Strategic_AI_Operating_Model_v2.md`
**Purpose:** Full design of the four-artifact discipline that converts analysis into accumulating institutional conviction — Position Library, Decision Log, Calibration Tracker, Pre-Mortem Library.

The Strategic AI Operating Model has been performing analysis. From this point forward it holds positions. A position is a falsifiable belief held at a stated confidence level, defended by named evidence, and improved by outcome feedback. The four artifacts below convert analytical output into accumulating institutional conviction.

All four live under `Business Planning/`. They are plain markdown so they survive tool changes, are diff-able in git, and are readable on a phone.

---

## Artifact 1: The Position Library

### Location
`Business Planning/positions/`

```
positions/
├── README.md                          # index, like MEMORY.md but for beliefs
├── active/
│   ├── POS-001-aws-90day-ceiling-12pct.md
│   ├── POS-002-july-trough-headcount-irrelevant.md
│   ├── POS-003-w30-resolves-with-ar-ap-baca.md
│   ├── POS-004-intl-hed-concentration-survivability-risk.md
│   ├── POS-005-russell-leverage-silent.md
│   └── POS-006-cfo-spread-severance-legal.md
├── superseded/
└── abandoned/
```

### Position file schema

```markdown
---
id: POS-001
slug: aws-90day-ceiling-12pct
title: AWS 30% cost reduction is infeasible in 90 days; achievable ceiling is ~12%
status: active                  # active | superseded | abandoned | pending-verification
confidence: 75                  # 0-100; semantics in README
created: 2026-05-19
last-updated: 2026-05-21
last-retested: 2026-05-21
supersedes: null
superseded-by: null
authored-by: claude-pass2-cfo-lens
decision-this-supports: DEC-004
predictions-spawned: [PRED-007, PRED-008]
---

## Claim
AWS infrastructure cost cannot be reduced 30% within 90 days without service degradation. Achievable ceiling is ~12% from reserved-instance optimization, idle-resource sweeps, and S3 lifecycle policies. Anything beyond requires architectural change with engineering capacity Class doesn't have during the renewal cycle.

## Evidence
- AWS Cost Explorer pull, May 2026: 73% of spend is EC2 + RDS reserved-instance covered.
- Class engineering capacity: 6 senior engineers, 4 booked on renewal-critical features through Q3.
- Comparable benchmark: similar SaaS at $35M ARR cut 14% in 6 months with dedicated cost-engineering pod (Class has none).
- File: `outputs/aws-cost-analysis-may-2026.xlsx` (Sheet "RI Coverage")

## Dependencies
- Depends on POS-006 (engineering capacity locked through renewal cycle).

## Counter-evidence (what would force revision)
- Third-party FinOps engagement funded and onboarded in <30 days.
- Discovery of >$X in idle Dev/Staging environments not yet counted.
- Chasen approves degraded p95 latency in non-customer-facing services.

## Operating implication
Stop modeling AWS cuts >12% in the cash plan. The W30 trough cannot be solved through infra reduction. See POS-003.
```

### Naming convention
`POS-NNN-short-slug.md` — three-digit zero-padded ID, lowercase hyphenated slug.

### README at top of `positions/`

```markdown
# Position Library Index

Last audited: 2026-05-21
Active positions: 6 | Superseded: 0 | Pending verification: 0

## Confidence semantics
- 90-100: I would bet my role on this. Reverse only with extraordinary evidence.
- 75-89:  High conviction. Counter-evidence noted; not currently outweighed.
- 60-74:  Lean. Better than coin flip but reversible.
- 40-59:  Uncertain. Held provisionally; do not cite as basis for one-way doors.
- 0-39:   Contrary view documented; not the working belief.

## Active positions
| ID | Title | Confidence | Last retested | Supports |
|---|---|---|---|---|
| POS-001 | AWS 90-day ceiling ~12% | 75 | 2026-05-21 | DEC-004 |
| POS-002 | July trough is headcount-irrelevant | 90 | 2026-05-19 | DEC-002 |
| POS-003 | W30 resolves via AR+AP+BACA | 80 | 2026-05-21 | DEC-002 |
| POS-004 | Intl HED at 47.9% is the #1 survivability risk | 70 | 2026-05-15 | — |
| POS-005 | Russell's leverage is silent | 85 | 2026-05-10 | DEC-001 |
| POS-006 | CFO spread-mode severance is legally required | 80 | 2026-05-12 | DEC-003 |
```

### Discipline

1. **Every Pass 2 lens that takes a position writes it.** Pass 2 outputs without library writes are analysis, not position-taking.
2. **Every Pass 3 red-team finding that survives modifies the position.** Confidence drops, evidence added, counter-evidence documented, or counter-position spawned.
3. **Every Pass 5 belief-memory becomes a position, not a project memory.** Facts ("CFO severance policy is 2-12 weeks") → MEMORY.md. Beliefs ("the policy was designed by counsel to prevent lump-sum exits") → Position Library.
4. **Monthly library audit.** First Monday: walk every active position. Is current data consistent? Has counter-evidence accumulated? Confidence adjustment needed?

### Pre-seeded positions

**POS-002 — July trough is headcount-irrelevant**
> Claim: Reducing GTM headcount cannot meaningfully improve the July 26 W30 trough of $111,766. CFO spread-mode severance policy (2-12 weeks across normal payroll) means savings begin *after* the trough, not before it. Confidence: 90.
> Evidence: Cash Lever Model v5 T1 severance timing tab; CFO policy memo 2025-11; W30 dated 2026-07-26.
> Counter-evidence: One-time lump severance exception negotiated with counsel; hiring freeze counted as in-period savings.
> Operating implication: stop bringing headcount cuts as the answer to W30. FY27 question.

**POS-003 — W30 resolves with AR + AP + BACA, not cuts**
> Claim: W30 trough resolves operationally with three concurrent levers: AR pull on top 8 invoices ($1.4M targeted), AP deferral on non-critical vendors ($600K targeted), BACA $2.5M restricted-cash release request. Headcount and infra cuts contribute zero. Confidence: 80.
> Evidence: Cash Lever Model v5; Barclays BACA facility documents permit release with covenant compliance.
> Counter-evidence: Barclays denies release; top-3 AR customers stretch own AP; auditor flags AP deferral as going-concern signal.

**POS-004 — International Higher Ed concentration is #1 survivability risk**
> Claim: At 47.9% ARR concentration, Intl HED is the single largest existential risk. A 25% segment compression (plausible in single budget cycle) cuts ARR ~$4.3M. Confidence: 70.
> Evidence: Salesforce ARR-by-vertical May 2026; precedent: 2024 EU university procurement freeze affected 3 of Class's top 10.
> Counter-evidence: NRR on segment is 108% YTD; no observed budget freeze signals as of May 21.

**POS-005 — Russell's leverage is silent**
> Claim: Russell's negotiation leverage with Chasen depends on never voicing it. Leverage exists because Chasen has no replacement and Russell's exit compounds cash crisis. Spoken aloud → threat → triggers Cause-clause review. Confidence: 85.
> Evidence: Newco equity stack memo; Good Reason narrow; Cause broad; Barclays 3rd-party beneficiary of Cause clause.
> Counter-evidence: Chasen identifies replacement COO candidate; cash crisis resolves and exit timing becomes optional.

**POS-006 — CFO spread-mode severance is legally required, not preference**
> Claim: CFO's insistence on spreading severance across payroll (vs lump) is a legal posture against constructive-dismissal and acceleration-of-deferred-comp arguments, not a finance preference. Reversing requires counsel sign-off, not CFO sign-off. Confidence: 80.

---

## Artifact 2: The Decision Log

### Location
`Business Planning/decisions/`

```
decisions/
├── INDEX.md
├── DEC-001-coo-comp-proposal-to-chasen.md
├── DEC-002-w30-lever-stack.md
├── DEC-003-may18-cash-model-methodology.md
└── DEC-004-defer-broader-workforce-action.md
```

### Decision entry schema

```markdown
---
id: DEC-002
slug: w30-lever-stack
title: Resolve W30 trough with AR pull + AP defer + BACA release
date: 2026-05-19
decision-maker: russell-with-chasen-concurrence
reversibility: two-way                # one-way | two-way
confidence-at-decision: 75
positions-cited: [POS-002, POS-003, POS-006]
predictions-spawned: [PRED-001, PRED-002, PRED-003]
status: in-execution                  # proposed | approved | in-execution | resolved | reversed
---

## Decision
Address the July 26 W30 trough through three concurrent operational levers (AR pull, AP defer, BACA release) rather than headcount or infrastructure cuts.

## Context
May 10 cash forecast surfaced $111,766 trough at W30. Initial board reaction was to seek workforce reduction. Pass 2 produced POS-002 (headcount-irrelevant) and POS-003 (operational levers sufficient). Decision needed by May 22 to begin AR sequencing.

## Options considered
1. **Workforce reduction (rejected).** Cut 6-8 GTM heads. Severance spread-mode = zero W30 contribution; damages renewal cycle. Why rejected: wrong timing window.
2. **AWS / infra cuts (rejected).** Aggressive infra reduction. POS-001 caps savings at 12% over 90 days; near-zero W30 contribution. Why rejected: arithmetic.
3. **Three-lever operational stack (chosen).** AR + AP + BACA. Arithmetic clears trough with margin. Requires Barclays cooperation; AP deferral has reputation cost.
4. **Bridge from Holdco (rejected for now).** Clean, fast. Signals weakness to Barclays; uses optionality we may need later. Held in reserve.

## Rationale
Option 3 is the only stack whose timing aligns with W30. Options 1 and 2 are correct medium-term answers to different questions and are deferred, not abandoned. Option 4 is the tripwire response if BACA release is denied.

## Assumptions
- Barclays will release a portion of BACA with covenant-compliance evidence.
- Top 8 AR customers can be pulled forward without renewal damage.
- AP deferral doesn't trigger going-concern disclosure.

## Tripwires
- Barclays signals BACA release >30 days or denied → escalate to Option 4 within 5 business days.
- Any pulled AR customer raises a renewal flag → pause AR sequencing, escalate.
- AP-deferred vendor places Class on credit hold → reverse that specific defer immediately.

## Outcome
[to be filled by 2026-08-01]

## Outcome-confidence-delta
[to be filled]

## Retrospective lesson
[to be filled]
```

### Discipline

1. **Every `/deep` run that produces a recommendation drafts a decision log entry.** Status `proposed` until Russell accepts/modifies/rejects.
2. **Monday morning sweep.** Walk recent decisions, update outcome columns, flag triggered-but-unacted tripwires.
3. **Quarterly review.** For all `resolved` decisions, fill outcome-confidence-delta and retrospective-lesson. Patterns feed Calibration Tracker.

### Pre-seeded decisions

- **DEC-001 — COO compensation proposal to Chasen** (proposed 2026-05-08). One-way on relationship; two-way on dollar. Tripwire: Chasen counters below floor → walk-back to status quo with no relationship damage. Outcome: pending.
- **DEC-002 — W30 lever stack** (above).
- **DEC-003 — May 18 cash model methodology: build from NetSuite, not from prior board deck.** Rationale: board deck had stale AP; NS is source of truth. Reversibility: two-way. Confidence: 90. Outcome (filled 2026-05-21): correct — W30 reconciled to slide 16, validating rebuild.
- **DEC-004 — Defer broader workforce action until post-renewal-cycle (Q4).** Rationale: severance spread-mode + renewal customer-success risk = Q3 cuts cost more in renewal-revenue than they save in payroll. Confidence: 70. Tripwires: renewal cohort closes <85% gross retention; Barclays demands workforce-action covenant.

---

## Artifact 3: The Calibration Tracker

### Location
`Business Planning/calibration/`

```
calibration/
├── SCORECARD.md                    # recomputed weekly
├── predictions/
│   ├── PRED-001-baca-release-by-jul15.md
│   ├── PRED-002-top8-ar-pull-clears-1m-by-jul20.md
│   └── ...
└── resolved/                       # archive after resolution + scorecard update
```

### Prediction schema

```markdown
---
id: PRED-001
linked-position: POS-003
linked-decision: DEC-002
created: 2026-05-19
confidence: 70
resolution-date: 2026-07-15
status: open                    # open | resolved-true | resolved-false | ambiguous | not-yet
---

## Claim
Barclays approves release of at least $1.5M from the BACA restricted account by July 15, 2026.

## Resolution criterion
On July 15: (a) Barclays has released funds (TRUE), (b) issued written denial or release <$1.5M (FALSE), or (c) request still in process (AMBIGUOUS → re-resolve July 31).

## Outcome
[filled at resolution]

## Delta
[+1 if TRUE at this confidence; -1 if FALSE; weighted by distance from 50%]
```

### SCORECARD.md (recomputed weekly)

```markdown
# Calibration Scorecard — week of 2026-05-21

Total predictions logged: 5
Resolved: 0
Open: 5

## Brier-band performance
| Confidence band | N resolved | Actual hit rate | Calibration |
|---|---|---|---|
| 80-100% | — | — | — |
| 60-80%  | — | — | — |
| 40-60%  | — | — | — |
| 20-40%  | — | — | — |
| 0-20%   | — | — | — |

## Patterns (filled as data accumulates)
- (No data yet — initial scorecard)

## Adjustments for next-week positions
- (None yet — initial scorecard)
```

### Discipline

1. **Every position with a forward measurable claim spawns at least one prediction.** Positions without falsifiable claims (e.g., POS-005) don't need predictions.
2. **Monday sweep resolves predictions with `resolution-date <= today`.** Ask Russell TRUE/FALSE/AMBIGUOUS.
3. **Weekly scorecard recompute.** Patterns section rewritten by system.
4. **Scorecard feeds new positions.** New position confidence is shown as: "Instinct: 80; Calibration adjustment (Barclays-dependent): -10; Stated: 70."

### Pre-seeded predictions

- **PRED-001 — Barclays releases ≥$1.5M from BACA by July 15.** Confidence 70.
- **PRED-002 — Top-8 AR pull collects ≥$1.0M by July 20.** Confidence 65. Resolution: NS AR aging July 21.
- **PRED-003 — AP deferral generates ≥$500K W30 contribution.** Confidence 75. Resolution: cash position July 26.
- **PRED-004 — Intl HED Q3 renewal cohort closes ≥90% gross retention.** Confidence 60. Resolution: October 15.
- **PRED-005 — Chasen does not respond to COO comp proposal with counter below floor.** Confidence 55. Resolution: at moment of counter.

---

## Artifact 4: The Pre-Mortem Library

### Location
`Business Planning/pre-mortems/`

```
pre-mortems/
├── INDEX.md
├── PM-001-barclays-calls-loan.md
├── PM-002-top-fed-customer-non-renews.md
├── PM-003-key-engineering-lead-resigns.md
├── PM-004-intl-hed-segment-collapses.md
├── PM-005-aws-audit-uncommitted-overage.md
├── PM-006-may10-cash-forecast-error.md
└── PM-007-chasen-exits.md
```

### Pre-mortem schema

```markdown
---
id: PM-001
slug: barclays-calls-loan
probability: 15                 # 0-100
impact: existential             # low | medium | high | existential
last-reviewed: 2026-05-21
related-positions: [POS-003, POS-006]
depends-on: [PM-006]
---

## Scenario
August 2026. Barclays sends formal notice citing fixed-charge-coverage-ratio trip from July reporting. Loan called. Within 10 business days Class must either refinance ($30M, no realistic market at this ARR trajectory), repay (impossible), or enter forbearance Barclays controls. Holdco preferred zeroed; common equity follows. Recap optionality dies on contact.

## Early-warning signals
- Barclays asks for additional reporting beyond quarterly package (precursor in 100% of called-loan cases).
- Covenant-headroom on FCCR <1.10x for two consecutive months.
- Barclays declines to release BACA funds (PRED-001 resolves FALSE).
- Relationship manager replaced or escalates internally.

## Mitigation (preventive)
- Maintain weekly covenant-headroom model; reforecast on every revenue swing >5%.
- Pre-emptively brief Barclays on bad numbers before they see them in reporting.
- Hold Holdco bridge optionality in reserve and unspoken.
- Keep the W30 lever stack on schedule so covenant inputs don't degrade.

## Response playbook
- Day 0: counsel engaged within 4 hours. Specific firm pre-selected (named in playbook).
- Day 0-2: forbearance term sheet drafted; concurrent outreach to two pre-identified refinance sources.
- Day 0: Russell and Chasen joint call to Barclays — never separately, never delayed.
- Day 1-10: protect customer-facing operations; no announcement until forbearance signed.
- Day 5: board notification (timing controlled, not reactive).
```

### Pre-seeded pre-mortems (summaries)

**PM-001 — Barclays calls the loan / covenant trip.** Probability 15, impact existential. (Above.)

**PM-002 — Top federal customer non-renews.** Probability 25, impact high. Largest federal contract enters renewal; contracting officer signals re-compete. ARR ~$3.2M. Signals: contract POC turnover, late-stage RFI from competitors, delayed renewal admin. Mitigation: executive sponsorship cadence, deliver unexpected upgrade Q2, pre-engage contracting officer's leadership. Playbook: lower-tier contract vehicle; staged extension; incumbent-protection arguments before re-compete is formalized.

**PM-003 — Key engineering lead resigns mid-crisis.** Probability 30, impact high. Principal engineer behind renewal-critical roadmap accepts external offer in July. Renewal features slip; Q4 churn risk increases. Signals: LinkedIn updated; recruiter calls on calendar; equity-vesting milestone passed without retention conversation. Mitigation: identify 2-3 most-critical leads now, structure retention bonuses before signals appear, ensure knowledge isn't single-pointed. Playbook: counter-offer pre-drafted; succession plan named per role; renewal roadmap re-scoped within 48 hours of departure.

**PM-004 — International HED segment collapses.** Probability 20, impact existential. Coordinated procurement freeze across EU university systems compresses segment 30% single budget cycle. ARR ~$5.2M. Signals: NRR drops <95% two consecutive quarters; >2 named accounts signal budget delay; sector-press austerity. Mitigation: diversification investment in K-12 and corporate L&D verticals now; reduce segment concentration target from 47.9% to <35% over 12 months. Playbook: emergency segment-rebalancing plan; pricing flexibility for at-risk accounts; communications to Barclays before they see it.

**PM-005 — AWS audit finds uncommitted overage.** Probability 20, impact medium. AWS account review surfaces $300-600K outside EDP commit, billed retroactively on-demand. Signals: AWS account team requests "commitment review" meeting; CUR shows on-demand drift outside primary regions. Mitigation: monthly CUR review (in class-aws-connector skill); EDP coverage report quarterly; budget alerts 80/90/100% commit. Playbook: negotiate retroactive coverage via EDP true-up; restructure as multi-year commit extension at lower rate.

**PM-006 — May 10 cash forecast has major error.** Probability 10, impact existential. Methodology bug (AR aging wrong cutoff; FX revaluation missed; restricted cash double-counted) means W30 trough is materially different than reported. Either direction destructive. Signals: NS reconciliation variance >2% on single sweep; any line item moves >$200K without business reason. Mitigation: monthly reconciliation by independent reviewer; document methodology in DEC-003. Playbook: immediate board disclosure with corrected number; re-run lever stack within 72 hours.

**PM-007 — Chasen exits or is replaced.** Probability 15, impact high. Chasen replaced by board (or exits voluntarily) before recap closes. Russell's silent leverage (POS-005) collapses because new CEO lacks context and relationship debt. Signals: board executive sessions excluding Chasen; search-firm activity in network; Chasen's calendar opens unusually. Mitigation: build direct board relationships now (normal exec posture, not hedge); ensure Russell's value is institutionally visible, not CEO-mediated. Playbook: 48-hour pause on sensitive negotiations; map new CEO's incentive structure; re-baseline relationship from scratch.

---

## How the four artifacts reinforce each other

**Positions are the unit of belief.** Everything Claude says with conviction traces to a position. A Pass 2 lens that takes a stance writes a position. A Pass 3 red-team that survives modifies one. A Pass 5 belief-write becomes a position rather than a fact-memory.

**Decisions consume positions.** Every Decision Log entry names supporting positions. Auditable: when a decision goes badly, trace back to which positions failed — wrong position, right position misapplied, or known low-confidence bet.

**Decisions and positions spawn predictions.** A position about Barclays cooperation isn't testable directly, but a prediction that Barclays releases ≥$1.5M from BACA by July 15 is. Predictions live in Calibration Tracker.

**Calibration improves position confidence.** When scorecard reveals systematic overconfidence in Barclays-dependent predictions, future positions involving Barclays get downward confidence adjustment — explicitly, transparently, in the position file. The system gets less wrong over time without pretending it was right all along.

**Pre-mortems describe position failures.** PM-001 (Barclays calls loan) is what happens if POS-003 (W30 resolves via AR+AP+BACA) fails badly enough. Pre-mortem early-warning signals are concrete tripwires that, if observed, force position retest.

**The closed loop.** A position is taken. A decision is made citing it. Predictions are spawned. Time passes. Predictions resolve. Scorecard updates. Patterns emerge. Next position in that domain has confidence adjusted before ink is dry. Old positions retested against new data, either hold/refine/move to superseded. Pre-mortems reviewed quarterly; probabilities update.

What this gives Russell: a system that, six months from now, has a track record. He can ask "what did Claude believe in May about the July trough, and was it right?" Answer is in the library, dated and confidence-stamped. He can ask "where is Claude systematically miscalibrated?" Scorecard answers in numbers. He can ask "what's the worst plausible failure mode we haven't built a response for?" The pre-mortem library either has it — or doesn't, and that gap is itself a finding.

The system has opinions. The opinions are written down. The opinions get tested. The system gets better. That is the conviction backbone.
