# Adversarial Layer Index

**Purpose:** A persistent, growing library of external threats and tripwires. Competitors, regulators, financial covenants, customer-defection patterns, internal flight risk. Full design in `../Strategic_AI_Stakeholder_Workstream_Adversarial.md`.

Last updated: 2026-05-21 (initial)

## Subfolder structure

```
adversarial/
├── INDEX.md                              (this file)
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

## Current tripwire status

| Tripwire | Current value | Threshold | Status |
|---|---|---|---|
| Barclays leverage covenant | [PULL FROM FINANCE MODEL] | Assumed 4.5x (confirm) | [pending] |
| W30 cash trough | $111,766 | >$250K | RED |
| ARR concentration (Intl HED) | 47.9% | <35% target | YELLOW |
| Net Revenue Retention | [PULL] | >95% sustained | [pending] |

The Monday 6:00 AM scheduled task scans these tripwires against current Finance model data. Within 15% of threshold → YELLOW. Within 5% → RED. Results post to the top of `../workstreams/DASHBOARD.md`.

## Active competitor watch (refreshed weekly via Brightdata)

| Competitor | Threat level | Last signal |
|---|---|---|
| Engageli | Medium-High | [Weekly Brightdata scan] |
| Top Hat | Medium | [Weekly Brightdata scan] |
| [Add as identified] | — | — |

## Regulatory watch (status)

| Regulation | Status | Decision |
|---|---|---|
| FedRAMP | Not pursued | Almost certainly wrong to pursue in current cash state. Tripwire: single contract >$3M ARR or acquirer DD flag. |
| State EDU data regs | Compliant | Annual review only. |
| GDPR/UK | Compliant | Annual review; watch for AI-specific UK regulation. |
| Employment law (Czech/UK) | Compliant | 5-month statutory notice in Czech is the binding constraint on EU staff reductions. |

## Customer defection patterns (catalog)

| Pattern | Lead time | Relevance to Class |
|---|---|---|
| Downsize → Non-renewal | 9-15 months | HIGH — Higher ed renewal is annual; signal is detectable |
| Quiet exit (no flag, then non-renewal) | 0-3 months | MEDIUM — catches the disengaged customer too late |
| Public criticism | Variable | MEDIUM — rare in EDU but devastating when it happens |

## Internal flight risk

Top 5 internal dependencies (cross-reference `../stakeholders/internal-dependencies/`) get individual flight-risk files. Composite signals: LinkedIn profile updates, recruiter calls on calendar, equity-vesting milestones without retention conversations, vacation patterns, Slack-engagement dropoff.

PM-003 in the Pre-Mortem Library is the engineering-lead-resigns scenario.

## Discipline

1. Every Pass 3 red-team finding involving an external party (competitor, regulator, vendor, customer, employee, lender) files into the appropriate subfolder during Pass 5.
2. Library grows continuously rather than rebuilding each session.
3. **Monday 6:00 AM scheduled task** runs financial-tripwire scan against current Finance model.
4. **Weekly competitor-watch Brightdata scan** updates each competitor file with recent signals.
5. Every Pass 1 bootstrap reads the relevant adversarial files based on the topic's tagged workstream(s).

## Pre-seeded files

The competitor watch (Engageli), regulatory watch (FedRAMP cost-vs-benefit), financial tripwire (Barclays leverage covenant), and customer defection pattern (downsize-to-non-renewal) all have full worked examples in `../Strategic_AI_Stakeholder_Workstream_Adversarial.md`. On Day One bootstrap, each becomes its own file.
