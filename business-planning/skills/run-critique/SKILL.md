---
name: run-critique
description: Agent observability layer. Auto-fires after every /deep run to score the previous investigation on five dimensions (source rigor, lens balance, red-team sharpness, deliverable usefulness, memory hygiene) and write a feedback memory. Flags weakest pass and proposes one concrete improvement for next time. After 3+ critiques surface the same pattern, suggests codifying a new skill via skill-creator. Trigger phrases include "critique the last run", "how did that investigation go", "audit the previous /deep", "what would have made that better", "post-mortem on the run", or any variation requesting self-assessment of recent investigation quality. Auto-runs after every /deep via the post-Pass-5 hook.
---

# run-critique

The recursive self-improvement loop. v1 had this as a manual `/post-mortem` mode. v2 turns it into automatic Pass 6 — every `/deep` ends with a critique, and the critique writes back into the system so the next run is sharper.

This is the agent observability layer.

## Required reading before execution

1. The investigation log for the topic being critiqued: `investigations/<slug>.md`
2. The Pass 2 lens memos: `investigations/<slug>/pass2_*.md`
3. The Pass 3 challenges: `investigations/<slug>/pass3_challenges.md`
4. The Pass 4 deliverables: `deliverables/<date>_<slug>/*`
5. The Pass 5 memory writes (compare to MEMORY.md, positions/, decisions/, predictions/)
6. Any prior run-critiques on related topics: `run_critique_*` memories

## Invocation modes

### Mode 1: Automatic post-/deep (default)

Fires immediately after Pass 5 of any `/deep` run completes. Russell doesn't have to invoke it. Output is a feedback memory in `memory/run_critique_<slug>_<date>.md` plus a 5-bullet summary appended to the run's return message.

### Mode 2: Manual `/post-mortem [topic-slug]`

For closed investigations where Russell wants to retrospectively assess quality after enough time has passed to see whether the position held up.

### Mode 3: Quarterly meta-critique

Reads all run_critique files from the past 90 days. Looks for patterns: which lens repeatedly underperforms? Which red-team angle keeps getting missed? Which deliverable format is repeatedly underused? Writes a `meta_critique_Q{N}_{year}.md` feedback memory.

## The five-dimension scoring rubric

For each of these, score 1-10 with a one-line rationale:

### 1. Source rigor (weight 25%)

Did every claim in the Pass 4 deliverable cite a source? Were the sources actually authoritative for the claim?

Score 10 = every number tagged with connector + timestamp, every doctrine claim cited to the turnaround library by section, every stakeholder claim cited to a specific call/email/file.
Score 1 = floating claims, hand-waved confidence, "according to industry research" with no citation.

### 2. Lens balance (weight 20%)

Did all five C-level lenses contribute meaningfully? Or did one dominate?

Score 10 = each lens produced a distinct, useful position; the reconciliation surfaced at least one real tension; no lens was a token paragraph.
Score 1 = one lens drove the entire conclusion and the others were window dressing.

### 3. Red-team sharpness (weight 20%)

Did Pass 3 actually find something the synthesis would have missed? Or was it shadow-boxing?

Score 10 = red team caught a specific named dependency, second-order effect, or fact-conflict that materially changed the position.
Score 1 = red team raised generic concerns that didn't move anything.

### 4. Deliverable usefulness (weight 20%)

Did Russell actually use the artifacts produced? Or did they sit unread?

(Filled in later — this dimension can only be scored after enough time has passed. Default: "deferred — assess in 7 days.")

Score 10 = Russell quoted from the deliverable in a real conversation, sent it forward, or it materially changed a decision.
Score 1 = the deliverable was produced and never opened.

### 5. Memory hygiene (weight 15%)

Did Pass 5 write the right things? Sources cited? Positions distinguished from facts? Conflicts resolved properly?

Score 10 = every memory write had a `source:` field, positions went to `positions/`, facts went to `MEMORY.md`, conflicts properly superseded with audit trail.
Score 1 = silent overwrites, missing sources, beliefs filed as facts.

### Composite score = weighted average

90-100: gold standard run; nothing to improve.
75-89: solid; one minor improvement noted.
50-74: acceptable; one specific dimension flagged for next-time correction.
0-49: weak; reflect on whether the topic was the right one to run /deep on at all.

## Output: the critique memory

```markdown
---
name: run-critique-{slug}-{date}
description: Critique of /deep run on {topic} dated {date}. Composite score {N}/100.
metadata:
  type: feedback
  source: investigations/{slug}.md
  written: {date}
  run-critiqued: {date of original /deep}
---

# Run Critique: {topic}

## Scores
| Dimension | Score | Rationale |
|---|---|---|
| Source rigor | 8 | Every number cited; two doctrine claims hand-waved |
| Lens balance | 7 | CFO dominated reconciliation; CMO contribution was thin |
| Red-team sharpness | 9 | Caught the AP vendor-30-day-clause that synthesis missed |
| Deliverable usefulness | -- | Deferred 7 days |
| Memory hygiene | 8 | One position should have been a fact-memory; corrected |

Composite (excl. deferred): {N}/100

## Weakest pass
{Pass number and why it underperformed}

## One concrete improvement for next time
{Specific actionable thing the next /deep on a similar topic should do differently}

## Pattern flag (if applicable)
{If this critique resembles 2+ prior critiques, flag the pattern}

## Recommended action
{One of: (a) no action, single run quality issue; (b) feedback memory only; (c) propose new skill via skill-creator to codify a pattern; (d) escalate to Russell — methodology gap}
```

## Skill codification trigger

After 3+ run-critiques flag the same pattern, this skill proposes a new skill via `skill-creator`. Example:

> "The last three /deep runs on cash topics all underperformed on red-team sharpness specifically around AP vendor clauses. Proposing a new skill `ap-vendor-clause-checker` that pre-loads the contractual clauses for top 30 vendors and runs an automatic conflict check in Pass 3."

The proposal goes to a `skill_proposals/` directory inside Business Planning for Russell to approve or reject.

## Deliverable-usefulness deferred resolution

The deliverable-usefulness dimension can't be scored at run time. A scheduled task runs daily at 6am ET, scanning for run-critique memories with `deliverable-usefulness: deferred` and a `written` date 7+ days ago. For each, it checks:

1. Was the deliverable file accessed (filesystem `atime`)?
2. Was the deliverable quoted in any subsequent Cowork session transcript?
3. Did Russell forward it (look for the filename in sent Gmail)?
4. Did it influence a Decision Log entry (search `decisions/` for references)?

Based on these, fills in the deferred score and updates the composite.

## Pattern recognition for meta-critique

The quarterly meta-critique looks for these patterns across all run-critiques in the period:

- **Lens imbalance:** is one lens consistently low-scoring? (Often CMO is — needs better prompt frame.)
- **Red-team weakness:** is Pass 3 consistently catching generic concerns vs specific ones?
- **Source gaps:** is a particular connector consistently underused (e.g., Chorus newly active — is it being queried?)
- **Deliverable format mismatch:** does a particular topic shape repeatedly produce deliverables that don't get used?
- **Conviction drift:** are positions accumulating without being retested? (Cross-check Position Library `last-retested` dates.)

## Hard rules

- Run-critique is NEVER skipped. Every `/deep` ends with a critique, even if the topic was small.
- Run-critique is HONEST. If a run was weak, the critique says so. Russell needs reliable self-assessment more than he needs reassurance.
- Run-critique writes feedback memories under `type: feedback`, never overwriting prior critiques.
- After 3 same-pattern critiques, the skill MUST propose a codification — don't accumulate more without action.
- The composite score is informational; never used to "rate" the system to Russell unsolicited. Surface it only when asked or when it's below 50.

## Day Zero (skill activation)

First run — Russell confirms:
1. The five-dimension weights (defaults above).
2. The composite-score band thresholds.
3. Whether to surface composite scores by default or only when asked.
4. The pattern-recognition threshold (default 3 same-pattern critiques → propose codification).

After that, the skill auto-fires post every `/deep`.
