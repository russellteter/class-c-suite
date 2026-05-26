# Your First Session Opening Prompt

**Purpose:** The exact prompt to use the very first time you open a session in the Business Planning project AFTER pasting the recommended project instructions. This verifies the system fired correctly.

---

## Step 1: Make sure project instructions are updated

Open the Business Planning Cowork project settings. Verify the project instructions are the version from `PROJECT_INSTRUCTIONS_RECOMMENDED.md` (which points at SESSION_START_PROTOCOL.md). If not, paste them in now. Save.

## Step 2: Open a brand new session in the Business Planning project

## Step 3: Paste this as your first message

```
Run a system check.
```

That's it. Four words. The system-check skill fires.

**Do not type "/system-check"** — Cowork's UI treats a leading slash as a literal skill-name lookup and will return "Unknown skill: system-check." All our modes use natural-language triggers, not slash prefixes.

## What you should see in the response

The system-check skill should fire, run all 10 checks (file presence, custom skills, operating-layer indexes, pre-seeded content, memory anchor, connector health, scheduled tasks, cross-Claude spine, last-activity freshness, Day Zero confirmations), and return a dense scannable report.

The first line of the response should be the Operating Model loaded acknowledgment:

```
[Operating model loaded — v2.1]
- Active workstreams: 12 (1 RED — WS-01 Cash Defense)
- Active positions: 6 (last audited: 2026-05-21)
- Open decisions: 4 (DEC-001 proposed, DEC-002 in-execution, DEC-003 resolved, DEC-004 in-execution)
- Tripwires: (no live scans yet — covenant-tracker pending CFO input)
- Latest critique: (none yet — first /deep run will produce one)
```

Then the system-check report below.

## What it means if you DON'T see that

If the response doesn't start with `[Operating model loaded — v2.1]`:

1. The project instructions probably didn't paste correctly. Check the project settings again. Make sure you replaced the existing short paragraph (didn't append).

2. If they did paste correctly but Claude still didn't follow them, the project instructions field may have a length limit you hit. Try this fallback — paste THIS as your message instead:

```
First, please read /Users/russellteter/Documents/Claude/Projects/Business Planning/SESSION_START_PROTOCOL.md and execute it. Then run /system-check.
```

3. If THAT also doesn't fire the system, the SESSION_START_PROTOCOL.md file may have been deleted or moved. Open the Business Planning folder and verify it exists at the root level.

## After the first successful /system-check

You're operational. The system is wired. From here:

1. **Day Zero confirmation session (recommended next).** Spend 15-30 minutes answering Claude's questions for the four skills with ASSUMED defaults:
   - covenant-tracker: facility covenant terms (or get them from CFO and bring them back)
   - renewal-forecast: NRR formula, board target, risk weights
   - call-intelligence: competitor list, sentiment phrases, escalation cutoff
   - run-critique: dimension weights

2. **First deep run.** Pick the most load-bearing topic. Recommended: "Run a deep investigation on how we operationally survive the July 26 cash trough now that we're in late May." This produces real positions, decisions, predictions, deliverables — and triggers the run-critique skill, which writes the first feedback memory. The system starts compounding.

3. **Schedule the recurring jobs.** Ask Claude to set up the scheduled tasks (Monday 6am tripwire scan + cash forecast, Monday 7am stakeholder refresh, Sunday 6pm renewal + call sweep, Sunday 8pm dashboard regen).

4. **Bootstrap the cross-Claude spine.** This is the v3 #4 item. Run "Run Day One bootstrap on the Strategic AI Operating Model v2" to create `_spine/` and start continuous Slack/Gmail/Drive ingestion.

After these four moves, the system is at full operating altitude. Every subsequent session in this project automatically loads everything, every /deep produces real artifacts, every prediction resolves into calibration data, every Monday morning produces a fresh tripwire + cash + renewal view, and run-critique compounds the system's quality over time.

You can rely on it.
