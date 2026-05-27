# C-Suite — Build Mission Brief

**Audience:** Claude Code, at the start of every C-Suite build session.
**Owner:** Russell Teter.
**Product spec (source of truth for what we're building):** `C_Suite_PRD.md` in this folder.

This document is your mission brief. It tells you what the build is for, what you have to figure out for yourself, what you cannot change without approval, and how to operate while building. It does not prescribe an implementation. The implementation is your job — through your own discovery, research, and planning. Do not start writing code until you've completed Phase 0.

---

## 1. The mission

Russell built a Strategic AI Operating Model that runs today in Cowork. It works — two `/deep` investigations have shipped, the position library, decision log, calibration scorecard, stakeholder models, workstream tracker, and pre-mortem library are all populated. The intellectual chassis is real.

What it doesn't have is a body. Russell can't watch a run, can't intervene mid-stream, can't see the knowledge base accumulate, can't have scheduled autonomy fire without thinking about it. Every comparable product on the market either died, stalled, or shipped a generic persona over a base model with no institutional state.

Your mission is to build that body. The C-Suite is a single-user macOS desktop app that operationalizes Russell's existing operating model — runs the multi-lens investigation loop with proper rigor gates, autodrafts proposed write-backs to his institutional state, owns the scheduled autonomy that today runs in Cowork, and makes the work visible while it happens.

The product spec in `C_Suite_PRD.md` defines what we're building, why, what success looks like, and the design principles you cannot change without surfacing the issue to Russell. Read it before you do anything else.

## 2. Two-phase mandate

You operate in two phases. Phase 0 is non-skippable.

### Phase 0 — Discovery (yours to run)

Before writing a single line of code, run your own discovery and planning phase. This is not optional. Russell explicitly does not want you over-following prescriptions; he wants you to investigate the actual current state of the relevant technologies, propose your own architecture, and present it for approval.

Phase 0 has five parallel tracks. Use sub-agents where it accelerates the work. Pull live information from the web — the technology landscape moves; don't rely on what you knew from training.

**Track A — Institutional context.** Read every file listed in §10 of the PRD. Read Russell's memory directory. Glob the existing operating-model artifacts (`positions/`, `decisions/`, `workstreams/`, `stakeholders/`, `pre-mortems/`, `calibration/`, `adversarial/`, `investigations/`). You cannot design a product over this corpus without seeing what it actually contains. Understand the lens framing, the rigor disciplines, the connector playbook, the data-quality rules, the existing scheduled tasks in Cowork, the calibration semantics, the position-superseding pattern, the turnaround doctrine library. This isn't bedtime reading — it's the substrate the product operates on.

**Track B — Claude Agent SDK current state, authentication, and billing.** Research the current Claude Agent SDK (TypeScript and Python). What's the current pattern for orchestrator + worker subagents in parallel-independent mode? How are tool calls streamed back to a UI in real time? What's the canonical hook surface (`PreToolUse`, `PostToolUse`, `SubagentStart`, `SubagentStop`, partial messages)? What are the known production patterns and known footguns? What changed between the date Russell drafted this brief and now? You decide what stack and patterns to use; ground that decision in current SDK reality, not in what I knew when I wrote this.

Critically, also investigate **authentication and billing.** Russell uses Claude Max (his consumer subscription) and would prefer the C-Suite's agents use his Max subscription for inference rather than paying separately via Anthropic API credits. Several questions to resolve through live investigation:

- Does the Claude Agent SDK currently support Claude Max/Pro subscription authentication (the way Claude Code does — login with Claude account, subscription covers inference), or does it still require an Anthropic API key? If the SDK doesn't natively support subscription auth, is there a viable pattern of running the agents as Claude Code subprocesses (which do support subscription auth) and capturing structured output, vs. switching to API-key billing?
- What are Claude Max's current rate limits? The C-Suite fans out 10 agent invocations per full run (6 lenses including CPO + Synthesizer + Verifier + Red-Team + Steelman), plus 5 daily scheduled jobs that themselves may fan out subagents, plus Russell's normal Claude.ai and Cowork usage. Will Max throttle this load? At what concurrency? Can parallelism be reduced (lenses run sequentially) without unacceptable user-perceived latency on full runs?
- Produce a three-path billing recommendation: (a) full Max subscription auth if the SDK supports it (with throttled parallelism if rate limits require), (b) Anthropic API key with usage billing (predictable cost, no rate limits, separate billing line), (c) hybrid — Max for cheap stuff like morning briefs and 1:1 prep, API key for expensive stuff like full 6-lens fan-out and board narrative prep. Rough monthly cost projection for each path at Russell's expected usage volume. Russell decides; you investigate and propose with rationale.

This investigation lands in your architecture proposal at the end of Phase 0. Do not assume Max works until you've verified it. Do not default to API billing without surfacing the alternative.

**Track C — Process and UI architecture.** The product needs a Mac menubar app, an agent runtime, a UI that streams real-time agent activity, a filesystem-watcher over the vault, a scheduler for autonomy, native macOS notifications, a global hotkey, persistent session storage. There are multiple ways to assemble that. Investigate the trade-offs. Look at reference implementations of Mac menubar AI agent products. Decide what's right and document why. The PRD locks Electron menubar as the form factor; everything else inside that form factor is open.

**Track D — Obsidian + concurrent-edit safety.** The vault is the existing `/Documents/Claude/Projects/Business Planning/` folder, opened in Obsidian by Russell for browsing. The C-Suite reads/writes the same files. This creates a concurrent-edit risk — without a careful pattern, agent writes will silently lose Russell's in-progress Obsidian edits. Research current patterns for safe concurrent access from headless processes to a folder Obsidian has open. Investigate the Obsidian plugin ecosystem for help (Obsidian Drift, Bases, Dataview, Templater). Understand the frontmatter schema the existing files already use. Decide how to extend it for Bases queries without breaking what's there. Russell will need to install Obsidian plugins manually as a documented setup step — design that flow.

**Track E — MCP wiring per service.** Five MCPs ship at V1: Salesforce, AWS, Gmail, NetSuite, Chorus. Cowork's MCP connections do not transfer to your product — every service needs its own authentication flow. Salesforce requires a connected app in Class's org (OAuth refresh token flow). NetSuite requires TBA tokens issued by a NetSuite admin (Brian — schedule this work early; it's the most likely timeline-slipping bottleneck). AWS uses Russell's existing local SSO profiles. Gmail uses Google OAuth. Chorus is a simple API key. Research the current best patterns for each. Decide credential storage — the principle locked is "never in `.env` files in the repo, never in plaintext on disk"; the specific mechanism (macOS Keychain Services API, Electron's `safeStorage`, a third-party secrets library, or something else) is your call based on current best practice. Note: `keytar` was deprecated in 2023 and should not be assumed as the default. Plan the token refresh UX — what happens when Salesforce's OAuth token expires mid-run, when AWS SSO sessions expire mid-scheduled-job, when Gmail's refresh token is revoked. Plan the auth user experience — what does Russell click through on first run, and on day 90 when a token unexpectedly expires.

In addition to the five tracks, your Phase 0 investigation must resolve these ten specific design decisions that were left open during the spec work. Surface each in your architecture proposal with a recommendation and reasoning. These are decisions Russell will approve, not ones you decide unilaterally.

1. **C-Suite + Cowork concurrent-write resolution.** The PRD preserves Cowork `/deep` as a fallback path, but Cowork does not implement the C-Suite's concurrent-edit safety pattern. If a Cowork `/deep` runs while a C-Suite scheduled job is also touching a workstream file, conflicts can occur. Decide: do Cowork writes get blocked once the C-Suite ships, or do you accept that occasional sidecar conflicts may surface during fallback `/deep` runs?

2. **Verifier prompt anti-sycophancy heuristics.** The Verifier is the single most important prompt in the product. Research the production patterns that prevent critic-rubber-stamping: structural isolation from lens reasoning traces, forced output schema with mandatory falsifiers and missing-data flags, different model or higher reasoning-token budget than the lenses, schema-rejection of null returns. Reference the anti-sycophancy literature (the Silicon Mirror paper, Sonnet 4 sycophancy baselines, Anthropic's CitationAgent pattern). Propose the concrete Verifier prompt design.

3. **Iterative feedback convergence rule.** Lock the N. After how many iteration rounds without convergence does the system surface a "commit, reject, or escalate to full re-run" prompt to Russell? Recommend N with reasoning. Default proposal: 3 rounds, but propose with rationale.

4. **Playbook missing-prerequisite handling.** For each of the 8 V1 playbooks, define behavior when a required artifact is missing or stale. Example: "Stakeholder 1:1 prep" invoked for a person without a stakeholder file → does it block, auto-draft a stakeholder file, run with degraded context and flag the gap, or surface to Russell for choice? Same question for stale artifacts (stakeholder model older than 30 days, workstream file untouched for 14+ days, position untested for 60+ days).

5. **Scheduled job error/retry semantics.** What happens when NetSuite is unreachable at 6 AM Monday's tripwire scan? When AWS SSO has expired during Sunday's renewal sweep? When Gmail OAuth was revoked overnight before the morning brief? Propose: retry policy per failure type, degraded-mode behavior (run with partial data and flag), failure-notification rule, escalation path if a critical job has missed 3 consecutive fires.

6. **Plan-approval UX per playbook.** PRD locks plan-approval as universal. In practice, "Quick multi-lens read" at 8:55 AM before a 9:00 AM meeting is not a friction-friendly moment. Propose either: (a) universal plan-approval with a tight default 5-second auto-approve countdown for Quick Read, or (b) plan-approval-gate as a per-playbook config — universal for high-stakes playbooks (Strategic Option, Board Narrative, Restructure Decision), inline for Quick Read and 1:1 Prep. Russell decides; propose with rationale.

7. **Daemon edge cases.** Specify behavior for: (a) Mac restart while C-Suite was running, (b) user force-quitting the C-Suite, (c) Mac shutdown without restart for several days (job catch-up logic), (d) user not logged in when scheduled job fires (LaunchAgent vs. LaunchDaemon decision and its consequences), (e) macOS sleep during a long-running scheduled job. For each: does the C-Suite auto-recover, notify Russell of the missed/delayed run, or fail silently? Recommend the discipline that produces predictable autonomy without surprising Russell.

8. **Run cost transparency.** Every full run consumes real tokens (or API credits, or Max quota). Propose where in the UI the per-run cost surfaces (memo header? home-screen daily cumulative meter? per-playbook average over time?). This matters both for the Max-vs-API billing decision in Track B and for Russell's own usage discipline. The cost meter is not optional — opacity here is a slop attractor.

9. **Class product usage data integration via the customer-dashboard-poc PowerBI project.** Russell has an existing Claude Code project — `customer-dashboard-poc` — that already has working PowerBI connections to Class's product usage data (engagement metrics, feature adoption, customer activity patterns). It lives at `/Users/russellteter/Claude Code Projects/customer-dashboard-poc/` or wherever Russell has it. This data source is REQUIRED at V1, not deferred — customer-facing playbooks (renewal risk, GTM reallocation, strategic option evaluation that touches retention, board narrative prep) need product-usage substrate beyond what Salesforce CRM provides. Without it, the CRO and CPO lenses are reasoning over CRM signal alone. Phase 0 resolves the integration approach: (a) read the customer-dashboard-poc codebase to understand its current connection patterns, queries, and data shape; (b) decide whether to import its code/library patterns directly into the C-Suite, run it as a subprocess that exposes a clean tool interface to the agents, or wrap it as a new MCP that conforms to the same pattern as the V1 MCPs; (c) decide credential handling (PowerBI auth flow — separate from the V1 MCP credentials); (d) propose how each customer-touching playbook actually consumes this data (which lens queries it, what bootstrap context bundle inclusions it triggers, how product-usage signal gets cited in memo claims with `source_id`). Russell will approve the integration approach; you investigate and recommend.

10. **Cowork execution handoff format and invocation.** The C-Suite produces strategic analysis and decisions; Cowork executes the resulting project work. A dedicated Handoff Agent translates committed decisions, shipped memos, and accepted positions into structured execution briefs that Cowork can pick up and run with. The principle is locked (see PRD §5 — division of labor — and PRD §6 — "Draw up for Cowork" capability). Phase 0 resolves the design specifics: (a) the exact schema of the handoff brief — what required sections it must contain (decision being executed with traceback link, rationale chain, specific deliverables Cowork should produce, stakeholder context, workstream context, constraints and risk flags, acceptance criteria for the execution work), with a markdown template that the Handoff Agent fills; (b) where briefs land — recommended `/Business Planning/handoffs/<date>-<slug>.md` with a `handoffs/INDEX.md` index file Cowork can scan to discover new briefs; (c) which UI surfaces carry the "Draw up for Cowork" trigger — memo viewer header, decision-log entry, accepted-position card, accepted-pre-mortem card all qualify; predictions and stakeholder updates probably don't (those aren't actions to execute); (d) which lens or agent role drives the Handoff Agent's framing — recommended Chief of Staff perspective because executor-framing is its native domain, but consider whether a dedicated 6th role ("Execution Architect" or similar) is cleaner than overloading COS; (e) how the brief surfaces back to Russell — does the C-Suite UI just show "handoff written to handoffs/2026-06-04-restructure-execution.md, open in Cowork" or does it preview the brief inline first; (f) what happens to the execution artifacts Cowork produces — Cowork writes project plans, business plans, process docs back into the vault; how does the C-Suite discover and reference them on its next runs (auto-link from the decision's frontmatter? a dedicated `executed-by:` field that points to the Cowork-produced artifacts?). Propose with reasoning. This feature is what closes the loop between "C-Suite gave me the right answer" and "the work actually got done" — get the brief format right and the whole system finally feels like an end-to-end operating partner rather than a sophisticated answer machine.

When you have completed all five tracks AND resolved these ten decisions with reasoned recommendations, Phase 0 is done. Exit criteria for Phase 0:

- Track A: you can name every operating-model artifact type, the existing file count in each directory, the canonical schema patterns, and the connector playbook routing rules. You've read at least one of the two completed `/deep` investigations end-to-end and can describe what "good output" looks like.
- Track B: you have a current-state summary of the Agent SDK including auth options, a verified answer on whether subscription auth works for this product, current Max rate limits documented with sources, and a three-path billing recommendation with rough monthly cost projections.
- Track C: you have a recommended stack (language, framework, IPC, UI, animation, state) with rationale, a process architecture diagram, and a streaming-protocol decision.
- Track D: you have a verified safe-write pattern (atomic + hash-check + sidecar) implemented as a tested utility, a frontmatter schema extension proposal, an Obsidian plugin install list, and a documented setup flow for Russell.
- Track E: you have a credential-storage decision with reasoning, a token-refresh UX, and concrete authentication flow plans for all five MCPs including the NetSuite admin-work dependency on Brian.
- All 10 additional decisions above have explicit recommendations.
- The architecture proposal and development plan artifacts are written.

If any of these exit criteria are unmet, you are not done with Phase 0. Do not start Phase 1.

After running these five tracks and resolving the ten decisions, produce two artifacts and present them to Russell for approval:

1. **Architecture proposal** — your recommended stack, process architecture, UI rendering approach, MCP wiring strategy, concurrent-edit safety pattern, scheduler implementation, credential storage approach. With rationale for each major decision and a brief note on what you considered and rejected.

2. **Development plan** — your sequencing of work into phases, with milestones tied to the V1 outcome criteria in PRD §4. Honest effort estimates. Top risks and mitigations. The plan should make it clear what gets built first, what blocks what, and when Russell should expect to start using parts of the product.

Russell approves, edits, or sends you back for more discovery. Only after his approval of both artifacts do you begin Phase 1.

### Phase 1 — Build

Build the product against the locked design principles in PRD §5 and §7, the product surface in PRD §6, and your approved architecture proposal and development plan.

Throughout the build, follow the operating disciplines in §4 of this document. Engage Russell where §5 says to engage. Decide on your own where §5 says to decide.

The build is done when the V1 outcome criteria in PRD §4 are demonstrably true — not when a checklist is checked off. You'll know it's done when Russell starts opening the C-Suite instead of Cowork for strategic investigations.

## 3. What's locked, what's open, what's out of scope

The PRD covers this fully in §5 (non-negotiable design principles) and §7 (locked vs. open vs. out-of-scope). Re-read those sections during Phase 0. The short version:

**Cannot change without Russell's explicit approval:**
- The 12 design principles in PRD §5 (vault as single source of truth, parallel-independent lenses, plan-approval gates, Synthesizer + Verifier split, source citation required, rigor gates non-skippable, write-back approval pattern, concurrent-edit safety, UI substance ribbon, no auto-distribution, Russell decides + system implements, Open Q&A quality stamp).
- The product surface in PRD §6 (8 V1 playbooks, Open Q&A mode, 5 V1 MCPs, 5 scheduled jobs, home screen content, single-user macOS menubar form factor).

**Yours to decide through Phase 0 and the build:**
- Everything in PRD §7 "Open" — stack choices, process architecture, IPC, streaming, MCP wiring details, UI rendering, animation patterns, rigor score implementation, frontmatter schema extensions, scheduler choice, write-back persistence approach, run history UI, test strategy, repository structure, build sequencing.

**Do not build at V1:**
- Anything in PRD §7 "Out of scope." Defer to V1.5+ regardless of how tempting.

## 4. Operating disciplines while building

These are Russell's preferences, locked through six months of working with him. They are not negotiable.

**Surgical edits, never rebuilds.** When iterating on something working, patch in place. If a fix needs more than 30% of a file rewritten or an architectural shift, stop and ask Russell via clarifying question with a one-line reason and scope estimate. Never silently regenerate from scratch when Russell asked for a tweak.

**Show diffs before executing changes that touch more than 10% of a file.**

**Preserve formatting, comments, and structure Russell established.** Don't reformat code he's reviewed. Don't "improve" things he didn't ask you to change.

**Verify before claiming done.** Read output files back. Re-verify math and types. Re-check the original ask. If anything fails, fix it before reporting done. Russell's discipline: "never claim completion you haven't verified."

**No slop, no sycophancy.** Direct. Specific over general. Active voice. Start with the answer. End when done. No "great question," "you're absolutely right," "let me know if you need anything else." No em-dashes as drama. No AI-tells ("delve," "leverage," "robust," "comprehensive," "navigate," "tapestry"). No hedges ("might," "perhaps," "essentially," "basically," "it's worth noting"). No preambles that restate the question.

**Cite sources for any factual claim.** Russell's discipline: "Any factual claim about Class data, AWS spend, NetSuite numbers, customer status, competitive intel, or financial figures requires an inline source." This applies to the product Claude Code is building, too — every numerical claim the lens agents produce carries a source_id linking to a tool-call result. The product itself enforces this; you enforce it during build by making citation tracking a first-class concern in the agent runtime.

**Reuse what exists.** Russell has ~70 skills installed (skills are listed in his Claude environment). Before reinventing something, check if a skill already does it. Two categories matter most: (a) **operating-logic skills** Russell already built — `weekly-cash-forecast`, `covenant-tracker`, `renewal-forecast`, `call-intelligence`, `run-critique`, `system-check`, `class-aws-connector` — encode procedures the C-Suite can call rather than reimplement; (b) **brand and voice skills** that define Class's output standards — `class-brand-document`, `class-brand-excel`, `class-brand-presentations`, `class-ppt-cyan-light`, `class-brand-voice`, `russell-voice`, `class-content-writer`, `class-content-qa`. Read both categories during Phase 0. For category (a), decide whether to invoke the skills as subprocesses or codify their logic into C-Suite modules. For category (b), extract the brand patterns (colors, fonts, layouts, voice rules, terminology, anti-patterns) and bake them into the Synthesizer's prompt, the Verifier's prompt, and the memo/write-back/handoff templates — so the C-Suite's outputs are visually and stylistically consistent with anything Cowork produces. Read `skills/INDEX.md` first to orient.

**Confirm before expensive actions.** Russell's discipline: confirm via clarifying question before "running a deep research pass, generating more than 3 files, sending external comms, or calling any write API." When in doubt, ask. The C-Suite itself implements this principle via plan-approval; you implement it during build by checking in on big architectural shifts before executing them.

**No emojis** in code, comments, commits, or product copy unless Russell explicitly requests them.

**Commits are atomic, narrow, and well-described.** One concept per commit. Commit messages describe what changed and why. Test before committing.

## 5. When to engage Russell — and when to decide on your own

This is the discipline that lets the build move fast without producing slop or surprises.

**Decide on your own:**
- Anything in PRD §7 "Open" — stack, libraries, code organization, build tools, test framework, IPC mechanism, UI component choices, rendering patterns, etc.
- Implementation details for any locked principle. The principle is locked; how you implement it is yours.
- Debugging, refactoring, optimization within the existing architecture.
- Naming. File organization. Code style.
- Trade-offs between two roughly-equivalent technical choices where the difference is taste.

**Engage Russell:**
- After Phase 0, before any code is written, to get approval on your architecture proposal and development plan.
- When a locked design principle in PRD §5 needs reconsideration — surface the issue, propose an alternative, explain the trade. Do not silently change it.
- When you discover the V1 scope in PRD §6 needs to shift (a playbook is harder than expected, an MCP is blocked, the scheduler design needs an extra week). Surface the slip with options.
- When you discover a new constraint or risk that materially changes the build. Don't absorb it silently; surface it.
- When the institutional context (operating-model files, memory, skills) reveals something that contradicts an assumption in the PRD. The PRD is the spec but the institutional context is the ground truth.
- When you need a decision Russell hasn't already given. Don't guess. Don't proceed and rebuild after-the-fact.

**Format for engagement:** use the AskUserQuestion pattern Russell uses — one question per call by default, 2-4 multiple-choice options, recommended option labeled, with explicit trade-offs in each option description. Batch only when 2-4 questions are tightly coupled. Russell's discipline: tool, not text — never list questions as prose bullets for him to answer in prose.

## 6. The institutional context — where the substrate lives

The C-Suite operationalizes Russell's existing institutional state. You cannot design a good product without internalizing what's there. Phase 0 Track A is where you do this; this section is the map.

**The vault:** `/Users/russellteter/Documents/Claude/Projects/Business Planning/`

Inside the vault, the operationally-significant artifacts:
- The Strategic AI Operating Model documents (v1 + v2 + companion docs). The intellectual chassis.
- `positions/` — the position library. Active beliefs with confidence, evidence, supersession chain.
- `decisions/` — the decision log. Active and resolved decisions with rationale, tripwires, reversibility.
- `workstreams/` — the 12 parallel turnaround tracks with status, dependencies, milestones.
- `stakeholders/` — 13 stakeholder models with decision rights, hot buttons, communication patterns.
- `pre-mortems/` — failure mode catalog with probability, impact, early-warning signals, mitigation.
- `calibration/` — prediction tracker and Brier-score-equivalent calibration scorecard.
- `adversarial/` — competitor watch, financial tripwires, regulatory exposure, defection patterns.
- `investigations/` — per-investigation logs from completed `/deep` runs.
- `deliverables/` — artifacts produced from past runs.
- `skills/` — the seven custom skills Russell authored. Read `skills/INDEX.md` to know what they do.

**The memory:** `/Users/russellteter/Library/Application Support/Claude/local-agent-mode-sessions/.../memory/MEMORY.md` and its linked files. Russell's role context, Class financial state, GTM roster, AWS configuration, COO leverage doctrine, CFO severance policy, data-quality gotchas. Critical for every lens agent's bootstrap context bundle.

**The Cowork environment Russell uses today.** The MCPs are already authenticated in Cowork. The scheduled tasks already run there. The `/deep` mode already produces the kind of memo the C-Suite will produce. Study how Cowork does it. The C-Suite's job is to deliver the same intellectual output through a better surface — not to deliver different intellectual output.

**The completed `/deep` investigations.** Look at `investigations/` for the two finished runs (`class-org-institutional-read`, `class-gtm-strategy-2026`). These are working examples of what your product produces. The pass2 lens memos, pass3 red-team and steelman outputs, the deliverables — these are ground truth for what "good" looks like.

**The customer-dashboard-poc Claude Code project.** Located at `/Users/russellteter/Claude Code Projects/customer-dashboard-poc/` (or wherever you find it). Existing project Russell built with working PowerBI connections to Class product usage data — engagement metrics, feature adoption, customer activity patterns. This is critical context, not optional. Customer-facing playbooks at V1 require this data substrate. Read the codebase during Phase 0 (Track E and additional decision #9). Decide whether to import its patterns into the C-Suite directly, run it as a subprocess with a clean tool interface, or wrap as a new MCP.

**The existing Cowork brand skills.** Read these before authoring the C-Suite's output templates and Synthesizer/Verifier prompts: `class-brand-document`, `class-brand-excel`, `class-brand-presentations`, `class-ppt-cyan-light`, `class-brand-voice`, `russell-voice`, `class-content-writer`, `class-content-qa`. They define the brand patterns the C-Suite must follow — colors, fonts, layouts, voice rules, anti-slop disciplines, terminology. Skill content lives in Russell's Claude environment under the plugin skills directory; locate them and treat their content as input to the C-Suite's memo template design and to the Synthesizer/Verifier prompts. The C-Suite does not produce branded non-markdown artifacts directly (Excel, PowerPoint, PDF) — those flow through the Cowork execution handoff (PRD §6) which has native access to these skills. But markdown memos, proposed write-back artifacts, and handoff briefs all follow the brand voice and structural conventions these skills encode, so outputs are consistent regardless of which surface produced them.

## 7. What "done" looks like

V1 ships when the seven outcome criteria in PRD §4 are demonstrably true. Re-read them. They are outcomes, not tasks. You decide what tasks produce those outcomes. You demonstrate them through actual use, not through a checklist.

The deepest signal that V1 is done: Russell opens the C-Suite instead of Cowork when a strategic question lands on his desk. The product earned the surface.

The deepest signal that something is wrong: Russell opens Cowork instead because the C-Suite's output is thinner, slower, or less trustworthy. If that happens, the rigor gates are failing, or the agents aren't loading enough context, or the MCPs aren't returning enough signal. Diagnose, fix, return to building.

## 8. Quick reference — file paths

| What | Where |
|------|-------|
| Vault (read/write target) | `/Users/russellteter/Documents/Claude/Projects/Business Planning/` |
| Memory directory | `/Users/russellteter/Library/Application Support/Claude/local-agent-mode-sessions/.../memory/` |
| Product spec (read first) | `/Users/russellteter/Documents/Claude/Projects/Business Planning/C_Suite_PRD.md` |
| This build brief | `/Users/russellteter/Documents/Claude/Projects/Business Planning/C_Suite_CLAUDE.md` |
| Skills catalog | `/Users/russellteter/Documents/Claude/Projects/Business Planning/skills/INDEX.md` |
| Operating model v1 | `/Users/russellteter/Documents/Claude/Projects/Business Planning/Strategic_AI_Operating_Model.md` |
| Operating model v2 | `/Users/russellteter/Documents/Claude/Projects/Business Planning/Strategic_AI_Operating_Model_v2.md` |
| Connector playbook | `/Users/russellteter/Documents/Claude/Projects/Business Planning/Strategic_AI_Connector_Playbook.md` |
| Invocation guide (lens prompts) | `/Users/russellteter/Documents/Claude/Projects/Business Planning/Strategic_AI_Invocation_Guide.md` |

The code lives at `/Users/russellteter/Claude Code Projects/c-suite/`. This matches Russell's existing organization — he already keeps other Claude Code projects (including `customer-dashboard-poc`) under `/Users/russellteter/Claude Code Projects/`. Russell creates the `c-suite/` subdirectory before pasting the Phase 0 kickoff prompt; you treat the directory as your working root from there. Note: the parent path contains spaces, so quote it in all shell commands (`cd "/Users/russellteter/Claude Code Projects/c-suite"`) and handle it correctly in any file-path code.

---

## 9. The first thing to do

Open this file. Open the PRD. Read both completely. Then read the operating-model files referenced in PRD §10. Then run Phase 0. Then come back to Russell with your architecture proposal and development plan.

Do not start writing code. Do not propose a stack before Phase 0 is complete. Do not assume the prescriptions I wrote earlier in this project's history are still current — they were a first-pass set of guesses. The decisions are yours to make through your own investigation, bounded by the locked design principles in the PRD.

The goal is clear, the context is here, the non-negotiables are documented. Build it.

---

*This brief is intentionally light on implementation prescription. The product spec is in the PRD. The mandate is to investigate, propose, get approval, then build. Russell does not want a prescribed implementation — he wants you to figure out the best one given current technology and his institutional state, and to defend your choices when he reviews them.*

---

## 10. Reference block (additive — added 2026-05-26 when the build was structured)

This brief remains the original build mission brief. The **operating runbook** that drives execution is now codified as a doc-set at the root of the `class-c-suite` repository.

**Required read order for `/goal` and every sub-agent before any action:**

1. `PURPOSE.md` — the why and the 8 V1 outcomes.
2. `DOCTRINE.md` — operating laws. **Non-negotiable.** Injected into every sub-agent invocation.
3. `ROADMAP.md` — chapter sequence (Phase R + Ch.0-11 + optional Ch.12), gates, exit criteria.
4. `BLOCKERS.md` — living blocker register; check current status before each chapter.
5. `RESEARCH.md` — Phase R deep-research protocol. `/goal` runs this first, before any chapter is coded.
6. `docs/architecture/{runtime,data,mcp,ui,prompts,delivery}.md` — six implementation-grade specs.
7. `docs/build-log.md` — per-loop ledger; every loop reads + writes here.
8. `CLAUDE.md` at repo root — project-level operating runbook.
9. `business-planning/C_Suite_PRD.md` — the locked product spec (the §11 "Build Program" section in the PRD anchors the doc-set).
10. `business-planning/C_Suite_CLAUDE.md` — this file (the build mission brief).

**Operating-mode override.** Russell has stated: "I don't need to review anything ever." This modifies the gate model in §5 of this brief. Under the override:
- Default to "decide and log," not "ask Russell."
- Hard gates remain only at: (a) on-Mac verification, (b) genuine product-shape forks that would propagate downstream rework, (c) destructive or external actions Russell did not pre-authorize.
- **GitHub auto-sync is mandatory** via a post-commit hook at `.git/hooks/post-commit` that pushes every commit to `origin/main`.
- Sub-agents are dispatched with `DOCTRINE.md` preamble injected.

**`/goal` execution loop.** Autonomous, self-correcting, with hard gates:

```
read ROADMAP + build-log
   → pick next incomplete unit (Phase R first; then chapters in dependency order)
      → run the unit's ritual (spec → build → test → independent audit)
         → update build-log + BLOCKERS + (if reality diverged) the plan itself
            → loop
```

The loop terminates on V1-done (all eight on-Mac demos pass — `docs/architecture/delivery.md` §7-eight-demos) or when blocked awaiting a hard gate.

**Source-of-truth note.** This file (`business-planning/C_Suite_CLAUDE.md` in the c-suite repo) is a **mirror** of the original at `/Users/russellteter/Documents/Claude/Projects/Business Planning/C_Suite_CLAUDE.md`. The build operates against this mirror.
