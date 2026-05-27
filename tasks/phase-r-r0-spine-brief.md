# R0-Spine — Operating-Model Corpus + Memory Inventory

## Your role

You are R0-Spine, one of four parallel R0 sub-agents in Phase R of the C-Suite build. You operate under the C-Suite build doctrine (10 laws in `DOCTRINE.md` — non-negotiable).

## What's loaded into your context already

Your spawn context inherits CLAUDE.md + DOCTRINE.md + the skill registry. You do NOT need to re-read those. Pull the rest yourself with file reads.

## Mission

Systematically read the **operating-model spine** + **MEMORY** and produce a single structured report at `docs/research/R0-knowledge-inventory.md` (you write it; orchestrator does not). The report binds the C-Suite build to the actual content of Russell's strategic AI operating model — not the design-doc claims about it.

## Required reads (no skipping; cite file path + finding)

**Operating-model spine** (at `/Users/russellteter/Claude Code Projects/c-suite/business-planning/`):
1. `Strategic_AI_Operating_Model.md` — v1 constitution. 5 lenses. 5-pass loop. Connector playbook.
2. `Strategic_AI_Operating_Model_v2.md` — conviction backbone, stakeholder/workstream/adversarial layers.
3. `Strategic_AI_Invocation_Guide.md` — **extract the verbatim system prompt for each of CEO / CFO / CRO / CMO / COS lenses** (Ch.4 prompts.md needs them byte-for-byte).
4. `Strategic_AI_Connector_Playbook.md` — connector routing, SuiteQL/SOQL patterns, data-quality discipline. **Verify every rule against the already-completed R1 partial at `docs/research/R1-connector-reality.md`**; flag any further drift.
5. `Strategic_AI_Conviction_Backbone.md` — schema for positions, decisions, calibration, pre-mortems.
6. `Strategic_AI_Stakeholder_Workstream_Adversarial.md` — schemas for stakeholders, workstreams, adversarial library.
7. `Strategic_AI_Cross_Claude_Spine.md` ⚠️ — flagged not-yet-read in scaffold; read now.
8. `Strategic_AI_Stack_Inventory.md` ⚠️ — flagged; read now.
9. `Strategic_AI_Knowledge_Base_Audit.md` ⚠️ — flagged; read now.
10. `turnaround_operating_library.md` — **extract the SaaS Turnaround Patterns + AI-Native Operations sections specifically** (Ch.4 CPO lens grounds in these).
11. `SESSION_START_PROTOCOL.md` — Russell's session-start discipline.

**Memory (sensitive — proceed carefully):**

- The vault MEMORY.md candidate is at: `~/Library/Application Support/Claude/local-agent-mode-sessions/fa5c2f7e-5fb9-4e29-a76c-e706355df1a1-f2ae62ca-b383-441b-9a66-f02d2b790532/` (this is the most-recently-modified space dir as of 2026-05-26).
- **If access is restricted by the auto-mode classifier**, do NOT bypass. Surface the restriction in your report with: "MEMORY.md location: <path>; access blocked by auto-mode classifier; recommend Russell whitelist or manually copy contents to `business-planning/_memory_snapshot.md` for R0 ingestion."
- If access works, read MEMORY.md + every file it links via `[[name]]` syntax. Document the link graph.

## Deliverable

Write `docs/research/R0-knowledge-inventory.md` with these sections:

1. **Operating-model spine map** — one entry per file: path, 2-3 sentence summary of load-bearing content for the C-Suite build, key citations (heading + line ranges).
2. **Verbatim lens prompts (CEO/CFO/CRO/CMO/COS)** — extracted from Invocation Guide, ready to drop into Ch.4 prompts. Cite source heading + line in Invocation Guide.
3. **CPO grounding sections** — from turnaround_operating_library.md, the verbatim SaaS Turnaround Patterns + AI-Native Operations content the Ch.4 CPO prompt cites.
4. **Connector-Playbook rule audit** — for each rule (committed-pipeline filter, active-AM rule, AWS sum, NetSuite foreigntotal, 24-month skip, Chorus pairing): "verified live" / "corrected by R1" / "not yet verified — Phase R R1 follow-up needed."
5. **MEMORY status** — accessible? path? link-graph? blocked?
6. **Discrepancies the build must reconcile** — any place the spine docs make claims that differ from `docs/architecture/*.md` or `BLOCKERS.md`. Each as a numbered finding with severity (P1/P2/P3) + which chapter is affected.

## Discipline

- **Cite every claim with file path + heading + line range** (DOCTRINE law #4).
- **UNKNOWN over fabrication** (DOCTRINE law #1). If a section says something you can't verify, mark it UNKNOWN and move on.
- **Persistence — three approaches before declaring missing** (DOCTRINE law #3). If a file isn't where the doc-set claims, search the directory; check `business-planning/_extracted_skills_for_c_suite.md`; grep the vault.
- You write the report file yourself. Do not return prose for the orchestrator to file — that collapses writer/grader per DOCTRINE law #7.
- After writing, return a structured summary (under 400 words): path to your report, top 5 findings the orchestrator must act on, any blockers you couldn't resolve.
- Use Sonnet — this is Sonnet-class research per cost discipline.

## Out of scope

- Vault artifact directories (positions/, decisions/, etc.) — that's R0-Vault.
- Skill source content extraction — that's R0-Skills.
- customer-dashboard codebase — that's R0-Code.

Don't duplicate; coordinate by file boundary.
