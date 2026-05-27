# Cowork Extraction Prompt — 7 Missing Skills + Operating Procedures

> **What this is.** A prompt to paste into Claude Cowork Desktop. Cowork extracts 7 of Russell's skills/procedures from the Cowork project and writes them as a single consolidated markdown file to a path the local C-Suite session can read. This resolves `BLOCKERS.md` B17 without R0 having to guess where the skills live.

## Why a single file

Cowork writes the consolidated output to `/Users/russellteter/Documents/Claude/Projects/Business Planning/_extracted_skills_for_c_suite.md` — which is inside the vault (already accessible to both Cowork and local Claude Code). The local session reads it directly. Single file is simpler than directory creation across surfaces.

After the file lands, the local Claude Code session reads it and either:
1. Installs each skill at `~/.claude/skills/<name>/SKILL.md` (preferred — gets it in the global skill registry), OR
2. Codifies the skill's logic into a C-Suite module under `apps/utility/src/skills/` (avoids subprocess overhead for high-traffic skills), OR
3. Flags any that genuinely don't exist in Cowork either and surfaces for Russell to author from scratch.

The R0 sub-phase decides per-skill per `RESEARCH.md`.

---

## The prompt — paste into Cowork verbatim

```
I need you to extract 8 of my custom skills / operating procedures from this
Cowork project so I can use them in another Claude Code project (the C-Suite
build). The other project's pre-flight script flagged them as missing, and they
likely exist here as project-level prompts / skill files / inline procedures.

DELIVERABLE: ONE consolidated markdown file written to:
  /Users/russellteter/Documents/Claude/Projects/Business Planning/_extracted_skills_for_c_suite.md

The file should contain a section for EACH of the 8 skills below, with the
FULL CONTENT as it currently exists in this project — verbatim, including any
frontmatter, system prompt, query templates, examples, references.

SKILLS TO EXTRACT:
1. russell-voice — my personal writing-voice rule set. Used for personal-facing
   memo prose, executive summaries, recommendations. Different from
   class-brand-voice (which is for external Class content). russell-voice is
   the no-AI-tells, no-hedging, no-preambles, direct-and-specific voice for
   work I see myself.
2. run-critique — the rubric used to self-critique at end of every /deep run.
   Includes dimensions, scoring guidance, and the improvement-proposal pattern.
3. weekly-cash-forecast — Monday morning cash forecast procedure: NetSuite
   queries, cash-position computation, scenario sensitivity, output structure.
4. covenant-tracker — covenant proximity scan logic: thresholds (Barclays
   credit-agreement covenants if known), tripwire-flip pattern, data sources
   (NetSuite cash + line-of-credit usage + 13-week forward).
5. renewal-forecast — Sunday-evening renewal-risk forecast procedure:
   Salesforce queries, risk classification, write-back format. IMPORTANT —
   please flag whether this skill currently uses Owner.Name vs
   Account_Manager__r + IsActive — there's a known bug if it uses Owner.Name.
6. call-intelligence — Chorus call-summary sweep: queries, signal extraction,
   pairing rule with Salesforce / NetSuite, memo pattern.
7. system-check — morning brief health check: what it queries, what it
   produces, the "operational picture in 30 seconds" goal.
8. class-aws-connector — AWS query connector: profile handling (class + collab
   sum rule), cost queries, account inventory.

PER-SKILL STRUCTURE (markdown):

## <skill-name>

**Status in Cowork:** <where it lives — separate skill file? Inline in
project instructions? In a specific .md inside a project directory? Search
performed to locate it: <what you searched>>
**Last invoked:** <if you can tell from history>
**Confidence the skill exists in this project:** <full | partial | not-found>

### Full content (verbatim — frontmatter + body + any references)

```<original-format>
[exact file content; do NOT paraphrase; preserve YAML frontmatter; preserve
example blocks; preserve any reference-file links and ideally inline the
content of small reference files too]
```

### Inputs it expects
[what context / data it needs to run — be specific]

### Outputs it produces
[structured output shape, expected sections, format conventions]

### Dependencies
[other skills / connectors / data sources it relies on]

### Known issues or supersession notes
[anything you'd flag a future user about]

---

DISCIPLINE:
- If a skill genuinely doesn't exist in this project, say so explicitly under
  that section: "NOT FOUND IN THIS PROJECT — search performed: <queries you
  ran / files you checked>." DO NOT fabricate content.
- If a skill exists but is partial / draft / superseded by something newer,
  note the supersession.
- Verbatim content preserves YAML frontmatter exactly (the C-Suite parses it).
- Preserve absolute file paths in the content if referenced; the C-Suite
  resolves them.
- If a "skill" is actually a procedure embedded inside a longer document
  (project instructions, README, /deep prompt scaffold), extract just the
  procedure section, but cite the source document at the top of the section.

Write the file. Confirm completion with the file path + a summary of which 8
were found-with-content, found-partial, or not-found.
```

---

## After Cowork writes the file

1. Russell tells the local C-Suite Claude Code session: "Cowork wrote `_extracted_skills_for_c_suite.md`. Read it and remediate B17."
2. Local session reads the file, processes each section, and:
   - Installs `found-with-content` skills at `~/.claude/skills/<name>/SKILL.md` (creates the directory + writes the SKILL.md with the verbatim content). Russell can verify with `ls ~/.claude/skills/<name>/`.
   - For `found-partial` skills: notes the gaps in `docs/research/R0-skill-inventory.md` and proposes either codification-into-C-Suite-module path or completion authoring.
   - For `not-found` skills: surfaces in `BLOCKERS.md` B17 update with "needs authoring" status and proposes a minimum skill content based on what the PRD expected the skill to do.
3. Commits the changes (install + research notes) and updates `BLOCKERS.md` B17 status from `NEW` → `MITIGATED` (full extraction) or `PARTIAL_MITIGATION` (some missing).

This closes B17 cleanly without /goal having to spend Phase R cycles guessing.
