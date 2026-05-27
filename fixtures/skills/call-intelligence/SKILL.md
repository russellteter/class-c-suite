---
name: call-intelligence
description: Extract renewal risk, competitive intel, stakeholder dynamics, and action-item slippage from Chorus call data. Wraps the Chorus connector (just activated 2026-05-21) — list_engagements, get_engagement, get_engagement_summary, search_calls_by_participant. Produces structured signals that feed renewal-forecast, stakeholder models, adversarial library, and the daily intelligence stream. Trigger phrases include "what did we discuss on the call with X", "Chorus signal", "what are calls telling us about renewals", "any competitive mentions", "call intelligence", or any variation of asking Chorus to surface intel. Auto-runs Sundays as part of the weekly intelligence sweep. Layers ON TOP of the Chorus MCP and the Salesforce MCP.
---

# call-intelligence

This skill turns Chorus's call corpus into structured signals the operating model can act on. Note that the Chorus public v3 API exposes AI-generated `meeting_summary` and `action_items` but NOT raw utterance-level transcripts. The skill works within that constraint.

## Required reading before execution

1. Memory: `strategic_ai_operating_model_v2.md` — overall context
2. Connector playbook entry: `Strategic_AI_Connector_Playbook.md` §18 (Chorus)
3. Position: `POS-004` — Intl HED concentration is #1 survivability risk
4. Adversarial: `customer-defections/pattern-downsize-to-non-renewal.md`
5. Pre-mortems: `PM-002` (top fed customer), `PM-003` (key engineer resigns), `PM-004` (Intl HED collapse)

## Available Chorus tools

```
mcp__chorus__list_engagements(continuation_key?)
mcp__chorus__get_engagement(engagement_id)
mcp__chorus__get_engagement_summary(engagement_id)
mcp__chorus__list_users(continuation_key?)
mcp__chorus__get_user(user_id)
mcp__chorus__search_calls_by_participant(participant)
```

Each engagement carries: `meeting_summary` (AI), `action_items` (AI), participants, account/opportunity context where available.

**Pagination:** cursor-based via `continuation_key`. Continuation_key of `" "` (single space) means no more results.

## Use cases (5 invocation modes)

### Mode 1: Account-level renewal risk scan

When called from `renewal-forecast` for a specific account, or directly by Russell for one account:

1. Resolve the account's primary contact email(s) from Salesforce.
2. `search_calls_by_participant` for each contact, limit 20 most recent.
3. `get_engagement_summary` for the most recent 5.
4. Extract these signals:
   - **Frequency trend:** count calls in last 30 / 60 / 90 days. Compute delta.
   - **Champion presence:** is the original buying-committee sponsor still appearing?
   - **New late-cycle stakeholders:** any procurement, finance, or legal contact appearing in last 90 days who wasn't in first 90 days?
   - **Action item slippage:** action items from prior calls that don't appear closed in subsequent calls.
   - **Competitive mentions:** any competitor named in `meeting_summary` (Engageli, Top Hat, Anthology/Canvas, D2L, Moodle, Engageli, internal-build).
   - **Sentiment cues:** any of {"frustrated", "concerned", "escalate", "considering alternatives", "budget pressure", "leadership change"} in summaries.
5. Return a signal pack:

```
Account: {name}
Calls in last 30/60/90 days: X / Y / Z (trend: rising/stable/declining {%})
Champion still present: {yes / no — last appearance YYYY-MM-DD}
New late-cycle stakeholders: [name, role, first appearance]
Action items overdue (>30 days): N
Competitive mentions: [competitor, call date, context snippet from summary]
Sentiment flags: [phrase, call date]

Composite call-signal score: {0-100, 100 = most concerning}
```

### Mode 2: Weekly Sunday intelligence sweep

Runs as a scheduled task at Sunday 6pm ET. Pulls all engagements from the past 7 days across all at-risk customer accounts (from `stakeholders/customers-at-risk/`):

1. `list_engagements`, paginate until reaching last Sunday's cutoff.
2. Filter to engagements with `account` matching the at-risk list.
3. `get_engagement_summary` for each.
4. Extract any signal that meets thresholds (frequency drop >30%, champion absence, new procurement contact, competitive mention, action-item slippage).
5. Append findings to `_spine/intelligence/{date}.jsonl` with type `customer_event`.
6. Update `stakeholders/customers-at-risk/{slug}.md` `last_known_status` and `intel_signals`.
7. If composite score crosses 70 (CRITICAL), spawn a prediction in `calibration/predictions/` and flag for Russell in next morning brief.

### Mode 3: Pre-1:1 prep for Chasen, board member, or key employee

Before any major internal 1:1:

1. `search_calls_by_participant` for the person.
2. `get_engagement_summary` on most recent 5.
3. Extract: open action items they owe Russell, open action items Russell owes them, recurring themes, sentiment trajectory.
4. Cross-reference with `stakeholders/internal-exec-board/{slug}.md` `open_commitments`.
5. Surface: what to follow up on, what to avoid, what to bring forward.

### Mode 4: Competitive-mention monitoring

Weekly: scan all customer-call summaries from past 7 days for competitor mentions.

1. Pull all engagements with customer participants (filter via Salesforce account match).
2. `get_engagement_summary` for each.
3. Pattern-match for known competitor names + "switch", "evaluate", "considering", "demo", "RFP".
4. For each match, log to `adversarial/competitor-watch/{competitor}.md` "Recent Signals" section.
5. If a top-5 customer mentions a competitor, escalate immediately to Russell.

### Mode 5: Internal champion / flight-risk scan

Quarterly: for each name in `stakeholders/internal-dependencies/`:

1. `search_calls_by_participant` for the person.
2. Look at call frequency trend (declining = disengagement signal).
3. Look at who they're talking to (more recruiter-style calls? external interview-prep questions?).
4. Cross-reference with `adversarial/internal-defection-risk/`.

## Output format (universal across modes)

Each invocation returns a structured signal block:

```
Call Intelligence — {mode} — {date}

Inputs:
  Account/person: {name}
  Time window: {start} to {end}
  Engagements analyzed: {N}

Findings:
  [signal type 1]: {description, severity}
  [signal type 2]: {description, severity}
  ...

Recommended action:
  {1-3 specific next steps with timing}

Updates written:
  - stakeholders/...
  - adversarial/...
  - _spine/intelligence/...
  - calibration/predictions/...  (if score crossed threshold)

Source citations:
  - Chorus engagement IDs: [list]
  - Salesforce account IDs cross-referenced: [list]
  - Pulled at: {timestamp}
```

## Hard rules

- Treat "no negative signal in AI summary" as weak evidence of health, NOT strong evidence — the summary may have missed tone.
- Always cross-reference Chorus account context with Salesforce. Don't trust Chorus's own account tag without verification.
- Champion-absence detection requires at least 5 prior calls in the baseline window — don't flag based on a single missing appearance.
- For competitive mentions, capture the literal snippet (not paraphrased) so the adversarial file has the actual phrase.
- Never use Chorus signal as standalone basis for a position with confidence >70. Always pair with Salesforce + NetSuite data.

## Gotchas

- Chorus continuation_key of `" "` (space) means no more results — don't loop infinitely.
- Engagements without an account link are still useful for internal-people scans (Mode 3, Mode 5).
- The Chorus user list and the Salesforce user list don't auto-sync — identity resolution may need manual mapping. Use the identity graph at `_spine/identities/`.
- A call attended by 10 people will return AI summary that emphasizes loudest voices — solo-attended calls are higher-signal per minute.

## Integration with the v2 operating model

- **Weekly Sunday sweep** results feed `_spine/digests/sunday-{date}.md` and appear in the Knowledge Spine Cowork artifact.
- **Mode 1 (account scan)** is called by `renewal-forecast` skill during weekly forecast.
- **Mode 2 (weekly sweep)** is the standalone scheduled task.
- **Mode 3 (1:1 prep)** is invoked manually before key meetings.
- **Mode 4 (competitive)** is invoked weekly + ad-hoc when competitor activity is suspected.
- **Mode 5 (internal flight risk)** is invoked quarterly.

## Day Zero (skill activation)

First run — Russell confirms:
1. The list of competitor names to monitor for in summaries (defaults: Engageli, Top Hat, Anthology/Canvas, D2L, Moodle).
2. The sentiment-cue phrase list (defaults above; can be tuned).
3. Composite scoring weights (defaults equal; can be tuned).
4. The cutoff score that triggers CRITICAL escalation (default 70).

After that, the skill runs autonomously.
