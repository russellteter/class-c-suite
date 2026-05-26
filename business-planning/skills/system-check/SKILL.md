---
name: system-check
description: Verify the Strategic AI Operating Model is wired correctly and ready to fire. Checks file presence (operating model docs, skills, indexes), memory freshness, connector health (Salesforce, NetSuite, AWS class + collab, Google Workspace, Slack, Chorus), scheduled task status, and operating-state freshness (positions, workstreams, calibration scorecard). Returns GREEN/YELLOW/RED per check with specific remediation. Trigger phrases include "/system-check", "verify the system", "is the operating model loaded", "audit the wiring", "is everything connected", "system status", or any variation asking whether the architecture is operational. Use when Russell suspects something is off, after a long gap between sessions, or as a periodic health check.
---

# system-check

The system-check skill is Russell's diagnostic. It verifies that every load-bearing piece of the Strategic AI Operating Model is in place and operational. Run it anytime you suspect the system isn't firing correctly, after a long gap, or just to confirm health.

## Execution steps

Run all checks in parallel where possible. Return a single consolidated report.

### Check 1: Core operating model files

Verify these files exist via `Glob` or `Read`:

```
Business Planning/SESSION_START_PROTOCOL.md
Business Planning/Strategic_AI_Operating_Model.md
Business Planning/Strategic_AI_Operating_Model_v2.md
Business Planning/Strategic_AI_Invocation_Guide.md
Business Planning/Strategic_AI_Connector_Playbook.md
Business Planning/Strategic_AI_Stack_Inventory.md
Business Planning/Strategic_AI_Knowledge_Base_Audit.md
Business Planning/Strategic_AI_Cross_Claude_Spine.md
Business Planning/Strategic_AI_Conviction_Backbone.md
Business Planning/Strategic_AI_Stakeholder_Workstream_Adversarial.md
Business Planning/turnaround_operating_library.md
Business Planning/SKILL.md
Business Planning/HOW_TO_USE_THIS_SYSTEM.md
Business Planning/PROJECT_INSTRUCTIONS_RECOMMENDED.md
```

GREEN: all present. RED: any missing — flag and recommend re-creation.

### Check 2: Custom skills

Verify each skill exists:

```
Business Planning/skills/INDEX.md
Business Planning/skills/weekly-cash-forecast/SKILL.md
Business Planning/skills/covenant-tracker/SKILL.md
Business Planning/skills/renewal-forecast/SKILL.md
Business Planning/skills/call-intelligence/SKILL.md
Business Planning/skills/run-critique/SKILL.md
Business Planning/skills/system-check/SKILL.md
```

### Check 3: Operating-layer index files

```
Business Planning/positions/README.md
Business Planning/decisions/INDEX.md
Business Planning/calibration/SCORECARD.md
Business Planning/pre-mortems/INDEX.md
Business Planning/stakeholders/INDEX.md
Business Planning/workstreams/DASHBOARD.md
Business Planning/adversarial/INDEX.md
```

### Check 4: Pre-seeded content materialization

Count actual files in each:
- `positions/active/POS-*.md` — expected ≥6
- `workstreams/WS-*.md` — expected ≥12
- `pre-mortems/PM-*.md` — expected ≥7
- `decisions/DEC-*.md` — expected ≥4

YELLOW if INDEX is populated but individual files don't exist yet (system functional via INDEX but less polished). GREEN if both exist.

### Check 5: Memory anchor

Read `MEMORY.md`. Confirm the top three entries are:
1. `strategic-ai-v2-1-chorus-and-custom-skills` (with the imperative SESSION_START_PROTOCOL pointer)
2. `strategic-ai-operating-model-v2`
3. `strategic-ai-operating-model` (v1)

If the order is wrong or entries are missing → RED.

### Check 6: Connector health

For each connector, run a minimal probe and verify a 200/success response:

| Connector | Probe |
|---|---|
| NetSuite | `ns_listSavedSearches` (small call) |
| Salesforce | `get_pipeline_summary` (cached, fast) |
| AWS class profile | `aws ce get-cost-and-usage` for last 7 days |
| AWS collab profile | same, collab |
| Google Workspace Gmail | `search_gmail_messages` query `is:unread` limit 1 |
| Google Workspace Drive | `search_drive_files` for "board" limit 1 |
| Slack | `slack_search_users` for "Russell" |
| Chorus | `list_users` limit 1 |

GREEN per connector on 200. YELLOW on slow/timeout. RED on auth error or unreachable.

For AWS, ExpiredToken = YELLOW (needs `aws sso login --profile X`). Provide the exact refresh command.

### Check 7: Scheduled tasks

Run `mcp__scheduled-tasks__list_scheduled_tasks` and verify these are present and active:

- Monday 6am ET: tripwire-scan + weekly-cash-forecast
- Monday 7am ET: stakeholder activity refresh
- Sunday 6pm ET: renewal-forecast + call-intelligence weekly sweep
- Sunday 8pm ET: workstreams DASHBOARD regenerate + memory consolidation
- First Monday of month: `/audit-positions`

GREEN if all present. YELLOW if any missing — flag and recommend creation. (These haven't been created yet — they get scheduled on first Day One bootstrap.)

### Check 8: Cross-Claude spine

Check if `_spine/` exists at `/Users/russellteter/Documents/Claude/Projects/_spine/`. If yes → spine is bootstrapped. If no → YELLOW with note "spine designed but not yet bootstrapped; cross-Claude awareness not yet active."

### Check 9: Last-activity freshness

- Last MEMORY.md update timestamp: should be recent (within last 7 days for active turnaround work)
- Last position retest: from `positions/README.md`, check the "Last audited" date — flag YELLOW if >30 days
- Last calibration scorecard recompute: check `calibration/SCORECARD.md` — flag YELLOW if >7 days
- Last DASHBOARD regen: check `workstreams/DASHBOARD.md` — flag YELLOW if >7 days

### Check 10: Day Zero confirmations pending

Check whether the following are still ASSUMED vs CONFIRMED:
- `covenant-tracker`: Barclays facility verbatim covenant terms locked? (Search SKILL.md for "ASSUMED")
- `renewal-forecast`: Class NRR formula + board threshold + risk weights confirmed?
- `call-intelligence`: Competitor list + sentiment phrases + escalation cutoff confirmed?
- `run-critique`: Five-dimension weights confirmed?

Report each as CONFIRMED or PENDING.

## Report shape

```
SYSTEM CHECK — {date} {time}

✅ Core files: {N}/{M} present
✅ Custom skills: {N}/6 present
✅ Operating-layer indexes: {N}/7 present
{✅/⚠️} Pre-seeded content materialized: {status}
✅ Memory anchor: correct order
{✅/⚠️/❌} Connector health:
   - NetSuite: {status}
   - Salesforce: {status}
   - AWS class: {status}
   - AWS collab: {status}
   - Google Workspace: {status}
   - Slack: {status}
   - Chorus: {status}
{✅/⚠️/❌} Scheduled tasks: {N}/8 registered
{✅/⚠️} Cross-Claude spine: {bootstrapped | designed-only}
{✅/⚠️} Last-activity freshness: {status}
{Pending} Day Zero confirmations: {list pending}

COMPOSITE: {GREEN | YELLOW | RED}

Specific remediation:
- {action 1}
- {action 2}
...

Ready to invoke modes: {yes | no — needs X first}
```

## When to recommend RED escalation

- Any core file missing → RED, recreate before next /deep
- Any auth failure on NetSuite, Salesforce, or AWS → RED, fix before next session
- Memory anchor incorrect or v2.1 entry missing → RED, fix before next session
- More than 2 weeks since last MEMORY.md update during active turnaround → YELLOW, run a session refresh

## Hard rules

- Don't ask permission — just run the check.
- Don't summarize what each piece does — Russell knows. Just verify.
- Output is dense and scannable; no preamble, no postamble.
- If everything is green, the report is one screen. If issues, list with remediation.
- Cite the timestamp of the check so subsequent system-checks can compute deltas.

## Day Zero (skill activation)

No setup needed. Skill works as-shipped.
