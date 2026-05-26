# Stakeholder Index

**Purpose:** Maintained models of the people Russell operates against, with communication style, what they care about, hot buttons, what NOT to do, and current intel signals. Full design in `../Strategic_AI_Stakeholder_Workstream_Adversarial.md`.

Last refresh: 2026-05-22 (first institutional read complete; Monday 7am scheduled refresh continues)

## Flag legend
- **[HOT]** = activity in last 7 days
- **[WARM]** = activity in last 30 days
- **[COLD]** = no signal in 30+ days
- **[!!]** = unresolved commitment from Russell to them
- **[??]** = unresolved commitment from them to Russell

## Internal Exec / Board (file exists ✓)

| Stakeholder | Role | Flag | File | Open items |
|---|---|---|---|---|
| Michael Chasen | CEO | [WARM] [??] | `internal-exec-board/chasen-michael-ceo.md` | COO offer counter; Ed exit sequencing |
| Ed Miller | CRO (exiting) | [HOT] | `internal-exec-board/ed-miller-cro.md` | Exit timing; $1.1M deal succession |

## Internal Dependencies (file exists ✓)

| Stakeholder | Function | Flag | File | Russell's read |
|---|---|---|---|---|
| Brian Bharwani | CFO | [HOT] | `internal-dependencies/brian-bharwani-cfo.md` | Aligned on cash, neutral on people |
| Scott Perian | SVP Product | [WARM] | `internal-dependencies/scott-perian-svp-product.md` | Locked-in; promote Ivo to named #2 |
| Sabina Cramer | SVP Renewals | [WARM] | `internal-dependencies/sabina-cramer-svp-renewals.md` | Expensive, challenging; under evaluation |
| Daniel Hansen | Sales Corp/Gov | [HOT] | `internal-dependencies/daniel-hansen-sales.md` | Best/only seller; toxic; held-tension dependency |
| Massimo Gentili | VP International | [WARM] | `internal-dependencies/massimo-gentili-vp-intl.md` | Critical to EMEA; INTL new-sales may de-resource |
| Emmanuel Clemot | AM EMEA (load-bearing) | [HOT] | `internal-dependencies/emmanuel-clemot-am-emea.md` | High quality, loyalty-anchored, no immediate risk |
| Nikolaos Galindo | AM EMEA (contractor) | [HOT] | `internal-dependencies/nikolaos-galindo-am.md` | BPO billed; $3.7M book; off-roster |
| Robert Thayer | AM (activity gap) | [WARM] | `internal-dependencies/robert-thayer-am.md` | Activity unacceptable; pull forward for analysis |
| Holly Hardin | AM (severe gap) | [WARM] | `internal-dependencies/holly-hardin-am.md` | Activity unacceptable; pull forward for analysis |
| Kendall Woodard | Head of Marketing (de facto) | [WARM] | `internal-dependencies/kendall-woodard-head-marketing.md` | Under-titled; formalize when COO closes |

## Customers At-Risk, Top-ARR, Vendors, Competitors
[Not yet built — to be populated through subsequent investigations]

## Discipline
1. Monday 7:00 AM scheduled task scans Gmail + Slack + Calendar for activity involving each stakeholder past 7 days.
2. Every `/deep` Pass 1 auto-reads stakeholder models for every person named in the topic.
3. Every `/deep` Pass 4 uses stakeholder models to tune deliverable framing.
4. Every `/deep` Pass 5 updates `last_known_status` and `intel_signals` on every stakeholder touched.

## File naming
`internal-exec-board/<lastname>-<firstname>-<role>.md` or `internal-dependencies/<firstname>-<lastname>-<role>.md`
