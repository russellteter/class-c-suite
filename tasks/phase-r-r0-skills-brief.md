# R0-Skills — Skill Inventory + Codify-vs-Invoke Recommendations

## Your role

You are R0-Skills, one of four parallel R0 sub-agents in Phase R of the C-Suite build. You operate under the C-Suite build doctrine (10 laws in `DOCTRINE.md`).

## Mission

Read every relevant installed skill's source. Document: what each does, its input/output contract, brand patterns to bake into Ch.4 Synthesizer/Verifier prompts, and a codify-vs-invoke recommendation per skill for Ch.7/Ch.10. Produce `docs/research/R0-skill-inventory.md`.

## Skills to read (path: `~/.claude/skills/<name>/SKILL.md` + any referenced `references/*.md`)

**Operating-logic skills (8 — installed via `scripts/install-extracted-skills.py` per B17 mitigation):**
1. `weekly-cash-forecast` — drives Monday cash forecast scheduled job (Ch.10).
2. `covenant-tracker` — drives covenant proximity in tripwire scan (Ch.7 playbook 1, Ch.10).
3. `renewal-forecast` — drives Sunday renewal sweep (Ch.10). **Known issue: uses `Opportunity.Owner.Name` — BLOCKERS B7 — needs `Account_Manager__r.IsActive` per verified live R1 report. Document the actual SOQL the skill currently issues + the patched version.**
4. `call-intelligence` — drives Chorus sweep (Ch.10).
5. `run-critique` — drives Run-Critic agent (Ch.4 — **extract verbatim rubric dimensions for the Run-Critic prompt**).
6. `system-check` — drives morning brief health check (Ch.10).
7. `class-aws-connector` — drives AWS queries (Ch.8 + Ch.10). Extract: `class` + `collab` profile sum rule.
8. `russell-voice` — Ch.4 Synthesizer voice (personal-facing content). **Extract verbatim VOICE RULES + phrases + structures + lexicon refs** for `apps/utility/src/prompts/synthesizer.prompt.md`.

**Brand-voice skills (4):**
9. `class-brand-voice` — Ch.4 Synthesizer voice (company-facing content). **Extract verbatim VOICE RULES** (terminology rules: "VILT" not "video conference"; "AI-native" not "AI-powered"; anti-patterns).
10. `class-brand-document` — Ch.9 Handoff brief recommendation when Cowork must produce .docx.
11. `class-brand-excel` — Ch.9 Handoff brief for Cowork Excel deliverables.
12. `class-brand-presentations` — Ch.9 Handoff brief for Cowork .pptx deliverables.

## For each skill, document

- **Path** to SKILL.md + any references.
- **Purpose** (1-2 sentences).
- **Input contract** — what context / args the skill expects (Russell question? account ID? date range?).
- **Output contract** — what the skill returns (markdown? structured data? side-effect like a vault write?).
- **MCP / tool dependencies** — does it call Salesforce / NetSuite / AWS / Chorus / Slack / Gmail / PowerBI? Note any Cowork-specific UUIDs (`mcp__c1f73cc9-...`) that need mapping to C-Suite wrapper interfaces.
- **Slack-touching paths** — flag explicitly; PRD §6 defers Slack to V1.5+.
- **Codify-vs-invoke recommendation for Ch.7/Ch.10:**
  - **Invoke as subprocess** if: stable behavior, low call frequency, internal-only consumer is fine.
  - **Codify into C-Suite module** if: high traffic, perf-sensitive, needs typed integration with the C-Suite orchestrator, or the skill has bugs (B7) that need patching.
  - Default recommendation per `docs/architecture/mcp.md` §operating-logic-skills: invoke subprocess for first 2 weeks, then codify high-traffic ones.
- **Brand-voice rules extracted** (russell-voice + class-brand-voice specifically) — verbatim, with citation. These drop into `apps/utility/src/prompts/synthesizer.prompt.md`.
- **Run-Critique rubric dimensions** (run-critique specifically) — populate the schema in `docs/architecture/prompts.md` §Run-Critic.

## Connector-wiring guidance (from B17 mitigation notes)

The extracted Cowork skills reference Cowork-specific MCP UUIDs. When codifying:
- Map skill intent (e.g., "query NetSuite cash transactions") to the C-Suite's wrapper interface (`apps/utility/src/mcps/netsuite/queries.ts cashPositionQuery()`), not the raw UUID.
- Document the mapping table in your report so the Ch.7/Ch.10 architects have a reference.

## Deliverable

Write `docs/research/R0-skill-inventory.md` with:

1. **Per-skill rows** — one per skill, all fields above.
2. **Verbatim russell-voice rules** — drop-in ready for synthesizer.prompt.md.
3. **Verbatim class-brand-voice rules** — drop-in ready for synthesizer.prompt.md.
4. **Verbatim run-critique rubric dimensions** — drop-in ready for runcritic.prompt.md.
5. **Cowork-UUID → C-Suite-wrapper mapping table** — by skill, by tool call.
6. **B7 patched SOQL** — the corrected `renewal-forecast` query using `Account_Manager__r.IsActive` (cross-reference `docs/research/R1-connector-reality.md` §Salesforce).
7. **Top findings** — anything that changes Ch.4/Ch.7/Ch.10 specs.

## Discipline

- Cite every brand-voice rule with skill path + section + line.
- UNKNOWN if a skill's source is missing or unreadable; flag.
- You write the report file yourself.
- Return structured summary (<400 words) with report path + top findings.
- Sonnet — extraction-class research.

## Out of scope

- Vault artifacts (R0-Vault).
- Operating-model spine docs (R0-Spine).
- customer-dashboard codebase (R0-Code).
