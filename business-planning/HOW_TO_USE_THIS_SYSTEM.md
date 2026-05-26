# How To Actually Use The Strategic AI Operating Model

**Audience:** Russell, starting a new Cowork session in the Business Planning project.
**Created:** 2026-05-21

This is the operating manual. Read it once. After that, the system runs on the project instructions + a small set of prompt templates below.

---

## What auto-loads vs. what doesn't

**Auto-loads every session (no action needed):**
- `MEMORY.md` and every memory file it points to. The top entries now point at the v2 operating model.
- The project instructions you've set on the "Business Planning" Cowork project.

**Does NOT auto-load (must be referenced by project instructions or prompt):**
- `Strategic_AI_Operating_Model.md` (v1) and `Strategic_AI_Operating_Model_v2.md`
- The companion docs (Invocation Guide, Stack Inventory, Connector Playbook, Knowledge Base Audit, Cross-Claude Spine, Conviction Backbone, Stakeholder/Workstream/Adversarial, Turnaround Operating Library)
- The five new skills in `skills/`
- The folder scaffolding (`positions/`, `decisions/`, `pre-mortems/`, `stakeholders/`, `workstreams/`, `adversarial/`, `calibration/`)

**The bridge:** updating the project instructions to point at the operating model so Claude reads it at the start of every session in this project. Plus standard opening prompts so the right mode fires for the right kind of question.

---

## Step 1: Update the project instructions (one-time)

Open the "Business Planning" Cowork project settings and replace the current project instructions with the text in `PROJECT_INSTRUCTIONS_RECOMMENDED.md` (also in this folder). That single change makes every future session in this project auto-load the operating model.

---

## Step 2: Standard opening prompts (copy-paste as needed)

**Important — DO NOT START YOUR MESSAGE WITH A SLASH.** Cowork's UI interprets a leading `/` as a literal skill-name lookup. Our modes (deep, quick, continue, etc.) aren't Cowork-registered skills, they're conventions inside the prompt. Use natural-language triggers instead. Examples below.

You don't need to think hard about how to start a session. Pick the prompt shape that matches what you're trying to do.

### When you want to anchor a fresh session (occasionally)
```
Run Day One bootstrap on the Strategic AI Operating Model v2. Read all the operating model documents and memory files first, then anchor against current Class state — pull cash from NS, pipeline from SF, current month spend from AWS. Report what you found, list 3-5 open questions you'd push toward first, and update the Strategic Operating Dashboard.
```

Use this when: starting after a long gap, or you want a fresh anchor of current state.

### When you need a full multi-lens investigation
```
Run a deep investigation on [topic]. Full 5-pass loop with v2 disciplines.

Context: [2-3 sentences of why this matters now and what decision it supports]
Workstream tag: [WS-01 cash defense | WS-02 retention | WS-03 org | etc.]
```

Example:
```
Run a deep investigation on the right operational answer to clearing the July 26 cash trough given Barclays has not yet responded to the BACA release request.

Context: BACA release request submitted 2026-05-15, no response yet. W30 trough was last refreshed at $111,766. Need a Plan B if BACA denies or delays past June 15. Decision needed by next Wednesday.
Workstream tag: WS-01 cash defense, with WS-06 Barclays as secondary.
```

Use this when: a board decision is needed, a structural question is on the table, or you have 30-60 minutes for a real result.

### When you need a fast multi-lens read
```
Quick take on [topic].

Context: [1-2 sentences]
```

Example:
```
Quick take on prep for my 1:1 with Chasen tomorrow at 10am.

Context: he asked for "one more week" on the COO comp on 5/20. I want to walk in knowing what's most likely on his mind and what I should NOT lead with.
```

Use this when: prepping for a call, in a meeting, you have 90 seconds.

### When continuing an existing investigation
```
Continue the investigation on [topic-slug or topic name].

What changed since last round: [optional — fresh data or signal]
```

Example:
```
Continue the investigation on july-trough-survival.

What changed: Barclays declined BACA release. Need to operationalize Plan B (Holdco bridge) now.
```

### When you want to retroactively critique a finished investigation
```
Run a post-mortem on [topic-slug].
```

### When you want the position library audited
```
Audit the position library — retest every active position against current data.
```

### When you want the financial tripwires checked now
```
Run the tripwire scan now — Barclays leverage, FCCR, liquidity, concentration. Where are we?
```

### When you want a single stakeholder refreshed
```
Refresh the stakeholder model for [name] — pull the last 7 days of activity, open commitments, intel signals.
```

### When you want the latest cash forecast
```
Refresh the weekly cash forecast.
```

### When you want renewal risk
```
Run the renewal forecast — 90-day book with per-account risk scoring.
```

### When you want call intelligence on an account
```
Pull call intelligence on [account name] — last 90 days.
```

### When you want to verify the system is wired
```
Run a system check.
```

### Bare-conversation mode (just talking)
You can also just talk. The operating model is built so it's invoked when prompts match it; if you're brainstorming or asking a simple question, Claude won't burn through the full 5-pass loop. The natural-language triggers above are the explicit signal that you want the heavy machinery.

---

## Step 3: What you should expect from each session

After the project instructions are updated:

**Every session starts** with Claude having read:
- The auto-memory (top entries point at v2 architecture)
- The Strategic AI Operating Model docs
- The five custom skills in `skills/`
- The current state of `positions/`, `decisions/`, `workstreams/`, `stakeholders/`, `adversarial/`, etc. (or at least their INDEX/README files)

**When you invoke `/deep`** — Claude:
1. Reads relevant workstream + stakeholder + adversarial files for the topic
2. Spawns 5 lens subagents in parallel (CEO, CFO, CRO, CMO, Chief of Staff)
3. Reconciles into Convergent Core / Live Tensions / Three Options
4. Spawns Red-Team + Steelman subagents
5. Builds deliverable in the right format
6. Writes positions, decisions, predictions, updates stakeholder/workstream files
7. Auto-fires `run-critique` post-Pass-5 to score the run

**When you invoke `/quick`** — Pass 1 light + Pass 2 only. No red team, no deliverable. 2-3 minutes.

**When you invoke any skill name** (`weekly-cash-forecast`, `renewal-forecast`, etc.) — Claude follows that skill's execution steps.

---

## Step 4: How the system gets smarter over time

This is the v2 sophistication you don't have to think about:

- Every `/deep` writes new positions and decisions. The Position Library grows.
- Every position with a forward claim spawns a prediction. The Calibration Tracker grows.
- Every Monday at 6am, the financial-tripwire scan auto-runs.
- Every Monday at 7am, the stakeholder activity refresh auto-runs.
- Every Sunday, renewal-forecast and call-intelligence sweeps run.
- After every `/deep`, `run-critique` writes a feedback memory.
- After 3+ same-pattern critiques, `skill-creator` is proposed to codify the pattern.
- Every month, `/audit-positions` retests every belief against current data.

Run 30 of `/deep` on related topics is materially smarter than run 1 because the libraries have compounded.

---

## Step 5: Day-Zero confirmations you still owe me

Four of the new skills run with ASSUMED defaults until you confirm. The skills work today; they're sharper after these are locked:

1. **`covenant-tracker`** — CFO inputs verbatim covenant definitions from the Barclays credit agreement (leverage threshold, FCCR, liquidity, customer-concentration thresholds, test dates).
2. **`renewal-forecast`** — Confirm Class NRR formula definition, board target NRR threshold, eight-signal risk weights.
3. **`call-intelligence`** — Confirm competitor list (defaults: Engageli, Top Hat, Anthology/Canvas, D2L, Moodle), sentiment-cue phrases, CRITICAL escalation cutoff.
4. **`run-critique`** — Confirm five-dimension weights and whether composite scores surface by default or only when asked.

Each is a 15-30 minute conversation. None blocks you from using the system today.

---

## Common questions

**Q: If I open a new session and don't say anything, does Claude know about all this?**
A: Claude knows about the memory entries (auto-loaded). To know about the workspace docs and skills, the project instructions need to be updated (Step 1 above). After that, yes — every new session in this project picks it all up.

**Q: Do I have to use the slash-commands?**
A: No. You can just talk to Claude normally. The slash-commands are the explicit signal that you want the heavy machinery. For everyday questions, normal conversation works fine and Claude will still consult the operating model when relevant.

**Q: What if I'm in a different Cowork project (Apply, Locality)?**
A: Those projects have their own memory spaces. The Cross-Claude Knowledge Spine (`_spine/`, designed in v2 but not yet bootstrapped) is what bridges them. Until the spine is built, those projects don't auto-see this project's work.

**Q: What if Claude doesn't follow the operating model in a session?**
A: Two possible causes — (a) project instructions weren't updated, or (b) the prompt was too vague to trigger any mode. Drop the prompt template above. If still wrong, write a `feedback` memory describing what happened so the system learns.

**Q: How do I know the system is working?**
A: After each `/deep`, look for: a file added to `positions/`, an entry in `decisions/INDEX.md`, one or more predictions in `calibration/predictions/`, and a `run_critique_*` feedback memory. If those are showing up, the system is running as designed.

---

## What to do RIGHT NOW

1. Open `PROJECT_INSTRUCTIONS_RECOMMENDED.md` in this folder.
2. Copy the entire contents.
3. Paste into the "Business Planning" Cowork project settings, replacing the current short paragraph.
4. Save.
5. Close this session, open a new one in the Business Planning project.
6. Type: `/quick what's the W30 cash trough this week and what changed since last refresh?`
7. Watch the system fire. If `weekly-cash-forecast` runs and produces a sourced number, you're operational.
