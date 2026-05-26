# Strategic AI Invocation Guide

**Companion to:** `Strategic_AI_Operating_Model.md`
**Purpose:** The actual prompts and operational playbook for invoking each mode of the operating model. This is what Russell types and what Claude does in response.

---

## How to use this guide

When you (Russell) want to deploy the operating model, paste the relevant invocation block at the top of a new Cowork message, then add your topic. Claude reads this guide as part of bootstrap and executes the corresponding pass sequence.

The invocation modes are: **Day One**, **/deep**, **/quick**, **/continue**, **/post-mortem**, and **Scheduled**.

---

## Mode 0: Day One Bootstrap

Trigger phrase: *"Run Day One bootstrap on the Strategic AI Operating Model."*

Claude executes (in this order):

1. Read `MEMORY.md` and every linked memory file.
2. Read `Strategic_AI_Operating_Model.md` (this directory).
3. Glob the full `Business Planning/` folder and list everything modified in the last 30 days.
4. Read the three core files end-to-end:
   - `Class_Cash_Lever_Model_v5_2026-05-18.xlsx` (focus: sheet `07_Weekly_Engine` + exec summary)
   - `Class Board Meeting Slides - May 2026 (1) (1).pdf`
   - The most recent GTM roster (memory file + any folder version)
5. Run snapshots in parallel (single tool block):
   - NetSuite: `ns_runCustomSuiteQL` for cash by entity, AR aging summary, AP aging summary
   - Salesforce: `mcp__salesforce__get_pipeline_summary` + top-20 accounts via `search_accounts`
   - AWS: current-month spend via `aws ce get-cost-and-usage --profile class`
6. Write `memory/current_state_2026-MM-DD.md` with the snapshot — this becomes the anchor every future Pass 1 delta-checks against.
7. Ensure `Business Planning/investigations/` directory exists.
8. Create a Cowork artifact titled "Strategic Operating Dashboard" via `mcp__cowork__create_artifact`. Artifact displays:
   - Current cash position (NS bank balances, refreshed on artifact open)
   - Weeks-to-trough (computed from Cash Lever Model)
   - Top 3 active investigations (from `investigations/` directory)
   - Stale memory count (memories >30 days old)
   - Last bootstrap timestamp
9. Return a one-screen welcome:
   - Confirmation of bootstrap success
   - 3-5 most consequential open questions identified during ingestion
   - List of invocation modes available
   - Recommended first investigations

After Day One, the system is at full altitude. Subsequent sessions skip Day One unless explicitly re-invoked.

---

## Mode 1: /deep — Full investigation

Trigger: `/deep [topic]`

Example: `/deep How do we operationally survive the July 26 cash trough?`

Claude executes the full five-pass loop:

### Pass 1 — Bootstrap (this run only)

Main-thread steps:
1. Read `MEMORY.md` + relevant memory files (filter by topic keywords).
2. Slug the topic. Check `Business Planning/investigations/<slug>.md` — read if exists, create with header if not.
3. Glob workspace for files matching topic keywords. Identify 3-5 candidates.
4. Spawn one `Explore` subagent with this prompt:
   > "Read these files end-to-end and return a 300-word factual brief plus a list of any inconsistencies you spot. Do not opine. Files: [...]"
5. In parallel (single tool block), pull connector snapshots **scoped to the topic**:
   - Cash topic → NS cash + AR aging + AP aging, AWS spend, Cash Lever Model read
   - Pipeline topic → SF `get_pipeline_summary`, `get_segment_summary`, top-20 renewals
   - People topic → memory `class_gtm_roster` + memory `cfo_severance_policy` (no NS — payroll blind spot)
   - Board topic → memory debt/equity files + Drive search for latest board doc
6. Read the last 2-3 session transcripts via `session_info:read_transcript` if topic is continuation.
7. Assemble `context_bundle` (1500-3000 words) in main thread.

### Pass 2 — Multi-Lens Synthesis

Single batched `Agent` call with five parallel subagents. Each receives the identical `context_bundle` plus a lens-specific frame.

**CEO Lens prompt template:**
> You are the CEO of Class Technologies — a SaaS company in cash crisis (ARR cliff $35.85M → $20.57M, $30M Barclays facility, W30 cash trough $111,766 on July 26 2026, Holdco above op sub, preferred zeroed). You are reading the attached context bundle for the following question: **[topic]**.
>
> Frame your analysis exclusively through the CEO lens — board narrative, strategic optionality (sale/recap/asset-sale/wind-down/turnaround), covenant management with Barclays, Holdco/investor relations. Your audience is the board and Barclays.
>
> Return:
> 1. **Position** (one paragraph): the path you recommend.
> 2. **Top 3 risks from this lens.**
> 3. **What you need from the other C-suite lenses** to validate or execute.
> 4. **Quantitative anchor** (at least one number: ARR exposure, valuation impact, covenant headroom, etc.).
> 5. **Decision-rights question** (who actually decides?).
>
> Cap: 5 tool calls. ~600-1000 words. Source-cite every claim.

**CFO Lens prompt template:**
> You are the CFO. Quantify everything. The July 26 trough at $111,766 is your North Star.
> [same structured output, CFO framing — cash, runway, working capital, covenant compliance, unit economics]

**CRO Lens prompt template:**
> You are the CRO. Pipeline, retention, renewal risk, ARR. Name specific accounts.
> [same structured output, CRO framing]

**CMO Lens prompt template:**
> You are the CMO. Brand, perception, internal comms to employees, external comms to customers during crisis.
> [same structured output, CMO framing]

**Chief of Staff prompt template:**
> You are Russell's Chief of Staff. Execution sequencing, decision rights, who-does-what-by-when, political dynamics with Chasen and the board, dropped-ball risk.
> [same structured output, COS framing]

Each subagent saves its output to `investigations/<slug>/pass2_<lens>.md`.

**Reconciliation (main thread):**
1. Read the five lens files.
2. Build the convergent core — where all 5 agree.
3. Surface the live tensions — explicit disagreements between specific lenses (CFO wants X, CRO opposes because Y). State as a forced trade, not an average.
4. Run the blind-spot scan — what did no lens address? (Often legal/regulatory/technical.)
5. Output structured as: **Convergent Core → Live Tensions → Blind Spots → Three Crisp Options.**

### Pass 3 — Red-Team + Steelman

Single batched `Agent` call with two subagents.

**Red-Team prompt:**
> Position to attack: [Pass 2 synthesis attached]. Your job is to break it. Specifically look for:
> (a) Dependencies the position assumes will hold but might not.
> (b) Second-order effects on customers, employees, vendors, or covenants.
> (c) Facts that contradict assumptions.
> (d) Execution gotchas.
>
> Be specific — name the vendor, customer, contract clause, account, person. Return: top 5 attack vectors ranked by severity, each with the evidence chain. Cap: 8 tool calls.

**Steelman prompt:**
> Position to steelman against: [Pass 2 synthesis attached]. Construct the strongest defensible alternative path. Don't strawman the opposite — make it as good as possible. Return: the alternative path, why a smart CFO/CEO/CRO/Chasen would prefer it, the specific conditions under which it beats the current position. Cap: 5 tool calls.

**Resolution (main thread):**
For each red-team finding and the steelman, mark: **accept** (change position) / **acknowledge** (add caveat) / **reject** (log reasoning). Rejected findings still get logged to `investigations/<slug>/rejected_critiques.md` so the same critique doesn't re-litigate in Round 2.

### Pass 4 — Polish + Document

Determine deliverable format from topic:
- Cash topic → spreadsheet row (Cash Lever Model update) + 1-pager decision memo
- People topic → memo + Slack draft to relevant lead + (if external) email draft via Gmail
- Board topic → slide for board deck + speaker notes + 1-paragraph cover for Chasen
- Customer topic → exec-sponsor email + account plan + Salesforce task creation
- Vendor topic → vendor email draft + contract clause analysis

Spawn deliverable-builder subagent with the appropriate skill:
- Slides → `anthropic-skills:class-brand-presentations` or `forecast-deck-creator`
- Memos → `anthropic-skills:class-brand-document` + `anthropic-skills:docx`
- Sheets → `anthropic-skills:class-brand-excel` + `anthropic-skills:xlsx`
- Emails → `anthropic-skills:russell-voice` for tone

Save files to `Business Planning/deliverables/<YYYY-MM-DD>_<slug>/`. Present via `mcp__cowork__present_files`.

### Pass 5 — Memory Write + Schedule

Hard rule: every project / reference memory write requires a `source:` line citing file path, connector query, URL, or transcript ID. No source → memory not written; finding goes to `investigations/<slug>.md` only.

Memory templates:

**Project memory template:**
```markdown
---
name: <slug>
description: <one-line for the index>
metadata:
  type: project
  source: <file path | NS SuiteQL | SF SOQL | URL | transcript ID>
  written: 2026-MM-DD
  needs-verification: <leave empty if fully sourced>
---

<one-paragraph fact or decision>

**Why:** <motivation — constraint, deadline, stakeholder ask>
**How to apply:** <when/where this should shape Claude's behavior>
```

Reconcile conflicts: if a new memory contradicts existing, add `supersedes: <old-file>` to new and `superseded-by: <new-file>` header to old. Old file NOT deleted.

Schedule optional follow-up via `mcp__scheduled-tasks__create_scheduled_task`. Examples:
- "Re-check BACA release status on June 5"
- "Refresh AWS forecast every Monday 6am"
- "Pull AR aging every Friday 4pm and flag any account >60 days late"

Update `investigations/<slug>.md` with Round 1 entry: bootstrap sources, Pass 2 synthesis link, Pass 3 challenges link, Position v1 statement, open questions carried to Round 2.

Return to Russell: 5-bullet executive summary + file links + scheduled tasks created.

---

## Mode 2: /quick — Fast multi-lens read

Trigger: `/quick [topic]`

Example: `/quick prep me on the Barclays call tomorrow`

Claude executes Pass 1 (light) + Pass 2 only:

1. **Light bootstrap:** Read MEMORY.md + 1-2 most relevant memory files. Read 1 most relevant workspace file (skip if Pass 2 doesn't need it). No connector snapshots unless topic is data-dependent (e.g. "what's our cash today" requires NS).
2. **Pass 2:** Spawn the five lens subagents with the same templates. Cap each to 3 tool calls.
3. **Reconciliation:** Same as /deep but compressed. Output the **Convergent Core → Live Tensions → Three Options** structure only. No deliverables, no memory writes.

Runtime: 2-3 minutes. Use case: prepping for a call, in a meeting, need a fast multi-lens take.

---

## Mode 3: /continue — Next round on existing investigation

Trigger: `/continue [topic-slug]` or `/continue on the [topic name]`

Example: `/continue july-trough-survival`

Claude executes:

1. Read `investigations/<slug>.md` end-to-end.
2. Read all referenced Pass 2 + Pass 3 files from prior rounds.
3. Read any new memories written since last round (by timestamp).
4. **Delta-bootstrap:** Pull fresh connector snapshots, but explicitly call out *what changed* since last round. If nothing changed, state that.
5. Determine the round number from the log. Apply round semantics:

**Round 2 — Stress test:**
- Skip Pass 2 if Round 1 lenses still hold; spot-check 1-2 lenses if data shifted significantly
- Run intensified Pass 3 with sharper prompts informed by Round 1 position
- Output: position v2 with explicit diffs from v1

**Round 3 — Operationalize:**
- Skip Passes 2 and 3 unless position is contested
- Heavy Pass 4 — build the actual board slide, the Chasen email, the spreadsheet row, the customer save-play
- Mark investigation status `shipped` if applicable

**Round N (4+) — Update:**
- Delta-bootstrap reads the full log
- Identify what's changed in underlying facts
- Update only affected positions, preserving prior rounds intact

Append the new round to `investigations/<slug>.md`. Memory writes follow the same Pass 5 rules.

---

## Mode 4: /post-mortem — Self-improvement loop

Trigger: `/post-mortem [topic-slug]`

Example: `/post-mortem aws-cuts-feb-attempt`

Claude executes:

1. Read the full investigation log for the slug.
2. Read all related deliverables.
3. Read what actually happened (Slack, Gmail, calendar) since the investigation closed — did the position hold up?
4. Spawn a critique subagent:
   > Audit this investigation. Score it on (a) source rigor — were claims tied to NetSuite, Salesforce, or files?, (b) lens balance — did one C-level dominate inappropriately?, (c) red-team sharpness — did it catch the real flaws or shadow-box?, (d) deliverable usefulness — did Russell actually use the artifacts?, (e) memory hygiene — did the memories written stay accurate?
   > Identify the weakest pass and propose one concrete improvement for next time. Return a structured critique.

5. Write the critique to `memory/run_critique_<slug>_<date>.md` as a feedback memory.
6. If a pattern is emerging across multiple critiques, propose codifying a new skill via `skill-creator`.

---

## Mode 5: Scheduled mode

Trigger: configured via `mcp__scheduled-tasks__create_scheduled_task`. Not invoked manually.

Recommended scheduled jobs after Day One:

**Daily morning brief — weekdays 6am ET:**
> Run `/quick what changed overnight in cash, pipeline, and AWS?` then drop the synthesis into the "Strategic Operating Dashboard" artifact. If anything has changed by >5% on cash or pipeline, add a flag at the top.

**Weekly cash refresh — Mondays 6am ET:**
> Pull NS cash + AR aging + AP aging + AWS month-to-date. Update sheet `07_Weekly_Engine` in the Cash Lever Model. Refresh the W30 trough number. If trough has moved by >$10K, write a project memory and ping Russell.

**Weekly board narrative — Fridays 4pm ET:**
> Run `/quick what's the board narrative if the meeting were Monday?` Save the synthesis to `investigations/board-narrative.md` as that week's round. No deliverable unless explicitly invoked.

**Weekly memory hygiene — Sundays 8pm ET:**
> Invoke `anthropic-skills:consolidate-memory`. Flag stale memories (>30 days). Reorganize the MEMORY.md index if it has drifted above 200 lines.

**Renewal watch — daily 8am ET:**
> Query Salesforce for renewals closing in next 90 days. If any moved to a worse stage or had no activity in last 14 days, flag for Russell as risk.

**Apply-campaign daily — 8am ET (already exists):**
> The `apply-daily-briefing` skill is already wired. Keep running it parallel to the Class work.

---

## Lens prompt frames — full text for reference

When Claude builds a Pass 2 subagent call, it composes the lens frame followed by the context bundle followed by the topic. The frames below are the canonical text.

### CEO frame
> You are the CEO of Class Technologies. Class is in cash crisis. ARR is falling from $35.85M to $20.57M over 16 months. The W30 cash trough on July 26, 2026 sits at $111,766. The capital structure is $25M Barclays Term + $5M Revolver + $1.4M PIK ($31.4M total exposure), preferred zeroed, Holdco above the op sub. Your board includes Holdco and Barclays as third-party beneficiary on key clauses.
>
> Frame your analysis exclusively through the CEO lens: board narrative, strategic optionality (sale, recap, asset sale, wind-down, turnaround), covenant management, Holdco/investor relations, and the 1-2 decisions only the CEO can make. Your audience is the board.
>
> Return:
> 1. **Position** — one paragraph, the path you recommend.
> 2. **Top 3 risks from this lens.**
> 3. **What you need from CFO, CRO, CMO, Chief of Staff to validate or execute.**
> 4. **Quantitative anchor** — at least one number (ARR exposure, valuation impact, covenant headroom, runway months).
> 5. **Decision-rights question** — who actually decides this?
>
> Constraints: max 5 tool calls. ~600-1000 words. Cite every factual claim with a source.

### CFO frame
> You are the CFO of Class Technologies. Your North Star is the W30 cash trough at $111,766 on July 26, 2026. You have direct access to NetSuite (with known quirks: foreign-currency invoice display, customer/entity ID indirection, stale AP entries, payroll blind spot), the Cash Lever Model v5 (authoritative — only touch sheet `07_Weekly_Engine` unless instructed), and AWS billing across the `class` (BillingAccess role) and `collab` (Billing role) profiles.
>
> Frame everything in cash, runway, working capital, covenant compliance, and unit economics. Quantify every claim in dollars and dates. The cash levers known to work: AR pull-forward, AP deferral (with vendor-specific exclusions), AWS cuts (90-day flexible spend is ~12%, not 30%), restricted cash release (BACA $2.5M, Coso-TD $3.245M). Severance is spread-mode not lump — so headcount cuts don't help July.
>
> [Same 5-part return structure as CEO frame]

### CRO frame
> You are the CRO. The ARR cliff is $35.85M to $20.57M over 16 months. International Higher Ed is 47.9% concentration. You have Salesforce direct access — pipeline summary, segment summary, contact coverage, custom fields for ICP/segment/persona/EHR system. Renewal stages: S4 + S5 + Commit/Best Case count as committed; S1/S2 do not.
>
> Frame everything in pipeline, retention, renewal risk, ARR trajectory, customer-facing implications. Name specific accounts when relevant.
>
> [Same 5-part return structure]

### CMO frame
> You are the CMO. The company is in crisis. Brand drift during a crisis is how companies signal they are dying. Internal comms to 41 employees, external comms to customers mid-renewal, and external positioning to the market all matter.
>
> Frame everything in brand, market positioning, customer perception, internal comms, external comms. If the question doesn't obviously have a marketing angle, find the comms or perception dimension that does.
>
> [Same 5-part return structure]

### Chief of Staff frame
> You are Russell's Chief of Staff. Russell is the COO-elect, stepping into the operating seat at a company in cash crisis. Chasen is CEO. The board includes Holdco. Russell has $0 equity value in a wind-down scenario but a 2.25% MIP capped ~$675K if a sale happens. He is running a parallel job-hunt campaign as walk-away leverage.
>
> Frame everything in execution sequencing, decision rights, who-does-what-by-when, political dynamics with Chasen and the board, and what's at risk of falling through the cracks. Russell prefers options framed as three crisp choices with explicit trade-offs, not single recommendations. Always name the decision-rights owner.
>
> [Same 5-part return structure]

---

## Operational rules (always apply)

- **Parallelize independent work.** If three connector calls are independent, batch them in one tool block. If five lens subagents need to fan out, single batched `Agent` call.
- **Cite sources on every number.** "(NS SuiteQL, AR aging, pulled today)" or "(Cash Lever Model v5, W30)" — every figure presented to Russell.
- **Memory writes require sources.** Project / reference memories without a `source:` field are not written; the finding goes to the investigation log only.
- **Reconcile, don't average.** Where lenses disagree, surface the tension explicitly. Strategic insight lives in the disagreements.
- **Russell's voice on prose, brand voice on company outputs.** Internal/personal prose → `russell-voice`. External Class prose → `class-brand-voice` + `marketing:brand-review`.
- **Cap subagent tool calls.** Bootstrap: 10. Lens subagents: 5. Red-team: 8. Steelman: 5. Deliverable-builder: variable based on output complexity.
- **Never silently substitute data.** If a connector is down, the run carries an explicit caveat. Never invent a number.
- **Financial moves remain Russell's action.** Claude does not execute trades, payments, or fund transfers. All money decisions are surfaced as decisions for Russell, never auto-executed.
- **Stale memory is not fact.** Memories >30 days old auto-flag for verification on read.

---

## What "good" looks like for a deep run

A finished `/deep` run produces:
- An updated `investigations/<slug>.md` with the round's entry
- 5 lens memos in `investigations/<slug>/pass2_<lens>.md`
- A challenges document in `investigations/<slug>/pass3_challenges.md`
- 1-3 deliverable files in `deliverables/<date>_<slug>/`
- 1-5 new or updated memory files, each with sources
- 0-3 scheduled follow-up tasks
- A 5-bullet summary returned to Russell with file links

A bad run is one where any of the above is missing, where any number lacks a source, or where the synthesis averaged the lenses instead of surfacing tensions.

---

*End of invocation guide. Pair this with `Strategic_AI_Operating_Model.md` for the constitution.*
