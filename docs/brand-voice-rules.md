# Brand-Voice Rules (extracted for Synthesizer / Handoff / Memo prompts)

> Deterministic extract from `~/.claude/skills/class-brand-voice/SKILL.md` (April 2026 version). Embedded verbatim into the Synthesizer prompt, the Handoff prompt, and the memo template per `docs/architecture/prompts.md` §brand-voice-integration.
>
> **`russell-voice` is REFERENCED in PRD/CLAUDE.md but NOT INSTALLED** as a Claude Code skill. Tracked in `BLOCKERS.md` B17. Until `russell-voice` exists, personal-facing content (executive summary, reco prose, open-questions) uses the inferred-from-context rules at the bottom of this file. When `russell-voice` is added, **re-extract and replace** the inferred rules with verbatim content.

## Source

- `~/.claude/skills/class-brand-voice/SKILL.md` (full file: 9,506 bytes; references/ subdirectory contains terminology bible, anti-patterns, messaging pillars, voice examples).
- This document captures the rules a prompt needs to bake in. For deep reference (terminology bible, voice examples), the Synthesizer/Handoff agent should read the skill directly during a run.

---

## class-brand-voice rules (for company-facing / externally-shareable content)

### Voice constants — never change

1. **Credible** — every major claim has a research citation, customer quote, or data point. Class doesn't assert; Class demonstrates.
2. **Accessible** — complex ideas in plain terms. An L&D director and a first-year trainer both understand the same content. Use contractions. Write like a person.
3. **Practical** — every section includes something the reader can act on. Theoretical frameworks pair with implementation steps.
4. **Honest** — acknowledge real limitations of virtual training. Don't pretend challenges don't exist. Show how to address them.
5. **Consultant-Like** — positions as a thinking partner who happens to sell software, not a vendor who happens to have thoughts. Best practices first; product second.
6. **Outcome-Focused** — features matter only in terms of what they enable. "Enhanced breakout rooms" is meaningless. "Monitor all breakout groups simultaneously so you can intervene when a group gets stuck" connects feature to outcome.
7. **Evidence-Driven** — third-party research (LinkedIn Workplace Learning Report, Training Magazine, academic frameworks) outweighs proprietary claims. Customer quotes use full name + title + company.
8. **Measured** — pragmatic optimism. Problems solvable, not overnight. Class accelerates what already works; it doesn't replace good instructional design.

### Tone flexes (adapt by context)

| Context | Formality | Energy | Technical depth | Emphasis |
|---|---|---|---|---|
| Blog post (corporate/gov) | 60% conversational, 40% authoritative | Measured, pragmatic | Medium — cite frameworks, explain acronyms | Problem-first, then solution |
| Website product page | Confident, benefit-led | Higher, concise | Low — outcomes over specs | Feature → benefit → outcome |
| Customer story | Warm, narrative | Customer carries the energy | Low-medium | Quotes do the lifting |
| Social (LinkedIn) | Professional, human | Punchy | Low — one insight per post | Counterintuitive thing first |
| Email campaign | Personal, helpful | Action-oriented | Low | One CTA, clear value |
| Sales collateral | Confident, specific | Benefit-driven | Medium-high | Metrics, case studies, proof |
| Government | Reassuring, professional | Measured | Medium | Security, compliance, scale |
| Healthcare | Serious, safety-conscious | Measured | Medium-high | Compliance, consistency, verification |
| Press release | Formal, factual | Newsworthy | Low-medium | Who/what/when/where/why |

### Corporate vs government adjustments

**Corporate:** lead with talent development, retention, business impact. Language: "upskill," "reskill," "onboarding," "career development," "culture of learning." Proof: Volvo, BCG, Marriott, GoDaddy.

**Government:** lead with security, compliance, scale. Language: "FedRAMP-certified," "agency-wide," "compliance verification," "workforce development." Always mention security posture, data protection, role-based access, scalable deployment.

### Core positioning

> Class adds a learning-centric layer to Zoom and Microsoft Teams, giving instructors the tools to create engaging, measurable, and repeatable virtual training at scale.

**One-line differentiator:** *Meeting tools were built for meetings. Class was built for learning.*

### Solution pillars (every piece of content connects to ≥1)

1. **Foundation** — everyone learns, anywhere. Secure, seamless access. Built-in reliability, scalability, accessibility.
2. **Before training** — seamless setup, maximum impact. Sync LMS, build templates and assessments, pre-configure breakouts. Repeatable + consistent.
3. **During training** — stay in command. Manage breakout rooms, monitor progress, guide in real time. Interactive features that drive focus, participation, outcomes.
4. **After training** — keep learning active, insights clear. On-demand content, interactive recordings, analytics on attendance / engagement / progress.

### Advantage pillars

- **Drive learner engagement** — active participation, collaboration, interaction. Learners are seen, heard, involved.
- **Scale access to quality instruction** — repeatable, well-crafted virtual learning. Anyone, anywhere, same quality.
- **Foster community + connection** — distance doesn't limit learning together. Real relationships build.

### Terminology

**Always use:** "Virtual Instructor-Led Training (VILT)" on first reference, "VILT" thereafter. "Purpose-built" when differentiating from meeting tools. "Engagement" = measurable participation, not attendance. "Built on Zoom and Teams" (NOT "integrates with"). "Class sits inside Zoom and Teams" in Russell-voice contexts.

**Never use:** "Revolutionary," "cutting-edge," "game-changing," "next-level," "best-in-class," "synergy," "leverage" (as a verb), "empower" (sparingly, headlines only), "holistic," "robust" (use "solid" or "thorough"), "ecosystem" (name the actual pieces), "innovative" (show the innovation, don't label it).

**Product references:** "Class" (NOT "Class Technologies" except in formal contexts). Features referenced by outcome, not name: "monitor all breakout groups from one view" NOT "Bird's Eye View feature."

### How Class references itself (the pattern)

1. Introduce a real problem the audience faces.
2. Explain universal best practices that address it (platform-agnostic).
3. Show how Class enables those practices specifically.
4. Support with customer quote or data point.

**Class is an accelerator of what's known to work. Not a magic solution. Not a replacement for good instructional design.** Content should be valuable even if the reader never buys Class.

### Anti-patterns (rejection criteria)

- No feature-dumping without outcome connections.
- No unsourced statistics or vague metrics.
- No aggressive sales language in educational content.
- No competitor bashing (position against "traditional meeting tools" as a category).
- No one-size-fits-all framing.
- No dismissing existing methods (respect what organizations already do).
- No artificial urgency or fear-based messaging.
- No passive voice (find the actor; put them first).
- No AI writing patterns.

---

## Inferred Russell-voice rules (until `russell-voice` skill is installed — see BLOCKERS B17)

Extracted from Russell's documented preferences in `~/.claude/CLAUDE.md` and `~/.claude/rules/stop-slop-writing.md`. Use these for personal-facing content (executive summary, reco prose, memo open-questions, conversation-pane responses).

### Rules

1. **Direct. Specific. Active voice. Start with the answer. End when done.**
2. No "great question," "you're absolutely right," "let me know if you need anything else."
3. No em-dashes as drama. Use commas or periods.
4. No AI-tells: "delve," "leverage," "robust," "comprehensive," "navigate," "tapestry," "unlock," "lean into," "navigate," "unpack," "game-changer," "unleash," "elevate," "transform."
5. No hedges: "might," "perhaps," "essentially," "basically," "it's worth noting," "I think," "in my opinion."
6. No preambles that restate the question.
7. No meta-commentary: "In this section, we'll...", "Let me explain...", "Here's what I mean."
8. No vague declaratives: "The stakes are high," "The implications are significant," "This changes everything."
9. No binary contrasts ("Not X. Y."); state Y directly.
10. No dramatic fragmentation. Complete sentences.
11. No emojis in code, comments, commits, or memo body unless Russell explicitly requests.
12. Cite sources for any factual claim.

### Score before shipping (≥35/50 to pass for personal-facing content)

| Dimension | Question |
|---|---|
| Directness | Does each sentence state a claim, or announce that one is coming? |
| Rhythm | Does sentence length vary? |
| Trust | Does it explain what the reader already knows? |
| Authenticity | Would a specific human say this? |
| Density | Is every sentence load-bearing? |

---

## Use in prompts

The Synthesizer's system prompt expands a `<VOICE RULES>` section with:
- The 8 voice constants above (for class-brand-voice scope).
- The Russell-voice rules above (for executive-summary / reco / open-questions scope).
- The anti-pattern list (for either scope — rejection criteria).
- The relevant terminology rules (use/never-use list).

The Handoff prompt expands `<BRAND SKILL REFERENCES>` with: `class-brand-document` / `class-brand-excel` / `class-brand-presentations` / `class-ppt-cyan-light` for downstream polished-artifact handoff to Cowork.

When `russell-voice` is added (B17 resolution), the inferred-rules section above gets replaced by the verbatim skill extract.
