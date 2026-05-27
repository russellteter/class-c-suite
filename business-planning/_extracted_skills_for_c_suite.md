# Extracted Skills for C-Suite Build

**Purpose:** Consolidated extraction of eight custom skills/operating-procedures from Russell's Cowork environment, packaged for the C-Suite Claude Code build to ingest. Each section contains the full verbatim SKILL.md content from this project so Claude Code can implement equivalent behavior inside the C-Suite without re-deriving the logic.

**Generated:** 2026-05-26 by the Cowork session that produced the C-Suite PRD and CLAUDE.md.

**Source of truth:** The skills live in the Cowork plugin skills directory at `/var/folders/tg/ts2snjfj0kg60nw01j9wk4040000gn/T/claude-hostloop-plugins/ad2f115627d1bbbc/skills/<skill-name>/`. That path is ephemeral (it's a temp-folder mount Cowork manages). The verbatim content below is the authoritative copy for the C-Suite build.

---

## How Claude Code should use this file

1. **Read every section before designing the corresponding C-Suite agent or playbook.** These skills encode operating logic Russell has tuned over months of /deep runs. Re-deriving them from scratch would burn time and miss subtle disciplines (e.g., the Salesforce committed-stage definition, the AWS class+collab sum rule, the FX handling in NetSuite, the Chorus continuation-key gotcha).

2. **Re-implement, don't re-invoke.** The skill files reference Cowork-specific MCP tool names with UUIDs (e.g., `mcp__c1f73cc9-916c-4b4e-b5fc-db2960d27602__ns_runCustomSuiteQL`). Those identifiers belong to Cowork and don't transfer to the C-Suite. The C-Suite implementation calls its own MCP wrappers (Salesforce, AWS, Gmail, NetSuite, Chorus per PRD §6). Map the skill's intent to the C-Suite's wrapper interface — do not paste the UUIDs.

3. **Treat YAML frontmatter as load-bearing.** The C-Suite parses frontmatter to know what a skill does and when to invoke it. Preserve the `name:` and `description:` fields exactly when porting these into C-Suite agent prompts or playbook configs.

4. **Inline the russell-voice reference files.** They're included at the end of the russell-voice section verbatim. The C-Suite's Synthesizer and Verifier prompts must encode these phrase bans, structural anti-patterns, and lexicon swaps directly — don't link out to files the C-Suite agents can't reliably read at runtime.

5. **One known bug to fix on import — see renewal-forecast notes below.** The skill uses `Opportunity.Owner.Name` SOQL queries that surface terminated reps. The corrected pattern is documented in the skill's "Known issues" section.

## Connector wiring guidance for the C-Suite

The skills reference six Cowork MCPs. Map each to the C-Suite's V1 wrappers:

| Skill references | C-Suite V1 MCP (per PRD §6) | Notes |
|---|---|---|
| `mcp__c1f73cc9-...__ns_*` | NetSuite (TBA tokens, see CLAUDE.md Track E) | Brian must issue TBA tokens before this works |
| `mcp__salesforce__*` and `mcp__salesforce-dx__*` | Salesforce (Connected App OAuth refresh) | Field map in `Strategic_AI_Connector_Playbook.md` |
| `mcp__AWS_API_MCP_Server__*` | AWS (SSO profiles `class` + `collab`) | Already configured locally; sum both profiles |
| `mcp__chorus__*` | Chorus (API key via header) | Pagination `continuation_key=' '` means done |
| `mcp__Google_Workspace_MCP__*` | Gmail / Google Workspace (OAuth refresh) | Google MCP handles browser OAuth on first run |
| `mcp__6685cb38-...__slack_*` | (Deferred to V1.5) | Skills reference Slack but Slack MCP is post-V1 |

Where a skill references Slack tools, mark the dependency and defer the Slack-touching code paths to V1.5.

For full connector routing rules, SuiteQL patterns, SOQL patterns, and data-quality discipline, Claude Code reads `Strategic_AI_Connector_Playbook.md` during Phase 0 Track A. That document is the canonical reference; this file complements it with the per-skill business logic.

---

## 1. russell-voice

**Status in Cowork:** Standalone skill file at `/var/folders/tg/.../skills/russell-voice/SKILL.md` plus four reference files in `references/`. The skill auto-loads when Russell asks for prose, scripts, memos, presentations, or anything longer than a few sentences.
**Last invoked:** Routinely — fires on virtually every memo or document Russell produces. This is the most-used skill in his Cowork environment.
**Confidence the skill exists in this project:** full — SKILL.md + all four reference files exist and are read regularly.

### Full content (verbatim — SKILL.md frontmatter + body)

```markdown
---
name: russell-voice
description: Write like Russell Teter talks — direct, warm, specific, zero AI slop. Use whenever Claude writes emails, docs, reports, presentations, memos, proposals, partner comms, board materials, LinkedIn posts, or any prose longer than a few sentences. Also trigger for "prompt script", "speaking script", "presenter notes", "talk track", or anything meant to be read aloud during a live presentation, webinar, or demo. Trigger on "clean this up", "make it sound like me", "de-slop", "too AI", "rewrite in my voice", or similar. Layers ON TOP of brand skills (Class, Locality) as a final quality pass. Skip for short replies, code, data tables, or standalone bullet lists.
---

# Russell Voice

Two jobs: (1) strip AI writing patterns from prose, and (2) produce spoken-word scripts Russell can read live without sounding like he's reading.

This skill is a final-pass quality filter. When producing branded content, apply the relevant brand skill first (Class, Locality, etc.), then run these rules on the prose.

## Part 1: Writing Rules (Stop-Slop + Russell's Voice)

### The Foundation: Kill AI Tells

These eight rules come from the stop-slop framework. They apply to everything.

1. **Cut filler phrases.** Throat-clearing openers, emphasis crutches, adverbs. See [references/phrases.md](references/phrases.md).
2. **Break formulaic structures.** Binary contrasts, negative listings, dramatic fragmentation, rhetorical setups, false agency. See [references/structures.md](references/structures.md).
3. **Use active voice.** Every sentence needs a human subject doing something. No passive constructions. No inanimate objects performing human actions.
4. **Be specific.** No vague declaratives. Name the thing. No lazy extremes doing vague work.
5. **Put the reader in the room.** No narrator-from-a-distance voice. "You" beats "People."
6. **Vary rhythm.** Mix sentence lengths. Two items beat three. End paragraphs differently. No em dashes.
7. **Trust readers.** State facts directly. Skip softening, justification, hand-holding.
8. **Cut quotables.** If it sounds like a pull-quote, rewrite it.

### Russell's Voice Layer

After the stop-slop pass, apply these. Russell sounds like a senior BD leader who talks to partners and executives daily. Warm but not soft. Direct but not cold. Specific but not stiff.

**Contractions are mandatory.** "We would" → "We'd." "You all" stays as "you all" (not "y'all" — Charleston, not Nashville). "It is" → "It's." "I am" → "I'm." Writing without contractions sounds robotic. Use them.

**Plain over corporate.** Russell says "up and running" not "operational." He says "handle" not "navigate challenges." He says "fits" not "aligns with." He says "works" not "functions." He says "talk" not "have a dialogue." See [references/russell-lexicon.md](references/russell-lexicon.md) for the full swap table.

**Context before the ask.** Russell gives you the situation, then makes the request. He never leads with "I'm reaching out because" — he leads with the thing that matters, then asks.

**Warm specificity.** Russell names the person, the company, the product, the metric. He writes "Cornerstone is their LMS and they've got 150 trainers running Epic implementation training" — not "they have a large training organization using an enterprise LMS."

**Softening without weakness.** Russell uses "if there's any appetite on your end" and "totally understand if now isn't the right time" — not "please let me know at your earliest convenience." The softening is casual, not formal.

**Connector words Russell uses.** "Anyway," "Either way," "So," (to start a pivot, not a paragraph), "that said," "on that note." He chains thoughts with dashes. He uses "sort of" and "kind of" when being deliberately casual about something complex.

**Words Russell reaches for.**
- "appetite" (for interest or willingness)
- "circle back" (for following up — yes, it's jargon, but it's HIS jargon)
- "low-lift" (for easy asks)
- "forcing factors" (for urgency drivers in sales)
- "up and running" (for live/operational)
- "framed around" (for positioning)
- "spotlight" (over "case study" when the partner is skittish)
- "go-forward" (for future plans)
- "clean up" (for editing or improving)
- "the nature of" (when framing what something is)

**Words Russell avoids.** "Leverage," "synergy," "optimize," "holistic," "robust," "scalable," "ecosystem" (unless quoting a partner), "empower," "cutting-edge," "innovative," "best-in-class," "world-class," "thought leader."

### Quick Checks (Run Before Delivering)

- Contractions used everywhere possible?
- Any sentence a real person wouldn't say out loud? Rewrite it.
- Any adverbs? Kill them.
- Any passive voice? Find the actor.
- Inanimate thing doing a human verb? Name the person.
- Any "here's what/this/that" throat-clearing? Cut to the point.
- Any "not X, it's Y" contrasts? State Y directly.
- Three consecutive sentences match length? Break one.
- Em-dash anywhere? Remove it. Use a comma or period.
- Vague declarative? Name the specific thing.
- Does it sound like an email from a human being who has a job and knows you? Good.
- Does it sound like ChatGPT wrote a "professional email"? Rewrite the whole thing.

---

## Part 2: Prompt Scripts (Live Presentation Speaking)

When Russell asks for a "prompt script," "speaking script," "talk track," "presenter notes," "what to say," or anything meant to be read aloud while presenting live, follow these rules. The goal: Russell reads the words on screen and the audience thinks he's speaking off the cuff.

### The Core Problem

Written prose sounds wrong when read aloud. Presentation scripts need to be written FOR the mouth, not the eye. Russell should be able to glance at the script, say the words, and sound like himself.

### Script Formatting Rules

**Short lines.** Max 8-12 words per line. One thought per line. The eye grabs a line, the mouth says it, the eye grabs the next one.

**Write how people breathe.** A line break is a breath. Two line breaks are a pause. Use this:

(example removed from this extraction for brevity — see SKILL.md original for the staging-script examples)

**Use ellipsis for natural pauses.** Three dots (...) means "pause here, this lands better with a beat." Russell does this naturally when he talks. Build it in.

**Contractions are non-negotiable.** "We have" → "We've." "It does not" → "It doesn't." Nobody says "we have built" on stage. They say "we've built."

**Fragment sentences are fine.** Spoken language is full of fragments. "150 trainers. One platform. Zero new logins." works on stage. It doesn't work in an email.

**Stage directions in brackets.** Use `[CLICK]` for slide advance, `[PAUSE]` for dramatic timing, `[GESTURE TO SCREEN]` for visual references. Keep them sparse.

**No jargon unless the audience speaks it.** If Russell is presenting to L&D leaders, "VILT" and "LMS" are fine. If he's presenting to a general business audience, spell it out the first time and then use the short version.

**Rhetorical questions work on stage.** They don't work in writing (stop-slop kills them). But on stage, "How many of you have sat through a virtual training where you could tell the instructor couldn't see you?" lands well. Use them sparingly.

**Callback structure.** Plant something early, reference it later. "Remember that 150-trainer number? Here's what happened when they switched." This works on stage because the audience is tracking with you linearly.

### Scoring a Prompt Script

| Dimension | Question |
|-----------|----------|
| Speakability | Can Russell say this without tripping? |
| Breath | Do the line breaks match natural breathing? |
| Personality | Does it sound like Russell or a TED Talk template? |
| Pacing | Mix of fast and slow? Pauses where they matter? |
| Specificity | Real numbers, names, examples? |

Below 35/50: rewrite.

## Reference Files

- references/phrases.md — Banned phrases, jargon replacements, adverb kill list (INLINED BELOW)
- references/structures.md — Structural anti-patterns to avoid (INLINED BELOW)
- references/russell-lexicon.md — Russell's vocabulary, swaps, and voice patterns (INLINED BELOW)
- references/script-examples.md — Full before/after prompt script transformations (NOT INLINED — script-specific, not memo-relevant)

## License

MIT — Stop-slop foundation by Hardik Pandya (https://hvpandya.com). Voice layer and script rules by Russell Teter.
```

### Inlined reference: phrases.md (banned phrases, jargon, adverbs, vague declaratives)

```markdown
# Phrases to Remove

## Throat-Clearing Openers

Remove these announcement phrases. State the content directly.

- "Here's the thing:"
- "Here's what [X]"
- "Here's this [X]"
- "Here's that [X]"
- "Here's why [X]"
- "The uncomfortable truth is"
- "It turns out"
- "The real [X] is"
- "Let me be clear"
- "The truth is,"
- "I'll say it again:"
- "I'm going to be honest"
- "Can we talk about"
- "Here's what I find interesting"
- "Here's the problem though"

Any "here's what/this/that" construction is throat-clearing before the point. Cut it and state the point.

## Emphasis Crutches

These add no meaning. Delete them.

- "Full stop." / "Period."
- "Let that sink in."
- "This matters because"
- "Make no mistake"
- "Here's why that matters"

## Business Jargon

Replace with plain language.

| Avoid | Use instead |
|-------|-------------|
| Navigate (challenges) | Handle, address |
| Unpack (analysis) | Explain, examine |
| Lean into | Accept, embrace |
| Landscape (context) | Situation, field |
| Game-changer | Significant, important |
| Double down | Commit, increase |
| Deep dive | Analysis, examination |
| Take a step back | Reconsider |
| Moving forward | Next, from now |
| Circle back | Return to, revisit |
| On the same page | Aligned, agreed |

## Adverbs

Kill all adverbs. No -ly words. No softeners, no intensifiers, no hedges.

Specific offenders:

- "really"
- "just"
- "literally"
- "genuinely"
- "honestly"
- "simply"
- "actually"
- "deeply"
- "truly"
- "fundamentally"
- "inherently"
- "inevitably"
- "interestingly"
- "importantly"
- "crucially"

Also cut these filler phrases:

- "At its core"
- "In today's [X]"
- "It's worth noting"
- "At the end of the day"
- "When it comes to"
- "In a world where"
- "The reality is"

## Meta-Commentary

Remove self-referential asides. The essay should move, not announce its own structure.

- "Hint:"
- "Plot twist:" / "Spoiler:"
- "You already know this, but"
- "But that's another post"
- "X is a feature, not a bug"
- "Dressed up as"
- "The rest of this essay explains..."
- "Let me walk you through..."
- "In this section, we'll..."
- "As we'll see..."
- "I want to explore..."

## Performative Emphasis

False intimacy or manufactured sincerity:

- "creeps in"
- "I promise"
- "They exist, I promise"

## Telling Instead of Showing

Announcing difficulty or significance rather than demonstrating it:

- "This is genuinely hard"
- "This is what leadership actually looks like"
- "This is what X actually looks like"
- "actually matters"

## Vague Declaratives

Sentences that announce importance without naming the specific thing. Kill these.

- "The reasons are structural"
- "The implications are significant"
- "This is the deepest problem"
- "The stakes are high"
- "The consequences are real"

If a sentence says something is important/deep/structural without showing the specific thing, cut it or replace it with the specific thing.
```

### Inlined reference: structures.md (structural anti-patterns)

```markdown
# Structures to Avoid

## Binary Contrasts

These create false drama. State the point directly.

| Pattern | Problem |
|---------|---------|
| "Not because X. Because Y." / "Not because X, but because Y." | Telegraphed reversal |
| "[X] isn't the problem. [Y] is." | Formulaic reframe |
| "The answer isn't X. It's Y." | Predictable pivot |
| "It feels like X. It's actually Y." | Setup/reveal cliche |
| "The question isn't X. It's Y." | Rhetorical misdirection |
| "Not X. But Y." / "not X, it's Y" / "isn't X, it's Y" | Mechanical contrast |
| "It's not this. It's that." | Same formula, different words |
| "stops being X and starts being Y" | False transformation arc |
| "doesn't mean X, but actually Y" | Negation-then-assertion crutch |
| "is about X but not Y" | False distinction |
| "not just X but also Y" | Additive hedge |

**Instead:** State Y directly. "The problem is Y." "Y matters here." Drop the negation entirely.

## Negative Listing

Listing what something is *not* before revealing what it *is*. A rhetorical striptease.

| Pattern | Problem |
|---------|---------|
| "Not a X... Not a Y... A Z." | Dramatic buildup through negation |
| "It wasn't X. It wasn't Y. It was Z." | Same structure, past tense |

**Instead:** State Z. The reader doesn't need the runway.

## Dramatic Fragmentation

Sentence fragments for emphasis read as manufactured profundity.

| Pattern | Problem |
|---------|---------|
| "[Noun]. That's it. That's the [thing]." | Performative simplicity |
| "X. And Y. And Z." | Staccato drama |
| "This unlocks something. [Word]." | Artificial revelation |

**Instead:** Complete sentences. Trust content over presentation.

## Rhetorical Setups

These announce insight rather than deliver it.

| Pattern | Problem |
|---------|---------|
| "What if [reframe]?" | Socratic posturing |
| "Here's what I mean:" | Redundant preview |
| "Think about it:" | Condescending prompt |
| "And that's okay." | Unnecessary permission |

**Instead:** Make the point. Let readers draw conclusions.

## Formulaic Constructions

| Pattern | Problem |
|---------|---------|
| "By the time X, I was Y." | Narrative template |
| "X that isn't Y" | Indirect. Say "X is broken" |

## False Agency

Giving inanimate things human verbs. Complaints don't "become" fixes. Bets don't "live or die." Decisions don't "emerge." A person does something to make those things happen. AI loves this because it avoids naming the actor.

| Pattern | Problem |
|---------|---------|
| "a complaint becomes a fix" | The complaint did nothing. Someone fixed it. |
| "a bet lives or dies in days" | Bets don't have lifespans. Someone kills the project or ships it. |
| "the decision emerges" | Decisions don't emerge. Someone decides. |
| "the culture shifts" | Cultures don't shift on their own. People change behavior. |
| "the conversation moves toward" | Conversations don't move. Someone steers. |
| "the data tells us" | Data sits there. Someone reads it and draws a conclusion. |
| "the market rewards" | Markets don't reward. Buyers pay for things. |

**Instead:** Name the human. "The team fixed it that week" beats "the complaint becomes a fix." If no specific person fits, use "you" to put the reader in the seat.

## Narrator-from-a-Distance

Floating above the scene instead of putting the reader in it.

| Pattern | Problem |
|---------|---------|
| "Nobody designed this." | Disembodied observation |
| "This happens because..." | Lecturer voice |
| "This is why..." | Same |
| "People tend to..." | Armchair sociologist |

**Instead:** Put the reader in the room. "You don't sit down one day and decide to..." beats "Nobody designed this."

## Passive Voice

Every sentence needs a subject doing something. Passive voice hides the actor and drains energy.

| Pattern | Fix |
|---------|-----|
| "X was created" | Name who created it |
| "It is believed that" | Name who believes it |
| "Mistakes were made" | Name who made them |
| "The decision was reached" | Name who decided |

**Instead:** Find the actor. Put them at the front of the sentence.

## Sentence Starters to Avoid

| Pattern | Fix |
|---------|-----|
| Sentences starting with What, When, Where, Which, Who, Why, How | Restructure. Lead with the subject or the verb. |
| Paragraphs starting with "So" | Start with content |
| Sentences starting with "Look," | Remove |

Wh- openers become a crutch. "What makes this hard is..." becomes "The constraint is..." or better, name the specific constraint.

## Rhythm Patterns

| Pattern | Fix |
|---------|-----|
| Three-item lists | Use two items or one |
| Questions answered immediately | Let questions breathe or cut them |
| Every paragraph ends punchily | Vary endings |
| Em-dashes | Remove. Use commas or periods. No em dashes at all. |
| Staccato fragmentation | Don't stack short punchy sentences |
| "Not always. Not perfectly." | Hedging disguised as reassurance |

## Word Patterns

| Pattern | Problem |
|---------|---------|
| Lazy extremes (every, always, never, everyone, everybody, nobody) | False authority. Use specifics instead of sweeping claims. |
| All adverbs (-ly words, "really," "just," "literally," "genuinely," "honestly," "simply," "actually") | Empty emphasis. See phrases.md for full list. |
```

### Inlined reference: russell-lexicon.md (vocabulary swaps, patterns, tone)

```markdown
# Russell's Lexicon

Russell Teter's vocabulary patterns, drawn from hundreds of real emails, partner communications, Slack messages, and presentation prep. This is what Russell sounds like when he's being himself.

## Vocabulary Swaps

When writing for Russell, replace the left column with the right column.

| AI/Corporate Default | Russell Says |
|---|---|
| leverage | use |
| utilize | use |
| optimize | improve, tighten up |
| facilitate | help, run, set up |
| implement | roll out, set up, launch |
| operationalize | get running, put in place |
| operational | up and running |
| navigate challenges | handle, deal with, work through |
| align with | fits, matches, works with |
| functions as | works as, acts as |
| have a dialogue | talk, chat, have a conversation |
| at your earliest convenience | when you get a chance |
| I'm reaching out because | [cut — lead with the thing] |
| I wanted to take a moment to | [cut — say the thing] |
| comprehensive solution | [name what it does specifically] |
| innovative platform | [name the platform and what it does] |
| best-in-class | [cut or name the specific advantage] |
| cutting-edge | [cut — just describe the thing] |
| empower | help, let, give [person] the ability to |
| holistic approach | [name the specific parts] |
| robust | solid, strong, thorough |
| scalable | [name the actual scale: "handles 10K users"] |
| ecosystem | [name the actual pieces: "Cornerstone + Class + Zoom"] |
| synergy | [name what works together and why] |
| thought leader | [cut entirely] |
| world-class | [cut or name the specific quality] |
| stakeholders | [name them: "your VP of L&D", "the IT team"] |
| deliverables | [name the actual things: "the deck", "the report"] |
| cadence | schedule, rhythm |
| bandwidth | time, capacity |
| take offline | talk about separately, follow up on |
| loop in | bring in, add |
| net-net | bottom line, the short version |
| move the needle | make a difference, change the numbers |
| value proposition | what we do for them, the pitch |

## Words Russell Reaches For

These are Russell's go-to words. They show up in his actual emails and messages. Use them when they fit naturally.

**For interest or willingness:** "appetite" — "if there's any appetite on your end"
**For following up:** "circle back" — "I wanted to circle back on the webinar conversation"
**For easy asks:** "low-lift" — "it's a pretty low-lift ask on your end"
**For urgency drivers in sales:** "forcing factors" — "what are the forcing factors here?"
**For live/operational:** "up and running" — "since you all have been up and running with both solutions"
**For positioning:** "framed around" — "framed around the evolution of your learning programs"
**For a non-threatening case study:** "spotlight" — "less of a case study, more of a spotlight"
**For future plans:** "go-forward" — "their go-forward plans and technology choices"
**For improving/editing:** "clean up" — "can you clean this up"
**For framing what something is:** "the nature of" — "the nature of here's what we know about this call"
**For showing understanding:** "totally understand" — "totally understand if now isn't the right time"
**For being casual about complexity:** "sort of" / "kind of" — "sort of come back around and gauge their interest"
**For pivoting:** "anyway" / "either way" — "Either way, she never responded. Anyway, I want to..."
**For explaining what he needs:** "I'm gonna be feeding you some disorganized information that I need you to organize"

## Tone Calibration

Russell's tone shifts by audience. Match accordingly.

| Audience | Tone |
|---|---|
| Internal team (Slack, email) | Casual, direct, fragments OK, dashes everywhere |
| Partner contacts | Warm, specific, softened asks, conversational |
| Board / executives | Clean, metric-driven, no filler, still uses contractions |
| Sales prospects | Specific pain + specific fix, short paragraphs, clear CTA |
| Claude (instructions) | Stream of consciousness, context-heavy, very casual |
```

### Inputs it expects
Any prose that needs voice-shaping: drafts, memos, emails, presentations, board materials, scripts. Optionally the brand context (Class vs. personal vs. Locality) to determine whether voice runs alone or layers on top of a brand-voice skill.

### Outputs it produces
Voice-polished prose. Same structure as input. The skill is a final-pass filter that strips AI tells and applies Russell's lexicon — it does not change the substantive content.

### Dependencies
None as a runtime — operates on prose. Conceptually layers on top of `class-brand-voice` for Class-facing content. The four reference files are part of the skill itself.

### Known issues or supersession notes
None — the skill is mature and routinely invoked. The script-examples.md reference file is presentation-script-specific and was not inlined here because memo-writing inside the C-Suite doesn't need it.

---

## 2. run-critique

**Status in Cowork:** Standalone skill file at `/var/folders/tg/.../skills/run-critique/SKILL.md`. Designed to auto-fire after every `/deep` run as a Pass 6 post-mortem.
**Last invoked:** Two critique memories exist in Russell's memory directory (`run_critique_class_org_institutional_read_2026-05-22.md` and `run_critique_class_gtm_strategy_2026.md`) — confirming the skill has fired on prior runs.
**Confidence the skill exists in this project:** full.

### Full content (verbatim)

```markdown
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

```
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
```

### Inputs it expects
Completed `/deep` investigation artifacts: investigation log, pass2 lens memos, pass3 challenges, pass4 deliverables, pass5 memory writes. Prior run-critique memories for pattern detection.

### Outputs it produces
A `run_critique_<slug>_<date>.md` feedback memory with five-dimension scores, weakest-pass identification, one concrete next-time improvement, optional pattern-flag, recommended action. Optionally a `meta_critique_Q{N}_{year}.md` quarterly aggregate.

### Dependencies
Reads the investigations/ and deliverables/ directories. Writes to memory/ as feedback type. Cross-references positions/, decisions/, predictions/. The Verifier in the C-Suite serves a similar role at run-time; this skill operates AFTER run completion.

### Known issues or supersession notes
**Important for C-Suite design:** The five-dimension rubric here is the operating-model equivalent of what the C-Suite Verifier enforces at run-time. The C-Suite Verifier produces a rigor score during synthesis (gating the memo); this run-critique skill produces a critique AFTER (improving future runs). Both exist; both serve different functions. Don't collapse them.

**Note on lens count:** The rubric describes "all five C-level lenses." The C-Suite extends this to six (CEO/CFO/CRO/CMO/CPO/COS — see PRD §6). Update the rubric's lens-balance criterion accordingly when porting.

---

## 3. weekly-cash-forecast

**Status in Cowork:** Standalone skill file at `/var/folders/tg/.../skills/weekly-cash-forecast/SKILL.md`. Auto-runs Monday 6am ET via scheduled task per the operating model.
**Last invoked:** Status of last automated run unknown from this session; baseline established 2026-05-10 producing W30 trough of $111,766 on July 26, 2026.
**Confidence the skill exists in this project:** full.

### Full content (verbatim)

```markdown
---
name: weekly-cash-forecast
description: Refresh Class's authoritative weekly cash forecast. Locks the May 10 baseline methodology — one command pulls fresh data from NetSuite (cash, AR aging, AP aging by entity), AWS (class + collab profiles), and Salesforce (committed pipeline + at-risk renewals), reconciles against the Cash Lever Model v5 workbook, updates sheet 07_Weekly_Engine, and reports the W30 trough delta vs. prior baseline. Trigger phrases include "refresh the cash forecast", "weekly cash refresh", "what's the W30 trough this week", "update the cash model", or any variation asking for current cash position. Auto-runs Monday 6am ET via scheduled task. Layers ON TOP of class-aws-connector, the NetSuite MCP, and the Salesforce MCP.
---

# weekly-cash-forecast

This skill is the single-command refresh of Class's authoritative weekly cash forecast. It codifies the May 10 baseline methodology that produced the W30 trough of $111,766 on July 26, 2026 (verified against board deck slide 16).

## Required reading before execution

1. Memory: `finance_cash_forecast_authoritative.md` — methodology baseline
2. Memory: `class_cash_model_file.md` — file paths and sheet structure
3. Memory: `cash_lever_model_v5.md` — only touch sheet `07_Weekly_Engine`
4. Memory: `netsuite_class_gotchas.md` — query patterns and quirks
5. Memory: `netsuite_payroll_blind_spot.md` — never derive headcount cost from NS
6. Memory: `class_aws_cli_setup.md` — two profiles, BillingAccess role on class, Billing on collab

## Inputs
- Optional: a date to forecast through (default: 13 weeks from today)
- Optional: a scenario flag (`base` | `stress` | `recovery`) — default `base`

## Execution steps

### Step 1: NetSuite pulls (parallel batch)

Run these in a single tool block via NetSuite SuiteQL:

**Cash by entity (operating + restricted):**
```sql
SELECT
  a.acctname,
  a.subsidiary,
  SUM(tl.foreignamount) AS balance,
  MAX(t.trandate) AS as_of
FROM account a
JOIN transactionline tl ON tl.account = a.id
JOIN transaction t ON tl.transaction = t.id
WHERE a.accttype = 'Bank'
  AND t.trandate <= CURRENT_DATE
GROUP BY a.acctname, a.subsidiary
```

**AR aging by customer (with FX handling):**
```sql
SELECT
  c.entityid,
  c.companyname,
  t.tranid,
  t.trandate,
  t.duedate,
  t.foreigntotal,
  t.currency,
  (CURRENT_DATE - t.duedate) AS days_late
FROM transaction t
JOIN customer c ON t.entity = c.id
WHERE t.type = 'CustInvc'
  AND t.status NOT IN ('Paid In Full', 'Closed')
ORDER BY days_late DESC
```

**AP aging by vendor:**
```sql
SELECT
  v.entityid,
  v.companyname,
  t.tranid,
  t.trandate,
  t.duedate,
  t.foreigntotal,
  t.currency,
  (CURRENT_DATE - t.duedate) AS days_late
FROM transaction t
JOIN vendor v ON t.entity = v.id
WHERE t.type = 'VendBill'
  AND t.status NOT IN ('Paid In Full', 'Closed')
ORDER BY days_late DESC
```

**Stale AP cross-check:** any AP entry >90 days late gets footnoted as "may be stale — verify against bank-feed credits."

### Step 2: AWS pulls (parallel batch)

```bash
# Refresh SSO if needed (12hr token)
aws sso login --profile class
aws sso login --profile collab

# Current month MTD by service, both profiles
aws ce get-cost-and-usage \
  --time-period Start=$(date -d 'first day of this month' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --profile class

aws ce get-cost-and-usage \
  --time-period Start=$(date -d 'first day of this month' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --profile collab

# 90-day forecast, both profiles
aws ce get-cost-forecast \
  --time-period Start=$(date +%Y-%m-%d),End=$(date -d '+90 days' +%Y-%m-%d) \
  --granularity MONTHLY \
  --metric UNBLENDED_COST \
  --profile class

aws ce get-cost-forecast \
  --time-period Start=$(date +%Y-%m-%d),End=$(date -d '+90 days' +%Y-%m-%d) \
  --granularity MONTHLY \
  --metric UNBLENDED_COST \
  --profile collab
```

Sum class + collab for any "AWS spend" figure. Never report one alone.

### Step 3: Salesforce committed pipeline + renewal risk

```sql
-- Committed pipeline by close week (S4 + S5 + Commit/Best Case only)
SELECT
  CALENDAR_WEEK(CloseDate) week_num,
  CALENDAR_YEAR(CloseDate) year_num,
  StageName,
  ForecastCategoryName,
  SUM(Amount) total_amount,
  COUNT(Id) opp_count
FROM Opportunity
WHERE CloseDate <= NEXT_N_DAYS:90
  AND IsClosed = false
  AND (StageName IN ('S4', 'S5') OR ForecastCategoryName IN ('Commit', 'Best Case'))
GROUP BY CALENDAR_WEEK(CloseDate), CALENDAR_YEAR(CloseDate), StageName, ForecastCategoryName

-- Renewals at risk in next 90 days
SELECT Id, Name, Account.Name, Amount, CloseDate, StageName, Account.Current_ICP_Tier__c
FROM Opportunity
WHERE Type = 'Renewal'
  AND CloseDate <= NEXT_N_DAYS:90
ORDER BY Amount DESC
```

### Step 4: Reconcile to Cash Lever Model v5
Open `Class_Cash_Lever_Model_v5_2026-05-18.xlsx`. **Touch only sheet `07_Weekly_Engine`.**

Update:
- Weekly cash beginning balance from NS bank pull
- AR collections forecast from SF committed pipeline + AR aging waterfall
- AP outflows from AP aging + scheduled vendor payments
- AWS monthly outflow from forecast (class + collab summed)
- Restricted cash positions (BACA + Coso-TD) from memory + NS

### Step 5: Compute the trough
For each forecast week, compute ending cash. Identify the minimum (the trough). Compare against the prior week's reported trough.

**Report shape:**
```
Cash Forecast Refresh — {date}

This week's trough: ${X,XXX} on {week of YYYY-MM-DD} (W{NN})
Prior week's trough: ${Y,YYY} on {same or different week}
Delta: ${Z,ZZZ} ({worsening|improving} by ${diff})

Driver of the delta:
- NetSuite: AR aging worsened/improved by $X
- AWS: spend +/- $X vs forecast
- Salesforce: committed pipeline +/- $X
- AP: deferral capacity {used/available}

Tripwire status:
- W30 trough is now ${X} (board target: >$250K)
- Status: {GREEN/YELLOW/RED}

Source citations:
- NS SuiteQL, pulled {timestamp}
- AWS Cost Explorer, both profiles, pulled {timestamp}
- Salesforce SOQL, pulled {timestamp}
- Cash Lever Model v5, sheet 07_Weekly_Engine, updated {timestamp}
```

### Step 6: Write to position library + memory
If the trough moved >5% vs prior baseline:
- Write or update position POS-003 (W30 resolves via AR + AP + BACA) — adjust confidence if needed
- Update memory: `current_cash_state_{YYYY-MM-DD}.md` with the new snapshot
- Update `workstreams/WS-01-cash-defense.md` `last_updated` and `next_milestone`
- If trough moved into RED tripwire band (<$250K), write a feedback memory flagging immediate escalation

### Step 7: Optional outputs
Based on the topic of invocation:
- If `/quick`: just the report shape above
- If `/deep`: full board-slide refresh via `forecast-deck-creator` skill
- If scheduled (Monday 6am): post results to "Strategic Operating Dashboard" Cowork artifact

## Hard rules
- Every number cites its source connector and timestamp
- Stale AP entries (>90 days late, type-VendBill, status-open) are footnoted, not silently included
- FX handling: pull `foreigntotal` AND `currency`; convert at FX rate on `trandate`
- Never derive headcount cost from NS — use the GTM roster in memory
- Sheet `07_Weekly_Engine` only — never touch other sheets without explicit instruction
- If AWS SSO returns ExpiredToken, refresh via `aws sso login --profile X`, never retry blindly
- If a connector is unavailable, the refresh proceeds with the last known value + an explicit caveat

## Failure modes
- NS SuiteQL timeout → retry with smaller date range
- AWS Cost Explorer 24-48hr lag → state the date range explicitly
- SF "Owner.Name" includes terminated reps → cross-check against 41-person roster
- Cash Lever Model file locked (Excel open elsewhere) → wait + retry, do NOT create a parallel copy
```

### Inputs it expects
Date to forecast through (default 13 weeks), scenario flag (base/stress/recovery, default base). Live data from NetSuite, AWS (both profiles), Salesforce. The Cash Lever Model v5 workbook at `Class_Cash_Lever_Model_v5_2026-05-18.xlsx`.

### Outputs it produces
A structured cash forecast report with the W30 trough, prior-baseline delta, driver attribution, tripwire status, and source citations. Updates to sheet `07_Weekly_Engine` only. Position/memory/workstream writes if the trough moved >5%.

### Dependencies
- NetSuite MCP (`ns_runCustomSuiteQL`)
- AWS API MCP (`call_aws`) with class + collab profiles, summed
- Salesforce MCP (committed-stage SOQL)
- `class-aws-connector` skill (profile handling)
- Cash Lever Model v5 workbook (touch only sheet `07_Weekly_Engine`)
- Memory files listed in "Required reading"

### Known issues or supersession notes
- The skill embeds the SOQL "S4 + S5 + Commit/Best Case" definition for committed pipeline — this is the canonical Class committed-stage definition and must be preserved across implementations.
- The SF Owner.Name terminated-rep cross-check is mentioned here in passing but is a real bug — see renewal-forecast notes for the canonical fix.

---

## 4. covenant-tracker

**Status in Cowork:** Standalone skill file at `/var/folders/tg/.../skills/covenant-tracker/SKILL.md`. Auto-runs Monday 6am ET via scheduled task alongside weekly-cash-forecast.
**Last invoked:** Unknown from this session.
**Confidence the skill exists in this project:** PARTIAL — skill body exists but covenant terms are ASSUMED until CFO confirms verbatim from facility doc. The skill itself flags this explicitly.

### Full content (verbatim)

```markdown
---
name: covenant-tracker
description: Track Class's Barclays facility covenants against live NetSuite data and surface tripwire proximity. Wraps the $25M term + $5M revolver + $1.4M PIK facility terms with current leverage ratio, FCCR, and customer-concentration tests. Returns GREEN/YELLOW/RED per covenant with the actual current value vs. threshold and the days to next test date. Trigger phrases include "covenant check", "are we within covenants", "tripwire scan", "Barclays covenant status", "FCCR", "leverage ratio", or any variation asking about facility compliance. Auto-runs Monday 6am ET via scheduled task. Layers ON TOP of the NetSuite MCP and the weekly-cash-forecast skill.
---

# covenant-tracker

Codifies the Barclays facility covenant terms and runs a live compliance check against NetSuite data. This is the early-warning system for PM-001 (Barclays calls the loan).

## Status: PARTIAL — facility terms not yet machine-readable

The actual Barclays credit agreement covenant definitions, test dates, and thresholds need to be locked into this file before the skill is fully operational. Until then, the skill operates against **assumed values** (flagged as such) and produces a directional reading, not a definitive covenant compliance statement.

**To complete this skill:** Russell or CFO inputs the actual credit agreement covenant terms (verbatim from the facility doc) into the "Locked Facility Terms" section below. After that, the skill produces real compliance readings.

## Required reading before execution

1. Memory: `class_debt_structure.md` — $30M facility composition, ~$200-210K/mo cash interest
2. Memory: `class_restricted_cash.md` — BACA $2.5M restricted, Coso-TD $3.245M
3. Memory: `class_financial_state_may_2026.md` — ARR cliff context, monthly burn
4. Adversarial: `adversarial/financial-tripwires/barclays-leverage-covenant.md` — current band definitions
5. Pre-mortem: `pre-mortems/PM-001-barclays-calls-loan.md` — escalation playbook
6. Memory: `netsuite_class_gotchas.md` — SuiteQL patterns

## Locked Facility Terms (TO BE CONFIRMED FROM CREDIT AGREEMENT)

```
Facility composition:
- $25M Term Loan
- $5M Revolver (fully drawn per memory)
- $1.4M PIK accrual
Total exposure: ~$31.4M

Cash interest: ~$200-210K/month per memory

Covenants (ASSUMED — confirm with CFO from facility doc):
- Total Debt / TTM Adjusted EBITDA ≤ 4.5x  [ASSUMED]
- Fixed Charge Coverage Ratio ≥ 1.10x      [ASSUMED]
- Minimum Liquidity ≥ $1.5M                [ASSUMED — may be BACA-inclusive]
- Maximum Customer Concentration < 50%      [ASSUMED — relevant given 47.9% Intl HED]
- Reporting: monthly financials, quarterly compliance certificate

Test dates: quarterly (typical for term loans)

Restricted cash treatment:
- $2.5M BACA — Barclays-controlled, requires release approval
- $3.245M Coso-TD — likely Knox escrow, status TBD

Cross-default triggers, equity-cure provisions, material adverse change clauses: TO BE EXTRACTED FROM FACILITY DOC
```

**Once Russell confirms these terms, the skill produces actual compliance readings instead of directional ones.**

## Execution steps

### Step 1: Pull current financial state from NetSuite

```sql
-- TTM revenue
SELECT SUM(t.foreigntotal) AS ttm_revenue
FROM transaction t
WHERE t.type IN ('CustInvc', 'CashSale')
  AND t.trandate >= TO_DATE('YYYY-MM-DD', 'YYYY-MM-DD')  -- 365 days ago
  AND t.trandate <= CURRENT_DATE
  AND t.status NOT IN ('Voided')

-- TTM operating expense (for EBITDA derivation — adjust per credit agreement add-backs)
SELECT SUM(tl.foreignamount) AS ttm_opex
FROM transactionline tl
JOIN transaction t ON tl.transaction = t.id
JOIN account a ON tl.account = a.id
WHERE a.accttype IN ('OthExp', 'Expense', 'COGS')
  AND t.trandate >= TO_DATE('YYYY-MM-DD', 'YYYY-MM-DD')
  AND t.trandate <= CURRENT_DATE

-- Current cash position (unrestricted)
SELECT SUM(tl.foreignamount) AS current_cash
FROM account a
JOIN transactionline tl ON tl.account = a.id
WHERE a.accttype = 'Bank'
  AND a.acctname NOT LIKE '%BACA%'
  AND a.acctname NOT LIKE '%Restricted%'
```

### Step 2: Pull Salesforce customer concentration

```sql
SELECT
  Account.Name,
  SUM(Amount) AS arr_proxy
FROM Opportunity
WHERE StageName = 'Closed Won'
  AND CloseDate = LAST_N_DAYS:365
GROUP BY Account.Name
ORDER BY SUM(Amount) DESC
LIMIT 20
```

Compute top-1 concentration %, top-5 concentration %, top-10 concentration %.

### Step 3: Compute covenant ratios
**Adjusted EBITDA** = TTM revenue - TTM cash opex + permitted add-backs (stock-based comp, one-time costs per facility doc — get from CFO).
**Leverage ratio** = (Term + Revolver + PIK) / TTM Adjusted EBITDA
**FCCR** = (Adjusted EBITDA - capex) / (interest + scheduled principal + scheduled lease payments) — use prior quarter actuals.
**Liquidity** = unrestricted cash (excluding BACA + Coso-TD).
**Customer concentration** = top customer ARR / total ARR.

### Step 4: Report by tripwire band

For each covenant, compute current value, compute headroom vs threshold, classify band. Format:

```
Covenant Tripwire Status — {date}

[1] Leverage Ratio (Total Debt / Adj EBITDA)
    Threshold: ≤ 4.5x  [ASSUMED — confirm]
    Current:   {X.X}x
    Headroom:  {Y%} below threshold
    Band:      {GREEN <3.5x | YELLOW 3.5-4.0x | RED 4.0-4.4x | BREACH >4.5x}

[2] Fixed Charge Coverage Ratio
    Threshold: ≥ 1.10x  [ASSUMED — confirm]
    Current:   {X.XX}x
    Headroom:  {Y%} above threshold
    Band:      {GREEN >1.30x | YELLOW 1.20-1.30x | RED 1.10-1.20x | BREACH <1.10x}

[3] Minimum Liquidity
    Threshold: ≥ $1.5M  [ASSUMED — confirm; may be BACA-inclusive]
    Current:   ${X.XM}
    Headroom:  $Y above threshold
    Band:      {GREEN >$3M | YELLOW $2-3M | RED $1.5-2M | BREACH <$1.5M}

[4] Customer Concentration
    Threshold: < 50% top-1  [ASSUMED — confirm]
    Current:   {top-1 customer} at {X}%
    Notable:   Intl HED segment concentration at {Y}% (memory: 47.9% as of May 2026)
    Band:      {GREEN <35% | YELLOW 35-45% | RED 45-49% | BREACH >50%}

Days to next quarterly test: {N}
Last compliance certificate filed: {date}

Composite tripwire status: {worst of the four bands}

Source citations:
- NetSuite SuiteQL, pulled {timestamp}
- Salesforce SOQL, pulled {timestamp}
- Facility terms per memory `class_debt_structure.md` (some thresholds ASSUMED)
```

### Step 5: Action triggers

| Composite band | Action |
|---|---|
| GREEN | Log to scorecard; no action |
| YELLOW | Pre-emptive lender call within 5 business days (CFO + Russell) |
| RED | Workout-team brief drafted + waiver prep + counsel engaged |
| BREACH | Execute PM-001 response playbook within 4 hours |

If band is YELLOW or worse:
- Write or update position about covenant pressure
- Flag in `workstreams/WS-06-barclays-relationship.md` as `next_milestone`
- Add to next board pre-read draft

### Step 6: Write to adversarial library
Update `adversarial/financial-tripwires/barclays-leverage-covenant.md` with the current value and timestamp. Append to a running log.

## Hard rules
- Always footnote which thresholds are ASSUMED vs CONFIRMED
- Always cite source connectors and timestamps
- Never report a covenant value without naming the calculation methodology (TTM start/end dates, add-backs included)
- If facility terms haven't been locked, the report is "directional" not "compliance"
- Composite band = worst of all four (never average)
- Tripwire crossings trigger memory writes immediately, even outside Monday scan

## Day Zero (skill activation)
Russell or CFO inputs the verbatim covenant definitions from the Barclays credit agreement into the "Locked Facility Terms" section. After that, every Monday 6am run produces real compliance readings. Until then, runs are directional.
```

### Inputs it expects
Current NetSuite financial data (TTM revenue, TTM opex, current unrestricted cash). Salesforce closed-won opportunity data for concentration computation. The locked facility terms (currently ASSUMED — needs CFO confirmation).

### Outputs it produces
A four-covenant tripwire status report with composite band (GREEN/YELLOW/RED/BREACH) and action triggers. Updates to adversarial/financial-tripwires/ and workstream WS-06 on YELLOW or worse.

### Dependencies
NetSuite MCP, Salesforce MCP, `class_debt_structure.md` memory, PM-001 pre-mortem, weekly-cash-forecast skill (for current cash position).

### Known issues or supersession notes
**The covenant thresholds are ASSUMED until CFO Brian confirms verbatim from the Barclays credit agreement.** This is flagged inside the skill explicitly. Until confirmed, the skill produces directional readings, not compliance statements. The C-Suite should preserve this flagging behavior — never present an ASSUMED threshold as confirmed.

---

## 5. renewal-forecast

**Status in Cowork:** Standalone skill file at `/var/folders/tg/.../skills/renewal-forecast/SKILL.md`. Auto-runs Sunday 6pm ET via scheduled task.
**Last invoked:** Status unknown from this session.
**Confidence the skill exists in this project:** full — but contains a known bug, see Known issues.

### Full content (verbatim)

```markdown
---
name: renewal-forecast
description: Forecast Class's 90-day rolling renewal book with per-account risk scoring tuned to the Class NRR definition. Pulls Salesforce renewals + Chorus call signal + NetSuite billing history to produce a ranked risk list — gross retention probability per logo, expansion potential, and the lever recommended (executive sponsor, pricing flexibility, technical escalation, churn). Trigger phrases include "renewal forecast", "renewals at risk", "what's our 90-day renewal book", "NRR forecast", "which customers are about to churn", or any variation asking about retention pipeline. Auto-runs weekly Sundays via scheduled task. Layers ON TOP of Salesforce, Chorus, and NetSuite MCPs.
---

# renewal-forecast

The single source of truth for Class's 90-day rolling renewal forecast. Tuned to the Class NRR definition. Combines Salesforce CRM state, Chorus call signal, and NetSuite billing history to produce per-account risk scoring.

## Required reading before execution

1. Memory: `class_financial_state_may_2026.md` — ARR cliff context ($35.85M → $20.57M), 47.9% Intl HED concentration
2. Memory: `class_gtm_roster.md` — CSM coverage by account
3. Position: `POS-004` — Intl HED concentration is #1 survivability risk (NOTE: superseded by POS-012)
4. Pre-mortem: `PM-002` — top federal customer non-renews
5. Pre-mortem: `PM-004` — Intl HED segment collapses
6. Adversarial: `customer-defections/pattern-downsize-to-non-renewal.md` — the most dangerous churn pattern
7. Stakeholders: `customers-top-arr/` and `customers-at-risk/` — current account state

## Class NRR definition (codified)

```
Gross Retention = Renewed ARR / Starting ARR (excludes expansion)
Net Revenue Retention = (Renewed ARR + Expansion ARR - Downsell ARR) / Starting ARR

Renewal stages (Salesforce):
  - Renewal opportunity created at T-180 days
  - S4 = Renewed (committed)
  - S5 = Closed Won (paperwork done)
  - Closed Lost = Non-renewed
  - Downsell = Renewed at lower ARR (counts in NRR, hurts NRR)

ARR rollup:
  - Account.Current_ICP_Tier__c for segment cuts
  - Account.Account_Vertical_Segment__c for vertical cuts
  - Custom ARR fields (NOT Amount — Amount is gross)
```

## Execution steps

### Step 1: Pull the 90-day renewal book from Salesforce

```sql
SELECT
  Opportunity.Id,
  Opportunity.Name,
  Account.Id,
  Account.Name,
  Account.Current_ICP_Tier__c,
  Account.Account_Vertical_Segment__c,
  Opportunity.Amount,
  Opportunity.CloseDate,
  Opportunity.StageName,
  Opportunity.ForecastCategoryName,
  Opportunity.Owner.Name,
  Account.Owner.Name  -- CSM (BUGGED — see Known Issues, replace with Account_Manager__r filter)
FROM Opportunity
WHERE Type = 'Renewal'
  AND CloseDate <= NEXT_N_DAYS:90
  AND IsClosed = false
ORDER BY Amount DESC
```

### Step 2: Pull recent activity for each account

For each account in the renewal book, run in parallel:

```sql
-- Last 60 days of SF activity
SELECT WhatId, Subject, ActivityDate, ActivityType
FROM Task
WHERE AccountId = '{account_id}'
  AND ActivityDate >= LAST_N_DAYS:60
ORDER BY ActivityDate DESC

-- Open opportunities and downsells
SELECT Id, Name, StageName, Amount, CloseDate, Type
FROM Opportunity
WHERE AccountId = '{account_id}'
  AND IsClosed = false
```

### Step 3: Pull Chorus call signal for each account

For each account's primary contact (from Salesforce):

```
mcp__chorus__search_calls_by_participant(participant: contact_email, limit: 10)
mcp__chorus__get_engagement_summary(engagement_id)  -- for top 3 most recent
```

Extract per account:
- Number of calls in last 30/60/90 days
- Trend: increasing / stable / declining frequency
- Champion presence: is the original sponsor still on calls?
- New stakeholder appearance: any procurement/finance contact added late-cycle?
- Action items committed and not delivered
- Competitive mentions in `meeting_summary`
- Sentiment cues (decline, frustration, escalation language)

### Step 4: Pull NetSuite billing history for each account

```sql
SELECT
  c.entityid,
  c.companyname,
  EXTRACT(YEAR FROM t.trandate) yr,
  EXTRACT(MONTH FROM t.trandate) mo,
  SUM(t.foreigntotal) billed
FROM transaction t
JOIN customer c ON t.entity = c.id
WHERE c.companyname = '{account_name}'
  AND t.type IN ('CustInvc', 'CashSale')
  AND t.trandate >= TO_DATE('YYYY-MM-DD', 'YYYY-MM-DD')  -- 24 months ago
GROUP BY c.entityid, c.companyname, EXTRACT(YEAR FROM t.trandate), EXTRACT(MONTH FROM t.trandate)
ORDER BY yr, mo
```

Look for: billed trajectory (growing, flat, declining), payment timeliness, any seat-count or license-tier reduction events.

### Step 5: Score per-account renewal risk

For each account, compute a composite score (0-100 = healthy → at-risk):

| Signal | Weight | Bad value |
|---|---|---|
| SF stage progression | 20% | Behind schedule for renewal motion (S2 by T-90, S4 by T-30) |
| Activity frequency | 15% | <2 touches in last 60 days |
| Chorus call frequency trend | 15% | Declining 30%+ vs prior 60-day period |
| Champion presence in calls | 15% | Original sponsor missing from last 2 calls |
| New late-cycle stakeholders | 10% | Procurement/finance contact appears post-T-60 |
| Action item delivery | 10% | >1 committed action item unfulfilled |
| Competitive mentions | 5% | Any competitor named in last 90 days of calls |
| Billing trend (NS) | 10% | Declining ARR over last 12 months |

**Risk bands:**
- 0-25: HEALTHY → low touch, standard renewal motion
- 26-50: WATCH → CSM increases cadence, no escalation
- 51-75: AT-RISK → executive sponsor outreach within 14 days
- 76-100: CRITICAL → immediate Russell-level intervention

### Step 6: Compute aggregate NRR forecast

```
Renewed ARR projection:
  Sum(Amount) where StageName IN ('S4', 'S5') AND ForecastCategoryName IN ('Commit')
  + Sum(Amount × renewal_probability) for at-risk where renewal_probability is derived from risk score
  
Expansion ARR projection:
  Sum(Amount) for upsell/cross-sell opportunities IN ('S4', 'S5') AND ForecastCategoryName IN ('Commit')

Downsell ARR projection:
  Sum(downsell_amount) for opps marked as downsell (lower-than-original ARR renewals)

NRR forecast = (Renewed + Expansion - Downsell) / Starting ARR

Gross retention forecast = Renewed / Starting ARR
```

### Step 7: Segment cuts
Roll up the same numbers by:
- `Account.Account_Vertical_Segment__c` — critical for the 47.9% Intl HED watch
- `Account.Current_ICP_Tier__c` — tier breakdown
- CSM/Owner — performance per CS lead

### Step 8: Report shape

```
90-Day Renewal Forecast — {date}

Aggregate:
  Starting ARR (in window): ${X}
  Projected Renewed ARR:    ${Y} ({Y/X * 100}% gross retention)
  Projected Expansion:      ${Z}
  Projected Downsell:       ${W}
  NRR forecast:             {%}
  
Class NRR target (board): {%} — {GREEN | YELLOW | RED} vs forecast

Segment cuts:
  Intl HED (47.9% concentration): {%} retention forecast — KEY METRIC
  Domestic HED:                   {%}
  Corporate:                      {%}
  Federal/Gov:                    {%}

Top 10 at-risk accounts (ranked by risk × ARR):
| Account | ARR | CloseDate | Risk | Band | Recommended Lever |
| [...]   | [..]| [...]     | 78   | CRITICAL | Russell-level intervention this week |
| [...]   | [..]| [...]     | 62   | AT-RISK  | Exec sponsor email + technical escalation |
...

Comparison to last week:
  NRR forecast delta: ±{%}
  New accounts entered AT-RISK band: {N}
  Accounts exited AT-RISK band: {N}

Source citations:
- Salesforce SOQL pulled {timestamp}
- Chorus engagements pulled {timestamp}  
- NetSuite billing history pulled {timestamp}
```

### Step 9: Update artifacts
- Update `stakeholders/customers-at-risk/` — any account in AT-RISK or CRITICAL gets a stakeholder model file (created or updated)
- Update `workstreams/WS-02-arr-retention.md` `last_updated` + `next_milestone`
- Update `adversarial/customer-defections/` — if any account matches the downsize-to-non-renewal pattern, flag it
- If aggregate NRR forecast crosses a board threshold, write a position update for POS-004 (NOTE: superseded by POS-012)
- Spawn predictions in `calibration/predictions/` for any AT-RISK or CRITICAL account: "Account X renews with no downsell by {CloseDate}"

### Step 10: Action items per band
For each AT-RISK and CRITICAL account, generate:
- Recommended next conversation (who calls whom, with what framing)
- Pricing flexibility envelope (if applicable)
- Executive sponsor pairing (Russell, Chasen, board observer)
- Save play estimate (cost vs. likely-retained ARR)

## Hard rules
- Define "committed" stages explicitly every time: S4 + S5 + Commit/Best Case
- Exclude S1/S2 from forecast (pipeline only)
- Cross-check Owner.Name against active 41-person roster (Sharae and Tomas are gone)
- Cite every number with its connector and timestamp
- Risk scoring weights are documented above; if Russell or CFO wants to tune them, edit this skill file
- Chorus signal is AI-summarized — treat "no negative signal" as weak evidence of health, not strong
- Stale AP / billing entries: skip transactions older than 24 months from billing trend analysis

## Day Zero (skill activation)
First run — Russell confirms the Class NRR formula definition, target NRR threshold (board target), and risk-band thresholds. After that, weekly Sunday runs produce the rolling forecast.
```

### Inputs it expects
Salesforce renewal opportunities (Type='Renewal', 90-day window). Chorus call signals per account. NetSuite billing history per account. Risk-scoring weights (documented in the skill).

### Outputs it produces
Per-account risk score (0-100) with band (HEALTHY/WATCH/AT-RISK/CRITICAL), aggregate NRR forecast, segment cuts (Intl HED, Domestic HED, Corporate, Federal/Gov), top-10 at-risk list with recommended levers. Stakeholder file updates for AT-RISK and CRITICAL accounts. Prediction spawns in calibration/predictions/.

### Dependencies
Salesforce MCP, Chorus MCP, NetSuite MCP. POS-004 (superseded by POS-012), PM-002, PM-004, customer-defections adversarial entries. Stakeholder library.

### Known issues or supersession notes — **CRITICAL — FIX ON IMPORT TO C-SUITE**

**Salesforce Owner.Name bug:** Step 1 of the skill queries `Opportunity.Owner.Name` and `Account.Owner.Name` and includes the comment "-- CSM". The "Hard rules" section says to "cross-check Owner.Name against active 41-person roster (Sharae and Tomas are gone)." This is the wrong approach.

The corrected pattern, per `SESSION_START_PROTOCOL.md` Step 6 rule #11 and the `feedback_sf_owner_name_terminated_reps` memory:

- `Opportunity.Owner.Name` is sticky on historical closed records and surfaces terminated reps.
- Canonical sources for live assignments:
  - `Account.Account_Manager__c` (or `Account.Current_Account_Manager__c`) = live AM
  - `Account.Owner` = live AE
  - `Opportunity.Owner` is sticky; meaning depends on `Opportunity.Type` (AE for New Business, AM for Renewal)
- Every SOQL query that surfaces rep names MUST:
  - (a) include `User.IsActive = TRUE` clause for any user-table joins
  - (b) cross-check Owner.Name aggregates against `class_gtm_roster.md` CANONICAL TERMINATED REPS section
- Known terminated reps as of 2026-05-22 (do not surface as active): Sharae Long, Tomas Novotny, Petya Lolova, Fiona Ong. Add to the canonical list whenever a termination is confirmed.

**When porting this skill to the C-Suite:** replace the `Account.Owner.Name` reference in Step 1 with `Account.Current_Account_Manager__c` (or `Account.Account_Manager__c` if that's the actual field name in Class's org — Claude Code verifies during the Salesforce MCP wiring in Phase 0 Track E). Add `User.IsActive = TRUE` to any JOIN on User. Add the terminated-rep cross-check as an automated step rather than a manual "Hard rule."

**Other notes:**
- POS-004 is superseded by POS-012 per `positions/README.md`. References to POS-004 in this skill should redirect to POS-012 for retention-related write-backs.
- The Class NRR definition (Renewed + Expansion - Downsell / Starting ARR) is canonical; preserve verbatim.

---

## 6. call-intelligence

**Status in Cowork:** Standalone skill file at `/var/folders/tg/.../skills/call-intelligence/SKILL.md`. Auto-runs Sunday 6pm ET alongside renewal-forecast for the weekly sweep.
**Last invoked:** Memory entry confirms the Chorus connector was activated 2026-05-21 and this skill was authored shortly after.
**Confidence the skill exists in this project:** full.

### Full content (verbatim)

```markdown
---
name: call-intelligence
description: Extract renewal risk, competitive intel, stakeholder dynamics, and action-item slippage from Chorus call data. Wraps the Chorus connector (just activated 2026-05-21) — list_engagements, get_engagement, get_engagement_summary, search_calls_by_participant. Produces structured signals that feed renewal-forecast, stakeholder models, adversarial library, and the daily intelligence stream. Trigger phrases include "what did we discuss on the call with X", "Chorus signal", "what are calls telling us about renewals", "any competitive mentions", "call intelligence", or any variation of asking Chorus to surface intel. Auto-runs Sundays as part of the weekly intelligence sweep. Layers ON TOP of the Chorus MCP and the Salesforce MCP.
---

# call-intelligence

This skill turns Chorus's call corpus into structured signals the operating model can act on. Note that the Chorus public v3 API exposes AI-generated `meeting_summary` and `action_items` but NOT raw utterance-level transcripts. The skill works within that constraint.

## Required reading before execution

1. Memory: `strategic_ai_operating_model_v2.md` — overall context
2. Connector playbook entry: `Strategic_AI_Connector_Playbook.md` §18 (Chorus)
3. Position: `POS-004` — Intl HED concentration is #1 survivability risk (NOTE: superseded by POS-012)
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
```

### Inputs it expects
For Mode 1: Account name + Salesforce contact emails. For Mode 2: at-risk customer list from stakeholders/customers-at-risk/. For Mode 3: target person + their stakeholder file. For Mode 4: known competitor list. For Mode 5: internal-dependencies stakeholder files.

### Outputs it produces
Mode-specific signal blocks with composite call-signal scores. Updates to stakeholders/, adversarial/, _spine/intelligence/. Predictions in calibration/predictions/ for CRITICAL scores.

### Dependencies
Chorus MCP (six tools listed above). Salesforce MCP (for account/contact resolution). Stakeholder library. Adversarial library. POS-004 (superseded by POS-012). Cross-Claude Spine for digest output.

### Known issues or supersession notes
- POS-004 references should redirect to POS-012 (superseded).
- The skill assumes the Cross-Claude Spine `_spine/` directory exists. Per the C-Suite PRD, V1 is Class-only and does NOT integrate with the spine. When porting, replace `_spine/intelligence/` and `_spine/digests/` writes with C-Suite-internal equivalents (e.g., `intelligence/` or fold into the morning brief artifact).
- The competitor list should be updated to include any new threats; engageli.md already exists in adversarial/competitor-watch/.

---

## 7. system-check

**Status in Cowork:** Standalone skill file at `/var/folders/tg/.../skills/system-check/SKILL.md`. Manual invocation; not auto-scheduled.
**Last invoked:** Unknown.
**Confidence the skill exists in this project:** full.

### Full content (verbatim)

```markdown
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
```

### Inputs it expects
None — pure diagnostic. Runs against current state of vault, memory, connectors, scheduled tasks.

### Outputs it produces
A consolidated GREEN/YELLOW/RED report covering 10 checks plus composite status and remediation list.

### Dependencies
All MCPs (NetSuite, Salesforce, AWS class+collab, Google Workspace, Slack, Chorus). Scheduled tasks system. Filesystem access to the vault.

### Known issues or supersession notes
- Check 7 lists scheduled tasks that don't all exist yet — the skill assumes they'll be created during Day One bootstrap. The C-Suite version of this check would verify against the C-Suite's own scheduler.
- The "spine" check (Check 8) references the Cross-Claude Spine which is Class-only V1 scope — C-Suite V1 doesn't integrate with the spine, so this check can be deferred or removed for the C-Suite port.
- The C-Suite's analog would be a startup health check that runs each time Russell summons the app — verifying all 5 MCPs auth'd, all 5 scheduled jobs registered, vault accessible, frontmatter schema valid across artifacts. Adapt accordingly.

---

## 8. class-aws-connector

**Status in Cowork:** Standalone skill file at `/var/folders/tg/.../skills/class-aws-connector/SKILL.md` with reference files in `references/`. Documents the AWS CLI setup for the two Class AWS organizations.
**Last invoked:** Routinely — every weekly-cash-forecast run depends on this skill's profile handling.
**Confidence the skill exists in this project:** full — SKILL.md is the primary content; reference files exist but were not inlined here.

### Full content (verbatim)

```markdown
---
name: class-aws-connector
description: "Operating guide for Russell's AWS CLI setup at Class Technologies. Class runs TWO separate AWS orgs (Class product ~50 accounts, Collaborate ~15) accessed via two SSO portals with different billing roles. Use whenever Russell wants to query AWS cost/usage data, compare Class vs Collab spend, run any aws CLI command, troubleshoot expired SSO, or reconfigure profiles. Triggers include AWS cost, AWS spend, AWS forecast, how much did we spend on AWS, Cost Explorer, Collab vs Class hosting, reconfigure AWS, AWS profile broken, AWS CLI expired, fix my AWS auth, ICS migration savings, validate AWS forecast — or any Class AWS billing, hosting, or cost-forecast question even when AWS isn't explicitly named. Also trigger when editing AWS_Analysis or Cost_Levers sheets in the cash model."
---

# Class Technologies AWS Connector

## What this skill is for

Russell has two AWS CLI profiles configured locally to query cost and usage data across Class Technologies' two AWS organizations. This skill captures the setup, the right commands to use, and how to recover when SSO sessions expire (which they do every ~12 hours). All cost analysis work feeds into the Class cash model — particularly the `05_AWS_Analysis` and `03_Cost_Levers` sheets in `Class_Cash_Lever_Model_v5_2026-05-18.xlsx`.

## The two-org reality

Class Technologies runs two separate AWS organizations because the Class product and the Collaborate (CoSo / Knox legacy) product were acquired and never merged at the AWS billing level. Treat them as two completely separate companies' AWS bills that we sum together for total hosting cost.

| | Class product | Collaborate product |
|---|---|---|
| SSO Portal URL | `https://d-906761edcb.awsapps.com/start` | `https://d-9067b2215a.awsapps.com/start` |
| Local profile name | `class` | `collab` |
| Billing payer account | ClassEDU-master | bb-master-payer-collab |
| Account ID | `783411846536` | `421879804649` |
| Role name | `BillingAccess` | `Billing` |
| Account count | ~50 (master, prod, global-*, pod-*, etc.) | ~15 (bb-collab-*, bb-foundations-*, collab-cost-engine-*) |
| Recent daily spend | ~$4,000-$5,000/day | ~$4,000-$5,000/day |

The role names are different across the two orgs (`BillingAccess` vs `Billing`) — this is a real difference, not a typo. Don't paste one config into the other.

The billing payer account is the one with consolidated Cost Explorer visibility across ALL accounts in its org. Always query against the payer account unless you have a specific reason to look at a single linked account.

## Operating commands

The AWS CLI is at `/opt/homebrew/bin/aws` (Homebrew install on Apple Silicon Mac). When running via osascript or any non-login shell, use the full path because `aws` won't be on PATH.

### Day-to-day querying

```bash
# Confirm both profiles still authenticated
aws sts get-caller-identity --profile class
aws sts get-caller-identity --profile collab

# If either returns "ForbiddenException" or "Error loading SSO Token", re-auth:
aws sso login --sso-session class
aws sso login --sso-session collab
```

SSO tokens last about 12 hours. After that you'll need to re-auth — the browser will open and you click Allow. Russell is already logged into Okta in his browser so the click-through is single-step.

### Combining Class + Collab data

The two orgs cannot be queried in a single API call. Always query each separately and sum/compare programmatically. Common pattern:

```bash
# Last 30 days, monthly, by service
aws ce get-cost-and-usage \
  --time-period Start=2026-04-21,End=2026-05-21 \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --profile class > /tmp/class_costs.json

aws ce get-cost-and-usage \
  --time-period Start=2026-04-21,End=2026-05-21 \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --profile collab > /tmp/collab_costs.json
```

Then merge in Python or jq. See `references/common_queries.md` for working query patterns.

## When something breaks

The most common failures, in order of frequency:
1. **SSO token expired** (every ~12 hours) → run `aws sso login --sso-session <profile>` and re-auth in browser. No config changes needed.
2. **ForbiddenException on the role** → the role name in `~/.aws/config` doesn't match what's actually available. Use the `list_collab_roles.py` pattern in `references/recovery.md` to discover available roles, then update the config.
3. **Config file corrupted or missing** → full reconfig procedure in `references/recovery.md`.
4. **AWS CLI itself missing** → `brew install awscli` then redo SSO setup.

## What we use this connector to answer

The standing analytical questions:
- **What did we actually spend on AWS last month, combined?** (Class + Collab summed)
- **Are the ICS migration savings showing up in real costs?** (Compare Apr 2026 vs Nov 2025 production hosting)
- **What's AWS forecasting for the next 3 months?** (Cost Explorer's built-in forecast endpoint)
- **Where do we have unused Reserved Instance capacity?** (RI utilization queries)
- **Which service category is the biggest opportunity for further cuts?** (Group by SERVICE)
- **What's the realistic adjustment to put in the Cost Levers sheet of the cash model?** (Comparing NS GL hosting actuals + AWS actuals + Finance forecast)

Every cost question Russell asks should anchor against one of these patterns. See `references/common_queries.md` for the actual CLI invocations.

## What this connector does NOT do
- Cannot write, create, modify, or delete any AWS resources — the roles are read-only billing access
- Cannot pull billing invoice PDFs (those go to billing contacts via email)
- Cannot see secrets, IAM users, or anything outside cost/usage data
- Cannot query both orgs in a single command — always two separate calls
- The AWS MCP server (if configured to use one of these profiles) inherits the same read-only scope

## Pointers to the rest of this skill
- **`references/recovery.md`** — Full reconfiguration from scratch if profiles are lost. The exact prompts `aws configure sso` asks and the exact answers for each portal. Also includes how to discover role names if AWS changes them.
- **`references/common_queries.md`** — The working CLI commands for the standing questions. Copy-paste ready.
- **`references/cash_model_context.md`** — How this AWS data feeds the Class Cash Lever Model — which cells to update, which sheet, what the variance analysis on sheet 06 expects.
```

### Inlined reference: common_queries.md (copy-paste-ready CLI invocations)

```markdown
# Common AWS Cost Queries

Copy-paste ready CLI invocations for the questions Russell asks most often. All examples use `--profile class` — swap to `--profile collab` for the other org, and run both when combining.

## 1. What did we actually spend last month?

```bash
# Last 30 days, total cost
aws ce get-cost-and-usage \
  --time-period Start=$(date -v-30d +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --profile class
```

Returns a `Total.UnblendedCost.Amount` per month. Do the same with `--profile collab` and sum the two for the company total.

## 2. Spend by service (the big "where does the money go" question)

```bash
# Monthly cost by service for last 90 days
aws ce get-cost-and-usage \
  --time-period Start=$(date -v-90d +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --profile class
```

Top services to expect for Class: Amazon EC2, Amazon S3, Amazon CloudFront, AWS Data Transfer, Amazon RDS. For Collab, similar plus Amazon Chime SDK (Collaborate video infrastructure).

## 3. Spend by linked account (which env is expensive?)

```bash
# Monthly cost grouped by linked account
aws ce get-cost-and-usage \
  --time-period Start=$(date -v-90d +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=LINKED_ACCOUNT \
  --profile class
```

This separates production from dev/staging, EU prod from US prod, etc. For Class, expect ClassEDU-Production, global-production, and the pod-*-prod accounts to dominate.

## 4. AWS's own forecast for the next 3 months

```bash
# Forecasted spend 3 months out (UPPER + LOWER bound = 80% confidence interval)
aws ce get-cost-forecast \
  --time-period Start=$(date +%Y-%m-%d),End=$(date -v+90d +%Y-%m-%d) \
  --metric UNBLENDED_COST \
  --granularity MONTHLY \
  --profile class
```

Useful for validating the Finance team's AWS forecast in `Class Cash Forecast as of May 10 2026.xlsx`. If AWS forecasts Class at ~$130K/month and Finance has $317K/month, that's a $187K/month buffer the Finance forecast is carrying.

## 5. Daily cost trend (catch sudden spikes)

```bash
# Daily for the last 14 days
aws ce get-cost-and-usage \
  --time-period Start=$(date -v-14d +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity DAILY \
  --metrics UnblendedCost \
  --profile class
```

Useful for catching runaway cost (a developer leaves a GPU instance running, a deploy fails into a retry loop, etc.).

## 6. Reserved Instance utilization (am I paying for unused RIs?)

```bash
aws ce get-reservation-utilization \
  --time-period Start=$(date -v-90d +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --profile class
```

`UtilizationPercentage` below 90% means we're paying for capacity we're not using. That's immediate savings: either use the RIs (right-size workloads to match) or let them expire and don't renew.

## 7. Service-level cost forecast (the actionable one)

```bash
# Forecast EC2 specifically
aws ce get-cost-forecast \
  --time-period Start=$(date +%Y-%m-%d),End=$(date -v+90d +%Y-%m-%d) \
  --metric UNBLENDED_COST \
  --granularity MONTHLY \
  --filter '{"Dimensions":{"Key":"SERVICE","Values":["Amazon Elastic Compute Cloud - Compute"]}}' \
  --profile class
```

## 8. S3 storage opportunity (cold storage tiering)

```bash
aws ce get-cost-and-usage \
  --time-period Start=$(date -v-180d +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=USAGE_TYPE \
  --filter '{"Dimensions":{"Key":"SERVICE","Values":["Amazon Simple Storage Service"]}}' \
  --profile class
```

The `USAGE_TYPE` grouping breaks down by storage class (StandardStorage, IATier, GlacierStorage, etc.). High StandardStorage with no GlacierStorage suggests we're not tiering cold data — typically $5-15K/month opportunity.

## 9. ICS migration validation (the specific cash-model question)

The ICS migration was supposed to save ~$85K/month. Was it real? Compare hosting cost Nov 2025 vs Apr 2026 (both orgs).

## Combining Class + Collab — Python pattern

When summing or comparing across orgs, use Python:

```python
import subprocess, json

def get_cost(profile, start, end):
    r = subprocess.run([
        '/opt/homebrew/bin/aws', 'ce', 'get-cost-and-usage',
        '--time-period', f'Start={start},End={end}',
        '--granularity', 'MONTHLY',
        '--metrics', 'UnblendedCost',
        '--profile', profile
    ], capture_output=True, text=True)
    return json.loads(r.stdout)

class_data = get_cost('class', '2026-04-01', '2026-05-01')
collab_data = get_cost('collab', '2026-04-01', '2026-05-01')

class_total = float(class_data['ResultsByTime'][0]['Total']['UnblendedCost']['Amount'])
collab_total = float(collab_data['ResultsByTime'][0]['Total']['UnblendedCost']['Amount'])
print(f"Combined: ${class_total + collab_total:>10,.2f}")
```

## Tips for keeping queries from timing out

- Cost Explorer API rate limits: ~3 requests per second per account.
- For DAILY granularity, max date range is ~14 days. For MONTHLY, up to 12 months.
- Always use `--filter` rather than fetching all data and filtering client-side.

## Glossary

- **UnblendedCost** — what AWS actually billed (what we care about for cash). Default for finance work.
- **BlendedCost** — averaged across linked accounts (used for chargeback). Not what we want.
- **AmortizedCost** — RI/Savings Plan upfront costs spread over their term.
- **NetUnblendedCost** — after discounts.

For monthly cash-model work, **UnblendedCost** is the right metric.
```

### Inlined reference: recovery.md (full reconfiguration + role discovery)

```markdown
# AWS Connector Recovery & Reconfiguration

When the AWS CLI profiles are broken or missing, follow this guide to recover.

## Quick diagnostic

```bash
/opt/homebrew/bin/aws --version
ls -la ~/.aws/config ~/.aws/sso/cache/ 2>&1
/opt/homebrew/bin/aws sts get-caller-identity --profile class 2>&1
/opt/homebrew/bin/aws sts get-caller-identity --profile collab 2>&1
```

| Symptom | Scenario | Fix |
|---|---|---|
| `aws: command not found` | CLI uninstalled | Install: `brew install awscli` |
| `~/.aws/config` missing or empty | Config wiped | Full reconfig (Scenario A below) |
| `Error loading SSO Token` | Token expired (~12hr) | Re-auth: `aws sso login --sso-session class && aws sso login --sso-session collab` |
| `ForbiddenException` on `GetRoleCredentials` | Role name wrong | Discover roles (Scenario B below), fix `~/.aws/config` |
| Returns `UserId` + `Account` JSON | Working | No fix needed |

## Scenario A — Full reconfiguration from scratch

If `~/.aws/config` is missing or corrupted, paste this entire block into your terminal:

```bash
mkdir -p ~/.aws
cat > ~/.aws/config << 'EOF'
[profile class]
sso_session = class
sso_account_id = 783411846536
sso_role_name = BillingAccess
region = us-east-1
output = json

[sso-session class]
sso_start_url = https://d-906761edcb.awsapps.com/start
sso_region = us-east-1
sso_registration_scopes = sso:account:access

[profile collab]
sso_session = collab
sso_account_id = 421879804649
sso_role_name = Billing
region = us-east-1
output = json

[sso-session collab]
sso_start_url = https://d-9067b2215a.awsapps.com/start
sso_region = us-east-1
sso_registration_scopes = sso:account:access
EOF

/opt/homebrew/bin/aws sso login --sso-session class
/opt/homebrew/bin/aws sso login --sso-session collab

/opt/homebrew/bin/aws sts get-caller-identity --profile class
/opt/homebrew/bin/aws sts get-caller-identity --profile collab
```

The browser will pop two tabs (one per session) asking for auth. Russell is logged into Okta so it's single-click "Allow" each time.

## Scenario B — Role name discovery

If AWS changes the role names or you're setting up for someone else, you need to discover what roles are actually available:

```python
#!/usr/bin/env python3
"""List available SSO roles. Run after `aws sso login --sso-session <name>` so the token is in cache."""
import json, glob, subprocess, sys

target_org = sys.argv[1] if len(sys.argv) > 1 else 'class'

SSO_PREFIXES = {
    'class':  ('https://d-906761edcb', '783411846536'),
    'collab': ('https://d-9067b2215a', '421879804649'),
}
url_prefix, account_id = SSO_PREFIXES[target_org]

token = None
for f in glob.glob('/Users/russellteter/.aws/sso/cache/*.json'):
    try:
        with open(f) as fh: data = json.load(fh)
        if data.get('startUrl', '').startswith(url_prefix):
            token = data['accessToken']
            break
    except Exception:
        continue

if not token:
    print(f"No cached SSO token for {target_org}. Run 'aws sso login --sso-session {target_org}' first.")
    sys.exit(1)

result = subprocess.run([
    '/opt/homebrew/bin/aws', 'sso', 'list-account-roles',
    '--account-id', account_id,
    '--access-token', token,
    '--region', 'us-east-1'
], capture_output=True, text=True)
print(result.stdout if result.returncode == 0 else result.stderr)
```

As of May 2026:
- Class: `BillingAccess` (used), plus probably others (ReadOnly etc.) Russell doesn't typically have
- Collab: `Billing` (used), `ReadOnly` (also available, narrower scope)

## How to know which AWS CLI binary to use

The Homebrew-installed CLI is at `/opt/homebrew/bin/aws` on Apple Silicon. Use the full path when running from:
- `osascript do shell script "..."` (zsh login shell doesn't load PATH)
- Cron jobs or LaunchAgents
- Anywhere the env isn't a proper interactive shell

When running interactively in Terminal, plain `aws` works because `brew shellenv` is in `.zshrc`.

## Files this config touches

- `~/.aws/config` — profile and session definitions (text, human-editable)
- `~/.aws/sso/cache/*.json` — cached SSO tokens (auto-managed; delete to force re-auth)
- `~/.aws/cli/cache/*.json` — cached temporary credentials (auto-managed)

If you want to fully nuke everything and start over: `rm -rf ~/.aws/` and run Scenario A.
```

### Inlined reference: cash_model_context.md (AWS data → cash model)

```markdown
# How the AWS Connector Feeds the Cash Model

The AWS cost data this connector pulls flows directly into the Class Cash Lever Model. This is the playbook for translating an AWS Cost Explorer query into a cell update.

## Files in scope

- **`Class_Cash_Lever_Model_v5_2026-05-18.xlsx`** in `/Users/russellteter/Documents/Claude/Projects/Business Planning/` — the working cash model
- **`Class Cash Forecast as of May 10 2026.xlsx`** — Finance team's underlying forecast (source of truth baseline)

Russell formatted the v5 file carefully — do not change formatting on any sheet other than `07_Weekly_Engine`.

## Which cells AWS data updates

### Sheet `05_AWS_Analysis`

Three sections:
1. **Component Breakdown** (rows 5-18) — estimated breakdown of pre-ICS vs post-ICS hosting by region.
2. **Finance Forecast vs NS Actual Hosting** (rows ~21-30) — already populated with Finance forecast figures and NS GL actuals through Apr 2026.
3. **AWS Scenario Levers** (rows ~33-43) — estimated incremental savings.

### Sheet `03_Cost_Levers` row 5 (AWS Fees)

This is the single most important cell. Russell adjusts column E here (`Annual Adjustment ($)`) based on his belief about how AWS will track vs Finance forecast.

- Positive adjustment = additional cash benefit (real AWS will come in below Finance forecast)
- Negative adjustment = additional cash drag (real AWS will come in above Finance forecast)

The adjustment spreads evenly across the 34 forecast weeks (W20-W53).

### Sheet `06_NS_Variance` row "Hosting"

Currently shows -$129K/month downside risk (NS actuals running higher than Finance forecast — meaning ICS savings not yet fully reflected in NS).

## Translation playbook: AWS data → cash model adjustment

### Step 1 — Pull the right comparison

```bash
# What AWS is actually forecasting
aws ce get-cost-forecast \
  --time-period Start=$(date +%Y-%m-%d),End=$(date -v+90d +%Y-%m-%d) \
  --metric UNBLENDED_COST \
  --granularity MONTHLY \
  --profile class
aws ce get-cost-forecast \
  --time-period Start=$(date +%Y-%m-%d),End=$(date -v+90d +%Y-%m-%d) \
  --metric UNBLENDED_COST \
  --granularity MONTHLY \
  --profile collab
```

Class avg: ~$280K/mo, Collab avg: ~$80K/mo (combined ~$360K/mo per Finance forecast).

### Step 2 — Compute the variance

```
Variance = (Finance monthly forecast × 3 months) − (AWS forecast next 3 months combined)
```

If positive: Finance is forecasting MORE than AWS expects → there's a buffer Russell can claim in the cash model.

### Step 3 — Convert to annual adjustment for the cash model

Take the 3-month variance and annualize it (multiply by 4) if you believe the buffer extends. Or only enter the 3-month variance if you're being conservative. Put it in:

- **File**: `Class_Cash_Lever_Model_v5_2026-05-18.xlsx`
- **Sheet**: `03_Cost_Levers`
- **Cell**: `E5` (AWS Fees annual adjustment)

Russell's working number as of May 21, 2026 baseline: $0 adjustment (no claimed buffer).

## Standing comparison: NS GL hosting vs AWS Cost Explorer

The cash model's `06_NS_Variance` sheet compares NetSuite GL hosting (accounts 5002 + 5008) to Finance forecast AWS. Add a third column: actual AWS Cost Explorer numbers.

Expected reconciliation:
- **NS GL Acct 5002 + 5008** = bills posted in the accounting period (cash basis, lags AWS by ~1 month due to invoicing)
- **AWS Cost Explorer UnblendedCost** = actual usage in the period (accrual basis, real-time)
- **Finance forecast AWS** = what Finance projects we'll pay (cash basis, forward-looking)

These should align as: AWS Cost Explorer (this month) ≈ NS GL hosting (next month) ≈ Finance forecast for next month's payment week.

If they don't align, that's information:
- AWS lower than NS GL → invoice timing or ICS savings just landed; expect NS GL to drop next month
- AWS higher than Finance forecast → Finance is being aggressive on ICS savings; downside risk

## When in doubt

Always cross-check three sources before changing a cash-model number:
1. NS GL actuals (NetSuite SuiteQL) — what we paid
2. Finance forecast (Class Cash Forecast XLSX) — what Finance projects
3. AWS Cost Explorer (this connector) — what AWS sees in real-time

If all three agree, you're safe to update the model. If they disagree, the disagreement itself is the analysis — write it up rather than picking a number.
```

### Inputs it expects
AWS profile name (`class` or `collab`). Date range for cost queries. Optionally: service grouping, dimension grouping. The local `~/.aws/config` and `~/.aws/sso/cache/` must contain valid SSO setup.

### Outputs it produces
Cost/usage data per AWS profile. The skill is a reference for HOW to call AWS, not a wrapper that produces a specific report — other skills (weekly-cash-forecast, covenant-tracker) consume its patterns.

### Dependencies
- Local AWS CLI installation (`/opt/homebrew/bin/aws`)
- Two SSO profiles configured in `~/.aws/config` for `class` and `collab`
- Browser-based SSO re-auth every ~12 hours
- Reference files in `references/` (not inlined here; absolute path: `/var/folders/tg/.../skills/class-aws-connector/references/`)

### Known issues or supersession notes
- The C-Suite at V1 uses AWS via its own MCP wrapper. The profile-handling logic (always sum class + collab; refresh on ExpiredToken) is the load-bearing part that must port to the C-Suite. The CLI invocation specifics may be replaced by AWS SDK calls in the C-Suite codebase.
- The reference files (`recovery.md`, `common_queries.md`, `cash_model_context.md`) contain detailed CLI examples and recovery procedures. If the C-Suite encounters AWS auth issues during Phase 1 build, Claude Code should read those references at the absolute path. They were not inlined here because the C-Suite's AWS code path will likely use the AWS SDK rather than the CLI directly.

---

## Summary of extraction status

| # | Skill | Confidence | Notes |
|---|---|---|---|
| 1 | russell-voice | full | SKILL.md + 3 inlined references (phrases, structures, lexicon). script-examples.md not inlined (script-specific). |
| 2 | run-critique | full | Mature skill; two prior critique memories confirm it has fired. |
| 3 | weekly-cash-forecast | full | Includes verbatim NetSuite SuiteQL, AWS CLI invocations, Salesforce SOQL. May 10 baseline methodology preserved. |
| 4 | covenant-tracker | PARTIAL | Skill body complete; covenant thresholds are ASSUMED until CFO confirms verbatim from Barclays credit agreement. |
| 5 | renewal-forecast | full **WITH KNOWN BUG** | Uses `Owner.Name` SOQL pattern that surfaces terminated reps. Corrected pattern documented in Known Issues. **Fix on import.** |
| 6 | call-intelligence | full | Chorus connector activated 2026-05-21; skill works within the public v3 API's summary-only constraint. |
| 7 | system-check | full | Diagnostic skill; references files and scheduled tasks specific to Cowork. C-Suite needs its own analog. |
| 8 | class-aws-connector | full | SKILL.md is the operational reference; three additional reference files exist at absolute path but were not inlined (CLI-specific). |

## Augmentation notes for Claude Code

**On scope of these skills vs. the C-Suite's V1 playbooks:** The eight skills are operational procedures Russell runs in Cowork today. They map to but do not perfectly equal the C-Suite's V1 playbooks (per PRD §6). Mapping:

- `weekly-cash-forecast` → C-Suite playbook #1 (Cash lever vs. trough analysis) — direct equivalent.
- `renewal-forecast` → relates to the deferred V1.5 renewal-risk playbook; the per-account risk-scoring logic is reusable in the C-Suite even though Russell deferred a dedicated renewal-risk playbook to V1.5.
- `call-intelligence` → consumed by C-Suite playbooks 4 (1:1 prep) and 5 (Board narrative) for stakeholder/customer signal extraction.
- `covenant-tracker` → consumed by C-Suite playbook 1 (Cash lever) when tripwire status is part of the trough analysis.
- `class-aws-connector` → consumed by every C-Suite playbook that touches AWS (mainly playbook 1).
- `run-critique` → operates at a different level than C-Suite playbooks — it's a post-run scoring loop. The C-Suite's Verifier (per PRD §5) plays the same role at run-time; run-critique is the after-action analog.
- `system-check` → has no direct C-Suite playbook equivalent; it's a diagnostic. Build a C-Suite-internal startup health check using its check list as a template.
- `russell-voice` → bakes into every Synthesizer/Verifier prompt that produces memo prose.

**On the V1 connector / credential model:** The C-Suite is single-user, Mac-only, runs as an Electron menubar app. It uses 5 MCPs (Salesforce, AWS, Gmail, NetSuite, Chorus). The skills reference some additional connectors (Slack, Google Workspace Drive) that are NOT V1 scope — defer those code paths and stub the integrations until V1.5+.

**On Salesforce field discipline:** The skills hard-code several custom field names:
- `Account.Current_ICP_Tier__c`
- `Account.Account_Vertical_Segment__c`
- `Opportunity.Owner.Name` (BUGGED — see renewal-forecast known issues)
- `Account.Owner.Name` (BUGGED — see renewal-forecast known issues)

Replace the Owner.Name patterns with `Account.Account_Manager__c` or `Account.Current_Account_Manager__c` (Claude Code verifies the exact field name during the Salesforce MCP wiring in Phase 0 Track E). Add `User.IsActive = TRUE` to all User-table joins.

**On NetSuite gotchas:** Several skills include NetSuite-specific data-quality rules that must be preserved:
- Foreign currency: pull `foreigntotal` AND `currency`; convert at `trandate` FX rate.
- Customer/entity ID indirection: JOIN through `customer` table; never filter `entity` by name string.
- Stale AP cross-reference: any AP > 90 days late gets footnoted (may be stale).
- Payroll blind spot: never derive headcount cost from NS GL; use the GTM roster in memory.

**On scheduled task migration:** All five scheduled jobs the C-Suite owns at V1 (per PRD §6) map to skills extracted here:
- Monday 6am ET tripwire + cash → `covenant-tracker` + `weekly-cash-forecast`
- Monday 7am ET stakeholder refresh → (not extracted here; lives in the operating model itself)
- Sunday 6pm ET renewal + Chorus sweep → `renewal-forecast` + `call-intelligence` Mode 2
- Sunday 8pm ET dashboard regenerate + memory consolidation → (not extracted here; combination of multiple skills)
- Daily 6am ET morning brief → (uses `system-check` patterns + the latest outputs from the four jobs above)

**Verify before reimplementing:** Where these skills reference absolute file paths (e.g., `Class_Cash_Lever_Model_v5_2026-05-18.xlsx`, `_spine/intelligence/`), verify the path is still current before hard-coding it into the C-Suite. The Cash Lever Model file may have been renamed or moved.

---

*End of extraction. The C-Suite build can ingest this file as its skill substrate during Phase 0 Track A institutional context reading.*
